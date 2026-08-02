from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.models.planning import PlanningSemaine
from app.schemas.planning import PlanningSemaineCreate, PlanningSemaineResponse

router = APIRouter()


def _payload_from_model(data):
    if hasattr(data, "model_dump"):
        return data.model_dump()
    return data.dict()


@router.get("/history", response_model=List[PlanningSemaineResponse])
def get_planning_history(db: Session = Depends(get_db)):
    return (
        db.query(PlanningSemaine)
        .order_by(PlanningSemaine.date_validation.desc())
        .all()
    )


@router.get("/", response_model=List[PlanningSemaineResponse])
def get_all_plannings(db: Session = Depends(get_db)):
    return (
        db.query(PlanningSemaine)
        .order_by(PlanningSemaine.date_validation.desc())
        .all()
    )


@router.get("/{semaine_code}", response_model=PlanningSemaineResponse)
def get_planning_by_week(semaine_code: str, db: Session = Depends(get_db)):
    item = db.query(PlanningSemaine).filter(PlanningSemaine.semaine_code == semaine_code).first()
    if not item:
        raise HTTPException(status_code=404, detail="Planning non trouvé pour cette semaine")
    return item


@router.post("/", response_model=PlanningSemaineResponse)
def save_planning(data: PlanningSemaineCreate, db: Session = Depends(get_db)):
    if not data.semaine_code or not data.semaine_code.strip():
        raise HTTPException(status_code=422, detail="Le code de semaine est obligatoire")

    payload = _payload_from_model(data)
    payload["semaine_code"] = payload.get("semaine_code", "").strip()
    payload["snapshot_personnel"] = payload.get("snapshot_personnel") or []
    payload["snapshot_salles"] = payload.get("snapshot_salles") or []
    payload["affectations"] = payload.get("affectations") or {}

    existing = db.query(PlanningSemaine).filter(PlanningSemaine.semaine_code == payload["semaine_code"]).first()
    if existing:
        db.delete(existing)
        db.commit()

    item = PlanningSemaine(**payload)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
