"""Date-overlap checking. This is the authority on whether a car can be booked;
the UI only mirrors what these functions return."""
from datetime import date

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models import BLOCKING_STATUSES, Booking, Car, CarStatus


def overlapping_bookings(db: Session, car_id: int, pickup: date, ret: date,
                         exclude_booking_id: int | None = None) -> list[Booking]:
    """Two closed intervals overlap when a.start <= b.end and b.start <= a.end."""
    stmt = select(Booking).where(
        Booking.car_id == car_id,
        Booking.booking_status.in_(BLOCKING_STATUSES),
        and_(Booking.pickup_date <= ret, Booking.return_date >= pickup),
    )
    if exclude_booking_id:
        stmt = stmt.where(Booking.id != exclude_booking_id)
    return list(db.scalars(stmt))


def check(db: Session, car: Car, pickup: date, ret: date) -> tuple[bool, str, list[dict]]:
    if car.status != CarStatus.available:
        label = "under maintenance" if car.status == CarStatus.maintenance else "no longer in the fleet"
        return False, f"This car is {label}.", []
    if ret < pickup:
        return False, "Return date is before the pickup date.", []
    clashes = overlapping_bookings(db, car.id, pickup, ret)
    if clashes:
        booked = [{"pickup_date": str(b.pickup_date), "return_date": str(b.return_date)} for b in clashes]
        return False, "This car is already booked for part of those dates.", booked
    return True, "", []


def busy_car_ids(db: Session, pickup: date, ret: date) -> set[int]:
    """Used by search to flag every result in a single query."""
    stmt = select(Booking.car_id).where(
        Booking.booking_status.in_(BLOCKING_STATUSES),
        and_(Booking.pickup_date <= ret, Booking.return_date >= pickup),
    ).distinct()
    return set(db.scalars(stmt))
