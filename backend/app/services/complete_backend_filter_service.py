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
        """Build single optimized query with ALL filters implemented - COMPLETE filtering logic."""
        
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
        # NEW: Add missing filter parameters
        if filters.get('influence_levels'):
            params['influenceLevels'] = filters['influence_levels']
        if filters.get('markets'):
            params['markets'] = filters['markets']
        
        print(f"Building COMPLETE query with ALL filters: {filters}")
        
        # COMPLETE helper functions for ALL filter conditions
        def build_company_conditions(company_var: str) -> List[str]:
            conditions = [f"{company_var}.region = $region"]
            
            if filters.get('clientIds'):
                conditions.append(f"{company_var}.name IN $clientIds")
            if filters.get('channels'):
                conditions.append(f"{company_var}.channel IN $channels")
            if filters.get('sales_regions'):
                conditions.append(f"{company_var}.sales_region IN $salesRegions")
            # NEW: Markets filter (same as sales_regions but different parameter name)
            if filters.get('markets'):
                conditions.append(f"{company_var}.sales_region IN $markets")
            if filters.get('clientAdvisorIds'):
                conditions.append(f"""({company_var}.pca IN $clientAdvisorIds OR {company_var}.aca IN $clientAdvisorIds OR
                    ANY(advisor IN $clientAdvisorIds WHERE advisor IN split(coalesce({company_var}.pca, ''), ',')) OR
                    ANY(advisor IN $clientAdvisorIds WHERE advisor IN split(coalesce({company_var}.aca, ''), ',')))""")
            
            return conditions
        
        def build_consultant_conditions(consultant_var: str) -> List[str]:
            conditions = []
            if filters.get('consultantIds'):
                conditions.append(f"{consultant_var}.name IN $consultantIds")
            if filters.get('consultantAdvisorIds'):
                conditions.append(f"""({consultant_var}.pca IN $consultantAdvisorIds OR {consultant_var}.consultant_advisor IN $consultantAdvisorIds OR
                    ANY(advisor IN $consultantAdvisorIds WHERE advisor IN split(coalesce({consultant_var}.pca, ''), ',')) OR
                    ANY(advisor IN $consultantAdvisorIds WHERE advisor IN split(coalesce({consultant_var}.consultant_advisor, ''), ',')))""")
            return conditions
        
        def build_product_conditions(product_var: str) -> List[str]:
            conditions = []
            if filters.get('productIds'):
                conditions.append(f"{product_var}.name IN $productIds")
            if filters.get('assetClasses'):
                conditions.append(f"{product_var}.asset_class IN $assetClasses")
            return conditions
        
        def build_field_consultant_conditions(fc_var: str) -> List[str]:
            conditions = []
            if filters.get('fieldConsultantIds'):
                conditions.append(f"{fc_var}.name IN $fieldConsultantIds")
            return conditions
        
        def build_mandate_conditions(rel_var: str) -> List[str]:
            conditions = []
            if filters.get('mandateStatuses'):
                conditions.append(f"{rel_var}.mandate_status IN $mandateStatuses")
            return conditions
        
        def build_rating_conditions(rating_var: str) -> List[str]:
            conditions = []
            if filters.get('ratings'):
                conditions.append(f"{rating_var}.rankgroup IN $ratings")
            return conditions
        
        # NEW: Complete influence level filtering
        def build_influence_conditions(rel_var: str) -> List[str]:
            conditions = []
            if filters.get('influence_levels'):
                conditions.append(f"{rel_var}.level_of_influence IN $influenceLevels")
            return conditions
        
        def combine_conditions(condition_lists: List[List[str]]) -> str:
            all_conditions = []
            for condition_list in condition_lists:
                all_conditions.extend(condition_list)
            return " AND ".join(all_conditions) if all_conditions else "true"
        
        # COMPLETE query with ALL filters implemented
        if recommendations_mode:
            complete_query = f"""
            // Path 1: Consultant -> Field Consultant -> Company -> Incumbent Product -> Product
            OPTIONAL MATCH path1 = (a:CONSULTANT)-[f1:EMPLOYS]->(b:FIELD_CONSULTANT)-[i1:COVERS]->(c:COMPANY)
                   -[h1:OWNS]->(ip:INCUMBENT_PRODUCT)-[r1:BI_RECOMMENDS]->(p:PRODUCT)
            WHERE {combine_conditions([
                build_company_conditions('c'),
                build_consultant_conditions('a'),
                build_product_conditions('p'),
                build_field_consultant_conditions('b'),
                build_mandate_conditions('h1'),
                build_influence_conditions('f1'),  # Influence on EMPLOYS relationship
                build_influence_conditions('i1')   # Influence on COVERS relationship
            ])}
            OPTIONAL MATCH (a)-[j1:RATES]->(p)
            WHERE {combine_conditions([
                build_rating_conditions('j1'),
                build_influence_conditions('j1')   # Influence on RATES relationship
            ])}
            
            // Path 2: Consultant -> Company -> Incumbent Product -> Product (direct coverage)
            OPTIONAL MATCH path2 = (a2:CONSULTANT)-[i2:COVERS]->(c2:COMPANY)
                   -[h2:OWNS]->(ip2:INCUMBENT_PRODUCT)-[r2:BI_RECOMMENDS]->(p2:PRODUCT)  
            WHERE {combine_conditions([
                build_company_conditions('c2'),
                build_consultant_conditions('a2'),
                build_product_conditions('p2'),
                build_mandate_conditions('h2'),
                build_influence_conditions('i2')   # Influence on COVERS relationship
            ])}
            OPTIONAL MATCH (a2)-[j2:RATES]->(p2)
            WHERE {combine_conditions([
                build_rating_conditions('j2'),
                build_influence_conditions('j2')   # Influence on RATES relationship
            ])}
            
            // Path 3: Direct consultant ratings with recommendation chain
            OPTIONAL MATCH path3 = (a3:CONSULTANT)-[j3:RATES]->(p3:PRODUCT)
            WHERE {combine_conditions([
                build_consultant_conditions('a3'),
                build_product_conditions('p3'),
                build_rating_conditions('j3'),
                build_influence_conditions('j3')   # Influence on RATES relationship
            ])}
            OPTIONAL MATCH (p3)<-[r3:BI_RECOMMENDS]-(ip3:INCUMBENT_PRODUCT)<-[h3:OWNS]-(c3:COMPANY)
            WHERE {combine_conditions([
                build_company_conditions('c3'),
                build_mandate_conditions('h3')
            ])}
            
            WITH 
                COLLECT(DISTINCT a) + COLLECT(DISTINCT a2) + COLLECT(DISTINCT a3) AS consultants,
                COLLECT(DISTINCT b) AS field_consultants,
                COLLECT(DISTINCT c) + COLLECT(DISTINCT c2) + COLLECT(DISTINCT c3) AS companies,
                COLLECT(DISTINCT ip) + COLLECT(DISTINCT ip2) + COLLECT(DISTINCT ip3) AS incumbent_products,
                COLLECT(DISTINCT p) + COLLECT(DISTINCT p2) + COLLECT(DISTINCT p3) AS products,
                COLLECT(DISTINCT f1) + COLLECT(DISTINCT i1) + COLLECT(DISTINCT i2) + 
                COLLECT(DISTINCT h1) + COLLECT(DISTINCT h2) + COLLECT(DISTINCT h3) + 
                COLLECT(DISTINCT r1) + COLLECT(DISTINCT r2) + COLLECT(DISTINCT r3) + 
                COLLECT(DISTINCT j1) + COLLECT(DISTINCT j2) + COLLECT(DISTINCT j3) AS all_rels
            
            WITH consultants + field_consultants + companies + incumbent_products + products AS allNodes, all_rels
            
            // Collect ratings for products server-side
            UNWIND allNodes AS node
            OPTIONAL MATCH (rating_consultant:CONSULTANT)-[rating_rel:RATES]->(node)
            WHERE 'PRODUCT' IN labels(node) OR 'INCUMBENT_PRODUCT' IN labels(node)
            
            WITH node, COLLECT({{consultant: rating_consultant.name, rankgroup: rating_rel.rankgroup}}) AS node_ratings, allNodes, all_rels
            
            WITH COLLECT({{
                node_id: node.id,
                ratings: [r IN node_ratings WHERE r.consultant IS NOT NULL | r]
            }}) AS ratings_map, allNodes, all_rels
            
            WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL] AS filteredNodes, 
                 all_rels, ratings_map
            
            RETURN {{
                nodes: [node IN filteredNodes | {{
                    id: node.id,
                    type: labels(node)[0],
                    data: node {{
                        .*,
                        id: node.id,
                        name: coalesce(node.name, node.id),
                        label: coalesce(node.name, node.id),
                        ratings: [rm IN ratings_map WHERE rm.node_id = node.id | rm.ratings][0]
                    }}
                }}],
                relationships: [rel IN all_rels WHERE rel IS NOT NULL AND
                               startNode(rel) IN filteredNodes AND endNode(rel) IN filteredNodes AND AND type(rel) <> 'RATES' {{
                    id: toString(id(rel)),
                    source: startNode(rel).id,
                    target: endNode(rel).id,
                    type: 'custom',
                    data: rel {{
                        .*,
                        relType: type(rel),
                        sourceId: startNode(rel).id,
                        targetId: endNode(rel).id
                    }}
                }}]
            }} AS GraphData
            """
        else:
            complete_query = f"""
            // Path 1: Consultant -> Field Consultant -> Company -> Product
            OPTIONAL MATCH path1 = (a:CONSULTANT)-[f1:EMPLOYS]->(b:FIELD_CONSULTANT)-[i1:COVERS]->(c:COMPANY)-[g1:OWNS]->(p:PRODUCT)
            WHERE {combine_conditions([
                build_company_conditions('c'),
                build_consultant_conditions('a'),
                build_product_conditions('p'),
                build_field_consultant_conditions('b'),
                build_mandate_conditions('g1'),
                build_influence_conditions('f1'),  # Influence on EMPLOYS relationship
                build_influence_conditions('i1')   # Influence on COVERS relationship
            ])}
            OPTIONAL MATCH (a)-[j1:RATES]->(p)
            WHERE {combine_conditions([
                build_rating_conditions('j1'),
                build_influence_conditions('j1')   # Influence on RATES relationship
            ])}
            
            // Path 2: Consultant -> Company -> Product (direct coverage)
            OPTIONAL MATCH path2 = (a2:CONSULTANT)-[i2:COVERS]->(c2:COMPANY)-[g2:OWNS]->(p2:PRODUCT)
            WHERE {combine_conditions([
                build_company_conditions('c2'),
                build_consultant_conditions('a2'),
                build_product_conditions('p2'),
                build_mandate_conditions('g2'),
                build_influence_conditions('i2')   # Influence on COVERS relationship
            ])}
            OPTIONAL MATCH (a2)-[j2:RATES]->(p2)
            WHERE {combine_conditions([
                build_rating_conditions('j2'),
                build_influence_conditions('j2')   # Influence on RATES relationship
            ])}
            
            // Path 3: Direct consultant to product ratings
            OPTIONAL MATCH path3 = (a3:CONSULTANT)-[j3:RATES]->(p3:PRODUCT)
            WHERE {combine_conditions([
                build_consultant_conditions('a3'),
                build_product_conditions('p3'),
                build_rating_conditions('j3'),
                build_influence_conditions('j3')   # Influence on RATES relationship
            ])}
            OPTIONAL MATCH (p3)<-[g3:OWNS]-(c3:COMPANY)
            WHERE {combine_conditions([
                build_company_conditions('c3'),
                build_mandate_conditions('g3')
            ])}
            
            // Path 4: Company-product only relationships
            OPTIONAL MATCH path4 = (c4:COMPANY)-[g4:OWNS]->(p4:PRODUCT)
            WHERE {combine_conditions([
                build_company_conditions('c4'),
                build_product_conditions('p4'),
                build_mandate_conditions('g4')
            ])}
            
            WITH 
                COLLECT(DISTINCT a) + COLLECT(DISTINCT a2) + COLLECT(DISTINCT a3) AS consultants,
                COLLECT(DISTINCT b) AS field_consultants,
                COLLECT(DISTINCT c) + COLLECT(DISTINCT c2) + COLLECT(DISTINCT c3) + COLLECT(DISTINCT c4) AS companies,
                COLLECT(DISTINCT p) + COLLECT(DISTINCT p2) + COLLECT(DISTINCT p3) + COLLECT(DISTINCT p4) AS products,
                COLLECT(DISTINCT f1) + COLLECT(DISTINCT i1) + COLLECT(DISTINCT i2) + 
                COLLECT(DISTINCT g1) + COLLECT(DISTINCT g2) + COLLECT(DISTINCT g3) + COLLECT(DISTINCT g4) + 
                COLLECT(DISTINCT j1) + COLLECT(DISTINCT j2) + COLLECT(DISTINCT j3) AS all_rels
            
            WITH consultants + field_consultants + companies + products AS allNodes, all_rels
            
            // Collect ratings for products server-side
            UNWIND allNodes AS node
            OPTIONAL MATCH (rating_consultant:CONSULTANT)-[rating_rel:RATES]->(node)
            WHERE 'PRODUCT' IN labels(node)
            
            WITH node, COLLECT({{consultant: rating_consultant.name, rankgroup: rating_rel.rankgroup}}) AS node_ratings, allNodes, all_rels
            
            WITH COLLECT({{
                node_id: node.id,
                ratings: [r IN node_ratings WHERE r.consultant IS NOT NULL | r]
            }}) AS ratings_map, allNodes, all_rels
            
            WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL] AS filteredNodes, 
                 all_rels, ratings_map
            
            RETURN {{
                nodes: [node IN filteredNodes | {{
                    id: node.id,
                    type: labels(node)[0],
                    data: node {{
                        .*,
                        id: node.id,
                        name: coalesce(node.name, node.id),
                        label: coalesce(node.name, node.id),
                        ratings: [rm IN ratings_map WHERE rm.node_id = node.id | rm.ratings][0]
                    }}
                }}],
                relationships: [rel IN all_rels WHERE rel IS NOT NULL AND
                               startNode(rel) IN filteredNodes AND endNode(rel) IN filteredNodes AND type(rel) <> 'RATES' | {{
                    id: toString(id(rel)),
                    source: startNode(rel).id,
                    target: endNode(rel).id,
                    type: 'custom',
                    data: rel {{
                        .*,
                        relType: type(rel),
                        sourceId: startNode(rel).id,
                        targetId: endNode(rel).id
                    }}
                }}]
            }} AS GraphData
            """
        
        return complete_query, params
    
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
    
    def _get_complete_filter_options(
        self, 
        session: Session, 
        region: str, 
        recommendations_mode: bool
    ) -> Dict[str, Any]:
        """Get ALL filter options in single optimized query."""
        
        if recommendations_mode:
            filter_query = f"""
            MATCH (c:COMPANY) WHERE c.region = '{region}'
            OPTIONAL MATCH (c)-[:OWNS]->(ip:INCUMBENT_PRODUCT)-[:BI_RECOMMENDS]->(p:PRODUCT)
            OPTIONAL MATCH path1 = (cons:CONSULTANT)-[:EMPLOYS]->(fc:FIELD_CONSULTANT)-[:COVERS]->(c)
            OPTIONAL MATCH path2 = (cons2:CONSULTANT)-[:COVERS]->(c)
            OPTIONAL MATCH (any_cons:CONSULTANT)-[rating:RATES]->(any_prod:PRODUCT)
            
            WITH c, ip, p, cons, cons2, fc, 
                 // Parse PCA/ACA server-side
                 CASE WHEN c.pca CONTAINS ',' 
                      THEN [x IN split(c.pca, ',') | trim(x)] 
                      ELSE [c.pca] END AS company_pcas,
                 CASE WHEN c.aca CONTAINS ',' 
                      THEN [x IN split(c.aca, ',') | trim(x)] 
                      ELSE [c.aca] END AS company_acas,
                 CASE WHEN cons.pca CONTAINS ',' 
                      THEN [x IN split(cons.pca, ',') | trim(x)] 
                      ELSE [cons.pca] END AS consultant_pcas,
                 CASE WHEN cons.consultant_advisor CONTAINS ',' 
                      THEN [x IN split(cons.consultant_advisor, ',') | trim(x)] 
                      ELSE [cons.consultant_advisor] END AS consultant_advisors,
                 rating.rankgroup AS rating_value
            
            RETURN {{
                markets: COLLECT(DISTINCT c.sales_region),
                channels: COLLECT(DISTINCT c.channel),
                asset_classes: COLLECT(DISTINCT p.asset_class),
                consultants: COLLECT(DISTINCT {{id: cons.name, name: cons.name}}) + 
                            COLLECT(DISTINCT {{id: cons2.name, name: cons2.name}}),
                field_consultants: COLLECT(DISTINCT {{id: fc.name, name: fc.name}}),
                companies: COLLECT(DISTINCT {{id: c.name, name: c.name}}),
                products: COLLECT(DISTINCT {{id: p.name, name: p.name}}),
                incumbent_products: COLLECT(DISTINCT {{id: ip.name, name: ip.name}}),
                // Flattened PCA/ACA values
                client_advisors: reduce(acc = [], pca_list IN COLLECT(DISTINCT company_pcas) | 
                                       acc + [item IN pca_list WHERE item IS NOT NULL AND item <> '']) +
                                reduce(acc = [], aca_list IN COLLECT(DISTINCT company_acas) | 
                                       acc + [item IN aca_list WHERE item IS NOT NULL AND item <> '']),
                consultant_advisors: reduce(acc = [], pca_list IN COLLECT(DISTINCT consultant_pcas) | 
                                           acc + [item IN pca_list WHERE item IS NOT NULL AND item <> '']) +
                                    reduce(acc = [], advisor_list IN COLLECT(DISTINCT consultant_advisors) | 
                                           acc + [item IN advisor_list WHERE item IS NOT NULL AND item <> '']),
                ratings: COLLECT(DISTINCT rating_value),
                mandate_statuses: ['Active', 'At Risk', 'Conversion in Progress'],
                influence_levels: ['1', '2', '3', '4', 'High', 'medium', 'low', 'UNK']
            }} AS FilterOptions
            """
        else:
            filter_query = f"""
            MATCH (c:COMPANY) WHERE c.region = '{region}'
            OPTIONAL MATCH (c)-[:OWNS]->(p:PRODUCT)
            OPTIONAL MATCH path1 = (cons:CONSULTANT)-[:EMPLOYS]->(fc:FIELD_CONSULTANT)-[:COVERS]->(c)
            OPTIONAL MATCH path2 = (cons2:CONSULTANT)-[:COVERS]->(c)
            OPTIONAL MATCH (any_cons:CONSULTANT)-[rating:RATES]->(any_prod:PRODUCT)
            
            WITH c, p, cons, cons2, fc,
                 // Parse PCA/ACA server-side  
                 CASE WHEN c.pca CONTAINS ',' 
                      THEN [x IN split(c.pca, ',') | trim(x)] 
                      ELSE [c.pca] END AS company_pcas,
                 CASE WHEN c.aca CONTAINS ',' 
                      THEN [x IN split(c.aca, ',') | trim(x)] 
                      ELSE [c.aca] END AS company_acas,
                 rating.rankgroup AS rating_value
            
            RETURN {{
                markets: COLLECT(DISTINCT c.sales_region),
                channels: COLLECT(DISTINCT c.channel), 
                asset_classes: COLLECT(DISTINCT p.asset_class),
                consultants: COLLECT(DISTINCT {{id: cons.name, name: cons.name}}) + 
                            COLLECT(DISTINCT {{id: cons2.name, name: cons2.name}}),
                field_consultants: COLLECT(DISTINCT {{id: fc.name, name: fc.name}}),
                companies: COLLECT(DISTINCT {{id: c.name, name: c.name}}),
                products: COLLECT(DISTINCT {{id: p.name, name: p.name}}),
                client_advisors: reduce(acc = [], pca_list IN COLLECT(DISTINCT company_pcas) | 
                                       acc + [item IN pca_list WHERE item IS NOT NULL AND item <> '']) +
                                reduce(acc = [], aca_list IN COLLECT(DISTINCT company_acas) | 
                                       acc + [item IN aca_list WHERE item IS NOT NULL AND item <> '']),
                ratings: COLLECT(DISTINCT rating_value),
                mandate_statuses: ['Active', 'At Risk', 'Conversion in Progress'],
                influence_levels: ['1', '2', '3', '4', 'High', 'medium', 'low', 'UNK']
            }} AS FilterOptions
            """
        
        result = session.run(filter_query)
        record = result.single()
        
        if record and record['FilterOptions']:
            options = record['FilterOptions']
            # Clean and limit results
            for key, value in options.items():
                if isinstance(value, list):
                    if key in ['client_advisors', 'consultant_advisors']:
                        # Remove duplicates and empty values
                        options[key] = list(set([v for v in value if v and v.strip()]))[:MAX_FILTER_RESULTS]
                    elif key in ['consultants', 'field_consultants', 'companies', 'products', 'incumbent_products']:
                        # Entity lists - remove nulls and limit
                        options[key] = [item for item in value if item.get('name')][:MAX_FILTER_RESULTS]
                    else:
                        # Simple lists - remove nulls and limit
                        options[key] = [v for v in value if v][:MAX_FILTER_RESULTS]
            
            return options
        
        return self._empty_filter_options(recommendations_mode)
    
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


# Global service instance
complete_backend_filter_service = CompleteBackendFilterService()