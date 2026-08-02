from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Any


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
