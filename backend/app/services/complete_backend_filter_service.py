# services/complete_backend_filter_service.py - UPDATED with multiple query approach
"""
Complete backend filter service that handles ALL complex logic server-side.
Frontend only sends filter criteria and receives ready-to-render data.
NOW WITH MEMORY CACHING for filter options + MULTIPLE QUERY APPROACH for data completeness.
"""
import time
from typing import Dict, List, Any, Optional, Tuple
from neo4j import GraphDatabase, Session
from neo4j.exceptions import Neo4jError

from app.config import (
    NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE, REGIONS
)
# ADD THIS IMPORT
from app.services.memory_filter_cache import memory_filter_cache

# Performance constants
MAX_GRAPH_NODES = 500
MAX_FILTER_RESULTS = 400


class CompleteBackendFilterService:
    """Complete backend service - ALL complex logic moved from frontend + MEMORY CACHE + MULTIPLE QUERIES."""
    
    def __init__(self):
        self.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USERNAME, NEO4J_PASSWORD),
            database=NEO4J_DATABASE
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
        recommendations_mode: bool = False
    ) -> Dict[str, Any]:
        """
        UPDATED: Multiple query execution approach like proven working logic.
        """
        filters = filters or {}
        region = region.upper()
        has_filters_applied = any(filters.values())
        
        try:
            with self.driver.session() as session:
                print(f"Executing multiple query approach for {region} (filters applied: {has_filters_applied})")
                print("Filters:", filters)
                
                # Step 1: Execute multiple targeted queries and union results
                all_nodes, all_relationships = self._execute_multiple_queries_and_union(
                    session, region, filters, recommendations_mode
                )
                
                if not all_nodes:
                    # Use cached filter options for empty response
                    filter_options = self._get_cached_complete_filter_options(
                        session, region, recommendations_mode
                    )
                    return self._empty_response_with_cached_options(region, recommendations_mode, filter_options)

                # Step 2: Post-processing orphan removal
                all_nodes, all_relationships = self._remove_orphans_post_processing(all_nodes, all_relationships)
                
                print(f"Backend processing complete: {len(all_nodes)} nodes, {len(all_relationships)} relationships")
                
                # Step 3: Check performance limits
                if len(all_nodes) > MAX_GRAPH_NODES:
                    filter_options = self._get_cached_complete_filter_options(
                        session, region, recommendations_mode
                    )
                    return self._create_summary_response_with_cached_options(
                        region, len(all_nodes), filters, recommendations_mode, filter_options
                    )
                
                # Step 4: Calculate layout positions server-side
                positioned_nodes = self._calculate_layout_positions(all_nodes)
                
                # Step 5: Smart cache strategy for filter options
                if has_filters_applied and len(all_nodes) > 0:
                    filter_options = self._get_filtered_options_from_actual_data(all_nodes, region, recommendations_mode)
                    filter_options_type = "filtered_data"
                    cache_used = False
                    print(f"Using fresh filtered options from {len(all_nodes)} result nodes")
                else:
                    filter_options = self._get_cached_complete_filter_options(
                        session, region, recommendations_mode
                    )
                    filter_options_type = "complete_region_cached"
                    cache_used = True
                    print(f"Using CACHED complete region options")
                
                # Step 6: Return complete ready-to-render response
                return {
                    "success": True,
                    "render_mode": "graph",
                    "data": {
                        "nodes": positioned_nodes,
                        "relationships": all_relationships,
                        "total_nodes": len(all_nodes),
                        "total_relationships": len(all_relationships)
                    },
                    "filter_options": filter_options,
                    "metadata": {
                        "region": region,
                        "mode": "recommendations" if recommendations_mode else "standard",
                        "server_side_processing": True,
                        "filters_applied": filters,
                        "filter_options_type": filter_options_type,
                        "has_filters_applied": has_filters_applied,
                        "cache_used": cache_used,
                        "cache_type": "memory",
                        "processing_time_ms": int(time.time() * 1000),
                        "query_approach": "multiple_targeted_queries",
                        "optimizations": [
                            "Multiple targeted query execution",
                            "Memory-cached filter options",
                            "Pre-calculated layouts",
                            "Performance limiting",
                            "Context-aware filter options"
                        ]
                    }
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Multiple query processing failed: {str(e)}",
                "render_mode": "error"
            }

    def _execute_multiple_queries_and_union(
        self, 
        session: Session, 
        region: str, 
        filters: Dict[str, Any],
        recommendations_mode: bool
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        Execute multiple targeted queries and union results - like your proven approach.
        """
        
        # Build filter parameters
        params = self._build_filter_params(region, filters)
        
        # Execute 4 targeted queries based on mode
        if recommendations_mode:
            queries_and_params = self._build_recommendations_queries(params, filters)
        else:
            queries_and_params = self._build_standard_queries(params, filters)
        
        # Execute each query and collect results
        all_query_results = []
        
        for i, (query, query_params) in enumerate(queries_and_params, 1):
            print(f"Executing query {i}/{len(queries_and_params)}")
            try:
                result = session.run(query, query_params)
                records = list(result)
                
                if records:
                    graph_data = records[0]['GraphData']
                    query_result = {
                        'nodes': graph_data.get('nodes', []),
                        'relationships': graph_data.get('relationships', [])
                    }
                    all_query_results.append(query_result)
                    print(f"Query {i} returned: {len(query_result['nodes'])} nodes, {len(query_result['relationships'])} relationships")
                else:
                    print(f"Query {i} returned no data")
                    
            except Exception as e:
                print(f"Error in query {i}: {str(e)}")
                continue
        
        # Union all results (like your union_query_results function)
        return self._union_multiple_query_results(all_query_results)

    def _build_filter_params(self, region: str, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Build the parameter dictionary for queries."""
        params = {"region": region}
        
        # Add filter parameters (same as your working logic)
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
        
        return params

    def _build_filter_condition_helpers(self, filters: Dict[str, Any]):
        """Helper functions to build WHERE conditions - same as proven logic."""
        
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
        
        return {
            'build_company_conditions': build_company_conditions,
            'build_consultant_conditions': build_consultant_conditions,
            'build_product_conditions': build_product_conditions,
            'build_field_consultant_conditions': build_field_consultant_conditions,
            'build_mandate_conditions': build_mandate_conditions,
            'build_influence_conditions': build_influence_conditions,
            'combine_conditions': combine_conditions
        }

    def _build_recommendations_queries(
        self, 
        params: Dict[str, Any], 
        filters: Dict[str, Any]
    ) -> List[Tuple[str, Dict[str, Any]]]:
        """Build 4 separate queries for recommendations mode."""
        
        # Get helper functions
        helpers = self._build_filter_condition_helpers(filters)
        build_company_conditions = helpers['build_company_conditions']
        build_consultant_conditions = helpers['build_consultant_conditions']
        build_product_conditions = helpers['build_product_conditions']
        build_field_consultant_conditions = helpers['build_field_consultant_conditions']
        build_mandate_conditions = helpers['build_mandate_conditions']
        build_influence_conditions = helpers['build_influence_conditions']
        combine_conditions = helpers['combine_conditions']
        
        # Query 1: Consultant -> Field Consultant -> Company -> Incumbent Product -> Product
        query1 = f"""
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
        
        WITH 
            COLLECT(DISTINCT a) AS consultants,
            COLLECT(DISTINCT b) AS field_consultants,
            COLLECT(DISTINCT c) AS companies,
            COLLECT(DISTINCT ip) AS incumbent_products,
            COLLECT(DISTINCT p) AS products,
            COLLECT(DISTINCT f1) + COLLECT(DISTINCT i1) + COLLECT(DISTINCT h1) + COLLECT(DISTINCT r1) AS all_rels
        
        // Get ratings for products and incumbent products
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
        
        # Query 2: Consultant -> Company -> Incumbent Product -> Product (direct coverage)
        query2 = f"""
        OPTIONAL MATCH path2 = (a2:CONSULTANT)-[i2:COVERS]->(c2:COMPANY)
            -[h2:OWNS]->(ip2:INCUMBENT_PRODUCT)-[r2:BI_RECOMMENDS]->(p2:PRODUCT)  
        WHERE {combine_conditions([
            build_company_conditions('c2'),
            build_consultant_conditions('a2'),
            build_product_conditions('p2'),
            build_mandate_conditions('h2'),
            build_influence_conditions('i2')
        ])}
        
        WITH 
            COLLECT(DISTINCT a2) AS consultants,
            [] AS field_consultants,
            COLLECT(DISTINCT c2) AS companies,
            COLLECT(DISTINCT ip2) AS incumbent_products,
            COLLECT(DISTINCT p2) AS products,
            COLLECT(DISTINCT i2) + COLLECT(DISTINCT h2) + COLLECT(DISTINCT r2) AS all_rels
        
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
        
        # Query 3: Company-only paths for incumbent products
        query3 = f"""
        OPTIONAL MATCH path3 = (c3:COMPANY)-[h3:OWNS]->(ip3:INCUMBENT_PRODUCT)-[r3:BI_RECOMMENDS]->(p3:PRODUCT)
        WHERE {combine_conditions([
            build_company_conditions('c3'),
            build_product_conditions('p3'),
            build_mandate_conditions('h3')
        ])}
        
        WITH 
            [] AS consultants,
            [] AS field_consultants,
            COLLECT(DISTINCT c3) AS companies,
            COLLECT(DISTINCT ip3) AS incumbent_products,
            COLLECT(DISTINCT p3) AS products,
            COLLECT(DISTINCT h3) + COLLECT(DISTINCT r3) AS all_rels
        
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
        
        # Query 4: Field Consultant paths (when field consultant filters are applied)  
        query4 = f"""
        OPTIONAL MATCH path4 = (b4:FIELD_CONSULTANT)-[i4:COVERS]->(c4:COMPANY)
            -[h4:OWNS]->(ip4:INCUMBENT_PRODUCT)-[r4:BI_RECOMMENDS]->(p4:PRODUCT)
        WHERE {combine_conditions([
            build_company_conditions('c4'),
            build_product_conditions('p4'),
            build_field_consultant_conditions('b4'),
            build_mandate_conditions('h4'),
            build_influence_conditions('i4')
        ])}
        
        WITH 
            [] AS consultants,
            COLLECT(DISTINCT b4) AS field_consultants,
            COLLECT(DISTINCT c4) AS companies,
            COLLECT(DISTINCT ip4) AS incumbent_products,
            COLLECT(DISTINCT p4) AS products,
            COLLECT(DISTINCT i4) + COLLECT(DISTINCT h4) + COLLECT(DISTINCT r4) AS all_rels
        
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
        
        return [
            (query1, params),
            (query2, params),
            (query3, params),
            (query4, params)
        ]

    def _build_standard_queries(
        self, 
        params: Dict[str, Any], 
        filters: Dict[str, Any]
    ) -> List[Tuple[str, Dict[str, Any]]]:
        """Build 4 separate queries for standard mode (without incumbent products)."""
        
        # Get helper functions
        helpers = self._build_filter_condition_helpers(filters)
        build_company_conditions = helpers['build_company_conditions']
        build_consultant_conditions = helpers['build_consultant_conditions']
        build_product_conditions = helpers['build_product_conditions']
        build_field_consultant_conditions = helpers['build_field_consultant_conditions']
        build_mandate_conditions = helpers['build_mandate_conditions']
        build_influence_conditions = helpers['build_influence_conditions']
        combine_conditions = helpers['combine_conditions']
        
        # Query 1: Consultant -> Field Consultant -> Company -> Product
        query1 = f"""
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
        
        WITH 
            COLLECT(DISTINCT a) AS consultants,
            COLLECT(DISTINCT b) AS field_consultants,
            COLLECT(DISTINCT c) AS companies,
            COLLECT(DISTINCT p) AS products,
            COLLECT(DISTINCT f1) + COLLECT(DISTINCT i1) + COLLECT(DISTINCT g1) AS all_rels
        
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
        
        # Query 2: Consultant -> Company -> Product (direct coverage)
        query2 = f"""
        OPTIONAL MATCH path2 = (a2:CONSULTANT)-[i2:COVERS]->(c2:COMPANY)-[g2:OWNS]->(p2:PRODUCT)
        WHERE {combine_conditions([
            build_company_conditions('c2'),
            build_consultant_conditions('a2'),
            build_product_conditions('p2'),
            build_mandate_conditions('g2'),
            build_influence_conditions('i2')
        ])}
        
        WITH 
            COLLECT(DISTINCT a2) AS consultants,
            [] AS field_consultants,
            COLLECT(DISTINCT c2) AS companies,
            COLLECT(DISTINCT p2) AS products,
            COLLECT(DISTINCT i2) + COLLECT(DISTINCT g2) AS all_rels
        
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
        
        # Query 3: Company-product only relationships
        query3 = f"""
        OPTIONAL MATCH path3 = (c3:COMPANY)-[g3:OWNS]->(p3:PRODUCT)
        WHERE {combine_conditions([
            build_company_conditions('c3'),
            build_product_conditions('p3'),
            build_mandate_conditions('g3')
        ])}
        
        WITH 
            [] AS consultants,
            [] AS field_consultants,
            COLLECT(DISTINCT c3) AS companies,
            COLLECT(DISTINCT p3) AS products,
            COLLECT(DISTINCT g3) AS all_rels
        
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
        
        # Query 4: Field Consultant -> Company -> Product (when FC filters applied)
        query4 = f"""
        OPTIONAL MATCH path4 = (b4:FIELD_CONSULTANT)-[i4:COVERS]->(c4:COMPANY)-[g4:OWNS]->(p4:PRODUCT)
        WHERE {combine_conditions([
            build_company_conditions('c4'),
            build_product_conditions('p4'),
            build_field_consultant_conditions('b4'),
            build_mandate_conditions('g4'),
            build_influence_conditions('i4')
        ])}
        
        WITH 
            [] AS consultants,
            COLLECT(DISTINCT b4) AS field_consultants,
            COLLECT(DISTINCT c4) AS companies,
            COLLECT(DISTINCT p4) AS products,
            COLLECT(DISTINCT i4) + COLLECT(DISTINCT g4) AS all_rels
        
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
        
        return [
            (query1, params),
            (query2, params), 
            (query3, params),
            (query4, params)
        ]

    def _union_multiple_query_results(
        self, 
        all_query_results: List[Dict[str, List[Dict]]]
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        Union results from multiple queries - exactly like your union_query_results function.
        """
        if not all_query_results:
            return [], []
        
        if len(all_query_results) == 1:
            result = all_query_results[0]
            return result.get('nodes', []), result.get('relationships', [])
        
        # Combine nodes and relationships from all results
        all_nodes = []
        all_relationships = []
        
        # Track existing IDs to avoid duplicates
        existing_node_ids = set()
        existing_rel_ids = set()
        
        for result in all_query_results:
            # Process nodes
            for node in result.get('nodes', []):
                node_id = node.get('id')
                if node_id and node_id not in existing_node_ids:
                    all_nodes.append(node)
                    existing_node_ids.add(node_id)
            
            # Process relationships
            for rel in result.get('relationships', []):
                rel_id = rel.get('id')
                if rel_id and rel_id not in existing_rel_ids:
                    all_relationships.append(rel)
                    existing_rel_ids.add(rel_id)
        
        print(f"Union results: {len(all_nodes)} unique nodes, {len(all_relationships)} unique relationships from {len(all_query_results)} queries")
        
        return all_nodes, all_relationships
        

    def _execute_multiple_query_approach(
        self, 
        session: Session, 
        region: str, 
        filters: Dict[str, Any],
        recommendations_mode: bool
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        Execute multiple queries approach similar to the old system for complete data coverage.
        """
        print("Starting multiple query execution approach...")
        
        # Generate filter conditions
        filter_params = self._generate_filters(filters, region)
        
        if recommendations_mode:
            # 3 queries for recommendations mode (Query 4 now returns None)
            query_1 = self._create_query_1_with_recommendations(filter_params)
            query_2 = self._create_query_2_with_recommendations(filter_params)
            query_3 = self._create_query_3_with_recommendations(filter_params)
            query_4 = self._create_query_4_with_recommendations(filter_params)  # Returns None
            
            queries = [q for q in [query_1, query_2, query_3, query_4] if q is not None]
        else:
            # 3 queries for standard mode (Query 4 now returns None)
            query_1 = self._create_query_1_standard(filter_params)
            query_2 = self._create_query_2_standard(filter_params)
            query_3 = self._create_query_3_standard(filter_params)
            query_4 = self._create_query_4_standard(filter_params)  # Returns None
            
            queries = [q for q in [query_1, query_2, query_3, query_4] if q is not None]
        
        # Execute all queries and collect results
        all_results = []
        for i, query in enumerate(queries, 1):
            if query:  # Some queries might be None based on filters
                print(f"Executing query {i}/{len(queries)}")
                try:
                    result = session.run(query, filter_params)
                    records = list(result)
                    all_results.extend(records)
                    print(f"Query {i} returned {len(records)} records")
                except Exception as e:
                    print(f"Query {i} failed: {str(e)}")
                    continue
        
        # Union and deduplicate results
        all_nodes, all_relationships = self._union_query_results(all_results)
        
        # POST-PROCESS: Extract ratings from RATES relationships and attach to product nodes
        if all_nodes and all_relationships:
            print("Post-processing: Extracting ratings from relationships...")
            all_nodes = self._extract_and_attach_ratings_from_relationships(
                all_nodes, all_relationships, recommendations_mode
            )
            # Remove RATES relationships from the final graph
            print("Post-processing: Removing RATES relationships from graph...")
            all_relationships = self._remove_rates_relationships(all_relationships)
        
        return all_nodes, all_relationships

    def _generate_filters(self, filters: Dict[str, Any], region: str) -> Dict[str, Any]:
        """Generate filter parameters similar to the old approach."""
        filter_params = {"region": region}
        
        print(f"\n=== FILTER GENERATION DEBUG ===")
        print(f"Input filters: {filters}")
        print(f"Region: {region}")
        
        # Map new filter format to old parameter names
        if filters.get('productIds'):
            filter_params['product_names'] = filters['productIds']
            print(f"Added product_names: {filters['productIds']}")
        if filters.get('consultantIds'):
            filter_params['consultant_names'] = filters['consultantIds']
            print(f"Added consultant_names: {filters['consultantIds']}")
        if filters.get('clientIds'):
            filter_params['company_names'] = filters['clientIds']
            print(f"Added company_names: {filters['clientIds']}")
        if filters.get('fieldConsultantIds'):
            filter_params['field_consultant_names'] = filters['fieldConsultantIds']
            print(f"Added field_consultant_names: {filters['fieldConsultantIds']}")
        if filters.get('markets'):
            filter_params['market_names'] = filters['markets']
            print(f"Added market_names: {filters['markets']}")
        if filters.get('channels'):
            filter_params['channel_names'] = filters['channels']
            print(f"Added channel_names: {filters['channels']}")
        if filters.get('ratings'):
            filter_params['con_rankings'] = filters['ratings']
            print(f"Added con_rankings: {filters['ratings']}")
        if filters.get('influence_levels'):
            filter_params['loi'] = filters['influence_levels']
            print(f"Added loi: {filters['influence_levels']}")
        if filters.get('clientAdvisorIds'):
            filter_params['client_ca'] = filters['clientAdvisorIds']
            print(f"Added client_ca: {filters['clientAdvisorIds']}")
        if filters.get('consultantAdvisorIds'):
            filter_params['consultant_ca'] = filters['consultantAdvisorIds']
            print(f"Added consultant_ca: {filters['consultantAdvisorIds']}")
        if filters.get('assetClasses'):
            filter_params['asset_class'] = filters['assetClasses']
            print(f"Added asset_class: {filters['assetClasses']}")
        
        print(f"Final filter_params: {filter_params}")
        print("=" * 40)
        
        return filter_params

    def _create_complete_query_standard(self, filter_params: Dict[str, Any]) -> str:
        """
        Create complete query with all patterns unified - standard mode.
        Matches the original create_query approach.
        """
        # Build filter conditions
        filters = []
        
        # Product filters
        if 'product_names' in filter_params and filter_params['product_names']:
            filters.append("d.name IN $product_names")
        if 'consultant_names' in filter_params and filter_params['consultant_names']:
            filters.append("a.name IN $consultant_names")
        if 'company_names' in filter_params and filter_params['company_names']:
            filters.append("c.name IN $company_names")
        if 'field_consultant_names' in filter_params and filter_params['field_consultant_names']:
            filters.append("b.name IN $field_consultant_names")
        if 'market_names' in filter_params and filter_params['market_names']:
            filters.append("ANY(x IN $market_names WHERE x IN c.sales_region)")
        if 'channel_names' in filter_params and filter_params['channel_names']:
            filters.append("ANY(x IN $channel_names WHERE x IN c.channel)")
        if 'con_rankings' in filter_params and filter_params['con_rankings']:
            filters.append("j.rankgroup IN $con_rankings")
        if 'loi' in filter_params and filter_params['loi']:
            filters.append("f.level_of_influence IN $loi")
        if 'client_ca' in filter_params and filter_params['client_ca']:
            filters.append("(ANY(x IN $client_ca WHERE x IN c.pca) OR ANY(x IN $client_ca WHERE x IN c.aca))")
        if 'consultant_ca' in filter_params and filter_params['consultant_ca']:
            filters.append("(ANY(x IN $consultant_ca WHERE x IN a.pca) OR ANY(x IN $consultant_ca WHERE x IN a.consultant_advisor))")
        if 'asset_class' in filter_params and filter_params['asset_class']:
            filters.append("ANY(x IN $asset_class WHERE x IN d.asset_class)")
        
        where_clause = " WHERE " + " AND ".join(["(c.region = $region OR $region IN c.region)"] + filters) if filters else " WHERE (c.region = $region OR $region IN c.region)"
        
        return f"""
        CALL {{
            // Path 1: Full consultant chain
            MATCH (a:CONSULTANT)-[f:EMPLOYS]->(b:FIELD_CONSULTANT)-[i:COVERS]->(c:COMPANY)-[g:OWNS]->(d:PRODUCT)
            OPTIONAL MATCH (a)-[j:RATES]->(d)
            {where_clause}
            RETURN a as consultant, b as field_consultant, c as company, d as product,
                f as rel1, i as rel2, g as rel3, j as rel4
            
            UNION
            
            // Path 2: Direct consultant coverage
            MATCH (a:CONSULTANT)-[i:COVERS]->(c:COMPANY)-[g:OWNS]->(d:PRODUCT)
            OPTIONAL MATCH (a)-[j:RATES]->(d)
            {where_clause}
            RETURN a as consultant, null as field_consultant, c as company, d as product,
                i as rel1, null as rel2, g as rel3, j as rel4
            
            UNION
            
            // Path 3: Company standalone
            MATCH (c:COMPANY)-[g:OWNS]->(d:PRODUCT)
            {where_clause}
            RETURN null as consultant, null as field_consultant, c as company, d as product,
                null as rel1, null as rel2, g as rel3, null as rel4
        }}
        
        WITH consultant, field_consultant, company, product, rel1, rel2, rel3, rel4
        
        RETURN {{
            nodes: [consultant, field_consultant, company, product],
            relationships: [rel1, rel2, rel3, rel4]
        }} AS GraphData
        """

    def _create_fc_query_with_recommendations(self, filter_params: Dict[str, Any]) -> str:
        """FC Query with recommendations - Forward traversal"""
        filters = ["(c.region = $region OR $region IN c.region)"]
        
        if 'product_names' in filter_params and filter_params['product_names']:
            filters.append("p.name IN $product_names")
        if 'consultant_names' in filter_params and filter_params['consultant_names']:
            filters.append("a.name IN $consultant_names")
        if 'company_names' in filter_params and filter_params['company_names']:
            filters.append("c.name IN $company_names")
        if 'field_consultant_names' in filter_params and filter_params['field_consultant_names']:
            filters.append("b.name IN $field_consultant_names")
        if 'market_names' in filter_params and filter_params['market_names']:
            filters.append("ANY(x IN $market_names WHERE x IN c.sales_region)")
        if 'channel_names' in filter_params and filter_params['channel_names']:
            filters.append("ANY(x IN $channel_names WHERE x IN c.channel)")
        if 'con_rankings' in filter_params and filter_params['con_rankings']:
            filters.append("j.rankgroup IN $con_rankings")
        if 'loi' in filter_params and filter_params['loi']:
            filters.append("e.level_of_influence IN $loi")
        if 'client_ca' in filter_params and filter_params['client_ca']:
            filters.append("(ANY(x IN $client_ca WHERE x IN c.pca) OR ANY(x IN $client_ca WHERE x IN c.aca))")
        if 'consultant_ca' in filter_params and filter_params['consultant_ca']:
            filters.append("(ANY(x IN $consultant_ca WHERE x IN a.pca) OR ANY(x IN $consultant_ca WHERE x IN a.consultant_advisor))")
        if 'asset_class' in filter_params and filter_params['asset_class']:
            filters.append("ANY(x IN $asset_class WHERE x IN p.asset_class)")
        
        where_clause = " AND ".join(filters)
        
        return f"""
        optional match (a:CONSULTANT)-[e:EMPLOYS]->(b:FIELD_CONSULTANT)
        optional match (b:FIELD_CONSULTANT)-[f:COVERS]->(c:COMPANY)  
        optional match (c:COMPANY)-[h:OWNS]->(ip:INCUMBENT_PRODUCT)
        optional match (ip:INCUMBENT_PRODUCT)-[r:BI_RECOMMENDS]->(p:PRODUCT)
        optional match (a:CONSULTANT)-[j:RATES]->(p:PRODUCT)
        WHERE {where_clause}
        WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT b) + COLLECT(DISTINCT c) + COLLECT(DISTINCT ip) + COLLECT(DISTINCT p) AS allNodes,
             COLLECT(DISTINCT e) + COLLECT(DISTINCT f) + COLLECT(DISTINCT h) + COLLECT(DISTINCT r) + COLLECT(DISTINCT j) AS allRels
        WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL] AS filteredNodes,
             [rel IN allRels WHERE rel IS NOT NULL] AS filteredRels
        RETURN {{
            nodes: filteredNodes,
            relationships: filteredRels
        }} AS GraphData
        """

    def _create_fc_reverse_query_with_recommendations(self, filter_params: Dict[str, Any]) -> str:
        """FC Reverse Query with recommendations"""
        filters = ["(c.region = $region OR $region IN c.region)"]
        
        if 'product_names' in filter_params and filter_params['product_names']:
            filters.append("p.name IN $product_names")
        if 'consultant_names' in filter_params and filter_params['consultant_names']:
            filters.append("a.name IN $consultant_names")
        if 'company_names' in filter_params and filter_params['company_names']:
            filters.append("c.name IN $company_names")
        if 'field_consultant_names' in filter_params and filter_params['field_consultant_names']:
            filters.append("b.name IN $field_consultant_names")
        if 'market_names' in filter_params and filter_params['market_names']:
            filters.append("ANY(x IN $market_names WHERE x IN c.sales_region)")
        if 'channel_names' in filter_params and filter_params['channel_names']:
            filters.append("ANY(x IN $channel_names WHERE x IN c.channel)")
        if 'con_rankings' in filter_params and filter_params['con_rankings']:
            filters.append("j.rankgroup IN $con_rankings")
        if 'loi' in filter_params and filter_params['loi']:
            filters.append("e.level_of_influence IN $loi")
        if 'client_ca' in filter_params and filter_params['client_ca']:
            filters.append("(ANY(x IN $client_ca WHERE x IN c.pca) OR ANY(x IN $client_ca WHERE x IN c.aca))")
        if 'consultant_ca' in filter_params and filter_params['consultant_ca']:
            filters.append("(ANY(x IN $consultant_ca WHERE x IN a.pca) OR ANY(x IN $consultant_ca WHERE x IN a.consultant_advisor))")
        if 'asset_class' in filter_params and filter_params['asset_class']:
            filters.append("ANY(x IN $asset_class WHERE x IN p.asset_class)")
        
        where_clause = " AND ".join(filters)
        
        return f"""
        optional match (ip:INCUMBENT_PRODUCT)-[r:BI_RECOMMENDS]->(p:PRODUCT)
        optional match (c:COMPANY)-[h:OWNS]->(ip:INCUMBENT_PRODUCT)
        optional match (b:FIELD_CONSULTANT)-[f:COVERS]->(c:COMPANY)
        optional match (a:CONSULTANT)-[e:EMPLOYS]->(b:FIELD_CONSULTANT)
        optional match (a:CONSULTANT)-[j:RATES]->(p:PRODUCT)
        WHERE {where_clause}
        WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT b) + COLLECT(DISTINCT c) + COLLECT(DISTINCT ip) + COLLECT(DISTINCT p) AS allNodes,
             COLLECT(DISTINCT e) + COLLECT(DISTINCT f) + COLLECT(DISTINCT h) + COLLECT(DISTINCT r) + COLLECT(DISTINCT j) AS allRels
        WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL] AS filteredNodes,
             [rel IN allRels WHERE rel IS NOT NULL] AS filteredRels
        RETURN {{
            nodes: filteredNodes,
            relationships: filteredRels
        }} AS GraphData
        """

    def _create_no_fc_query_with_recommendations(self, filter_params: Dict[str, Any]) -> str:
        """No FC Query with recommendations - Direct consultant coverage"""
        filters = ["(c.region = $region OR $region IN c.region)"]
        
        if 'product_names' in filter_params and filter_params['product_names']:
            filters.append("p.name IN $product_names")
        if 'consultant_names' in filter_params and filter_params['consultant_names']:
            filters.append("a.name IN $consultant_names")
        if 'company_names' in filter_params and filter_params['company_names']:
            filters.append("c.name IN $company_names")
        if 'market_names' in filter_params and filter_params['market_names']:
            filters.append("ANY(x IN $market_names WHERE x IN c.sales_region)")
        if 'channel_names' in filter_params and filter_params['channel_names']:
            filters.append("ANY(x IN $channel_names WHERE x IN c.channel)")
        if 'con_rankings' in filter_params and filter_params['con_rankings']:
            filters.append("j.rankgroup IN $con_rankings")
        if 'loi' in filter_params and filter_params['loi']:
            filters.append("f.level_of_influence IN $loi")
        if 'client_ca' in filter_params and filter_params['client_ca']:
            filters.append("(ANY(x IN $client_ca WHERE x IN c.pca) OR ANY(x IN $client_ca WHERE x IN c.aca))")
        if 'consultant_ca' in filter_params and filter_params['consultant_ca']:
            filters.append("(ANY(x IN $consultant_ca WHERE x IN a.pca) OR ANY(x IN $consultant_ca WHERE x IN a.consultant_advisor))")
        if 'asset_class' in filter_params and filter_params['asset_class']:
            filters.append("ANY(x IN $asset_class WHERE x IN p.asset_class)")
        
        where_clause = " AND ".join(filters)
        
        return f"""
        optional match (a:CONSULTANT)-[f:COVERS]->(c:COMPANY)
        optional match (c:COMPANY)-[h:OWNS]->(ip:INCUMBENT_PRODUCT)
        optional match (ip:INCUMBENT_PRODUCT)-[r:BI_RECOMMENDS]->(p:PRODUCT)
        optional match (a:CONSULTANT)-[j:RATES]->(p:PRODUCT)
        WHERE {where_clause}
        WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT c) + COLLECT(DISTINCT ip) + COLLECT(DISTINCT p) AS allNodes,
             COLLECT(DISTINCT f) + COLLECT(DISTINCT h) + COLLECT(DISTINCT r) + COLLECT(DISTINCT j) AS allRels
        WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL] AS filteredNodes,
             [rel IN allRels WHERE rel IS NOT NULL] AS filteredRels
        RETURN {{
            nodes: filteredNodes,
            relationships: filteredRels
        }} AS GraphData
        """

    def _create_no_fc_reverse_query_with_recommendations(self, filter_params: Dict[str, Any]) -> str:
        """No FC Reverse Query with recommendations"""
        filters = ["(c.region = $region OR $region IN c.region)"]
        
        if 'product_names' in filter_params and filter_params['product_names']:
            filters.append("p.name IN $product_names")
        if 'consultant_names' in filter_params and filter_params['consultant_names']:
            filters.append("a.name IN $consultant_names")
        if 'company_names' in filter_params and filter_params['company_names']:
            filters.append("c.name IN $company_names")
        if 'market_names' in filter_params and filter_params['market_names']:
            filters.append("ANY(x IN $market_names WHERE x IN c.sales_region)")
        if 'channel_names' in filter_params and filter_params['channel_names']:
            filters.append("ANY(x IN $channel_names WHERE x IN c.channel)")
        if 'con_rankings' in filter_params and filter_params['con_rankings']:
            filters.append("j.rankgroup IN $con_rankings")
        if 'loi' in filter_params and filter_params['loi']:
            filters.append("f.level_of_influence IN $loi")
        if 'client_ca' in filter_params and filter_params['client_ca']:
            filters.append("(ANY(x IN $client_ca WHERE x IN c.pca) OR ANY(x IN $client_ca WHERE x IN c.aca))")
        if 'consultant_ca' in filter_params and filter_params['consultant_ca']:
            filters.append("(ANY(x IN $consultant_ca WHERE x IN a.pca) OR ANY(x IN $consultant_ca WHERE x IN a.consultant_advisor))")
        if 'asset_class' in filter_params and filter_params['asset_class']:
            filters.append("ANY(x IN $asset_class WHERE x IN p.asset_class)")
        
        where_clause = " AND ".join(filters)
        
        return f"""
        optional match (ip:INCUMBENT_PRODUCT)-[r:BI_RECOMMENDS]->(p:PRODUCT)
        optional match (c:COMPANY)-[h:OWNS]->(ip:INCUMBENT_PRODUCT)
        optional match (a:CONSULTANT)-[f:COVERS]->(c:COMPANY)
        optional match (a:CONSULTANT)-[j:RATES]->(p:PRODUCT)
        WHERE {where_clause}
        WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT c) + COLLECT(DISTINCT ip) + COLLECT(DISTINCT p) AS allNodes,
             COLLECT(DISTINCT f) + COLLECT(DISTINCT h) + COLLECT(DISTINCT r) + COLLECT(DISTINCT j) AS allRels
        WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL] AS filteredNodes,
             [rel IN allRels WHERE rel IS NOT NULL] AS filteredRels
        RETURN {{
            nodes: filteredNodes,
            relationships: filteredRels
        }} AS GraphData
        """
        """
        Create complete query with all patterns unified - recommendations mode.
        Matches the original create_query approach.
        """
        # Build filter conditions (similar but for recommendations)
        filters = []
        
        if 'product_names' in filter_params and filter_params['product_names']:
            filters.append("p.name IN $product_names")
        if 'consultant_names' in filter_params and filter_params['consultant_names']:
            filters.append("a.name IN $consultant_names")
        if 'company_names' in filter_params and filter_params['company_names']:
            filters.append("c.name IN $company_names")
        if 'field_consultant_names' in filter_params and filter_params['field_consultant_names']:
            filters.append("b.name IN $field_consultant_names")
        if 'market_names' in filter_params and filter_params['market_names']:
            filters.append("ANY(x IN $market_names WHERE x IN c.sales_region)")
        if 'channel_names' in filter_params and filter_params['channel_names']:
            filters.append("ANY(x IN $channel_names WHERE x IN c.channel)")
        if 'con_rankings' in filter_params and filter_params['con_rankings']:
            filters.append("j.rankgroup IN $con_rankings")
        if 'loi' in filter_params and filter_params['loi']:
            filters.append("f.level_of_influence IN $loi")
        if 'client_ca' in filter_params and filter_params['client_ca']:
            filters.append("(ANY(x IN $client_ca WHERE x IN c.pca) OR ANY(x IN $client_ca WHERE x IN c.aca))")
        if 'consultant_ca' in filter_params and filter_params['consultant_ca']:
            filters.append("(ANY(x IN $consultant_ca WHERE x IN a.pca) OR ANY(x IN $consultant_ca WHERE x IN a.consultant_advisor))")
        if 'asset_class' in filter_params and filter_params['asset_class']:
            filters.append("ANY(x IN $asset_class WHERE x IN p.asset_class)")
        
        where_clause = " WHERE " + " AND ".join(["(c.region = $region OR $region IN c.region)"] + filters) if filters else " WHERE (c.region = $region OR $region IN c.region)"
        
        return f"""
        CALL {{
            // Path 1: Full consultant chain with recommendations
            MATCH (a:CONSULTANT)-[f:EMPLOYS]->(b:FIELD_CONSULTANT)-[i:COVERS]->(c:COMPANY)-[h:OWNS]->(ip:INCUMBENT_PRODUCT)-[r:BI_RECOMMENDS]->(p:PRODUCT)
            OPTIONAL MATCH (a)-[j:RATES]->(p)
            {where_clause}
            RETURN a as consultant, b as field_consultant, c as company, ip as incumbent_product, p as product,
                f as rel1, i as rel2, h as rel3, r as rel4, j as rel5
            
            UNION
            
            // Path 2: Direct consultant coverage with recommendations
            MATCH (a:CONSULTANT)-[i:COVERS]->(c:COMPANY)-[h:OWNS]->(ip:INCUMBENT_PRODUCT)-[r:BI_RECOMMENDS]->(p:PRODUCT)
            OPTIONAL MATCH (a)-[j:RATES]->(p)
            {where_clause}
            RETURN a as consultant, null as field_consultant, c as company, ip as incumbent_product, p as product,
                i as rel1, null as rel2, h as rel3, r as rel4, j as rel5
            
            UNION
            
            // Path 3: Company standalone with recommendations
            MATCH (c:COMPANY)-[h:OWNS]->(ip:INCUMBENT_PRODUCT)-[r:BI_RECOMMENDS]->(p:PRODUCT)
            {where_clause}
            RETURN null as consultant, null as field_consultant, c as company, ip as incumbent_product, p as product,
                null as rel1, null as rel2, h as rel3, r as rel4, null as rel5
        }}
        
        WITH consultant, field_consultant, company, incumbent_product, product, rel1, rel2, rel3, rel4, rel5
        
        RETURN {{
            nodes: [consultant, field_consultant, company, incumbent_product, product],
            relationships: [rel1, rel2, rel3, rel4, rel5]
        }} AS GraphData
        """
        """
        Query 1: Full path CONSULTANT -> FIELD_CONSULTANT -> COMPANY -> PRODUCT
        """
        where_conditions = []
        
        # Region filter (required)
        where_conditions.append("(c.region = $region OR $region IN c.region)")
        
        # Add optional filters
        if 'product_names' in filter_params:
            where_conditions.append("d.name IN $product_names")
        if 'consultant_names' in filter_params:
            where_conditions.append("a.name IN $consultant_names")
        if 'company_names' in filter_params:
            where_conditions.append("c.name IN $company_names")
        if 'field_consultant_names' in filter_params:
            where_conditions.append("b.name IN $field_consultant_names")
        if 'market_names' in filter_params:
            where_conditions.append("ANY(x IN $market_names WHERE x IN c.sales_region)")
        if 'channel_names' in filter_params:
            where_conditions.append("ANY(x IN $channel_names WHERE x IN c.channel)")
        if 'con_rankings' in filter_params:
            where_conditions.append("j.rankgroup IN $con_rankings")
        if 'loi' in filter_params:
            where_conditions.append("f.level_of_influence IN $loi")
        if 'client_ca' in filter_params:
            where_conditions.append("(ANY(x IN $client_ca WHERE x IN c.pca) OR ANY(x IN $client_ca WHERE x IN c.aca))")
        if 'consultant_ca' in filter_params:
            where_conditions.append("(ANY(x IN $consultant_ca WHERE x IN a.pca) OR ANY(x IN $consultant_ca WHERE x IN a.consultant_advisor))")
        if 'asset_class' in filter_params:
            where_conditions.append("ANY(x IN $asset_class WHERE x IN d.asset_class)")
        
        where_clause = " AND ".join(where_conditions)
        
        return f"""
        OPTIONAL MATCH (a:CONSULTANT)-[f:EMPLOYS]->(b:FIELD_CONSULTANT)-[i:COVERS]->(c:COMPANY)-[g:OWNS]->(d:PRODUCT)
        OPTIONAL MATCH (a)-[j:RATES]->(d)
        WHERE {where_clause}
        WITH a,b,c,d,f,g,i,j
        RETURN {{
            nodes: [a,b,c,d],
            relationships: [f,i,g,j]
        }} AS GraphData
        """

    def _create_query_2_standard(self, filter_params: Dict[str, Any]) -> str:
        """
        Query 2: Direct consultant coverage CONSULTANT -> COMPANY -> PRODUCT
        """
        where_conditions = []
        
        # Region filter (required)
        where_conditions.append("(c.region = $region OR $region IN c.region)")
        
        # Add optional filters
        if 'product_names' in filter_params:
            where_conditions.append("d.name IN $product_names")
        if 'consultant_names' in filter_params:
            where_conditions.append("a.name IN $consultant_names")
        if 'company_names' in filter_params:
            where_conditions.append("c.name IN $company_names")
        if 'market_names' in filter_params:
            where_conditions.append("ANY(x IN $market_names WHERE x IN c.sales_region)")
        if 'channel_names' in filter_params:
            where_conditions.append("ANY(x IN $channel_names WHERE x IN c.channel)")
        if 'con_rankings' in filter_params:
            where_conditions.append("j.rankgroup IN $con_rankings")
        if 'loi' in filter_params:
            where_conditions.append("i.level_of_influence IN $loi")
        if 'client_ca' in filter_params:
            where_conditions.append("(ANY(x IN $client_ca WHERE x IN c.pca) OR ANY(x IN $client_ca WHERE x IN c.aca))")
        if 'consultant_ca' in filter_params:
            where_conditions.append("(ANY(x IN $consultant_ca WHERE x IN a.pca) OR ANY(x IN $consultant_ca WHERE x IN a.consultant_advisor))")
        if 'asset_class' in filter_params:
            where_conditions.append("ANY(x IN $asset_class WHERE x IN d.asset_class)")
        
        where_clause = " AND ".join(where_conditions)
        
        return f"""
        OPTIONAL MATCH (a:CONSULTANT)-[i:COVERS]->(c:COMPANY)-[g:OWNS]->(d:PRODUCT)
        OPTIONAL MATCH (a)-[j:RATES]->(d)
        WHERE {where_clause}
        WITH a,c,d,i,g,j
        RETURN {{
            nodes: [a,c,d],
            relationships: [i,g,j]
        }} AS GraphData
        """

    def _create_query_3_standard(self, filter_params: Dict[str, Any]) -> str:
        """
        Query 3: Company-Product relationships only
        """
        where_conditions = []
        
        # Region filter (required)
        where_conditions.append("(c.region = $region OR $region IN c.region)")
        
        # Add optional filters
        if 'product_names' in filter_params:
            where_conditions.append("d.name IN $product_names")
        if 'company_names' in filter_params:
            where_conditions.append("c.name IN $company_names")
        if 'market_names' in filter_params:
            where_conditions.append("ANY(x IN $market_names WHERE x IN c.sales_region)")
        if 'channel_names' in filter_params:
            where_conditions.append("ANY(x IN $channel_names WHERE x IN c.channel)")
        if 'client_ca' in filter_params:
            where_conditions.append("(ANY(x IN $client_ca WHERE x IN c.pca) OR ANY(x IN $client_ca WHERE x IN c.aca))")
        if 'asset_class' in filter_params:
            where_conditions.append("ANY(x IN $asset_class WHERE x IN d.asset_class)")
        
        where_clause = " AND ".join(where_conditions)
        
        return f"""
        OPTIONAL MATCH (c:COMPANY)-[g:OWNS]->(d:PRODUCT)
        WHERE {where_clause}
        WITH c,d,g
        RETURN {{
            nodes: [c,d],
            relationships: [g]
        }} AS GraphData
        """

    def _create_query_4_standard(self, filter_params: Dict[str, Any]) -> str:
        """
        Query 4: Consultant-Product ratings only
        """
        where_conditions = []
        
        # Add optional filters
        if 'product_names' in filter_params:
            where_conditions.append("d.name IN $product_names")
        if 'consultant_names' in filter_params:
            where_conditions.append("a.name IN $consultant_names")
        if 'con_rankings' in filter_params:
            where_conditions.append("j.rankgroup IN $con_rankings")
        if 'consultant_ca' in filter_params:
            where_conditions.append("(ANY(x IN $consultant_ca WHERE x IN a.pca) OR ANY(x IN $consultant_ca WHERE x IN a.consultant_advisor))")
        if 'asset_class' in filter_params:
            where_conditions.append("ANY(x IN $asset_class WHERE x IN d.asset_class)")
        
        where_clause = " AND ".join(where_conditions) if where_conditions else "true"
        
        return f"""
        OPTIONAL MATCH (a:CONSULTANT)-[j:RATES]->(d:PRODUCT)
        WHERE {where_clause}
        WITH a,d,j
        RETURN {{
            nodes: [a,d],
            relationships: [j]
        }} AS GraphData
        """

    def _create_query_1_with_recommendations(self, filter_params: Dict[str, Any]) -> str:
        """
        Query 1 with recommendations: CONSULTANT -> FIELD_CONSULTANT -> COMPANY -> INCUMBENT_PRODUCT -> PRODUCT
        """
        where_conditions = []
        
        # Region filter (required)
        where_conditions.append("(c.region = $region OR $region IN c.region)")
        
        # Add optional filters
        if 'product_names' in filter_params:
            where_conditions.append("p.name IN $product_names")
        if 'consultant_names' in filter_params:
            where_conditions.append("a.name IN $consultant_names")
        if 'company_names' in filter_params:
            where_conditions.append("c.name IN $company_names")
        if 'field_consultant_names' in filter_params:
            where_conditions.append("b.name IN $field_consultant_names")
        if 'market_names' in filter_params:
            where_conditions.append("ANY(x IN $market_names WHERE x IN c.sales_region)")
        if 'channel_names' in filter_params:
            where_conditions.append("ANY(x IN $channel_names WHERE x IN c.channel)")
        if 'con_rankings' in filter_params:
            where_conditions.append("j.rankgroup IN $con_rankings")
        if 'loi' in filter_params:
            where_conditions.append("f.level_of_influence IN $loi")
        if 'client_ca' in filter_params:
            where_conditions.append("(ANY(x IN $client_ca WHERE x IN c.pca) OR ANY(x IN $client_ca WHERE x IN c.aca))")
        if 'consultant_ca' in filter_params:
            where_conditions.append("(ANY(x IN $consultant_ca WHERE x IN a.pca) OR ANY(x IN $consultant_ca WHERE x IN a.consultant_advisor))")
        if 'asset_class' in filter_params:
            where_conditions.append("ANY(x IN $asset_class WHERE x IN p.asset_class)")
        
        where_clause = " AND ".join(where_conditions)
        
        return f"""
        OPTIONAL MATCH (a:CONSULTANT)-[f:EMPLOYS]->(b:FIELD_CONSULTANT)-[i:COVERS]->(c:COMPANY)-[h:OWNS]->(ip:INCUMBENT_PRODUCT)-[r:BI_RECOMMENDS]->(p:PRODUCT)
        OPTIONAL MATCH (a)-[j:RATES]->(p)
        WHERE {where_clause}
        WITH a,b,c,ip,p,f,i,h,r,j
        RETURN {{
            nodes: [a,b,c,ip,p],
            relationships: [f,i,h,r,j]
        }} AS GraphData
        """

    def _create_query_2_with_recommendations(self, filter_params: Dict[str, Any]) -> str:
        """
        Query 2 with recommendations: CONSULTANT -> COMPANY -> INCUMBENT_PRODUCT -> PRODUCT
        """
        where_conditions = []
        
        # Region filter (required)
        where_conditions.append("(c.region = $region OR $region IN c.region)")
        
        # Add optional filters
        if 'product_names' in filter_params:
            where_conditions.append("p.name IN $product_names")
        if 'consultant_names' in filter_params:
            where_conditions.append("a.name IN $consultant_names")
        if 'company_names' in filter_params:
            where_conditions.append("c.name IN $company_names")
        if 'market_names' in filter_params:
            where_conditions.append("ANY(x IN $market_names WHERE x IN c.sales_region)")
        if 'channel_names' in filter_params:
            where_conditions.append("ANY(x IN $channel_names WHERE x IN c.channel)")
        if 'con_rankings' in filter_params:
            where_conditions.append("j.rankgroup IN $con_rankings")
        if 'loi' in filter_params:
            where_conditions.append("i.level_of_influence IN $loi")
        if 'client_ca' in filter_params:
            where_conditions.append("(ANY(x IN $client_ca WHERE x IN c.pca) OR ANY(x IN $client_ca WHERE x IN c.aca))")
        if 'consultant_ca' in filter_params:
            where_conditions.append("(ANY(x IN $consultant_ca WHERE x IN a.pca) OR ANY(x IN $consultant_ca WHERE x IN a.consultant_advisor))")
        if 'asset_class' in filter_params:
            where_conditions.append("ANY(x IN $asset_class WHERE x IN p.asset_class)")
        
        where_clause = " AND ".join(where_conditions)
        
        return f"""
        OPTIONAL MATCH (a:CONSULTANT)-[i:COVERS]->(c:COMPANY)-[h:OWNS]->(ip:INCUMBENT_PRODUCT)-[r:BI_RECOMMENDS]->(p:PRODUCT)
        OPTIONAL MATCH (a)-[j:RATES]->(p)
        WHERE {where_clause}
        WITH a,c,ip,p,i,h,r,j
        RETURN {{
            nodes: [a,c,ip,p],
            relationships: [i,h,r,j]
        }} AS GraphData
        """

    def _create_query_3_with_recommendations(self, filter_params: Dict[str, Any]) -> str:
        """
        Query 3 with recommendations: COMPANY -> INCUMBENT_PRODUCT -> PRODUCT
        """
        where_conditions = []
        
        # Region filter (required)
        where_conditions.append("(c.region = $region OR $region IN c.region)")
        
        # Add optional filters
        if 'product_names' in filter_params:
            where_conditions.append("p.name IN $product_names")
        if 'company_names' in filter_params:
            where_conditions.append("c.name IN $company_names")
        if 'market_names' in filter_params:
            where_conditions.append("ANY(x IN $market_names WHERE x IN c.sales_region)")
        if 'channel_names' in filter_params:
            where_conditions.append("ANY(x IN $channel_names WHERE x IN c.channel)")
        if 'client_ca' in filter_params:
            where_conditions.append("(ANY(x IN $client_ca WHERE x IN c.pca) OR ANY(x IN $client_ca WHERE x IN c.aca))")
        if 'asset_class' in filter_params:
            where_conditions.append("ANY(x IN $asset_class WHERE x IN p.asset_class)")
        
        where_clause = " AND ".join(where_conditions)
        
        return f"""
        OPTIONAL MATCH (c:COMPANY)-[h:OWNS]->(ip:INCUMBENT_PRODUCT)-[r:BI_RECOMMENDS]->(p:PRODUCT)
        WHERE {where_clause}
        WITH c,ip,p,h,r
        RETURN {{
            nodes: [c,ip,p],
            relationships: [h,r]
        }} AS GraphData
        """

    def _create_query_4_with_recommendations(self, filter_params: Dict[str, Any]) -> str:
        """
        Query 4 with recommendations: CONSULTANT -> PRODUCT/INCUMBENT_PRODUCT ratings
        """
        where_conditions = []
        
        # Add optional filters
        if 'product_names' in filter_params:
            where_conditions.append("(p.name IN $product_names OR ip.name IN $product_names)")
        if 'consultant_names' in filter_params:
            where_conditions.append("a.name IN $consultant_names")
        if 'con_rankings' in filter_params:
            where_conditions.append("(j1.rankgroup IN $con_rankings OR j2.rankgroup IN $con_rankings)")
        if 'consultant_ca' in filter_params:
            where_conditions.append("(ANY(x IN $consultant_ca WHERE x IN a.pca) OR ANY(x IN $consultant_ca WHERE x IN a.consultant_advisor))")
        if 'asset_class' in filter_params:
            where_conditions.append("(ANY(x IN $asset_class WHERE x IN p.asset_class) OR ANY(x IN $asset_class WHERE x IN ip.asset_class))")
        
        where_clause = " AND ".join(where_conditions) if where_conditions else "true"
        
        return f"""
        OPTIONAL MATCH (a:CONSULTANT)-[j1:RATES]->(p:PRODUCT)
        OPTIONAL MATCH (a:CONSULTANT)-[j2:RATES]->(ip:INCUMBENT_PRODUCT)
        WHERE {where_clause}
        WITH a,p,ip,j1,j2
        RETURN {{
            nodes: [a,p,ip],
            relationships: [j1,j2]
        }} AS GraphData
        """

    def _union_query_results(self, args: List[Any]) -> Tuple[List[Dict], List[Dict]]:
        """
        Union results from multiple queries, similar to the old approach.
        """
        print(f"Processing {len(args)} query result records...")
        
        # Extract all nodes and relationships from all query results
        all_nodes = []
        all_relationships = []
        existing_node_ids = set()
        existing_rel_ids = set()
        
        for record in args:
            print(f"Processing record: {type(record)}")
            
            # The record should have GraphData
            if record:
                graph_data = record['GraphData']
                print(f"Found GraphData: {type(graph_data)}")
            elif hasattr(record, 'GraphData'):
                graph_data = record.GraphData
                print(f"Found record.GraphData: {type(graph_data)}")
            else:
                print(f"No GraphData found in record: {record}")
                continue
            
            if not graph_data:
                print("GraphData is empty or None")
                continue
                
            # Process nodes
            nodes = graph_data.get('nodes', [])
            print(f"Processing {len(nodes)} nodes from this record")
            
            for node in nodes:
                if node is None:
                    continue
                    
                # Handle Neo4j node objects
                if hasattr(node, 'id') and hasattr(node, 'labels'):
                    node_id = str(node.id)
                    node_labels = list(node.labels)
                    node_props = dict(node)
                    
                    if node_id not in existing_node_ids:
                        formatted_node = {
                            'id': node_id,
                            'type': node_labels[0] if node_labels else 'UNKNOWN',
                            'data': {
                                'id': node_id,
                                'name': node_props.get('name', node_id),
                                'label': node_props.get('name', node_id),
                                'region': node_props.get('region'),
                                'channel': node_props.get('channel'),
                                'sales_region': node_props.get('sales_region'),
                                'asset_class': node_props.get('asset_class'),
                                'pca': node_props.get('pca'),
                                'aca': node_props.get('aca'),
                                'consultant_advisor': node_props.get('consultant_advisor'),
                                'mandate_status': node_props.get('mandate_status')
                            }
                        }
                        all_nodes.append(formatted_node)
                        existing_node_ids.add(node_id)
                        print(f"Added node: {node_id} ({node_labels[0] if node_labels else 'UNKNOWN'})")
            
            # Process relationships
            relationships = graph_data.get('relationships', [])
            print(f"Processing {len(relationships)} relationships from this record")
            
            for rel in relationships:
                if rel is None:
                    continue
                    
                # Handle Neo4j relationship objects
                if hasattr(rel, 'start_node') and hasattr(rel, 'end_node') and hasattr(rel, 'type'):
                    source_id = str(rel.start_node.id)
                    target_id = str(rel.end_node.id)
                    rel_type = rel.type
                    rel_props = dict(rel)
                    
                    rel_id = f"{source_id}:{target_id}:{rel_type}"
                    
                    if rel_id not in existing_rel_ids:
                        formatted_rel = {
                            'id': rel_id,
                            'source': source_id,
                            'target': target_id,
                            'type': 'custom',
                            'data': {
                                'relType': rel_type,
                                'sourceId': source_id,
                                'targetId': target_id,
                                'rankgroup': rel_props.get('rankgroup'),
                                'rankvalue': rel_props.get('rankvalue'),
                                'rankorder': rel_props.get('rankorder'),
                                'rating_change': rel_props.get('rating_change'),
                                'level_of_influence': rel_props.get('level_of_influence'),
                                'mandate_status': rel_props.get('mandate_status'),
                                'consultant': rel_props.get('consultant'),
                                'manager': rel_props.get('manager'),
                                'commitment_market_value': rel_props.get('commitment_market_value'),
                                'manager_since_date': rel_props.get('manager_since_date'),
                                'multi_mandate_manager': rel_props.get('multi_mandate_manager'),
                                'annualised_alpha_summary': rel_props.get('annualised_alpha_summary'),
                                'batting_average_summary': rel_props.get('batting_average_summary'),
                                'downside_market_capture_summary': rel_props.get('downside_market_capture_summary'),
                                'information_ratio_summary': rel_props.get('information_ratio_summary'),
                                'opportunity_type': rel_props.get('opportunity_type'),
                                'returns': rel_props.get('returns'),
                                'returns_summary': rel_props.get('returns_summary'),
                                'standard_deviation_summary': rel_props.get('standard_deviation_summary'),
                                'upside_market_capture_summary': rel_props.get('upside_market_capture_summary')
                            }
                        }
                        all_relationships.append(formatted_rel)
                        existing_rel_ids.add(rel_id)
                        print(f"Added relationship: {rel_type} from {source_id} to {target_id}")
        
        print(f"Union results: {len(all_nodes)} unique nodes, {len(all_relationships)} unique relationships")
        return all_nodes, all_relationships

    def _extract_and_attach_ratings_from_relationships(
        self,
        nodes: List[Dict],
        relationships: List[Dict],
        recommendations_mode: bool
    ) -> List[Dict]:
        """
        Extract ratings from RATES relationships and attach to product nodes.
        Format matches the original _build_complete_query approach.
        """
        print("Extracting ratings from RATES relationships...")
        
        # Build a map of product nodes by ID
        product_nodes_map = {}
        for node in nodes:
            node_type = node.get('type')
            if node_type == 'PRODUCT' or (recommendations_mode and node_type == 'INCUMBENT_PRODUCT'):
                product_nodes_map[node['id']] = node
        
        if not product_nodes_map:
            print("No product nodes found for rating attachment")
            return nodes
        
        # Build consultant name map for quick lookup
        consultant_names_map = {}
        for node in nodes:
            if node.get('type') == 'CONSULTANT':
                consultant_names_map[node['id']] = node.get('data', {}).get('name')
        
        # Build ratings map from RATES relationships - format like original approach
        ratings_map = {}
        for rel in relationships:
            rel_data = rel.get('data', {})
            if rel_data.get('relType') == 'RATES':
                source_id = rel.get('source')  # Consultant ID
                target_id = rel.get('target')  # Product ID
                
                if target_id in product_nodes_map:
                    consultant_name = consultant_names_map.get(source_id)
                    
                    if consultant_name:
                        if target_id not in ratings_map:
                            ratings_map[target_id] = []
                        
                        # Format matching original _build_complete_query
                        rating_data = {
                            'consultant': consultant_name,
                            'rankgroup': rel_data.get('rankgroup'),
                            'rankvalue': rel_data.get('rankvalue')
                        }
                        ratings_map[target_id].append(rating_data)
        
        print(f"Extracted ratings for {len(ratings_map)} products")
        
        # Attach ratings to product nodes - format like original approach
        updated_nodes = []
        for node in nodes:
            node_type = node.get('type')
            if node_type in ['PRODUCT', 'INCUMBENT_PRODUCT'] and node['id'] in ratings_map:
                # Create a copy of the node and add ratings in the original format
                updated_node = {**node}
                if 'data' not in updated_node:
                    updated_node['data'] = {}
                
                # Format matching original _build_complete_query: ratings array with consultant and rankgroup
                updated_node['data']['ratings'] = ratings_map[node['id']]
                updated_nodes.append(updated_node)
                print(f"Attached {len(ratings_map[node['id']])} ratings to {node['id']} ({node_type})")
            else:
                # For non-product nodes or products without ratings, set ratings to null
                updated_node = {**node}
                if node_type in ['PRODUCT', 'INCUMBENT_PRODUCT']:
                    if 'data' not in updated_node:
                        updated_node['data'] = {}
                    if 'ratings' not in updated_node['data']:
                        updated_node['data']['ratings'] = None
                updated_nodes.append(updated_node)
        
        return updated_nodes

    def _remove_rates_relationships(self, relationships: List[Dict]) -> List[Dict]:
        """
        Remove RATES relationships from the final relationship list.
        """
        print("Removing RATES relationships from final graph...")
        
        filtered_relationships = []
        rates_count = 0
        
        for rel in relationships:
            rel_data = rel.get('data', {})
            if rel_data.get('relType') == 'RATES':
                rates_count += 1
            else:
                filtered_relationships.append(rel)
        
        print(f"Removed {rates_count} RATES relationships, keeping {len(filtered_relationships)} business relationships")
        return filtered_relationships

    def _collect_and_attach_ratings(
        self,
        session: Session,
        nodes: List[Dict],
        filter_params: Dict[str, Any],
        recommendations_mode: bool
    ) -> List[Dict]:
        """
        Collect ratings for product nodes and attach them, similar to original approach.
        """
        # Find all product nodes that can have ratings
        product_nodes = []
        product_node_ids = []
        
        for node in nodes:
            node_type = node.get('type')
            if node_type == 'PRODUCT' or (recommendations_mode and node_type == 'INCUMBENT_PRODUCT'):
                product_nodes.append(node)
                product_node_ids.append(node['id'])
        
        if not product_node_ids:
            print("No product nodes found for ratings collection")
            return nodes
        
        print(f"Collecting ratings for {len(product_node_ids)} product nodes")
        
        # Build ratings query with filters
        rating_conditions = []
        
        # Apply rating-related filters if present
        if 'con_rankings' in filter_params:
            rating_conditions.append("rating_rel.rankgroup IN $con_rankings")
        if 'consultant_names' in filter_params:
            rating_conditions.append("rating_consultant.name IN $consultant_names")
        if 'consultant_ca' in filter_params:
            rating_conditions.append(
                "(ANY(x IN $consultant_ca WHERE x IN rating_consultant.pca) OR "
                "ANY(x IN $consultant_ca WHERE x IN rating_consultant.consultant_advisor))"
            )
        
        where_clause = ""
        if rating_conditions:
            where_clause = "AND " + " AND ".join(rating_conditions)
        
        # Query to collect all ratings for these products
        ratings_query = f"""
        MATCH (rating_consultant:CONSULTANT)-[rating_rel:RATES]->(target_product)
        WHERE target_product.id IN $product_node_ids 
        AND ('PRODUCT' IN labels(target_product) OR 'INCUMBENT_PRODUCT' IN labels(target_product))
        {where_clause}
        
        RETURN target_product.id AS product_id,
            COLLECT({{
                consultant: rating_consultant.name,
                rankgroup: rating_rel.rankgroup,
                rankvalue: rating_rel.rankvalue,
                rankorder: rating_rel.rankorder,
                rating_change: rating_rel.rating_change
            }}) AS ratings
        """
        
        try:
            # Execute ratings query
            ratings_result = session.run(ratings_query, {
                **filter_params,
                'product_node_ids': product_node_ids
            })
            
            # Build ratings map
            ratings_map = {}
            for record in ratings_result:
                product_id = record['product_id']
                ratings = [r for r in record['ratings'] if r['consultant']]  # Filter out null consultants
                if ratings:
                    ratings_map[product_id] = ratings
            
            print(f"Collected ratings for {len(ratings_map)} products")
            
            # Attach ratings to product nodes
            updated_nodes = []
            for node in nodes:
                if node['id'] in ratings_map:
                    # Create a copy of the node and add ratings
                    updated_node = {**node}
                    if 'data' not in updated_node:
                        updated_node['data'] = {}
                    updated_node['data']['ratings'] = ratings_map[node['id']]
                    updated_nodes.append(updated_node)
                    print(f"Attached {len(ratings_map[node['id']])} ratings to {node['id']}")
                else:
                    updated_nodes.append(node)
            
            return updated_nodes
            
        except Exception as e:
            print(f"Error collecting ratings: {str(e)}")
            # Return original nodes if ratings collection fails
            return nodes

    # Keep all the existing cache methods unchanged
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

    # Keep all existing helper methods
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
                "cache_type": "memory",
                "query_approach": "multiple_queries"
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
                "cache_type": "memory",
                "query_approach": "multiple_queries"
            }
        }

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
                    "server_side_filtering": "All filters in multiple Cypher queries",
                    "memory_cached_filter_options": "Complete filter options cached in memory",
                    "layout_calculation": "Positions calculated server-side",
                    "performance_limiting": f"Smart {MAX_GRAPH_NODES}-node limit",
                    "background_cleanup": "Automatic expired entry removal",
                    "query_approach": "Multiple queries for complete data coverage"
                }
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "cache_fallback": "Service will work without cache but with reduced performance"
            }

    # Keep all existing helper methods for filter options, layout calculation, etc.
    def _get_filtered_options_from_actual_data(
        self,
        nodes: List[Dict],
        region: str,
        recommendations_mode: bool
    ) -> Dict[str, Any]:
        """Extract filter options from actual result nodes with duplicate removal."""
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
                    consultants_dict[name] = {'id': name, 'name': name}
                    
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
                    
                    if data.get('channel'):
                        self._add_to_string_set(data['channel'], channels)
                    if data.get('sales_region'):
                        self._add_to_string_set(data['sales_region'], sales_regions)
                        
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
        
        # Convert dictionaries to sorted lists
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
        
        # Build filtered options structure
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
            "ratings": ["Positive", "Negative", "Neutral", "Introduced"],
            "mandate_statuses": ["Active", "At Risk", "Conversion in Progress"],
            "influence_levels": ["1", "2", "3", "4", "High", "medium", "low", "UNK"]
        }
        
        if recommendations_mode:
            filtered_options["incumbent_products"] = incumbent_products[:MAX_FILTER_RESULTS]
        
        return filtered_options

    # Keep all existing helper methods for data processing
    def _add_to_string_set(self, value, target_set: set):
        """Add string or list of strings to set, handling duplicates and malformed values."""
        if value is None:
            return
            
        if isinstance(value, list):
            for item in value:
                if item and str(item).strip():
                    cleaned = str(item).strip()
                    if not self._is_malformed_value(cleaned):
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
                    if ',' in cleaned:
                        for part in cleaned.split(','):
                            part = part.strip()
                            if part and not self._is_malformed_value(part):
                                target_set.add(part)
                    else:
                        target_set.add(cleaned)

    def _add_to_advisor_set(self, value, target_set: set):
        """Add advisor values to set with special handling."""
        if value is None:
            return
            
        if isinstance(value, list):
            for item in value:
                if item and str(item).strip():
                    cleaned = str(item).strip()
                    if not self._is_malformed_value(cleaned) and len(cleaned) > 1:
                        target_set.add(cleaned)
        else:
            if str(value).strip():
                cleaned = str(value).strip()
                if not self._is_malformed_value(cleaned) and len(cleaned) > 1:
                    target_set.add(cleaned)

    def _is_malformed_name(self, name: str) -> bool:
        """Check if a name is malformed."""
        if not name or len(name.strip()) == 0:
            return True
        
        malformed_patterns = [
            "['name']", "[\"name\"]", "name'],", "].name", "[object", "undefined", "null", "NaN"
        ]
        
        name_lower = name.lower()
        for pattern in malformed_patterns:
            if pattern in name_lower:
                return True
        
        if any(char in name for char in ['[', ']', '{', '}', '\'', '"']) and len(name) < 50:
            return True
        
        if len(name) > 200:
            return True
        
        return False

    def _is_malformed_value(self, value: str) -> bool:
        """Check if a value is malformed."""
        if not value or len(value.strip()) == 0:
            return True
        
        malformed_indicators = ["['", "']", "[\"", "\"]", "undefined", "null", "[object"]
        
        value_lower = value.lower().strip()
        for indicator in malformed_indicators:
            if value_lower.startswith(indicator) or value_lower.endswith(indicator):
                return True
        
        if len(value) > 100:
            return True
        
        return False

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
            "consultant_advisors": [],
            "ratings": ["Positive", "Negative", "Neutral", "Introduced"],
            "mandate_statuses": ["Active", "At Risk", "Conversion in Progress"],
            "influence_levels": ["1", "2", "3", "4", "High", "medium", "low", "UNK"]
        }
        
        if recommendations_mode:
            base_options["incumbent_products"] = []
        
        return base_options

    def _calculate_layout_positions(self, nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Calculate layout positions server-side."""
        layout_config = {
            'CONSULTANT': {'layer': 0, 'color': '#6366f1'},
            'FIELD_CONSULTANT': {'layer': 1, 'color': '#6366f1'},
            'COMPANY': {'layer': 2, 'color': '#059669'},
            'INCUMBENT_PRODUCT': {'layer': 3, 'color': '#f59e0b'},
            'PRODUCT': {'layer': 4, 'color': '#0ea5e9'}
        }
        
        nodes_by_type = {}
        for node in nodes:
            node_type = node.get('type', 'UNKNOWN')
            if node_type not in nodes_by_type:
                nodes_by_type[node_type] = []
            nodes_by_type[node_type].append(node)
        
        positioned_nodes = []
        
        for node_type, type_nodes in nodes_by_type.items():
            layer = layout_config.get(node_type, {}).get('layer', 5)
            nodes_per_row = max(3, int(len(type_nodes) ** 0.5))
            
            for i, node in enumerate(type_nodes):
                row = i // nodes_per_row
                col = i % nodes_per_row
                
                x = col * 300 + (row % 2) * 150
                y = layer * 200 + row * 120
                
                positioned_node = {
                    **node,
                    'position': {'x': x, 'y': y}
                }
                positioned_nodes.append(positioned_node)
        
        return positioned_nodes

    def _remove_orphans_post_processing(self, nodes: List[Dict], relationships: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
        """Remove orphan nodes and relationships using post-processing."""
        if not relationships:
            return nodes, relationships
            
        # Remove duplicate relationships
        unique_relationships = {}
        for rel in relationships:
            rel_data = rel.get('data', {})
            unique_key = f"{rel.get('source')}:{rel.get('target')}:{rel_data.get('relType', 'UNKNOWN')}"
            
            if unique_key not in unique_relationships:
                unique_relationships[unique_key] = rel
        
        deduplicated_relationships = list(unique_relationships.values())
        
        # Filter relationships with valid source and target nodes
        valid_node_ids = set(node['id'] for node in nodes if node.get('id'))
        valid_relationships = []
        
        for rel in deduplicated_relationships:
            source_id = rel.get('source')
            target_id = rel.get('target')
            
            if source_id in valid_node_ids and target_id in valid_node_ids:
                valid_relationships.append(rel)
        
        # Keep only nodes that are connected by valid relationships
        connected_node_ids = set()
        for rel in valid_relationships:
            connected_node_ids.add(rel['source'])
            connected_node_ids.add(rel['target'])
        
        connected_nodes = [node for node in nodes if node['id'] in connected_node_ids]
        
        print(f"Orphan removal: {len(nodes)} -> {len(connected_nodes)} nodes, "
              f"{len(relationships)} -> {len(valid_relationships)} relationships")
        
        return connected_nodes, valid_relationships

    # Keep existing methods for filter options computation and smart suggestions
    def _get_complete_filter_options(
        self, 
        session: Session, 
        region: str, 
        recommendations_mode: bool
    ) -> Dict[str, Any]:
        """Get ALL filter options with Python-based array flattening."""
        try:
            if recommendations_mode:
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
            
            result = session.run(filter_query, {"region": region})
            record = result.single()
            
            if record and record['RawFilterData']:
                raw_data = record['RawFilterData']
                
                # Python-based flattening and cleaning
                cleaned_options = {}
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
                
                # Clean entity lists
                cleaned_options['consultants'] = self._clean_entity_list(raw_data.get('consultants', []))
                cleaned_options['field_consultants'] = self._clean_entity_list(raw_data.get('field_consultants', []))
                cleaned_options['companies'] = self._clean_entity_list(raw_data.get('companies', []))
                cleaned_options['products'] = self._clean_entity_list(raw_data.get('products', []))
                
                if recommendations_mode:
                    cleaned_options['incumbent_products'] = self._clean_entity_list(raw_data.get('incumbent_products', []))
                
                # Static options
                cleaned_options['mandate_statuses'] = ['Active', 'At Risk', 'Conversion in Progress']
                cleaned_options['influence_levels'] = ['1', '2', '3', '4', 'High', 'medium', 'low', 'UNK']
                
                return cleaned_options
            else:
                return self._empty_filter_options(recommendations_mode)
                
        except Exception as e:
            print(f"ERROR in filter options processing: {str(e)}")
            return self._empty_filter_options(recommendations_mode)

    def _flatten_and_clean_array(self, raw_array: List[Any]) -> List[str]:
        """Flatten mixed string/array data and clean it."""
        flattened = set()
        
        for item in raw_array:
            if item is None:
                continue
            
            if isinstance(item, list):
                for sub_item in item:
                    if sub_item and str(sub_item).strip():
                        cleaned = str(sub_item).strip()
                        if not self._is_malformed_value(cleaned):
                            if ',' in cleaned:
                                for part in cleaned.split(','):
                                    part = part.strip()
                                    if part and not self._is_malformed_value(part):
                                        flattened.add(part)
                            else:
                                flattened.add(cleaned)
            else:
                if str(item).strip():
                    cleaned = str(item).strip()
                    if not self._is_malformed_value(cleaned):
                        if ',' in cleaned:
                            for part in cleaned.split(','):
                                part = part.strip()
                                if part and not self._is_malformed_value(part):
                                    flattened.add(part)
                        else:
                            flattened.add(cleaned)
        
        return sorted(list(flattened))[:MAX_FILTER_RESULTS]

    def _clean_entity_list(self, entity_list: List[Dict]) -> List[Dict]:
        """Clean entity lists."""
        cleaned_entities = []
        seen_names = set()
        
        for item in entity_list:
            if item and isinstance(item, dict) and item.get('name'):
                name = str(item['name']).strip()
                if name and name not in seen_names and not self._is_malformed_name(name):
                    seen_names.add(name)
                    cleaned_entities.append({'id': name, 'name': name})
        
        return cleaned_entities[:MAX_FILTER_RESULTS]

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


# Global service instance
complete_backend_filter_service = CompleteBackendFilterService()