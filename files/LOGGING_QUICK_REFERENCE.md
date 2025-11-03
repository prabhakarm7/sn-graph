# Logging Quick Reference Card

## 🎯 Quick Start

### Backend (Python)
```python
from app.middleware.logging_middleware import api_logger
from fastapi import Request
import time

@router.post("/endpoint")
async def my_endpoint(request: Request):
    start_time = time.time()
    
    try:
        # Log user action
        api_logger.log_user_action(
            request=request,
            action="action_name",
            target="target_resource"
        )
        
        # Your code...
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
        api_logger.log_error(
            request=request,
            error_type="operation_failed",
            error_message=str(e)
        )
        raise
```

### Frontend (TypeScript)
```typescript
import { useFrontendLogger } from '../services/FrontendLogger';

function MyComponent() {
  const logger = useFrontendLogger();
  
  const handleClick = () => {
    logger.logUserAction(
      'button_clicked',
      'MyComponent',
      { button: 'submit' }
    );
  };
  
  return <button onClick={handleClick}>Submit</button>;
}
```

---

## 📊 Common Logging Patterns

### 1. Log Filter Operation
```python
api_logger.log_filter_operation(
    request=request,
    operation="apply_filters",
    filters={"consultantIds": ["C1", "C2"]},
    result_count=45,
    duration_ms=123.4
)
```

### 2. Log Graph Query
```python
api_logger.log_graph_query(
    request=request,
    query_type="filtered",
    node_count=35,
    edge_count=67,
    duration_ms=842.3,
    cache_hit=False
)
```

### 3. Log Cache Operation
```python
api_logger.log_cache_operation(
    request=request,
    operation="hit",  # or "miss", "set", "invalidate"
    cache_key="NORTH_false"
)
```

### 4. Log Export
```python
api_logger.log_export_operation(
    request=request,
    export_format="excel",
    row_count=234,
    duration_ms=1543.2,
    success=True
)
```

### 5. Log Custom Event
```python
api_logger.log_event(
    "custom_event_name",
    level="info",  # debug, info, warning, error
    request=request,
    custom_field_1="value1",
    custom_field_2=123
)
```

---

## 🔍 Essential CloudWatch Queries

### Track Specific Request
```sql
fields @timestamp, event, duration_ms
| filter request_id = "YOUR_REQUEST_ID"
| sort @timestamp asc
```

### Track User Session
```sql
fields @timestamp, event, user_action, path
| filter session_id = "YOUR_SESSION_ID"
| sort @timestamp asc
```

### Find Errors
```sql
fields @timestamp, error_type, error_message, region
| filter event in ["error_occurred", "request_failed"]
| sort @timestamp desc
| limit 50
```

### Slow Requests
```sql
fields @timestamp, path, duration_ms, node_count
| filter event = "request_completed" and duration_ms > 2000
| sort duration_ms desc
```

### Cache Efficiency
```sql
fields operation
| filter event = "cache_operation"
| stats count() by operation
```

### Request Volume
```sql
fields @timestamp
| filter event = "request_started"
| stats count() as requests by bin(5m)
```

---

## 🎨 Log Structure

Every log entry includes:
```json
{
  "timestamp": "2025-11-03T10:15:30Z",
  "level": "INFO",
  "event": "event_name",
  "request_id": "uuid",
  "session_id": "session_xyz",
  "region": "NORTH",
  "recommendations_mode": false,
  "custom_fields": "..."
}
```

---

## 🚀 Performance Tips

1. **Use appropriate log levels**
   - DEBUG: Detailed debugging info
   - INFO: User actions, milestones
   - WARNING: Unexpected but handled
   - ERROR: Failures requiring attention

2. **Batch frontend logs**
   - Default: flush every 10 seconds
   - Or when queue reaches 50 events

3. **Include context**
   - Always pass `request` object
   - Add relevant metadata
   - Use consistent event names

4. **Don't log sensitive data**
   - No passwords, tokens, or PII
   - Sanitize user input in logs

---

## 🎯 Key Metrics to Track

| Metric | Query |
|--------|-------|
| Request Rate | `stats count() by bin(1m)` |
| Error Rate | `stats sum(errors)/count() * 100` |
| P95 Latency | `stats pct(duration_ms, 95)` |
| Cache Hit Rate | `stats sum(hits)/count() * 100` |
| Active Sessions | `stats dc(session_id)` |

---

## 📱 Frontend Events

```typescript
// User Action
logger.logUserAction('button_clicked', 'ComponentName', metadata)

// Page View
logger.logPageView('dashboard', metadata)

// Performance
logger.logPerformance('data_load', durationMs, metadata)

// Error
logger.logError(error, 'ComponentName', metadata)

// Filter Operation
logger.logFilterOperation('apply', ['filter1', 'filter2'], metadata)

// Graph Interaction
logger.logGraphInteraction('node_clicked', nodeId, metadata)

// API Call
logger.logApiCall(endpoint, method, durationMs, success, metadata)
```

---

## 🔧 Environment Variables

```bash
# Required
LOG_LEVEL=INFO
ENVIRONMENT=production

# Optional
ENABLE_CONSOLE_LOGGING=true
LOG_JSON_FORMAT=true
```

---

## 🎓 Complete Request Example

```
# Frontend initiates action
→ session_started (frontend)
→ user_action: "apply_filters" (frontend)
→ api_call: POST /filtered (frontend)

# Backend processes request
→ request_started (backend)
→ filter_operation (backend)
→ graph_query (backend)
→ request_completed (backend)

# Frontend receives response
→ performance_metric: "data_received" (frontend)
→ user_action: "view_graph" (frontend)
```

Track entire flow:
```sql
fields @timestamp, event, source
| filter request_id = "REQUEST_ID" or session_id = "SESSION_ID"
| sort @timestamp asc
```

---

## 📞 Need Help?

- Check main guide: `LOGGING_IMPLEMENTATION_GUIDE.md`
- CloudWatch Logs Insights: AWS Console → CloudWatch → Logs Insights
- Grafana Dashboards: Your Grafana instance
- Backend logs: `app/middleware/logging_middleware.py`
- Frontend logger: `services/FrontendLogger.ts`

---

## ✅ Checklist

Before deploying:
- [ ] Middleware added to FastAPI app
- [ ] Logging config imported in main.py
- [ ] Environment variables set
- [ ] Frontend logger initialized
- [ ] Session IDs working end-to-end
- [ ] CloudWatch log group created
- [ ] IAM permissions configured
- [ ] Test queries working
- [ ] Grafana dashboards set up
- [ ] Alerts configured
