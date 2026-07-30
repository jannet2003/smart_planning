from fastapi import APIRouter
from app.api.routes import personnel, salles, planning

api_router = APIRouter()

api_router.include_router(personnel.router, prefix="/personnel", tags=["personnel"])
api_router.include_router(salles.router, prefix="/salles", tags=["salles"])
api_router.include_router(planning.router, prefix="/planning", tags=["planning"])
