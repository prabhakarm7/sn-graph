# app/api/complete_backend_router.py - Updated with comprehensive logging
"""
Complete Backend Router with integrated structured logging
All operations tracked for CloudWatch/Grafana monitoring
"""
import time
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, Request, Path
from pydantic import BaseModel

from app.services.complete_backend_filter_service import complete_backend_filter_service
from app.middleware.logging_middleware import api_logger

# Create router
complete_backend_router = APIRouter(
    prefix="/complete",
    tags=["Complete Backend Processing"]
)

# Request models
class FilterRequest(BaseModel):
    consultantIds: Optional[List[str]] = []
    fieldConsultantIds: Optional[List[str]] = []
    clientIds: Optional[List[str]] = []
    productIds: Optional[List[str]] = []
    incumbentProductIds: Optional[List[str]] = []
    clientAdvisorIds: Optional[List[str]] = []
    consultantAdvisorIds: Optional[List[str]] = []
    channels: Optional[List[str]] = []
    assetClasses: Optional[List[str]] = []
    mandateStatuses: Optional[List[str]] = []
    sales_regions: Optional[List[str]] = []
    ratings: Optional[List[str]] = []
    influenceLevels: Optional[List[str]] = []
    mandateManagers: Optional[List[str]] = []
    universeNames: Optional[List[str]] = []


@complete_backend_router.get("/health")
async def health_check(request: Request):
    """Health check with logging"""
    start_time = time.time()
    
    try:
        is_healthy = complete_backend_filter_service.driver is not None
        duration_ms = (time.time() - start_time) * 1000
        
        api_logger.log_event(
            "health_check",
            request=request,
            healthy=is_healthy,
            duration_ms=round(duration_ms, 2)
        )
        
        return {
            "status": "healthy" if is_healthy else "unhealthy",
            "service": "complete_backend_processing",
            "features": [
                "server_side_filtering",
                "embedded_rating_collection",
                "smart_node_limiting",
                "performance_optimization",
                "pca_aca_parsing"
            ]
        }
    except Exception as e:
        api_logger.log_error(
            request=request,
            error_type="health_check_failed",
            error_message=str(e)
        )
        raise


@complete_backend_router.get("/region/{region}")
async def get_region_base_data(
    request: Request,
    region: str = Path(..., description="Region code (e.g., NORTH, SOUTH)"),
    recommendations_mode: bool = Query(False, description="Enable recommendations mode")
):
    """
    Get base region data without filters
    Returns: filter options + performance state
    """
    start_time = time.time()
    
    try:
        api_logger.log_user_action(
            request=request,
            action="load_region",
            target=region,
            metadata={"recommendations_mode": recommendations_mode}
        )
        
        # Get data
        result = complete_backend_filter_service.get_region_data(
            region=region,
            filters={},
            recommendations_mode=recommendations_mode
        )
        
        duration_ms = (time.time() - start_time) * 1000
        
        # Log the operation
        api_logger.log_event(
            "region_data_loaded",
            request=request,
            region=region,
            recommendations_mode=recommendations_mode,
            render_mode=result.get("render_mode"),
            node_count=result.get("data", {}).get("total_nodes", 0),
            duration_ms=round(duration_ms, 2),
            has_filter_options=bool(result.get("filter_options"))
        )
        
        return result
        
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        api_logger.log_error(
            request=request,
            error_type="region_data_load_failed",
            error_message=str(e),
            region=region,
            recommendations_mode=recommendations_mode,
            duration_ms=round(duration_ms, 2)
        )
        
        raise HTTPException(status_code=500, detail=str(e))


@complete_backend_router.post("/region/{region}/filtered")
async def get_filtered_data(
    request: Request,
    region: str = Path(..., description="Region code"),
    filter_request: FilterRequest = ...,
    recommendations_mode: bool = Query(False, description="Enable recommendations mode")
):
    """
    Get filtered data with complete backend processing
    Backend handles: filtering, rating collection, layout, and smart limiting
    """
    start_time = time.time()
    
    try:
        # Convert to dict and count applied filters
        filters = filter_request.dict(exclude_unset=True)
        filters = {k: v for k, v in filters.items() if v}  # Remove empty lists
        
        api_logger.log_user_action(
            request=request,
            action="apply_filters",
            target=region,
            metadata={
                "recommendations_mode": recommendations_mode,
                "filter_types": list(filters.keys()),
                "filter_count": len(filters)
            }
        )
        
        # Get filtered data
        result = complete_backend_filter_service.get_region_data(
            region=region,
            filters=filters,
            recommendations_mode=recommendations_mode
        )
        
        duration_ms = (time.time() - start_time) * 1000
        
        # Log filter operation with details
        api_logger.log_filter_operation(
            request=request,
            operation="apply_filters",
            filters=filters,
            result_count=result.get("data", {}).get("total_nodes", 0),
            duration_ms=round(duration_ms, 2)
        )
        
        # Also log graph query if data was returned
        if result.get("data", {}).get("nodes"):
            api_logger.log_graph_query(
                request=request,
                query_type="filtered",
                node_count=len(result["data"]["nodes"]),
                edge_count=len(result["data"].get("relationships", [])),
                duration_ms=round(duration_ms, 2),
                cache_hit=False
            )
        
        return result
        
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        api_logger.log_error(
            request=request,
            error_type="filtered_data_load_failed",
            error_message=str(e),
            region=region,
            recommendations_mode=recommendations_mode,
            filters_attempted=list(filters.keys()) if 'filters' in locals() else [],
            duration_ms=round(duration_ms, 2)
        )
        
        raise HTTPException(status_code=500, detail=str(e))


