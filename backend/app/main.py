# main.py - Updated with complete backend router
"""
Updated FastAPI application with complete backend processing router.
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

# Import services
from app.services.graph_service import graph_service
from app.services.complete_backend_filter_service import complete_backend_filter_service

# Import routers
from app.api.router import api_router
from app.api.complete_backend_router import complete_backend_router
from app.api.export_router import export_router


BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_BUILD = BASE_DIR / "frontend" / "build"
FRONTEND_STATIC = FRONTEND_BUILD / "static"

# Create FastAPI application
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION + " - Enhanced with Complete Backend Processing",
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

# Include API routers
app.include_router(api_router, prefix="/api/v1")
app.include_router(complete_backend_router, prefix="/api/v1")  # NEW: Complete backend processing
app.include_router(export_router, prefix="/api/v1")

# Store startup time
app.state.start_time = time.time()

# Enhanced health check endpoint
# @app.get("/health")
# async def health_check():
#     """Enhanced health check with complete backend service status."""
#     try:
#         # Check both services
#         graph_db_connected = graph_service.health_check()
#         backend_service_connected = complete_backend_filter_service.driver is not None
        
#         uptime_seconds = time.time() - app.state.start_time
        
#         # Get database stats if connected
#         db_stats = None
#         if graph_db_connected:
#             try:
#                 db_stats = graph_service.get_database_stats()
#             except Exception as e:
#                 print(f"Warning: Could not get database stats: {e}")
        
#         return {
#             "status": "healthy" if (graph_db_connected and backend_service_connected) else "partial",
#             "timestamp": time.time(),
#             "services": {
#                 "graph_service": graph_db_connected,
#                 "complete_backend_service": backend_service_connected,
#                 "database_connected": graph_db_connected
#             },
#             "features": {
#                 "original_hierarchical_filters": True,
#                 "complete_backend_processing": backend_service_connected,
#                 "server_side_filtering": True,
#                 "performance_optimization": True,
#                 "embedded_rating_collection": True,
#                 "smart_node_limiting": True
#             },
#             "uptime_seconds": uptime_seconds,
#             "version": API_VERSION,
#             "database_stats": db_stats
#         }
        
#     except Exception as e:
#         return JSONResponse(
#             status_code=500,
#             content={
#                 "status": "unhealthy",
#                 "error": str(e),
#                 "timestamp": time.time()
#             }
#         )

# Mount static files for React app (AFTER API routes)
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

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Enhanced startup with complete backend service."""
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
    
    # Test database connections
    graph_connected = graph_service.health_check()
    backend_connected = complete_backend_filter_service.driver is not None
    
    if graph_connected:
        print("✅ Graph service database connection successful")
        try:
            stats = graph_service.get_database_stats()
            print(f"📊 Database contains {stats['total_nodes']} nodes and {stats['total_relationships']} relationships")
        except Exception as e:
            print(f"⚠️ Could not get database stats: {e}")
    else:
        print("❌ Graph service database connection failed")
    
    if backend_connected:
        print("✅ Complete backend service initialized successfully")
        print("🚀 Features enabled:")
        print("   - Server-side filtering and rating collection")
        print("   - Performance-optimized queries with 50-node limit")
        print("   - Embedded layout calculation")
        print("   - Smart filter suggestions for large datasets")
        print("   - PCA/ACA parsing in Cypher queries")
    else:
        print("❌ Complete backend service initialization failed")
    
    print("\n🎯 API Endpoints Available:")
    print("   Original: /api/v1/hierarchical/* (existing functionality)")
    print("   Enhanced: /api/v1/complete/* (complete backend processing)")
    print("   Health: /health (comprehensive status)")

@app.on_event("shutdown")
async def shutdown_event():
    """Enhanced cleanup."""
    print("🛑 Shutting down Smart Network API")
    
    # Close both services
    graph_service.close()
    complete_backend_filter_service.close()
    
    print("✅ All database connections closed")

if __name__ == "__main__":
    import uvicorn
    
    print(f"🚀 Starting Smart Network Backend API with Complete Backend Processing")
    print(f"🌐 API will be available at: http://{API_HOST}:{API_PORT}")
    print(f"📚 Documentation at: http://{API_HOST}:{API_PORT}/docs")
    print(f"⚡ Complete backend processing: /api/v1/complete/*")
    
    uvicorn.run(
        "app.main:app",
        host=API_HOST,
        port=API_PORT,
        reload=True
    )