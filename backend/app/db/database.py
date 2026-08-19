import os
import shutil
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DB_DIR = PROJECT_ROOT / "data"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "planning_backup_pre_etape2.db"
BACKUP_PATH = DB_DIR / "planning_backup_pre_etape2.db.bak"

legacy_candidates = [
    PROJECT_ROOT / "backend" / "planning_backup_pre_etape2.db",
    PROJECT_ROOT / "planning_backup_pre_etape2.db",
    Path.cwd() / "planning_backup_pre_etape2.db",
]

if not DB_PATH.exists():
    for legacy_path in legacy_candidates:
        if legacy_path.exists() and legacy_path != DB_PATH:
            shutil.copy2(legacy_path, DB_PATH)
            break

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

LEGACY_TABLES = {
    "personnel": "personnel_legacy",
    "salle": "salle_legacy",
    "planning_semaine": "planning_semaine_legacy",
    "personnel_salle": "personnel_salle_legacy",
    "salle_compatibilite": "salle_compatibilite_legacy",
}


def _table_exists(conn, table_name: str) -> bool:
    row = conn.execute(
        text("SELECT name FROM sqlite_master WHERE type = 'table' AND name = :table_name"),
        {"table_name": table_name},
    ).fetchone()
    return row is not None


def _safe_backup_database():
    if DB_PATH.exists() and not BACKUP_PATH.exists():
        shutil.copy2(DB_PATH, BACKUP_PATH)


def _rename_legacy_tables():
    with engine.begin() as conn:
        for legacy_name, backup_name in LEGACY_TABLES.items():
            if _table_exists(conn, legacy_name) and not _table_exists(conn, backup_name):
                conn.execute(text(f'ALTER TABLE "{legacy_name}" RENAME TO "{backup_name}"'))
        conn.commit()


def _normalize_category(value):
    if value is None:
        return None
    normalized = str(value).strip().lower()
    mapping = {
        "senior": "senior",
        "resident_1ere": "resident_1ere",
        "resident_1ere_annee": "resident_1ere",
        "resident_majeur": "resident_majeur",
        "technicien": "technicien",
        "tech": "technicien",
        "infirmier": "infirmier",
        "inf": "infirmier",
        "resident": "resident_1ere",
        "residents": "resident_1ere",
    }
    return mapping.get(normalized, normalized)


def _normalize_status(value, active_flag=None):
    if value is None:
        if active_flag is True:
            return "actif"
        if active_flag is False:
            return "hors_service"
        return "actif"

    normalized = str(value).strip().lower()
    mapping = {
        "actif": "actif",
        "active": "actif",
        "retrait": "en_retrait",
        "en_retrait": "en_retrait",
        "hors_service": "hors_service",
        "horsservice": "hors_service",
        "inactif": "hors_service",
    }
    return mapping.get(normalized, normalized)


def _normalize_senior_mode(value):
    if value is None:
        return "exclusif"
    normalized = str(value).strip().upper()
    mapping = {
        "EXCLUSIVE": "exclusif",
        "COMBINABLE": "combinable",
        "SELECTIVE": "certaines_salles",
    }
    return mapping.get(normalized, normalized.lower())