@complete_backend_router.get("/region/{region}/filter-options")
async def get_filter_options_only(
    request: Request,
    region: str = Path(..., description="Region code"),
    recommendations_mode: bool = Query(False, description="Enable recommendations mode")
):
    """
    Get only filter options for dropdown population
    Fast endpoint for initial UI setup
    """
    start_time = time.time()
    
    try:
        api_logger.log_user_action(
            request=request,
            action="load_filter_options",
            target=region,
            metadata={"recommendations_mode": recommendations_mode}
        )
        
        # Check cache first
        cached = complete_backend_filter_service._check_cache(region, recommendations_mode)
        cache_hit = cached is not None
        
        if cache_hit:
            api_logger.log_cache_operation(
                request=request,
                operation="hit",
                cache_key=f"{region}_{recommendations_mode}"
            )
        
        # Get filter options
        filter_options = complete_backend_filter_service.get_filter_options(
            region=region,
            recommendations_mode=recommendations_mode
        )
        
        duration_ms = (time.time() - start_time) * 1000
        
        # Calculate total options
        total_options = sum(len(v) for v in filter_options.values() if isinstance(v, list))
        
        api_logger.log_performance_milestone(
            request=request,
            milestone="filter_options_loaded",
            duration_ms=round(duration_ms, 2)
        )
        
        api_logger.log_event(
            "filter_options_retrieved",
            request=request,
            region=region,
            recommendations_mode=recommendations_mode,
            total_options=total_options,
            option_categories=len(filter_options),
            duration_ms=round(duration_ms, 2),
            cache_hit=cache_hit
        )
        
        return {
            "success": True,
            "filter_options": filter_options,
            "metadata": {
                "region": region,
                "recommendations_mode": recommendations_mode,
                "total_options": total_options,
                "cache_hit": cache_hit
            }
        }
        
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        api_logger.log_error(
            request=request,
            error_type="filter_options_load_failed",
            error_message=str(e),
            region=region,
            recommendations_mode=recommendations_mode,
            duration_ms=round(duration_ms, 2)
        )
        
        raise HTTPException(status_code=500, detail=str(e))


@complete_backend_router.post("/region/{region}/apply-suggestion")
async def apply_filter_suggestion(
    request: Request,
    region: str = Path(..., description="Region code"),
    suggestion: Dict[str, Any] = ...,
    recommendations_mode: bool = Query(False, description="Enable recommendations mode")
):
    """
    Apply a specific filter suggestion from performance recommendations
    """
    start_time = time.time()
    
    try:
        api_logger.log_user_action(
            request=request,
            action="apply_suggestion",
            target=region,
            metadata={
                "recommendations_mode": recommendations_mode,
                "suggestion": suggestion.get("description", "unknown")
            }
        )
        
        # Convert suggestion to filter format
        filter_field = suggestion.get("filter_field")
        filter_value = suggestion.get("filter_value")
        
        if not filter_field or not filter_value:
            raise HTTPException(status_code=400, detail="Invalid suggestion format")
        
        # Apply the suggested filter
        filters = {filter_field: [filter_value]}
        
        result = complete_backend_filter_service.get_region_data(
            region=region,
            filters=filters,
            recommendations_mode=recommendations_mode
        )
        
        duration_ms = (time.time() - start_time) * 1000
        
        api_logger.log_event(
            "suggestion_applied",
            request=request,
            region=region,
            recommendations_mode=recommendations_mode,
            suggestion_description=suggestion.get("description"),
            filter_field=filter_field,
            filter_value=filter_value,
            result_node_count=result.get("data", {}).get("total_nodes", 0),
            duration_ms=round(duration_ms, 2)
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        api_logger.log_error(
            request=request,
            error_type="suggestion_apply_failed",
            error_message=str(e),
            region=region,
            suggestion=suggestion,
            duration_ms=round(duration_ms, 2)
        )
        
        raise HTTPException(status_code=500, detail=str(e))


# Statistics endpoint for monitoring
@complete_backend_router.get("/statistics")
async def get_statistics(request: Request):
    """
    Get service statistics for monitoring dashboard
    """
    try:
        # Get cache stats if available
        cache_stats = {}
        if hasattr(complete_backend_filter_service, 'memory_cache'):
            cache_stats = complete_backend_filter_service.memory_cache.get_comprehensive_stats()
        
        api_logger.log_event(
            "statistics_requested",
            request=request,
            has_cache_stats=bool(cache_stats)
        )
        
        return {
            "success": True,
            "cache_statistics": cache_stats,
            "service_status": "healthy",
            "timestamp": time.time()
        }
        
    except Exception as e:
        api_logger.log_error(
            request=request,
            error_type="statistics_retrieval_failed",
            error_message=str(e)
        )
        
        raise HTTPException(status_code=500, detail=str(e))
