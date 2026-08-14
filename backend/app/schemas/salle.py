from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class IndisponibiliteSalleBase(BaseModel):
    date_debut: str
    date_fin: str
    motif: Optional[str] = None


class IndisponibiliteSalleCreate(IndisponibiliteSalleBase):
    salle_id: Optional[int] = None


class IndisponibiliteSalleUpdate(BaseModel):
    date_debut: Optional[str] = None
    date_fin: Optional[str] = None
    motif: Optional[str] = None


class IndisponibiliteSalleResponse(IndisponibiliteSalleBase):
    id: int
    salle_id: int

    model_config = ConfigDict(from_attributes=True)


class SalleBase(BaseModel):
    nom: str
    min_senior: int = 1
    max_senior: int = 2
    min_resident: int = 1
    max_resident: int = 3
    min_inf: int = 0
    max_inf: int = 1
    min_tech: int = 1
    max_tech: int = 3
    senior_mode: str = 'EXCLUSIVE'
    mode_compatibilite: str = 'AUCUNE'


class SalleCreate(SalleBase):
    compatible_salle_ids: Optional[List[int]] = []


class SalleUpdate(BaseModel):
    nom: Optional[str] = None
    min_senior: Optional[int] = None
    max_senior: Optional[int] = None
    min_resident: Optional[int] = None
    max_resident: Optional[int] = None
    min_inf: Optional[int] = None
    max_inf: Optional[int] = None
    min_tech: Optional[int] = None
    max_tech: Optional[int] = None
    senior_mode: Optional[str] = None
    mode_compatibilite: Optional[str] = None
    compatible_salle_ids: Optional[List[int]] = None


class SalleResponse(SalleBase):
    id: int
    compatible_salle_ids: List[int] = []

    model_config = ConfigDict(from_attributes=True)
