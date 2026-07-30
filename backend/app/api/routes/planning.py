from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.models.planning import PlanningSemaine
from app.schemas.planning import PlanningSemaineCreate, PlanningSemaineResponse

router = APIRouter()

@router.get("/", response_model=List[PlanningSemaineResponse])
def get_all_plannings(db: Session = Depends(get_db)):
    return db.query(PlanningSemaine).all()

@router.get("/{semaine_code}", response_model=PlanningSemaineResponse)
def get_planning_by_week(semaine_code: str, db: Session = Depends(get_db)):
    item = db.query(PlanningSemaine).filter(PlanningSemaine.semaine_code == semaine_code).first()
    if not item:
        raise HTTPException(status_code=404, detail="Planning non trouvé pour cette semaine")
    return item

@router.post("/", response_model=PlanningSemaineResponse)
def save_planning(data: PlanningSemaineCreate, db: Session = Depends(get_db)):
    # Supprimer l'existant s'il y en a un pour la même semaine
    existing = db.query(PlanningSemaine).filter(PlanningSemaine.semaine_code == data.semaine_code).first()
    if existing:
        db.delete(existing)
        db.commit()
        
    item = PlanningSemaine(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
