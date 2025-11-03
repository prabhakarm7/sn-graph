// services/FrontendLogger.ts - Client-side logging with session tracking
/**
 * Frontend logging service that tracks user actions and sends to backend
 * Maintains session context for complete request tracking
 */

export interface LogEvent {
  event: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  timestamp: number;
  session_id: string;
  user_action?: string;
  component?: string;
  metadata?: Record<string, any>;
}

export class FrontendLogger {
  private static instance: FrontendLogger;
  private sessionId: string;
  private baseUrl: string;
  private eventQueue: LogEvent[] = [];
  private flushInterval: number = 10000; // Flush every 10 seconds
  private maxQueueSize: number = 50;
  private flushTimer?: NodeJS.Timeout;
  
  private constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    this.startFlushTimer();
    
    // Log session start
    this.logEvent('session_started', 'info', {
      user_agent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: Date.now()
    });
    
    // Send session ID with all API requests
    this.attachSessionIdToRequests();
  }
  
  static getInstance(): FrontendLogger {
    if (!FrontendLogger.instance) {
      FrontendLogger.instance = new FrontendLogger();
    }
    return FrontendLogger.instance;
  }
  
  /**
   * Get or create session ID - persisted in sessionStorage
   */
  private getOrCreateSessionId(): string {
    try {
      const existingId = sessionStorage.getItem('session_id');
      if (existingId) {
        return existingId;
      }
      
      const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', newId);
      return newId;
    } catch {
      // Fallback if sessionStorage not available
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }
  
  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
  
  /**
   * Attach session ID to all fetch requests
   */
  private attachSessionIdToRequests(): void {
    // Monkey-patch fetch to add session ID header
    const originalFetch = window.fetch;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers || {});
      headers.set('X-Session-ID', this.sessionId);
      
      return originalFetch(input, {
        ...init,
        headers
      });
    };
  }
  
  /**
   * Log a user action
   */
  logUserAction(
    action: string,
    component: string,
    metadata?: Record<string, any>
  ): void {
    this.logEvent('user_action', 'info', {
      user_action: action,
      component,
      ...metadata
    });
  }
  
  /**
   * Log a page view
   */
  logPageView(page: string, metadata?: Record<string, any>): void {
    this.logEvent('page_view', 'info', {
      page,
      ...metadata
    });
  }
  
  /**
   * Log a performance metric
   */
  logPerformance(
    metric: string,
    duration_ms: number,
    metadata?: Record<string, any>
  ): void {
    this.logEvent('performance_metric', 'info', {
      metric,
      duration_ms,
      ...metadata
    });
  }
  
  /**
   * Log an error
   */
  logError(
    error: Error | string,
    component?: string,
    metadata?: Record<string, any>
  ): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    this.logEvent('error', 'error', {
      error_message: errorMessage,
      error_stack: errorStack,
      component,
      ...metadata
    });
  }
  
  /**
   * Log a filter operation
   */
  logFilterOperation(
    operation: 'apply' | 'clear' | 'reset',
    filterTypes: string[],
    metadata?: Record<string, any>
  ): void {
    this.logEvent('filter_operation', 'info', {
      operation,
      filter_types: filterTypes,
      filter_count: filterTypes.length,
      ...metadata
    });
  }
  
  /**
   * Log a graph interaction
   */
  logGraphInteraction(
    interaction: string,
    nodeId?: string,
    metadata?: Record<string, any>
  ): void {
    this.logEvent('graph_interaction', 'info', {
      interaction,
      node_id: nodeId,
      ...metadata
    });
  }
  
  /**
   * Log an API call
   */
  logApiCall(
    endpoint: string,
    method: string,
    duration_ms: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    this.logEvent('api_call', success ? 'info' : 'error', {
      endpoint,
      method,
      duration_ms,
      success,
      ...metadata
    });
  }
  
  /**
   * Core logging method
   */
  private logEvent(
    event: string,
    level: LogEvent['level'],
    metadata?: Record<string, any>
  ): void {
    const logEvent: LogEvent = {
      event,
      level,
      timestamp: Date.now(),
      session_id: this.sessionId,
      metadata
    };
    
    // Add to queue
    this.eventQueue.push(logEvent);
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level.toUpperCase()}] ${event}:`, metadata);
    }
    
    // Flush if queue is full
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.flush();
    }
  }
  
  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }
  
  /**
   * Flush queued events to backend
   */
  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      await fetch(`${this.baseUrl}/api/v1/logs/frontend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId
        },
        body: JSON.stringify({
          session_id: this.sessionId,
          events: eventsToSend
        })
      });
    } catch (error) {
      // Re-queue events on failure
      this.eventQueue = [...eventsToSend, ...this.eventQueue];
      console.error('Failed to flush logs:', error);
    }
  }
  
  /**
   * Force flush and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Final flush
    await this.flush();
    
    this.logEvent('session_ended', 'info', {
      duration_ms: Date.now() - parseInt(this.sessionId.split('_')[1])
    });
    
    await this.flush();
  }
}

// Global instance
export const frontendLogger = FrontendLogger.getInstance();

// React hook for easy component usage
export const useFrontendLogger = () => {
  const logger = FrontendLogger.getInstance();
  
  return {
    logUserAction: logger.logUserAction.bind(logger),
    logPageView: logger.logPageView.bind(logger),
    logPerformance: logger.logPerformance.bind(logger),
    logError: logger.logError.bind(logger),
    logFilterOperation: logger.logFilterOperation.bind(logger),
    logGraphInteraction: logger.logGraphInteraction.bind(logger),
    logApiCall: logger.logApiCall.bind(logger),
    getSessionId: logger.getSessionId.bind(logger)
  };
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    frontendLogger.shutdown();
  });
}
