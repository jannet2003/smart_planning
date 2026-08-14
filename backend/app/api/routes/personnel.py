from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.personnel import Personnel
from app.models.salle import Salle
from app.schemas.personnel import PersonnelBase, PersonnelResponse, PersonnelUpdate

router = APIRouter()


def _payload_from_model(data):
    if hasattr(data, "model_dump"):
        return data.model_dump()
    return data.dict()


def _sync_personnel_salles(item: Personnel, allowed_rooms_str: Optional[str], db: Session):
    if allowed_rooms_str is None:
        return
    room_tokens = [r.strip() for r in str(allowed_rooms_str).split(',') if r.strip()]
    if not room_tokens:
        item.salles.clear()
        item.allowed_rooms = ""
        return

    all_salles = db.query(Salle).all()
    matching_salles = []
    for salle in all_salles:
        salle_id_str = str(salle.id)
        salle_nom_str = (salle.nom or "").strip().lower()
        for token in room_tokens:
            token_lower = token.lower()
            if token == salle_id_str or token_lower == salle_nom_str:
                if salle not in matching_salles:
                    matching_salles.append(salle)
                break
    item.salles = matching_salles
    item.allowed_rooms = ",".join(str(s.id) for s in matching_salles) if matching_salles else ",".join(room_tokens)


def _normalize_personnel_payload(item: Personnel):
    allowed = item.allowed_rooms or ""
    if item.salles:
        allowed = ",".join(str(s.id) for s in item.salles)
    return {
        "id": item.id,
        "matricule": item.matricule or f"ID-{item.id}",
        "nom": item.nom or "",
        "role": item.role or "",
        "statut": item.statut or "actif",
        "actif": item.actif if item.actif is not None else True,
        "allowed_rooms": allowed,
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
    if not data.nom or not data.nom.strip():
        raise HTTPException(status_code=422, detail="Le nom est obligatoire")

    payload = _payload_from_model(data)
    payload["nom"] = payload.get("nom", "").strip()
    payload["role"] = payload.get("role", "").strip() or "TECH"
    if payload.get("matricule"):
        payload["matricule"] = payload["matricule"].strip()

    allowed_rooms_raw = payload.pop("allowed_rooms", "")

    payload["actif"] = payload.get("actif") if payload.get("actif") is not None else True
    payload["statut"] = payload.get("statut") or "actif"

    item = Personnel(**payload)
    db.add(item)
    db.flush()

    if not item.matricule:
        item.matricule = f"ID-{item.id}"

    _sync_personnel_salles(item, allowed_rooms_raw, db)

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

    allowed_rooms_provided = "allowed_rooms" in update_data
    allowed_rooms_raw = update_data.pop("allowed_rooms", None)

    for key, value in update_data.items():
        if value is None:
            continue
        if key in {"nom", "role", "matricule"}:
            value = value.strip() if isinstance(value, str) else value
        elif key == "statut" and not value:
            continue
        setattr(item, key, value)

    if "statut" in update_data:
        item.actif = update_data["statut"] == "actif"
    elif "actif" in update_data:
        item.statut = "actif" if update_data["actif"] else item.statut or "retrait"

    if item.nom is None:
        item.nom = ""
    if item.role is None:
        item.role = "TECH"

    if allowed_rooms_provided:
        _sync_personnel_salles(item, allowed_rooms_raw, db)

    db.commit()
    db.refresh(item)
    return _normalize_personnel_payload(item)


@router.delete("/{personnel_id}")
def delete_personnel(personnel_id: int, db: Session = Depends(get_db)):
    item = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Personnel non trouvé")
    item.salles.clear()
    db.delete(item)
    db.commit()
    return {"message": "Personnel supprimé avec succès"}
