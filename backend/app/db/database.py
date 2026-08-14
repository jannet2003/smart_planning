import os
import shutil
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DB_DIR = PROJECT_ROOT / "data"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "planning.db"

legacy_candidates = [
    PROJECT_ROOT / "backend" / "planning.db",
    PROJECT_ROOT / "planning.db",
    Path.cwd() / "planning.db",
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

from sqlalchemy import text

Base = declarative_base()


def init_db():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE personnel ADD COLUMN matricule VARCHAR;"))
            conn.commit()
        except Exception:
            pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
