from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.booking import BookingStatus, PaymentStatus
from app.schemas.car import CarOut


class PriceQuoteRequest(BaseModel):
    car_id: int
    pickup_date: date
    return_date: date

    @model_validator(mode="after")
    def check_range(self):
        if self.return_date < self.pickup_date:
            raise ValueError("return_date cannot be before pickup_date")
        return self


class PriceQuote(BaseModel):
    car_id: int
    price_per_day: float
    rental_days: int
    base_price: float
    taxes: float
    tax_rate: float
    service_fee: float
    security_deposit: float
    total_amount: float
    payable_now: float
    currency: str = "INR"


class BookingCreate(BaseModel):
    """Only the facts. Prices are computed server-side and any amount sent
    by the client is ignored."""
    car_id: int
    pickup_location: str = Field(min_length=2, max_length=120)
    return_location: str = Field(min_length=2, max_length=120)
    destination: Optional[str] = Field(default="", max_length=160)
    driving_license: Optional[str] = Field(default=None, max_length=50, description="Valid Driving Licence Number")
    license_image_url: Optional[str] = Field(default="", max_length=255, description="Verified DL Image URL")
    pickup_date: date
    return_date: date
    pickup_time: time = time(10, 0)
    return_time: time = time(10, 0)

    @model_validator(mode="after")
    def check_range(self):
        if self.return_date < self.pickup_date:
            raise ValueError("return_date cannot be before pickup_date")
        return self


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    car_id: int
    pickup_location: str
    return_location: str
    destination: str = ""
    driving_license: str = ""
    license_image_url: str = ""
    current_location: str = ""
    current_lat: float = 0.0
    current_lng: float = 0.0
    distance_travelled_km: int = 0
    trip_route: str = ""
    speed_kmh: int = 0
    fuel_or_battery_level: int = 85
    pickup_date: date
    return_date: date
    pickup_time: time
    return_time: time
    rental_days: int
    base_price: float
    taxes: float
    service_fee: float
    security_deposit: float
    total_amount: float
    payment_status: PaymentStatus
    booking_status: BookingStatus
    booking_reference: str
    created_at: datetime
    car: Optional[CarOut] = None


class BookingListOut(BaseModel):
    items: list[BookingOut]
    total: int


class BookingStatusUpdate(BaseModel):
    booking_status: BookingStatus


class TrackingUpdate(BaseModel):
    current_location: str
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    distance_travelled_km: Optional[int] = None
    speed_kmh: Optional[int] = None
    fuel_or_battery_level: Optional[int] = None
    add_checkpoint: Optional[str] = None
