import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Index, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CarStatus(str, enum.Enum):
    available = "available"
    maintenance = "maintenance"
    retired = "retired"


class Car(Base):
    __tablename__ = "cars"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    brand: Mapped[str] = mapped_column(String(60), index=True, nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    price_per_day: Mapped[float] = mapped_column(Numeric(10, 2), index=True, nullable=False)
    seats: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    fuel_type: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    transmission: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    mileage: Mapped[str] = mapped_column(String(30), default="", nullable=False)
    location: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    image_url: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    # stored as a comma separated list, exposed by the API as a string array
    features: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[CarStatus] = mapped_column(Enum(CarStatus), default=CarStatus.available, nullable=False)
    current_location: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    current_lat: Mapped[float] = mapped_column(Numeric(9, 6), default=0.0, nullable=False)
    current_lng: Mapped[float] = mapped_column(Numeric(9, 6), default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    bookings = relationship("Booking", back_populates="car", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_cars_location_category", "location", "category"),)

    @property
    def feature_list(self) -> list[str]:
        return [f.strip() for f in (self.features or "").split(",") if f.strip()]
