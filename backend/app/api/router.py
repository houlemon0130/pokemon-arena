from fastapi import APIRouter

from .battles import router as battles_router
from .pokemon import router as pokemon_router

router = APIRouter(prefix="/api")
router.include_router(pokemon_router)
router.include_router(battles_router)
