import os
import sys
import tempfile

import pytest
from fastapi.testclient import TestClient

# Les tests ne doivent jamais ouvrir, ni a fortiori recréer, la base migrée.
# Cette variable est lue par app.db.database avant l'import de l'application.
TEST_DB = os.path.join(tempfile.mkdtemp(prefix="radiologie-api-tests-"), "planning-test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.replace(os.sep, '/') }"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app
from app.db.database import Base, engine
from app.models.personnel import Personnel
from app.models.salle import Salle


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
    personnel = client.post("/api/personnel", json={"nom": "Test", "role": "SENIOR"}).json()
    salle = client.post("/api/salles", json={"nom": "Scanner A"}).json()
    payload = {"personnel_id": personnel["id"], "salle_id": salle["id"], "date": "2026-08-03", "periode": "jour"}

    response = client.post("/api/planning", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["personnel_id"] == personnel["id"]
    assert data["salle_id"] == salle["id"]

    get_response = client.get("/api/planning")
    assert get_response.status_code == 200
    assert len(get_response.json()) == 1


def test_duplicate_room_name_returns_a_clear_error():
    assert client.post("/api/salles/", json={"nom": "Scanner A"}).status_code == 200

    duplicate_response = client.post("/api/salles/", json={"nom": "Scanner A"})

    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["detail"] == "Une salle portant ce nom existe déjà"


def test_holiday_blocks_planning_assignment():
    personnel = client.post("/api/personnel", json={"nom": "Test", "role": "SENIOR"}).json()
    salle = client.post("/api/salles", json={"nom": "Scanner A"}).json()
    holiday = client.post("/api/jours-feries", json={"date": "2026-08-04", "libelle": "Test"})
    assert holiday.status_code == 200

    response = client.post(
        "/api/planning",
        json={"personnel_id": personnel["id"], "salle_id": salle["id"], "date": "2026-08-04", "periode": "jour"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Affectation interdite un jour férié"


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


def test_save_and_get_weekly_planning():
    personnel = client.post("/api/personnel", json={"nom": "Dr Martin", "role": "SENIOR", "matricule": "MAT-01"}).json()
    salle = client.post("/api/salles", json={"nom": "IRM 1"}).json()

    weekly_payload = {
        "semaine_code": "2026-08-10",
        "affectations": {
            "datesList": ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16"],
            "gridAssignments": {
                f"{personnel['matricule']}_2026-08-10": "IRM 1",
                f"{personnel['matricule']}_2026-08-11": "IRM 1",
            },
            "nightAssignments": {
                f"{personnel['matricule']}_2026-08-12": "GARDE",
            }
        }
    }

    save_res = client.post("/api/planning", json=weekly_payload)
    assert save_res.status_code == 200
    save_data = save_res.json()
    assert save_data["status"] == "success"
    assert save_data["saved_count"] >= 3

    get_week = client.get("/api/planning/2026-08-10")
    assert get_week.status_code == 200
    records = get_week.json()
    assert len(records) >= 3
