import os

PROJECT_NAME = "Gestion Salles & Personnel - SmartPlanning Radiologie"
API_PREFIX = "/api"

# Emplacement de la base de données (cohérent avec database.py → data/planning.db)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/planning.db")