def _migrate_legacy_data():
    with SessionLocal() as session:
        personnel_count = session.execute(text("SELECT COUNT(*) FROM PERSONNEL")).scalar()
        if personnel_count == 0 and _table_exists(session.connection(), "personnel_legacy"):
            rows = session.execute(
                text(
                    "SELECT id, matricule, nom, role, statut, actif, allowed_rooms FROM personnel_legacy"
                )
            ).fetchall()
            for row in rows:
                legacy_id, matricule, nom_prenom, role, statut, actif, allowed_rooms = row
                category = _normalize_category(role)
                status = _normalize_status(statut, actif)
                if category is None:
                    continue
                session.execute(
                    text(
                        "INSERT INTO PERSONNEL (id, matricule, nom_prenom, categorie, status) VALUES (:id, :matricule, :nom_prenom, :categorie, :status)"
                    ),
                    {
                        "id": legacy_id,
                        "matricule": matricule or f"ID-{legacy_id}",
                        "nom_prenom": nom_prenom or "",
                        "categorie": category,
                        "status": status,
                    },
                )
            session.commit()

        salle_count = session.execute(text("SELECT COUNT(*) FROM SALLE")).scalar()
        if salle_count == 0 and _table_exists(session.connection(), "salle_legacy"):
            rows = session.execute(
                text(
                    "SELECT id, nom, actif, min_senior, max_senior, min_resident, max_resident, min_inf, max_inf, min_tech, max_tech, senior_mode, senior_compatible_rooms, is_broken, broken_start, broken_end, broken_reason FROM salle_legacy"
                )
            ).fetchall()
            for row in rows:
                (
                    legacy_id,
                    nom,
                    actif,
                    min_senior,
                    max_senior,
                    min_resident,
                    max_resident,
                    min_inf,
                    max_inf,
                    min_tech,
                    max_tech,
                    senior_mode,
                    senior_compatible_rooms,
                    is_broken,
                    broken_start,
                    broken_end,
                    broken_reason,
                ) = row
                if not nom:
                    continue
                session.execute(
                    text(
                        "INSERT INTO SALLE (id, nom, mode_affectation_senior) VALUES (:id, :nom, :mode_affectation_senior)"
                    ),
                    {
                        "id": legacy_id,
                        "nom": nom,
                        "mode_affectation_senior": _normalize_senior_mode(senior_mode),
                    },
                )

                for category, minimum, maximum in [
                    ("senior", min_senior, max_senior),
                    ("technicien", min_tech, max_tech),
                    ("infirmier", min_inf, max_inf),
                ]:
                    if minimum is None and maximum is None:
                        continue
                    session.execute(
                        text(
                            "INSERT INTO BESOIN_SALLE (salle_id, categorie, minimum, maximum) VALUES (:salle_id, :categorie, :minimum, :maximum)"
                        ),
                        {
                            "salle_id": legacy_id,
                            "categorie": category,
                            "minimum": int(minimum or 0),
                            "maximum": int(maximum or 0),
                        },
                    )

                if is_broken:
                    start = broken_start or ""
                    end = broken_end or ""
                    if start and end:
                        session.execute(
                            text(
                                "INSERT INTO INDISPONIBILITE_SALLE (salle_id, date_debut, date_fin, raison) VALUES (:salle_id, :date_debut, :date_fin, :raison)"
                            ),
                            {
                                "salle_id": legacy_id,
                                "date_debut": start,
                                "date_fin": end,
                                "raison": broken_reason or "Maintenance",
                            },
                        )
            session.commit()

        if _table_exists(session.connection(), "personnel_legacy") and _table_exists(session.connection(), "SALLE"):
            room_pairs = session.execute(text("SELECT id, nom FROM SALLE")).fetchall()
            room_lookup = {str(item[0]): item[0] for item in room_pairs}
            room_name_lookup = {str(item[1]).strip().lower(): item[0] for item in room_pairs}
            legacy_rows = session.execute(
                text("SELECT id, allowed_rooms FROM personnel_legacy")
            ).fetchall()
            for legacy_id, allowed_rooms in legacy_rows:
                if not allowed_rooms:
                    continue
                tokens = [token.strip() for token in str(allowed_rooms).split(",") if token.strip()]
                for token in tokens:
                    target_id = room_lookup.get(token)
                    if target_id is None:
                        target_id = room_name_lookup.get(token.lower())
                    if target_id is None:
                        continue
                    session.execute(
                        text(
                            "INSERT OR IGNORE INTO PERSONNEL_SALLE (personnel_id, salle_id) VALUES (:personnel_id, :salle_id)"
                        ),
                        {"personnel_id": legacy_id, "salle_id": target_id},
                    )
            session.commit()

        if _table_exists(session.connection(), "salle_compatibilite_legacy"):
            rows = session.execute(
                text("SELECT salle_id, salle_compatible_id FROM salle_compatibilite_legacy")
            ).fetchall()
            for salle_id, salle_compatible_id in rows:
                if salle_id == salle_compatible_id:
                    continue
                session.execute(
                    text(
                        "INSERT OR IGNORE INTO COMPATIBILITE_SENIOR (salle_id, salle_compatible_id) VALUES (:salle_id, :salle_compatible_id)"
                    ),
                    {"salle_id": salle_id, "salle_compatible_id": salle_compatible_id},
                )
            session.commit()


def init_db():
    _safe_backup_database()
    _rename_legacy_tables()
    Base.metadata.create_all(bind=engine)
    _migrate_legacy_data()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
