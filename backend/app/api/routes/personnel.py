from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.personnel import Personnel
from app.schemas.personnel import PersonnelBase, PersonnelResponse, PersonnelUpdate

router = APIRouter()


def _payload_from_model(data):
    if hasattr(data, "model_dump"):
        return data.model_dump()
    return data.dict()


def _normalize_personnel_payload(item):
    return {
        "id": item.id,
        "nom": item.nom or "",
        "prenom": item.prenom or "",
        "role": item.role or "",
        "quotite_horaire": item.quotite_horaire if item.quotite_horaire is not None else 40,
        "statut": item.statut or "actif",
        "actif": item.actif if item.actif is not None else True,
        "matricule": item.matricule,
        "allowed_rooms": item.allowed_rooms or "",
        "has_garde": item.has_garde if item.has_garde is not None else False,
    }


@router.get("/", response_model=List[PersonnelResponse])
def get_all_personnel(
    role: Optional[str] = Query(None, description="Filtrer par rôle"),
    statut: Optional[str] = Query(None, description="Filtrer par statut"),
    db: Session = Depends(get_db),
):
    query = db.query(Personnel)
    if role:
        query = query.filter(Personnel.role == role)
    if statut:
        query = query.filter(Personnel.statut == statut)
    return [_normalize_personnel_payload(item) for item in query.all()]


@router.get("/{personnel_id}", response_model=PersonnelResponse)
def get_personnel(personnel_id: int, db: Session = Depends(get_db)):
    item = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Personnel non trouvé")
    return _normalize_personnel_payload(item)


@router.post("/", response_model=PersonnelResponse)
def create_personnel(data: PersonnelBase, db: Session = Depends(get_db)):
    if not data.nom or not data.nom.strip() or not data.prenom or not data.prenom.strip():
        raise HTTPException(status_code=422, detail="Nom et prénom sont obligatoires")

    payload = _payload_from_model(data)
    payload["nom"] = payload.get("nom", "").strip()
    payload["prenom"] = payload.get("prenom", "").strip()
    payload["role"] = payload.get("role", "").strip() or "TECH"
    if data.matricule:
        existing = db.query(Personnel).filter(Personnel.matricule == data.matricule).first()
        if existing:
            raise HTTPException(status_code=400, detail="Un personnel avec ce matricule existe déjà")

    payload["quotite_horaire"] = payload.get("quotite_horaire") if payload.get("quotite_horaire") is not None else 40
    payload["actif"] = payload.get("actif") if payload.get("actif") is not None else True
    payload["statut"] = payload.get("statut") or "actif"
    payload["has_garde"] = payload.get("has_garde") if payload.get("has_garde") is not None else False

    item = Personnel(**payload)
    db.add(item)
    db.commit()
    db.refresh(item)
    return _normalize_personnel_payload(item)


@router.put("/{personnel_id}", response_model=PersonnelResponse)
def update_personnel(personnel_id: int, data: PersonnelUpdate, db: Session = Depends(get_db)):
    item = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Personnel non trouvé")

    update_data = _payload_from_model(data)
    if not update_data:
        raise HTTPException(status_code=422, detail="Aucune donnée à mettre à jour")

    for key, value in update_data.items():
        if value is None:
            continue
        if key == "quotite_horaire":
            value = 40 if value is None else value
        elif key in {"nom", "prenom", "role"}:
            value = value.strip() if isinstance(value, str) else value
        elif key == "statut" and not value:
            continue
        elif key == "has_garde" and value is None:
            continue
        setattr(item, key, value)

    if "statut" in update_data:
        item.actif = update_data["statut"] == "actif"
    elif "actif" in update_data:
        item.statut = "actif" if update_data["actif"] else item.statut or "retrait"

    if item.nom is None:
        item.nom = ""
    if item.prenom is None:
        item.prenom = ""
    if item.role is None:
        item.role = "TECH"

    db.commit()
    db.refresh(item)
    return _normalize_personnel_payload(item)


@router.delete("/{personnel_id}")
def delete_personnel(personnel_id: int, db: Session = Depends(get_db)):
    item = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Personnel non trouvé")
    db.delete(item)
    db.commit()
    return {"message": "Personnel supprimé avec succès"}
