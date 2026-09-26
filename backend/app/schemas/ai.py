from datetime import date, datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.car import CarOut

Lang = Literal["en", "te", "hi", "auto"]


class AssistantRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    language: Lang = "auto"
    input_type: Literal["text", "voice"] = "text"
    # optional slots already collected by the UI
    context: dict[str, Any] = {}


class SearchFilters(BaseModel):
    location: Optional[str] = None
    category: Optional[str] = None
    seats: Optional[int] = None
    fuel_type: Optional[str] = None
    transmission: Optional[str] = None
    max_price: Optional[float] = None
    min_price: Optional[float] = None
    pickup_date: Optional[date] = None
    return_date: Optional[date] = None
    rental_days: Optional[int] = None


class AssistantResponse(BaseModel):
    reply: str
    language: str
    speech_lang: str
    intent: str
    filters: SearchFilters
    cars: list[CarOut] = []
    missing: list[str] = []
    trip_plan: Optional[dict] = None
    action: Optional[str] = None


class TripPlanRequest(BaseModel):
    origin: str = "Hyderabad"
    destination: str
    duration: int = Field(default=3, ge=1, le=21)
    language: Lang = "en"
    passengers: int = Field(default=4, ge=1, le=12)


class TripPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    origin: str
    destination: str
    duration: int
    language: str
    itinerary: list[dict]
    stops: list[str]
    distance_km: Optional[int] = None
    suggested_cars: list[CarOut] = []
    estimated_rental_cost: Optional[float] = None
    notes: list[str] = []
    created_at: Optional[datetime] = None


class LanguageOut(BaseModel):
    code: str
    label: str
    speech_code: str
    native_label: str


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    language: Lang = "en"
    speed: Literal["slow", "normal", "fast"] = "normal"
