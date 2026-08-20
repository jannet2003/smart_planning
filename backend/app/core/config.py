import os
from pathlib import Path

PROJECT_NAME = "Gestion Salles & Personnel - SmartPlanning Radiologie"
API_PREFIX = "/api"

# Emplacement absolu de la base de données SQLite
PROJECT_ROOT = Path(__file__).resolve().parents[3]
DB_DIR = PROJECT_ROOT / "data"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "planning.db"

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
