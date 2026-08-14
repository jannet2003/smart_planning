from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class CongePersonnelBase(BaseModel):
    type: str
    date_debut: str
    date_fin: str
    raison: Optional[str] = None


class CongePersonnelCreate(CongePersonnelBase):
    personnel_id: Optional[int] = None


class CongePersonnelUpdate(BaseModel):
    type: Optional[str] = None
    date_debut: Optional[str] = None
    date_fin: Optional[str] = None
    raison: Optional[str] = None


class CongePersonnelResponse(CongePersonnelBase):
    id: int
    personnel_id: int

    model_config = ConfigDict(from_attributes=True)


class PersonnelBase(BaseModel):
    matricule: str
    nom: str
    categorie: str
    statut: Optional[str] = 'actif'


class PersonnelCreate(PersonnelBase):
    salle_ids: Optional[List[int]] = []


class PersonnelUpdate(BaseModel):
    matricule: Optional[str] = None
    nom: Optional[str] = None
    categorie: Optional[str] = None
    statut: Optional[str] = None
    salle_ids: Optional[List[int]] = None


class PersonnelResponse(PersonnelBase):
    id: int
    salle_ids: List[int] = []

    model_config = ConfigDict(from_attributes=True)
