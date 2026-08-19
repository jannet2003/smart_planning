from pydantic import BaseModel, ConfigDict
from typing import Optional


class PersonnelBase(BaseModel):
    matricule: Optional[str] = None
    nom: Optional[str] = None
    nom_prenom: Optional[str] = None
    role: Optional[str] = None
    categorie: Optional[str] = None
    statut: Optional[str] = 'actif'
    status: Optional[str] = None
    actif: Optional[bool] = True
    allowed_rooms: Optional[str] = ''


class PersonnelCreate(PersonnelBase):
    pass


class PersonnelUpdate(BaseModel):
    matricule: Optional[str] = None
    nom: Optional[str] = None
    nom_prenom: Optional[str] = None
    role: Optional[str] = None
    categorie: Optional[str] = None
    statut: Optional[str] = None
    status: Optional[str] = None
    actif: Optional[bool] = None
    allowed_rooms: Optional[str] = None


class PersonnelResponse(PersonnelBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
