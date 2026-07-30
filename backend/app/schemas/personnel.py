from pydantic import BaseModel
from typing import Optional

class PersonnelBase(BaseModel):
    nom: str
    prenom: str
    role: str
    quotite_horaire: int = 40
    actif: bool = True

class PersonnelCreate(PersonnelBase):
    pass

class PersonnelResponse(PersonnelBase):
    id: int
    class Config:
        from_attributes = True
        # backward compatibility for pydantic v1 / v2
        orm_mode = True
