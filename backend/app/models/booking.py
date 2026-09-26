import enum
from datetime import date, datetime, time

from sqlalchemy import (Date, DateTime, Enum, ForeignKey, Index, Integer,
                        Numeric, String, Text, Time, func)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


class PaymentStatus(str, enum.Enum):
    unpaid = "unpaid"
    paid = "paid"
    refunded = "refunded"
    failed = "failed"


# Statuses that occupy the car on the calendar. Pending is included so two
# people cannot start checkout for the same car on the same dates.
BLOCKING_STATUSES = (BookingStatus.pending, BookingStatus.confirmed, BookingStatus.active)


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    car_id: Mapped[int] = mapped_column(ForeignKey("cars.id", ondelete="CASCADE"), index=True, nullable=False)

    pickup_location: Mapped[str] = mapped_column(String(120), nullable=False)
    return_location: Mapped[str] = mapped_column(String(120), nullable=False)
    pickup_date: Mapped[date] = mapped_column(Date, nullable=False)
    return_date: Mapped[date] = mapped_column(Date, nullable=False)
    pickup_time: Mapped[time] = mapped_column(Time, nullable=False)
    return_time: Mapped[time] = mapped_column(Time, nullable=False)
    driving_license: Mapped[str] = mapped_column(String(50), default="", nullable=False)
    license_image_url: Mapped[str] = mapped_column(String(255), default="", nullable=False)

    rental_days: Mapped[int] = mapped_column(Integer, nullable=False)
    base_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    taxes: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    service_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    security_deposit: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus), default=PaymentStatus.unpaid, nullable=False
    )
    booking_status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus), default=BookingStatus.pending, nullable=False
    )
    booking_reference: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    payment_reference: Mapped[str] = mapped_column(String(60), default="", nullable=False)
    destination: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    current_location: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    current_lat: Mapped[float] = mapped_column(Numeric(9, 6), default=0.0, nullable=False)
    current_lng: Mapped[float] = mapped_column(Numeric(9, 6), default=0.0, nullable=False)
    distance_travelled_km: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    trip_route: Mapped[str] = mapped_column(Text, default="", nullable=False)
    speed_kmh: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fuel_or_battery_level: Mapped[int] = mapped_column(Integer, default=85, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="bookings")
    car = relationship("Car", back_populates="bookings")

    __table_args__ = (
        Index("ix_bookings_car_dates", "car_id", "pickup_date", "return_date"),
        Index("ix_bookings_status", "booking_status"),
    )
