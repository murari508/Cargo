import io
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.auth.security import create_access_token

client = TestClient(app)


def _make_dummy_card_image(width=400, height=250, blank=False):
    img = Image.new("RGB", (width, height), color=(240, 240, 240) if blank else (100, 150, 200))
    if not blank:
        # Add varied pixels so it's not a flat blank image
        for x in range(20, 200):
            for y in range(20, 80):
                img.putpixel((x, y), (20, 30, 40))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_license_verification_valid_image():
    token = create_access_token(3, "customer")  # aisha@example.com (id: 3)
    img_bytes = _make_dummy_card_image(width=400, height=250, blank=False)

    response = client.post(
        "/api/bookings/verify-license",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("driving_license.jpg", img_bytes, "image/jpeg")},
        data={"dl_number": "TS09 20230012345"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert "image_url" in data
    assert data["image_url"].startswith("/uploads/licenses/")


def test_license_verification_invalid_tiny_image():
    token = create_access_token(3, "customer")
    tiny_bytes = b"tiny"

    response = client.post(
        "/api/bookings/verify-license",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("tiny.jpg", tiny_bytes, "image/jpeg")},
        data={"dl_number": "TS09 20230012345"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert "too small" in data["reason"].lower()


def test_license_verification_blank_image():
    token = create_access_token(3, "customer")
    # All pixels identical color -> zero variance blank image
    blank_bytes = _make_dummy_card_image(width=400, height=250, blank=True)

    response = client.post(
        "/api/bookings/verify-license",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("blank.jpg", blank_bytes, "image/jpeg")},
        data={"dl_number": "TS09 20230012345"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert "blank" in data["reason"].lower() or "contrast" in data["reason"].lower()


def test_booking_rejected_without_verified_license():
    from datetime import date, timedelta
    token = create_access_token(6, "customer")  # madhu@gmail.com has no DL on file
    future_pickup = date.today() + timedelta(days=10)
    future_return = date.today() + timedelta(days=13)
    payload = {
        "car_id": 1,
        "pickup_location": "Hyderabad",
        "return_location": "Hyderabad",
        "pickup_date": future_pickup.isoformat(),
        "return_date": future_return.isoformat(),
        "driving_license": "",
        "license_image_url": "",
    }
    response = client.post(
        "/api/bookings",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert response.status_code == 400
    data = response.json()
    msg = data.get("error", {}).get("message", "") or data.get("detail", "")
    assert "Driving Licence" in str(msg)
