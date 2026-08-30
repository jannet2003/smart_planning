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

from app.core.config import PROJECT_NAME
from app.api.api import api_router

app = FastAPI(title=PROJECT_NAME)

# Autoriser les requêtes CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routeur principal de l'API
app.include_router(api_router, prefix="/api")

# Servir le dossier Front-End (frontend/public contient index.html, css/ et src/)
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_PUBLIC = os.path.join(BASE_DIR.parent, "frontend", "public")

if os.path.exists(FRONTEND_PUBLIC):
    app.mount("/", StaticFiles(directory=FRONTEND_PUBLIC, html=True), name="public")
else:
    @app.get("/")
    def read_root():
        return {"status": "API opérationnelle. Le dossier frontend/public n'a pas été trouvé."}
