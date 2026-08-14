from pydantic import BaseModel, ConfigDict
from typing import Optional


class PersonnelBase(BaseModel):
    matricule: Optional[str] = None
    nom: str
    role: str
    statut: Optional[str] = 'actif'
    actif: Optional[bool] = True
    allowed_rooms: Optional[str] = ''
    

class PersonnelCreate(PersonnelBase):
    pass


class PersonnelUpdate(BaseModel):
    matricule:Optional[str]=None
    nom: Optional[str] = None
    role: Optional[str] = None
    statut: Optional[str] = None
    actif: Optional[bool] = None
    allowed_rooms: Optional[str] = None
    


class PersonnelResponse(PersonnelBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
