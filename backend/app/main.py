"""
Updated FastAPI application with all routers included.
"""
import time
import os
from typing import Dict, Any, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.config import (
    API_TITLE, API_DESCRIPTION, API_VERSION, API_HOST, API_PORT,
    ALLOWED_ORIGINS, ALLOWED_METHODS, ALLOWED_HEADERS,
    NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE,
    validate_neo4j_connection
)

# Import routers
from app.services.graph_service import graph_service
from app.api.router import api_router

BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_BUILD = BASE_DIR / "frontend" / "build"
FRONTEND_STATIC = FRONTEND_BUILD / "static"

# Create FastAPI application
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=ALLOWED_METHODS,
    allow_headers=ALLOWED_HEADERS,
)

# Include API routers FIRST (before static file mounting)
app.include_router(api_router, prefix="/api/v1")

# Store startup time
app.state.start_time = time.time()

# Health check endpoint (API route)
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check database connection
        database_connected = graph_service.health_check()
        
        # Calculate uptime
        uptime_seconds = time.time() - app.state.start_time
        
        # Get basic database stats if connected
        db_stats = None
        if database_connected:
            try:
                db_stats = graph_service.get_database_stats()
            except Exception as e:
                print(f"Warning: Could not get database stats: {e}")
        
        return {
            "status": "healthy" if database_connected else "unhealthy",
            "timestamp": time.time(),
            "database_connected": database_connected,
            "uptime_seconds": uptime_seconds,
            "version": API_VERSION,
            "database_stats": db_stats
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": "unhealthy",
                "database_connected": False,
                "error": str(e),
                "timestamp": time.time()
            }
        )

# ===== NODE MANAGEMENT ENDPOINTS =====

@app.post("/api/v1/nodes/consultant")
async def create_consultant(consultant_data: dict):
    """Create a new consultant node."""
    try:
        result = graph_service.create_consultant(consultant_data)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/nodes/company")
async def create_company(company_data: dict):
    """Create a new company node."""
    try:
        result = graph_service.create_company(company_data)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/nodes/product")
async def create_product(product_data: dict):
    """Create a new product node."""
    try:
        result = graph_service.create_product(product_data)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/v1/nodes/{node_id}")
async def update_node(node_id: str, node_data: dict):
    """Update an existing node."""
    try:
        result = graph_service.update_node(node_id, node_data)
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/nodes/{node_id}")
async def delete_node(node_id: str):
    """Delete a node and all its relationships."""
    try:
        success = graph_service.delete_node(node_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Node with ID {node_id} not found")
        
        return {"success": True, "message": f"Node {node_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== RELATIONSHIP MANAGEMENT ENDPOINTS =====

@app.post("/api/v1/relationships")
async def create_relationship(
    rel_type: str,
    source_id: str,
    target_id: str,
    properties: dict = None
):
    """Create a relationship between two nodes."""
    try:
        result = graph_service.create_relationship(
            rel_type=rel_type,
            source_id=source_id,
            target_id=target_id,
            properties=properties or {}
        )
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/v1/relationships/{rel_id}")
async def update_relationship(rel_id: str, properties: dict):
    """Update relationship properties."""
    try:
        result = graph_service.update_relationship(rel_id, properties)
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/relationships/{rel_id}")
async def delete_relationship(rel_id: str):
    """Delete a relationship."""
    try:
        success = graph_service.delete_relationship(rel_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Relationship with ID {rel_id} not found")
        
        return {"success": True, "message": f"Relationship {rel_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== CUSTOM QUERY ENDPOINT =====

@app.post("/api/v1/query/cypher")
async def execute_cypher_query(query_request: dict):
    """Execute a custom Cypher query."""
    try:
        query = query_request.get("query")
        parameters = query_request.get("parameters", {})
        read_only = query_request.get("read_only", True)
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        result = graph_service.execute_cypher(
            query=query,
            parameters=parameters,
            read_only=read_only
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount static files for React app (AFTER API routes)
# Mount the static assets first
if FRONTEND_STATIC.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_STATIC)), name="static")

# Serve React app for all other routes (catch-all)
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    """Serve React app for all non-API routes."""
    # Try to serve the requested file
    file_path = FRONTEND_BUILD / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    
    # If file doesn't exist, serve index.html (for React Router)
    index_path = FRONTEND_BUILD / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    else:
        raise HTTPException(status_code=404, detail="React app not found. Make sure to build it first.")

# ===== STARTUP AND SHUTDOWN EVENTS =====

@app.on_event("startup")
async def startup_event():
    """Perform startup tasks."""
    print(f"🚀 Starting {API_TITLE} v{API_VERSION}")
    print(f"🌐 API will be available at: http://{API_HOST}:{API_PORT}")
    print(f"📚 Documentation at: http://{API_HOST}:{API_PORT}/docs")
    print(f"🔗 Connecting to Neo4j: {NEO4J_URI}")
    
    # Check if frontend build exists
    if FRONTEND_BUILD.exists():
        print(f"✅ Frontend build found at: {FRONTEND_BUILD}")
    else:
        print(f"⚠️ Frontend build not found at: {FRONTEND_BUILD}")
        print("   Run 'npm run build' in the frontend directory")
    
    # Test database connection
    if graph_service.health_check():
        print("✅ Database connection successful")
        try:
            stats = graph_service.get_database_stats()
            print(f"📊 Database contains {stats['total_nodes']} nodes and {stats['total_relationships']} relationships")
        except Exception as e:
            print(f"⚠️ Could not get database stats: {e}")
    else:
        print("❌ Database connection failed")

@app.on_event("shutdown")
async def shutdown_event():
    """Perform cleanup tasks."""
    print("🛑 Shutting down Smart Network API")
    graph_service.close()
    print("✅ Database connections closed")

if __name__ == "__main__":
    import uvicorn
    
    print(f"🚀 Starting Smart Network Backend API")
    print(f"🌐 API will be available at: http://{API_HOST}:{API_PORT}")
    print(f"📚 Documentation at: http://{API_HOST}:{API_PORT}/docs")
    
    uvicorn.run(
        "app.main:app",
        host=API_HOST,
        port=API_PORT,
        reload=True
    )