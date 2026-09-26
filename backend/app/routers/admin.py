from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_admin
from app.models import (Booking, BookingStatus, Car, CarStatus, PaymentStatus,
                        User, UserRole)
from app.schemas.booking import BookingOut, BookingStatusUpdate, TrackingUpdate
from app.schemas.car import CarOut
from app.schemas.user import UserOut
from app.services import availability

router = APIRouter(prefix="/api/admin", tags=["admin"],
                   dependencies=[Depends(get_current_admin)])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    today = date.today()
    total_cars = db.scalar(select(func.count(Car.id)).where(Car.status != CarStatus.retired)) or 0
    on_road = availability.busy_car_ids(db, today, today)
    status_rows = db.execute(
        select(Booking.booking_status, func.count(Booking.id)).group_by(Booking.booking_status)
    ).all()
    counts: dict[BookingStatus, int] = {row[0]: int(row[1]) for row in status_rows}
    revenue = db.scalar(
        select(func.coalesce(func.sum(Booking.base_price + Booking.taxes + Booking.service_fee), 0))
        .where(Booking.payment_status == PaymentStatus.paid)
    ) or 0

    since = today - timedelta(days=29)
    daily = db.execute(
        select(Booking.pickup_date, func.count(Booking.id),
               func.coalesce(func.sum(Booking.base_price + Booking.taxes), 0))
        .where(Booking.pickup_date >= since)
        .group_by(Booking.pickup_date).order_by(Booking.pickup_date)
    ).all()

    return {
        "total_cars": total_cars,
        "available_cars": max(total_cars - len(on_road), 0),
        "cars_on_road": len(on_road),
        "total_users": db.scalar(select(func.count(User.id))) or 0,
        "active_bookings": counts.get(BookingStatus.active, 0),
        "pending_bookings": counts.get(BookingStatus.pending, 0),
        "confirmed_bookings": counts.get(BookingStatus.confirmed, 0),
        "completed_bookings": counts.get(BookingStatus.completed, 0),
        "cancelled_bookings": counts.get(BookingStatus.cancelled, 0),
        "total_bookings": sum(counts.values()),
        "total_revenue": round(float(revenue), 2),
        "revenue_trend": [
            {"date": str(d), "bookings": c, "revenue": round(float(r), 2)} for d, c, r in daily
        ],
    }


@router.get("/cars", response_model=list[CarOut])
def all_cars(db: Session = Depends(get_db)):
    cars = db.scalars(select(Car).order_by(Car.created_at.desc()))
    return [CarOut.model_validate(c) for c in cars]


@router.get("/bookings", response_model=dict)
def all_bookings(db: Session = Depends(get_db),
                 booking_status: BookingStatus | None = Query(default=None),
                 q: str | None = None):
    stmt = (select(Booking).options(selectinload(Booking.car), selectinload(Booking.user))
            .order_by(Booking.created_at.desc()))
    if booking_status:
        stmt = stmt.where(Booking.booking_status == booking_status)
    if q:
        stmt = stmt.where(Booking.booking_reference.ilike(f"%{q.strip()}%"))
    rows = list(db.scalars(stmt))
    return {
        "items": [
            {**BookingOut.model_validate(b).model_dump(),
             "customer_name": b.user.full_name, "customer_email": b.user.email}
            for b in rows
        ],
        "total": len(rows),
    }


@router.put("/bookings/{booking_id}/status", response_model=BookingOut)
def set_booking_status(booking_id: int, payload: BookingStatusUpdate,
                       db: Session = Depends(get_db)):
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    booking.booking_status = payload.booking_status
    if payload.booking_status == BookingStatus.cancelled and \
            booking.payment_status == PaymentStatus.paid:
        booking.payment_status = PaymentStatus.refunded
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)


@router.get("/users", response_model=list[dict])
def all_users(db: Session = Depends(get_db)):
    rows = db.scalars(select(User).order_by(User.created_at.desc()))
    out = []
    for u in rows:
        booked = db.scalar(select(func.count(Booking.id)).where(Booking.user_id == u.id)) or 0
        out.append({**UserOut.model_validate(u).model_dump(mode="json"), "bookings": booked})
    return out


