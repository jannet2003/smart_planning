from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.salle import Salle, IndisponibiliteSalle
from app.schemas.salle import IndisponibiliteSalleCreate, IndisponibiliteSalleUpdate, IndisponibiliteSalleResponse

router = APIRouter()


@router.get("/", response_model=List[IndisponibiliteSalleResponse])
def get_all_indisponibilites(
    salle_id: Optional[int] = Query(None, description="Filtrer par salle"),
    db: Session = Depends(get_db)
):
    query = db.query(IndisponibiliteSalle)
    if salle_id is not None:
        query = query.filter(IndisponibiliteSalle.salle_id == salle_id)
    return query.order_by(IndisponibiliteSalle.date_debut.asc()).all()


@router.get("/{indisp_id}", response_model=IndisponibiliteSalleResponse)
def get_indisponibilite(indisp_id: int, db: Session = Depends(get_db)):
    item = db.query(IndisponibiliteSalle).filter(IndisponibiliteSalle.id == indisp_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Indisponibilité non trouvée")
    return item


@router.post("/", response_model=IndisponibiliteSalleResponse)
def create_indisponibilite(data: IndisponibiliteSalleCreate, db: Session = Depends(get_db)):
    if not data.salle_id:
        raise HTTPException(status_code=422, detail="L'identifiant de la salle est obligatoire")
    if not data.date_debut or not data.date_debut.strip():
        raise HTTPException(status_code=422, detail="La date de début est obligatoire")
    if not data.date_fin or not data.date_fin.strip():
        raise HTTPException(status_code=422, detail="La date de fin est obligatoire")

    salle = db.query(Salle).filter(Salle.id == data.salle_id).first()
    if not salle:
        raise HTTPException(status_code=404, detail="Salle introuvable")

    item = IndisponibiliteSalle(
        salle_id=data.salle_id,
        date_debut=data.date_debut.strip(),
        date_fin=data.date_fin.strip(),
        motif=data.motif.strip() if data.motif else None
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{indisp_id}", response_model=IndisponibiliteSalleResponse)
def update_indisponibilite(indisp_id: int, data: IndisponibiliteSalleUpdate, db: Session = Depends(get_db)):
    item = db.query(IndisponibiliteSalle).filter(IndisponibiliteSalle.id == indisp_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Indisponibilité non trouvée")

    if data.date_debut is not None:
        item.date_debut = data.date_debut.strip()
    if data.date_fin is not None:
        item.date_fin = data.date_fin.strip()
    if data.motif is not None:
        item.motif = data.motif.strip() if data.motif else None

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{indisp_id}")
def delete_indisponibilite(indisp_id: int, db: Session = Depends(get_db)):
    item = db.query(IndisponibiliteSalle).filter(IndisponibiliteSalle.id == indisp_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Indisponibilité non trouvée")
    db.delete(item)
    db.commit()
    return {"message": "Indisponibilité supprimée avec succès"}
