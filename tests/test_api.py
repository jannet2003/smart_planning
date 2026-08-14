import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app
from app.db.database import Base, engine
from app.models import Personnel, Salle, CongePersonnel, IndisponibiliteSalle, JourFerie, PlanningSemaine

@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_create_and_get_personnel():
    payload = {
        "matricule": "MAT_001",
        "nom": "Dr. Alice Durand",
        "categorie": "SENIOR",
        "statut": "actif",
    }
    response = client.post("/api/personnel/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["matricule"] == "MAT_001"
    assert data["nom"] == "Dr. Alice Durand"
    assert data["categorie"] == "SENIOR"
    assert data["statut"] == "actif"
    assert "id" in data

    # Refus doublon matricule
    dup_resp = client.post("/api/personnel/", json=payload)
    assert dup_resp.status_code == 400

    get_response = client.get("/api/personnel/")
    assert get_response.status_code == 200
    assert len(get_response.json()) == 1


def test_update_personnel_and_rooms():
    # Créer 2 salles
    s1 = client.post("/api/salles/", json={"nom": "Scanner 1"}).json()
    s2 = client.post("/api/salles/", json={"nom": "IRM 1"}).json()

    # Créer agent avec salles autorisées
    p_resp = client.post("/api/personnel/", json={
        "matricule": "100",
        "nom": "Bob Martin",
        "categorie": "TECH",
        "statut": "actif",
        "salle_ids": [s1["id"], s2["id"]]
    })
    assert p_resp.status_code == 200
    pid = p_resp.json()["id"]
    assert len(p_resp.json()["salle_ids"]) == 2

    # Modifier statut et matricule
    u_resp = client.put(f"/api/personnel/{pid}", json={
        "matricule": "200",
        "statut": "hors_service",
        "salle_ids": [s1["id"]]
    })
    assert u_resp.status_code == 200
    u_data = u_resp.json()
    assert u_data["matricule"] == "200"
    assert u_data["statut"] == "hors_service"
    assert u_data["salle_ids"] == [s1["id"]]


def test_salle_and_compatibilites():
    s1 = client.post("/api/salles/", json={"nom": "Radio 1", "senior_mode": "COMBINABLE"}).json()
    s2 = client.post("/api/salles/", json={"nom": "Radio 2", "senior_mode": "SELECTIVE", "compatible_salle_ids": [s1["id"]]}).json()

    assert s2["compatible_salle_ids"] == [s1["id"]]

    # Récupérer par sous-route
    compats = client.get(f"/api/salles/{s2['id']}/compatibilites").json()
    assert len(compats) == 1
    assert compats[0]["id"] == s1["id"]


def test_conges_crud():
    p = client.post("/api/personnel/", json={"matricule": "CONG_01", "nom": "Claire", "categorie": "INF"}).json()
    
    conge = client.post("/api/conges/", json={
        "personnel_id": p["id"],
        "type": "bloc_30",
        "date_debut": "2026-07-01",
        "date_fin": "2026-07-30",
        "raison": "Vacances été"
    }).json()
    assert conge["id"] is not None
    assert conge["personnel_id"] == p["id"]

    all_conges = client.get(f"/api/conges/?personnel_id={p['id']}").json()
    assert len(all_conges) == 1

    del_resp = client.delete(f"/api/conges/{conge['id']}")
    assert del_resp.status_code == 200
    assert len(client.get("/api/conges/").json()) == 0


def test_indisponibilites_crud():
    s = client.post("/api/salles/", json={"nom": "Echo Test"}).json()
    
    indisp = client.post("/api/indisponibilites/", json={
        "salle_id": s["id"],
        "date_debut": "2026-08-01",
        "date_fin": "2026-08-03",
        "motif": "Panne sonde"
    }).json()
    assert indisp["id"] is not None

    all_indisps = client.get(f"/api/indisponibilites/?salle_id={s['id']}").json()
    assert len(all_indisps) == 1

    del_resp = client.delete(f"/api/indisponibilites/{indisp['id']}")
    assert del_resp.status_code == 200
    assert len(client.get("/api/indisponibilites/").json()) == 0


def test_jours_feries_crud():
    jf = client.post("/api/jours-feries/", json={"date": "2026-03-20", "libelle": "Indépendance"}).json()
    assert jf["date"] == "2026-03-20"

    # Doublon rejeté
    dup = client.post("/api/jours-feries/", json={"date": "2026-03-20", "libelle": "Autre"})
    assert dup.status_code == 400

    del_resp = client.delete(f"/api/jours-feries/{jf['id']}")
    assert del_resp.status_code == 200


def test_planning_and_snapshots():
    payload = {
        "semaine_code": "2026-W32",
        "snapshot_personnel": [{"matricule": "M1", "nom": "Dr Test", "categorie": "SENIOR"}],
        "snapshot_salles": [{"nom": "Scanner", "senior_mode": "EXCLUSIVE"}],
        "affectations": {"gridAssignments": {"M1_2026-08-03": "Scanner"}},
    }

    response = client.post("/api/planning/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["semaine_code"] == "2026-W32"

    get_response = client.get("/api/planning/2026-W32")
    assert get_response.status_code == 200
    assert get_response.json()["semaine_code"] == "2026-W32"
    assert get_response.json()["snapshot_personnel"] == [{"matricule": "M1", "nom": "Dr Test", "categorie": "SENIOR"}]
