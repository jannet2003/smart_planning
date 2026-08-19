from pydantic import BaseModel, ConfigDict
from datetime import date as Date
from typing import Any, Optional



class PlanningBase(BaseModel):
    personnel_id: Optional[int] = None
    salle_id: Optional[int] = None
    date: Optional[Date] = None
    periode: Optional[str] = None
    semaine_code: Optional[str] = None
    status: Optional[str] = None
    saved_count: Optional[int] = None
    snapshot_personnel: Any = []
    snapshot_salles: Any = []
    affectations: Any = {}


class PlanningCreate(PlanningBase):
    pass


class PlanningResponse(PlanningBase):
    model_config = ConfigDict(from_attributes=True)


PlanningSemaineBase = PlanningBase
PlanningSemaineCreate = PlanningCreate
PlanningSemaineResponse = PlanningResponse
