from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Any, Union, Dict
from datetime import date as DateType, datetime, timedelta

from app.db.database import get_db
from app.models.personnel import Personnel
from app.models.planning import Conge, JourFerie, Planning
from app.models.salle import IndisponibiliteSalle, Salle
from app.schemas.planning import (
    PlanningCreate,
    PlanningResponse,
    PlanningSemaineCreate,
    PlanningSemaineResponse,
)

router = APIRouter()


def _payload_from_model(data):
    if hasattr(data, "model_dump"):
        return data.model_dump()
    return data.dict()


@router.get("/history", response_model=List[PlanningResponse])
def get_planning_history(db: Session = Depends(get_db)):
    return db.query(Planning).order_by(Planning.date.desc()).all()


@router.get("", response_model=List[PlanningResponse])
@router.get("/", response_model=List[PlanningResponse], include_in_schema=False)
def get_all_plannings(db: Session = Depends(get_db)):
    return db.query(Planning).order_by(Planning.date.desc()).all()


@router.get("/{week_code}")
def get_planning_by_week(week_code: str, db: Session = Depends(get_db)):
    try:
        start_date = datetime.strptime(week_code, "%Y-%m-%d").date()
        end_date = start_date + timedelta(days=6)
        records = (
            db.query(Planning)
            .filter(Planning.date >= start_date, Planning.date <= end_date)
            .all()
        )
        return [
            {
                "personnel_id": r.personnel_id,
                "salle_id": r.salle_id,
                "date": str(r.date),
                "periode": r.periode,
            }
            for r in records
        ]
    except ValueError:
        records = db.query(Planning).all()
        return [
            {
                "personnel_id": r.personnel_id,
                "salle_id": r.salle_id,
                "date": str(r.date),
                "periode": r.periode,
            }
            for r in records
        ]


