# app/middleware/logging_middleware.py
"""
Comprehensive logging middleware for Smart Network API
Tracks requests with unique IDs and session identification for CloudWatch/Grafana
"""
import time
import uuid
import json
import logging
from typing import Callable, Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import traceback

# Configure structured logging
logger = logging.getLogger("smart_network")


class RequestContext:
    """Context object to track request lifecycle"""
    
    def __init__(self, request: Request):
        self.request_id = str(uuid.uuid4())
        self.session_id = self._extract_session_id(request)
        self.user_agent = request.headers.get("user-agent", "unknown")
        self.client_ip = self._get_client_ip(request)
        self.start_time = time.time()
        self.endpoint = f"{request.method} {request.url.path}"
        self.region = self._extract_region(request)
        self.recommendations_mode = self._extract_recommendations_mode(request)
        
    def _extract_session_id(self, request: Request) -> str:
        """Extract or generate session ID from request"""
        # Try to get from headers first (frontend should send this)
        session_id = request.headers.get("x-session-id")
        if session_id:
            return session_id
        
        # Try to get from cookies
        session_id = request.cookies.get("session_id")
        if session_id:
            return session_id
        
        # Generate new session ID
        return f"session_{uuid.uuid4().hex[:16]}"
    
    def _get_client_ip(self, request: Request) -> str:
        """Get real client IP (handles proxies)"""
        # Check X-Forwarded-For header (for proxied requests)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to direct client
        return request.client.host if request.client else "unknown"
    
    def _extract_region(self, request: Request) -> Optional[str]:
        """Extract region from URL path"""
        path_parts = request.url.path.split("/")
        try:
            if "region" in path_parts:
                idx = path_parts.index("region")
                if idx + 1 < len(path_parts):
                    return path_parts[idx + 1].upper()
        except:
            pass
        return None
    
    def _extract_recommendations_mode(self, request: Request) -> bool:
        """Extract recommendations mode from query params"""
        return request.query_params.get("recommendations_mode", "false").lower() == "true"
    
    def to_dict(self) -> dict:
        """Convert context to dictionary for logging"""
        return {
            "request_id": self.request_id,
            "session_id": self.session_id,
            "client_ip": self.client_ip,
            "user_agent": self.user_agent,
            "endpoint": self.endpoint,
            "region": self.region,
            "recommendations_mode": self.recommendations_mode,
            "timestamp": time.time()
        }


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all requests with structured data for CloudWatch"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Create request context
        ctx = RequestContext(request)
        
        # Attach context to request state for access in route handlers
        request.state.request_id = ctx.request_id
        request.state.session_id = ctx.session_id
        request.state.log_context = ctx
        
        # Log request start
        logger.info(
            "request_started",
            extra={
                "event": "request_started",
                "request_id": ctx.request_id,
                "session_id": ctx.session_id,
                "method": request.method,
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "client_ip": ctx.client_ip,
                "user_agent": ctx.user_agent,
                "region": ctx.region,
                "recommendations_mode": ctx.recommendations_mode,
                "timestamp": ctx.start_time
            }
        )
        
        # Process request and handle errors
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.time() - ctx.start_time) * 1000
            
            # Log successful request
            logger.info(
                "request_completed",
                extra={
                    "event": "request_completed",
                    "request_id": ctx.request_id,
                    "session_id": ctx.session_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                    "region": ctx.region,
                    "recommendations_mode": ctx.recommendations_mode,
                    "success": 200 <= response.status_code < 400,
                    "timestamp": time.time()
                }
            )
            
            # Add tracking headers to response
            response.headers["X-Request-ID"] = ctx.request_id
            response.headers["X-Session-ID"] = ctx.session_id
            
            return response
            
        except Exception as e:
            # Calculate duration
            duration_ms = (time.time() - ctx.start_time) * 1000
            
            # Log error
            logger.error(
                "request_failed",
                extra={
                    "event": "request_failed",
                    "request_id": ctx.request_id,
                    "session_id": ctx.session_id,
                    "method": request.method,
                    "path": request.url.path,
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "stack_trace": traceback.format_exc(),
                    "duration_ms": round(duration_ms, 2),
                    "region": ctx.region,
                    "recommendations_mode": ctx.recommendations_mode,
                    "timestamp": time.time()
                }
            )
            
            # Return error response
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error",
                    "request_id": ctx.request_id,
                    "message": str(e)
                },
                headers={
                    "X-Request-ID": ctx.request_id,
                    "X-Session-ID": ctx.session_id
                }
            )


