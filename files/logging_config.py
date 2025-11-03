# app/config/logging_config.py
"""
Logging configuration for CloudWatch/Grafana integration
Outputs structured JSON logs that are easy to query and visualize
"""
import logging
import json
import sys
from typing import Any, Dict
from datetime import datetime
import os


class CloudWatchFormatter(logging.Formatter):
    """
    Custom formatter that outputs JSON logs compatible with CloudWatch
    and easily queryable in Grafana
    """
    
    def format(self, record: logging.LogRecord) -> str:
        # Base log structure
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info)
            }
        
        # Add extra fields (from structured logging)
        if hasattr(record, "__dict__"):
            for key, value in record.__dict__.items():
                # Skip standard logging fields
                if key not in [
                    "name", "msg", "args", "created", "filename", "funcName",
                    "levelname", "levelno", "lineno", "module", "msecs", 
                    "message", "pathname", "process", "processName", "relativeCreated",
                    "stack_info", "thread", "threadName", "exc_info", "exc_text"
                ]:
                    log_data[key] = self._serialize_value(value)
        
        return json.dumps(log_data, default=str)
    
    def _serialize_value(self, value: Any) -> Any:
        """Safely serialize values for JSON"""
        if isinstance(value, (str, int, float, bool, type(None))):
            return value
        elif isinstance(value, (list, tuple)):
            return [self._serialize_value(v) for v in value]
        elif isinstance(value, dict):
            return {k: self._serialize_value(v) for k, v in value.items()}
        else:
            return str(value)


def setup_logging(
    log_level: str = "INFO",
    environment: str = "development",
    enable_console: bool = True
) -> None:
    """
    Setup logging configuration for the application
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        environment: Environment name (development, staging, production)
        enable_console: Whether to output to console (useful for development)
    """
    
    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Console handler with JSON formatting
    if enable_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(CloudWatchFormatter())
        root_logger.addHandler(console_handler)
    
    # Application logger
    app_logger = logging.getLogger("smart_network")
    app_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Log startup info
    app_logger.info(
        "logging_initialized",
        extra={
            "event": "logging_initialized",
            "environment": environment,
            "log_level": log_level,
            "formatter": "CloudWatchFormatter",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    )
    
    # Reduce noise from other libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("neo4j").setLevel(logging.WARNING)


def get_log_level_from_env() -> str:
    """Get log level from environment variable"""
    return os.getenv("LOG_LEVEL", "INFO").upper()


def get_environment_from_env() -> str:
    """Get environment from environment variable"""
    return os.getenv("ENVIRONMENT", "development").lower()


# Example CloudWatch Logs Insights queries for common use cases
CLOUDWATCH_QUERIES = {
    "request_performance": """
        fields @timestamp, request_id, session_id, duration_ms, status_code, path
        | filter event = "request_completed"
        | sort duration_ms desc
        | limit 100
    """,
    
    "error_summary": """
        fields @timestamp, request_id, session_id, error_type, error_message, path
        | filter event = "error_occurred" or event = "request_failed"
        | stats count() by error_type, path
    """,
    
    "user_sessions": """
        fields @timestamp, session_id, path, duration_ms
        | filter event = "request_completed"
        | stats count() as request_count, avg(duration_ms) as avg_duration by session_id
        | sort request_count desc
    """,
    
    "filter_operations": """
        fields @timestamp, request_id, session_id, filters_applied, result_count, duration_ms
        | filter event = "filter_operation"
        | sort @timestamp desc
    """,
    
    "graph_queries": """
        fields @timestamp, request_id, region, node_count, edge_count, duration_ms, render_mode
        | filter event = "graph_query"
        | stats avg(duration_ms) as avg_duration, avg(node_count) as avg_nodes by region, render_mode
    """,
    
    "cache_efficiency": """
        fields @timestamp, operation, cache_key
        | filter event = "cache_operation"
        | stats count() by operation
    """,
    
    "export_operations": """
        fields @timestamp, request_id, export_format, row_count, duration_ms, success
        | filter event = "export_operation"
        | sort @timestamp desc
    """,
    
    "slow_requests": """
        fields @timestamp, request_id, path, duration_ms, node_count
        | filter event = "request_completed" and duration_ms > 2000
        | sort duration_ms desc
    """,
    
    "region_usage": """
        fields @timestamp, region, recommendations_mode
        | filter ispresent(region)
        | stats count() as requests by region, recommendations_mode
    """,
    
    "hourly_request_volume": """
        fields @timestamp, event
        | filter event = "request_started"
        | stats count() by bin(1h)
    """
}


# Grafana dashboard query examples
GRAFANA_QUERIES = {
    "request_rate": {
        "title": "Request Rate (req/min)",
        "query": 'fields @timestamp | filter event = "request_started" | stats count() by bin(1m)'
    },
    
    "error_rate": {
        "title": "Error Rate (%)",
        "query": '''
            fields @timestamp, event, status_code
            | stats 
                sum(case when status_code >= 400 then 1 else 0 end) as errors,
                count() as total
            by bin(5m)
            | fields (errors / total * 100) as error_rate
        '''
    },
    
    "p95_latency": {
        "title": "P95 Latency (ms)",
        "query": '''
            fields @timestamp, duration_ms
            | filter event = "request_completed"
            | stats pct(duration_ms, 95) as p95 by bin(5m)
        '''
    },
    
    "cache_hit_rate": {
        "title": "Cache Hit Rate (%)",
        "query": '''
            fields @timestamp, operation
            | filter event = "cache_operation"
            | stats 
                sum(case when operation = "hit" then 1 else 0 end) as hits,
                count() as total
            by bin(5m)
            | fields (hits / total * 100) as hit_rate
        '''
    },
    
    "top_regions": {
        "title": "Top Regions by Usage",
        "query": 'fields region | filter ispresent(region) | stats count() as requests by region'
    }
}
