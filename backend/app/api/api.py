from fastapi import APIRouter
from app.api.routes import conges, jours_feries, personnel, salles, planning, indisponibilites, voeux

api_router = APIRouter()

@api_router.get("/health")
def health_check():
    return {"status": "ok", "service": "radiologie-api"}

api_router.include_router(personnel.router, prefix="/personnel", tags=["personnel"])
api_router.include_router(salles.router, prefix="/salles", tags=["salles"])
api_router.include_router(conges.router, prefix="/conges", tags=["conges"])
api_router.include_router(jours_feries.router, prefix="/jours-feries", tags=["jours-feries"])
api_router.include_router(indisponibilites.router, prefix="/indisponibilites", tags=["indisponibilites"])
api_router.include_router(planning.router, prefix="/planning", tags=["planning"])
api_router.include_router(voeux.router, prefix="/voeux", tags=["voeux"])
