from pydantic import BaseModel
from datetime import datetime
from typing import Dict, Any, List

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
    class Config:
        from_attributes = True
