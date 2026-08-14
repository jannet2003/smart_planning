from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Any, Optional


class JourFerieBase(BaseModel):
    date: str
    libelle: str


class JourFerieCreate(JourFerieBase):
    pass


class JourFerieUpdate(BaseModel):
    date: Optional[str] = None
    libelle: Optional[str] = None


class JourFerieResponse(JourFerieBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class PlanningSemaineBase(BaseModel):
    semaine_code: str
    snapshot_personnel: Any
    snapshot_salles: Any
    affectations: Any


class PlanningSemaineCreate(PlanningSemaineBase):
    pass


class PlanningSemaineResponse(PlanningSemaineBase):
    id: int
    date_validation: datetime

    model_config = ConfigDict(from_attributes=True)
