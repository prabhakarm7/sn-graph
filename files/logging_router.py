# app/api/logging_router.py
"""
Router for receiving frontend logs and forwarding to CloudWatch
Enables complete request tracking from client to server
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
import logging

from app.middleware.logging_middleware import api_logger

# Create router
logging_router = APIRouter(
    prefix="/logs",
    tags=["Frontend Logging"]
)

# Request models
class FrontendLogEvent(BaseModel):
    event: str
    level: str  # info, warn, error, debug
    timestamp: float
    session_id: str
    user_action: str = None
    component: str = None
    metadata: Dict[str, Any] = {}

class FrontendLogBatch(BaseModel):
    session_id: str
    events: List[FrontendLogEvent]


@logging_router.post("/frontend")
async def receive_frontend_logs(
    request: Request,
    batch: FrontendLogBatch
):
    """
    Receive and process frontend log events
    Merges frontend logs with backend request context
    """
    try:
        # Get backend request context
        request_id = getattr(request.state, 'request_id', 'unknown')
        backend_session_id = getattr(request.state, 'session_id', 'unknown')
        
        # Validate session ID matches
        if batch.session_id != backend_session_id:
            api_logger.log_event(
                "session_id_mismatch",
                level="warn",
                request=request,
                frontend_session=batch.session_id,
                backend_session=backend_session_id
            )
        
        # Process each event
        for event in batch.events:
            # Map frontend log level to Python logging level
            level_map = {
                'debug': logging.DEBUG,
                'info': logging.INFO,
                'warn': logging.WARNING,
                'error': logging.ERROR
            }
            
            python_level = level_map.get(event.level.lower(), logging.INFO)
            
            # Create structured log entry
            log_data = {
                "event": f"frontend_{event.event}",
                "request_id": request_id,
                "session_id": batch.session_id,
                "frontend_timestamp": event.timestamp,
                "user_action": event.user_action,
                "component": event.component,
                "source": "frontend",
                **event.metadata
            }
            
            # Log to CloudWatch
            logger = logging.getLogger("smart_network.frontend")
            logger.log(
                python_level,
                f"frontend_{event.event}",
                extra=log_data
            )
        
        # Log successful batch processing
        api_logger.log_event(
            "frontend_logs_received",
            request=request,
            event_count=len(batch.events),
            session_id=batch.session_id
        )
        
        return {
            "success": True,
            "received": len(batch.events),
            "request_id": request_id
        }
        
    except Exception as e:
        api_logger.log_error(
            request=request,
            error_type="frontend_log_processing_failed",
            error_message=str(e),
            batch_size=len(batch.events) if batch else 0
        )
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process frontend logs: {str(e)}"
        )


@logging_router.get("/session/{session_id}/summary")
async def get_session_summary(
    request: Request,
    session_id: str
):
    """
    Get summary of a user session (useful for debugging)
    In production, this would query CloudWatch
    """
    api_logger.log_event(
        "session_summary_requested",
        request=request,
        target_session_id=session_id
    )
    
    return {
        "message": "In production, this would query CloudWatch for session logs",
        "session_id": session_id,
        "query": f"fields @timestamp, event, user_action | filter session_id = '{session_id}' | sort @timestamp asc"
    }