@router.put("/users/{user_id}/role", response_model=UserOut)
def set_role(user_id: int, role: UserRole, db: Session = Depends(get_db),
             admin: User = Depends(get_current_admin)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.id == admin.id and role != UserRole.admin:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "You cannot remove your own admin access")
    user.role = role
    db.commit()
    db.refresh(user)
    return user


@router.get("/tracking")
def get_fleet_tracking(db: Session = Depends(get_db)):
    """Returns real-time and historical tracking details for all cars and trips.
    Shows the exact locations, destinations, routes, and checkpoints where people went.
    """
    stmt = (
        select(Booking)
        .options(selectinload(Booking.car), selectinload(Booking.user))
        .order_by(Booking.created_at.desc())
    )
    all_b = list(db.scalars(stmt))

    trips = []
    active_count = 0
    total_km = 0
    destinations_set = set()

    for b in all_b:
        car = b.car
        user = b.user
        if not car or not user:
            continue

        if b.booking_status == BookingStatus.active:
            active_count += 1
        total_km += b.distance_travelled_km
        if b.destination:
            destinations_set.add(b.destination)

        route_stops = [s.strip() for s in (b.trip_route or "").split("→") if s.strip()]

        trips.append({
            "booking_id": b.id,
            "booking_reference": b.booking_reference,
            "booking_status": b.booking_status,
            "payment_status": b.payment_status,
            "customer": {
                "id": user.id,
                "name": user.full_name,
                "email": user.email,
                "phone": user.phone,
            },
            "car": {
                "id": car.id,
                "brand": car.brand,
                "model": car.model,
                "category": car.category,
                "fuel_type": car.fuel_type,
                "transmission": car.transmission,
                "image_url": car.image_url,
                "location": car.location,
            },
            "pickup_location": b.pickup_location,
            "return_location": b.return_location,
            "destination": b.destination or b.return_location,
            "current_location": b.current_location or f"{b.pickup_location} Hub",
            "current_lat": float(b.current_lat) if b.current_lat else 17.3850,
            "current_lng": float(b.current_lng) if b.current_lng else 78.4867,
            "distance_travelled_km": b.distance_travelled_km,
            "speed_kmh": b.speed_kmh,
            "fuel_or_battery_level": b.fuel_or_battery_level,
            "trip_route": b.trip_route,
            "route_stops": route_stops,
            "pickup_date": str(b.pickup_date),
            "return_date": str(b.return_date),
            "pickup_time": str(b.pickup_time),
            "return_time": str(b.return_time),
            "rental_days": b.rental_days,
            "created_at": b.created_at.isoformat(),
        })

    return {
        "trips": trips,
        "summary": {
            "total_trips": len(trips),
            "active_on_road": active_count,
            "total_distance_km": total_km,
            "unique_destinations": len(destinations_set),
        }
    }


@router.put("/tracking/{booking_id}/location")
def update_car_location(booking_id: int, payload: TrackingUpdate, db: Session = Depends(get_db)):
    """Update car live coordinates, current location, speed, or append checkpoint."""
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")

    booking.current_location = payload.current_location
    if payload.current_lat is not None:
        booking.current_lat = payload.current_lat
    if payload.current_lng is not None:
        booking.current_lng = payload.current_lng
    if payload.distance_travelled_km is not None:
        booking.distance_travelled_km = payload.distance_travelled_km
    if payload.speed_kmh is not None:
        booking.speed_kmh = payload.speed_kmh
    if payload.fuel_or_battery_level is not None:
        booking.fuel_or_battery_level = payload.fuel_or_battery_level
    if payload.add_checkpoint:
        existing = booking.trip_route or ""
        booking.trip_route = (
            f"{existing} → {payload.add_checkpoint.strip()}"
            if existing else payload.add_checkpoint.strip()
        )

    car = db.get(Car, booking.car_id)
    if car:
        car.current_location = payload.current_location
        if payload.current_lat is not None:
            car.current_lat = payload.current_lat
        if payload.current_lng is not None:
            car.current_lng = payload.current_lng

    db.commit()
    db.refresh(booking)
    return {
        "status": "success",
        "current_location": booking.current_location,
        "current_lat": float(booking.current_lat),
        "current_lng": float(booking.current_lng),
        "distance_travelled_km": booking.distance_travelled_km,
        "trip_route": booking.trip_route,
    }