@router.post("", response_model=Union[PlanningResponse, Dict[str, Any]])
@router.post("/", response_model=Union[PlanningResponse, Dict[str, Any]], include_in_schema=False)
def save_planning(data: PlanningCreate, db: Session = Depends(get_db)):
    payload = _payload_from_model(data)

    # 1. Vérifier s'il s'agit d'une sauvegarde de semaine complète (batch)
    if payload.get("semaine_code") or (payload.get("affectations") and isinstance(payload.get("affectations"), dict)):
        semaine_code = payload.get("semaine_code") or ""
        affectations = payload.get("affectations") or {}
        grid = affectations.get("gridAssignments") or {}
        nights = affectations.get("nightAssignments") or {}
        additional = affectations.get("additionalSeniorAssignments") or {}
        dates_list = affectations.get("datesList") or []

        if not dates_list and semaine_code:
            try:
                start = datetime.strptime(semaine_code, "%Y-%m-%d").date()
                dates_list = [str(start + timedelta(days=i)) for i in range(7)]
            except Exception:
                dates_list = []

        all_personnel = {p.matricule: p for p in db.query(Personnel).all()}
        all_personnel_by_id = {p.id: p for p in db.query(Personnel).all()}
        all_salles_by_name = {s.nom.strip().lower(): s for s in db.query(Salle).all()}
        all_salles_by_id = {s.id: s for s in db.query(Salle).all()}

        if dates_list:
            min_date = min(dates_list)
            max_date = max(dates_list)
            try:
                d_min = datetime.strptime(min_date, "%Y-%m-%d").date()
                d_max = datetime.strptime(max_date, "%Y-%m-%d").date()
                db.query(Planning).filter(Planning.date >= d_min, Planning.date <= d_max).delete(synchronize_session=False)
            except Exception:
                pass

        saved_count = 0

        for key, task_name in grid.items():
            if not task_name or task_name in ["REPOS", "CONGE", "FERIE"]:
                continue
            parts = key.rsplit("_", 1)
            if len(parts) != 2:
                continue
            mat, date_str = parts[0], parts[1]
            try:
                task_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except Exception:
                continue

            person = all_personnel.get(mat) or (all_personnel_by_id.get(int(mat)) if mat.isdigit() else None)
            if not person:
                continue

            salle = all_salles_by_name.get(str(task_name).strip().lower())
            if not salle:
                salle = all_salles_by_id.get(int(task_name)) if str(task_name).isdigit() else None
            if not salle:
                continue

            is_holiday = db.get(JourFerie, task_date) is not None
            if is_holiday:
                continue
            has_leave = db.query(Conge).filter(
                Conge.personnel_id == person.id,
                Conge.date_debut <= task_date,
                Conge.date_fin >= task_date,
            ).first() is not None
            if has_leave:
                continue

            existing = db.query(Planning).filter_by(
                personnel_id=person.id,
                salle_id=salle.id,
                date=task_date,
                periode="jour",
            ).first()
            if not existing:
                item = Planning(
                    personnel_id=person.id,
                    salle_id=salle.id,
                    date=task_date,
                    periode="jour",
                )
                db.add(item)
                saved_count += 1

        for key, extra_rooms in additional.items():
            if not isinstance(extra_rooms, list):
                continue
            parts = key.rsplit("_", 1)
            if len(parts) != 2:
                continue
            mat, date_str = parts[0], parts[1]
            try:
                task_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except Exception:
                continue
            person = all_personnel.get(mat)
            if not person:
                continue
            for r_name in extra_rooms:
                salle = all_salles_by_name.get(str(r_name).strip().lower())
                if not salle:
                    continue
                existing = db.query(Planning).filter_by(
                    personnel_id=person.id,
                    salle_id=salle.id,
                    date=task_date,
                    periode="jour",
                ).first()
                if not existing:
                    db.add(Planning(personnel_id=person.id, salle_id=salle.id, date=task_date, periode="jour"))
                    saved_count += 1

        for key, night_task in nights.items():
            if night_task != "GARDE":
                continue
            parts = key.rsplit("_", 1)
            if len(parts) != 2:
                continue
            mat, date_str = parts[0], parts[1]
            try:
                task_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except Exception:
                continue
            person = all_personnel.get(mat)
            if not person:
                continue
            default_salle = all_salles_by_name.get("scanner") or db.query(Salle).first()
            if default_salle:
                existing = db.query(Planning).filter_by(
                    personnel_id=person.id,
                    salle_id=default_salle.id,
                    date=task_date,
                    periode="nuit",
                ).first()
                if not existing:
                    db.add(Planning(personnel_id=person.id, salle_id=default_salle.id, date=task_date, periode="nuit"))
                    saved_count += 1

        db.commit()
        return {
            "status": "success",
            "semaine_code": semaine_code,
            "saved_count": saved_count,
            "affectations": affectations,
        }

    # 2. Sauvegarde unitaire standard
    if not all((data.personnel_id, data.salle_id, data.date, data.periode)):
        raise HTTPException(
            status_code=422,
            detail="personnel_id, salle_id, date et periode sont requis",
        )
    if db.get(Personnel, data.personnel_id) is None:
        raise HTTPException(status_code=404, detail="Personnel non trouvé")
    if db.get(Salle, data.salle_id) is None:
        raise HTTPException(status_code=404, detail="Salle non trouvée")
    if db.get(JourFerie, data.date) is not None:
        raise HTTPException(status_code=409, detail="Affectation interdite un jour férié")

    conge = db.query(Conge).filter(
        Conge.personnel_id == data.personnel_id,
        Conge.date_debut <= data.date,
        Conge.date_fin >= data.date,
    ).first()
    if conge is not None:
        raise HTTPException(status_code=409, detail="Affectation interdite pendant un congé")

    indisponibilite = db.query(IndisponibiliteSalle).filter(
        IndisponibiliteSalle.salle_id == data.salle_id,
        IndisponibiliteSalle.date_debut <= data.date,
        IndisponibiliteSalle.date_fin >= data.date,
    ).first()
    if indisponibilite is not None:
        raise HTTPException(status_code=409, detail="Salle indisponible à cette date")

    item = Planning(
        personnel_id=data.personnel_id,
        salle_id=data.salle_id,
        date=data.date,
        periode=data.periode,
    )
    db.add(item)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="Cette affectation existe déjà")
    db.refresh(item)
    return item
