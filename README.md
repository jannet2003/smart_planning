# SmartPlanning Radiologie

SmartPlanning Radiologie est une application web de gestion du personnel, des salles et des plannings destinée à un service de radiologie. Elle centralise la planification des agents, suit les disponibilités, gère les salles d'examen et facilite la constitution de plannings cohérents au quotidien.

## Architecture et technologies

| Composant | Technologie |
|-----------|-------------|
| Backend | FastAPI + SQLAlchemy + Pydantic |
| Base de données | SQLite |
| Frontend | HTML, CSS et JavaScript natif |
| Tests | pytest |
| Serveur Web | Uvicorn + Nginx (reverse-proxy) |

## Structure du projet

```text
smart_planning/
├── backend/
│   ├── app/
│   │   ├── api/            # Routes FastAPI
│   │   ├── core/           # Configuration (config.py)
│   │   ├── db/             # Session SQLAlchemy + init_db
│   │   ├── models/         # Modèles ORM SQLAlchemy
│   │   ├── schemas/        # Schémas Pydantic
│   │   └── main.py         # Point d'entrée FastAPI
│   └── requirements.txt
├── frontend/
│   └── public/             # HTML, CSS et JS (servis par FastAPI)
│       ├── index.html
│       ├── css/
│       └── src/
├── data/                   # Base de données SQLite (créée au 1er démarrage)
├── tests/
│   └── test_api.py
├── deploy/                 # Fichiers de déploiement VPS
│   ├── setup.sh            # Script d'installation automatique
│   ├── smartplanning.service  # Service systemd
│   └── nginx.conf          # Configuration Nginx
├── .env.example            # Template de variables d'environnement
└── requirements.txt
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

# 4. Lancer le serveur de développement
cd backend
uvicorn app.main:app --reload
```

L'application est disponible sur :
- **App** : http://127.0.0.1:8000
- **Swagger UI** : http://127.0.0.1:8000/docs
- **ReDoc** : http://127.0.0.1:8000/redoc

## Tests

```bash
pytest -q
```

---

## Déploiement sur VPS Ubuntu

### Prérequis

- VPS Ubuntu 20.04+ avec accès root/sudo
- Git installé

### Installation automatique

```bash
# 1. Cloner le dépôt sur le serveur
git clone https://github.com/jannet2003/smart_planning.git /srv/smartplanning
cd /srv/smartplanning

# 2. Lancer le script d'installation (installe tout automatiquement)
sudo bash deploy/setup.sh
```

Le script effectue automatiquement :
- Installation de Python 3, Nginx, Git
- Création d'un utilisateur système `smartplanning`
- Création du venv et installation des dépendances
- Configuration du service systemd (`smartplanning.service`)
- Configuration de Nginx (reverse-proxy vers Uvicorn)

### Configuration de l'environnement

```bash
# Copier le template et adapter les valeurs
cp .env.example .env
nano .env
```

### Gestion du service

```bash
# Démarrer / arrêter / redémarrer
sudo systemctl start smartplanning
sudo systemctl stop smartplanning
sudo systemctl restart smartplanning

# Voir les logs en temps réel
sudo journalctl -u smartplanning -f

# Statut
sudo systemctl status smartplanning
```

### Mise à jour de l'application

```bash
cd /srv/smartplanning
git pull origin main
sudo systemctl restart smartplanning
```

### (Optionnel) HTTPS avec Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx -y
sudo certbot --nginx -d mondomaine.fr
```

---

## Fonctionnalités

- Gestion des agents du personnel (statuts, catégories, matricules)
- Organisation des salles d'examen
- Gestion des congés et indisponibilités
- Gestion des vœux et préférences
- Génération et sauvegarde de plannings hebdomadaires
- Consultation des archives de planning

## État du projet

Le projet est fonctionnel avec une API stable et une interface de gestion du planning opérationnelle.
