from sqlalchemy import Column, Integer, String, Boolean
from app.db.database import Base

class Salle(Base):
    __tablename__ = "salle"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    type_salle = Column(String, nullable=False)    # ex: "Scanner", "IRM", "Échographie"
    capacite = Column(Integer, default=1)
    actif = Column(Boolean, default=True)
