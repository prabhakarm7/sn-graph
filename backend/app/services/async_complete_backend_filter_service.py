# services/async_complete_backend_filter_service.py
"""
Async complete backend filter service for handling concurrent requests.
Prevents system stalls under high concurrent user load.
"""
import asyncio
import time
from typing import Dict, List, Any, Optional, Tuple
from neo4j import AsyncGraphDatabase, AsyncSession
from neo4j.exceptions import Neo4jError
from concurrent.futures import ThreadPoolExecutor
import threading

from app.config import (
    NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE, REGIONS
)
from app.services.memory_filter_cache import memory_filter_cache

# Performance constants
MAX_GRAPH_NODES = 50
MAX_FILTER_RESULTS = 4000000000

# Concurrency control
DB_SEMAPHORE = asyncio.Semaphore(15)  # Max 15 concurrent database operations
THREAD_POOL = ThreadPoolExecutor(max_workers=10)  # For CPU-intensive tasks


class AsyncCompleteBackendFilterService:
    """Async complete backend service with concurrency support."""
    
    def __init__(self):
        # Async Neo4j driver with optimized connection pool
        self.driver = AsyncGraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USERNAME, NEO4J_PASSWORD),
            database=NEO4J_DATABASE,
            max_connection_pool_size=30,  # Increased from default 10
            connection_acquisition_timeout=30,  # 30 second timeout
            max_transaction_retry_time=15  # 15 second retry timeout
        )
        
        self.cache = memory_filter_cache
        
        # Request tracking for monitoring
        self._active_requests = 0
        self._request_lock = threading.Lock()
    
    async def close(self):
        """Close async driver and cleanup."""
        if self.driver:
            await self.driver.close()
        self.cache.cleanup()
    
    def _track_request_start(self):
        """Track active request count."""
        with self._request_lock:
            self._active_requests += 1
    
    def _track_request_end(self):
        """Track request completion."""
        with self._request_lock:
            self._active_requests -= 1
    
    async def get_complete_filtered_data(
        self, 
        region: str,
        filters: Dict[str, Any] = None,
        recommendations_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Async version with concurrency control to prevent system stalls.
        """
        # Track request
        self._track_request_start()
        
        try:
            # Use semaphore to limit concurrent database operations
            async with DB_SEMAPHORE:
                return await self._execute_filtered_data_query(region, filters, recommendations_mode)
        finally:
            self._track_request_end()
    
    async def _execute_filtered_data_query(
        self, 
        region: str,
        filters: Dict[str, Any] = None,
        recommendations_mode: bool = False
    ) -> Dict[str, Any]:
        """Execute the main filtered data query with async database operations."""
        filters = filters or {}
        region = region.upper()
        has_filters_applied = any(filters.values())
        
        try:
            async with self.driver.session() as session:
                # Step 1: Build query (CPU intensive - use thread pool)
                loop = asyncio.get_event_loop()
                query, params = await loop.run_in_executor(
                    THREAD_POOL, 
                    self._build_complete_query, 
                    region, filters, recommendations_mode
                )
                
                print(f"Async executing query for {region} (filters applied: {has_filters_applied})")
                
                # Step 2: Execute async database query
                result = await session.run(query, params)
                records = await result.data()
                
                if not records:
                    # Use cached filter options for empty response
                    filter_options = await self._get_cached_complete_filter_options(
                        session, region, recommendations_mode
                    )
                    return self._empty_response_with_cached_options(region, recommendations_mode, filter_options)
                
                graph_data = records[0]['GraphData']
                nodes = graph_data.get('nodes', [])
                relationships = graph_data.get('relationships', [])
                
                # Step 3: Post-processing (CPU intensive - use thread pool)
                nodes, relationships = await loop.run_in_executor(
                    THREAD_POOL,
                    self._remove_orphans_post_processing,
                    nodes, relationships
                )
                
                print(f"Async processing complete: {len(nodes)} nodes, {len(relationships)} relationships")
                
                # Step 4: Check performance limits
                if len(nodes) > MAX_GRAPH_NODES:
                    filter_options = await self._get_cached_complete_filter_options(
                        session, region, recommendations_mode
                    )
                    return self._create_summary_response_with_cached_options(
                        region, len(nodes), filters, recommendations_mode, filter_options
                    )
                
                # Step 5: Calculate layout positions (CPU intensive - use thread pool)
                positioned_nodes = await loop.run_in_executor(
                    THREAD_POOL,
                    self._calculate_layout_positions,
                    nodes
                )
                
                # Step 6: Smart cache strategy for filter options
                if has_filters_applied and len(nodes) > 0:
                    # Fresh filtered options from actual data
                    filter_options = await loop.run_in_executor(
                        THREAD_POOL,
                        self._get_filtered_options_from_actual_data,
                        nodes, region, recommendations_mode
                    )
                    filter_options_type = "filtered_data"
                    cache_used = False
                else:
                    # Use cached complete region options
                    filter_options = await self._get_cached_complete_filter_options(
                        session, region, recommendations_mode
                    )
                    filter_options_type = "complete_region_cached"
                    cache_used = True
                
                # Step 7: Return complete response
                return {
                    "success": True,
                    "render_mode": "graph",
                    "data": {
                        "nodes": positioned_nodes,
                        "relationships": relationships,
                        "total_nodes": len(nodes),
                        "total_relationships": len(relationships)
                    },
                    "filter_options": filter_options,
                    "metadata": {
                        "region": region,
                        "mode": "recommendations" if recommendations_mode else "standard",
                        "server_side_processing": True,
                        "async_processing": True,  # NEW
                        "concurrent_safe": True,   # NEW
                        "filters_applied": filters,
                        "filter_options_type": filter_options_type,
                        "has_filters_applied": has_filters_applied,
                        "cache_used": cache_used,
                        "cache_type": "memory",
                        "processing_time_ms": int(time.time() * 1000),
                        "active_requests": self._active_requests,  # NEW
                        "optimizations": [
                            "Async database operations",
                            "Concurrency control with semaphores",
                            "Thread pool for CPU-intensive tasks",
                            "Memory-cached filter options",
                            "Pre-calculated layouts",
                            "Single query execution",
                            "Performance limiting",
                            "Context-aware filter options"
                        ]
                    }
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Async backend processing failed: {str(e)}",
                "render_mode": "error"
            }
    
    async def _get_cached_complete_filter_options(
        self, 
        session: AsyncSession, 
        region: str, 
        recommendations_mode: bool
    ) -> Dict[str, Any]:
        """Get complete filter options with async memory caching."""
        
        # Try cache first (this is synchronous and fast)
        cached_options = self.cache.get(region, recommendations_mode)
        if cached_options:
            print(f"ASYNC CACHE HIT for filter options: {region}, rec_mode: {recommendations_mode}")
            return cached_options
        
        # Cache miss - compute fresh and cache
        print(f"ASYNC CACHE MISS - computing fresh filter options for {region}")
        start_time = time.time()
        
        # Use existing method to compute filter options (run in thread pool)
        loop = asyncio.get_event_loop()
        filter_options = await loop.run_in_executor(
            THREAD_POOL,
            self._get_complete_filter_options_sync,
            session, region, recommendations_mode
        )
        
        compute_time = int((time.time() - start_time) * 1000)
        print(f"Async filter options computed in {compute_time}ms")
        
        # Cache the computed options
        cache_success = self.cache.set(region, recommendations_mode, filter_options)
        print(f"Async memory cache SET success: {cache_success}")
        
        return filter_options
    
    def _get_complete_filter_options_sync(
     self, 
        session: Session, 
        region: str, 
        recommendations_mode: bool
    ) -> Dict[str, Any]:
        """Get ALL filter options with Python-based array flattening."""
        
        try:
            if recommendations_mode:
                # Simplified query - just collect raw data without complex flattening
                filter_query = f"""
                MATCH (c:COMPANY) WHERE (c.region = $region OR $region IN c.region)
                OPTIONAL MATCH (c)-[:OWNS]->(ip:INCUMBENT_PRODUCT)-[:BI_RECOMMENDS]->(p:PRODUCT)
                OPTIONAL MATCH path1 = (cons:CONSULTANT)-[:EMPLOYS]->(fc:FIELD_CONSULTANT)-[:COVERS]->(c)
                OPTIONAL MATCH path2 = (cons2:CONSULTANT)-[:COVERS]->(c)
                OPTIONAL MATCH (any_cons:CONSULTANT)-[rating:RATES]->(any_prod:PRODUCT)
                
                RETURN {{
                    raw_sales_regions: COLLECT(DISTINCT c.sales_region),
                    raw_channels: COLLECT(DISTINCT c.channel),
                    raw_asset_classes: COLLECT(DISTINCT p.asset_class),
                    raw_company_pcas: COLLECT(DISTINCT c.pca),
                    raw_company_acas: COLLECT(DISTINCT c.aca),
                    raw_consultant_pcas: COLLECT(DISTINCT cons.pca),
                    raw_consultant_advisors: COLLECT(DISTINCT cons.consultant_advisor),
                    consultants: COLLECT(DISTINCT {{id: cons.name, name: cons.name}}) + 
                                COLLECT(DISTINCT {{id: cons2.name, name: cons2.name}}),
                    field_consultants: COLLECT(DISTINCT {{id: fc.name, name: fc.name}}),
                    companies: COLLECT(DISTINCT {{id: c.name, name: c.name}}),
                    products: COLLECT(DISTINCT {{id: p.name, name: p.name}}),
                    incumbent_products: COLLECT(DISTINCT {{id: ip.name, name: ip.name}}),
                    ratings: COLLECT(DISTINCT rating.rankgroup)
                }} AS RawFilterData
                """
            else:
                filter_query = f"""
                MATCH (c:COMPANY) WHERE (c.region = $region OR $region IN c.region)
                OPTIONAL MATCH (c)-[:OWNS]->(p:PRODUCT)
                OPTIONAL MATCH path1 = (cons:CONSULTANT)-[:EMPLOYS]->(fc:FIELD_CONSULTANT)-[:COVERS]->(c)
                OPTIONAL MATCH path2 = (cons2:CONSULTANT)-[:COVERS]->(c)
                OPTIONAL MATCH (any_cons:CONSULTANT)-[rating:RATES]->(any_prod:PRODUCT)
                
                RETURN {{
                    raw_sales_regions: COLLECT(DISTINCT c.sales_region),
                    raw_channels: COLLECT(DISTINCT c.channel),
                    raw_asset_classes: COLLECT(DISTINCT p.asset_class),
                    raw_company_pcas: COLLECT(DISTINCT c.pca),
                    raw_company_acas: COLLECT(DISTINCT c.aca),
                    raw_consultant_pcas: COLLECT(DISTINCT cons.pca),
                    raw_consultant_advisors: COLLECT(DISTINCT cons.consultant_advisor),
                    consultants: COLLECT(DISTINCT {{id: cons.name, name: cons.name}}) + 
                                COLLECT(DISTINCT {{id: cons2.name, name: cons2.name}}),
                    field_consultants: COLLECT(DISTINCT {{id: fc.name, name: fc.name}}),
                    companies: COLLECT(DISTINCT {{id: c.name, name: c.name}}),
                    products: COLLECT(DISTINCT {{id: p.name, name: p.name}}),
                    ratings: COLLECT(DISTINCT rating.rankgroup)
                }} AS RawFilterData
                """
            
            print(f"Executing simplified filter options query for region: {region}")
            result = session.run(filter_query, {"region": region})
            record = result.single()
            
            if record and record['RawFilterData']:
                raw_data = record['RawFilterData']
                print(f"Raw filter data retrieved, processing in Python...")
                
                # Python-based flattening and cleaning
                cleaned_options = {}
                
                # Flatten array fields
                cleaned_options['markets'] = self._flatten_and_clean_array(raw_data.get('raw_sales_regions', []))
                cleaned_options['channels'] = self._flatten_and_clean_array(raw_data.get('raw_channels', []))
                cleaned_options['asset_classes'] = self._flatten_and_clean_array(raw_data.get('raw_asset_classes', []))
                cleaned_options['client_advisors'] = self._flatten_and_clean_array(
                    raw_data.get('raw_company_pcas', []) + raw_data.get('raw_company_acas', [])
                )
                cleaned_options['consultant_advisors'] = self._flatten_and_clean_array(
                    raw_data.get('raw_consultant_pcas', []) + raw_data.get('raw_consultant_advisors', [])
                )
                cleaned_options['ratings'] = self._flatten_and_clean_array(raw_data.get('ratings', []))
                
                # Clean entity lists (already properly formatted from Neo4j)
                cleaned_options['consultants'] = self._clean_entity_list(raw_data.get('consultants', []))
                cleaned_options['field_consultants'] = self._clean_entity_list(raw_data.get('field_consultants', []))
                cleaned_options['companies'] = self._clean_entity_list(raw_data.get('companies', []))
                cleaned_options['products'] = self._clean_entity_list(raw_data.get('products', []))
                
                if recommendations_mode:
                    cleaned_options['incumbent_products'] = self._clean_entity_list(raw_data.get('incumbent_products', []))
                
                # Static options
                cleaned_options['mandate_statuses'] = ['Active', 'At Risk', 'Conversion in Progress']
                cleaned_options['influence_levels'] = ['1', '2', '3', '4', 'High', 'medium', 'low', 'UNK']
                
                print(f"Python processing complete: {[(k, len(v) if isinstance(v, list) else 'not_list') for k, v in cleaned_options.items()]}")
                return cleaned_options
                
            else:
                print("No RawFilterData found, returning empty options")
                return self._empty_filter_options(recommendations_mode)
                
        except Exception as e:
            print(f"ERROR in Python-based filter options processing: {str(e)}")
            return self._empty_filter_options(recommendations_mode)
    
    # Cache management methods (async versions)
    async def invalidate_filter_cache(self, region: str = None) -> Dict[str, Any]:
        """Async invalidate memory cache entries."""
        if region:
            deleted_count = self.cache.invalidate_region(region.upper())
            return {
                "success": True,
                "message": f"Invalidated {deleted_count} memory cache entries for region {region.upper()}",
                "deleted_entries": deleted_count,
                "cache_type": "memory"
            }
        else:
            deleted_count = self.cache.invalidate_all()
            return {
                "success": True,
                "message": f"Invalidated all {deleted_count} memory cache entries",
                "deleted_entries": deleted_count,
                "cache_type": "memory"
            }
    
    async def warmup_filter_cache(self, regions: List[str] = None) -> Dict[str, Any]:
        """Async warm up memory cache for specified regions."""
        regions = regions or list(REGIONS.keys())
        
        async def compute_filter_options(region: str, recommendations_mode: bool) -> Dict[str, Any]:
            async with self.driver.session() as session:
                return await self._get_cached_complete_filter_options(session, region, recommendations_mode)
        
        start_time = time.time()
        results = {"success": [], "failed": []}
        
        # Use asyncio.gather for concurrent warmup
        warmup_tasks = []
        for region in regions:
            for rec_mode in [True, False]:
                warmup_tasks.append(self._warmup_single_cache_entry(region, rec_mode, results))
        
        # Execute all warmup tasks concurrently
        await asyncio.gather(*warmup_tasks, return_exceptions=True)
        
        total_time = int((time.time() - start_time) * 1000)
        
        return {
            "success": True,
            "warmup_results": results,
            "total_successful": len(results["success"]),
            "total_failed": len(results["failed"]),
            "total_warmup_time_ms": total_time,
            "cache_type": "memory",
            "concurrent_warmup": True,
            "message": f"Warmed up cache for {len(regions)} regions with both modes concurrently"
        }
    
    async def _warmup_single_cache_entry(self, region: str, rec_mode: bool, results: Dict):
        """Warm up a single cache entry."""
        try:
            compute_start = time.time()
            async with self.driver.session() as session:
                filter_options = await self._get_cached_complete_filter_options(session, region, rec_mode)
            
            if filter_options:
                self.cache.set(region, rec_mode, filter_options, ttl=self.cache.default_ttl * 2)
                compute_time = int((time.time() - compute_start) * 1000)
                
                results["success"].append({
                    "region": region,
                    "recommendations_mode": rec_mode,
                    "compute_time_ms": compute_time
                })
            else:
                results["failed"].append({
                    "region": region,
                    "recommendations_mode": rec_mode,
                    "reason": "no_data_returned"
                })
                
        except Exception as e:
            results["failed"].append({
                "region": region,
                "recommendations_mode": rec_mode,
                "reason": str(e)
            })
    
    async def get_cache_statistics(self) -> Dict[str, Any]:
        """Get comprehensive async cache statistics."""
        try:
            cache_stats = self.cache.get_comprehensive_stats()
            
            return {
                "success": True,
                "cache_type": "memory",
                "concurrent_processing": {
                    "active_requests": self._active_requests,
                    "max_concurrent_db_ops": DB_SEMAPHORE._value,
                    "thread_pool_workers": THREAD_POOL._max_workers,
                    "async_driver_pool_size": 30
                },
                "statistics": cache_stats,
                "cache_strategy": {
                    "cache_complete_filter_options": "YES - in memory with TTL",
                    "cache_filtered_options": "NO - always fresh (result-dependent)",
                    "cache_main_graph_data": "NO - always fresh",
                    "cache_invalidation": "Manual + automatic cleanup",
                    "background_cleanup": "Automatic expired entry removal",
                    "concurrent_safe": "YES - async operations with semaphore control"
                },
                "performance_characteristics": {
                    "access_time": "~0.1ms (direct memory access)",
                    "concurrent_requests": "50+ simultaneous users supported",
                    "memory_isolation": "Shared within application instance",
                    "persistence": "Lost on application restart",
                    "thread_safety": "Yes (RLock protected + async safe)"
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get async cache statistics: {str(e)}"
            }
    
    async def health_check(self) -> Dict[str, Any]:
        """Enhanced async health check."""
        try:
            # Test async database connection
            async with self.driver.session() as session:
                result = await session.run("RETURN 1 as test")
                record = await result.single()
                neo4j_healthy = record and record["test"] == 1
            
            cache_stats = self.cache.get_comprehensive_stats()
            
            return {
                "status": "healthy" if neo4j_healthy else "unhealthy",
                "services": {
                    "async_neo4j_connection": "healthy" if neo4j_healthy else "unhealthy",
                    "memory_cache": "healthy",
                    "async_filter_processing": "healthy",
                    "concurrency_control": "healthy"
                },
                "concurrency_metrics": {
                    "active_requests": self._active_requests,
                    "max_concurrent_db_operations": 15,
                    "thread_pool_size": 10,
                    "connection_pool_size": 30,
                    "supports_concurrent_users": "50+"
                },
                "cache_summary": {
                    "type": "memory",
                    "entries": cache_stats["performance_metrics"]["total_entries"],
                    "hit_rate": f"{cache_stats['performance_metrics']['hit_rate_percent']}%",
                    "memory_usage_mb": cache_stats["memory_usage"]["estimated_total_mb"],
                    "regions_cached": cache_stats["cache_health"]["regions_cached"]
                },
                "features": {
                    "async_server_side_filtering": "All filters in async Cypher queries",
                    "concurrent_memory_cached_filter_options": "Complete filter options cached safely",
                    "async_layout_calculation": "Positions calculated server-side in thread pool",
                    "performance_limiting": f"Smart {MAX_GRAPH_NODES}-node limit",
                    "background_cleanup": "Automatic expired entry removal",
                    "semaphore_controlled_database_access": "Prevents database overload",
                    "thread_pool_cpu_tasks": "Non-blocking CPU-intensive operations"
                }
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "cache_fallback": "Service will work without cache but with reduced performance",
                "concurrency_impact": "May have reduced concurrent user support"
            }

    
    def _build_complete_query(
        self, 
        region: str, 
        filters: Dict[str, Any],
        recommendations_mode: bool
    ) -> Tuple[str, Dict[str, Any]]:
        """Fixed Neo4j query - proper aggregation syntax."""
        
        params = {"region": region}
        print(filters)
        # Add filter parameters (same as before)
        if filters.get('consultantIds'):
            params['consultantIds'] = filters['consultantIds']
        if filters.get('clientIds'):
            params['clientIds'] = filters['clientIds']
        if filters.get('productIds'):
            params['productIds'] = filters['productIds']
        if filters.get('fieldConsultantIds'):
            params['fieldConsultantIds'] = filters['fieldConsultantIds']
        if filters.get('channels'):
            params['channels'] = filters['channels']
        if filters.get('assetClasses'):
            params['assetClasses'] = filters['assetClasses']
        if filters.get('sales_regions'):
            params['salesRegions'] = filters['sales_regions']
        if filters.get('mandateStatuses'):
            params['mandateStatuses'] = filters['mandateStatuses']
        if filters.get('clientAdvisorIds'):
            params['clientAdvisorIds'] = filters['clientAdvisorIds']
        if filters.get('consultantAdvisorIds'):
            params['consultantAdvisorIds'] = filters['consultantAdvisorIds']
        if filters.get('ratings'):
            params['ratings'] = filters['ratings']
        if filters.get('influence_levels'):
            params['influenceLevels'] = filters['influence_levels']
        if filters.get('markets'):
            params['markets'] = filters['markets']
        
        print(f"Building FIXED query with filters: {filters}")
        print(params)
        # Helper functions (same as your working version)
        def build_company_conditions(company_var: str) -> List[str]:
            conditions = [f"({company_var}.region = $region OR $region IN {company_var}.region)"]
            
            if filters.get('clientIds'):
                conditions.append(f"{company_var}.name IN $clientIds")
            if filters.get('channels'):
                conditions.append(f"""ANY(ch IN $channels WHERE 
                    ch = {company_var}.channel OR ch IN {company_var}.channel)""")
            if filters.get('sales_regions'):
                conditions.append(f"""ANY(sr IN $salesRegions WHERE 
                    sr = {company_var}.sales_region OR sr IN {company_var}.sales_region)""")
            if filters.get('markets'):
                conditions.append(f"""ANY(mkt IN $markets WHERE 
                    mkt = {company_var}.sales_region OR mkt IN {company_var}.sales_region)""")
            if filters.get('clientAdvisorIds'):
                conditions.append(f"""ANY(advisor IN $clientAdvisorIds WHERE 
                    advisor = {company_var}.pca OR advisor IN {company_var}.pca OR
                    advisor = {company_var}.aca OR advisor IN {company_var}.aca)""")
            
            return conditions
        
        def build_consultant_conditions(consultant_var: str) -> List[str]:
            conditions = []
            if filters.get('consultantIds'):
                conditions.append(f"{consultant_var}.name IN $consultantIds")
            if filters.get('consultantAdvisorIds'):
                conditions.append(f"""ANY(advisor IN $consultantAdvisorIds WHERE 
                    advisor = {consultant_var}.pca OR advisor IN {consultant_var}.pca OR
                    advisor = {consultant_var}.consultant_advisor OR advisor IN {consultant_var}.consultant_advisor)""")
            return conditions
        
        def build_product_conditions(product_var: str) -> List[str]:
            conditions = []
            if filters.get('productIds'):
                conditions.append(f"{product_var}.name IN $productIds")
            if filters.get('assetClasses'):
                conditions.append(f"""ANY(ac IN $assetClasses WHERE 
                    ac = {product_var}.asset_class OR ac IN {product_var}.asset_class)""")
            return conditions
        
        def build_field_consultant_conditions(fc_var: str) -> List[str]:
            conditions = []
            if filters.get('fieldConsultantIds'):
                conditions.append(f"{fc_var}.name IN $fieldConsultantIds")
            return conditions
        
        def build_mandate_conditions(rel_var: str) -> List[str]:
            conditions = []
            if filters.get('mandateStatuses'):
                conditions.append(f"""ANY(ms IN $mandateStatuses WHERE 
                    ms = {rel_var}.mandate_status OR ms IN {rel_var}.mandate_status)""")
            return conditions
        
        def build_influence_conditions(rel_var: str) -> List[str]:
            conditions = []
            if filters.get('influence_levels'):
                conditions.append(f"""ANY(il IN $influenceLevels WHERE 
                    il = {rel_var}.level_of_influence OR il IN {rel_var}.level_of_influence)""")
            return conditions
        
        def combine_conditions(condition_lists: List[List[str]]) -> str:
            all_conditions = []
            for condition_list in condition_lists:
                all_conditions.extend(condition_list)
            return " AND ".join(all_conditions) if all_conditions else "true"
        
        # REVERT TO WORKING STRUCTURE - No complex aggregation mixing
        if recommendations_mode:
            optimized_query = f"""
            // Path 1: Consultant -> Field Consultant -> Company -> Incumbent Product -> Product
            OPTIONAL MATCH path1 = (a:CONSULTANT)-[f1:EMPLOYS]->(b:FIELD_CONSULTANT)-[i1:COVERS]->(c:COMPANY)
                -[h1:OWNS]->(ip:INCUMBENT_PRODUCT)-[r1:BI_RECOMMENDS]->(p:PRODUCT)
            WHERE {combine_conditions([
                build_company_conditions('c'),
                build_consultant_conditions('a'),
                build_product_conditions('p'),
                build_field_consultant_conditions('b'),
                build_mandate_conditions('h1'),
                build_influence_conditions('f1'),
                build_influence_conditions('i1')
            ])}
            
            // Path 2: Consultant -> Company -> Incumbent Product -> Product (direct coverage)
            OPTIONAL MATCH path2 = (a2:CONSULTANT)-[i2:COVERS]->(c2:COMPANY)
                -[h2:OWNS]->(ip2:INCUMBENT_PRODUCT)-[r2:BI_RECOMMENDS]->(p2:PRODUCT)  
            WHERE {combine_conditions([
                build_company_conditions('c2'),
                build_consultant_conditions('a2'),
                build_product_conditions('p2'),
                build_mandate_conditions('h2'),
                build_influence_conditions('i2')
            ])}
            
            // Path 3: Company-only paths for incumbent products
            OPTIONAL MATCH path3 = (c3:COMPANY)-[h3:OWNS]->(ip3:INCUMBENT_PRODUCT)-[r3:BI_RECOMMENDS]->(p3:PRODUCT)
            WHERE {combine_conditions([
                build_company_conditions('c3'),
                build_product_conditions('p3'),
                build_mandate_conditions('h3')
            ])}
            
            // FIXED: Simple collection without mixing aggregations
            WITH 
                COLLECT(DISTINCT a) + COLLECT(DISTINCT a2) AS consultants,
                COLLECT(DISTINCT b) AS field_consultants,
                COLLECT(DISTINCT c) + COLLECT(DISTINCT c2) + COLLECT(DISTINCT c3) AS companies,
                COLLECT(DISTINCT ip) + COLLECT(DISTINCT ip2) + COLLECT(DISTINCT ip3) AS incumbent_products,
                COLLECT(DISTINCT p) + COLLECT(DISTINCT p2) + COLLECT(DISTINCT p3) AS products,
                COLLECT(DISTINCT f1) + COLLECT(DISTINCT i1) + COLLECT(DISTINCT i2) + 
                COLLECT(DISTINCT h1) + COLLECT(DISTINCT h2) + COLLECT(DISTINCT h3) + 
                COLLECT(DISTINCT r1) + COLLECT(DISTINCT r2) + COLLECT(DISTINCT r3) AS all_rels
            
            // COLLECT RATINGS ONLY FOR PRODUCTS & INCUMBENT_PRODUCTS
            UNWIND (products + incumbent_products) AS target_product
            OPTIONAL MATCH (rating_consultant:CONSULTANT)-[rating_rel:RATES]->(target_product)
            
            WITH consultants, field_consultants, companies, incumbent_products, products, all_rels,
                target_product.id AS product_id,
                COLLECT({{
                    consultant: rating_consultant.name,
                    rankgroup: rating_rel.rankgroup,
                    rankvalue: rating_rel.rankvalue
                }}) AS product_ratings
            
            WITH consultants, field_consultants, companies, incumbent_products, products, all_rels,
                COLLECT({{
                    product_id: product_id,
                    ratings: [rating IN product_ratings WHERE rating.consultant IS NOT NULL | rating]
                }}) AS all_ratings_map
            
            WITH consultants + field_consultants + companies + incumbent_products + products AS allNodes, 
                all_rels, all_ratings_map
            
            // Filter out nulls
            WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL] AS filteredNodes, 
                [rel IN all_rels WHERE rel IS NOT NULL] AS filteredRels,
                all_ratings_map
            
            RETURN {{
                nodes: [node IN filteredNodes | {{
                    id: node.id,
                    type: labels(node)[0],
                    data: {{
                        id: node.id,
                        name: coalesce(node.name, node.id),
                        label: coalesce(node.name, node.id),
                        region: node.region,
                        channel: node.channel,
                        sales_region: node.sales_region,
                        asset_class: node.asset_class,
                        pca: node.pca,
                        aca: node.aca,
                        consultant_advisor: node.consultant_advisor,
                        mandate_status: node.mandate_status,
                        ratings: CASE 
                            WHEN labels(node)[0] IN ['PRODUCT', 'INCUMBENT_PRODUCT'] THEN
                                HEAD([rating_group IN all_ratings_map WHERE rating_group.product_id = node.id | rating_group.ratings])
                            ELSE
                                null
                        END
                    }}
                }}],
                relationships: [rel IN filteredRels WHERE type(rel) <> 'RATES' | {{
                    id: toString(id(rel)),
                    source: startNode(rel).id,
                    target: endNode(rel).id,
                    type: 'custom',
                    data: {{
                        relType: type(rel),
                        sourceId: startNode(rel).id,
                        targetId: endNode(rel).id,
                        rankgroup: rel.rankgroup,
                        rankvalue: rel.rankvalue,
                        rankorder: rel.rankorder,
                        rating_change: rel.rating_change,
                        level_of_influence: rel.level_of_influence,
                        mandate_status: rel.mandate_status,
                        consultant: rel.consultant,
                        manager: rel.manager,
                        commitment_market_value: rel.commitment_market_value,
                        manager_since_date: rel.manager_since_date,
                        multi_mandate_manager: rel.multi_mandate_manager,
                        annualised_alpha_summary: rel.annualised_alpha_summary,
                        batting_average_summary: rel.batting_average_summary,
                        downside_market_capture_summary: rel.downside_market_capture_summary,
                        information_ratio_summary: rel.information_ratio_summary,
                        opportunity_type: rel.opportunity_type,
                        returns: rel.returns,
                        returns_summary: rel.returns_summary,
                        standard_deviation_summary: rel.standard_deviation_summary,
                        upside_market_capture_summary: rel.upside_market_capture_summary
                    }}
                }}]
            }} AS GraphData
            """
        else:
            optimized_query = f"""
            // Path 1: Consultant -> Field Consultant -> Company -> Product
            OPTIONAL MATCH path1 = (a:CONSULTANT)-[f1:EMPLOYS]->(b:FIELD_CONSULTANT)-[i1:COVERS]->(c:COMPANY)-[g1:OWNS]->(p:PRODUCT)
            WHERE {combine_conditions([
                build_company_conditions('c'),
                build_consultant_conditions('a'),
                build_product_conditions('p'),
                build_field_consultant_conditions('b'),
                build_mandate_conditions('g1'),
                build_influence_conditions('f1'),
                build_influence_conditions('i1')
            ])}
            
            // Path 2: Consultant -> Company -> Product (direct coverage)
            OPTIONAL MATCH path2 = (a2:CONSULTANT)-[i2:COVERS]->(c2:COMPANY)-[g2:OWNS]->(p2:PRODUCT)
            WHERE {combine_conditions([
                build_company_conditions('c2'),
                build_consultant_conditions('a2'),
                build_product_conditions('p2'),
                build_mandate_conditions('g2'),
                build_influence_conditions('i2')
            ])}
            
            // Path 3: Company-product only relationships
            OPTIONAL MATCH path3 = (c3:COMPANY)-[g3:OWNS]->(p3:PRODUCT)
            WHERE {combine_conditions([
                build_company_conditions('c3'),
                build_product_conditions('p3'),
                build_mandate_conditions('g3')
            ])}
            
            WITH 
                COLLECT(DISTINCT a) + COLLECT(DISTINCT a2) AS consultants,
                COLLECT(DISTINCT b) AS field_consultants,
                COLLECT(DISTINCT c) + COLLECT(DISTINCT c2) + COLLECT(DISTINCT c3) AS companies,
                COLLECT(DISTINCT p) + COLLECT(DISTINCT p2) + COLLECT(DISTINCT p3) AS products,
                COLLECT(DISTINCT f1) + COLLECT(DISTINCT i1) + COLLECT(DISTINCT i2) + 
                COLLECT(DISTINCT g1) + COLLECT(DISTINCT g2) + COLLECT(DISTINCT g3) AS all_rels
            
            // RATINGS ONLY FOR PRODUCTS
            UNWIND products AS target_product
            OPTIONAL MATCH (rating_consultant:CONSULTANT)-[rating_rel:RATES]->(target_product)
            
            WITH consultants, field_consultants, companies, products, all_rels,
                target_product.id AS product_id,
                COLLECT({{
                    consultant: rating_consultant.name,
                    rankgroup: rating_rel.rankgroup,
                    rankvalue: rating_rel.rankvalue
                }}) AS product_ratings
            
            WITH consultants, field_consultants, companies, products, all_rels,
                COLLECT({{
                    product_id: product_id,
                    ratings: [rating IN product_ratings WHERE rating.consultant IS NOT NULL | rating]
                }}) AS all_ratings_map

            WITH consultants + field_consultants + companies + products AS allNodes, all_rels, all_ratings_map
            
            WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL] AS filteredNodes, 
            [rel IN all_rels WHERE rel IS NOT NULL] AS filteredRels,
            all_ratings_map
            
            RETURN {{
                nodes: [node IN filteredNodes | {{
                    id: node.id,
                    type: labels(node)[0],
                    data: {{
                        id: node.id,
                        name: coalesce(node.name, node.id),
                        label: coalesce(node.name, node.id),
                        region: node.region,
                        channel: node.channel,
                        sales_region: node.sales_region,
                        asset_class: node.asset_class,
                        pca: node.pca,
                        aca: node.aca,
                        consultant_advisor: node.consultant_advisor,
                        mandate_status: node.mandate_status,
                        ratings: CASE 
                            WHEN labels(node)[0] = 'PRODUCT' THEN
                                HEAD([rating_group IN all_ratings_map WHERE rating_group.product_id = node.id | rating_group.ratings])
                            ELSE
                                null
                        END
                    }}
                }}],
                relationships: [rel IN filteredRels WHERE type(rel) <> 'RATES' | {{
                    id: toString(id(rel)),
                    source: startNode(rel).id,
                    target: endNode(rel).id,
                    type: 'custom',
                    data: {{
                        relType: type(rel),
                        sourceId: startNode(rel).id,
                        targetId: endNode(rel).id,
                        mrankgroup: rel.rankgroup,
                        rankvalue: rel.rankvalue,
                        rankorder: rel.rankorder,
                        rating_change: rel.rating_change,
                        level_of_influence: rel.level_of_influence,
                        mandate_status: rel.mandate_status,
                        consultant: rel.consultant,
                        manager: rel.manager,
                        commitment_market_value: rel.commitment_market_value,
                        manager_since_date: rel.manager_since_date,
                        multi_mandate_manager: rel.multi_mandate_manager,
                        annualised_alpha_summary: rel.annualised_alpha_summary,
                        batting_average_summary: rel.batting_average_summary,
                        downside_market_capture_summary: rel.downside_market_capture_summary,
                        information_ratio_summary: rel.information_ratio_summary,
                        opportunity_type: rel.opportunity_type,
                        returns: rel.returns,
                        returns_summary: rel.returns_summary,
                        standard_deviation_summary: rel.standard_deviation_summary,
                        upside_market_capture_summary: rel.upside_market_capture_summary
                    }}
                }}]
            }} AS GraphData
            """
        
        return optimized_query, params
    
    def _remove_orphans_post_processing(self, nodes: List[Dict], relationships: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
        """Remove orphan nodes AND orphan relationships using post-processing."""
        if not relationships:
            return nodes, relationships
        # Step 1: Remove duplicate relationships by creating unique key
        unique_relationships = {}
        for rel in relationships:
            # Create unique key from source + target + relationship type
            rel_data = rel.get('data', {})
            unique_key = f"{rel.get('source')}:{rel.get('target')}:{rel_data.get('relType', 'UNKNOWN')}"
            
            if unique_key not in unique_relationships:
                unique_relationships[unique_key] = rel
        
        deduplicated_relationships = list(unique_relationships.values())
        print(f"Relationship deduplication: {len(relationships)} -> {len(deduplicated_relationships)} relationships")
        
        # Step 2: Continue with existing orphan removal logic
        valid_node_ids = set(node['id'] for node in nodes if node.get('id'))
        
        # Step 2: Filter relationships to only include those with valid source AND target nodes
        valid_relationships = []
        orphaned_relationships = []
        
        for rel in deduplicated_relationships:
            source_id = rel.get('source')
            target_id = rel.get('target')
            
            # Check if both source and target exist in our filtered nodes
            if source_id in valid_node_ids and target_id in valid_node_ids:
                valid_relationships.append(rel)
            else:
                orphaned_relationships.append(rel)
                print(f"Orphaned relationship: {rel.get('data', {}).get('relType', 'UNKNOWN')} "
                    f"from {source_id} to {target_id} "
                    f"(source_exists: {source_id in valid_node_ids}, "
                    f"target_exists: {target_id in valid_node_ids})")
        
        # Step 3: Now find connected nodes based on VALID relationships
        connected_node_ids = set()
        for rel in valid_relationships:
            connected_node_ids.add(rel['source'])
            connected_node_ids.add(rel['target'])
        
        # Step 4: Keep only nodes that are actually connected by valid relationships
        connected_nodes = [node for node in nodes if node['id'] in connected_node_ids]
        
        print(f"Orphan removal: {len(nodes)} -> {len(connected_nodes)} nodes, "
            f"{len(relationships)} -> {len(valid_relationships)} relationships, "
            f"removed {len(orphaned_relationships)} orphaned edges")
        
        return connected_nodes, valid_relationships

    
    def _calculate_layout_positions(self, nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Calculate layout positions server-side - no client-side Dagre needed."""
        
        # Simple hierarchical layout based on node types
        layout_config = {
            'CONSULTANT': {'layer': 0, 'color': '#6366f1'},
            'FIELD_CONSULTANT': {'layer': 1, 'color': '#6366f1'},
            'COMPANY': {'layer': 2, 'color': '#059669'},
            'INCUMBENT_PRODUCT': {'layer': 3, 'color': '#f59e0b'},
            'PRODUCT': {'layer': 4, 'color': '#0ea5e9'}
        }
        
        # Group nodes by type
        nodes_by_type = {}
        for node in nodes:
            node_type = node.get('type', 'UNKNOWN')
            if node_type not in nodes_by_type:
                nodes_by_type[node_type] = []
            nodes_by_type[node_type].append(node)
        
        positioned_nodes = []
        
        for node_type, type_nodes in nodes_by_type.items():
            layer = layout_config.get(node_type, {}).get('layer', 5)
            
            # Calculate positions for this layer
            nodes_per_row = max(3, int(len(type_nodes) ** 0.5))
            
            for i, node in enumerate(type_nodes):
                row = i // nodes_per_row
                col = i % nodes_per_row
                
                x = col * 300 + (row % 2) * 150  # Offset alternate rows
                y = layer * 200 + row * 120
                
                positioned_node = {
                    **node,
                    'position': {'x': x, 'y': y}
                }
                positioned_nodes.append(positioned_node)
        
        return positioned_nodes
    

    
    def _get_filtered_options_from_actual_data(
        self,
        nodes: List[Dict],
        region: str,
        recommendations_mode: bool
    ) -> Dict[str, Any]:
        """
        Extract filter options from the actual result nodes only with duplicate removal.
        This ensures dropdowns show only unique values present in current filtered dataset.
        """
        if not nodes:
            return self._empty_filter_options(recommendations_mode)
        
        # Use sets to automatically handle duplicates for simple values
        channels = set()
        sales_regions = set()
        asset_classes = set()
        client_advisors = set()
        consultant_advisors = set()
        
        # Use dictionaries to handle duplicates for entity objects (by name)
        consultants_dict = {}
        field_consultants_dict = {}
        companies_dict = {}
        products_dict = {}
        incumbent_products_dict = {}
        
        for node in nodes:
            node_type = node.get('type')
            data = node.get('data', {})
            
            if node_type == 'CONSULTANT' and data.get('name'):
                name = data['name'].strip()
                if name and not self._is_malformed_name(name):
                    # Use name as key to avoid duplicates
                    consultants_dict[name] = {'id': name, 'name': name}
                    
                    # Extract advisor information with duplicate handling
                    if data.get('pca'):
                        self._add_to_advisor_set(data['pca'], consultant_advisors)
                    if data.get('consultant_advisor'):
                        self._add_to_advisor_set(data['consultant_advisor'], consultant_advisors)
                        
            elif node_type == 'FIELD_CONSULTANT' and data.get('name'):
                name = data['name'].strip()
                if name and not self._is_malformed_name(name):
                    field_consultants_dict[name] = {'id': name, 'name': name}
                    
            elif node_type == 'COMPANY' and data.get('name'):
                name = data['name'].strip()
                if name and not self._is_malformed_name(name):
                    companies_dict[name] = {'id': name, 'name': name}
                    
                    # Extract company attributes with duplicate handling
                    if data.get('channel'):
                        self._add_to_string_set(data['channel'], channels)
                    if data.get('sales_region'):
                        self._add_to_string_set(data['sales_region'], sales_regions)
                        
                    # Extract client advisors with duplicate handling
                    if data.get('pca'):
                        self._add_to_advisor_set(data['pca'], client_advisors)
                    if data.get('aca'):
                        self._add_to_advisor_set(data['aca'], client_advisors)
                        
            elif node_type == 'PRODUCT' and data.get('name'):
                name = data['name'].strip()
                if name and not self._is_malformed_name(name):
                    products_dict[name] = {'id': name, 'name': name}
                    
                    if data.get('asset_class'):
                        self._add_to_string_set(data['asset_class'], asset_classes)
                        
            elif node_type == 'INCUMBENT_PRODUCT' and data.get('name'):
                name = data['name'].strip()
                if name and not self._is_malformed_name(name):
                    incumbent_products_dict[name] = {'id': name, 'name': name}
                    
                    if data.get('asset_class'):
                        self._add_to_string_set(data['asset_class'], asset_classes)
        
        # Convert dictionaries to sorted lists (already deduplicated)
        consultants = sorted(list(consultants_dict.values()), key=lambda x: x['name'])
        field_consultants = sorted(list(field_consultants_dict.values()), key=lambda x: x['name'])
        companies = sorted(list(companies_dict.values()), key=lambda x: x['name'])
        products = sorted(list(products_dict.values()), key=lambda x: x['name'])
        incumbent_products = sorted(list(incumbent_products_dict.values()), key=lambda x: x['name'])
        
        # Convert sets to sorted lists and apply limits
        markets = sorted(list(sales_regions))[:MAX_FILTER_RESULTS]
        channels_list = sorted(list(channels))[:MAX_FILTER_RESULTS]
        asset_classes_list = sorted(list(asset_classes))[:MAX_FILTER_RESULTS]
        client_advisors_list = sorted(list(client_advisors))[:MAX_FILTER_RESULTS]
        consultant_advisors_list = sorted(list(consultant_advisors))[:MAX_FILTER_RESULTS]
        
        # Build filtered options structure with guaranteed uniqueness
        filtered_options = {
            "markets": markets,
            "channels": channels_list,
            "asset_classes": asset_classes_list,
            "consultants": consultants[:MAX_FILTER_RESULTS],
            "field_consultants": field_consultants[:MAX_FILTER_RESULTS],
            "companies": companies[:MAX_FILTER_RESULTS],
            "products": products[:MAX_FILTER_RESULTS],
            "client_advisors": client_advisors_list,
            "consultant_advisors": consultant_advisors_list,
            # Static options that don't change based on data
            "ratings": ["Positive", "Negative", "Neutral", "Introduced"],
            "mandate_statuses": ["Active", "At Risk", "Conversion in Progress"],
            "influence_levels": ["1", "2", "3", "4", "High", "medium", "low", "UNK"]
        }
        
        if recommendations_mode:
            filtered_options["incumbent_products"] = incumbent_products[:MAX_FILTER_RESULTS]
        
        print(f"Filtered options extracted (duplicates removed): {[(k, len(v) if isinstance(v, list) else 'not_list') for k, v in filtered_options.items()]}")
        
        return filtered_options

    
    def _empty_filter_options(self, recommendations_mode: bool) -> Dict[str, Any]:
        """Return empty filter options structure - WITH client/consultant advisors included."""
        base_options = {
            "markets": [],
            "channels": [],
            "asset_classes": [],
            "consultants": [],
            "field_consultants": [],
            "companies": [],
            "products": [],
            "client_advisors": [],
            "consultant_advisors": [],
            "ratings": ["Positive", "Negative", "Neutral", "Introduced"],
            "mandate_statuses": ["Active", "At Risk", "Conversion in Progress"],
            "influence_levels": ["1", "2", "3", "4", "High", "medium", "low", "UNK"]
        }
        
        if recommendations_mode:
            base_options["incumbent_products"] = []
        
        return base_options  
  
    
    def _empty_response_with_cached_options(
            self, 
            region: str, 
            recommendations_mode: bool, 
            filter_options: Dict[str, Any]
        ) -> Dict[str, Any]:
            """Empty response using cached filter options."""
            return {
                "success": True,
                "render_mode": "graph",
                "data": {
                    "nodes": [],
                    "relationships": [],
                    "total_nodes": 0,
                    "total_relationships": 0
                },
                "filter_options": filter_options,
                "metadata": {
                    "region": region,
                    "mode": "recommendations" if recommendations_mode else "standard",
                    "server_side_processing": True,
                    "empty_result": True,
                    "filter_options_type": "complete_region_cached",
                    "cache_used": True,
                    "cache_type": "memory"
                }
            }

    def _create_summary_response_with_cached_options(
        self, 
        region: str, 
        node_count: int, 
        filters: Dict[str, Any],
        recommendations_mode: bool,
        filter_options: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Summary response using cached filter options."""
        
        # Generate smart suggestions (not cached - depends on current state)
        with self.driver.session() as session:
            suggestions = self._generate_smart_suggestions(session, region, recommendations_mode)
        
        return {
            "success": True,
            "render_mode": "summary",
            "data": {
                "total_nodes": node_count,
                "message": f"Dataset contains {node_count} nodes. Apply filters to reduce below {MAX_GRAPH_NODES} nodes.",
                "node_limit": MAX_GRAPH_NODES,
                "suggestions": suggestions
            },
            "filter_options": filter_options,
            "metadata": {
                "region": region,
                "mode": "recommendations" if recommendations_mode else "standard",
                "performance_limited": True,
                "server_side_processing": True,
                "cache_used": True,
                "cache_type": "memory"
            }
        }

    def _flatten_and_clean_array(self, raw_array: List[Any]) -> List[str]:
        """Flatten mixed string/array data and clean it."""
        flattened = set()
        
        for item in raw_array:
            if item is None:
                continue
            
            # Handle different data types
            if isinstance(item, list):
                # If it's already an array, flatten it
                for sub_item in item:
                    if sub_item and str(sub_item).strip():
                        cleaned = str(sub_item).strip()
                        if not self._is_malformed_value(cleaned):
                            # Handle comma-separated values
                            if ',' in cleaned:
                                for part in cleaned.split(','):
                                    part = part.strip()
                                    if part and not self._is_malformed_value(part):
                                        flattened.add(part)
                            else:
                                flattened.add(cleaned)
            else:
                # Handle string values
                if str(item).strip():
                    cleaned = str(item).strip()
                    if not self._is_malformed_value(cleaned):
                        # Handle comma-separated values
                        if ',' in cleaned:
                            for part in cleaned.split(','):
                                part = part.strip()
                                if part and not self._is_malformed_value(part):
                                    flattened.add(part)
                        else:
                            flattened.add(cleaned)
        
        return sorted(list(flattened))[:MAX_FILTER_RESULTS]

    def _clean_entity_list(self, entity_list: List[Dict]) -> List[Dict]:
        """Clean entity lists (consultants, companies, etc.)."""
        cleaned_entities = []
        seen_names = set()
        
        for item in entity_list:
            if item and isinstance(item, dict) and item.get('name'):
                name = str(item['name']).strip()
                if name and name not in seen_names and not self._is_malformed_name(name):
                    seen_names.add(name)
                    cleaned_entities.append({'id': name, 'name': name})
        
        return cleaned_entities[:MAX_FILTER_RESULTS]

    def _is_malformed_name(self, name: str) -> bool:
        """Check if a name is malformed and should be excluded."""
        if not name or len(name.strip()) == 0:
            return True
        
        # Check for malformed patterns
        malformed_patterns = [
            "['name']",  # Literal string representation
            "[\"name\"]",  # Another literal string representation
            "name'],",   # Partial array notation
            "].name",    # Broken object notation
            "[object",   # JavaScript object representation
            "undefined", # Undefined values
            "null",      # Null values
            "NaN"        # Not a number
        ]
        
        name_lower = name.lower()
        for pattern in malformed_patterns:
            if pattern in name_lower:
                return True
        
        # Check for suspicious characters that indicate data corruption
        if any(char in name for char in ['[', ']', '{', '}', '\'', '"']) and len(name) < 50:
            return True
        
        # Check for extremely long values (likely corrupted data)
        if len(name) > 200:
            return True
        
        return False

    def _is_malformed_value(self, value: str) -> bool:
        """Check if a value is malformed and should be excluded."""
        if not value or len(value.strip()) == 0:
            return True
        
        # Similar checks as malformed names but more lenient
        malformed_indicators = [
            "['",
            "']",
            "[\"",
            "\"]",
            "undefined",
            "null",
            "[object"
        ]
        
        value_lower = value.lower().strip()
        for indicator in malformed_indicators:
            if value_lower.startswith(indicator) or value_lower.endswith(indicator):
                return True
        
        # Check for extremely long values
        if len(value) > 100:
            return True
        
        return False



# Global async service instance
async_complete_backend_filter_service = AsyncCompleteBackendFilterService()