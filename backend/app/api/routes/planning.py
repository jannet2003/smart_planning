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


from app.models.salle import Salle
from app.models.personnel import Personnel


def _validate_senior_room_combinations(payload: dict, db: Session):
    snapshot_salles = payload.get("snapshot_salles") or []
    snapshot_personnel = payload.get("snapshot_personnel") or []
    affectations = payload.get("affectations") or {}

    rooms_by_key = {}
    for r in snapshot_salles:
        r_id = str(r.get("id"))
        r_name = r.get("name") or r.get("nom")
        if r_id: rooms_by_key[r_id] = r
        if r_name: rooms_by_key[r_name] = r

    db_salles = db.query(Salle).all()
    for r in db_salles:
        r_id = str(r.id)
        r_name = r.nom
        if r_id not in rooms_by_key:
            rooms_by_key[r_id] = {
                "id": r.id, "name": r.nom, "seniorMode": r.senior_mode,
                "seniorCompatibleRooms": r.senior_compatible_rooms.split(",") if r.senior_compatible_rooms else []
            }
        if r_name not in rooms_by_key:
            rooms_by_key[r_name] = {
                "id": r.id, "name": r.nom, "seniorMode": r.senior_mode,
                "seniorCompatibleRooms": r.senior_compatible_rooms.split(",") if r.senior_compatible_rooms else []
            }

    seniors_mats = set()
    for p in snapshot_personnel:
        cat = p.get("cat") or p.get("role")
        if cat == "SENIOR":
            seniors_mats.add(p.get("matricule"))

    db_personnel = db.query(Personnel).filter(Personnel.role == "SENIOR").all()
    for p in db_personnel:
        if p.matricule:
            seniors_mats.add(p.matricule)

    grid = affectations.get("gridAssignments") or {}
    additional = affectations.get("additionalSeniorAssignments") or {}

    agent_date_rooms = {}
    for key, val in grid.items():
        if not val or val in ("REPOS", "CONGE", "FERIE", "GARDE"):
            continue
        parts = key.split("_")
        if len(parts) >= 2:
            mat = parts[0]
            date = "_".join(parts[1:])
            if mat in seniors_mats:
                agent_date_rooms.setdefault((mat, date), []).append(val)

    for key, val_list in additional.items():
        if not val_list:
            continue
        parts = key.split("_")
        if len(parts) >= 2:
            mat = parts[0]
            date = "_".join(parts[1:])
            if mat in seniors_mats:
                for v in val_list:
                    if v and v not in ("REPOS", "CONGE", "FERIE", "GARDE"):
                        agent_date_rooms.setdefault((mat, date), []).append(v)

    for (mat, date), rooms in agent_date_rooms.items():
        unique_rooms = list(set(rooms))
        if len(unique_rooms) <= 1:
            continue

        for i in range(len(unique_rooms)):
            for j in range(i + 1, len(unique_rooms)):
                r1_key = unique_rooms[i]
                r2_key = unique_rooms[j]
                r1 = rooms_by_key.get(str(r1_key)) or rooms_by_key.get(r1_key)
                r2 = rooms_by_key.get(str(r2_key)) or rooms_by_key.get(r2_key)

                if not r1 or not r2:
                    continue

                r1_name = r1.get("name") or r1.get("nom") or str(r1_key)
                r2_name = r2.get("name") or r2.get("nom") or str(r2_key)
                r1_mode = r1.get("seniorMode") or r1.get("senior_mode") or "EXCLUSIVE"
                r2_mode = r2.get("seniorMode") or r2.get("senior_mode") or "EXCLUSIVE"

                if r1_mode == "EXCLUSIVE":
                    raise HTTPException(
                        status_code=400,
                        detail=f"Affectation impossible : {r1_name} est une salle exclusive. Ce senior ne peut pas être affecté à une autre salle dans le même poste."
                    )
                if r2_mode == "EXCLUSIVE":
                    raise HTTPException(
                        status_code=400,
                        detail=f"Affectation impossible : {r2_name} est une salle exclusive. Ce senior ne peut pas être affecté à une autre salle dans le même poste."
                    )

                def permits(room, other):
                    rmode = room.get("seniorMode") or room.get("senior_mode") or "EXCLUSIVE"
                    if rmode == "COMBINABLE":
                        return True
                    if rmode == "SELECTIVE":
                        compat = room.get("seniorCompatibleRooms") or room.get("senior_compatible_rooms") or []
                        if isinstance(compat, str):
                            compat = [c.strip() for c in compat.split(",") if c.strip()]
                        other_id = str(other.get("id"))
                        other_name = (other.get("name") or other.get("nom") or "").strip()
                        return (other_id in compat) or (other_name in compat)
                    return False

                if not permits(r1, r2):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Affectation impossible : Cette salle ({r1_name}) ne peut pas être combinée avec {r2_name} selon sa configuration."
                    )
                if not permits(r2, r1):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Affectation impossible : Cette salle ({r2_name}) ne peut pas être combinée avec {r1_name} selon sa configuration."
                    )


@router.post("/", response_model=PlanningSemaineResponse)
def save_planning(data: PlanningSemaineCreate, db: Session = Depends(get_db)):
    if not data.semaine_code or not data.semaine_code.strip():
        raise HTTPException(status_code=422, detail="Le code de semaine est obligatoire")

    payload = _payload_from_model(data)
    payload["semaine_code"] = payload.get("semaine_code", "").strip()
    payload["snapshot_personnel"] = payload.get("snapshot_personnel") or []
    payload["snapshot_salles"] = payload.get("snapshot_salles") or []
    payload["affectations"] = payload.get("affectations") or {}

    _validate_senior_room_combinations(payload, db)

    existing = db.query(PlanningSemaine).filter(PlanningSemaine.semaine_code == payload["semaine_code"]).first()
    if existing:
        db.delete(existing)
        db.commit()

    item = PlanningSemaine(**payload)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

