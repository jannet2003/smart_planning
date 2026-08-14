from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.db.database import Base

salle_compatibilite = Table(
    'salle_compatibilite',
    Base.metadata,
    Column('salle_id', Integer, ForeignKey('salle.id', ondelete='CASCADE'), primary_key=True),
    Column('salle_compatible_id', Integer, ForeignKey('salle.id', ondelete='CASCADE'), primary_key=True)
)

class Salle(Base):
    __tablename__ = "salle"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    actif = Column(Boolean, default=True)

    # Effectifs min/max par catégorie
    min_senior   = Column(Integer, default=1)
    max_senior   = Column(Integer, default=2)
    min_resident = Column(Integer, default=1)
    max_resident = Column(Integer, default=3)
    min_inf      = Column(Integer, default=0)
    max_inf      = Column(Integer, default=1)
    min_tech     = Column(Integer, default=1)
    max_tech     = Column(Integer, default=3)

    # Mode d'affectation senior
    senior_mode             = Column(String, default='EXCLUSIVE')
    senior_compatible_rooms = Column(String, default='')  # IDs séparés par virgule

    compatible_rooms = relationship(
        'Salle',
        secondary=salle_compatibilite,
        primaryjoin=id == salle_compatibilite.c.salle_id,
        secondaryjoin=id == salle_compatibilite.c.salle_compatible_id,
        lazy='joined'
    )

    # Indisponibilité / maintenance
    is_broken      = Column(Boolean, default=False)
    broken_start   = Column(String, nullable=True, default='')
    broken_end     = Column(String, nullable=True, default='')
    broken_reason  = Column(String, nullable=True, default='')

