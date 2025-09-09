# config/async_config_additions.py
"""
Additional configuration settings for async concurrent processing.
Add these to your existing config.py file.
"""

# Async Database Configuration
ASYNC_NEO4J_CONFIG = {
    "max_connection_pool_size": 30,  # Increased from default 10
    "connection_acquisition_timeout": 30,  # 30 second timeout
    "max_transaction_retry_time": 15,  # 15 second retry timeout
    "connection_timeout": 30,  # 30 second connection timeout
    "max_connection_lifetime": 3600,  # 1 hour max connection lifetime
}

# Concurrency Control Settings
CONCURRENCY_CONFIG = {
    "max_concurrent_db_operations": 15,  # Semaphore limit
    "thread_pool_max_workers": 10,  # CPU-intensive task workers
    "max_concurrent_users_supported": 50,  # Target concurrent user support
    "request_timeout_seconds": 120,  # 2 minute request timeout
}

# Memory Cache Configuration (enhanced)
ENHANCED_CACHE_CONFIG = {
    "default_ttl": 3600,  # 1 hour default TTL
    "max_entries": 100,  # Maximum cache entries
    "cleanup_interval": 300,  # 5 minute cleanup interval
    "warmup_regions_on_startup": True,  # Auto-warmup during startup
    "warmup_max_regions": 3,  # Max regions to warmup during startup
}

# Performance Monitoring
PERFORMANCE_CONFIG = {
    "enable_request_tracking": True,  # Track active requests
    "log_slow_queries": True,  # Log queries taking > 1 second
    "slow_query_threshold_ms": 1000,  # 1 second threshold
    "enable_performance_metrics": True,  # Collect detailed metrics
}

# Production Uvicorn Settings
PRODUCTION_UVICORN_CONFIG = {
    "workers": 1,  # Single worker with async is optimal
    "loop": "asyncio",  # Use asyncio event loop
    "access_log": False,  # Disable for better performance
    "limit_concurrency": 100,  # Max concurrent requests
    "limit_max_requests": 10000,  # Restart after 10k requests
    "timeout_keep_alive": 30,  # Keep connections alive 30s
    "h11_max_incomplete_event_size": 16384,  # Handle larger requests
}

# Error Handling Configuration
ERROR_HANDLING_CONFIG = {
    "max_retries": 3,  # Max retries for failed operations
    "retry_delay_seconds": 1,  # Delay between retries
    "circuit_breaker_threshold": 5,  # Failures before circuit opens
    "circuit_breaker_timeout": 60,  # Circuit breaker timeout
}

# Logging Configuration for Concurrent Processing
CONCURRENT_LOGGING_CONFIG = {
    "log_active_requests": True,  # Log current active request count
    "log_cache_hit_miss": True,  # Log cache performance
    "log_database_pool_usage": True,  # Log connection pool stats
    "log_thread_pool_usage": True,  # Log thread pool usage
    "performance_log_interval": 300,  # Log performance stats every 5 minutes
}

# Health Check Configuration
HEALTH_CHECK_CONFIG = {
    "include_concurrent_metrics": True,  # Include concurrency stats in health
    "test_database_on_health_check": True,  # Test DB connection
    "test_cache_on_health_check": True,  # Test cache operations
    "health_check_timeout_seconds": 10,  # Health check timeout
}

# Development vs Production Settings
ENVIRONMENT_SETTINGS = {
    "development": {
        "enable_reload": True,
        "log_level": "DEBUG",
        "max_concurrent_db_operations": 5,  # Lower for development
        "thread_pool_max_workers": 3,
    },
    "production": {
        "enable_reload": False,
        "log_level": "INFO", 
        "max_concurrent_db_operations": 15,
        "thread_pool_max_workers": 10,
        "enable_performance_monitoring": True,
    }
}
