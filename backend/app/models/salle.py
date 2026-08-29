from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base


class Salle(Base):
    __tablename__ = "SALLE"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, unique=True, nullable=False)
    mode_affectation_senior = Column(String, nullable=False, default="exclusif")

    min_senior = Column(Integer, nullable=False, default=1)
    max_senior = Column(Integer, nullable=False, default=2)
    min_resident = Column(Integer, nullable=False, default=1)
    max_resident = Column(Integer, nullable=False, default=3)
    min_inf = Column(Integer, nullable=False, default=0)
    max_inf = Column(Integer, nullable=False, default=1)
    min_tech = Column(Integer, nullable=False, default=1)
    max_tech = Column(Integer, nullable=False, default=3)

    personnels = relationship("Personnel", secondary="PERSONNEL_SALLE", back_populates="salles")
    compatibilites = relationship(
        "CompatibiliteSenior",
        foreign_keys="[CompatibiliteSenior.salle_id]",
        back_populates="salle",
        cascade="all, delete-orphan",
    )
    compatibles_avec = relationship(
        "CompatibiliteSenior",
        foreign_keys="[CompatibiliteSenior.salle_compatible_id]",
        back_populates="salle_compatible",
        cascade="all, delete-orphan",
    )
    indisponibilites = relationship("IndisponibiliteSalle", back_populates="salle", cascade="all, delete-orphan")
    plannings = relationship("Planning", back_populates="salle", cascade="all, delete-orphan")

    @property
    def senior_mode(self):
        return self.mode_affectation_senior or "exclusif"

    @senior_mode.setter
    def senior_mode(self, value):
        self.mode_affectation_senior = value or "exclusif"

    @property
    def actif(self):
        return True

    @actif.setter
    def actif(self, value):
        return None

    @property
    def senior_compatible_rooms(self):
        return ",".join(str(rel.salle_compatible_id) for rel in self.compatibilites)

    @senior_compatible_rooms.setter
    def senior_compatible_rooms(self, value):
        return None

    @property
    def compatible_rooms(self):
        return [rel.salle_compatible for rel in self.compatibilites]

    @compatible_rooms.setter
    def compatible_rooms(self, value):
        return None


class CompatibiliteSenior(Base):
    __tablename__ = "COMPATIBILITE_SENIOR"

    salle_id = Column(Integer, ForeignKey("SALLE.id", ondelete="CASCADE"), primary_key=True)
    salle_compatible_id = Column(Integer, ForeignKey("SALLE.id", ondelete="CASCADE"), primary_key=True)

    salle = relationship("Salle", foreign_keys=[salle_id], back_populates="compatibilites")
    salle_compatible = relationship("Salle", foreign_keys=[salle_compatible_id], back_populates="compatibles_avec")


class IndisponibiliteSalle(Base):
    __tablename__ = "INDISPONIBILITE_SALLE"

    id = Column(Integer, primary_key=True, autoincrement=True)
    salle_id = Column(Integer, ForeignKey("SALLE.id", ondelete="CASCADE"), nullable=False, index=True)
    date_debut = Column(Date, nullable=False)
    date_fin = Column(Date, nullable=False)
    raison = Column(String, nullable=True)
    type_indisponibilite = Column(String, nullable=True, default="maintenance")

    salle = relationship("Salle", back_populates="indisponibilites")

    @property
    def motif(self):
        return self.raison

    @motif.setter
    def motif(self, value):
        self.raison = value

