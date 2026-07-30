from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.models.personnel import Personnel
from app.schemas.personnel import PersonnelBase, PersonnelResponse

router = APIRouter()

@router.get("/", response_model=List[PersonnelResponse])
def get_all_personnel(db: Session = Depends(get_db)):
    return db.query(Personnel).all()

@router.post("/", response_model=PersonnelResponse)
def create_personnel(data: PersonnelBase, db: Session = Depends(get_db)):
    item = Personnel(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{personnel_id}")
def delete_personnel(personnel_id: int, db: Session = Depends(get_db)):
    item = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Personnel non trouvé")
    db.delete(item)
    db.commit()
    return {"message": "Personnel supprimé avec succès"}
