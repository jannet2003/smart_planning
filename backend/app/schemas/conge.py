from datetime import date as Date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CongeBase(BaseModel):
    personnel_id: int
    type_conge: str
    date_debut: Date
    date_fin: Date
    raison: Optional[str] = None


class CongeCreate(CongeBase):
    pass


class CongeResponse(CongeBase):
    model_config = ConfigDict(from_attributes=True)
