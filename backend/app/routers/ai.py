"""The assistant. Understands the message, queries the real fleet, and replies
in the language it was spoken to. It never invents a car - every suggestion
comes out of the cars table."""
import json
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_optional_user
from app.models import AIConversation, Car, CarStatus, TripPlan, User
from app.schemas.ai import (AssistantRequest, AssistantResponse, SearchFilters,
                            TripPlanOut, TripPlanRequest)
from app.schemas.car import CarOut
from app.services import availability, nlu, pricing, responses, trip_planner

router = APIRouter(prefix="/api/ai", tags=["ai"])

MAX_RESULTS = 8


def resolve_language(requested: str, message: str, user: User | None) -> str:
    if requested in ("en", "te", "hi"):
        return requested
    if requested == "auto":
        detected = nlu.detect_language(message)
        return detected
    if user and user.preferred_language in ("en", "te", "hi"):
        return user.preferred_language
    return nlu.detect_language(message)


def search_fleet(db: Session, s: nlu.Slots) -> list[CarOut]:
    stmt = select(Car).where(Car.status == CarStatus.available)
    if s.location:
        stmt = stmt.where(Car.location == s.location)
    if s.category:
        stmt = stmt.where(Car.category == s.category)
    if s.transmission:
        stmt = stmt.where(Car.transmission == s.transmission)
    if s.fuel_type:
        stmt = stmt.where(Car.fuel_type == s.fuel_type)
    if s.seats:
        stmt = stmt.where(Car.seats >= s.seats)
    if s.max_price:
        stmt = stmt.where(Car.price_per_day <= s.max_price)
    if s.min_price:
        stmt = stmt.where(Car.price_per_day >= s.min_price)
    cars = list(db.scalars(stmt.order_by(Car.price_per_day.asc())))

    if s.pickup_date and s.return_date:
        busy = availability.busy_car_ids(db, s.pickup_date, s.return_date)
        cars = [c for c in cars if c.id not in busy]

    out = []
    for c in cars[:MAX_RESULTS]:
        item = CarOut.model_validate(c)
        if s.pickup_date and s.return_date:
            item.is_available = True
        out.append(item)
    return out


def _slots_from_context(ctx: dict) -> nlu.Slots:
    s = nlu.Slots()
    for key in ("location", "category", "fuel_type", "transmission", "destination", "origin"):
        if ctx.get(key):
            setattr(s, key, ctx[key])
    for key in ("seats", "rental_days"):
        if ctx.get(key):
            setattr(s, key, int(ctx[key]))
    for key in ("max_price", "min_price"):
        if ctx.get(key):
            setattr(s, key, float(ctx[key]))
    for key in ("pickup_date", "return_date"):
        if ctx.get(key):
            try:
                setattr(s, key, date.fromisoformat(str(ctx[key])))
            except ValueError:
                pass
    return s


@router.post("/car-assistant", response_model=AssistantResponse)
def car_assistant(payload: AssistantRequest, db: Session = Depends(get_db),
                  user: User | None = Depends(get_optional_user)):
    lang = resolve_language(payload.language, payload.message, user)
    intent, heard = nlu.parse(payload.message)
    intent, heard = nlu.enrich(payload.message, intent, heard)
    slots = _slots_from_context(payload.context).merge(heard)

    # a stated trip length with a start date fills in the return date
    if slots.pickup_date and slots.rental_days and not slots.return_date:
        slots.return_date = slots.pickup_date + timedelta(days=slots.rental_days - 1)

    cars: list[CarOut] = []
    trip: dict | None = None
    action = None
    missing: list[str] = []

    if intent == "greet":
        reply = responses.GREETING[lang]
    elif intent == "help":
        reply = responses.HELP[lang]
    elif intent == "my_bookings":
        reply = responses.MY_BOOKINGS[lang]
        action = "open_bookings"
    elif intent == "cancel_booking":
        reply = responses.CANCEL[lang]
        action = "open_bookings"
    elif intent == "trip_plan":
        if not slots.destination:
            reply = responses.need_destination(lang)
            missing = ["destination"]
        else:
            days = slots.rental_days or 3
            trip = trip_planner.build(slots.origin or "Hyderabad", slots.destination, days, lang)
            category = trip_planner.recommended_category(days, slots.seats or 4,
                                                         trip["distance_km"])
            pick = nlu.Slots(location=slots.origin or "Hyderabad", category=category,
                             rental_days=days)
            cars = search_fleet(db, pick)
            cost = 0.0
            if cars:
                start = slots.pickup_date or date.today() + timedelta(days=1)
                q = pricing.quote(cars[0].price_per_day, cars[0].category, start,
                                  start + timedelta(days=days - 1))
                cost = q["total_amount"] - q["security_deposit"]
                trip["estimated_rental_cost"] = cost
            reply = responses.trip_reply(trip["origin"], trip["destination"], days, cost, lang)
            action = "show_trip"
    else:
        cars = search_fleet(db, slots)
        if not slots.location:
            missing.append("location")
        if not slots.pickup_date:
            missing.append("pickup_date")
        elif not slots.return_date:
            missing.append("return_date")
        reply = responses.search_reply(len(cars), slots, lang, missing)
        action = "show_cars" if cars else None

    db.add(AIConversation(
        user_id=user.id if user else None,
        language=lang,
        input_type=payload.input_type,
        user_message=payload.message,
        assistant_response=reply,
        intent=intent,
    ))
    db.commit()

    return AssistantResponse(
        reply=reply,
        language=lang,
        speech_lang=nlu.SPEECH_CODES[lang],
        intent=intent,
        filters=SearchFilters(**{k: v for k, v in slots.__dict__.items()
                                 if k in SearchFilters.model_fields}),
        cars=cars,
        missing=missing,
        trip_plan=trip,
        action=action,
    )


