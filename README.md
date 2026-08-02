# SmartPlanning Radiologie

SmartPlanning Radiologie est une application web de gestion du personnel, des salles et des plannings destinée à un service de radiologie. Elle a été conçue pour centraliser la planification des agents, suivre les disponibilités, gérer les salles d’examen et faciliter la constitution de plannings cohérents et exploitables au quotidien.

## Présentation du projet

Ce projet a pour objectif de proposer une solution simple, pratique et fonctionnelle pour l’organisation quotidienne d’un service de radiologie. L’application permet notamment de :

- gérer les agents du personnel avec leurs statuts et catégories,
- organiser les salles d’examen et leurs contraintes,
- gérer les congés et les indisponibilités,
- générer et sauvegarder des plannings hebdomadaires,
- consulter les archives de planning pour une meilleure traçabilité.

## Architecture et technologies

Le projet a été développé avec une approche modulaire et progressive :

- Backend : FastAPI + SQLAlchemy + Pydantic
- Base de données : SQLite
- Frontend : HTML, CSS et JavaScript natif
- Tests : pytest

Cette séparation permet de garder une logique claire entre l’API, la logique métier et l’interface utilisateur.

## Méthodes et modèles de travail

Le développement du projet a suivi une méthodologie pragmatique basée sur :

- l’analyse fonctionnelle des besoins métier,
- la modélisation des entités principales (personnel, salles, planning),
- la mise en place d’une API robuste et testée,
- l’itération sur l’interface pour améliorer l’expérience utilisateur,
- la validation par des tests automatisés pour limiter les régressions.

Le travail a été organisé autour de plusieurs axes :

1. Structure et stabilité du backend
2. Gestion des données et de la persistance
3. Amélioration de l’interface utilisateur
4. Correction des erreurs de logique métier
5. Organisation du code pour une meilleure maintenabilité

## Structure du projet

```text
backend/
  app/
    api/            # routes FastAPI
    core/           # configuration
    db/             # base de données et session SQLAlchemy
    models/         # modèles ORM
    schemas/        # schémas Pydantic
    main.py         # application FastAPI
frontend/
  public/          # fichiers statiques HTML/CSS
  src/             # logique JavaScript du frontend
tests/
  test_api.py      # tests pytest du backend
```

## Installation

Depuis la racine du projet :

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

## Lancer l’API FastAPI

```bash
cd backend
uvicorn app.main:app --reload
```

L’API sera disponible sur :

- http://127.0.0.1:8000
- Documentation Swagger : http://127.0.0.1:8000/docs

## Tests

```bash
pytest -q
```

## État du projet

Le projet est actuellement fonctionnel avec une version stable de l’API et une interface de gestion du planning prête à être utilisée et à évoluer.

