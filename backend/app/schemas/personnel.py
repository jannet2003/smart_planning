from pydantic import BaseModel
from typing import Optional

class PersonnelBase(BaseModel):
    nom: str
    prenom: str
    role: str
    quotite_horaire: int = 40
    statut: Optional[str] = 'actif'
    actif: bool = True
    matricule: Optional[str] = None
    allowed_rooms: Optional[str] = ''
    has_garde: Optional[bool] = False

class PersonnelCreate(PersonnelBase):
    pass

class PersonnelUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    role: Optional[str] = None
    quotite_horaire: Optional[int] = None
    statut: Optional[str] = None
    actif: Optional[bool] = None
    matricule: Optional[str] = None
    allowed_rooms: Optional[str] = None
    has_garde: Optional[bool] = None

class PersonnelResponse(PersonnelBase):
    id: int
    class Config:
        from_attributes = True
