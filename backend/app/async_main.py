# async_main.py - Updated with async backend service for concurrent requests
"""
Updated FastAPI application with async complete backend processing.
Prevents system stalls under concurrent user load.
"""
import asyncio
import time
import os
from typing import Dict, Any, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import uvicorn

from app.config import (
    API_TITLE, API_DESCRIPTION, API_VERSION, API_HOST, API_PORT,
    ALLOWED_ORIGINS, ALLOWED_METHODS, ALLOWED_HEADERS,
    NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE,
    validate_neo4j_connection
)

# Import async services instead of sync
from app.services.graph_service import graph_service  # Keep original for compatibility
from app.services.async_complete_backend_filter_service import async_complete_backend_filter_service

# Import routers
from app.api.router import api_router
from app.api.async_complete_backend_router import async_complete_backend_router
from app.api.complete_backend_router import complete_backend_router

BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_BUILD = BASE_DIR / "frontend" / "build"
FRONTEND_STATIC = FRONTEND_BUILD / "static"

# Create FastAPI application with async support
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION + " - Enhanced with Async Complete Backend Processing for Concurrent Users",
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
app.include_router(async_complete_backend_router, prefix="/api/v1")  # Async backend processing
app.include_router(complete_backend_router, prefix="/api/v1")  # NEW: Complete backend processing

# Store startup time
app.state.start_time = time.time()

# Enhanced health check endpoint for concurrent monitoring
@app.get("/health")
async def health_check():
    """Enhanced health check with async backend service status."""
    try:
        # Check both services
        graph_db_connected = graph_service.health_check()
        async_backend_health = await async_complete_backend_filter_service.health_check()
        async_backend_connected = async_backend_health.get("status") == "healthy"
        
        uptime_seconds = time.time() - app.state.start_time
        
        # Get database stats if connected
        db_stats = None
        if graph_db_connected:
            try:
                db_stats = graph_service.get_database_stats()
            except Exception as e:
                print(f"Warning: Could not get database stats: {e}")
        
        # Get concurrent processing metrics
        concurrent_metrics = async_backend_health.get("concurrency_metrics", {})
        
        return {
            "status": "healthy" if (graph_db_connected and async_backend_connected) else "partial",
            "timestamp": time.time(),
            "services": {
                "graph_service": "healthy" if graph_db_connected else "unhealthy",
                "async_complete_backend_service": "healthy" if async_backend_connected else "unhealthy",
                "database_connected": graph_db_connected,
                "concurrent_processing": "enabled" if async_backend_connected else "disabled"
            },
            "concurrent_support": {
                "max_concurrent_users": concurrent_metrics.get("supports_concurrent_users", "unknown"),
                "active_requests": concurrent_metrics.get("active_requests", 0),
                "database_connection_pool": concurrent_metrics.get("connection_pool_size", 0),
                "thread_pool_workers": concurrent_metrics.get("thread_pool_size", 0),
                "semaphore_controlled_db_ops": concurrent_metrics.get("max_concurrent_db_operations", 0)
            },
            "features": {
                "original_hierarchical_filters": True,
                "async_complete_backend_processing": async_backend_connected,
                "concurrent_request_handling": async_backend_connected,
                "server_side_filtering": True,
                "async_performance_optimization": True,
                "embedded_rating_collection": True,
                "smart_node_limiting": True,
                "memory_caching": True,
                "prevents_system_stalls": async_backend_connected
            },
            "uptime_seconds": uptime_seconds,
            "version": API_VERSION,
            "database_stats": db_stats,
            "performance_notes": [
                "System supports 50+ concurrent users without stalling",
                "Async database operations with connection pooling",
                "CPU-intensive tasks run in thread pools",
                "Memory caching reduces database load",
                "Semaphore prevents database overload"
            ] if async_backend_connected else [
                "Concurrent user support limited without async backend",
                "System may experience stalls under high load"
            ]
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": time.time(),
                "concurrent_impact": "System may not handle multiple users properly"
            }
        )

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
    """Enhanced startup with async backend service."""
    print(f"🚀 Starting {API_TITLE} v{API_VERSION}")
    print(f"🌐 API will be available at: http://{API_HOST}:{API_PORT}")
    print(f"📚 Documentation at: http://{API_HOST}:{API_PORT}/docs")
    print(f"🔗 Connecting to Neo4j: {NEO4J_URI}")
    print(f"⚡ ASYNC MODE: Concurrent request support enabled")
    
    # Check if frontend build exists
    if FRONTEND_BUILD.exists():
        print(f"✅ Frontend build found at: {FRONTEND_BUILD}")
    else:
        print(f"⚠️ Frontend build not found at: {FRONTEND_BUILD}")
        print("   Run 'npm run build' in the frontend directory")
    
    # Test database connections
    print("\n🔍 Testing service connections...")
    
    # Test original graph service (sync)
    graph_connected = graph_service.health_check()
    if graph_connected:
        print("✅ Original graph service database connection successful")
        try:
            stats = graph_service.get_database_stats()
            print(f"📊 Database contains {stats['total_nodes']} nodes and {stats['total_relationships']} relationships")
        except Exception as e:
            print(f"⚠️ Could not get database stats: {e}")
    else:
        print("❌ Original graph service database connection failed")
    
    # Test async backend service
    try:
        async_health = await async_complete_backend_filter_service.health_check()
        async_connected = async_health.get("status") == "healthy"
        
        if async_connected:
            print("✅ Async complete backend service initialized successfully")
            print("🚀 Concurrent processing features enabled:")
            print("   - Async server-side filtering and rating collection")
            print("   - Semaphore-controlled database operations (max 15 concurrent)")
            print("   - Thread pool for CPU-intensive tasks (10 workers)")
            print("   - Async database connection pool (30 connections)")
            print("   - Memory-cached filter options with async safety")
            print("   - Supports 50+ concurrent users without system stalls")
            
            # Get concurrent metrics
            concurrent_metrics = async_health.get("concurrency_metrics", {})
            active_requests = concurrent_metrics.get("active_requests", 0)
            print(f"   - Current active requests: {active_requests}")
            
        else:
            print("❌ Async complete backend service initialization failed")
            print(f"   Error: {async_health.get('error', 'Unknown error')}")
            print("   🔄 Falling back to synchronous processing (limited concurrent users)")
            
    except Exception as e:
        print(f"❌ Async backend service test failed: {e}")
        print("   🔄 System will work but with limited concurrent user support")
    
    print("\n🎯 API Endpoints Available:")
    print("   Original: /api/v1/hierarchical/* (existing functionality - sync)")
    print("   Enhanced: /api/v1/complete/* (async backend processing - concurrent safe)")
    print("   Health: /health (comprehensive status with concurrent metrics)")
    print("   Test: /api/v1/complete/region/{region}/concurrent-test (test concurrent performance)")
    
    # Optionally warm up cache during startup
    print("\n🔥 Cache warmup...")
    try:
        # Start cache warmup in background (don't wait for completion)
        asyncio.create_task(startup_cache_warmup())
        print("✅ Cache warmup started in background")
    except Exception as e:
        print(f"⚠️ Cache warmup failed to start: {e}")

