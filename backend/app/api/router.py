"""
Main API router with all endpoints.
"""
from fastapi import APIRouter

from app.api.graph import graph_router
from app.api.filters import filters_router
from app.api.hierarchical_filter import hierarchical_router

# Create main API router
api_router = APIRouter()

# Include sub-routers
api_router.include_router(
    graph_router,
    tags=["Graph Operations"]
)

api_router.include_router(
    filters_router,
    tags=["Filters & Search"]
)
api_router.include_router(
    hierarchical_router,
    tags=["Heirarchiacal Filter & Search"]
)