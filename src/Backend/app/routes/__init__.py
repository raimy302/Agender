"""Route package for the FastAPI backend."""

from .users import router as users_router
from .appointments import router as appointments_router
from .public import router as public_router
from .public_appointments import router as public_appointments_router

# Keep route package exports consistent




