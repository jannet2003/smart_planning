from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.db.database import get_db
from app.models.salle import Salle, BesoinSalle, CompatibiliteSenior, IndisponibiliteSalle
from app.schemas.salle import SalleCreate, SalleUpdate, SalleResponse

router = APIRouter()


def _payload_from_model(data):
    if hasattr(data, "model_dump"):
        return data.model_dump()
    return data.dict()


def _normalize_salle_payload(item: Salle):
    besoins = {besoin.categorie: besoin for besoin in item.besoins}
    indisponibilite = item.indisponibilites[0] if item.indisponibilites else None
    return {
        "id": item.id,
        "nom": item.nom,
        "name": item.nom,
        "actif": True,
        "mode_affectation_senior": item.mode_affectation_senior,
        "senior_mode": item.mode_affectation_senior,
        "min_senior": besoins.get("senior").minimum if "senior" in besoins else 0,
        "max_senior": besoins.get("senior").maximum if "senior" in besoins else 0,
        "min_resident": besoins.get("resident").minimum if "resident" in besoins else 0,
        "max_resident": besoins.get("resident").maximum if "resident" in besoins else 0,
        "min_inf": besoins.get("infirmier").minimum if "infirmier" in besoins else 0,
        "max_inf": besoins.get("infirmier").maximum if "infirmier" in besoins else 0,
        "min_tech": besoins.get("technicien").minimum if "technicien" in besoins else 0,
        "max_tech": besoins.get("technicien").maximum if "technicien" in besoins else 0,
        "senior_compatible_rooms": item.senior_compatible_rooms,
        "is_broken": indisponibilite is not None,
        "broken_start": str(indisponibilite.date_debut) if indisponibilite else "",
        "broken_end": str(indisponibilite.date_fin) if indisponibilite else "",
        "broken_reason": indisponibilite.raison if indisponibilite else "",
    }


def _sync_salle_details(item: Salle, payload, db: Session):
    mapping = {
        "senior": ("min_senior", "max_senior"),
        "resident": ("min_resident", "max_resident"),
        "infirmier": ("min_inf", "max_inf"),
        "technicien": ("min_tech", "max_tech"),
    }
    for categorie, (min_key, max_key) in mapping.items():
        besoin = next((b for b in item.besoins if b.categorie == categorie), None)
        if besoin is None:
            besoin = BesoinSalle(salle_id=item.id, categorie=categorie)
            db.add(besoin)
        besoin.minimum = int(payload.get(min_key, besoin.minimum or 0) or 0)
        besoin.maximum = int(payload.get(max_key, besoin.maximum or 0) or 0)
    for indisponibilite in list(item.indisponibilites):
        db.delete(indisponibilite)
    if payload.get("is_broken") and payload.get("broken_start") and payload.get("broken_end"):
        db.add(IndisponibiliteSalle(salle_id=item.id, date_debut=date.fromisoformat(payload["broken_start"]), date_fin=date.fromisoformat(payload["broken_end"]), raison=payload.get("broken_reason") or None))


def _sync_salle_compatibility(item: Salle, senior_mode: str, compatible_rooms_raw: Optional[str], db: Session):
    for relation in list(item.compatibilites):
        db.delete(relation)

    item.senior_compatible_rooms = ""

    if senior_mode not in {"SELECTIVE", "SELECTIVES", "certaines_salles", "certaines-salles"}:
        db.commit()
        return

    room_tokens = [r.strip() for r in str(compatible_rooms_raw or "").split(',') if r.strip()]
    if not room_tokens:
        db.commit()
        return

    all_salles = db.query(Salle).filter(Salle.id != item.id).all()
    matching_salles = []
    for salle in all_salles:
        s_id_str = str(salle.id)
        s_nom_str = (salle.nom or "").strip().lower()
        for token in room_tokens:
            t_lower = token.lower()
            if token == s_id_str or t_lower == s_nom_str:
                if salle not in matching_salles:
                    matching_salles.append(salle)
                break

    for salle in matching_salles:
        db.add(CompatibiliteSenior(salle_id=item.id, salle_compatible_id=salle.id))

    item.senior_compatible_rooms = ",".join(str(s.id) for s in matching_salles)
    db.commit()


