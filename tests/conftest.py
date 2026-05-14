import uuid
import pytest
import requests

BASE = "http://localhost:3000"


def _register(email, password="TestPass123"):
    return requests.post(f"{BASE}/api/auth/auth/register", json={
        "username": "ciuser",
        "email": email,
        "password": password,
        "address": "1 CI Street",
        "phone_number": "000-0000",
    })


@pytest.fixture
def unique_email():
    return f"ci_{uuid.uuid4().hex[:8]}@test.com"


@pytest.fixture
def registered_user(unique_email):
    r = _register(unique_email)
    assert r.status_code == 200, f"Registration failed: {r.text}"
    data = r.json()
    return {
        "email": unique_email,
        "password": "TestPass123",
        "token": data["token"],
        "user_id": data["user"]["id"],
        "headers": {"Authorization": f"Bearer {data['token']}"},
    }


@pytest.fixture(scope="session")
def all_products():
    r = requests.get(f"{BASE}/api/products/get_all_products/")
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="session")
def stocked_product(all_products):
    return next(p for p in all_products if p["stock"] > 10)
