# services/complete_backend_filter_service.py
"""
Complete backend filter service that handles ALL complex logic server-side.
Frontend only sends filter criteria and receives ready-to-render data.
"""
import time
from typing import Dict, List, Any, Optional, Tuple
from neo4j import GraphDatabase, Session
from neo4j.exceptions import Neo4jError

from app.config import (
    NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE, REGIONS
)

# Performance constants
MAX_GRAPH_NODES = 500
MAX_FILTER_RESULTS = 400


class CompleteBackendFilterService:
    """Complete backend service - ALL complex logic moved from frontend."""
    
    def __init__(self):
        self.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USERNAME, NEO4J_PASSWORD),
            database=NEO4J_DATABASE
        )
    
    def close(self):
        if self.driver:
            self.driver.close()
    
    def get_complete_filtered_data(
        self, 
        region: str,
        filters: Dict[str, Any] = None,
        recommendations_mode: bool = False
    ) -> Dict[str, Any]:
        """
        MAIN METHOD: Get completely processed data ready for frontend rendering.
        All filtering, rating collection, layout calculation done server-side.
        """
        filters = filters or {}
        region = region.upper()
        
        try:
            with self.driver.session() as session:
                # Step 1: Build complete query with all filters applied
                query, params = self._build_complete_query(region, filters, recommendations_mode)
                print(query)
                # Step 2: Execute single optimized query
                print(f"Executing complete backend query for {region}")
                result = session.run(query, params)
                records = list(result)
                #print(records)
                if not records:
                    return self._empty_response(region, recommendations_mode)
                
                graph_data = records[0]['GraphData']
                nodes = graph_data.get('nodes', [])
                relationships = graph_data.get('relationships', [])

                # ADD THIS LINE - Post-processing orphan removal
                nodes, relationships = self._remove_orphans_post_processing(nodes, relationships)
                
                print(f"Backend processing complete: {len(nodes)} nodes, {len(relationships)} relationships")
                
                # Step 3: Check performance limits
                if len(nodes) > MAX_GRAPH_NODES:
                    return self._create_summary_response(region, len(nodes), filters, recommendations_mode)
                
                # Step 4: Calculate layout positions server-side
                positioned_nodes = self._calculate_layout_positions(nodes)
                
                # Step 5: Get filter options in single query
                filter_options = self._get_complete_filter_options(session, region, recommendations_mode)
                
                # Step 6: Return complete ready-to-render response
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
                        "filters_applied": filters,
                        "processing_time_ms": int(time.time() * 1000),
                        "optimizations": [
                            "Server-side filtering",
                            "Embedded rating collection", 
                            "Pre-calculated layouts",
                            "Single query execution",
                            "Performance limiting"
                        ]
                    }
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Complete backend processing failed: {str(e)}",
                "render_mode": "error"
            }
    
    def _build_complete_query(
        self, 
        region: str, 
        filters: Dict[str, Any],
        recommendations_mode: bool
    ) -> Tuple[str, Dict[str, Any]]:
        """Fixed Neo4j query - proper aggregation syntax."""
        
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
        
        print(f"Building FIXED query with filters: {filters}")
        
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
            
            WITH consultants + field_consultants + companies + incumbent_products + products AS allNodes, 
                all_rels
            
            // Filter out nulls and invalid nodes
            WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL] AS filteredNodes, 
                [rel IN all_rels WHERE rel IS NOT NULL] AS filteredRels
            
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
                        mandate_status: node.mandate_status
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
                        mandate_status: rel.mandate_status,
                        level_of_influence: rel.level_of_influence
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
            
            WITH consultants + field_consultants + companies + products AS allNodes, all_rels
            
            WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL] AS filteredNodes, 
                [rel IN all_rels WHERE rel IS NOT NULL] AS filteredRels
            
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
                        mandate_status: node.mandate_status
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
                        mandate_status: rel.mandate_status,
                        level_of_influence: rel.level_of_influence
                    }}
                }}]
            }} AS GraphData
            """
        
        return optimized_query, params

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
            base_options["incumbent_products"] = []
        
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
    
    def _empty_response(self, region: str, recommendations_mode: bool) -> Dict[str, Any]:
        """Return empty response structure."""
        return {
            "success": True,
            "render_mode": "graph",
            "data": {
                "nodes": [],
                "relationships": [],
                "total_nodes": 0,
                "total_relationships": 0
            },
            "filter_options": self._empty_filter_options(recommendations_mode),
            "metadata": {
                "region": region,
                "mode": "recommendations" if recommendations_mode else "standard",
                "server_side_processing": True,
                "empty_result": True
            }
        }
    
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

    def get_complete_filtered_data(
        self, 
        region: str,
        filters: Dict[str, Any] = None,
        recommendations_mode: bool = False
    ) -> Dict[str, Any]:
        """
        OPTIMIZED MAIN METHOD: Get completely processed data with separate rating collection.
        """
        filters = filters or {}
        region = region.upper()
        
        try:
            with self.driver.session() as session:
                # Step 1: Build and execute optimized main query (no ratings)
                query, params = self._build_complete_query(region, filters, recommendations_mode)
                print(f"Executing optimized backend query for {region}")
                
                result = session.run(query, params)
                records = list(result)
                
                if not records:
                    return self._empty_response(region, recommendations_mode)
                
                graph_data = records[0]['GraphData']
                nodes = graph_data.get('nodes', [])
                relationships = graph_data.get('relationships', [])
                
                print(f"Main query complete: {len(nodes)} nodes, {len(relationships)} relationships")
                
                # Step 2: Post-processing orphan removal
                nodes, relationships = self._remove_orphans_post_processing(nodes, relationships)
                
                # Step 3: Collect ratings separately for product nodes only
                product_node_ids = [
                    node['id'] for node in nodes 
                    if node['type'] in ['PRODUCT', 'INCUMBENT_PRODUCT']
                ]
                
                ratings_map = {}
                if product_node_ids:
                    print(f"Collecting ratings for {len(product_node_ids)} product nodes")
                    ratings_map = self.get_ratings_for_nodes(session, product_node_ids, filters)
                
                # Step 4: Merge ratings into nodes
                for node in nodes:
                    if node['id'] in ratings_map:
                        node['data']['ratings'] = ratings_map[node['id']]
                    else:
                        node['data']['ratings'] = []
                
                print(f"Processing complete: {len(nodes)} nodes, {len(relationships)} relationships, {len(ratings_map)} nodes with ratings")
                
                # Step 5: Check performance limits
                if len(nodes) > MAX_GRAPH_NODES:
                    return self._create_summary_response(region, len(nodes), filters, recommendations_mode)
                
                # Step 6: Calculate layout positions
                positioned_nodes = self._calculate_layout_positions(nodes)
                
                # Step 7: Get filter options
                filter_options = self._get_complete_filter_options(session, region, recommendations_mode)
                
                # Step 8: Return complete response
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
                        "filters_applied": filters,
                        "processing_time_ms": int(time.time() * 1000),
                        "optimizations": [
                            "Optimized query structure",
                            "Separate rating collection",
                            "Post-processing orphan removal", 
                            "Pre-calculated layouts",
                            "Progressive node collection"
                        ],
                        "performance_stats": {
                            "nodes_with_ratings": len(ratings_map),
                            "rating_collection_optimized": True
                        }
                    }
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Optimized backend processing failed: {str(e)}",
                "render_mode": "error"
            }

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
        """Remove orphan nodes using post-processing."""
        if not relationships:
            return nodes, relationships
        
        connected_node_ids = set()
        for rel in relationships:
            connected_node_ids.add(rel['source'])
            connected_node_ids.add(rel['target'])
        
        connected_nodes = [node for node in nodes if node['id'] in connected_node_ids]
        print(f"Orphan removal: {len(nodes)} -> {len(connected_nodes)} nodes")
        return connected_nodes, relationships


# Global service instance
complete_backend_filter_service = CompleteBackendFilterService()