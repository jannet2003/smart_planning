from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class SalleBase(BaseModel):
    nom: Optional[str] = None
    name: Optional[str] = None
    actif: bool = True

    mode_affectation_senior: Optional[str] = 'exclusif'
    senior_mode: Optional[str] = None

    min_senior: int = 1
    max_senior: int = 2
    min_resident: int = 1
    max_resident: int = 3
    min_inf: int = 0
    max_inf: int = 1
    min_tech: int = 1
    max_tech: int = 3

    senior_compatible_rooms: str = ''
    is_broken: bool = False
    broken_start: Optional[str] = ''
    broken_end: Optional[str] = ''
    broken_reason: Optional[str] = ''


class SalleCreate(SalleBase):
    pass


class SalleUpdate(SalleBase):
    pass


class IndisponibiliteSalleBase(BaseModel):
    salle_id: int
    date_debut: str
    date_fin: str
    raison: Optional[str] = None
    motif: Optional[str] = None
    type_indisponibilite: Optional[str] = 'maintenance'


class IndisponibiliteSalleCreate(IndisponibiliteSalleBase):
    pass


class IndisponibiliteSalleUpdate(BaseModel):
    date_debut: Optional[str] = None
    date_fin: Optional[str] = None
    raison: Optional[str] = None
    motif: Optional[str] = None
    type_indisponibilite: Optional[str] = None


class IndisponibiliteSalleResponse(IndisponibiliteSalleBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class SalleResponse(SalleBase):
    id: int
    indisponibilites: List[IndisponibiliteSalleResponse] = []

    model_config = ConfigDict(from_attributes=True)
