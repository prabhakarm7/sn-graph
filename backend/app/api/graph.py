"""
Graph API endpoints for Smart Network Backend.
Updated to use graph_service like filters.py
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

from app.database.models import (
    GraphResponse, FilterCriteria, DataGenerationConfig, DataGenerationResponse,
    DatabaseStats, CypherQueryRequest, CypherQueryResponse, ErrorResponse,
    NodeResponse, RelationshipResponse
)
from app.services.graph_service import graph_service
from app.config import REGIONS


graph_router = APIRouter(
    prefix="/graph",
    responses={
        404: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)


@graph_router.get(
    "/region/{region}",
    response_model=GraphResponse,
    summary="Get graph data for a specific region",
    description="Retrieve all nodes and relationships for a specific region (NAI, EMEA, APAC)"
)
async def get_region_data(region: str):
    """Get graph data for a specific region."""
    try:
        region_upper = region.upper()
        if region_upper not in REGIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid region: {region}. Must be one of: {REGIONS}"
            )
        
        result = graph_service.get_region_graph(region_upper)
        
        return GraphResponse(
            nodes=[NodeResponse(**node) for node in result["nodes"]],
            relationships=[RelationshipResponse(**rel) for rel in result["relationships"]],
            metadata=result.get("metadata", {})
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get region data: {str(e)}")


@graph_router.post(
    "/filter",
    response_model=GraphResponse,
    summary="Get filtered graph data",
    description="Apply filters to retrieve specific subsets of the graph data"
)
async def get_filtered_data(filters: FilterCriteria):
    """Get graph data with applied filters."""
    try:
        # Convert Pydantic model to dict for the service
        filters_dict = filters.dict(exclude_unset=True)
        
        # Get filtered graph data
        result = graph_service.get_filtered_graph(filters_dict)
        
        return GraphResponse(
            nodes=[NodeResponse(**node) for node in result["nodes"]],
            relationships=[RelationshipResponse(**rel) for rel in result["relationships"]],
            metadata=result.get("metadata", {})
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get filtered data: {str(e)}")


@graph_router.get(
    "/stats",
    response_model=DatabaseStats,
    summary="Get database statistics",
    description="Retrieve comprehensive statistics about the current database state"
)
async def get_database_statistics():
    """Get comprehensive database statistics."""
    try:
        stats = graph_service.get_database_stats()
        
        return DatabaseStats(
            total_nodes=stats["total_nodes"],
            total_relationships=stats["total_relationships"],
            node_counts=stats["node_counts"],
            relationship_counts=stats["relationship_counts"],
            region_counts=stats["region_counts"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get database statistics: {str(e)}")


@graph_router.delete(
    "/clear",
    summary="Clear all data",
    description="⚠️ WARNING: This will delete ALL data in the database"
)
async def clear_database():
    """Clear all data from the database."""
    try:
        result = graph_service.clear_database()
        
        return {
            "success": True,
            "message": "Database cleared successfully",
            "nodes_deleted": result["nodes_deleted"],
            "relationships_deleted": result["relationships_deleted"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear database: {str(e)}")


@graph_router.post(
    "/query",
    response_model=CypherQueryResponse,
    summary="Execute custom Cypher query",
    description="Execute a custom Cypher query (read-only by default for safety)"
)
async def execute_cypher_query(query_request: CypherQueryRequest):
    """Execute a custom Cypher query."""
    try:
        result = graph_service.execute_cypher(
            query=query_request.query,
            parameters=query_request.parameters,
            read_only=query_request.read_only
        )
        
        return CypherQueryResponse(
            success=result["success"],
            data=result["data"],
            execution_time=result["execution_time"],
            query=result["query"],
            row_count=result["row_count"],
            error=result.get("error")
        )
        
    except Exception as e:
        return CypherQueryResponse(
            success=False,
            data=[],
            execution_time=0.0,
            query=query_request.query,
            row_count=0,
            error=str(e)
        )


@graph_router.get(
    "/nodes/{node_id}",
    summary="Get node details",
    description="Get detailed information about a specific node by ID"
)
async def get_node_details(node_id: str):
    """Get detailed information about a specific node."""
    try:
        with graph_service.driver.session() as session:
            query = """
            MATCH (n)
            WHERE id(n) = $node_id
            OPTIONAL MATCH (n)-[r]->(connected)
            RETURN n, labels(n) as labels, id(n) as neo4j_id,
                   collect(DISTINCT {
                       relationship: r,
                       connected_node: connected,
                       rel_id: id(r),
                       connected_id: id(connected)
                   }) as connections
            """
            
            result = session.run(query, {"node_id": int(node_id)})
            record = result.single()
            
            if not record:
                raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
            
            # Process connections to remove null relationships
            connections = [
                conn for conn in record["connections"] 
                if conn["relationship"] is not None
            ]
            
            return {
                "node": {
                    "id": str(record["neo4j_id"]),
                    "labels": record["labels"],
                    "properties": dict(record["n"])
                },
                "connections": [
                    {
                        "relationship": {
                            "id": str(conn["rel_id"]),
                            "type": conn["relationship"].type,
                            "properties": dict(conn["relationship"])
                        },
                        "connected_node": {
                            "id": str(conn["connected_id"]),
                            "properties": dict(conn["connected_node"]) if conn["connected_node"] else {}
                        }
                    }
                    for conn in connections
                ],
                "connection_count": len(connections)
            }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get node details: {str(e)}")


@graph_router.get(
    "/relationships/{rel_id}",
    summary="Get relationship details",
    description="Get detailed information about a specific relationship by ID"
)
async def get_relationship_details(rel_id: str):
    """Get detailed information about a specific relationship."""
    try:
        with graph_service.driver.session() as session:
            query = """
            MATCH (source)-[r]->(target)
            WHERE id(r) = $rel_id
            RETURN r, type(r) as rel_type, id(r) as neo4j_id,
                   source, labels(source) as source_labels, id(source) as source_id,
                   target, labels(target) as target_labels, id(target) as target_id
            """
            
            result = session.run(query, {"rel_id": int(rel_id)})
            record = result.single()
            
            if not record:
                raise HTTPException(status_code=404, detail=f"Relationship {rel_id} not found")
            
            return {
                "relationship": {
                    "id": str(record["neo4j_id"]),
                    "type": record["rel_type"],
                    "properties": dict(record["r"])
                },
                "source_node": {
                    "id": str(record["source_id"]),
                    "labels": record["source_labels"],
                    "properties": dict(record["source"])
                },
                "target_node": {
                    "id": str(record["target_id"]),
                    "labels": record["target_labels"],
                    "properties": dict(record["target"])
                }
            }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get relationship details: {str(e)}")


@graph_router.get(
    "/search",
    summary="Search nodes",
    description="Search for nodes by name or other properties"
)
async def search_nodes(
    search_term: str,
    node_types: Optional[List[str]] = None,
    region: Optional[str] = None,
    limit: int = 50
):
    """Search for nodes by name or other properties."""
    try:
        # Validate region if provided
        if region and region.upper() not in REGIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid region: {region}. Must be one of: {REGIONS}"
            )
        
        # Validate node types if provided
        valid_node_types = ["CONSULTANT", "FIELD_CONSULTANT", "COMPANY", "PRODUCT", "INCUMBENT_PRODUCT"]
        if node_types:
            invalid_types = [nt for nt in node_types if nt not in valid_node_types]
            if invalid_types:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid node types: {invalid_types}. Must be one of: {valid_node_types}"
                )
        
        # Use the search method from graph_service
        nodes = graph_service.search_nodes(
            search_term=search_term,
            node_types=node_types,
            region=region.upper() if region else None
        )
        
        # Apply limit
        nodes = nodes[:limit]
        
        return {
            "search_term": search_term,
            "filters": {
                "node_types": node_types,
                "region": region
            },
            "results": nodes,
            "result_count": len(nodes),
            "limit": limit
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


# Note: Removing the data generation endpoint for now since SmartNetworkDataGenerator
# is not yet implemented. This can be added back when the data generator is ready.

@graph_router.get(
    "/health",
    summary="Graph service health check",
    description="Check the health of the graph database connection"
)
async def graph_health_check():
    """Check graph service health."""
    try:
        is_healthy = graph_service.health_check()
        
        if is_healthy:
            stats = graph_service.get_database_stats()
            return {
                "status": "healthy",
                "database_connected": True,
                "total_nodes": stats["total_nodes"],
                "total_relationships": stats["total_relationships"]
            }
        else:
            return {
                "status": "unhealthy",
                "database_connected": False,
                "error": "Database connection failed"
            }
            
    except Exception as e:
        return {
            "status": "unhealthy",
            "database_connected": False,
            "error": str(e)
        }