import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app
from app.db.database import Base, engine
from app.models.personnel import Personnel
from app.models.salle import Salle
from app.models.planning import PlanningSemaine


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def test_create_and_get_personnel():
    payload = {
        "nom": "Alice Durand",
        "role": "SENIOR",
        "statut": "actif",
    }

    response = client.post("/api/personnel/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["nom"] == "Alice Durand"

    get_response = client.get("/api/personnel/")
    assert get_response.status_code == 200
    assert len(get_response.json()) == 1


def test_create_and_get_salle():
    payload = {
        "nom": "Scanner A",
        "actif": True,
    }

    response = client.post("/api/salles/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["nom"] == "Scanner A"

    get_response = client.get("/api/salles/")
    assert get_response.status_code == 200
    assert len(get_response.json()) == 1


def test_create_and_get_planning():
    payload = {
        "semaine_code": "2026-W31",
        "snapshot_personnel": [{"nom": "Test"}],
        "snapshot_salles": [{"nom": "Scanner A"}],
        "affectations": [{"personnel": "Test", "salle": "Scanner A"}],
    }

    response = client.post("/api/planning/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["semaine_code"] == "2026-W31"

    get_response = client.get("/api/planning/2026-W31")
    assert get_response.status_code == 200
    assert get_response.json()["semaine_code"] == "2026-W31"


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data


def test_update_personnel_status():
    create_response = client.post(
        "/api/personnel/",
        json={
            "nom": "Alice Durand",
            "role": "SENIOR",
            "statut": "actif",
            "actif": True,
        },
    )
    assert create_response.status_code == 200
    personnel_id = create_response.json()["id"]

    update_response = client.put(
        f"/api/personnel/{personnel_id}",
        json={"statut": "hors_service", "actif": False},
    )

    assert update_response.status_code == 200
    data = update_response.json()
    assert data["statut"] == "hors_service"
    assert data["actif"] is False
