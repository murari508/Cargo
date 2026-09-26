import secrets
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Booking, BookingStatus, Car, PaymentStatus, User, UserRole
from app.schemas.booking import (BookingCreate, BookingListOut, BookingOut,
                                 PriceQuote, PriceQuoteRequest)
from app.services import availability, pricing, tracking

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


def _reference() -> str:
    return "CG" + secrets.token_hex(4).upper()


@router.post("/quote", response_model=PriceQuote)
def price_quote(payload: PriceQuoteRequest, db: Session = Depends(get_db)):
    """Price preview for the booking screen. The same function runs again at
    booking time, so a tampered quote changes nothing."""
    car = db.get(Car, payload.car_id)
    if car is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Car not found")
    q = pricing.quote(car.price_per_day, car.category, payload.pickup_date, payload.return_date)
    return PriceQuote(car_id=car.id, **q)


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    car = db.get(Car, payload.car_id)
    if car is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Car not found")
    if payload.pickup_date < date.today():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Pickup date is in the past")

    ok, reason, clashes = availability.check(db, car, payload.pickup_date, payload.return_date)
    if not ok:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            {"message": reason or "Car is not available for those dates",
                             "conflicting_dates": clashes})

    q = pricing.quote(car.price_per_day, car.category, payload.pickup_date, payload.return_date)
    dest = (payload.destination or "").strip() or payload.return_location
    lat, lng = tracking.get_city_coordinates(payload.pickup_location)
    route = tracking.build_default_route(payload.pickup_location, dest)

    # Enforce Driving Licence requirement: only verified licence holders can book
    dl_number = (payload.driving_license or "").strip() or (user.driving_license or "").strip()
    if not dl_number or len(dl_number) < 5:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "A valid Driving Licence number is required to book a self-drive car. Only verified licence holders are permitted to book.",
        )
    if not user.driving_license and dl_number:
        user.driving_license = dl_number

    booking = Booking(
        user_id=user.id,
        car_id=car.id,
        pickup_location=payload.pickup_location,
        return_location=payload.return_location,
        destination=dest,
        driving_license=dl_number,
        current_location=f"{payload.pickup_location} Hub",
        current_lat=lat,
        current_lng=lng,
        distance_travelled_km=0,
        trip_route=route,
        speed_kmh=0,
        fuel_or_battery_level=100,
        pickup_date=payload.pickup_date,
        return_date=payload.return_date,
        pickup_time=payload.pickup_time,
        return_time=payload.return_time,
        rental_days=q["rental_days"],
        base_price=q["base_price"],
        taxes=q["taxes"],
        service_fee=q["service_fee"],
        security_deposit=q["security_deposit"],
        total_amount=q["total_amount"],
        payment_status=PaymentStatus.unpaid,
        booking_status=BookingStatus.pending,
        booking_reference=_reference(),
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)


@router.get("", response_model=BookingListOut)
def my_bookings(db: Session = Depends(get_db), user: User = Depends(get_current_user),
                booking_status: BookingStatus | None = Query(default=None)):
    stmt = (select(Booking).options(selectinload(Booking.car))
            .where(Booking.user_id == user.id).order_by(Booking.created_at.desc()))
    if booking_status:
        stmt = stmt.where(Booking.booking_status == booking_status)
    rows = list(db.scalars(stmt))
    return BookingListOut(items=[BookingOut.model_validate(b) for b in rows], total=len(rows))


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    if booking.user_id != user.id and user.role != UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This booking belongs to another account")
    return BookingOut.model_validate(booking)


@router.put("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    if booking.user_id != user.id and user.role != UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This booking belongs to another account")
    if booking.booking_status in (BookingStatus.completed, BookingStatus.cancelled):
        raise HTTPException(status.HTTP_409_CONFLICT,
                            f"Booking is already {booking.booking_status.value}")
    booking.booking_status = BookingStatus.cancelled
    if booking.payment_status == PaymentStatus.paid:
        booking.payment_status = PaymentStatus.refunded
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)
