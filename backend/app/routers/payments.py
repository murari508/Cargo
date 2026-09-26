from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (Booking, BookingStatus, CarStatus, PaymentStatus,
                        User, UserRole)
from app.schemas.payment import (PaymentCreate, PaymentCreated, PaymentResult,
                                 PaymentVerify)
from app.services import availability, payments

router = APIRouter(prefix="/api/payments", tags=["payments"])

# order_id -> (booking_id, signature). A real provider keeps this; the mock
# provider stores it in memory for the dev flow.
_ORDERS: dict[str, tuple[int, str]] = {}


@router.post("/create", response_model=PaymentCreated)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    booking = db.get(Booking, payload.booking_id)
    if booking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    if booking.user_id != user.id and user.role != UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This booking belongs to another account")
    if booking.payment_status == PaymentStatus.paid:
        raise HTTPException(status.HTTP_409_CONFLICT, "This booking is already paid")
    if booking.booking_status == BookingStatus.cancelled:
        raise HTTPException(status.HTTP_409_CONFLICT, "This booking was cancelled")

    # re-check the calendar: someone may have taken the slot during checkout
    if booking.car.status != CarStatus.available:
        raise HTTPException(status.HTTP_409_CONFLICT, "This car is no longer bookable")
    clash = availability.overlapping_bookings(db, booking.car_id, booking.pickup_date,
                                              booking.return_date, exclude_booking_id=booking.id)
    if clash:
        raise HTTPException(status.HTTP_409_CONFLICT, "Those dates were just taken")

    provider = payments.get_provider()
    order = provider.create_order(float(booking.total_amount), booking.booking_reference,
                                  payload.method)
    _ORDERS[order["order_id"]] = (booking.id, order["signature"])
    return PaymentCreated(
        order_id=order["order_id"],
        booking_reference=booking.booking_reference,
        amount=float(booking.total_amount),
        provider=order["provider"],
        checkout_token=order["checkout_token"],
    )


@router.post("/verify", response_model=PaymentResult)
def verify_payment(payload: PaymentVerify, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    entry = _ORDERS.get(payload.order_id)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown payment order")
    booking_id, _ = entry
    provider = payments.get_provider()
    if not provider.verify(payload.order_id, payload.checkout_token, payload.signature):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Payment signature did not match")

    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    if booking.user_id != user.id and user.role != UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This booking belongs to another account")

    booking.payment_status = PaymentStatus.paid
    booking.booking_status = BookingStatus.confirmed
    booking.payment_reference = payload.order_id
    db.commit()
    _ORDERS.pop(payload.order_id, None)
    return PaymentResult(success=True, booking_reference=booking.booking_reference,
                         payment_status=booking.payment_status.value,
                         booking_status=booking.booking_status.value,
                         message="Payment received. Your booking is confirmed.")


@router.post("/mock/checkout")
def mock_checkout(order_id: str, checkout_token: str, outcome: str = "success"):
    """Stands in for the provider's hosted checkout page during development.

    A real gateway shows its own screen, takes the card or UPI PIN, and posts a
    signed receipt back. Nothing else in the app changes when you swap it out.
    Disabled automatically as soon as a real provider is configured.
    """
    provider = payments.get_provider()
    if not isinstance(provider, payments.MockProvider):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not available")
    if order_id not in _ORDERS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown payment order")
    if outcome != "success":
        return {"status": "failed", "signature": ""}
    return {"status": "success", "order_id": order_id,
            "signature": provider._sign(order_id, checkout_token)}


@router.get("/methods")
def methods():
    return {
        "provider": payments.get_provider().name,
        "methods": [
            {"id": "upi", "label": "UPI"},
            {"id": "card", "label": "Credit or debit card"},
            {"id": "netbanking", "label": "Net banking"},
            {"id": "wallet", "label": "Wallet"},
        ],
        "note": "Card details are collected by the provider's hosted checkout, never by CarGo.",
    }
