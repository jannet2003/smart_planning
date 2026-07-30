from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.models.salle import Salle
from app.schemas.salle import SalleBase, SalleResponse

router = APIRouter()

@router.get("/", response_model=List[SalleResponse])
def get_all_salles(db: Session = Depends(get_db)):
    return db.query(Salle).all()

@router.post("/", response_model=SalleResponse)
def create_salle(data: SalleBase, db: Session = Depends(get_db)):
    item = Salle(**data.dict())
    db.add(item)
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
