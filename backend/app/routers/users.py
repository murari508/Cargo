from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Booking, BookingStatus, Car, SavedCar, User
from app.schemas.car import CarOut
from app.schemas.user import UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def read_me(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserOut)
def update_me(payload: UserUpdate, db: Session = Depends(get_db),
              user: User = Depends(get_current_user)):
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = list(db.scalars(
        select(Booking).options(selectinload(Booking.car))
        .where(Booking.user_id == user.id).order_by(Booking.pickup_date.desc())))
    spend = sum(float(b.total_amount) - float(b.security_deposit)
                for b in rows if b.booking_status != BookingStatus.cancelled)
    upcoming = [b for b in rows if b.booking_status in
                (BookingStatus.pending, BookingStatus.confirmed, BookingStatus.active)]
    return {
        "total_bookings": len(rows),
        "upcoming_bookings": len(upcoming),
        "completed_bookings": sum(1 for b in rows if b.booking_status == BookingStatus.completed),
        "cancelled_bookings": sum(1 for b in rows if b.booking_status == BookingStatus.cancelled),
        "total_spend": round(spend, 2),
        "saved_cars": db.query(SavedCar).filter(SavedCar.user_id == user.id).count(),
        "next_trip": {
            "booking_reference": upcoming[-1].booking_reference,
            "car": f"{upcoming[-1].car.brand} {upcoming[-1].car.model}",
            "pickup_date": str(upcoming[-1].pickup_date),
            "pickup_location": upcoming[-1].pickup_location,
        } if upcoming else None,
    }


@router.get("/me/saved-cars", response_model=list[CarOut])
def saved_cars(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.scalars(select(SavedCar).options(selectinload(SavedCar.car))
                      .where(SavedCar.user_id == user.id))
    return [CarOut.model_validate(r.car) for r in rows]


@router.post("/me/saved-cars/{car_id}", status_code=status.HTTP_201_CREATED)
def save_car(car_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if db.get(Car, car_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Car not found")
    existing = db.scalar(select(SavedCar).where(SavedCar.user_id == user.id,
                                                SavedCar.car_id == car_id))
    if existing:
        return {"saved": True}
    db.add(SavedCar(user_id=user.id, car_id=car_id))
    db.commit()
    return {"saved": True}


@router.delete("/me/saved-cars/{car_id}")
def unsave_car(car_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.scalar(select(SavedCar).where(SavedCar.user_id == user.id,
                                           SavedCar.car_id == car_id))
    if row:
        db.delete(row)
        db.commit()
    return {"saved": False}
