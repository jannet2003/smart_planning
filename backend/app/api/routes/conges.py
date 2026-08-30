from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.personnel import Personnel
from app.models.planning import Conge
from app.schemas.conge import CongeCreate, CongeResponse

router = APIRouter()


@router.get("", response_model=List[CongeResponse])
@router.get("/", response_model=List[CongeResponse], include_in_schema=False)
def get_conges(db: Session = Depends(get_db)):
    return db.query(Conge).order_by(Conge.date_debut).all()


@router.post("", response_model=CongeResponse)
@router.post("/", response_model=CongeResponse, include_in_schema=False)
def create_conge(data: CongeCreate, db: Session = Depends(get_db)):
    if data.date_fin < data.date_debut:
        raise HTTPException(status_code=422, detail="date_fin doit être postérieure ou égale à date_debut")
    if db.get(Personnel, data.personnel_id) is None:
        raise HTTPException(status_code=404, detail="Personnel non trouvé")
    item = Conge(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{conge_id}", status_code=204)
def delete_conge(conge_id: int, db: Session = Depends(get_db)):
    item = db.get(Conge, conge_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Congé non trouvé")
    db.delete(item)
    db.commit()
