from datetime import date
from app.services import pricing


def test_rental_days_same_day():
    today = date(2026, 9, 24)
    assert pricing.rental_days(today, today) == 1


def test_rental_days_multi_day():
    start = date(2026, 9, 24)
    end = date(2026, 9, 27)
    assert pricing.rental_days(start, end) == 4


def test_pricing_quote_hatchback():
    start = date(2026, 9, 24)
    end = date(2026, 9, 25)  # 2 days
    q = pricing.quote(1500, "Hatchback", start, end)

    assert q["rental_days"] == 2
    assert q["base_price"] == 3000.0
    assert q["taxes"] == 540.0         # 18% of 3000
    assert q["service_fee"] == 150.0   # 5% of 3000
    assert q["security_deposit"] == 3000.0  # Hatchback deposit
    assert q["total_amount"] == 3000.0 + 540.0 + 150.0 + 3000.0
    assert q["currency"] == "INR"


def test_pricing_quote_suv():
    start = date(2026, 9, 24)
    end = date(2026, 9, 24)  # 1 day
    q = pricing.quote(3000, "SUV", start, end)

    assert q["rental_days"] == 1
    assert q["base_price"] == 3000.0
    assert q["security_deposit"] == 7000.0  # SUV deposit
    assert q["taxes"] == 540.0
    assert q["service_fee"] == 150.0
    assert q["total_amount"] == 3000.0 + 540.0 + 150.0 + 7000.0


def test_pricing_quote_offroad_thar():
    start = date(2026, 9, 24)
    end = date(2026, 9, 26)  # 3 days
    q = pricing.quote(3800, "Off-road", start, end)

    assert q["rental_days"] == 3
    assert q["security_deposit"] == 8000.0  # Off-road deposit
    assert q["base_price"] == 11400.0
