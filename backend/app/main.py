from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os

# Importer les modèles AVANT init_db() pour garantir leur enregistrement dans Base.metadata
import app.models
# Création des tables de base de données
from app.db.database import engine, Base, init_db
init_db()

from app.api.api import api_router

app = FastAPI(title="SmartPlanning Radiologie API")

# Autoriser les requêtes CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routeur principal de l'API
app.include_router(api_router, prefix="/api")

# Servir le dossier Front-End
# BASE_DIR pointe vers la racine de 'backend/'
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = os.path.join(BASE_DIR.parent, "frontend")

if os.path.exists(FRONTEND_DIR):
    # Permet de servir le code source JavaScript (/src/...)
    app.mount("/src", StaticFiles(directory=os.path.join(FRONTEND_DIR, "src")), name="src")
    # Permet de servir les fichiers publics (HTML, CSS sur /)
    app.mount("/", StaticFiles(directory=os.path.join(FRONTEND_DIR, "public"), html=True), name="public")
else:
    @app.get("/")
    def read_root():
        return {"status": "API opérationnelle. Le dossier frontend n'a pas été trouvé."}