@router.get("", response_model=List[SalleResponse])
@router.get("/", response_model=List[SalleResponse], include_in_schema=False)
def get_all_salles(
    actif: Optional[bool] = Query(None, description="Filtrer par état actif"),
    db: Session = Depends(get_db),
):
    query = db.query(Salle)
    if actif is not None:
        query = query.filter(Salle.actif == actif)
    return [_normalize_salle_payload(item) for item in query.all()]


@router.get("/{salle_id}", response_model=SalleResponse)
def get_salle(salle_id: int, db: Session = Depends(get_db)):
    item = db.query(Salle).filter(Salle.id == salle_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    return _normalize_salle_payload(item)


@router.post("", response_model=SalleResponse)
@router.post("/", response_model=SalleResponse, include_in_schema=False)
def create_salle(data: SalleCreate, db: Session = Depends(get_db)):
    payload = _payload_from_model(data)
    nom_value = (payload.get("nom") or payload.get("name") or "").strip()
    if not nom_value:
        raise HTTPException(status_code=422, detail="Le nom de la salle est obligatoire")
    if db.query(Salle.id).filter(Salle.nom == nom_value).first():
        raise HTTPException(status_code=409, detail="Une salle portant ce nom existe déjà")

    mode = (payload.get("mode_affectation_senior") or payload.get("senior_mode") or "exclusif").strip()
    compat_raw = payload.get("senior_compatible_rooms", "")

    try:
        item = Salle(nom=nom_value, mode_affectation_senior=mode)
        db.add(item)
        db.flush()

        _sync_salle_details(item, payload, db)
        _sync_salle_compatibility(item, mode, compat_raw, db)

        db.commit()
        db.refresh(item)
        return _normalize_salle_payload(item)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Une salle portant ce nom existe déjà")


@router.put("/{salle_id}", response_model=SalleResponse)
def update_salle(salle_id: int, data: SalleUpdate, db: Session = Depends(get_db)):
    item = db.query(Salle).filter(Salle.id == salle_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Salle non trouvée")

    update_data = _payload_from_model(data)
    if not update_data:
        raise HTTPException(status_code=422, detail="Aucune donnée à mettre à jour")

    mode_provided = "senior_mode" in update_data or "mode_affectation_senior" in update_data
    compat_provided = "senior_compatible_rooms" in update_data

    legacy_mode = update_data.pop("senior_mode", None)
    legacy_name = update_data.pop("name", None)
    if legacy_name is not None:
        item.nom = legacy_name.strip()
    if legacy_mode is not None:
        item.senior_mode = legacy_mode

    for field, value in update_data.items():
        if value is None:
            continue
        if field in {"nom", "mode_affectation_senior"}:
            setattr(item, field, value)

    new_mode = item.mode_affectation_senior if mode_provided else item.mode_affectation_senior or "exclusif"
    new_compat_raw = update_data.get("senior_compatible_rooms", item.senior_compatible_rooms or "")

    if mode_provided or compat_provided:
        _sync_salle_compatibility(item, new_mode, new_compat_raw, db)

    _sync_salle_details(item, update_data, db)

    db.commit()
    db.refresh(item)
    return _normalize_salle_payload(item)


@router.delete("/{salle_id}")
def delete_salle(salle_id: int, db: Session = Depends(get_db)):
    item = db.query(Salle).filter(Salle.id == salle_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    if hasattr(item, "personnels"):
        item.personnels.clear()
    if hasattr(item, "compatible_rooms"):
        item.compatible_rooms.clear()
    db.delete(item)
    db.commit()
    return {"message": "Salle supprimée avec succès"}
