from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.personnel import Personnel, CongePersonnel
from app.schemas.personnel import CongePersonnelCreate, CongePersonnelUpdate, CongePersonnelResponse

router = APIRouter()


@router.get("/", response_model=List[CongePersonnelResponse])
def get_all_conges(
    personnel_id: Optional[int] = Query(None, description="Filtrer par personnel"),
    db: Session = Depends(get_db)
):
    query = db.query(CongePersonnel)
    if personnel_id is not None:
        query = query.filter(CongePersonnel.personnel_id == personnel_id)
    return query.order_by(CongePersonnel.date_debut.asc()).all()


@router.get("/{conge_id}", response_model=CongePersonnelResponse)
def get_conge(conge_id: int, db: Session = Depends(get_db)):
    item = db.query(CongePersonnel).filter(CongePersonnel.id == conge_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Congé non trouvé")
    return item


@router.post("/", response_model=CongePersonnelResponse)
def create_conge(data: CongePersonnelCreate, db: Session = Depends(get_db)):
    if not data.personnel_id:
        raise HTTPException(status_code=422, detail="L'identifiant du personnel est obligatoire")
    if not data.date_debut or not data.date_debut.strip():
        raise HTTPException(status_code=422, detail="La date de début est obligatoire")
    if not data.date_fin or not data.date_fin.strip():
        raise HTTPException(status_code=422, detail="La date de fin est obligatoire")

    personnel = db.query(Personnel).filter(Personnel.id == data.personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel introuvable")

    item = CongePersonnel(
        personnel_id=data.personnel_id,
        type=data.type or "flexible",
        date_debut=data.date_debut.strip(),
        date_fin=data.date_fin.strip(),
        raison=data.raison.strip() if data.raison else None
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{conge_id}", response_model=CongePersonnelResponse)
def update_conge(conge_id: int, data: CongePersonnelUpdate, db: Session = Depends(get_db)):
    item = db.query(CongePersonnel).filter(CongePersonnel.id == conge_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Congé non trouvé")

    if data.type is not None:
        item.type = data.type
    if data.date_debut is not None:
        item.date_debut = data.date_debut.strip()
    if data.date_fin is not None:
        item.date_fin = data.date_fin.strip()
    if data.raison is not None:
        item.raison = data.raison.strip() if data.raison else None

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{conge_id}")
def delete_conge(conge_id: int, db: Session = Depends(get_db)):
    item = db.query(CongePersonnel).filter(CongePersonnel.id == conge_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Congé non trouvé")
    db.delete(item)
    db.commit()
    return {"message": "Congé supprimé avec succès"}
