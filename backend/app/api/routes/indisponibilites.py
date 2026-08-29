from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.db.database import get_db
from app.models.salle import Salle, IndisponibiliteSalle
from app.schemas.salle import IndisponibiliteSalleCreate, IndisponibiliteSalleUpdate, IndisponibiliteSalleResponse

router = APIRouter()


def _format_item(item: IndisponibiliteSalle):
    return {
        "id": item.id,
        "salle_id": item.salle_id,
        "date_debut": str(item.date_debut),
        "date_fin": str(item.date_fin),
        "raison": item.raison or "",
        "motif": item.raison or "",
        "type_indisponibilite": item.type_indisponibilite or "maintenance",
    }


@router.get("", response_model=List[IndisponibiliteSalleResponse])
@router.get("/", response_model=List[IndisponibiliteSalleResponse], include_in_schema=False)
def get_all_indisponibilites(
    salle_id: Optional[int] = Query(None, description="Filtrer par salle"),
    db: Session = Depends(get_db),
):
    query = db.query(IndisponibiliteSalle)
    if salle_id is not None:
        query = query.filter(IndisponibiliteSalle.salle_id == salle_id)
    return [_format_item(item) for item in query.order_by(IndisponibiliteSalle.date_debut.asc()).all()]


@router.get("/{item_id}", response_model=IndisponibiliteSalleResponse)
def get_indisponibilite(item_id: int, db: Session = Depends(get_db)):
    item = db.get(IndisponibiliteSalle, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Indisponibilité non trouvée")
    return _format_item(item)


@router.post("", response_model=IndisponibiliteSalleResponse)
@router.post("/", response_model=IndisponibiliteSalleResponse, include_in_schema=False)
def create_indisponibilite(data: IndisponibiliteSalleCreate, db: Session = Depends(get_db)):
    if not data.salle_id:
        raise HTTPException(status_code=422, detail="L'identifiant de la salle est obligatoire")
    if not data.date_debut:
        raise HTTPException(status_code=422, detail="La date de début est obligatoire")
    if not data.date_fin:
        raise HTTPException(status_code=422, detail="La date de fin est obligatoire")

    salle = db.get(Salle, data.salle_id)
    if not salle:
        raise HTTPException(status_code=404, detail="Salle introuvable")

    d_debut = date.fromisoformat(str(data.date_debut).strip())
    d_fin = date.fromisoformat(str(data.date_fin).strip())
    if d_fin < d_debut:
        raise HTTPException(status_code=422, detail="date_fin doit être >= date_debut")

    raison_text = data.raison or data.motif or None
    type_text = data.type_indisponibilite or "maintenance"

    item = IndisponibiliteSalle(
        salle_id=data.salle_id,
        date_debut=d_debut,
        date_fin=d_fin,
        raison=raison_text,
        type_indisponibilite=type_text,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _format_item(item)


@router.put("/{item_id}", response_model=IndisponibiliteSalleResponse)
def update_indisponibilite(item_id: int, data: IndisponibiliteSalleUpdate, db: Session = Depends(get_db)):
    item = db.get(IndisponibiliteSalle, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Indisponibilité non trouvée")

    if data.date_debut is not None:
        item.date_debut = date.fromisoformat(str(data.date_debut).strip())
    if data.date_fin is not None:
        item.date_fin = date.fromisoformat(str(data.date_fin).strip())
    if data.raison is not None:
        item.raison = data.raison
    elif data.motif is not None:
        item.raison = data.motif
    if data.type_indisponibilite is not None:
        item.type_indisponibilite = data.type_indisponibilite

    if item.date_fin < item.date_debut:
        raise HTTPException(status_code=422, detail="date_fin doit être >= date_debut")

    db.commit()
    db.refresh(item)
    return _format_item(item)


@router.delete("/{item_id}", status_code=204)
def delete_indisponibilite(item_id: int, db: Session = Depends(get_db)):
    item = db.get(IndisponibiliteSalle, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Indisponibilité non trouvée")
    db.delete(item)
    db.commit()


@router.delete("/{salle_id}/{date_debut}", status_code=204)
def delete_indisponibilite_legacy(salle_id: int, date_debut: str, db: Session = Depends(get_db)):
    d = date.fromisoformat(date_debut.strip())
    item = db.query(IndisponibiliteSalle).filter(
        IndisponibiliteSalle.salle_id == salle_id,
        IndisponibiliteSalle.date_debut == d
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Indisponibilité non trouvée")
    db.delete(item)
    db.commit()

