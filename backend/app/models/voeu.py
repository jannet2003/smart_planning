from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base


class Voeu(Base):
    __tablename__ = "VOEU"

    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_id = Column(Integer, ForeignKey("PERSONNEL.id", ondelete="CASCADE"), nullable=False, index=True)
    jour = Column(Date, nullable=False, index=True)
    type = Column(String, nullable=False)  # 'souhaite' ou 'indisponible'
    salle_id = Column(Integer, ForeignKey("SALLE.id", ondelete="CASCADE"), nullable=True)

    personnel = relationship("Personnel", backref="voeux")
    salle = relationship("Salle", backref="voeux")
