# api/complete_backend_router.py
"""
Complete backend API router - ALL complex logic handled server-side.
Frontend sends filters, receives ready-to-render data.
"""
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.complete_backend_filter_service import complete_backend_filter_service


# Create router for complete backend processing
complete_backend_router = APIRouter(
    prefix="/complete",
    tags=["Complete Backend Processing"]
)


class CompleteFilterRequest(BaseModel):
    """Complete filter request model - all possible filters."""
    consultantIds: Optional[List[str]] = None
    fieldConsultantIds: Optional[List[str]] = None
    clientIds: Optional[List[str]] = None
    productIds: Optional[List[str]] = None
    incumbentProductIds: Optional[List[str]] = None
    clientAdvisorIds: Optional[List[str]] = None
    consultantAdvisorIds: Optional[List[str]] = None
    channels: Optional[List[str]] = None
    assetClasses: Optional[List[str]] = None
    mandateStatuses: Optional[List[str]] = None
    sales_regions: Optional[List[str]] = None
    ratings: Optional[List[str]] = None
    influenceLevels: Optional[List[str]] = None


@complete_backend_router.get("/region/{region}")
async def get_complete_backend_data(
    region: str,
    recommendations_mode: bool = Query(False, description="Enable recommendations mode")
):
    """
    Get region data with ALL processing done server-side.
    No filters applied - returns base dataset or summary if too large.
    """
    try:
        result = complete_backend_filter_service.get_complete_filtered_data(
            region=region.upper(),
            filters={},
            recommendations_mode=recommendations_mode
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Complete backend processing failed: {str(e)}")


@complete_backend_router.post("/region/{region}/filtered")
async def get_complete_filtered_data(
    region: str,
    filter_request: CompleteFilterRequest,
    recommendations_mode: bool = Query(False, description="Enable recommendations mode")
):
    """
    MAIN ENDPOINT: Get completely filtered and processed data.
    All complex logic handled server-side - frontend gets ready-to-render data.
    """
    try:
        # Convert Pydantic model to dict, excluding None values
        filters = {k: v for k, v in filter_request.dict().items() if v is not None}
        
        print(f"Complete backend processing for {region} with filters: {list(filters.keys())}")
        
        result = complete_backend_filter_service.get_complete_filtered_data(
            region=region.upper(),
            filters=filters,
            recommendations_mode=recommendations_mode
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Complete filtered processing failed: {str(e)}")


@complete_backend_router.get("/region/{region}/filter-options")
async def get_filter_options_only(
    region: str,
    recommendations_mode: bool = Query(False, description="Enable recommendations mode")
):
    """
    Get only filter options - extremely fast for dropdown population.
    All PCA/ACA parsing done server-side.
    """
    try:
        with complete_backend_filter_service.driver.session() as session:
            filter_options = complete_backend_filter_service._get_complete_filter_options(
                session, region.upper(), recommendations_mode
            )
            
            return {
                "success": True,
                "region": region.upper(),
                "mode": "recommendations" if recommendations_mode else "standard",
                "filter_options": filter_options,
                "server_processing": {
                    "pca_aca_parsed_server_side": True,
                    "single_aggregation_query": True,
                    "no_client_side_processing": True
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Filter options query failed: {str(e)}")


@complete_backend_router.get("/region/{region}/suggestions")
async def get_filter_suggestions(
    region: str,
    recommendations_mode: bool = Query(False, description="Enable recommendations mode")
):
    """
    Get intelligent filter suggestions for large datasets.
    """
    try:
        with complete_backend_filter_service.driver.session() as session:
            suggestions = complete_backend_filter_service._generate_smart_suggestions(
                session, region.upper(), recommendations_mode
            )
            
            return {
                "success": True,
                "region": region.upper(),
                "suggestions": suggestions,
                "usage_hint": "Apply these filters to reduce dataset size below 50 nodes"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Suggestions generation failed: {str(e)}")


@complete_backend_router.post("/region/{region}/apply-suggestion")
async def apply_filter_suggestion(
    region: str,
    suggestion: Dict[str, Any],
    recommendations_mode: bool = Query(False, description="Enable recommendations mode")
):
    """
    Apply a specific filter suggestion and get filtered results.
    """
    try:
        # Convert suggestion to filter format
        filters = {}
        filter_field = suggestion.get('filter_field')
        filter_value = suggestion.get('filter_value')
        
        if filter_field and filter_value:
            filters[filter_field] = [filter_value]
        
        result = complete_backend_filter_service.get_complete_filtered_data(
            region=region.upper(),
            filters=filters,
            recommendations_mode=recommendations_mode
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Suggestion application failed: {str(e)}")


@complete_backend_router.get("/health")
async def complete_backend_health():
    """Health check for complete backend service."""
    try:
        is_healthy = complete_backend_filter_service.driver is not None
        
        return {
            "status": "healthy" if is_healthy else "unhealthy",
            "service": "Complete Backend Filter Service",
            "features": {
                "server_side_filtering": "All filters applied in Cypher queries",
                "embedded_rating_collection": "Ratings collected in single query",
                "layout_calculation": "Positions calculated server-side",
                "pca_aca_parsing": "Complex PCA/ACA logic in Cypher",
                "performance_limiting": "Smart 50-node limit with suggestions",
                "single_query_execution": "No client-side data processing"
            },
            "benefits": [
                "Eliminates O(n²) client-side rating collection",
                "Removes complex advisor filtering logic from frontend",
                "Eliminates Dagre layout calculation on client",
                "Moves all string parsing to database",
                "Provides ready-to-render data structure"
            ],
            "performance": {
                "max_renderable_nodes": 50,
                "typical_response_time": "<500ms",
                "scales_to_any_dataset_size": True
            }
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }