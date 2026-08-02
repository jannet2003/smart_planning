from pydantic import BaseModel, ConfigDict
from typing import Optional


class PersonnelBase(BaseModel):
    nom: str
    prenom: str
    role: str
    quotite_horaire: Optional[int] = 40
    statut: Optional[str] = 'actif'
    actif: Optional[bool] = True
    matricule: Optional[str] = None
    allowed_rooms: Optional[str] = ''
    

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
    


class PersonnelResponse(PersonnelBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
