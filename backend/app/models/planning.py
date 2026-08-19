from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base


class Conge(Base):
    __tablename__ = "CONGE"

    personnel_id = Column(Integer, ForeignKey("PERSONNEL.id", ondelete="CASCADE"), primary_key=True)
    type_conge = Column(String, primary_key=True, nullable=False)
    date_debut = Column(Date, nullable=False)
    date_fin = Column(Date, nullable=False)
    raison = Column(String, nullable=True)

    personnel = relationship("Personnel", back_populates="conges")


class JourFerie(Base):
    __tablename__ = "JOUR_FERIE"

    date = Column(Date, primary_key=True)
    libelle = Column(String, nullable=False)


class Planning(Base):
    __tablename__ = "PLANNING"

    personnel_id = Column(Integer, ForeignKey("PERSONNEL.id", ondelete="CASCADE"), primary_key=True)
    salle_id = Column(Integer, ForeignKey("SALLE.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, primary_key=True, nullable=False)
    periode = Column(String, primary_key=True, nullable=False)

    personnel = relationship("Personnel", back_populates="plannings")
    salle = relationship("Salle", back_populates="plannings")


# Backwards-compatibility alias for legacy imports during the migration phase.
PlanningSemaine = Planning
