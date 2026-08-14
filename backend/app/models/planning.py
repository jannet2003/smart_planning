from sqlalchemy import Column, Integer, String, DateTime, JSON
from datetime import datetime
from app.db.database import Base

class JourFerie(Base):
    __tablename__ = "jour_ferie"

    id      = Column(Integer, primary_key=True, index=True)
    date    = Column(String, unique=True, nullable=False, index=True)
    libelle = Column(String, nullable=False)


class PlanningSemaine(Base):
    __tablename__ = "planning_semaine"

    id                 = Column(Integer, primary_key=True, index=True)
    semaine_code       = Column(String, index=True)
    date_validation    = Column(DateTime, default=datetime.utcnow)
    
    snapshot_personnel = Column(JSON, nullable=False)
    snapshot_salles    = Column(JSON, nullable=False)
    affectations       = Column(JSON, nullable=False)
