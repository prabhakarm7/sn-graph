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
MAX_GRAPH_NODES = 50
MAX_FILTER_RESULTS = 200


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
                
                # Step 2: Execute single optimized query
                print(f"Executing complete backend query for {region}")
                result = session.run(query, params)
                records = list(result)
                
                if not records or 'GraphData' not in records[0]:
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
        """Build single optimized query with all filters and processing."""
        
        # Base query structure with flexible paths
        if recommendations_mode:
            base_match = """
            // Flexible recommendations paths
            OPTIONAL MATCH path1 = (a:CONSULTANT)-[f1:EMPLOYS]->(b:FIELD_CONSULTANT)-[i1:COVERS]->(c:COMPANY)
                   -[h1:OWNS]->(ip:INCUMBENT_PRODUCT)-[r1:BI_RECOMMENDS]->(p:PRODUCT)
            OPTIONAL MATCH (a)-[j1:RATES]->(p)
            
            OPTIONAL MATCH path2 = (a2:CONSULTANT)-[i2:COVERS]->(c2:COMPANY)
                   -[h2:OWNS]->(ip2:INCUMBENT_PRODUCT)-[r2:BI_RECOMMENDS]->(p2:PRODUCT)
            OPTIONAL MATCH (a2)-[j2:RATES]->(p2)
            """
        else:
            base_match = """
            // Flexible standard paths  
            OPTIONAL MATCH path1 = (a:CONSULTANT)-[f1:EMPLOYS]->(b:FIELD_CONSULTANT)-[i1:COVERS]->(c:COMPANY)-[g1:OWNS]->(p:PRODUCT)
            OPTIONAL MATCH (a)-[j1:RATES]->(p)
            
            OPTIONAL MATCH path2 = (a2:CONSULTANT)-[i2:COVERS]->(c2:COMPANY)-[g2:OWNS]->(p2:PRODUCT)
            OPTIONAL MATCH (a2)-[j2:RATES]->(p2)
            """
        
        # Build WHERE conditions with all filters
        where_conditions = [f"(c.region = '{region}' OR c2.region = '{region}')"]
        params = {"region": region}
        
        # Apply all filters in Cypher (server-side)
        if filters.get('consultantIds'):
            where_conditions.append("(a.name IN $consultantIds OR a2.name IN $consultantIds)")
            params['consultantIds'] = filters['consultantIds']
        
        if filters.get('clientIds'):
            where_conditions.append("(c.name IN $clientIds OR c2.name IN $clientIds)")
            params['clientIds'] = filters['clientIds']
        
        if filters.get('productIds'):
            if recommendations_mode:
                where_conditions.append("(p.name IN $productIds OR p2.name IN $productIds OR ip.name IN $productIds OR ip2.name IN $productIds)")
            else:
                where_conditions.append("(p.name IN $productIds OR p2.name IN $productIds)")
            params['productIds'] = filters['productIds']
        
        if filters.get('fieldConsultantIds'):
            where_conditions.append("b.name IN $fieldConsultantIds")
            params['fieldConsultantIds'] = filters['fieldConsultantIds']
        
        if filters.get('channels'):
            where_conditions.append("(c.channel IN $channels OR c2.channel IN $channels)")
            params['channels'] = filters['channels']
        
        if filters.get('assetClasses'):
            where_conditions.append("(p.asset_class IN $assetClasses OR p2.asset_class IN $assetClasses)")
            params['assetClasses'] = filters['assetClasses']
        
        if filters.get('sales_regions'):
            where_conditions.append("(c.sales_region IN $salesRegions OR c2.sales_region IN $salesRegions)")
            params['salesRegions'] = filters['sales_regions']
        
        if filters.get('mandateStatuses'):
            if recommendations_mode:
                where_conditions.append("(h1.mandate_status IN $mandateStatuses OR h2.mandate_status IN $mandateStatuses)")
            else:
                where_conditions.append("(g1.mandate_status IN $mandateStatuses OR g2.mandate_status IN $mandateStatuses)")
            params['mandateStatuses'] = filters['mandateStatuses']
        
        # Enhanced PCA/ACA filtering server-side
        if filters.get('clientAdvisorIds'):
            where_conditions.append("""
            (c.pca IN $clientAdvisorIds OR c.aca IN $clientAdvisorIds OR 
             c2.pca IN $clientAdvisorIds OR c2.aca IN $clientAdvisorIds OR
             // Handle comma-separated PCA/ACA values
             ANY(advisor IN $clientAdvisorIds WHERE advisor IN split(coalesce(c.pca, ''), ',')) OR
             ANY(advisor IN $clientAdvisorIds WHERE advisor IN split(coalesce(c.aca, ''), ',')) OR
             ANY(advisor IN $clientAdvisorIds WHERE advisor IN split(coalesce(c2.pca, ''), ',')) OR
             ANY(advisor IN $clientAdvisorIds WHERE advisor IN split(coalesce(c2.aca, ''), ',')))
            """)
            params['clientAdvisorIds'] = filters['clientAdvisorIds']
        
        if filters.get('consultantAdvisorIds'):
            where_conditions.append("""
            (a.pca IN $consultantAdvisorIds OR a.consultant_advisor IN $consultantAdvisorIds OR
             a2.pca IN $consultantAdvisorIds OR a2.consultant_advisor IN $consultantAdvisorIds OR
             // Handle comma-separated values
             ANY(advisor IN $consultantAdvisorIds WHERE advisor IN split(coalesce(a.pca, ''), ',')) OR
             ANY(advisor IN $consultantAdvisorIds WHERE advisor IN split(coalesce(a.consultant_advisor, ''), ',')) OR
             ANY(advisor IN $consultantAdvisorIds WHERE advisor IN split(coalesce(a2.pca, ''), ',')) OR
             ANY(advisor IN $consultantAdvisorIds WHERE advisor IN split(coalesce(a2.consultant_advisor, ''), ',')))
            """)
            params['consultantAdvisorIds'] = filters['consultantAdvisorIds']
        
        # Rating filtering server-side
        if filters.get('ratings'):
            where_conditions.append("(j1.rankgroup IN $ratings OR j2.rankgroup IN $ratings)")
            params['ratings'] = filters['ratings']
        
        where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
        
        # Complete query with embedded rating collection and processing
        if recommendations_mode:
            complete_query = f"""
            {base_match}
            WHERE {where_clause}
            
            WITH 
                COLLECT(DISTINCT a) + COLLECT(DISTINCT a2) AS consultants,
                COLLECT(DISTINCT b) AS field_consultants,
                COLLECT(DISTINCT c) + COLLECT(DISTINCT c2) AS companies,
                COLLECT(DISTINCT ip) + COLLECT(DISTINCT ip2) AS incumbent_products,
                COLLECT(DISTINCT p) + COLLECT(DISTINCT p2) AS products,
                COLLECT(DISTINCT f1) + COLLECT(DISTINCT i1) + COLLECT(DISTINCT i2) + 
                COLLECT(DISTINCT h1) + COLLECT(DISTINCT h2) + COLLECT(DISTINCT r1) + 
                COLLECT(DISTINCT r2) + COLLECT(DISTINCT j1) + COLLECT(DISTINCT j2) AS all_rels
            
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
                               startNode(rel) IN filteredNodes AND endNode(rel) IN filteredNodes | {{
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
            {base_match}
            WHERE {where_clause}
            
            WITH 
                COLLECT(DISTINCT a) + COLLECT(DISTINCT a2) AS consultants,
                COLLECT(DISTINCT b) AS field_consultants,
                COLLECT(DISTINCT c) + COLLECT(DISTINCT c2) AS companies,
                COLLECT(DISTINCT p) + COLLECT(DISTINCT p2) AS products,
                COLLECT(DISTINCT f1) + COLLECT(DISTINCT i1) + COLLECT(DISTINCT i2) + 
                COLLECT(DISTINCT g1) + COLLECT(DISTINCT g2) + COLLECT(DISTINCT j1) + COLLECT(DISTINCT j2) AS all_rels
            
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
                               startNode(rel) IN filteredNodes AND endNode(rel) IN filteredNodes | {{
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