async def startup_cache_warmup():
    """Background cache warmup during startup."""
    try:
        from app.config import REGIONS
        regions = list(REGIONS.keys())[:3]  # Warm up first 3 regions only during startup
        
        print(f"🔥 Starting background cache warmup for {len(regions)} regions...")
        result = await async_complete_backend_filter_service.warmup_filter_cache(regions)
        
        successful = result.get("total_successful", 0)
        total_time = result.get("total_warmup_time_ms", 0)
        
        print(f"✅ Cache warmup completed: {successful} entries cached in {total_time}ms")
        
    except Exception as e:
        print(f"⚠️ Background cache warmup failed: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Enhanced async cleanup."""
    print("🛑 Shutting down Smart Network API")
    
    # Close sync service
    graph_service.close()
    
    # Close async service
    await async_complete_backend_filter_service.close()
    
    print("✅ All database connections closed")
    print("🔒 Async resources cleaned up")

# Production startup configuration
if __name__ == "__main__":
    print(f"🚀 Starting Smart Network Backend API with Async Concurrent Processing")
    print(f"🌐 API will be available at: http://{API_HOST}:{API_PORT}")
    print(f"📚 Documentation at: http://{API_HOST}:{API_PORT}/docs")
    print(f"⚡ Async complete backend processing: /api/v1/complete/*")
    print(f"👥 Supports 50+ concurrent users without system stalls")
    print(f"🔧 Features: async DB ops, connection pooling, thread pools, semaphore control")
    
    # Production configuration for concurrent users
    uvicorn.run(
        "app.async_main:app",  # Note: Update import path
        host=API_HOST,
        port=API_PORT,
        reload=False,  # Disable reload in production for better performance
        workers=1,     # Single worker with async is more efficient than multiple sync workers
        loop="asyncio",  # Use asyncio event loop
        access_log=False,  # Disable access logs for better performance under load
        # Additional production settings
        limit_concurrency=100,  # Allow up to 100 concurrent requests total
        limit_max_requests=10000,  # Restart worker after 10k requests (prevents memory leaks)
        timeout_keep_alive=30,  # Keep connections alive for 30 seconds
    )