from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.models.planning import JourFerie
from app.schemas.planning import JourFerieCreate, JourFerieUpdate, JourFerieResponse

router = APIRouter()


@router.get("/", response_model=List[JourFerieResponse])
def get_all_jours_feries(db: Session = Depends(get_db)):
    return db.query(JourFerie).order_by(JourFerie.date.asc()).all()


@router.get("/{ferie_id}", response_model=JourFerieResponse)
def get_jour_ferie(ferie_id: int, db: Session = Depends(get_db)):
    item = db.query(JourFerie).filter(JourFerie.id == ferie_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Jour férié non trouvé")
    return item


@router.post("/", response_model=JourFerieResponse)
def create_jour_ferie(data: JourFerieCreate, db: Session = Depends(get_db)):
    if not data.date or not data.date.strip():
        raise HTTPException(status_code=422, detail="La date est obligatoire")
    if not data.libelle or not data.libelle.strip():
        raise HTTPException(status_code=422, detail="Le libellé est obligatoire")

    date_str = data.date.strip()
    existing = db.query(JourFerie).filter(JourFerie.date == date_str).first()
    if existing:
        raise HTTPException(status_code=400, detail="Un jour férié existe déjà pour cette date")

    item = JourFerie(date=date_str, libelle=data.libelle.strip())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{ferie_id}", response_model=JourFerieResponse)
def update_jour_ferie(ferie_id: int, data: JourFerieUpdate, db: Session = Depends(get_db)):
    item = db.query(JourFerie).filter(JourFerie.id == ferie_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Jour férié non trouvé")

    if data.date is not None:
        new_date = data.date.strip()
        existing = db.query(JourFerie).filter(JourFerie.date == new_date, JourFerie.id != ferie_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Un jour férié existe déjà pour cette date")
        item.date = new_date

    if data.libelle is not None:
        item.libelle = data.libelle.strip()

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{ferie_id}")
def delete_jour_ferie(ferie_id: int, db: Session = Depends(get_db)):
    item = db.query(JourFerie).filter(JourFerie.id == ferie_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Jour férié non trouvé")
    db.delete(item)
    db.commit()
    return {"message": "Jour férié supprimé avec succès"}
