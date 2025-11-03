# Smart Network Application - Comprehensive Logging Implementation Guide

## Overview

This document describes the complete logging strategy for the Smart Network application, enabling full request tracking, session identification, and performance monitoring through CloudWatch and Grafana.

---

## 🎯 Key Features

### Request Tracking
- **Unique Request IDs**: Every API request gets a UUID for end-to-end tracking
- **Session IDs**: User sessions tracked across multiple requests
- **Client IP & User Agent**: Captured for analytics and debugging
- **Request/Response Timing**: Accurate duration measurements

### Session Identification
- **Frontend Session Generation**: Created on first page load, persisted in sessionStorage
- **Cross-Request Tracking**: Session ID sent with all API calls via X-Session-ID header
- **Session Analytics**: Track user behavior patterns across multiple interactions

### Structured Logging
- **JSON Format**: All logs output as JSON for easy parsing
- **CloudWatch Compatible**: Ready for AWS CloudWatch Logs Insights
- **Grafana Ready**: Optimized for dashboard visualization
- **Contextual Data**: Every log includes request_id, session_id, region, mode, etc.

---

## 📁 File Structure

```
backend/
├── app/
│   ├── middleware/
│   │   └── logging_middleware.py       # Core logging middleware
│   ├── config/
│   │   └── logging_config.py           # CloudWatch formatter & setup
│   └── api/
│       └── complete_backend_router.py  # Router with integrated logging

frontend/
└── services/
    └── FrontendLogger.ts                # Client-side logging service
```

---

## 🚀 Implementation Steps

### Step 1: Backend Setup

#### 1.1 Update main.py

```python
# main.py
from app.config.logging_config import setup_logging, get_log_level_from_env, get_environment_from_env
from app.middleware.logging_middleware import RequestLoggingMiddleware

# Setup logging BEFORE creating FastAPI app
setup_logging(
    log_level=get_log_level_from_env(),
    environment=get_environment_from_env(),
    enable_console=True
)

# Create FastAPI app
app = FastAPI(...)

# Add logging middleware FIRST (before CORS)
app.add_middleware(RequestLoggingMiddleware)

# Then add CORS and other middleware
app.add_middleware(CORSMiddleware, ...)
```

#### 1.2 Environment Variables

Add to your `.env` file:

```bash
# Logging Configuration
LOG_LEVEL=INFO                    # DEBUG, INFO, WARNING, ERROR, CRITICAL
ENVIRONMENT=production            # development, staging, production
```

#### 1.3 Update Your Routers

Replace your existing routers with the logged versions:

```python
# Import structured logger
from app.middleware.logging_middleware import api_logger

# In your route handlers
@router.get("/some-endpoint")
async def some_endpoint(request: Request):
    start_time = time.time()
    
    try:
        # Log user action
        api_logger.log_user_action(
            request=request,
            action="endpoint_called",
            target="some_endpoint"
        )
        
        # Your business logic here
        result = do_something()
        
        # Log success
        duration_ms = (time.time() - start_time) * 1000
        api_logger.log_performance_milestone(
            request=request,
            milestone="operation_completed",
            duration_ms=duration_ms
        )
        
        return result
        
    except Exception as e:
        # Log error
        api_logger.log_error(
            request=request,
            error_type="operation_failed",
            error_message=str(e)
        )
        raise
```

---

### Step 2: Frontend Setup

#### 2.1 Initialize Logger

```typescript
// App.tsx or _app.tsx
import { frontendLogger } from './services/FrontendLogger';

function App() {
  useEffect(() => {
    // Log app initialization
    frontendLogger.logPageView('app_initialized', {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      user_agent: navigator.userAgent
    });
    
    return () => {
      // Cleanup on unmount
      frontendLogger.shutdown();
    };
  }, []);
  
  // ... rest of your app
}
```

#### 2.2 Log User Actions

```typescript
// In your components
import { useFrontendLogger } from '../services/FrontendLogger';

function FilterPanel() {
  const logger = useFrontendLogger();
  
  const handleApplyFilters = (filters: FilterCriteria) => {
    // Log the action
    logger.logFilterOperation(
      'apply',
      Object.keys(filters),
      {
        region: currentRegion,
        recommendations_mode: recommendationsMode
      }
    );
    
    // Apply filters...
  };
  
  const handleButtonClick = () => {
    logger.logUserAction(
      'button_clicked',
      'FilterPanel',
      { button: 'apply_filters' }
    );
  };
}
```

#### 2.3 Track API Calls

```typescript
// SimplifiedApiService.ts
import { frontendLogger } from './FrontendLogger';

async getRegionData(region: string, filters: FilterCriteria) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(/* ... */);
    const duration = Date.now() - startTime;
    
    // Log successful API call
    frontendLogger.logApiCall(
      `/api/v1/complete/region/${region}`,
      'GET',
      duration,
      true,
      { filter_count: Object.keys(filters).length }
    );
    
    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log failed API call
    frontendLogger.logApiCall(
      `/api/v1/complete/region/${region}`,
      'GET',
      duration,
      false,
      { error: error.message }
    );
    
    throw error;
  }
}
```

