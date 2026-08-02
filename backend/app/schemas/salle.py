from pydantic import BaseModel, ConfigDict
from typing import Optional


class SalleBase(BaseModel):
    nom: str
    type_salle: str
    code: Optional[str] = None
    actif: bool = True

    min_senior: int = 1
    max_senior: int = 2
    min_resident: int = 1
    max_resident: int = 3
    min_inf: int = 0
    max_inf: int = 1
    min_tech: int = 1
    max_tech: int = 3

    senior_mode: str = 'EXCLUSIVE'
    senior_compatible_rooms: str = ''   # IDs séparés par virgule

    is_broken: bool = False
    broken_start: Optional[str] = ''
    broken_end: Optional[str] = ''
    broken_reason: Optional[str] = ''


class SalleCreate(SalleBase):
    pass


class SalleUpdate(SalleBase):
    pass


class SalleResponse(SalleBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
