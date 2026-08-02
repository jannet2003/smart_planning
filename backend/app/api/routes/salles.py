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


@router.get("/", response_model=List[SalleResponse])
def get_all_salles(
    type_salle: Optional[str] = Query(None, description="Filtrer par type de salle"),
    actif: Optional[bool] = Query(None, description="Filtrer par état actif"),
    db: Session = Depends(get_db),
):
    query = db.query(Salle)
    if type_salle:
        query = query.filter(Salle.type_salle == type_salle)
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
    if not data.type_salle or not data.type_salle.strip():
        raise HTTPException(status_code=422, detail="Le type de salle est obligatoire")

    payload = _payload_from_model(data)
    payload["nom"] = payload.get("nom", "").strip()
    payload["type_salle"] = payload.get("type_salle", "").strip()
    payload["code"] = payload.get("code") or payload.get("type_salle")
    payload["actif"] = payload.get("actif") if payload.get("actif") is not None else True

    item = Salle(**payload)
    db.add(item)
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

    for field, value in update_data.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{salle_id}")
def delete_salle(salle_id: int, db: Session = Depends(get_db)):
    item = db.query(Salle).filter(Salle.id == salle_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    db.delete(item)
    db.commit()
    return {"message": "Salle supprimée avec succès"}
