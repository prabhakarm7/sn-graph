# services/memory_filter_cache.py
import time
import threading
from typing import Dict, Any, Optional, Set, List
from datetime import datetime, timedelta
import json
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class CacheEntry:
    """Cache entry with metadata."""
    data: Dict[str, Any]
    created_at: float
    expires_at: float
    access_count: int = 0
    last_accessed: float = 0
    region: str = ""
    recommendations_mode: bool = False
    
    def is_expired(self) -> bool:
        return time.time() > self.expires_at
    
    def touch(self):
        """Update access statistics."""
        self.access_count += 1
        self.last_accessed = time.time()

class MemoryFilterCache:
    """Production-ready memory cache for filter options."""
    
    def __init__(self, default_ttl: int = 3600, max_entries: int = 100, cleanup_interval: int = 300):
        self.cache: Dict[str, CacheEntry] = {}
        self.default_ttl = default_ttl
        self.max_entries = max_entries
        self.cleanup_interval = cleanup_interval
        
        # Thread safety
        self._lock = threading.RLock()
        
        # Statistics
        self.stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "evictions": 0,
            "expirations": 0,
            "last_cleanup": time.time()
        }
        
        # Background cleanup
        self._cleanup_timer = None
        self._start_cleanup_timer()
    
    def _generate_cache_key(self, region: str, recommendations_mode: bool) -> str:
        """Generate consistent cache key."""
        return f"filter_options:{region.upper()}:{recommendations_mode}"
    
    def _start_cleanup_timer(self):
        """Start background cleanup timer."""
        if self._cleanup_timer:
            self._cleanup_timer.cancel()
        
        self._cleanup_timer = threading.Timer(self.cleanup_interval, self._background_cleanup)
        self._cleanup_timer.daemon = True
        self._cleanup_timer.start()
    
    def _background_cleanup(self):
        """Background cleanup of expired entries."""
        try:
            with self._lock:
                expired_keys = [key for key, entry in self.cache.items() if entry.is_expired()]
                
                for key in expired_keys:
                    del self.cache[key]
                    self.stats["expirations"] += 1
                
                self.stats["last_cleanup"] = time.time()
                
                if expired_keys:
                    logger.info(f"Memory cache: cleaned up {len(expired_keys)} expired entries")
                
        except Exception as e:
            logger.error(f"Memory cache cleanup error: {e}")
        finally:
            # Restart timer
            self._start_cleanup_timer()
    
    def _evict_lru_entries(self, target_count: int = None):
        """Evict least recently used entries."""
        if not target_count:
            target_count = max(1, len(self.cache) // 4)  # Remove 25%
        
        # Sort by last accessed time (LRU first)
        sorted_entries = sorted(
            self.cache.items(), 
            key=lambda item: item[1].last_accessed
        )
        
        keys_to_evict = [key for key, _ in sorted_entries[:target_count]]
        
        for key in keys_to_evict:
            del self.cache[key]
            self.stats["evictions"] += 1
        
        logger.info(f"Memory cache: evicted {len(keys_to_evict)} LRU entries")
        return len(keys_to_evict)
    
    def get(self, region: str, recommendations_mode: bool) -> Optional[Dict[str, Any]]:
        """Get cached filter options."""
        cache_key = self._generate_cache_key(region, recommendations_mode)
        
        with self._lock:
            if cache_key in self.cache:
                entry = self.cache[cache_key]
                
                if not entry.is_expired():
                    entry.touch()
                    self.stats["hits"] += 1
                    logger.debug(f"Memory cache HIT: {cache_key}")
                    return entry.data.copy()  # Return copy to prevent mutations
                else:
                    # Remove expired entry
                    del self.cache[cache_key]
                    self.stats["expirations"] += 1
            
            self.stats["misses"] += 1
            logger.debug(f"Memory cache MISS: {cache_key}")
            return None
    
    def set(
        self, 
        region: str, 
        recommendations_mode: bool, 
        filter_options: Dict[str, Any], 
        ttl: Optional[int] = None
    ) -> bool:
        """Cache filter options."""
        cache_key = self._generate_cache_key(region, recommendations_mode)
        ttl = ttl or self.default_ttl
        current_time = time.time()
        
        with self._lock:
            # Check if we need to evict entries
            if len(self.cache) >= self.max_entries:
                self._evict_lru_entries()
            
            # Create cache entry
            entry = CacheEntry(
                data=filter_options.copy(),  # Store copy to prevent mutations
                created_at=current_time,
                expires_at=current_time + ttl,
                region=region.upper(),
                recommendations_mode=recommendations_mode,
                last_accessed=current_time
            )
            
            self.cache[cache_key] = entry
            self.stats["sets"] += 1
            
            logger.info(f"Memory cache SET: {cache_key}, TTL: {ttl}s")
            return True
    
    def invalidate_region(self, region: str) -> int:
        """Invalidate all cache entries for a specific region."""
        region = region.upper()
        
        with self._lock:
            keys_to_remove = [
                key for key, entry in self.cache.items() 
                if entry.region == region
            ]
            
            for key in keys_to_remove:
                del self.cache[key]
            
            logger.info(f"Memory cache: invalidated {len(keys_to_remove)} entries for region {region}")
            return len(keys_to_remove)
    
    def invalidate_all(self) -> int:
        """Clear all cache entries."""
        with self._lock:
            count = len(self.cache)
            self.cache.clear()
            logger.info(f"Memory cache: cleared all {count} entries")
            return count
    
    def get_regions(self) -> Set[str]:
        """Get list of cached regions."""
        with self._lock:
            return {entry.region for entry in self.cache.values()}
    
    def get_comprehensive_stats(self) -> Dict[str, Any]:
        """Get detailed cache statistics."""
        with self._lock:
            current_time = time.time()
            
            # Calculate hit rate
            total_requests = self.stats["hits"] + self.stats["misses"]
            hit_rate = (self.stats["hits"] / total_requests * 100) if total_requests > 0 else 0
            
            # Memory usage estimation
            estimated_memory = 0
            entry_details = []
            
            for key, entry in self.cache.items():
                entry_size = len(str(entry.data))
                estimated_memory += entry_size
                
                entry_details.append({
                    "key": key,
                    "region": entry.region,
                    "recommendations_mode": entry.recommendations_mode,
                    "size_bytes": entry_size,
                    "age_seconds": int(current_time - entry.created_at),
                    "ttl_remaining": max(0, int(entry.expires_at - current_time)),
                    "access_count": entry.access_count,
                    "last_accessed_ago": int(current_time - entry.last_accessed) if entry.last_accessed else None
                })
            
            return {
                "performance_metrics": {
                    "total_entries": len(self.cache),
                    "max_entries": self.max_entries,
                    "utilization_percent": round((len(self.cache) / self.max_entries) * 100, 1),
                    "hit_rate_percent": round(hit_rate, 1),
                    "total_requests": total_requests
                },
                "operation_counts": self.stats.copy(),
                "memory_usage": {
                    "estimated_total_bytes": estimated_memory,
                    "estimated_total_kb": round(estimated_memory / 1024, 2),
                    "estimated_total_mb": round(estimated_memory / (1024 * 1024), 2),
                    "average_entry_size_bytes": round(estimated_memory / len(self.cache)) if self.cache else 0
                },
                "cache_health": {
                    "cleanup_interval_seconds": self.cleanup_interval,
                    "last_cleanup_ago": int(current_time - self.stats["last_cleanup"]),
                    "default_ttl_seconds": self.default_ttl,
                    "regions_cached": list(self.get_regions())
                },
                "entry_details": entry_details[:10],  # Limit to first 10 for readability
                "recommendations": self._get_performance_recommendations()
            }
    
    def _get_performance_recommendations(self) -> List[str]:
        """Generate performance recommendations."""
        recommendations = []
        
        total_requests = self.stats["hits"] + self.stats["misses"]
        hit_rate = (self.stats["hits"] / total_requests * 100) if total_requests > 0 else 0
        
        if hit_rate < 50:
            recommendations.append("Low hit rate - consider increasing TTL or checking cache key consistency")
        
        if len(self.cache) > self.max_entries * 0.8:
            recommendations.append("Cache utilization high - consider increasing max_entries")
        
        if self.stats["evictions"] > self.stats["hits"] * 0.1:
            recommendations.append("High eviction rate - consider increasing cache size or reducing TTL")
        
        if not recommendations:
            recommendations.append("Cache performance is optimal")
        
        return recommendations
    
    def cleanup(self):
        """Manual cleanup and resource disposal."""
        if self._cleanup_timer:
            self._cleanup_timer.cancel()
        
        with self._lock:
            self.cache.clear()
        
        logger.info("Memory cache cleaned up and disposed")

# Global instance
memory_filter_cache = MemoryFilterCache(default_ttl=3600, max_entries=50, cleanup_interval=300)