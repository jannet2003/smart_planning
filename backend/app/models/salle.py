from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.models.personnel import personnel_salle

salle_compatibilite = Table(
    'salle_compatibilite',
    Base.metadata,
    Column('salle_id', Integer, ForeignKey('salle.id', ondelete='CASCADE'), primary_key=True),
    Column('salle_compatible_id', Integer, ForeignKey('salle.id', ondelete='CASCADE'), primary_key=True)
)

class IndisponibiliteSalle(Base):
    __tablename__ = "indisponibilite_salle"

    id         = Column(Integer, primary_key=True, index=True)
    salle_id   = Column(Integer, ForeignKey('salle.id', ondelete='CASCADE'), nullable=False)
    date_debut = Column(String, nullable=False)
    date_fin   = Column(String, nullable=False)
    motif      = Column(String, nullable=True)

    salle      = relationship("Salle", back_populates="indisponibilites")


class Salle(Base):
    __tablename__ = "salle"

    id                 = Column(Integer, primary_key=True, index=True)
    nom                = Column(String, nullable=False)

    # Effectifs min/max par catégorie
    min_senior         = Column(Integer, nullable=False, default=1)
    max_senior         = Column(Integer, nullable=False, default=2)
    min_resident       = Column(Integer, nullable=False, default=1)
    max_resident       = Column(Integer, nullable=False, default=3)
    min_inf            = Column(Integer, nullable=False, default=0)
    max_inf            = Column(Integer, nullable=False, default=1)
    min_tech           = Column(Integer, nullable=False, default=1)
    max_tech           = Column(Integer, nullable=False, default=3)

    # Règles Senior & Compatibilité
    senior_mode        = Column(String, nullable=False, default='EXCLUSIVE')
    mode_compatibilite = Column(String, nullable=False, default='AUCUNE')

    personnels         = relationship("Personnel", secondary=personnel_salle, back_populates="salles", lazy="selectin")
    compatible_rooms   = relationship(
        'Salle',
        secondary=salle_compatibilite,
        primaryjoin=id == salle_compatibilite.c.salle_id,
        secondaryjoin=id == salle_compatibilite.c.salle_compatible_id,
        lazy='selectin'
    )
    indisponibilites   = relationship("IndisponibiliteSalle", back_populates="salle", cascade="all, delete-orphan", lazy="selectin")
