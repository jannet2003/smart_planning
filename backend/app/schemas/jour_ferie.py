from datetime import date as Date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class JourFerieBase(BaseModel):
    date: Date
    libelle: str


class JourFerieCreate(JourFerieBase):
    pass


class JourFerieUpdate(BaseModel):
    date: Optional[Date] = None
    libelle: Optional[str] = None


class JourFerieResponse(JourFerieBase):
    model_config = ConfigDict(from_attributes=True)