---

## 📊 Log Event Types

### Backend Events

| Event Name | Description | Key Fields |
|------------|-------------|------------|
| `request_started` | HTTP request received | method, path, query_params |
| `request_completed` | Request successfully processed | status_code, duration_ms |
| `request_failed` | Request failed with error | error_type, error_message, stack_trace |
| `filter_operation` | Filters applied to data | filters_applied, result_count |
| `graph_query` | Graph data queried | node_count, edge_count, render_mode |
| `cache_operation` | Cache hit/miss/set | operation, cache_key |
| `export_operation` | Data export performed | export_format, row_count |
| `user_action` | User interaction logged | action, target |
| `performance_milestone` | Performance checkpoint | milestone, duration_ms |
| `error_occurred` | Application error | error_type, recoverable |

### Frontend Events

| Event Name | Description | Key Fields |
|------------|-------------|------------|
| `session_started` | User session began | user_agent, viewport |
| `session_ended` | User session ended | duration_ms |
| `page_view` | Page/view loaded | page |
| `user_action` | User clicked/interacted | user_action, component |
| `filter_operation` | Filter applied/cleared | operation, filter_types |
| `graph_interaction` | Graph node clicked | interaction, node_id |
| `api_call` | API request made | endpoint, duration_ms, success |
| `performance_metric` | Performance measured | metric, duration_ms |
| `error` | Frontend error occurred | error_message, component |

---

## 🔍 CloudWatch Logs Insights Queries

### Track Complete Request Flow

```sql
-- Follow a specific request through the system
fields @timestamp, event, message, duration_ms, status_code
| filter request_id = "your-request-id-here"
| sort @timestamp asc
```

### Track User Session

```sql
-- See all actions in a user session
fields @timestamp, event, user_action, path, duration_ms
| filter session_id = "your-session-id-here"
| sort @timestamp asc
```

### Find Slow Requests

```sql
-- Requests taking longer than 2 seconds
fields @timestamp, request_id, session_id, path, duration_ms, node_count
| filter event = "request_completed" and duration_ms > 2000
| sort duration_ms desc
| limit 50
```

### Error Analysis

```sql
-- Group errors by type and region
fields @timestamp, error_type, error_message, region
| filter event in ["error_occurred", "request_failed"]
| stats count() as error_count by error_type, region
| sort error_count desc
```

### Filter Performance

```sql
-- Analyze filter operation performance
fields @timestamp, request_id, filters_applied, result_count, duration_ms
| filter event = "filter_operation"
| stats avg(duration_ms) as avg_duration, avg(result_count) as avg_results by bin(5m)
```

### Cache Efficiency

```sql
-- Calculate cache hit rate
fields @timestamp, operation
| filter event = "cache_operation"
| stats 
    sum(case when operation = "hit" then 1 else 0 end) as hits,
    sum(case when operation = "miss" then 1 else 0 end) as misses
by bin(5m)
| fields (hits / (hits + misses) * 100) as hit_rate_percent, hits, misses
```

### User Behavior Patterns

```sql
-- Most common user actions
fields user_action, component
| filter event = "user_action"
| stats count() as action_count by user_action, component
| sort action_count desc
| limit 20
```

### Regional Usage

```sql
-- Requests by region and mode
fields @timestamp, region, recommendations_mode
| filter ispresent(region)
| stats count() as requests, avg(duration_ms) as avg_duration 
    by region, recommendations_mode
| sort requests desc
```

---

## 📈 Grafana Dashboard Setup

### Dashboard Panels

#### 1. Request Rate
```sql
fields @timestamp
| filter event = "request_started"
| stats count() as requests by bin(1m)
```

#### 2. Error Rate
```sql
fields @timestamp, event
| stats 
    sum(case when event = "request_failed" then 1 else 0 end) as errors,
    count() as total
by bin(5m)
| fields (errors / total * 100) as error_rate
```

#### 3. P95 Latency
```sql
fields @timestamp, duration_ms
| filter event = "request_completed"
| stats pct(duration_ms, 95) as p95_latency by bin(5m)
```

#### 4. Cache Hit Rate
```sql
fields @timestamp, operation
| filter event = "cache_operation"
| stats 
    sum(case when operation = "hit" then 1 else 0 end) as hits,
    count() as total
by bin(5m)
| fields (hits / total * 100) as cache_hit_rate
```

#### 5. Active Sessions
```sql
fields @timestamp, session_id
| filter event in ["session_started", "request_started"]
| stats dc(session_id) as active_sessions by bin(5m)
```

#### 6. Graph Operations
```sql
fields @timestamp, node_count, render_mode
| filter event = "graph_query"
| stats 
    count() as queries,
    avg(node_count) as avg_nodes
by render_mode, bin(5m)
```

---

## 🎓 Usage Examples

### Example 1: Track Filter Application

