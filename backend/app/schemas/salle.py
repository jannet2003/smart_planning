from pydantic import BaseModel

class SalleBase(BaseModel):
    nom: str
    type_salle: str
    capacite: int = 1
    actif: bool = True

class SalleCreate(SalleBase):
    pass

class SalleResponse(SalleBase):
    id: int
    class Config:
        from_attributes = True
        orm_mode = True
