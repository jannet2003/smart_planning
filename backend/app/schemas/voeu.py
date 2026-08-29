from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date


class VoeuCreate(BaseModel):
    agent_id: int
    jour: date
    type: str  # 'souhaite' | 'indisponible'
    salle_id: Optional[int] = None


class VoeuResponse(BaseModel):
    id: int
    agent_id: int
    jour: str
    type: str
    salle_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
