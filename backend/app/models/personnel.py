from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.db.database import Base

personnel_salle = Table(
    'personnel_salle',
    Base.metadata,
    Column('personnel_id', Integer, ForeignKey('personnel.id', ondelete='CASCADE'), primary_key=True),
    Column('salle_id', Integer, ForeignKey('salle.id', ondelete='CASCADE'), primary_key=True)
)

class Personnel(Base):
    __tablename__ = "personnel"

    id            = Column(Integer, primary_key=True, index=True)
    matricule     = Column(String, nullable=True, index=True)
    nom           = Column(String, nullable=False)               # Nom et prénom combinés
    role          = Column(String, nullable=False)               # SENIOR, RESIDENT_1ERE, TECH…
    statut        = Column(String, default='actif')              # 'actif' | 'retrait' | 'hors_service'
    actif         = Column(Boolean, default=True)
    allowed_rooms = Column(String, default='')                   # IDs séparés par virgule

    salles        = relationship("Salle", secondary=personnel_salle, backref="personnels", lazy="joined")


