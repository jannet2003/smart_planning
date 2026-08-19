from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base


class Personnel(Base):
    __tablename__ = "PERSONNEL"

    id = Column(Integer, primary_key=True, index=True)
    matricule = Column(String, unique=True, nullable=False, index=True)
    nom_prenom = Column(String, nullable=False)
    categorie = Column(String, nullable=False)
    status = Column(String, nullable=False, default="actif")

    salles = relationship("Salle", secondary="PERSONNEL_SALLE", back_populates="personnels")
    conges = relationship("Conge", back_populates="personnel", cascade="all, delete-orphan")
    plannings = relationship("Planning", back_populates="personnel", cascade="all, delete-orphan")

    @property
    def nom(self):
        return self.nom_prenom or ""

    @nom.setter
    def nom(self, value):
        self.nom_prenom = value or ""

    @property
    def role(self):
        return self.categorie or ""

    @role.setter
    def role(self, value):
        self.categorie = value or ""

    @property
    def statut(self):
        return self.status or "actif"

    @statut.setter
    def statut(self, value):
        self.status = value or "actif"

    @property
    def actif(self):
        return str(self.status or "actif").lower() in {"actif", "active", "disponible"}

    @actif.setter
    def actif(self, value):
        self.status = "actif" if value else "hors_service"

    @property
    def allowed_rooms(self):
        room_ids = [str(s.id) for s in self.salles]
        return ",".join(room_ids)

    @allowed_rooms.setter
    def allowed_rooms(self, value):
        return None


class PersonnelSalle(Base):
    __tablename__ = "PERSONNEL_SALLE"

    personnel_id = Column(Integer, ForeignKey("PERSONNEL.id", ondelete="CASCADE"), primary_key=True)
    salle_id = Column(Integer, ForeignKey("SALLE.id", ondelete="CASCADE"), primary_key=True)


