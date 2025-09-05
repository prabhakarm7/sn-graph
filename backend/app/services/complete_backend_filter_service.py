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
        """Build single optimized query with ALL filters implemented and correct syntax."""
        
        params = {"region": region}
        
        # Add ALL filter parameters upfront
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
        
        print(f"Building COMPLETE query with ALL filters: {filters}")
        
        # Helper functions for building filter conditions
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
        
        def build_rating_conditions(rating_var: str) -> List[str]:
            conditions = []
            if filters.get('ratings'):
                conditions.append(f"""ANY(rt IN $ratings WHERE 
                    rt = {rating_var}.rankgroup OR rt IN {rating_var}.rankgroup)""")
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
        
        # Build the complete query
        if recommendations_mode:
            complete_query = f"""
            // Path 1: Consultant -> Field Consultant -> Company -> Incumbent Product -> Product
            OPTIONAL MATCH (cons1:CONSULTANT)-[emp1:EMPLOYS]->(fc1:FIELD_CONSULTANT)-[cov1:COVERS]->(c1:COMPANY)-[owns1:OWNS]->(ip1:INCUMBENT_PRODUCT)-[rec1:BI_RECOMMENDS]->(p1:PRODUCT)
            WHERE {combine_conditions([
                build_company_conditions('c1'),
                build_consultant_conditions('cons1'),
                build_product_conditions('p1'),
                build_field_consultant_conditions('fc1'),
                build_mandate_conditions('owns1'),
                build_influence_conditions('emp1'),
                build_influence_conditions('cov1')
            ])}
            
            // Path 2: Consultant -> Company -> Incumbent Product -> Product (direct coverage)
            OPTIONAL MATCH (cons2:CONSULTANT)-[cov2:COVERS]->(c2:COMPANY)-[owns2:OWNS]->(ip2:INCUMBENT_PRODUCT)-[rec2:BI_RECOMMENDS]->(p2:PRODUCT)
            WHERE {combine_conditions([
                build_company_conditions('c2'),
                build_consultant_conditions('cons2'),
                build_product_conditions('p2'),
                build_mandate_conditions('owns2'),
                build_influence_conditions('cov2')
            ])}
            
            // Path 3: Company-only paths for incumbent products
            OPTIONAL MATCH (c3:COMPANY)-[owns3:OWNS]->(ip3:INCUMBENT_PRODUCT)-[rec3:BI_RECOMMENDS]->(p3:PRODUCT)
            WHERE {combine_conditions([
                build_company_conditions('c3'),
                build_product_conditions('p3'),
                build_mandate_conditions('owns3')
            ])}
            
            // Collect ONLY valid relationships from filtered paths
            WITH 
                COLLECT(CASE WHEN emp1 IS NOT NULL THEN {{rel: emp1, source: cons1, target: fc1}} END) +
                COLLECT(CASE WHEN cov1 IS NOT NULL THEN {{rel: cov1, source: fc1, target: c1}} END) +
                COLLECT(CASE WHEN owns1 IS NOT NULL THEN {{rel: owns1, source: c1, target: ip1}} END) +
                COLLECT(CASE WHEN rec1 IS NOT NULL THEN {{rel: rec1, source: ip1, target: p1}} END) +
                COLLECT(CASE WHEN cov2 IS NOT NULL THEN {{rel: cov2, source: cons2, target: c2}} END) +
                COLLECT(CASE WHEN owns2 IS NOT NULL THEN {{rel: owns2, source: c2, target: ip2}} END) +
                COLLECT(CASE WHEN rec2 IS NOT NULL THEN {{rel: rec2, source: ip2, target: p2}} END) +
                COLLECT(CASE WHEN owns3 IS NOT NULL THEN {{rel: owns3, source: c3, target: ip3}} END) +
                COLLECT(CASE WHEN rec3 IS NOT NULL THEN {{rel: rec3, source: ip3, target: p3}} END) AS valid_relationship_data
            
            // Remove null entries and extract connected nodes
            WITH [rd IN valid_relationship_data WHERE rd IS NOT NULL] AS filtered_relationships
            
            WITH filtered_relationships,
                reduce(all_nodes = [], rd IN filtered_relationships | all_nodes + [rd.source, rd.target]) AS connected_nodes
            
            // Remove duplicate nodes
            WITH filtered_relationships,
                reduce(unique_nodes = [], node IN connected_nodes | 
                    CASE WHEN node IN unique_nodes THEN unique_nodes ELSE unique_nodes + [node] END
                ) AS final_nodes
            
            // Collect ratings for final nodes only
            UNWIND final_nodes AS node
            OPTIONAL MATCH (rating_consultant:CONSULTANT)-[rating_rel:RATES]->(node)
            WHERE ('PRODUCT' IN labels(node) OR 'INCUMBENT_PRODUCT' IN labels(node))
            
            WITH node, COLLECT({{consultant: rating_consultant.name, rankgroup: rating_rel.rankgroup}}) AS node_ratings, 
                final_nodes, filtered_relationships
            
            WITH COLLECT({{
                node_id: node.id,
                ratings: [r IN node_ratings WHERE r.consultant IS NOT NULL | r]
            }}) AS ratings_map, final_nodes, filtered_relationships
            
            RETURN {{
                nodes: [node IN final_nodes WHERE node.name IS NOT NULL | {{
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
                        ratings: [rm IN ratings_map WHERE rm.node_id = node.id | rm.ratings][0]
                    }}
                }}],
                relationships: [rd IN filtered_relationships | {{
                    id: toString(id(rd.rel)),
                    source: rd.source.id,
                    target: rd.target.id,
                    type: 'custom',
                    data: {{
                        relType: type(rd.rel),
                        sourceId: rd.source.id,
                        targetId: rd.target.id,
                        mandate_status: rd.rel.mandate_status,
                        level_of_influence: rd.rel.level_of_influence,
                        rankgroup: rd.rel.rankgroup
                    }}
                }}]
            }} AS GraphData
            """
        else:
            complete_query = f"""
            // Path 1: Consultant -> Field Consultant -> Company -> Product
            OPTIONAL MATCH (cons1:CONSULTANT)-[emp1:EMPLOYS]->(fc1:FIELD_CONSULTANT)-[cov1:COVERS]->(c1:COMPANY)-[owns1:OWNS]->(p1:PRODUCT)
            WHERE {combine_conditions([
                build_company_conditions('c1'),
                build_consultant_conditions('cons1'),
                build_product_conditions('p1'),
                build_field_consultant_conditions('fc1'),
                build_mandate_conditions('owns1'),
                build_influence_conditions('emp1'),
                build_influence_conditions('cov1')
            ])}
            
            // Path 2: Consultant -> Company -> Product (direct coverage)
            OPTIONAL MATCH (cons2:CONSULTANT)-[cov2:COVERS]->(c2:COMPANY)-[owns2:OWNS]->(p2:PRODUCT)
            WHERE {combine_conditions([
                build_company_conditions('c2'),
                build_consultant_conditions('cons2'),
                build_product_conditions('p2'),
                build_mandate_conditions('owns2'),
                build_influence_conditions('cov2')
            ])}
            
            // Path 3: Company-product only relationships
            OPTIONAL MATCH (c3:COMPANY)-[owns3:OWNS]->(p3:PRODUCT)
            WHERE {combine_conditions([
                build_company_conditions('c3'),
                build_product_conditions('p3'),
                build_mandate_conditions('owns3')
            ])}
            
            // Collect valid relationships from filtered paths
            WITH 
                COLLECT(CASE WHEN emp1 IS NOT NULL THEN {{rel: emp1, source: cons1, target: fc1}} END) +
                COLLECT(CASE WHEN cov1 IS NOT NULL THEN {{rel: cov1, source: fc1, target: c1}} END) +
                COLLECT(CASE WHEN owns1 IS NOT NULL THEN {{rel: owns1, source: c1, target: p1}} END) +
                COLLECT(CASE WHEN cov2 IS NOT NULL THEN {{rel: cov2, source: cons2, target: c2}} END) +
                COLLECT(CASE WHEN owns2 IS NOT NULL THEN {{rel: owns2, source: c2, target: p2}} END) +
                COLLECT(CASE WHEN owns3 IS NOT NULL THEN {{rel: owns3, source: c3, target: p3}} END) AS valid_relationship_data
            
            // Remove null entries and extract connected nodes
            WITH [rd IN valid_relationship_data WHERE rd IS NOT NULL] AS filtered_relationships
            
            WITH filtered_relationships,
                reduce(all_nodes = [], rd IN filtered_relationships | all_nodes + [rd.source, rd.target]) AS connected_nodes
            
            // Remove duplicate nodes
            WITH filtered_relationships,
                reduce(unique_nodes = [], node IN connected_nodes | 
                    CASE WHEN node IN unique_nodes THEN unique_nodes ELSE unique_nodes + [node] END
                ) AS final_nodes
            
            // Collect ratings for final nodes only
            UNWIND final_nodes AS node
            OPTIONAL MATCH (rating_consultant:CONSULTANT)-[rating_rel:RATES]->(node)
            WHERE 'PRODUCT' IN labels(node)
            
            WITH node, COLLECT({{consultant: rating_consultant.name, rankgroup: rating_rel.rankgroup}}) AS node_ratings, 
                final_nodes, filtered_relationships
            
            WITH COLLECT({{
                node_id: node.id,
                ratings: [r IN node_ratings WHERE r.consultant IS NOT NULL | r]
            }}) AS ratings_map, final_nodes, filtered_relationships
            
            RETURN {{
                nodes: [node IN final_nodes WHERE node.name IS NOT NULL | {{
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
                        ratings: [rm IN ratings_map WHERE rm.node_id = node.id | rm.ratings][0]
                    }}
                }}],
                relationships: [rd IN filtered_relationships | {{
                    id: toString(id(rd.rel)),
                    source: rd.source.id,
                    target: rd.target.id,
                    type: 'custom',
                    data: {{
                        relType: type(rd.rel),
                        sourceId: rd.source.id,
                        targetId: rd.target.id,
                        mandate_status: rd.rel.mandate_status,
                        level_of_influence: rd.rel.level_of_influence,
                        rankgroup: rd.rel.rankgroup
                    }}
                }}]
            }} AS GraphData
            """
        
        return complete_query, params
    
    def _get_complete_filter_options(
        self, 
        session: Session, 
        region: str, 
        recommendations_mode: bool
    ) -> Dict[str, Any]:
        """Get ALL filter options in single optimized query - FIXED for proper array/string handling."""
        
        try:
            if recommendations_mode:
                filter_query = f"""
                MATCH (c:COMPANY) WHERE (c.region = $region OR $region IN c.region)
                OPTIONAL MATCH (c)-[:OWNS]->(ip:INCUMBENT_PRODUCT)-[:BI_RECOMMENDS]->(p:PRODUCT)
                OPTIONAL MATCH path1 = (cons:CONSULTANT)-[:EMPLOYS]->(fc:FIELD_CONSULTANT)-[:COVERS]->(c)
                OPTIONAL MATCH path2 = (cons2:CONSULTANT)-[:COVERS]->(c)
                OPTIONAL MATCH (any_cons:CONSULTANT)-[rating:RATES]->(any_prod:PRODUCT)
                
                // Collect all raw values - handle both strings and arrays properly
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
                    COLLECT(DISTINCT rating.rankgroup) AS raw_ratings
                
                // Flatten arrays properly - simplified approach without type checking
                RETURN {{
                    markets: CASE 
                        WHEN size(raw_sales_regions) = 0 THEN []
                        ELSE reduce(acc = [], item IN raw_sales_regions | 
                            acc + CASE 
                                WHEN item IS NULL THEN []
                                ELSE [item]
                            END)
                        END,
                    channels: CASE 
                        WHEN size(raw_channels) = 0 THEN []
                        ELSE reduce(acc = [], item IN raw_channels | 
                            acc + CASE 
                                WHEN item IS NULL THEN []
                                ELSE [item]
                            END)
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
                            acc + CASE 
                                WHEN item IS NULL THEN []
                                ELSE [item]
                            END)
                        END,
                    consultant_advisors: CASE 
                        WHEN size(raw_consultant_pcas + raw_consultant_advisors) = 0 THEN []
                        ELSE reduce(acc = [], item IN raw_consultant_pcas + raw_consultant_advisors | 
                            acc + CASE 
                                WHEN item IS NULL THEN []
                                ELSE [item]
                            END)
                        END,
                    ratings: [item IN raw_ratings WHERE item IS NOT NULL],
                    mandate_statuses: ['Active', 'At Risk', 'Conversion in Progress'],
                    influence_levels: ['1', '2', '3', '4', 'High', 'medium', 'low', 'UNK']
                }} AS FilterOptions
                """
            else:
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
                    COLLECT(DISTINCT rating.rankgroup) AS raw_ratings
                
                RETURN {{
                    markets: CASE 
                        WHEN size(raw_sales_regions) = 0 THEN []
                        ELSE reduce(acc = [], item IN raw_sales_regions | 
                            acc + CASE 
                                WHEN item IS NULL THEN []
                                ELSE [item]
                            END)
                        END,
                    channels: CASE 
                        WHEN size(raw_channels) = 0 THEN []
                        ELSE reduce(acc = [], item IN raw_channels | 
                            acc + CASE 
                                WHEN item IS NULL THEN []
                                ELSE [item]
                            END)
                        END,
                    asset_classes: [item IN raw_asset_classes WHERE item IS NOT NULL],
                    consultants: [item IN consultants WHERE item.name IS NOT NULL],
                    field_consultants: [item IN field_consultants WHERE item.name IS NOT NULL],
                    companies: [item IN companies WHERE item.name IS NOT NULL],
                    products: [item IN products WHERE item.name IS NOT NULL],
                    client_advisors: CASE 
                        WHEN size(raw_company_pcas + raw_company_acas) = 0 THEN []
                        ELSE reduce(acc = [], item IN raw_company_pcas + raw_company_acas | 
                            acc + CASE 
                                WHEN item IS NULL THEN []
                                ELSE [item]
                            END)
                        END,
                    consultant_advisors: CASE 
                        WHEN size(raw_consultant_pcas + raw_consultant_advisors) = 0 THEN []
                        ELSE reduce(acc = [], item IN raw_consultant_pcas + raw_consultant_advisors | 
                            acc + CASE 
                                WHEN item IS NULL THEN []
                                ELSE [item]
                            END)
                        END,
                    ratings: [item IN raw_ratings WHERE item IS NOT NULL],
                    mandate_statuses: ['Active', 'At Risk', 'Conversion in Progress'],
                    influence_levels: ['1', '2', '3', '4', 'High', 'medium', 'low', 'UNK']
                }} AS FilterOptions
                """
            
            print(f"Executing filter options query for region: {region}, recommendations_mode: {recommendations_mode}")
            
            # Use parameterized query for safety
            result = session.run(filter_query, {"region": region})
            record = result.single()
            
            if record and record['FilterOptions']:
                options = record['FilterOptions']
                print(f"Raw filter options retrieved: {len(options)} filter types")
                
                # Clean and limit results
                for key, value in options.items():
                    if isinstance(value, list):
                        if key in ['client_advisors', 'consultant_advisors']:
                            # Remove duplicates and empty values for advisor lists
                            # Handle potential comma-separated values in database
                            flattened_values = []
                            for v in value:
                                if v and str(v).strip():
                                    # If it contains comma, split it
                                    if ',' in str(v):
                                        flattened_values.extend([item.strip() for item in str(v).split(',') if item.strip()])
                                    else:
                                        flattened_values.append(str(v).strip())
                            options[key] = list(set(flattened_values))[:MAX_FILTER_RESULTS]
                        elif key in ['consultants', 'field_consultants', 'companies', 'products', 'incumbent_products']:
                            # Entity lists - remove nulls and limit
                            options[key] = [item for item in value if item and item.get('name')][:MAX_FILTER_RESULTS]
                        else:
                            # Simple lists - remove nulls and limit
                            options[key] = [v for v in value if v][:MAX_FILTER_RESULTS]
                
                print(f"Cleaned filter options: {[(k, len(v) if isinstance(v, list) else 'not_list') for k, v in options.items()]}")
                return options
            else:
                print("No FilterOptions found in query result, returning empty options")
                return self._empty_filter_options(recommendations_mode)
                
        except Exception as e:
            print(f"ERROR in _get_complete_filter_options: {str(e)}")
            print(f"Region: {region}, recommendations_mode: {recommendations_mode}")
            
            # Return empty options with error info
            empty_options = self._empty_filter_options(recommendations_mode)
            empty_options['_error'] = {
                'message': str(e),
                'region': region,
                'recommendations_mode': recommendations_mode,
                'timestamp': time.time()
            }
            return empty_options    
    
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

    def get_complete_filtered_data_with_enhanced_stats(
        self, 
        region: str,
        filters: Dict[str, Any] = None,
        recommendations_mode: bool = False
    ) -> Dict[str, Any]:
        """Enhanced version of main method that includes detailed statistics."""
        
        filters = filters or {}
        region = region.upper()
        
        try:
            with self.driver.session() as session:
                # Get filter options with embedded stats (single query)
                enhanced_options = self._get_complete_filter_options_with_stats(
                    session, region, recommendations_mode
                )
                
                stats = enhanced_options.get('statistics', {})
                filter_options = enhanced_options.get('filter_options', {})
                
                # Check if we need to proceed with full data query based on stats
                total_nodes = stats.get('total_nodes', 0)
                
                if total_nodes > MAX_GRAPH_NODES:
                    return self._create_enhanced_summary_response(
                        region, total_nodes, filters, recommendations_mode, stats
                    )
                
                # Proceed with full data query if size is acceptable
                query, params = self._build_complete_query(region, filters, recommendations_mode)
                
                print(f"Executing full data query with {total_nodes} expected nodes")
                result = session.run(query, params)
                records = list(result)
                
                if not records:
                    return self._empty_response_with_stats(region, recommendations_mode, stats)
                
                graph_data = records[0]['GraphData']
                nodes = graph_data.get('nodes', [])
                relationships = graph_data.get('relationships', [])
                
                # Calculate layout positions
                positioned_nodes = self._calculate_layout_positions(nodes)
                
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
                    "statistics": {
                        **stats,
                        "actual_nodes_returned": len(nodes),
                        "actual_relationships_returned": len(relationships),
                        "filters_applied_count": len([k for k, v in filters.items() if v]),
                        "data_reduction_ratio": round((1 - len(nodes) / max(total_nodes, 1)) * 100, 1) if total_nodes > 0 else 0
                    },
                    "metadata": {
                        "region": region,
                        "mode": "recommendations" if recommendations_mode else "standard",
                        "server_side_processing": True,
                        "filters_applied": filters,
                        "processing_time_ms": int(time.time() * 1000),
                        "performance_level": stats.get('performance_level', 'unknown')
                    }
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Enhanced processing failed: {str(e)}",
                "render_mode": "error",
                "statistics": {"error": str(e)}
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