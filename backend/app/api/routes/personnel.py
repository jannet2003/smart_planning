from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.personnel import Personnel
from app.models.salle import Salle
from app.schemas.personnel import PersonnelCreate, PersonnelUpdate, PersonnelResponse, PersonnelBase

router = APIRouter()


def _format_personnel(item: Personnel) -> dict:
    return {
        "id": item.id,
        "matricule": item.matricule,
        "nom": item.nom,
        "categorie": item.categorie,
        "statut": item.statut,
        "salle_ids": [s.id for s in item.salles] if item.salles else []
    }


@router.get("/", response_model=List[PersonnelResponse])
def get_all_personnel(
    categorie: Optional[str] = Query(None, description="Filtrer par catégorie"),
    statut: Optional[str] = Query(None, description="Filtrer par statut"),
    db: Session = Depends(get_db),
):
    query = db.query(Personnel)
    if categorie:
        query = query.filter(Personnel.categorie == categorie)
    if statut:
        query = query.filter(Personnel.statut == statut)
    items = query.order_by(Personnel.id.asc()).all()
    return [_format_personnel(item) for item in items]


@router.get("/{personnel_id}", response_model=PersonnelResponse)
def get_personnel(personnel_id: int, db: Session = Depends(get_db)):
    item = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Personnel non trouvé")
    return _format_personnel(item)


@router.post("/", response_model=PersonnelResponse)
def create_personnel(data: PersonnelCreate, db: Session = Depends(get_db)):
    if not data.nom or not data.nom.strip():
        raise HTTPException(status_code=422, detail="Le nom est obligatoire")
    if not data.matricule or not str(data.matricule).strip():
        raise HTTPException(status_code=422, detail="La matricule est obligatoire")

    mat_str = str(data.matricule).strip()
    existing = db.query(Personnel).filter(Personnel.matricule == mat_str).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cette matricule est déjà utilisée par un autre agent")

    nom_str = data.nom.strip()
    cat_str = (data.categorie or "TECH").strip()
    statut_str = (data.statut or "actif").strip()

    item = Personnel(
        matricule=mat_str,
        nom=nom_str,
        categorie=cat_str,
        statut=statut_str
    )
    db.add(item)
    db.flush()

    if data.salle_ids:
        salles = db.query(Salle).filter(Salle.id.in_(data.salle_ids)).all()
        item.salles = salles

    db.commit()
    db.refresh(item)
    return _format_personnel(item)


@router.put("/{personnel_id}", response_model=PersonnelResponse)
def update_personnel(personnel_id: int, data: PersonnelUpdate, db: Session = Depends(get_db)):
    item = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Personnel non trouvé")

    if data.matricule is not None:
        new_mat = str(data.matricule).strip()
        if not new_mat:
            raise HTTPException(status_code=422, detail="La matricule ne peut pas être vide")
        existing = db.query(Personnel).filter(Personnel.matricule == new_mat, Personnel.id != personnel_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Cette matricule est déjà utilisée par un autre agent")
        item.matricule = new_mat

    if data.nom is not None:
        new_nom = data.nom.strip()
        if not new_nom:
            raise HTTPException(status_code=422, detail="Le nom ne peut pas être vide")
        item.nom = new_nom

    if data.categorie is not None:
        item.categorie = data.categorie.strip()

    if data.statut is not None:
        item.statut = data.statut.strip()

    if data.salle_ids is not None:
        salles = db.query(Salle).filter(Salle.id.in_(data.salle_ids)).all()
        item.salles = salles

    db.commit()
    db.refresh(item)
    return _format_personnel(item)


@router.delete("/{personnel_id}")
def delete_personnel(personnel_id: int, db: Session = Depends(get_db)):
    item = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Personnel non trouvé")
    item.salles.clear()
    db.delete(item)
    db.commit()
    return {"message": "Personnel supprimé avec succès"}


# Salles autorisées (Sous-routes REST explicites)
@router.get("/{personnel_id}/salles")
def get_personnel_salles(personnel_id: int, db: Session = Depends(get_db)):
    item = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Personnel non trouvé")
    return [{"id": s.id, "nom": s.nom} for s in item.salles]


@router.post("/{personnel_id}/salles/{salle_id}")
def add_authorized_room(personnel_id: int, salle_id: int, db: Session = Depends(get_db)):
    item = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Personnel non trouvé")
    salle = db.query(Salle).filter(Salle.id == salle_id).first()
    if not salle:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    if salle not in item.salles:
        item.salles.append(salle)
        db.commit()
    return {"message": f"Salle {salle.nom} autorisée pour {item.nom}", "salle_ids": [s.id for s in item.salles]}


@router.delete("/{personnel_id}/salles/{salle_id}")
def remove_authorized_room(personnel_id: int, salle_id: int, db: Session = Depends(get_db)):
    item = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Personnel non trouvé")
    salle = db.query(Salle).filter(Salle.id == salle_id).first()
    if not salle:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    if salle in item.salles:
        item.salles.remove(salle)
        db.commit()
    return {"message": f"Salle {salle.nom} retirée pour {item.nom}", "salle_ids": [s.id for s in item.salles]}
