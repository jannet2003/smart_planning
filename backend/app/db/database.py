import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# ── Chemin vers la base de données ──────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[3]
DB_DIR = PROJECT_ROOT / "data"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "planning.db"

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

# ── Moteur SQLAlchemy ───────────────────────────────────────────────────────
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── Initialisation de la base ───────────────────────────────────────────────
def init_db():
    """Crée toutes les tables définies dans les modèles si elles n'existent pas."""
    Base.metadata.create_all(bind=engine)


# ── Dépendance FastAPI ──────────────────────────────────────────────────────
def get_db():
    """Fournit une session DB pour chaque requête (injection de dépendance)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
