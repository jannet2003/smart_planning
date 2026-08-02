# SmartPlanning Radiologie

Application de gestion du personnel, des salles et des plannings pour un service de radiologie.

## Prérequis

- Python 3.11+
- pip

## Installation

Depuis la racine du projet :

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

## Lancer l'API FastAPI

Depuis la racine du projet :

```bash
cd backend
uvicorn app.main:app --reload
```

L'API sera disponible sur :

- http://127.0.0.1:8000
- Documentation Swagger : http://127.0.0.1:8000/docs

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
  public/          # HTML/CSS statiques
  src/             # logique JavaScript du frontend
tests/
  test_api.py      # tests pytest du backend
```

## Tests

```bash
pytest -q
```
