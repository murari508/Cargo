from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "CarGo API"


def test_meta_api_info():
    response = client.get("/api")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "CarGo API"
    assert "English" in data["languages"]
    assert "Telugu" in data["languages"]
    assert "Hindi" in data["languages"]


def test_get_cars_filters():
    response = client.get("/api/cars/filters")
    assert response.status_code == 200
    data = response.json()
    assert "categories" in data
    assert "locations" in data
    assert "fuel_types" in data
    assert "transmissions" in data


def test_get_cars_fleet():
    response = client.get("/api/cars")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) > 0


def test_get_voice_languages():
    response = client.get("/api/voice/languages")
    assert response.status_code == 200
    langs = response.json()
    codes = [item["code"] for item in langs]
    assert "en" in codes
    assert "te" in codes
    assert "hi" in codes


def test_auth_login_invalid_credentials():
    response = client.post(
        "/api/auth/login",
        json={"email": "nonexistent@cargo.in", "password": "WrongPassword123"}
    )
    assert response.status_code == 401


def test_auth_login_demo_customer():
    response = client.post(
        "/api/auth/login",
        json={"email": "ravi@example.com", "password": "Password1"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "ravi@example.com"
    assert data["user"]["role"] == "customer"


def test_ai_car_assistant_query():
    response = client.post(
        "/api/ai/car-assistant",
        json={
            "message": "Show me SUVs under 4000 in Hyderabad",
            "language": "en"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "cars" in data


def test_admin_fleet_tracking():
    from app.auth.security import create_access_token
    token = create_access_token(1, "admin")
    response = client.get("/api/admin/tracking", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "trips" in data
    assert "summary" in data
    assert "active_on_road" in data["summary"]
    assert "unique_destinations" in data["summary"]
