# services/complete_backend_filter_service.py - UPDATED with memory cache
"""
Complete backend filter service that handles ALL complex logic server-side.
Frontend only sends filter criteria and receives ready-to-render data.
NOW WITH MEMORY CACHING for filter options.
"""
import time
from typing import Dict, List, Any, Optional, Tuple
from neo4j import GraphDatabase, Session
from neo4j.exceptions import Neo4jError

from app.config import (
    NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE, REGIONS,
    NEO4J_MAX_CONNECTION_LIFETIME, NEO4J_CONNECTION_ACQUISITION_TIMEOUT, 
    NEO4J_MAX_CONNECTION_POOL_SIZE
)
# ADD THIS IMPORT
from app.services.memory_filter_cache import memory_filter_cache

# Performance constants
MAX_GRAPH_NODES = 500
MAX_FILTER_RESULTS = 400


class CompleteBackendFilterService:
    """Complete backend service - ALL complex logic moved from frontend + MEMORY CACHE."""
    
    def __init__(self):
        self.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USERNAME, NEO4J_PASSWORD),
            database=NEO4J_DATABASE,
            max_connection_lifetime=NEO4J_MAX_CONNECTION_LIFETIME,  # 1 hour
            max_connection_pool_size=NEO4J_MAX_CONNECTION_POOL_SIZE,
            connection_acquisition_timeout=NEO4J_CONNECTION_ACQUISITION_TIMEOUT,
            # Add these for stability
            keep_alive=True
        )
        # ADD THIS LINE
        self.cache = memory_filter_cache
    
    def close(self):
        if self.driver:
            self.driver.close()
        # ADD THIS LINE
        self.cache.cleanup()

    def get_complete_filtered_data(
        self, 
        region: str,
        filters: Dict[str, Any] = None,
        recommendations_mode: bool = False,
        nlq_mode: bool = False,
        nlq_cypher_query: str = None
    ) -> Dict[str, Any]:
        """
        UPDATED: Get completely processed data with support for NLQ mode.
        
        Args:
            region: Target region
            filters: Traditional structured filters (ignored if nlq_mode=True)
            recommendations_mode: Whether to include incumbent products
            nlq_mode: If True, use direct Cypher query instead of structured filters
            nlq_cypher_query: Complete Cypher query with parameters already embedded
        """
        filters = filters or {}
        region = region.upper()
        
        try:
            with self.driver.session() as session:
                
                # Step 1: DETERMINE QUERY SOURCE
                if nlq_mode and nlq_cypher_query:
                    print(f"NLQ MODE: Executing direct Cypher query")
                    
                    enhanced_query = self._enhance_nlq_query_with_ratings(nlq_cypher_query, recommendations_mode)
                    print(f"Enhanced Cypher Query: {enhanced_query}")
                    # Execute the pre-built Cypher query directly (no parameters needed)
                    result = session.run(nlq_cypher_query)
                    records = list(result)
                    
                    applied_filters = {"nlq_query": "Custom Cypher query applied"}
                    filter_source = "nlq_cypher_direct"
                    
                else:
                    # Step 1B: TRADITIONAL MODE - use existing query building
                    query, params = self._build_optimized_union_query(region, filters, recommendations_mode)
                    print(f"TRADITIONAL MODE: Executing structured filter query for {region}")
                    print(query)
                    result = session.run(query, params)
                    
                    records = list(result)
                    
                    applied_filters = filters
                    filter_source = "structured_filters"
                
                # Step 2: PROCESS RESULTS (same for both modes)
                if not records:
                    filter_options = self._get_cached_complete_filter_options(
                        session, region, recommendations_mode
                    )
                    
                    return self._create_nlq_empty_response(
                        region, recommendations_mode, filter_options, 
                        nlq_mode, nlq_cypher_query if nlq_mode else None
                    )

                graph_data = records[0]['GraphData']
                nodes = graph_data.get('nodes', [])
                relationships = graph_data.get('relationships', [])

                # NEW: Enhance ratings with main consultant information BEFORE orphan removal
                nodes = self._enhance_ratings_with_main_consultant(nodes, relationships)

                # Step 3: Post-processing (same for both modes)
                nodes, relationships = self._remove_orphans_post_processing(nodes, relationships)
                
                print(f"Backend processing complete: {len(nodes)} nodes, {len(relationships)} relationships")
                
                # Step 4: Performance limits check (same for both modes)
                if len(nodes) > MAX_GRAPH_NODES:
                    filter_options = self._get_filtered_options_from_actual_data(
                        session, region, relationships, recommendations_mode
                    )
                    
                    return self._create_nlq_summary_response(
                        region, len(nodes), applied_filters, recommendations_mode,
                        filter_options, nlq_mode, nlq_cypher_query if nlq_mode else None
                    )
                
                # Step 5: Layout calculation (same for both modes)
                positioned_nodes = self._calculate_layout_positions(nodes)
                
                # Step 6: Filter options strategy (same logic, different metadata)
                has_filters_applied = any(applied_filters.values()) if applied_filters else False
                
                if has_filters_applied and len(nodes) > 0:
                    filter_options = self._get_filtered_options_from_actual_data(
                        nodes, relationships, region, recommendations_mode
                    )
                    filter_options_type = "filtered_data"
                    cache_used = False
                    print(f"Using fresh filtered options from {len(nodes)} result nodes")
                else:
                    filter_options = self._get_cached_complete_filter_options(
                        session, region, recommendations_mode
                    )
                    filter_options_type = "complete_region_cached"
                    cache_used = True
                    print(f"Using CACHED complete region options")
                
                # Step 7: Return response with NLQ metadata
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
                        "query_mode": "nlq" if nlq_mode else "structured",
                        "nlq_cypher_query": nlq_cypher_query if nlq_mode else None,
                        "server_side_processing": True,
                        "filters_applied": applied_filters,
                        "filter_source": filter_source,
                        "filter_options_type": filter_options_type,
                        "has_filters_applied": has_filters_applied,
                        "cache_used": cache_used,
                        "cache_type": "memory",
                        "processing_time_ms": int(time.time() * 1000),
                        "optimizations": [
                            "Server-side filtering",
                            "Memory-cached filter options",
                            "Pre-calculated layouts",
                            "Direct Cypher execution" if nlq_mode else "Single query execution",
                            "Performance limiting",
                            "Context-aware filter options",
                            "Custom Cypher query" if nlq_mode else "Structured filter processing"
                        ]
                    }
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"{'NLQ Cypher' if nlq_mode else 'Traditional'} backend processing failed: {str(e)}",
                "render_mode": "error",
                "nlq_cypher_query": nlq_cypher_query if nlq_mode else None,
                "query_mode": "nlq" if nlq_mode else "structured"
            }
    # NEW METHOD: Cached filter options retrieval
    def _get_cached_complete_filter_options(
        self, 
        session: Session, 
        region: str, 
        recommendations_mode: bool
    ) -> Dict[str, Any]:
        """Get complete filter options with MEMORY CACHING."""
        
        # Try cache first
        cached_options = self.cache.get(region, recommendations_mode)
        if cached_options:
            print(f"MEMORY CACHE HIT for filter options: {region}, rec_mode: {recommendations_mode}")
            return cached_options
        
        # Cache miss - compute fresh and cache
        print(f"MEMORY CACHE MISS - computing fresh filter options for {region}")
        start_time = time.time()
        
        # Use existing method to compute filter options
        filter_options = self._get_complete_filter_options(session, region, recommendations_mode)
        
        compute_time = int((time.time() - start_time) * 1000)
        print(f"Filter options computed in {compute_time}ms")
        
        # Cache the computed options
        cache_success = self.cache.set(region, recommendations_mode, filter_options)
        print(f"Memory cache SET success: {cache_success}")
        
        return filter_options

    # NEW METHODS: Cache management
    def invalidate_filter_cache(self, region: str = None) -> Dict[str, Any]:
        """Invalidate memory cache entries."""
        if region:
            deleted_count = self.cache.invalidate_region(region.upper())
            return {
                "success": True,
                "message": f"Invalidated {deleted_count} memory cache entries for region {region.upper()}",
                "deleted_entries": deleted_count,
                "cache_type": "memory"
            }
        else:
            # Invalidate all filter cache
            deleted_count = self.cache.invalidate_all()
            return {
                "success": True,
                "message": f"Invalidated all {deleted_count} memory cache entries",
                "deleted_entries": deleted_count,
                "cache_type": "memory"
            }

    def warmup_filter_cache(self, regions: List[str] = None) -> Dict[str, Any]:
        """Warm up memory cache for specified regions."""
        regions = regions or list(REGIONS.keys())
        
        def compute_filter_options(region: str, recommendations_mode: bool) -> Dict[str, Any]:
            with self.driver.session() as session:
                return self._get_complete_filter_options(session, region, recommendations_mode)
        
        start_time = time.time()
        results = {"success": [], "failed": []}
        
        for region in regions:
            for rec_mode in [True, False]:
                try:
                    compute_start = time.time()
                    filter_options = compute_filter_options(region, rec_mode)
                    
                    if filter_options:
                        self.cache.set(region, rec_mode, filter_options, ttl=self.cache.default_ttl * 2)  # Longer TTL for warmup
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
        
        total_time = int((time.time() - start_time) * 1000)
        
        return {
            "success": True,
            "warmup_results": results,
            "total_successful": len(results["success"]),
            "total_failed": len(results["failed"]),
            "total_warmup_time_ms": total_time,
            "cache_type": "memory",
            "message": f"Warmed up cache for {len(regions)} regions with both modes"
        }

    def get_cache_statistics(self) -> Dict[str, Any]:
        """Get comprehensive memory cache statistics."""
        try:
            cache_stats = self.cache.get_comprehensive_stats()
            
            return {
                "success": True,
                "cache_type": "memory",
                "statistics": cache_stats,
                "cache_strategy": {
                    "cache_complete_filter_options": "YES - in memory with TTL",
                    "cache_filtered_options": "NO - always fresh (result-dependent)",
                    "cache_main_graph_data": "NO - always fresh",
                    "cache_invalidation": "Manual + automatic cleanup",
                    "background_cleanup": "Automatic expired entry removal"
                },
                "performance_characteristics": {
                    "access_time": "~0.1ms (direct memory access)",
                    "memory_isolation": "Shared within application instance",
                    "persistence": "Lost on application restart",
                    "thread_safety": "Yes (RLock protected)"
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get cache statistics: {str(e)}"
            }

    # UPDATED HELPER METHODS for cache integration
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


    # Just make sure this method includes cache status
    def health_check(self) -> Dict[str, Any]:
        """Enhanced health check with cache status."""
        try:
            neo4j_healthy = self.driver is not None
            cache_stats = self.cache.get_comprehensive_stats()
            
            return {
                "status": "healthy" if neo4j_healthy else "unhealthy",
                "services": {
                    "neo4j_connection": "healthy" if neo4j_healthy else "unhealthy",
                    "memory_cache": "healthy",
                    "filter_processing": "healthy"
                },
                "cache_summary": {
                    "type": "memory",
                    "entries": cache_stats["performance_metrics"]["total_entries"],
                    "hit_rate": f"{cache_stats['performance_metrics']['hit_rate_percent']}%",
                    "memory_usage_mb": cache_stats["memory_usage"]["estimated_total_mb"],
                    "regions_cached": cache_stats["cache_health"]["regions_cached"]
                },
                "features": {
                    "server_side_filtering": "All filters in Cypher queries",
                    "memory_cached_filter_options": "Complete filter options cached in memory",
                    "layout_calculation": "Positions calculated server-side",
                    "performance_limiting": f"Smart {MAX_GRAPH_NODES}-node limit",
                    "background_cleanup": "Automatic expired entry removal"
                }
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "cache_fallback": "Service will work without cache but with reduced performance"
            }



    def _get_filtered_options_from_actual_data(
        self,
        nodes: List[Dict],
        relationships: List[Dict],  # ADD relationships parameter
        region: str,
        recommendations_mode: bool
    ) -> Dict[str, Any]:
        """
        UPDATED: Extract filter options from actual result nodes AND relationships.
        This ensures dropdowns show only values present in current filtered dataset.
        """
        if not nodes:
            return self._empty_filter_options(recommendations_mode)
        
        # Use sets to automatically handle duplicates for simple values
        channels = set()
        sales_regions = set()
        asset_classes = set()
        client_advisors = set()
        consultant_advisors = set()
        mandate_statuses = set()  # NEW: Extract from actual data
        mandate_managers= set()
        universe_names = set()
        influence_levels = set()  # NEW: Extract from actual data
        ratings = set()  # NEW: Extract from actual data
        
        # Use dictionaries to handle duplicates for entity objects (by name)
        consultants_dict = {}
        field_consultants_dict = {}
        companies_dict = {}
        products_dict = {}
        incumbent_products_dict = {}
        
        
        # Extract data from nodes
        for node in nodes:
            node_type = node.get('type')
            data = node.get('data', {})
            
            if node_type == 'CONSULTANT' and data.get('name'):
                name = data['name'].strip()
                if name and not self._is_malformed_name(name):
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
                        
                    # NEW: Extract ratings from product node data
                    if data.get('ratings'):
                        for rating in data['ratings']:
                            if rating.get('rankgroup'):
                                ratings.add(rating['rankgroup'])

                    if data.get('universe_name'):
                        self._add_to_string_set(data['universe_name'], universe_names)

                                
            elif node_type == 'INCUMBENT_PRODUCT' and data.get('name'):
                name = data['name'].strip()
                if name and not self._is_malformed_name(name):
                    incumbent_products_dict[name] = {'id': name, 'name': name}
                    
                    if data.get('asset_class'):
                        self._add_to_string_set(data['asset_class'], asset_classes)
                        
                    # NEW: Extract ratings from incumbent product node data
                    if data.get('ratings'):
                        for rating in data['ratings']:
                            if rating.get('rankgroup'):
                                ratings.add(rating['rankgroup'])

        
           
        
        # NEW: Extract data from relationships
        for relationship in relationships:
            rel_data = relationship.get('data', {})
            
            # Extract mandate statuses from OWNS relationships
            if rel_data.get('relType') == 'OWNS' and rel_data.get('mandate_status'):
                self._add_to_string_set(rel_data['mandate_status'], mandate_statuses)
            
            # Extract influence levels from COVERS relationships
            if rel_data.get('relType') == 'COVERS' and rel_data.get('level_of_influence'):
                self._add_to_string_set(rel_data['level_of_influence'], influence_levels)
                
            # Extract influence levels from EMPLOYS relationships (if they have it)
            if rel_data.get('relType') == 'EMPLOYS' and rel_data.get('level_of_influence'):
                self._add_to_string_set(rel_data['level_of_influence'], influence_levels)

            # Extract mandate managers from OWNS relationships
            if rel_data.get('relType') == 'OWNS' and rel_data.get('manager'):
                self._add_to_string_set(rel_data['manager'], mandate_managers)
        
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
        
        # NEW: Convert extracted relationship data to sorted lists
        mandate_statuses_list = sorted(list(mandate_statuses))[:MAX_FILTER_RESULTS]
        influence_levels_list = sorted(list(influence_levels))[:MAX_FILTER_RESULTS]
        mandate_managers_list = sorted(list(mandate_managers))[:MAX_FILTER_RESULTS]
        universe_names_list = sorted(list(universe_names))[:MAX_FILTER_RESULTS]
        ratings_list = sorted(list(ratings))[:MAX_FILTER_RESULTS]
        
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
            # NEW: Use actual data instead of static values
            "mandate_statuses": mandate_statuses_list if mandate_statuses_list else ["Active", "At Risk", "Conversion in Progress"],  # Fallback to static if none found
            "influence_levels": influence_levels_list if influence_levels_list else ["1", "2", "3", "4", "High", "medium", "low", "UNK"],  # Fallback to static if none found
            "ratings": ratings_list if ratings_list else ["Positive", "Negative", "Neutral", "Introduced"]  # Fallback to static if none found
        
        }
        
        if recommendations_mode:
            filtered_options["incumbent_products"] = incumbent_products[:MAX_FILTER_RESULTS]
            filtered_options["mandate_managers"] = mandate_managers_list[:MAX_FILTER_RESULTS]
            filtered_options["incumbent_universe_namesproducts"] = universe_names_list[:MAX_FILTER_RESULTS]
        
        print(f"Filtered options extracted from actual data: {[(k, len(v) if isinstance(v, list) else 'not_list') for k, v in filtered_options.items()]}")
        print(f"Found {len(mandate_statuses_list)} mandate statuses, {len(influence_levels_list)} influence levels, {len(ratings_list)} ratings")
        
        return filtered_options

    # Helper methods for duplicate handling
    def _add_to_string_set(self, value, target_set: set):
        """Add string or list of strings to set, handling duplicates and malformed values."""
        if value is None:
            return
            
        if isinstance(value, list):
            for item in value:
                if item and str(item).strip():
                    cleaned = str(item).strip()
                    if not self._is_malformed_value(cleaned):
                        # Handle comma-separated values
                        if ',' in cleaned:
                            for part in cleaned.split(','):
                                part = part.strip()
                                if part and not self._is_malformed_value(part):
                                    target_set.add(part)
                        else:
                            target_set.add(cleaned)
        else:
            if str(value).strip():
                cleaned = str(value).strip()
                if not self._is_malformed_value(cleaned):
                    # Handle comma-separated values
                    if ',' in cleaned:
                        for part in cleaned.split(','):
                            part = part.strip()
                            if part and not self._is_malformed_value(part):
                                target_set.add(part)
                    else:
                        target_set.add(cleaned)

    def _add_to_advisor_set(self, value, target_set: set):
        """Add advisor values to set with special handling for advisor data."""
        if value is None:
            return
            
        if isinstance(value, list):
            for item in value:
                if item and str(item).strip():
                    cleaned = str(item).strip()
                    if not self._is_malformed_value(cleaned) and len(cleaned) > 1:  # Advisor names should be longer than 1 char
                        target_set.add(cleaned)
        else:
            if str(value).strip():
                cleaned = str(value).strip()
                if not self._is_malformed_value(cleaned) and len(cleaned) > 1:
                    target_set.add(cleaned)

    def _empty_response(self, region: str, recommendations_mode: bool) -> Dict[str, Any]:
        """
        UPDATED: Return empty response with complete filter options for user selection.
        """
        with self.driver.session() as session:
            # No data found - provide complete region options for initial filtering
            filter_options = self._get_complete_filter_options(session, region, recommendations_mode)
        
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
                "filter_options_type": "complete_region"
            }
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

    def _build_optimized_union_query(
        self, 
        region: str, 
        filters: Dict[str, Any],
        recommendations_mode: bool
    ) -> Tuple[str, Dict[str, Any]]:
        """
        CORRECTED: Add OPTIONAL MATCH for RATES in existing paths, then filter out RATES edges
        """
        
        params = {"region": region}
        
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
        if filters.get('mandateManagers'):
            params['mandateManagers'] = filters['mandateManagers']
        if filters.get('universeNames'):
            params['universeNames'] = filters['universeNames']
        
        # Helper functions
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
            if filters.get('universeNames'):
                conditions.append(f"""ANY(un IN $universeNames WHERE 
                    un = {product_var}.universe_name OR un IN {product_var}.universe_name)""")
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
                
            if filters.get('mandateManagers'):
                conditions.append(f"""ANY(mm IN $mandateManagers WHERE 
                    mm = {rel_var}.manager OR mm IN {rel_var}.manager)""")
            return conditions
        
        def build_influence_conditions(rel_var: str) -> List[str]:
            conditions = []
            if filters.get('influence_levels'):
                conditions.append(f"""ANY(il IN $influenceLevels WHERE 
                    il = {rel_var}.level_of_influence OR il IN {rel_var}.level_of_influence)""")
            return conditions
        
        def build_ratings_conditions_for_with() -> List[str]:
            """Build ratings conditions to be applied in WITH clause"""
            conditions = []
            if filters.get('ratings'):
                conditions.append("(rating_rel IS NULL OR rating_rel.rankgroup IN $ratings)")
            # Note: rating relationships don't have level_of_influence, only COVERS does
            return conditions
        
        def combine_conditions(condition_lists: List[List[str]]) -> str:
            all_conditions = []
            for condition_list in condition_lists:
                all_conditions.extend(condition_list)
            return " AND ".join(all_conditions) if all_conditions else "true"
        
        print()
        if recommendations_mode:
            single_call_query = f"""
            CALL {{
                // Path 1: Full consultant chain + RATINGS
                OPTIONAL MATCH (cons:CONSULTANT)-[emp:EMPLOYS]->(fc:FIELD_CONSULTANT)
                OPTIONAL MATCH (fc:FIELD_CONSULTANT)-[cov:COVERS]->(c:COMPANY)
                OPTIONAL MATCH (c:COMPANY)-[owns:OWNS]->(ip:INCUMBENT_PRODUCT)
                OPTIONAL MATCH (ip:INCUMBENT_PRODUCT)-[rec:BI_RECOMMENDS]->(p:PRODUCT)
                // ADD RATINGS OPTIONAL MATCH - only for products
                OPTIONAL MATCH (cons)-[rating_rel:RATES]->(p)
                WITH cons, fc, c, ip, p, emp, cov, owns, rec, rating_rel
                WHERE {combine_conditions([
                    build_company_conditions('c'),
                    build_consultant_conditions('cons'),
                    build_product_conditions('p'),
                    build_field_consultant_conditions('fc'),
                    build_mandate_conditions('owns'),
                    build_influence_conditions('cov'),  # Only cov has level_of_influence
                    build_ratings_conditions_for_with()  # Apply ratings filters
                ])}
                RETURN cons as consultant, fc as field_consultant, c as company, ip as incumbent_product, p as product,
                    emp as rel1, cov as rel2, owns as rel3, rec as rel4, rating_rel as rel5
                
                UNION
                
                // Path 2: Direct consultant coverage + RATINGS
                OPTIONAL MATCH (cons:CONSULTANT)-[cov:COVERS]->(c:COMPANY)
                OPTIONAL MATCH (c:COMPANY)-[owns:OWNS]->(ip:INCUMBENT_PRODUCT)
                OPTIONAL MATCH (ip:INCUMBENT_PRODUCT)-[rec:BI_RECOMMENDS]->(p:PRODUCT)
                // ADD RATINGS OPTIONAL MATCH - only for products
                OPTIONAL MATCH (cons)-[rating_rel:RATES]->(p)
                WITH cons, c, ip, p, cov, owns, rec, rating_rel
                WHERE {combine_conditions([
                    build_company_conditions('c'),
                    build_consultant_conditions('cons'),
                    build_product_conditions('p'),
                    build_mandate_conditions('owns'),
                    build_influence_conditions('cov'),  # Only cov has level_of_influence
                    build_ratings_conditions_for_with()  # Apply ratings filters
                ])}
                RETURN cons as consultant, null as field_consultant, c as company, ip as incumbent_product, p as product,
                    cov as rel1, null as rel2, owns as rel3, rec as rel4, rating_rel as rel5
            }}
            
            // Aggregate results - collect all including ratings
            WITH 
                COLLECT(DISTINCT consultant) as all_consultants,
                COLLECT(DISTINCT field_consultant) as all_field_consultants,
                COLLECT(DISTINCT company) as all_companies,
                COLLECT(DISTINCT incumbent_product) as all_incumbent_products,
                COLLECT(DISTINCT product) as all_products,
                COLLECT(DISTINCT rel1) + COLLECT(DISTINCT rel2) + COLLECT(DISTINCT rel3) + 
                COLLECT(DISTINCT rel4) + COLLECT(DISTINCT rel5) as all_relationships
            
            // Remove nulls and combine all nodes
            WITH 
                [x IN all_consultants WHERE x IS NOT NULL] as consultants,
                [x IN all_field_consultants WHERE x IS NOT NULL] as field_consultants,
                [x IN all_companies WHERE x IS NOT NULL] as companies,
                [x IN all_incumbent_products WHERE x IS NOT NULL] as incumbent_products,
                [x IN all_products WHERE x IS NOT NULL] as products,
                [x IN all_relationships WHERE x IS NOT NULL] as relationships
            
            WITH consultants + field_consultants + companies + incumbent_products + products as allNodes,
                relationships
            
            // Collect ratings from the RATES relationships we found
            UNWIND relationships AS rel
            WITH allNodes, relationships, 
                CASE WHEN type(rel) = 'RATES' THEN endNode(rel).id ELSE null END as rated_product_id,
                CASE WHEN type(rel) = 'RATES' THEN startNode(rel).name ELSE null END as rating_consultant_name,
                CASE WHEN type(rel) = 'RATES' THEN startNode(rel).id ELSE null END as rating_consultant_id,
                CASE WHEN type(rel) = 'RATES' THEN rel.rankgroup ELSE null END as rankgroup,
                CASE WHEN type(rel) = 'RATES' THEN rel.rankvalue ELSE null END as rankvalue
            
            
            WITH allNodes, relationships,
                rated_product_id,
                COLLECT({{
                    consultant: rating_consultant_name,
                    consultant_id: rating_consultant_id,
                    rankgroup: rankgroup,
                    rankvalue: rankvalue
                }}) as product_ratings
            
            WITH allNodes, relationships,
                COLLECT({{
                    product_id: rated_product_id,
                    ratings: [rating IN product_ratings WHERE rating.consultant IS NOT NULL | rating]
                }}) AS all_ratings_map
            
            // Final filtering and formatting - EXCLUDE RATES relationships from frontend
            WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL] AS filteredNodes, 
                [rel IN relationships WHERE rel IS NOT NULL AND type(rel) <> 'RATES'] AS filteredRels,
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
                        manager: node.manager,
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
                relationships: [rel IN filteredRels | {{
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
            # Standard mode - similar structure but only for PRODUCT nodes
            single_call_query = f"""
            CALL {{
                // Path 1: Full consultant chain + RATINGS
                OPTIONAL MATCH (cons:CONSULTANT)-[emp:EMPLOYS]->(fc:FIELD_CONSULTANT)
                OPTIONAL MATCH (fc:FIELD_CONSULTANT)-[cov:COVERS]->(c:COMPANY)
                OPTIONAL MATCH (c:COMPANY)-[owns:OWNS]->(p:PRODUCT)
                // ADD RATINGS OPTIONAL MATCH - only for products
                OPTIONAL MATCH (cons)-[rating_rel:RATES]->(p)
                WITH cons, fc, c, p, emp, cov, owns, rating_rel
                WHERE {combine_conditions([
                    build_company_conditions('c'),
                    build_consultant_conditions('cons'),
                    build_product_conditions('p'),
                    build_field_consultant_conditions('fc'),
                    build_mandate_conditions('owns'),
                    build_influence_conditions('cov'),  # Only cov has level_of_influence
                    build_ratings_conditions_for_with()  # Apply ratings filters
                ])}
                RETURN cons as consultant, fc as field_consultant, c as company, p as product,
                    emp as rel1, cov as rel2, owns as rel3, rating_rel as rel4
                
                UNION
                
                // Path 2: Direct consultant coverage + RATINGS
                OPTIONAL MATCH (cons:CONSULTANT)-[cov:COVERS]->(c:COMPANY)
                OPTIONAL MATCH (c:COMPANY)-[owns:OWNS]->(p:PRODUCT)
                // ADD RATINGS OPTIONAL MATCH - only for products
                OPTIONAL MATCH (cons)-[rating_rel:RATES]->(p)
                WITH cons, c, p, cov, owns, rating_rel
                WHERE {combine_conditions([
                    build_company_conditions('c'),
                    build_consultant_conditions('cons'),
                    build_product_conditions('p'),
                    build_mandate_conditions('owns'),
                    build_influence_conditions('cov'),  # Only cov has level_of_influence
                    build_ratings_conditions_for_with()  # Apply ratings filters
                ])}
                RETURN cons as consultant, null as field_consultant, c as company, p as product,
                    cov as rel1, null as rel2, owns as rel3, rating_rel as rel4
            }}
            
            // Same aggregation and processing as recommendations mode but without incumbent_products
            WITH 
                COLLECT(DISTINCT consultant) as all_consultants,
                COLLECT(DISTINCT field_consultant) as all_field_consultants,
                COLLECT(DISTINCT company) as all_companies,
                COLLECT(DISTINCT product) as all_products,
                COLLECT(DISTINCT rel1) + COLLECT(DISTINCT rel2) + COLLECT(DISTINCT rel3) + COLLECT(DISTINCT rel4) as all_relationships
            
            WITH 
                [x IN all_consultants WHERE x IS NOT NULL] as consultants,
                [x IN all_field_consultants WHERE x IS NOT NULL] as field_consultants,
                [x IN all_companies WHERE x IS NOT NULL] as companies,
                [x IN all_products WHERE x IS NOT NULL] as products,
                [x IN all_relationships WHERE x IS NOT NULL] as relationships
            
            WITH consultants + field_consultants + companies + products as allNodes,
                relationships
            
            // Collect ratings from RATES relationships
            UNWIND relationships AS rel
            WITH allNodes, relationships, 
                CASE WHEN type(rel) = 'RATES' THEN endNode(rel).id ELSE null END as rated_product_id,
                CASE WHEN type(rel) = 'RATES' THEN startNode(rel).name ELSE null END as rating_consultant_name,
                CASE WHEN type(rel) = 'RATES' THEN startNode(rel).id ELSE null END as rating_consultant_id,
                CASE WHEN type(rel) = 'RATES' THEN rel.rankgroup ELSE null END as rankgroup,
                CASE WHEN type(rel) = 'RATES' THEN rel.rankvalue ELSE null END as rankvalue

            
            WITH allNodes, relationships,
                rated_product_id,
                COLLECT({{
                    consultant: rating_consultant_name,
                    consultant_id: rating_consultant_id,
                    rankgroup: rankgroup,
                    rankvalue: rankvalue
                }}) as product_ratings
            
            WITH allNodes, relationships,
                COLLECT({{
                    product_id: rated_product_id,
                    ratings: [rating IN product_ratings WHERE rating.consultant IS NOT NULL | rating]
                }}) AS all_ratings_map
            
            // Final filtering - EXCLUDE RATES relationships from frontend
            WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL] AS filteredNodes, 
                [rel IN relationships WHERE rel IS NOT NULL AND type(rel) <> 'RATES'] AS filteredRels,
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
                            ELSE null
                        END
                    }}
                }}],
                relationships: [rel IN filteredRels | {{
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
        
        return single_call_query, params

    def get_ratings_for_nodes(
        self, 
        session: Session, 
        node_ids: List[str], 
        filters: Dict[str, Any] = None
    ) -> Dict[str, List[Dict]]:
        """Separate optimized rating collection."""
        
        if not node_ids:
            return {}
        
        rating_conditions = []
        params = {"node_ids": node_ids}
        
        if filters and filters.get('ratings'):
            rating_conditions.append("rating_rel.rankgroup IN $ratings")
            params['ratings'] = filters['ratings']
        
        if filters and filters.get('influence_levels'):
            rating_conditions.append("rating_rel.level_of_influence IN $influence_levels")
            params['influence_levels'] = filters['influence_levels']
        
        where_clause = ""
        if rating_conditions:
            where_clause = "AND " + " AND ".join(rating_conditions)
        
        rating_query = f"""
        MATCH (rating_consultant:CONSULTANT)-[rating_rel:RATES]->(target_node)
        WHERE target_node.id IN $node_ids 
        AND ('PRODUCT' IN labels(target_node) OR 'INCUMBENT_PRODUCT' IN labels(target_node))
        {where_clause}
        
        RETURN target_node.id AS node_id, 
            COLLECT({{consultant: rating_consultant.name, rankgroup: rating_rel.rankgroup}}) AS ratings
        """
        
        try:
            result = session.run(rating_query, params)
            ratings_map = {}
            
            for record in result:
                node_id = record['node_id']
                ratings = [r for r in record['ratings'] if r['consultant']]
                if ratings:
                    ratings_map[node_id] = ratings
            
            print(f"Collected ratings for {len(ratings_map)} nodes")
            return ratings_map
            
        except Exception as e:
            print(f"Error collecting ratings: {str(e)}")
            return {}
    
    def _get_complete_filter_options(
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
                OPTIONAL MATCH (c)-[owns:OWNS]->(ip:INCUMBENT_PRODUCT)-[:BI_RECOMMENDS]->(p:PRODUCT)
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
                    ratings: COLLECT(DISTINCT rating.rankgroup),
                    raw_mandate_managers: COLLECT(DISTINCT owns.manager),
                    raw_universe_names: COLLECT(DISTINCT p.universe_name)
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
                
                cleaned_options['mandate_managers'] = self._flatten_and_clean_array(raw_data.get('raw_mandate_managers', []))
                cleaned_options['universe_names'] = self._flatten_and_clean_array(raw_data.get('raw_universe_names', []))

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
            base_options["incumbent_products"] = [],
            base_options["mandate_managers"] = [],
            base_options["universe_names"] = []

        
        return base_options  
    
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
    

    def _create_summary_response(
        self, 
        region: str, 
        node_count: int, 
        filters: Dict[str, Any],
        recommendations_mode: bool
    ) -> Dict[str, Any]:
        """Create summary response when dataset is too large."""
        
        with self.driver.session() as session:
            # Get filter options even for large datasets
            filter_options = self._get_complete_filter_options(session, region, recommendations_mode)
            
            # Generate smart filter suggestions
            suggestions = self._generate_smart_suggestions(session, region, recommendations_mode)
        
        return {
            "success": True,
            "render_mode": "summary",
            "data": {
                "total_nodes": node_count,
                "message": f"Dataset contains {node_count} nodes. Apply filters to reduce below {MAX_GRAPH_NODES} nodes for optimal visualization.",
                "node_limit": MAX_GRAPH_NODES,
                "suggestions": suggestions
            },
            "filter_options": filter_options,
            "metadata": {
                "region": region,
                "mode": "recommendations" if recommendations_mode else "standard",
                "performance_limited": True,
                "server_side_processing": True
            }
        }
    
    def _generate_smart_suggestions(
        self, 
        session: Session, 
        region: str, 
        recommendations_mode: bool
    ) -> List[Dict[str, str]]:
        """Generate intelligent filter suggestions to reduce dataset size."""
        
        suggestion_query = f"""
        MATCH (c:COMPANY) WHERE c.region = '{region}'
        OPTIONAL MATCH (c)-[:OWNS]->(p)
        OPTIONAL MATCH (fc:FIELD_CONSULTANT)-[:COVERS]->(c)
        OPTIONAL MATCH (cons:CONSULTANT)-[:EMPLOYS]->(fc)
        OPTIONAL MATCH (cons2:CONSULTANT)-[:COVERS]->(c)
        
        WITH c, COUNT(DISTINCT p) AS product_count, 
             COUNT(DISTINCT fc) + COUNT(DISTINCT cons2) AS consultant_count
        ORDER BY product_count DESC, consultant_count DESC
        LIMIT 5
        
        RETURN c.name AS company_name, product_count, consultant_count
        """
        
        result = session.run(suggestion_query)
        suggestions = []
        
        for record in result:
            suggestions.append({
                "filter_type": "company",
                "filter_field": "clientIds",
                "filter_value": record["company_name"],
                "description": f"Focus on {record['company_name']} ({record['product_count']} products, {record['consultant_count']} relationships)",
                "estimated_reduction": "60-80%"
            })
        
        return suggestions
    
    def _empty_filter_options(self, recommendations_mode: bool) -> Dict[str, Any]:
        """Return empty filter options structure."""
        base_options = {
            "markets": [],
            "channels": [],
            "asset_classes": [],
            "consultants": [],
            "field_consultants": [],
            "companies": [],
            "products": [],
            "client_advisors": [],
            "ratings": ["Positive", "Negative", "Neutral", "Introduced"],
            "mandate_statuses": ["Active", "At Risk", "Conversion in Progress"],
            "influence_levels": ["1", "2", "3", "4", "High", "medium", "low", "UNK"]
        }
        
        if recommendations_mode:
            base_options["incumbent_products"] = []
            base_options["consultant_advisors"] = []
        
        return base_options
    

    def get_region_stats(self, region: str, recommendations_mode: bool = False) -> Dict[str, Any]:
        """Get quick statistics for a region without full data retrieval."""
        try:
            with self.driver.session() as session:
                if recommendations_mode:
                    stats_query = f"""
                    MATCH (c:COMPANY) WHERE (c.region = $region OR $region IN c.region)
                    OPTIONAL MATCH (c)-[:OWNS]->(ip:INCUMBENT_PRODUCT)-[:BI_RECOMMENDS]->(p:PRODUCT)
                    OPTIONAL MATCH (cons:CONSULTANT)-[:EMPLOYS]->(fc:FIELD_CONSULTANT)-[:COVERS]->(c)
                    OPTIONAL MATCH (cons2:CONSULTANT)-[:COVERS]->(c)
                    
                    WITH 
                        COUNT(DISTINCT c) AS companies,
                        COUNT(DISTINCT ip) AS incumbent_products,
                        COUNT(DISTINCT p) AS products,
                        COUNT(DISTINCT cons) + COUNT(DISTINCT cons2) AS consultants,
                        COUNT(DISTINCT fc) AS field_consultants
                    
                    RETURN {{
                        total_nodes: companies + incumbent_products + products + consultants + field_consultants,
                        node_breakdown: {{
                            companies: companies,
                            incumbent_products: incumbent_products,
                            products: products,
                            consultants: consultants,
                            field_consultants: field_consultants
                        }},
                        estimated_relationships: (consultants + field_consultants) * 2 + companies + incumbent_products,
                        performance_recommendation: CASE 
                            WHEN companies + incumbent_products + products + consultants + field_consultants > 500 
                            THEN 'Apply filters to reduce dataset size'
                            ELSE 'Dataset size optimal for visualization'
                        END
                    }} AS Stats
                    """
                else:
                    stats_query = f"""
                    MATCH (c:COMPANY) WHERE (c.region = $region OR $region IN c.region)
                    OPTIONAL MATCH (c)-[:OWNS]->(p:PRODUCT)
                    OPTIONAL MATCH (cons:CONSULTANT)-[:EMPLOYS]->(fc:FIELD_CONSULTANT)-[:COVERS]->(c)
                    OPTIONAL MATCH (cons2:CONSULTANT)-[:COVERS]->(c)
                    
                    WITH 
                        COUNT(DISTINCT c) AS companies,
                        COUNT(DISTINCT p) AS products,
                        COUNT(DISTINCT cons) + COUNT(DISTINCT cons2) AS consultants,
                        COUNT(DISTINCT fc) AS field_consultants
                    
                    RETURN {{
                        total_nodes: companies + products + consultants + field_consultants,
                        node_breakdown: {{
                            companies: companies,
                            products: products,
                            consultants: consultants,
                            field_consultants: field_consultants
                        }},
                        estimated_relationships: (consultants + field_consultants) * 2 + companies,
                        performance_recommendation: CASE 
                            WHEN companies + products + consultants + field_consultants > 500 
                            THEN 'Apply filters to reduce dataset size'
                            ELSE 'Dataset size optimal for visualization'
                        END
                    }} AS Stats
                    """
                
                result = session.run(stats_query, {"region": region})
                record = result.single()
                
                if record and record['Stats']:
                    return {
                        "success": True,
                        "region": region,
                        "mode": "recommendations" if recommendations_mode else "standard",
                        "stats": record['Stats'],
                        "query_time_ms": "<50ms (count-only query)"
                    }
                
                return {"success": False, "error": "No data found for region"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _get_complete_filter_options_with_stats(
        self, 
        session: Session, 
        region: str, 
        recommendations_mode: bool
    ) -> Dict[str, Any]:
        """Enhanced filter options with embedded statistics - single query approach."""
        
        try:
            if recommendations_mode:
                filter_query = f"""
                MATCH (c:COMPANY) WHERE (c.region = $region OR $region IN c.region)
                OPTIONAL MATCH (c)-[:OWNS]->(ip:INCUMBENT_PRODUCT)-[:BI_RECOMMENDS]->(p:PRODUCT)
                OPTIONAL MATCH path1 = (cons:CONSULTANT)-[:EMPLOYS]->(fc:FIELD_CONSULTANT)-[:COVERS]->(c)
                OPTIONAL MATCH path2 = (cons2:CONSULTANT)-[:COVERS]->(c)
                OPTIONAL MATCH (any_cons:CONSULTANT)-[rating:RATES]->(any_prod:PRODUCT)
                
                // Collect all raw values AND count statistics in same query
                WITH 
                    COLLECT(DISTINCT c.sales_region) AS raw_sales_regions,
                    COLLECT(DISTINCT c.channel) AS raw_channels,
                    COLLECT(DISTINCT p.asset_class) AS raw_asset_classes,
                    COLLECT(DISTINCT c.pca) AS raw_company_pcas,
                    COLLECT(DISTINCT c.aca) AS raw_company_acas,
                    COLLECT(DISTINCT cons.pca) AS raw_consultant_pcas,
                    COLLECT(DISTINCT cons.consultant_advisor) AS raw_consultant_advisors,
                    COLLECT(DISTINCT {{id: cons.name, name: cons.name}}) + 
                    COLLECT(DISTINCT {{id: cons2.name, name: cons2.name}}) AS consultants,
                    COLLECT(DISTINCT {{id: fc.name, name: fc.name}}) AS field_consultants,
                    COLLECT(DISTINCT {{id: c.name, name: c.name}}) AS companies,
                    COLLECT(DISTINCT {{id: p.name, name: p.name}}) AS products,
                    COLLECT(DISTINCT {{id: ip.name, name: ip.name}}) AS incumbent_products,
                    COLLECT(DISTINCT rating.rankgroup) AS raw_ratings,
                    // STATISTICS - embedded in same query (minimal overhead)
                    COUNT(DISTINCT c) AS company_count,
                    COUNT(DISTINCT ip) AS incumbent_product_count,
                    COUNT(DISTINCT p) AS product_count,
                    COUNT(DISTINCT cons) + COUNT(DISTINCT cons2) AS consultant_count,
                    COUNT(DISTINCT fc) AS field_consultant_count,
                    COUNT(DISTINCT rating) AS rating_count
                
                RETURN {{
                    // Filter options (existing logic)
                    markets: CASE 
                        WHEN size(raw_sales_regions) = 0 THEN []
                        ELSE reduce(acc = [], item IN raw_sales_regions | 
                            acc + CASE WHEN item IS NULL THEN [] ELSE [item] END)
                        END,
                    channels: CASE 
                        WHEN size(raw_channels) = 0 THEN []
                        ELSE reduce(acc = [], item IN raw_channels | 
                            acc + CASE WHEN item IS NULL THEN [] ELSE [item] END)
                        END,
                    asset_classes: [item IN raw_asset_classes WHERE item IS NOT NULL],
                    consultants: [item IN consultants WHERE item.name IS NOT NULL],
                    field_consultants: [item IN field_consultants WHERE item.name IS NOT NULL],
                    companies: [item IN companies WHERE item.name IS NOT NULL],
                    products: [item IN products WHERE item.name IS NOT NULL],
                    incumbent_products: [item IN incumbent_products WHERE item.name IS NOT NULL],
                    client_advisors: CASE 
                        WHEN size(raw_company_pcas + raw_company_acas) = 0 THEN []
                        ELSE reduce(acc = [], item IN raw_company_pcas + raw_company_acas | 
                            acc + CASE WHEN item IS NULL THEN [] ELSE [item] END)
                        END,
                    consultant_advisors: CASE 
                        WHEN size(raw_consultant_pcas + raw_consultant_advisors) = 0 THEN []
                        ELSE reduce(acc = [], item IN raw_consultant_pcas + raw_consultant_advisors | 
                            acc + CASE WHEN item IS NULL THEN [] ELSE [item] END)
                        END,
                    ratings: [item IN raw_ratings WHERE item IS NOT NULL],
                    mandate_statuses: ['Active', 'At Risk', 'Conversion in Progress'],
                    influence_levels: ['1', '2', '3', '4', 'High', 'medium', 'low', 'UNK'],
                    
                    // EMBEDDED STATISTICS - no additional query overhead
                    _stats: {{
                        total_nodes: company_count + incumbent_product_count + product_count + consultant_count + field_consultant_count,
                        node_breakdown: {{
                            companies: company_count,
                            incumbent_products: incumbent_product_count,
                            products: product_count,
                            consultants: consultant_count,
                            field_consultants: field_consultant_count
                        }},
                        total_ratings: rating_count,
                        estimated_relationships: consultant_count * 2 + field_consultant_count + company_count + incumbent_product_count,
                        performance_level: CASE 
                            WHEN company_count + incumbent_product_count + product_count + consultant_count + field_consultant_count > 500 
                            THEN 'large_dataset'
                            WHEN company_count + incumbent_product_count + product_count + consultant_count + field_consultant_count > 200 
                            THEN 'medium_dataset'
                            ELSE 'optimal_dataset'
                        END,
                        filter_efficiency: {{
                            companies_available: size([item IN companies WHERE item.name IS NOT NULL]),
                            consultants_available: size([item IN consultants WHERE item.name IS NOT NULL]),
                            products_available: size([item IN products WHERE item.name IS NOT NULL])
                        }}
                    }}
                }} AS FilterOptionsWithStats
                """
            else:
                # Similar query for standard mode (without incumbent_products)
                filter_query = f"""
                MATCH (c:COMPANY) WHERE (c.region = $region OR $region IN c.region)
                OPTIONAL MATCH (c)-[:OWNS]->(p:PRODUCT)
                OPTIONAL MATCH path1 = (cons:CONSULTANT)-[:EMPLOYS]->(fc:FIELD_CONSULTANT)-[:COVERS]->(c)
                OPTIONAL MATCH path2 = (cons2:CONSULTANT)-[:COVERS]->(c)
                OPTIONAL MATCH (any_cons:CONSULTANT)-[rating:RATES]->(any_prod:PRODUCT)
                
                WITH 
                    COLLECT(DISTINCT c.sales_region) AS raw_sales_regions,
                    COLLECT(DISTINCT c.channel) AS raw_channels,
                    COLLECT(DISTINCT p.asset_class) AS raw_asset_classes,
                    COLLECT(DISTINCT c.pca) AS raw_company_pcas,
                    COLLECT(DISTINCT c.aca) AS raw_company_acas,
                    COLLECT(DISTINCT cons.pca) AS raw_consultant_pcas,
                    COLLECT(DISTINCT cons.consultant_advisor) AS raw_consultant_advisors,
                    COLLECT(DISTINCT {{id: cons.name, name: cons.name}}) + 
                    COLLECT(DISTINCT {{id: cons2.name, name: cons2.name}}) AS consultants,
                    COLLECT(DISTINCT {{id: fc.name, name: fc.name}}) AS field_consultants,
                    COLLECT(DISTINCT {{id: c.name, name: c.name}}) AS companies,
                    COLLECT(DISTINCT {{id: p.name, name: p.name}}) AS products,
                    COLLECT(DISTINCT rating.rankgroup) AS raw_ratings,
                    // STATISTICS for standard mode
                    COUNT(DISTINCT c) AS company_count,
                    COUNT(DISTINCT p) AS product_count,
                    COUNT(DISTINCT cons) + COUNT(DISTINCT cons2) AS consultant_count,
                    COUNT(DISTINCT fc) AS field_consultant_count,
                    COUNT(DISTINCT rating) AS rating_count
                
                RETURN {{
                    markets: CASE 
                        WHEN size(raw_sales_regions) = 0 THEN []
                        ELSE reduce(acc = [], item IN raw_sales_regions | 
                            acc + CASE WHEN item IS NULL THEN [] ELSE [item] END)
                        END,
                    channels: CASE 
                        WHEN size(raw_channels) = 0 THEN []
                        ELSE reduce(acc = [], item IN raw_channels | 
                            acc + CASE WHEN item IS NULL THEN [] ELSE [item] END)
                        END,
                    asset_classes: [item IN raw_asset_classes WHERE item IS NOT NULL],
                    consultants: [item IN consultants WHERE item.name IS NOT NULL],
                    field_consultants: [item IN field_consultants WHERE item.name IS NOT NULL],
                    companies: [item IN companies WHERE item.name IS NOT NULL],
                    products: [item IN products WHERE item.name IS NOT NULL],
                    client_advisors: CASE 
                        WHEN size(raw_company_pcas + raw_company_acas) = 0 THEN []
                        ELSE reduce(acc = [], item IN raw_company_pcas + raw_company_acas | 
                            acc + CASE WHEN item IS NULL THEN [] ELSE [item] END)
                        END,
                    consultant_advisors: CASE 
                        WHEN size(raw_consultant_pcas + raw_consultant_advisors) = 0 THEN []
                        ELSE reduce(acc = [], item IN raw_consultant_pcas + raw_consultant_advisors | 
                            acc + CASE WHEN item IS NULL THEN [] ELSE [item] END)
                        END,
                    ratings: [item IN raw_ratings WHERE item IS NOT NULL],
                    mandate_statuses: ['Active', 'At Risk', 'Conversion in Progress'],
                    influence_levels: ['1', '2', '3', '4', 'High', 'medium', 'low', 'UNK'],
                    
                    _stats: {{
                        total_nodes: company_count + product_count + consultant_count + field_consultant_count,
                        node_breakdown: {{
                            companies: company_count,
                            products: product_count,
                            consultants: consultant_count,
                            field_consultants: field_consultant_count
                        }},
                        total_ratings: rating_count,
                        estimated_relationships: consultant_count * 2 + field_consultant_count + company_count,
                        performance_level: CASE 
                            WHEN company_count + product_count + consultant_count + field_consultant_count > 500 
                            THEN 'large_dataset'
                            WHEN company_count + product_count + consultant_count + field_consultant_count > 200 
                            THEN 'medium_dataset'
                            ELSE 'optimal_dataset'
                        END,
                        filter_efficiency: {{
                            companies_available: size([item IN companies WHERE item.name IS NOT NULL]),
                            consultants_available: size([item IN consultants WHERE item.name IS NOT NULL]),
                            products_available: size([item IN products WHERE item.name IS NOT NULL])
                        }}
                    }}
                }} AS FilterOptionsWithStats
                """
            
            print(f"Executing enhanced filter options query with stats for region: {region}")
            result = session.run(filter_query, {"region": region})
            record = result.single()
            
            if record and record['FilterOptionsWithStats']:
                data = record['FilterOptionsWithStats']
                
                # Extract stats and filter options
                stats = data.pop('_stats', {})
                filter_options = data
                
                # Clean filter options (existing logic)
                for key, value in filter_options.items():
                    if isinstance(value, list):
                        if key in ['client_advisors', 'consultant_advisors']:
                            flattened_values = []
                            for v in value:
                                if v and str(v).strip():
                                    if ',' in str(v):
                                        flattened_values.extend([item.strip() for item in str(v).split(',') if item.strip()])
                                    else:
                                        flattened_values.append(str(v).strip())
                            filter_options[key] = list(set(flattened_values))[:MAX_FILTER_RESULTS]
                        elif key in ['consultants', 'field_consultants', 'companies', 'products', 'incumbent_products']:
                            filter_options[key] = [item for item in value if item and item.get('name')][:MAX_FILTER_RESULTS]
                        else:
                            filter_options[key] = [v for v in value if v][:MAX_FILTER_RESULTS]
                
                return {
                    "filter_options": filter_options,
                    "statistics": stats,
                    "performance_insights": {
                        "overhead_added": "minimal - embedded in existing query",
                        "query_count": 1,
                        "recommended_action": self._get_performance_recommendation(stats)
                    }
                }
            
            return {
                "filter_options": self._empty_filter_options(recommendations_mode),
                "statistics": {"total_nodes": 0, "total_relationships": 0},
                "performance_insights": {"status": "no_data"}
            }
            
        except Exception as e:
            print(f"ERROR in enhanced filter options with stats: {str(e)}")
            return {
                "filter_options": self._empty_filter_options(recommendations_mode),
                "statistics": {"error": str(e)},
                "performance_insights": {"status": "error"}
            }

    def _get_performance_recommendation(self, stats: Dict[str, Any]) -> str:
        """Generate performance recommendations based on statistics."""
        total_nodes = stats.get('total_nodes', 0)
        performance_level = stats.get('performance_level', 'unknown')
        
        if performance_level == 'large_dataset':
            return f"Dataset has {total_nodes} nodes. Apply filters to reduce to <500 nodes for optimal visualization."
        elif performance_level == 'medium_dataset':
            return f"Dataset has {total_nodes} nodes. Consider applying filters for faster rendering."
        else:
            return f"Dataset size ({total_nodes} nodes) is optimal for visualization."


    def _create_enhanced_summary_response(
        self, 
        region: str, 
        node_count: int, 
        filters: Dict[str, Any],
        recommendations_mode: bool,
        stats: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enhanced summary response with detailed statistics."""
        
        with self.driver.session() as session:
            filter_options = self._get_complete_filter_options(session, region, recommendations_mode)
            suggestions = self._generate_smart_suggestions(session, region, recommendations_mode)
        
        return {
            "success": True,
            "render_mode": "summary",
            "data": {
                "total_nodes": node_count,
                "message": f"Dataset contains {node_count} nodes. Apply filters to reduce below {MAX_GRAPH_NODES} nodes for optimal visualization.",
                "node_limit": MAX_GRAPH_NODES,
                "suggestions": suggestions
            },
            "filter_options": filter_options,
            "statistics": {
                **stats,
                "performance_blocked": True,
                "reduction_needed": node_count - MAX_GRAPH_NODES,
                "suggested_filter_impact": "60-80% node reduction"
            },
            "metadata": {
                "region": region,
                "mode": "recommendations" if recommendations_mode else "standard",
                "performance_limited": True,
                "server_side_processing": True
            }
        }

    # THEN ADD THE POST-PROCESSING METHOD:
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
    

    def _create_nlq_empty_response(
        self, 
        region: str, 
        recommendations_mode: bool, 
        filter_options: Dict[str, Any],
        nlq_mode: bool,
        nlq_cypher_query: str = None
    ) -> Dict[str, Any]:
        """Empty response for NLQ mode."""
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
                "query_mode": "nlq" if nlq_mode else "structured",
                "nlq_cypher_query": nlq_cypher_query,
                "server_side_processing": True,
                "empty_result": True,
                "filter_options_type": "complete_region_cached",
                "cache_used": True,
                "cache_type": "memory",
                "message": "No results found for custom Cypher query" if nlq_cypher_query else "No data found"
            }
        }

    def _create_nlq_summary_response(
        self, 
        region: str, 
        node_count: int, 
        applied_filters: Dict[str, Any],
        recommendations_mode: bool,
        filter_options: Dict[str, Any],
        nlq_mode: bool,
        nlq_cypher_query: str = None
    ) -> Dict[str, Any]:
        """Summary response for NLQ mode when dataset is too large."""
        
        # Generate suggestions (could be enhanced for NLQ)
        with self.driver.session() as session:
            suggestions = self._generate_smart_suggestions(session, region, recommendations_mode)
        
        return {
            "success": True,
            "render_mode": "summary",
            "data": {
                "total_nodes": node_count,
                "message": f"Your custom query returned {node_count} nodes. Please refine your Cypher query to reduce below {MAX_GRAPH_NODES} nodes.",
                "node_limit": MAX_GRAPH_NODES,
                "suggestions": suggestions,
                "original_query": "Custom Cypher query" if nlq_cypher_query else "Structured filters applied"
            },
            "filter_options": filter_options,
            "metadata": {
                "region": region,
                "mode": "recommendations" if recommendations_mode else "standard",
                "query_mode": "nlq" if nlq_mode else "structured",
                "nlq_cypher_query": nlq_cypher_query,
                "performance_limited": True,
                "server_side_processing": True,
                "cache_used": True,
                "cache_type": "memory",
                "refinement_needed": True
            }
        }

    def _enhance_nlq_query_with_ratings(self, base_cypher: str, recommendations_mode: bool) -> str:
        """
        Enhance NLQ Cypher query to include ratings collection and other WITH statements
        similar to build_optimized_union_query
        """
        # Check if the query already has ratings collection
        # if "RATES" in base_cypher.upper() or "rating" in base_cypher.lower():
        #     print("Query already has ratings collection, using as-is")
        #     return base_cypher
        
        # Parse the base query to extract the main RETURN statement
        if "RETURN" not in base_cypher.upper():
            print("No RETURN statement found, using query as-is")
            return base_cypher
        
        # Split at the RETURN statement and rebuild with enhanced processing
        parts = base_cypher.split("RETURN")
        if len(parts) < 2:
            return base_cypher
        
        base_query = parts[0].strip()
        
        # Build the enhanced query with the same WITH processing as build_optimized_union_query
        if recommendations_mode:
            enhanced_query = f"""
            {base_query}
            
            // Aggregate results - collect all including ratings (RECOMMENDATIONS MODE)
            WITH 
                COLLECT(DISTINCT consultant) as all_consultants,
                COLLECT(DISTINCT field_consultant) as all_field_consultants,
                COLLECT(DISTINCT company) as all_companies,
                COLLECT(DISTINCT incumbent_product) as all_incumbent_products,
                COLLECT(DISTINCT product) as all_products,
                COLLECT(DISTINCT rel1) + COLLECT(DISTINCT rel2) + COLLECT(DISTINCT rel3) + 
                COLLECT(DISTINCT rel4) + COLLECT(DISTINCT rel5) as all_relationships
            
            // Remove nulls and combine all nodes
            WITH 
                [x IN all_consultants WHERE x IS NOT NULL] as consultants,
                [x IN all_field_consultants WHERE x IS NOT NULL] as field_consultants,
                [x IN all_companies WHERE x IS NOT NULL] as companies,
                [x IN all_incumbent_products WHERE x IS NOT NULL] as incumbent_products,
                [x IN all_products WHERE x IS NOT NULL] as products,
                [x IN all_relationships WHERE x IS NOT NULL] as relationships
            
            WITH consultants + field_consultants + companies + incumbent_products + products as allNodes,
                relationships
            
            // Collect ratings from the RATES relationships we found
            UNWIND relationships AS rel
            WITH allNodes, relationships, 
                CASE WHEN type(rel) = 'RATES' THEN endNode(rel).id ELSE null END as rated_product_id,
                CASE WHEN type(rel) = 'RATES' THEN startNode(rel).name ELSE null END as rating_consultant_name,
                CASE WHEN type(rel) = 'RATES' THEN rel.rankgroup ELSE null END as rankgroup,
                CASE WHEN type(rel) = 'RATES' THEN rel.rankvalue ELSE null END as rankvalue
            
            WITH allNodes, relationships,
                rated_product_id,
                COLLECT({{
                    consultant: rating_consultant_name,
                    rankgroup: rankgroup,
                    rankvalue: rankvalue
                }}) as product_ratings
            
            WITH allNodes, relationships,
                COLLECT({{
                    product_id: rated_product_id,
                    ratings: [rating IN product_ratings WHERE rating.consultant IS NOT NULL | rating]
                }}) AS all_ratings_map
            
            // Final filtering and formatting - EXCLUDE RATES relationships from frontend
            WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL] AS filteredNodes, 
                [rel IN relationships WHERE rel IS NOT NULL AND type(rel) <> 'RATES'] AS filteredRels,
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
                relationships: [rel IN filteredRels | {{
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
            # Standard mode - same structure but without incumbent_products
            enhanced_query = f"""
            {base_query}
            
            // Aggregate results - collect all including ratings (STANDARD MODE)
            WITH 
                COLLECT(DISTINCT consultant) as all_consultants,
                COLLECT(DISTINCT field_consultant) as all_field_consultants,
                COLLECT(DISTINCT company) as all_companies,
                COLLECT(DISTINCT product) as all_products,
                COLLECT(DISTINCT rel1) + COLLECT(DISTINCT rel2) + COLLECT(DISTINCT rel3) + COLLECT(DISTINCT rel4) as all_relationships
            
            // Remove nulls and combine all nodes
            WITH 
                [x IN all_consultants WHERE x IS NOT NULL] as consultants,
                [x IN all_field_consultants WHERE x IS NOT NULL] as field_consultants,
                [x IN all_companies WHERE x IS NOT NULL] as companies,
                [x IN all_products WHERE x IS NOT NULL] as products,
                [x IN all_relationships WHERE x IS NOT NULL] as relationships
            
            WITH consultants + field_consultants + companies + products as allNodes,
                relationships
            
            // Collect ratings from RATES relationships
            UNWIND relationships AS rel
            WITH allNodes, relationships, 
                CASE WHEN type(rel) = 'RATES' THEN endNode(rel).id ELSE null END as rated_product_id,
                CASE WHEN type(rel) = 'RATES' THEN startNode(rel).name ELSE null END as rating_consultant_name,
                CASE WHEN type(rel) = 'RATES' THEN rel.rankgroup ELSE null END as rankgroup,
                CASE WHEN type(rel) = 'RATES' THEN rel.rankvalue ELSE null END as rankvalue

            WITH allNodes, relationships,
                rated_product_id,
                COLLECT({{
                    consultant: rating_consultant_name,
                    rankgroup: rankgroup,
                    rankvalue: rankvalue
                }}) as product_ratings
            
            WITH allNodes, relationships,
                COLLECT({{
                    product_id: rated_product_id,
                    ratings: [rating IN product_ratings WHERE rating.consultant IS NOT NULL | rating]
                }}) AS all_ratings_map
            
            // Final filtering - EXCLUDE RATES relationships from frontend
            WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL] AS filteredNodes, 
                [rel IN relationships WHERE rel IS NOT NULL AND type(rel) <> 'RATES'] AS filteredRels,
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
                relationships: [rel IN filteredRels | {{
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
        
        return enhanced_query
    

    def _enhance_ratings_with_main_consultant(self, nodes: List[Dict], relationships: List[Dict]) -> List[Dict]:
        """
        Post-process product nodes to identify main consultant from OWNS relationships.
        This is much more reliable than complex Cypher nested queries.
        UPDATED: Handles consultant as a list instead of a single string.
        UPDATED: Adds both owns_consultant (ID) and owns_consultant_name (name) mappings.
        """
        # Create mapping of product_id -> list of owns_consultants (IDs)
        owns_consultant_map = {}
        # Create mapping of product_id -> list of owns_consultant_names (names)
        owns_consultant_name_map = {}
        # Create mapping of consultant_id -> consultant_name for lookup
        consultant_id_to_name = {}
        
        # First pass: Build consultant ID to name mapping
        for node in nodes:
            if node.get('type') == 'CONSULTANT':
                node_data = node.get('data', {})
                consultant_id = node_data.get('id')
                consultant_name = node_data.get('name')
                if consultant_id and consultant_name:
                    consultant_id_to_name[consultant_id] = consultant_name
        
        print(f"Built consultant ID->Name mapping with {len(consultant_id_to_name)} entries")
        
        # Second pass: Extract consultant IDs from OWNS relationships
        for relationship in relationships:
            rel_data = relationship.get('data', {})
            if rel_data.get('relType') == 'OWNS' and relationship.get('target'):
                consultants = rel_data.get('consultant')
                
                # Handle both list and string formats for backward compatibility
                if consultants:
                    if isinstance(consultants, list):
                        consultant_list = consultants
                    else:
                        consultant_list = [consultants]
                    
                    product_id = relationship['target']
                    
                    # Store consultant IDs
                    if product_id not in owns_consultant_map:
                        owns_consultant_map[product_id] = []
                    owns_consultant_map[product_id].extend(consultant_list)
                    
                    # Map IDs to names and store
                    if product_id not in owns_consultant_name_map:
                        owns_consultant_name_map[product_id] = []
                    
                    for consultant_id in consultant_list:
                        consultant_name = consultant_id_to_name.get(consultant_id, consultant_id)
                        owns_consultant_name_map[product_id].append(consultant_name)
        
        # Remove duplicates from both consultant ID and name lists
        for product_id in owns_consultant_map:
            owns_consultant_map[product_id] = list(set(owns_consultant_map[product_id]))
        
        for product_id in owns_consultant_name_map:
            owns_consultant_name_map[product_id] = list(set(owns_consultant_name_map[product_id]))
        
        print(f"Found OWNS consultants for {len(owns_consultant_map)} products")
        print(f"Sample owns_consultant IDs: {dict(list(owns_consultant_map.items())[:3])}")
        print(f"Sample owns_consultant names: {dict(list(owns_consultant_name_map.items())[:3])}")
        
        # Enhance product nodes
        enhanced_nodes = []
        for node in nodes:
            node_data = node.get('data', {})
            
            # Only process PRODUCT and INCUMBENT_PRODUCT nodes
            if (node.get('type') in ['PRODUCT', 'INCUMBENT_PRODUCT'] and 
                node_data.get('ratings')):
                
                owns_consultants = owns_consultant_map.get(node['id'], [])
                owns_consultant_names = owns_consultant_name_map.get(node['id'], [])
                
                # Add both IDs and names to node data
                node_data['owns_consultants'] = owns_consultants  # List of consultant IDs
                node_data['consultant_name'] = owns_consultant_names  # List of consultant names (for frontend)
                
                # Enhance ratings with is_main_consultant flag
                enhanced_ratings = []
                for rating in node_data['ratings']:
                    enhanced_rating = dict(rating)  # Copy the rating
                    
                    # Check if this rating consultant is in the OWNS consultants list
                    rating_consultant_id = rating.get('consultant_id')
                    enhanced_rating['is_main_consultant'] = (
                        rating_consultant_id in owns_consultants if rating_consultant_id else False
                    )
                    enhanced_ratings.append(enhanced_rating)
                
                # Sort ratings: main consultants first, then alphabetically
                enhanced_ratings.sort(key=lambda r: (
                    not r.get('is_main_consultant', False),  # False sorts before True, so main consultant first
                    r.get('consultant', '')  # Then alphabetical
                ))
                
                node_data['ratings'] = enhanced_ratings
                
                main_consultant_count = sum(1 for r in enhanced_ratings if r.get('is_main_consultant'))
                print(f"Enhanced product {node['id']}: "
                    f"owns_consultants={owns_consultants}, "
                    f"consultant_names={owns_consultant_names}, "
                    f"main_consultant_ratings={main_consultant_count}, "
                    f"total_ratings={len(enhanced_ratings)}")
            
            enhanced_nodes.append(node)
        
        return enhanced_nodes

# Global service instance
complete_backend_filter_service = CompleteBackendFilterService()