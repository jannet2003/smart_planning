from sqlalchemy import Column, Integer, String, Boolean
from app.db.database import Base

class Personnel(Base):
    __tablename__ = "personnel"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    prenom = Column(String, nullable=False)
    role = Column(String, nullable=False)          # ex: "Médecin", "Technicien", "Infirmier"
    quotite_horaire = Column(Integer, default=40)  # Heures par semaine
    actif = Column(Boolean, default=True)
