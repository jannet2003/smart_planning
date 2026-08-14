from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.salle import Salle
from app.schemas.salle import SalleCreate, SalleUpdate, SalleResponse

router = APIRouter()


def _format_salle(item: Salle) -> dict:
    return {
        "id": item.id,
        "nom": item.nom,
        "min_senior": item.min_senior,
        "max_senior": item.max_senior,
        "min_resident": item.min_resident,
        "max_resident": item.max_resident,
        "min_inf": item.min_inf,
        "max_inf": item.max_inf,
        "min_tech": item.min_tech,
        "max_tech": item.max_tech,
        "senior_mode": item.senior_mode or "EXCLUSIVE",
        "mode_compatibilite": item.mode_compatibilite or "AUCUNE",
        "compatible_salle_ids": [c.id for c in item.compatible_rooms] if item.compatible_rooms else []
    }


@router.get("/", response_model=List[SalleResponse])
def get_all_salles(db: Session = Depends(get_db)):
    items = db.query(Salle).order_by(Salle.id.asc()).all()
    return [_format_salle(item) for item in items]


@router.get("/{salle_id}", response_model=SalleResponse)
def get_salle(salle_id: int, db: Session = Depends(get_db)):
    item = db.query(Salle).filter(Salle.id == salle_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    return _format_salle(item)


@router.post("/", response_model=SalleResponse)
def create_salle(data: SalleCreate, db: Session = Depends(get_db)):
    if not data.nom or not data.nom.strip():
        raise HTTPException(status_code=422, detail="Le nom de la salle est obligatoire")

    item = Salle(
        nom=data.nom.strip(),
        min_senior=data.min_senior,
        max_senior=data.max_senior,
        min_resident=data.min_resident,
        max_resident=data.max_resident,
        min_inf=data.min_inf,
        max_inf=data.max_inf,
        min_tech=data.min_tech,
        max_tech=data.max_tech,
        senior_mode=data.senior_mode or "EXCLUSIVE",
        mode_compatibilite=data.mode_compatibilite or "AUCUNE"
    )
    db.add(item)
    db.flush()

    if data.compatible_salle_ids:
        compat_rooms = db.query(Salle).filter(Salle.id.in_(data.compatible_salle_ids), Salle.id != item.id).all()
        item.compatible_rooms = compat_rooms

    db.commit()
    db.refresh(item)
    return _format_salle(item)


@router.put("/{salle_id}", response_model=SalleResponse)
def update_salle(salle_id: int, data: SalleUpdate, db: Session = Depends(get_db)):
    item = db.query(Salle).filter(Salle.id == salle_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Salle non trouvée")

    if data.nom is not None:
        new_nom = data.nom.strip()
        if not new_nom:
            raise HTTPException(status_code=422, detail="Le nom de la salle ne peut pas être vide")
        item.nom = new_nom

    for field in ["min_senior", "max_senior", "min_resident", "max_resident", "min_inf", "max_inf", "min_tech", "max_tech"]:
        val = getattr(data, field, None)
        if val is not None:
            setattr(item, field, val)

    if data.senior_mode is not None:
        item.senior_mode = data.senior_mode
    if data.mode_compatibilite is not None:
        item.mode_compatibilite = data.mode_compatibilite

    if data.compatible_salle_ids is not None:
        compat_rooms = db.query(Salle).filter(Salle.id.in_(data.compatible_salle_ids), Salle.id != item.id).all()
        item.compatible_rooms = compat_rooms

    db.commit()
    db.refresh(item)
    return _format_salle(item)


@router.delete("/{salle_id}")
def delete_salle(salle_id: int, db: Session = Depends(get_db)):
    item = db.query(Salle).filter(Salle.id == salle_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    item.personnels.clear()
    item.compatible_rooms.clear()
    db.delete(item)
    db.commit()
    return {"message": "Salle supprimée avec succès"}


# Compatibilités entre salles (Sous-routes REST explicites)
@router.get("/{salle_id}/compatibilites")
def get_salle_compatibilites(salle_id: int, db: Session = Depends(get_db)):
    item = db.query(Salle).filter(Salle.id == salle_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    return [{"id": c.id, "nom": c.nom} for c in item.compatible_rooms]


@router.post("/{salle_id}/compatibilites/{compat_id}")
def add_salle_compatibilite(salle_id: int, compat_id: int, db: Session = Depends(get_db)):
    if salle_id == compat_id:
        raise HTTPException(status_code=400, detail="Une salle ne peut pas être déclarée compatible avec elle-même")
    item = db.query(Salle).filter(Salle.id == salle_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    target = db.query(Salle).filter(Salle.id == compat_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Salle cible non trouvée")
    if target not in item.compatible_rooms:
        item.compatible_rooms.append(target)
        db.commit()
    return {"message": f"Salle {target.nom} ajoutée aux compatibilités de {item.nom}", "compatible_salle_ids": [c.id for c in item.compatible_rooms]}


@router.delete("/{salle_id}/compatibilites/{compat_id}")
def remove_salle_compatibilite(salle_id: int, compat_id: int, db: Session = Depends(get_db)):
    item = db.query(Salle).filter(Salle.id == salle_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    target = db.query(Salle).filter(Salle.id == compat_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Salle cible non trouvée")
    if target in item.compatible_rooms:
        item.compatible_rooms.remove(target)
        db.commit()
    return {"message": f"Salle {target.nom} retirée des compatibilités de {item.nom}", "compatible_salle_ids": [c.id for c in item.compatible_rooms]}
