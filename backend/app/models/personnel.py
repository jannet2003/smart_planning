from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.db.database import Base

personnel_salle = Table(
    'personnel_salle',
    Base.metadata,
    Column('personnel_id', Integer, ForeignKey('personnel.id', ondelete='CASCADE'), primary_key=True),
    Column('salle_id', Integer, ForeignKey('salle.id', ondelete='CASCADE'), primary_key=True)
)

class CongePersonnel(Base):
    __tablename__ = "conge_personnel"

    id           = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(Integer, ForeignKey('personnel.id', ondelete='CASCADE'), nullable=False)
    type         = Column(String, nullable=False)  # 'bloc_30' | 'flexible'
    date_debut   = Column(String, nullable=False)
    date_fin     = Column(String, nullable=False)
    raison       = Column(String, nullable=True)

    personnel    = relationship("Personnel", back_populates="conges")


class Personnel(Base):
    __tablename__ = "personnel"

    id        = Column(Integer, primary_key=True, index=True)
    matricule = Column(String, unique=True, nullable=False, index=True)
    nom       = Column(String, nullable=False)
    categorie = Column(String, nullable=False)
    statut    = Column(String, nullable=False, default='actif')

    salles    = relationship("Salle", secondary=personnel_salle, back_populates="personnels", lazy="joined")
    conges    = relationship("CongePersonnel", back_populates="personnel", cascade="all, delete-orphan", lazy="selectin")