**Backend logs:**
```json
{
  "timestamp": "2025-11-03T10:15:30Z",
  "event": "user_action",
  "request_id": "abc-123-def",
  "session_id": "session_xyz",
  "action": "apply_filters",
  "region": "NORTH",
  "recommendations_mode": false,
  "metadata": {
    "filter_types": ["consultantIds", "ratings"],
    "filter_count": 2
  }
}

{
  "timestamp": "2025-11-03T10:15:31Z",
  "event": "filter_operation",
  "request_id": "abc-123-def",
  "session_id": "session_xyz",
  "operation": "apply_filters",
  "filters_applied": ["consultantIds", "ratings"],
  "result_count": 35,
  "duration_ms": 842.3
}

{
  "timestamp": "2025-11-03T10:15:31Z",
  "event": "graph_query",
  "request_id": "abc-123-def",
  "session_id": "session_xyz",
  "query_type": "filtered",
  "node_count": 35,
  "edge_count": 67,
  "duration_ms": 842.3,
  "cache_hit": false
}
```

**To track this request in CloudWatch:**
```sql
fields @timestamp, event, duration_ms, result_count
| filter request_id = "abc-123-def"
| sort @timestamp asc
```

### Example 2: Identify Failing Operations

**Find sessions with errors:**
```sql
-- Sessions that encountered errors
fields session_id, error_type, error_message, @timestamp
| filter event = "error_occurred"
| stats count() as error_count by session_id
| sort error_count desc
```

**Analyze specific failed session:**
```sql
-- Full timeline of a problematic session
fields @timestamp, event, user_action, error_message, duration_ms
| filter session_id = "problem-session-id"
| sort @timestamp asc
```

### Example 3: Performance Optimization

**Find slowest operations:**
```sql
-- Operations sorted by duration
fields @timestamp, request_id, event, duration_ms, node_count, path
| filter ispresent(duration_ms) and duration_ms > 1000
| sort duration_ms desc
| limit 20
```

**Correlate with node counts:**
```sql
-- Check if node count correlates with slow performance
fields node_count, duration_ms
| filter event = "graph_query"
| stats avg(duration_ms) as avg_duration, count() as query_count 
    by bin(node_count, 10)
| sort node_count asc
```

---

## 🔧 Configuration & Tuning

### Log Levels

```python
# Development
LOG_LEVEL=DEBUG

# Staging
LOG_LEVEL=INFO

# Production
LOG_LEVEL=INFO  # or WARNING for less verbosity
```

### Frontend Log Batching

Adjust batching parameters in FrontendLogger.ts:

```typescript
private flushInterval: number = 10000;  // Flush every 10 seconds
private maxQueueSize: number = 50;      // Max 50 events before force flush
```

### CloudWatch Log Retention

Set appropriate retention in AWS:
- **Development**: 7 days
- **Staging**: 30 days
- **Production**: 90+ days

---

## 🎯 Success Metrics

### Key Performance Indicators

1. **Request Traceability**: 100% of requests have unique IDs
2. **Session Tracking**: All user sessions identified and traceable
3. **Error Detection**: All errors logged with context
4. **Performance Visibility**: All operations timed and measured
5. **Cache Efficiency**: Cache hit rate tracked and optimized

### Monitoring Alerts

Set up CloudWatch Alarms for:
- Error rate > 5%
- P95 latency > 3 seconds
- Cache hit rate < 50%
- Failed exports > 10% of attempts

---

## 📝 Best Practices

1. **Always include request context** in service layer logs
2. **Use structured fields** instead of string interpolation
3. **Log at appropriate levels**: DEBUG for dev, INFO for user actions, ERROR for failures
4. **Include duration measurements** for all operations
5. **Don't log sensitive data**: passwords, tokens, PII
6. **Use consistent event names** across frontend and backend
7. **Add metadata** for debugging context
8. **Test log queries** before deploying to production

---

## 🚨 Troubleshooting

### Logs Not Appearing in CloudWatch

- Check IAM permissions for CloudWatch Logs
- Verify log group exists and retention is set
- Ensure application has correct AWS credentials
- Check LOG_LEVEL is not set too high (e.g., ERROR only)

### Session IDs Not Matching

- Verify X-Session-ID header is sent from frontend
- Check CORS allows X-Session-ID header
- Ensure sessionStorage is available in browser

### Performance Issues with Logging

- Increase frontend batch size/interval
- Use async logging in Python (structured logging)
- Consider sampling high-volume events

---

## 📚 Additional Resources

- [AWS CloudWatch Logs Insights Query Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)
- [Grafana CloudWatch Data Source](https://grafana.com/docs/grafana/latest/datasources/cloudwatch/)
- [Python Structured Logging Best Practices](https://docs.python.org/3/howto/logging.html)

---

## 🎉 Summary

This logging implementation provides:

✅ **Complete Request Tracing**: Follow any request from frontend to backend  
✅ **Session Analytics**: Understand user behavior patterns  
✅ **Performance Monitoring**: Identify bottlenecks and optimize  
✅ **Error Tracking**: Quickly identify and diagnose issues  
✅ **CloudWatch/Grafana Ready**: Structured logs for easy querying  
✅ **Production Ready**: Scalable, performant, and maintainable

With this setup, you'll have full visibility into your Smart Network application's behavior, enabling data-driven decisions and rapid troubleshooting.
