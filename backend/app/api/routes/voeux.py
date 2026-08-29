from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.db.database import get_db
from app.models.voeu import Voeu
from app.models.personnel import Personnel
from app.models.salle import Salle
from app.schemas.voeu import VoeuCreate, VoeuResponse

router = APIRouter()


def _format_voeu(item: Voeu) -> dict:
    return {
        "id": item.id,
        "agent_id": item.agent_id,
        "jour": str(item.jour),
        "type": item.type,
        "salle_id": item.salle_id,
    }


@router.get("", response_model=List[VoeuResponse])
@router.get("/", response_model=List[VoeuResponse], include_in_schema=False)
def get_voeux(
    jour_debut: Optional[date] = Query(None, description="Date de début de l'intervalle"),
    jour_fin: Optional[date] = Query(None, description="Date de fin de l'intervalle"),
    db: Session = Depends(get_db),
):
    query = db.query(Voeu)
    if jour_debut:
        query = query.filter(Voeu.jour >= jour_debut)
    if jour_fin:
        query = query.filter(Voeu.jour <= jour_fin)
    items = query.order_by(Voeu.jour.asc(), Voeu.id.asc()).all()
    return [_format_voeu(item) for item in items]


@router.post("", response_model=VoeuResponse)
@router.post("/", response_model=VoeuResponse, include_in_schema=False)
def create_voeu(data: VoeuCreate, db: Session = Depends(get_db)):
    if data.type not in ["souhaite", "indisponible"]:
        raise HTTPException(status_code=422, detail="Type de vœu invalide : doit être 'souhaite' ou 'indisponible'")

    agent = db.get(Personnel, data.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent introuvable")

    salle_id_val = None
    if data.type == "souhaite":
        if not data.salle_id:
            raise HTTPException(status_code=422, detail="La salle est obligatoire pour un vœu de type 'souhaite'")
        salle = db.get(Salle, data.salle_id)
        if not salle:
            raise HTTPException(status_code=404, detail="Salle introuvable")
        salle_id_val = data.salle_id

    # Supprimer un éventuel vœu existant pour cet agent et ce jour pour éviter les doublons
    existing = db.query(Voeu).filter(Voeu.agent_id == data.agent_id, Voeu.jour == data.jour).first()
    if existing:
        existing.type = data.type
        existing.salle_id = salle_id_val
        db.commit()
        db.refresh(existing)
        return _format_voeu(existing)

    item = Voeu(
        agent_id=data.agent_id,
        jour=data.jour,
        type=data.type,
        salle_id=salle_id_val,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _format_voeu(item)


@router.delete("/{item_id}", status_code=204)
def delete_voeu(item_id: int, db: Session = Depends(get_db)):
    item = db.get(Voeu, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Vœu non trouvé")
    db.delete(item)
    db.commit()
