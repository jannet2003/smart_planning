from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.salle import Salle
from app.schemas.salle import SalleCreate, SalleUpdate, SalleResponse

router = APIRouter()


def _payload_from_model(data):
    if hasattr(data, "model_dump"):
        return data.model_dump()
    return data.dict()


def _sync_salle_compatibility(item: Salle, senior_mode: str, compatible_rooms_raw: Optional[str], db: Session):
    if senior_mode != "SELECTIVE":
        item.compatible_rooms.clear()
        item.senior_compatible_rooms = ""
        return

    room_tokens = [r.strip() for r in str(compatible_rooms_raw or "").split(',') if r.strip()]
    if not room_tokens:
        item.compatible_rooms.clear()
        item.senior_compatible_rooms = ""
        return

    all_salles = db.query(Salle).filter(Salle.id != item.id).all()
    matching_salles = []
    for salle in all_salles:
        s_id_str = str(salle.id)
        s_nom_str = (salle.nom or "").strip().lower()
        for token in room_tokens:
            t_lower = token.lower()
            if token == s_id_str or t_lower == s_nom_str:
                if salle not in matching_salles:
                    matching_salles.append(salle)
                break
    item.compatible_rooms = matching_salles
    item.senior_compatible_rooms = ",".join(str(s.id) for s in matching_salles) if matching_salles else ",".join(room_tokens)


@router.get("/", response_model=List[SalleResponse])
def get_all_salles(
    actif: Optional[bool] = Query(None, description="Filtrer par état actif"),
    db: Session = Depends(get_db),
):
    query = db.query(Salle)
    if actif is not None:
        query = query.filter(Salle.actif == actif)
    return query.all()


@router.get("/{salle_id}", response_model=SalleResponse)
def get_salle(salle_id: int, db: Session = Depends(get_db)):
    item = db.query(Salle).filter(Salle.id == salle_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    return item


@router.post("/", response_model=SalleResponse)
def create_salle(data: SalleCreate, db: Session = Depends(get_db)):
    if not data.nom or not data.nom.strip():
        raise HTTPException(status_code=422, detail="Le nom de la salle est obligatoire")

    payload = _payload_from_model(data)
    payload["nom"] = payload.get("nom", "").strip()
    payload["actif"] = payload.get("actif") if payload.get("actif") is not None else True

    mode = payload.get("senior_mode", "EXCLUSIVE")
    compat_raw = payload.pop("senior_compatible_rooms", "")

    item = Salle(**payload)
    db.add(item)
    db.flush()

    _sync_salle_compatibility(item, mode, compat_raw, db)

    db.commit()
    db.refresh(item)
    return item


@router.put("/{salle_id}", response_model=SalleResponse)
def update_salle(salle_id: int, data: SalleUpdate, db: Session = Depends(get_db)):
    item = db.query(Salle).filter(Salle.id == salle_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Salle non trouvée")

    update_data = _payload_from_model(data)
    if not update_data:
        raise HTTPException(status_code=422, detail="Aucune donnée à mettre à jour")

    mode_provided = "senior_mode" in update_data
    compat_provided = "senior_compatible_rooms" in update_data

    new_mode = update_data.get("senior_mode", item.senior_mode or "EXCLUSIVE")
    new_compat_raw = update_data.get("senior_compatible_rooms", item.senior_compatible_rooms or "")

    for field, value in update_data.items():
        setattr(item, field, value)

    if mode_provided or compat_provided:
        _sync_salle_compatibility(item, new_mode, new_compat_raw, db)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{salle_id}")
def delete_salle(salle_id: int, db: Session = Depends(get_db)):
    item = db.query(Salle).filter(Salle.id == salle_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    if hasattr(item, "personnels"):
        item.personnels.clear()
    if hasattr(item, "compatible_rooms"):
        item.compatible_rooms.clear()
    db.delete(item)
    db.commit()
    return {"message": "Salle supprimée avec succès"}
