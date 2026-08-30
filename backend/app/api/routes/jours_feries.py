from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.planning import JourFerie
from app.schemas.jour_ferie import JourFerieCreate, JourFerieResponse

router = APIRouter()


@router.get("", response_model=List[JourFerieResponse])
@router.get("/", response_model=List[JourFerieResponse], include_in_schema=False)
def get_jours_feries(db: Session = Depends(get_db)):
    return db.query(JourFerie).order_by(JourFerie.date).all()


@router.get("/{jour}", response_model=JourFerieResponse)
def get_jour_ferie(jour: date, db: Session = Depends(get_db)):
    item = db.get(JourFerie, jour)
    if not item:
        raise HTTPException(status_code=404, detail="Jour férié non trouvé")
    return item


@router.post("", response_model=JourFerieResponse)
@router.post("/", response_model=JourFerieResponse, include_in_schema=False)
def create_jour_ferie(data: JourFerieCreate, db: Session = Depends(get_db)):
    if db.get(JourFerie, data.date) is not None:
        raise HTTPException(status_code=409, detail="Ce jour férié existe déjà")
    item = JourFerie(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{jour}", status_code=204)
def delete_jour_ferie(jour: date, db: Session = Depends(get_db)):
    item = db.get(JourFerie, jour)
    if item is None:
        raise HTTPException(status_code=404, detail="Jour férié non trouvé")
    db.delete(item)
    db.commit()
