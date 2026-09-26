from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.models.car import CarStatus

Category = Literal["Hatchback", "Sedan", "SUV", "MUV", "Luxury", "Off-road"]
Fuel = Literal["Petrol", "Diesel", "CNG", "Electric", "Hybrid"]
Transmission = Literal["Manual", "Automatic"]


class CarBase(BaseModel):
    brand: str = Field(min_length=1, max_length=60)
    model: str = Field(min_length=1, max_length=80)
    year: int = Field(ge=2000, le=2100)
    category: Category
    price_per_day: float = Field(gt=0, le=200000)
    seats: int = Field(ge=2, le=12)
    fuel_type: Fuel
    transmission: Transmission
    mileage: str = Field(default="", max_length=30)
    location: str = Field(min_length=2, max_length=80)
    image_url: str = Field(default="", max_length=500)
    description: str = ""
    features: list[str] = []
    status: CarStatus = CarStatus.available


class CarCreate(CarBase):
    pass


class CarUpdate(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = Field(default=None, ge=2000, le=2100)
    category: Optional[Category] = None
    price_per_day: Optional[float] = Field(default=None, gt=0)
    seats: Optional[int] = Field(default=None, ge=2, le=12)
    fuel_type: Optional[Fuel] = None
    transmission: Optional[Transmission] = None
    mileage: Optional[str] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    features: Optional[list[str]] = None
    status: Optional[CarStatus] = None


class CarOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    brand: str
    model: str
    year: int
    category: str
    price_per_day: float
    seats: int
    fuel_type: str
    transmission: str
    mileage: str
    location: str
    image_url: str
    description: str
    features: str = Field(exclude=True)
    status: CarStatus
    current_location: str = ""
    current_lat: float = 0.0
    current_lng: float = 0.0
    created_at: datetime
    # populated by the router when the request carries a date range
    is_available: Optional[bool] = None

    @computed_field
    @property
    def feature_list(self) -> list[str]:
        return [f.strip() for f in (self.features or "").split(",") if f.strip()]

    @field_validator("price_per_day", mode="before")
    @classmethod
    def to_float(cls, v):
        return float(v)


class CarAvailabilityOut(BaseModel):
    car_id: int
    pickup_date: date
    return_date: date
    available: bool
    reason: str = ""
    conflicting_dates: list[dict] = []
