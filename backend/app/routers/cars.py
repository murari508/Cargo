from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin
from app.models import Car, CarStatus, User
from app.schemas.car import CarAvailabilityOut, CarCreate, CarOut, CarUpdate
from app.services import availability

router = APIRouter(prefix="/api/cars", tags=["cars"])


@router.get("", response_model=dict)
def list_cars(
    db: Session = Depends(get_db),
    location: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    seats: Optional[int] = Query(default=None, ge=2, le=12),
    fuel_type: Optional[str] = None,
    transmission: Optional[str] = None,
    min_price: Optional[float] = Query(default=None, ge=0),
    max_price: Optional[float] = Query(default=None, ge=0),
    q: Optional[str] = Query(default=None, description="free text over brand and model"),
    pickup_date: Optional[date] = None,
    return_date: Optional[date] = None,
    available_only: bool = False,
    sort: str = Query(default="price_asc", pattern="^(price_asc|price_desc|newest|seats)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
):
    """Every filter is optional and they combine freely."""
    stmt = select(Car).where(Car.status != CarStatus.retired)
    if location:
        stmt = stmt.where(Car.location == location)
    if category:
        stmt = stmt.where(Car.category == category)
    if brand:
        stmt = stmt.where(Car.brand == brand)
    if seats:
        stmt = stmt.where(Car.seats >= seats)
    if fuel_type:
        stmt = stmt.where(Car.fuel_type == fuel_type)
    if transmission:
        stmt = stmt.where(Car.transmission == transmission)
    if min_price is not None:
        stmt = stmt.where(Car.price_per_day >= min_price)
    if max_price is not None:
        stmt = stmt.where(Car.price_per_day <= max_price)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where((Car.brand.ilike(like)) | (Car.model.ilike(like)))

    order = {
        "price_asc": Car.price_per_day.asc(),
        "price_desc": Car.price_per_day.desc(),
        "newest": Car.created_at.desc(),
        "seats": Car.seats.desc(),
    }[sort]
    cars = list(db.scalars(stmt.order_by(order)))

    busy: set[int] = set()
    if pickup_date and return_date:
        if return_date < pickup_date:
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                "Return date cannot be before the pickup date")
        busy = availability.busy_car_ids(db, pickup_date, return_date)

    items = []
    for car in cars:
        out = CarOut.model_validate(car)
        if pickup_date and return_date:
            out.is_available = car.status == CarStatus.available and car.id not in busy
        items.append(out)
    if available_only and pickup_date and return_date:
        items = [c for c in items if c.is_available]

    total = len(items)
    start = (page - 1) * page_size
    return {"items": items[start:start + page_size], "total": total,
            "page": page, "page_size": page_size}


@router.get("/filters", response_model=dict)
def filter_options(db: Session = Depends(get_db)):
    """Powers the search sidebar without hardcoding values in the frontend."""
    cars = list(db.scalars(select(Car).where(Car.status != CarStatus.retired)))
    prices = [float(c.price_per_day) for c in cars] or [0]
    return {
        "locations": sorted({c.location for c in cars}),
        "categories": sorted({c.category for c in cars}),
        "brands": sorted({c.brand for c in cars}),
        "fuel_types": sorted({c.fuel_type for c in cars}),
        "transmissions": sorted({c.transmission for c in cars}),
        "seats": sorted({c.seats for c in cars}),
        "min_price": min(prices),
        "max_price": max(prices),
    }


@router.get("/{car_id}", response_model=CarOut)
def get_car(car_id: int, db: Session = Depends(get_db),
            pickup_date: Optional[date] = None, return_date: Optional[date] = None):
    car = db.get(Car, car_id)
    if car is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Car not found")
    out = CarOut.model_validate(car)
    if pickup_date and return_date:
        ok, _, _ = availability.check(db, car, pickup_date, return_date)
        out.is_available = ok
    return out


@router.get("/{car_id}/availability", response_model=CarAvailabilityOut)
def car_availability(car_id: int, pickup_date: date, return_date: date,
                     db: Session = Depends(get_db)):
    car = db.get(Car, car_id)
    if car is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Car not found")
    ok, reason, clashes = availability.check(db, car, pickup_date, return_date)
    return CarAvailabilityOut(car_id=car_id, pickup_date=pickup_date,
                              return_date=return_date, available=ok,
                              reason=reason, conflicting_dates=clashes)


@router.post("", response_model=CarOut, status_code=status.HTTP_201_CREATED)
def create_car(payload: CarCreate, db: Session = Depends(get_db),
               _: User = Depends(get_current_admin)):
    data = payload.model_dump()
    data["features"] = ", ".join(data.pop("features") or [])
    car = Car(**data)
    db.add(car)
    db.commit()
    db.refresh(car)
    return CarOut.model_validate(car)


@router.put("/{car_id}", response_model=CarOut)
def update_car(car_id: int, payload: CarUpdate, db: Session = Depends(get_db),
               _: User = Depends(get_current_admin)):
    car = db.get(Car, car_id)
    if car is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Car not found")
    data = payload.model_dump(exclude_unset=True)
    if "features" in data and data["features"] is not None:
        data["features"] = ", ".join(data["features"])
    for key, value in data.items():
        setattr(car, key, value)
    db.commit()
    db.refresh(car)
    return CarOut.model_validate(car)


@router.delete("/{car_id}", status_code=status.HTTP_200_OK)
def delete_car(car_id: int, db: Session = Depends(get_db),
               _: User = Depends(get_current_admin)):
    car = db.get(Car, car_id)
    if car is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Car not found")
    live = availability.overlapping_bookings(db, car.id, date.today(), date(2100, 1, 1))
    if live:
        # keep the history intact, just take it off the market
        car.status = CarStatus.retired
        db.commit()
        return {"message": "Car has live bookings, so it was retired instead of deleted.",
                "retired": True}
    db.delete(car)
    db.commit()
    return {"message": "Car removed from the fleet.", "retired": False}
