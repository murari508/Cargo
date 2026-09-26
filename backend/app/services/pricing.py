"""Single source of truth for money. The frontend never sends amounts."""
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

GST_RATE = Decimal("0.18")          # 18% GST on the rental value
SERVICE_FEE_RATE = Decimal("0.05")  # platform convenience fee

# refundable, blocked on the card / collected at pickup
SECURITY_DEPOSIT = {
    "Hatchback": Decimal("3000"),
    "Sedan": Decimal("5000"),
    "SUV": Decimal("7000"),
    "MUV": Decimal("7000"),
    "Off-road": Decimal("8000"),
    "Luxury": Decimal("15000"),
}
DEFAULT_DEPOSIT = Decimal("5000")


def _money(value: Decimal) -> float:
    return float(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def rental_days(pickup: date, ret: date) -> int:
    """Same-day return still counts as one full rental day."""
    return max((ret - pickup).days, 0) + 1


def quote(price_per_day, category: str, pickup: date, ret: date) -> dict:
    days = rental_days(pickup, ret)
    rate = Decimal(str(price_per_day))
    base = rate * days
    taxes = base * GST_RATE
    fee = base * SERVICE_FEE_RATE
    deposit = SECURITY_DEPOSIT.get(category, DEFAULT_DEPOSIT)
    total = base + taxes + fee + deposit
    return {
        "price_per_day": _money(rate),
        "rental_days": days,
        "base_price": _money(base),
        "taxes": _money(taxes),
        "tax_rate": float(GST_RATE),
        "service_fee": _money(fee),
        "security_deposit": _money(deposit),
        "total_amount": _money(total),
        "payable_now": _money(total),
        "currency": "INR",
    }