@router.post("/trip-planner", response_model=TripPlanOut)
def plan_trip(payload: TripPlanRequest, db: Session = Depends(get_db),
              user: User | None = Depends(get_optional_user)):
    lang = payload.language if payload.language in ("en", "te", "hi") else "en"
    plan = trip_planner.build(payload.origin, payload.destination, payload.duration, lang)
    category = trip_planner.recommended_category(payload.duration, payload.passengers,
                                                 plan["distance_km"])
    cars = search_fleet(db, nlu.Slots(location=payload.origin, category=category,
                                      seats=payload.passengers))
    cost = None
    if cars:
        start = date.today() + timedelta(days=1)
        q = pricing.quote(cars[0].price_per_day, cars[0].category, start,
                          start + timedelta(days=payload.duration - 1))
        cost = q["total_amount"] - q["security_deposit"]
    return TripPlanOut(**plan, suggested_cars=cars, estimated_rental_cost=cost)


@router.post("/trip-plans", response_model=TripPlanOut, status_code=status.HTTP_201_CREATED)
def save_trip(payload: TripPlanRequest, db: Session = Depends(get_db),
              user: User = Depends(get_current_user)):
    plan = plan_trip(payload, db, user)
    row = TripPlan(user_id=user.id, language=plan.language, origin=plan.origin,
                   destination=plan.destination, duration=plan.duration,
                   itinerary=json.dumps(plan.itinerary, ensure_ascii=False))
    db.add(row)
    db.commit()
    db.refresh(row)
    plan.id = row.id
    plan.created_at = row.created_at
    return plan


@router.get("/trip-plans", response_model=list[TripPlanOut])
def my_trip_plans(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.scalars(select(TripPlan).where(TripPlan.user_id == user.id)
                      .order_by(TripPlan.created_at.desc()))
    return [
        TripPlanOut(id=r.id, origin=r.origin, destination=r.destination, duration=r.duration,
                    language=r.language, itinerary=json.loads(r.itinerary), stops=[],
                    created_at=r.created_at)
        for r in rows
    ]


@router.delete("/trip-plans/{plan_id}")
def delete_trip_plan(plan_id: int, db: Session = Depends(get_db),
                     user: User = Depends(get_current_user)):
    row = db.get(TripPlan, plan_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip plan not found")
    if row.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "That plan belongs to another account")
    db.delete(row)
    db.commit()
    return {"deleted": True}


@router.get("/conversations")
def my_conversations(db: Session = Depends(get_db), user: User = Depends(get_current_user),
                     limit: int = 30):
    rows = db.scalars(select(AIConversation).where(AIConversation.user_id == user.id)
                      .order_by(AIConversation.created_at.desc()).limit(limit))
    return [
        {"id": r.id, "language": r.language, "input_type": r.input_type,
         "user_message": r.user_message, "assistant_response": r.assistant_response,
         "intent": r.intent, "created_at": r.created_at}
        for r in reversed(list(rows))
    ]
