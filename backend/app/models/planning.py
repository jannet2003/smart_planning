from sqlalchemy import Column, Integer, String, DateTime, JSON
from datetime import datetime
from app.db.database import Base

class PlanningSemaine(Base):
    __tablename__ = "planning_semaine"

    id = Column(Integer, primary_key=True, index=True)
    semaine_code = Column(String, index=True)       # ex: "2026-W31"
    date_validation = Column(DateTime, default=datetime.utcnow)
    
    # Stockage de l'état exact (snapshot JSON) au moment de la validation
    snapshot_personnel = Column(JSON, nullable=False) 
    snapshot_salles = Column(JSON, nullable=False)
    affectations = Column(JSON, nullable=False)     # Qui est dans quelle salle à quel moment