class StructuredLogger:
    """
    Structured logger for business logic events
    Use this in your route handlers and services
    """
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(f"smart_network.{name}")
    
    def _get_context(self, request: Optional[Request] = None) -> dict:
        """Extract context from request if available"""
        if request and hasattr(request.state, "log_context"):
            ctx = request.state.log_context
            return {
                "request_id": ctx.request_id,
                "session_id": ctx.session_id,
                "region": ctx.region,
                "recommendations_mode": ctx.recommendations_mode
            }
        return {}
    
    def log_event(
        self,
        event_name: str,
        level: str = "info",
        request: Optional[Request] = None,
        **kwargs
    ):
        """Log a structured event"""
        context = self._get_context(request)
        
        log_data = {
            "event": event_name,
            "timestamp": time.time(),
            **context,
            **kwargs
        }
        
        log_method = getattr(self.logger, level.lower(), self.logger.info)
        log_method(event_name, extra=log_data)
    
    # Convenience methods for common events
    
    def log_filter_operation(
        self,
        request: Request,
        operation: str,
        filters: dict,
        result_count: int,
        duration_ms: float
    ):
        """Log filter operation"""
        self.log_event(
            "filter_operation",
            request=request,
            operation=operation,
            filters_applied=list(filters.keys()),
            filter_count=len(filters),
            result_count=result_count,
            duration_ms=duration_ms,
            performance_bucket=self._categorize_performance(result_count)
        )
    
    def log_graph_query(
        self,
        request: Request,
        query_type: str,
        node_count: int,
        edge_count: int,
        duration_ms: float,
        cache_hit: bool = False
    ):
        """Log graph query execution"""
        self.log_event(
            "graph_query",
            request=request,
            query_type=query_type,
            node_count=node_count,
            edge_count=edge_count,
            duration_ms=duration_ms,
            cache_hit=cache_hit,
            render_mode=self._determine_render_mode(node_count),
            performance_score=self._calculate_performance_score(duration_ms, node_count)
        )
    
    def log_export_operation(
        self,
        request: Request,
        export_format: str,
        row_count: int,
        duration_ms: float,
        success: bool
    ):
        """Log export operation"""
        self.log_event(
            "export_operation",
            level="info" if success else "error",
            request=request,
            export_format=export_format,
            row_count=row_count,
            duration_ms=duration_ms,
            success=success,
            file_size_category=self._categorize_file_size(row_count)
        )
    
    def log_cache_operation(
        self,
        request: Request,
        operation: str,  # hit, miss, set, invalidate
        cache_key: str,
        ttl_seconds: Optional[int] = None
    ):
        """Log cache operation"""
        self.log_event(
            "cache_operation",
            request=request,
            operation=operation,
            cache_key=cache_key,
            ttl_seconds=ttl_seconds
        )
    
    def log_error(
        self,
        request: Request,
        error_type: str,
        error_message: str,
        recoverable: bool = False,
        **kwargs
    ):
        """Log an error"""
        self.log_event(
            "error_occurred",
            level="error",
            request=request,
            error_type=error_type,
            error_message=error_message,
            recoverable=recoverable,
            **kwargs
        )
    
    def log_user_action(
        self,
        request: Request,
        action: str,
        target: Optional[str] = None,
        metadata: Optional[dict] = None
    ):
        """Log user action (button click, filter apply, etc.)"""
        self.log_event(
            "user_action",
            request=request,
            action=action,
            target=target,
            metadata=metadata or {}
        )
    
    def log_performance_milestone(
        self,
        request: Request,
        milestone: str,
        duration_ms: float,
        success: bool = True
    ):
        """Log performance milestone"""
        self.log_event(
            "performance_milestone",
            request=request,
            milestone=milestone,
            duration_ms=duration_ms,
            success=success,
            performance_rating=self._rate_performance(duration_ms, milestone)
        )
    
    # Helper methods
    
    def _categorize_performance(self, result_count: int) -> str:
        """Categorize performance based on result count"""
        if result_count <= 50:
            return "optimal"
        elif result_count <= 100:
            return "acceptable"
        elif result_count <= 500:
            return "large"
        else:
            return "very_large"
    
    def _determine_render_mode(self, node_count: int) -> str:
        """Determine render mode based on node count"""
        if node_count == 0:
            return "filters_only"
        elif node_count <= 50:
            return "graph_ready"
        else:
            return "too_many_nodes"
    
    def _calculate_performance_score(self, duration_ms: float, node_count: int) -> float:
        """Calculate performance score (0-100)"""
        # Lower is better for duration, normalize to 0-100 scale
        duration_score = max(0, 100 - (duration_ms / 100))
        
        # Optimal node count is 50 or less
        node_score = 100 if node_count <= 50 else max(0, 100 - ((node_count - 50) / 10))
        
        return round((duration_score + node_score) / 2, 2)
    
    def _categorize_file_size(self, row_count: int) -> str:
        """Categorize export file size"""
        if row_count < 100:
            return "small"
        elif row_count < 1000:
            return "medium"
        elif row_count < 10000:
            return "large"
        else:
            return "very_large"
    
    def _rate_performance(self, duration_ms: float, milestone: str) -> str:
        """Rate performance quality"""
        # Different thresholds for different milestones
        thresholds = {
            "filter_options_loaded": 500,
            "graph_data_loaded": 2000,
            "export_completed": 5000,
            "cache_operation": 100
        }
        
        threshold = thresholds.get(milestone, 1000)
        
        if duration_ms < threshold * 0.5:
            return "excellent"
        elif duration_ms < threshold:
            return "good"
        elif duration_ms < threshold * 2:
            return "acceptable"
        else:
            return "slow"


# Global logger instances for different components
api_logger = StructuredLogger("api")
service_logger = StructuredLogger("service")
cache_logger = StructuredLogger("cache")
export_logger = StructuredLogger("export")
