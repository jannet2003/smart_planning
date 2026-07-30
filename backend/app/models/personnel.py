from sqlalchemy import Column, Integer, String, Boolean
from app.db.database import Base

class Personnel(Base):
    __tablename__ = "personnel"

    id              = Column(Integer, primary_key=True, index=True)
    matricule       = Column(String, unique=True, nullable=True)   # ex: "SR-001", "RES-002"
    nom             = Column(String, nullable=False)
    prenom          = Column(String, nullable=False)
    role            = Column(String, nullable=False)               # SENIOR, RESIDENT_1ERE, TECH…
    quotite_horaire = Column(Integer, default=40)
    statut          = Column(String, default='actif')              # 'actif' | 'retrait' | 'hors_service'
    actif           = Column(Boolean, default=True)                # gardé pour compatibilité
    allowed_rooms   = Column(String, default='')                   # IDs séparés par virgule
    has_garde       = Column(Boolean, default=False)
