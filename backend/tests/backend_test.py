"""Backend API tests for TriAxis Ventures.

Covers:
- GET  /api/            (health/service)
- POST /api/contact     (create contact inquiry)
- GET  /api/contact     (list contact inquiries + persistence check)
- Validation (invalid email -> 422; missing required -> 422)
"""

import os
import uuid
import requests
import pytest


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read from frontend/.env for local dev of tests
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as fh:
            for line in fh:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Root / health ----------
class TestRoot:
    def test_root_returns_service_and_status(self, api_client):
        r = api_client.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert "service" in data and "status" in data
        assert isinstance(data["service"], str) and len(data["service"]) > 0
        assert isinstance(data["status"], str) and len(data["status"]) > 0


# ---------- Contact endpoint ----------
class TestContact:
    def test_create_contact_valid(self, api_client):
        marker = f"TEST_{uuid.uuid4().hex[:10]}"
        payload = {
            "name": f"TEST_{marker}",
            "email": f"{marker}@example.com",
            "organization": "TEST Org",
            "inquiry_type": "investor",
            "message": "This is an automated test inquiry from backend_test.py",
        }
        r = api_client.post(f"{API}/contact", json=payload)
        assert r.status_code == 200, f"Unexpected status {r.status_code}: {r.text}"
        data = r.json()
        # Structural + value assertions
        assert "id" in data and isinstance(data["id"], str) and len(data["id"]) > 0
        assert "created_at" in data
        assert data["name"] == payload["name"]
        assert data["email"] == payload["email"]
        assert data["organization"] == payload["organization"]
        assert data["inquiry_type"] == payload["inquiry_type"]
        assert data["message"] == payload["message"]

        # Persistence: GET list and confirm our record is present
        r2 = api_client.get(f"{API}/contact")
        assert r2.status_code == 200
        items = r2.json()
        assert isinstance(items, list)
        found = [i for i in items if i.get("email") == payload["email"]]
        assert len(found) >= 1, "Newly created inquiry not returned by GET /api/contact"
        assert found[0]["name"] == payload["name"]
        assert found[0]["message"] == payload["message"]

    def test_create_contact_invalid_email_returns_422(self, api_client):
        payload = {
            "name": "TEST_bad_email",
            "email": "not-an-email",
            "message": "test",
        }
        r = api_client.post(f"{API}/contact", json=payload)
        assert r.status_code == 422, f"Expected 422 got {r.status_code}: {r.text}"

    def test_create_contact_missing_name_returns_422(self, api_client):
        payload = {
            "email": "someone@example.com",
            "message": "no name field",
        }
        r = api_client.post(f"{API}/contact", json=payload)
        assert r.status_code == 422

    def test_create_contact_empty_message_returns_422(self, api_client):
        payload = {
            "name": "TEST_empty_msg",
            "email": "t@example.com",
            "message": "",
        }
        r = api_client.post(f"{API}/contact", json=payload)
        assert r.status_code == 422

    def test_list_contacts_returns_list(self, api_client):
        r = api_client.get(f"{API}/contact")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # If any exist, they must have expected keys and no _id leak
        for item in data:
            assert "_id" not in item
            assert "id" in item and "email" in item and "name" in item and "created_at" in item


# ---------- Status endpoint (secondary) ----------
class TestStatus:
    def test_create_status(self, api_client):
        r = api_client.post(f"{API}/status", json={"client_name": "TEST_pytest"})
        assert r.status_code == 200
        data = r.json()
        assert data["client_name"] == "TEST_pytest"
        assert "id" in data and "timestamp" in data

    def test_list_status(self, api_client):
        r = api_client.get(f"{API}/status")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for item in data:
            assert "_id" not in item
