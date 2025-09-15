# api/nlq_router.py - Updated to accept new SmartQuery format
"""
Natural Language Query (NLQ) API Router
Updated to handle both legacy Cypher queries and new SmartQuery objects with embedded filters
"""
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel, Field

# Create router
nlq_router = APIRouter(
    prefix="/complete/region",
    tags=["Natural Language Query Processing"]
)

# Pydantic models for request handling
class SmartQueryObject(BaseModel):
    """SmartQuery object with embedded applied filters"""
    id: str
    question: str
    template_cypher_query: str
    example_filters: Dict[str, Any]
    expected_cypher_query: str
    auto_mode: str
    mode_keywords: List[str]
    applied_filters: Dict[str, Any] = Field(default_factory=dict)

class NLQRequest(BaseModel):
    """Unified request model that handles both legacy and new formats"""
    # Legacy format fields
    cypher_query: Optional[str] = None
    
    # New SmartQuery format fields
    smart_query: Optional[SmartQueryObject] = None
    region: Optional[str] = None
    user_intent: Optional[str] = None
    
    # Common fields
    recommendations_mode: bool = False

@nlq_router.post("/{region}/nlq")
async def process_nlq_request(
    region: str = Path(..., description="Region for the query"),
    request: NLQRequest = ...
):
    """
    Process NLQ request - handles both legacy Cypher queries and new SmartQuery objects
    """
    try:
        # Detect request format and route accordingly
        if request.smart_query is not None:
            # New SmartQuery format
            print(f"Processing SmartQuery: {request.smart_query.id}")
            print(f"Applied filters: {request.smart_query.applied_filters}")
            
            # TODO: Process SmartQuery object with embedded filters
            # Your existing query building and execution logic goes here
            
            response_data = {
                "success": True,
                "render_mode": "graph",
                "data": {
                    "nodes": [],
                    "relationships": []
                },
                "metadata": {
                    "smart_query_id": request.smart_query.id,
                    "smart_query_question": request.smart_query.question,
                    "template_used": request.smart_query.template_cypher_query,
                    "applied_filters": request.smart_query.applied_filters,
                    "recommendations_mode": request.recommendations_mode,
                    "region": region,
                    "user_intent": request.user_intent
                }
            }
            
        elif request.cypher_query is not None:
            # Legacy Cypher query format
            print(f"Processing legacy Cypher query")
            print(f"Query: {request.cypher_query}")
            
            # TODO: Process legacy Cypher query
            # Your existing legacy processing logic goes here
            
            response_data = {
                "success": True,
                "render_mode": "graph", 
                "data": {
                    "nodes": [],
                    "relationships": []
                },
                "metadata": {
                    "cypher_query": request.cypher_query,
                    "recommendations_mode": request.recommendations_mode,
                    "region": region
                }
            }
            
        else:
            raise HTTPException(
                status_code=400, 
                detail="Request must contain either 'cypher_query' or 'smart_query'"
            )
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"NLQ processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process NLQ request: {str(e)}")

@nlq_router.get("/{region}/health")
async def nlq_health_check(region: str = Path(..., description="Region to check")):
    """Health check for NLQ endpoint"""
    return {
        "status": "healthy",
        "region": region,
        "supported_formats": ["legacy_cypher", "smart_query"],
        "timestamp": "2025-01-15T10:00:00Z"
    }