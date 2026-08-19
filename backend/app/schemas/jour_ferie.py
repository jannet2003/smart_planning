from datetime import date as Date

from pydantic import BaseModel, ConfigDict


class JourFerieBase(BaseModel):
    date: Date
    libelle: str


class JourFerieCreate(JourFerieBase):
    pass


class JourFerieResponse(JourFerieBase):
    model_config = ConfigDict(from_attributes=True)
