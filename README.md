# SmartPlanning Radiologie

SmartPlanning Radiologie est une application web de gestion du personnel, des salles et des plannings destinée à un service de radiologie. Elle centralise la planification des agents, suit les disponibilités, gère les salles d'examen et facilite la constitution de plannings cohérents au quotidien.

## Architecture et technologies

| Composant | Technologie |
|-----------|-------------|
| Backend | FastAPI + SQLAlchemy + Pydantic |
| Base de données | SQLite |
| Frontend | HTML, CSS et JavaScript natif |
| Tests | pytest |
| Serveur Backend | Uvicorn (port 8101 en production) |
| Serveur Frontend | Python http.server (port 5701 en production) |

## Structure du projet

```text
smart_planning/
├── backend/
│   ├── app/
│   │   ├── api/            # Routes FastAPI
│   │   ├── core/           # Configuration (config.py)
│   │   ├── db/             # Session SQLAlchemy + migrate_schema
│   │   ├── models/         # Modèles ORM SQLAlchemy
│   │   ├── schemas/        # Schémas Pydantic
│   │   └── main.py         # Point d'entrée FastAPI
│   └── requirements.txt
├── frontend/
│   └── public/             # HTML, CSS et JS (servis par http.server)
│       ├── index.html
│       ├── css/
│       └── src/
├── data/                   # Base de données SQLite (créée au 1er démarrage, non suivie par Git)
├── tests/
│   └── test_api.py
├── deploy/                 # Fichiers de déploiement alternatifs (non utilisés — voir README)
├── .env.example            # Template de variables d'environnement
└── pytest.ini
```

---

## Installation locale (développement)

```bash
# 1. Cloner le dépôt
git clone https://github.com/jannet2003/smart_planning.git
cd smart_planning

# 2. Créer et activer l'environnement virtuel
python -m venv .venv
# Windows
.\.venv\Scripts\Activate.ps1
# Linux / macOS
source .venv/bin/activate

# 3. Installer les dépendances
pip install -r backend/requirements.txt

# 4. Initialiser la base de données
python -c "
import sys; sys.path.insert(0, 'backend')
from app.db.migrate_schema import check_and_migrate_database
check_and_migrate_database('data/planning.db')
"

# 5. Lancer le serveur de développement
cd backend
uvicorn app.main:app --reload
```

L'application est disponible sur :
- **App** : http://127.0.0.1:8000
- **Swagger UI** : http://127.0.0.1:8000/docs
- **ReDoc** : http://127.0.0.1:8000/redoc

## Tests

```bash
pytest -v
```

---

## Déploiement sur VPS Ubuntu

> **Note** : L'installation réelle utilise deux services systemd séparés
> (backend sur le port **8101**, frontend sur le port **5701**), sans Nginx ni
> reverse-proxy. Le frontend construit l'URL de l'API dynamiquement à
> partir de `window.location.hostname` dans `src/api/api.js`, ce qui évite
> d'écrire l'IP du serveur en dur dans le code.

### Prérequis

- VPS Ubuntu 20.04+ avec accès sudo
- Git et Python 3 installés
- Ports **8101** (backend) et **5701** (frontend) ouverts dans le pare-feu

### 1. Clonage du dépôt

```bash
git clone https://github.com/jannet2003/smart_planning.git /home/ubuntu/smart_planning
cd /home/ubuntu/smart_planning
```

### 2. Installation des dépendances Python

```bash
cd /home/ubuntu/smart_planning
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### 3. Création / migration de la base de données

```bash
cd /home/ubuntu/smart_planning
python3 -c "
import sys; sys.path.insert(0, 'backend')
from app.db.migrate_schema import check_and_migrate_database
check_and_migrate_database('data/planning.db')
"
```

> La base de données `data/planning.db` est créée localement sur le serveur
> et n'est **pas** suivie par Git (elle est dans `.gitignore`). Elle persiste
> entre les `git pull`.

### 4. Services systemd

Créer `/etc/systemd/system/smart-planning-backend.service` :

```ini
[Unit]
Description=SmartPlanning Radiologie — Backend FastAPI
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/smart_planning/backend
ExecStart=/home/ubuntu/smart_planning/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8101 --workers 1
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

Créer `/etc/systemd/system/smart-planning-frontend.service` :

```ini
[Unit]
Description=SmartPlanning Radiologie — Frontend HTTP
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/smart_planning/frontend/public
ExecStart=/usr/bin/python3 -m http.server 5701 --bind 0.0.0.0
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

Activer et démarrer les deux services :

```bash
sudo systemctl daemon-reload
sudo systemctl enable smart-planning-backend smart-planning-frontend
sudo systemctl start smart-planning-backend smart-planning-frontend
```

L'application est accessible sur :
- **Frontend** : `http://<IP-VPS>:5701`
- **API / Swagger** : `http://<IP-VPS>:8101/docs`

### 5. Gestion des services

```bash
# Statut
sudo systemctl status smart-planning-backend
sudo systemctl status smart-planning-frontend

# Logs en temps réel
sudo journalctl -u smart-planning-backend -f
sudo journalctl -u smart-planning-frontend -f

# Redémarrage
sudo systemctl restart smart-planning-backend
sudo systemctl restart smart-planning-frontend
```

### 6. Mise à jour de l'application

```bash
cd /home/ubuntu/smart_planning
git pull origin main
sudo systemctl restart smart-planning-backend
sudo systemctl restart smart-planning-frontend
```

---

## Fonctionnalités

- Gestion des agents du personnel (statuts, catégories, matricules)
- Organisation des salles d'examen (disponibilités, compatibilités seniors)
- Gestion des congés et indisponibilités
- Gestion des vœux et préférences
- Génération et sauvegarde de plannings hebdomadaires
- Consultation des archives de planning

## État du projet

Le projet est fonctionnel avec une API stable et une interface de gestion du planning opérationnelle.
