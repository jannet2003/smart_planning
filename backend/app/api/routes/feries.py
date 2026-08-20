from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from app.db.database import get_db
from app.models.planning import JourFerie
from app.schemas.jour_ferie import JourFerieCreate, JourFerieUpdate, JourFerieResponse

router = APIRouter()


@router.get("", response_model=List[JourFerieResponse])
@router.get("/", response_model=List[JourFerieResponse], include_in_schema=False)
def get_all_jours_feries(db: Session = Depends(get_db)):
    return db.query(JourFerie).order_by(JourFerie.date.asc()).all()


@router.get("/{jour}", response_model=JourFerieResponse)
def get_jour_ferie(jour: date, db: Session = Depends(get_db)):
    item = db.get(JourFerie, jour)
    if not item:
        raise HTTPException(status_code=404, detail="Jour férié non trouvé")
    return item


@router.post("", response_model=JourFerieResponse)
@router.post("/", response_model=JourFerieResponse, include_in_schema=False)
def create_jour_ferie(data: JourFerieCreate, db: Session = Depends(get_db)):
    if not data.date:
        raise HTTPException(status_code=422, detail="La date est obligatoire")
    if not data.libelle or not data.libelle.strip():
        raise HTTPException(status_code=422, detail="Le libellé est obligatoire")

    existing = db.get(JourFerie, data.date)
    if existing:
        raise HTTPException(status_code=409, detail="Un jour férié existe déjà pour cette date")

    item = JourFerie(date=data.date, libelle=data.libelle.strip())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{jour}", response_model=JourFerieResponse)
def update_jour_ferie(jour: date, data: JourFerieUpdate, db: Session = Depends(get_db)):
    item = db.get(JourFerie, jour)
    if not item:
        raise HTTPException(status_code=404, detail="Jour férié non trouvé")

    if data.libelle is not None and data.libelle.strip():
        item.libelle = data.libelle.strip()

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{jour}", status_code=204)
def delete_jour_ferie(jour: date, db: Session = Depends(get_db)):
    item = db.get(JourFerie, jour)
    if not item:
        raise HTTPException(status_code=404, detail="Jour férié non trouvé")
    db.delete(item)
    db.commit()
