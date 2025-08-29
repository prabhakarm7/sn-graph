"""
Updated graph service integrating your existing query logic.
This replaces the get_region_graph method with your complex query structure.
"""
import time
from typing import Dict, List, Any, Optional, Tuple
from neo4j import GraphDatabase, Session
from neo4j.exceptions import Neo4jError

from app.config import (
    NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE,
    REGIONS, SALES_REGIONS, CHANNELS, ASSET_CLASSES, PRIVACY_LEVELS,
    MANDATE_STATUSES, RANKGROUP_VALUES, JPM_FLAG_VALUES
)


class GraphService:
    """Service class for graph database operations with integrated query logic."""
    
    def __init__(self):
        """Initialize the graph service with Neo4j connection."""
        self.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USERNAME, NEO4J_PASSWORD),
            database=NEO4J_DATABASE
        )
        
        # Define your query statements from the images
        self.fc_opening_statement = """
        Optional match (a:CONSULTANT)-[f:EMPLOYS]->(b:FIELD_CONSULTANT)
        Optional match (b:FIELD_CONSULTANT)-[i:COVERS]->(c:COMPANY)
        Optional match (c:COMPANY)-[g:OWNS]->(d:PRODUCT)
        Optional match (a:CONSULTANT)-[j:RATES]->(d:PRODUCT)
        with a,b,c,d,f,g,i,j
        """
        
        self.fc_collection_statement = """
        WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT b) + COLLECT(DISTINCT c) + COLLECT(DISTINCT d) AS allNodes,
        COLLECT(DISTINCT f) + COLLECT(DISTINCT g) + COLLECT(DISTINCT i) + COLLECT(DISTINCT j) AS allRels
        """
        
        self.fc_reverse_opening_statement = """
        Optional match (a:CONSULTANT)-[f:EMPLOYS]->(b:FIELD_CONSULTANT)
        Optional match (b:FIELD_CONSULTANT)-[i:COVERS]->(c:COMPANY)
        Optional match (c:COMPANY)-[g:OWNS]->(d:PRODUCT)
        Optional match (a:CONSULTANT)-[j:RATES]->(d:PRODUCT)
        with a,b,c,d,f,g,i,j
        """
        
        self.fc_reverse_collection_statement = """
        WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT b) + COLLECT(DISTINCT c) + COLLECT(DISTINCT d) AS allNodes,
        COLLECT(DISTINCT f) + COLLECT(DISTINCT g) + COLLECT(DISTINCT i) + COLLECT(DISTINCT j) AS allRels
        """
        
        self.no_fc_opening_statement = """
        Optional match (a:CONSULTANT)-[f:COVERS]->(c:COMPANY)
        Optional match (c:COMPANY)-[g:OWNS]->(d:PRODUCT)
        Optional match (a:CONSULTANT)-[j:RATES]->(d:PRODUCT)
        with a,c,d,f,g,j
        """
        
        self.no_fc_collection_statement = """
        WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT c) + COLLECT(DISTINCT d) AS allNodes,
        COLLECT(DISTINCT f) + COLLECT(DISTINCT g) + COLLECT(DISTINCT j) AS allRels
        """
        
        self.no_fc_reverse_opening_statement = """
        Optional match (c:COMPANY)-[g:OWNS]->(d:PRODUCT)
        Optional match (a:CONSULTANT)-[f:COVERS]->(c:COMPANY)
        Optional match (a:CONSULTANT)-[j:RATES]->(d:PRODUCT)
        with a,c,d,f,g,j
        """
        
        self.no_fc_reverse_collection_statement = """
        WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT c) + COLLECT(DISTINCT d) AS allNodes,
        COLLECT(DISTINCT f) + COLLECT(DISTINCT g) + COLLECT(DISTINCT j) AS allRels
        """
    
    def close(self):
        """Close the database connection."""
        if self.driver:
            self.driver.close()
    
    def health_check(self) -> bool:
        """Check if database connection is healthy."""
        try:
            with self.driver.session() as session:
                result = session.run("RETURN 1 as test")
                return result.single()["test"] == 1
        except Exception:
            return False
    
    def generate_filters(self, **kwargs) -> List[str]:
        """Generate filter conditions based on your existing logic."""
        filters = []
        
        # Region filter (always include if provided)
        if kwargs.get('region'):
            filters.append("a.region = $region")
            filters.append("b.region = $region") 
            filters.append("c.region = $region")
            filters.append("d.region = $region")
        
        # Product names filter
        if kwargs.get('product_names'):
            filters.append("d.name IN $product_names")
        
        # Consultant names filter  
        if kwargs.get('consultant_names'):
            filters.append("a.name IN $consultant_names")
        
        # Company names filter
        if kwargs.get('company_names'):
            filters.append("c.name IN $company_names")
        
        # Field consultant names filter
        if kwargs.get('field_consultant_names'):
            filters.append("b.name IN $field_consultant_names")
        
        # Channel names filter
        if kwargs.get('channel_names'):
            filters.append("ANY(x IN $channel_names WHERE x IN [a.channel, b.channel, c.channel])")
        
        # Asset class filter
        if kwargs.get('asset_class'):
            filters.append("d.asset_class IN $asset_class")
        
        # Sales region filter
        if kwargs.get('sales_regions'):
            filters.append("ANY(x IN $sales_regions WHERE x IN [a.sales_region, b.sales_region, c.sales_region])")
        
        # PCA filter
        if kwargs.get('pca'):
            filters.append("ANY(x IN $pca WHERE x IN [a.pca, c.pca])")
        
        # ACA filter
        if kwargs.get('aca'):
            filters.append("c.aca IN $aca")
        
        # Privacy filter
        if kwargs.get('privacy_levels'):
            filters.append("c.privacy IN $privacy_levels")
        
        # JPM flag filter
        if kwargs.get('jpm_flag'):
            filters.append("d.jpm_flag IN $jpm_flag")
        
        # Rankgroup filter (from RATES relationship)
        if kwargs.get('rankgroups'):
            filters.append("j.rankgroup IN $rankgroups")
        
        # Mandate status filter (from OWNS relationship)
        if kwargs.get('mandate_statuses'):
            filters.append("g.mandate_status IN $mandate_statuses")
        
        return filters
    
    def create_query(self, opening_statement: str, collection_statement: str, **kwargs) -> Tuple[str, Dict[str, Any]]:
        """Create the complete query based on your existing logic."""
        filters = self.generate_filters(**kwargs)
        
        # Build WHERE clause
        if filters:
            where_clause = " WHERE " + " AND ".join(filters)
        else:
            where_clause = ""
        
        # Add WHERE clause to opening statement
        if where_clause:
            opening_with_filters = opening_statement + where_clause
        else:
            opening_with_filters = opening_statement
        
        # Build the complete query
        query = f"""
        {opening_with_filters}
        {collection_statement}
        WITH (node IN allNodes WHERE node.name IS NOT NULL AND node.id IS NOT NULL) AS allNodes, allRels
        WITH (node IN allNodes | {{data: apoc.map.merge({{name: node.name, node_name: node.id, label: labels(node)[0]}}, properties(node))}}) AS filteredNodes,
        (rel IN allRels WHERE startNode(rel) IN allNodes and endNode(rel) IN allNodes |
        {{data: apoc.map.merge({{source: startNode(rel).id, target: endNode(rel).id, label: type(rel)}}, properties(rel))}}) AS filteredRelationships
        RETURN {{nodes: filteredNodes, edges: filteredRelationships}} AS Relationships
        """
        
        # Prepare parameters
        params = {k: v for k, v in kwargs.items() if v is not None}
        
        return query, params
    
    def execute_query(self, query: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute a single query with parameters."""
        print("asdasdasdasdasdasdasdasdasdasdasdasdasdasdasd")
        print(query)
        if not query:
            return {'nodes': [], 'edges': []}
        try:
            with self.driver.session() as session:
                result = session.run(query, parameters or {})
                records = list(result)
                
                if records and 'Relationships' in records[0]:
                    return records[0]['Relationships']
                else:
                    return {'nodes': [], 'edges': []}
                    
        except Exception as e:
            print(f"Query execution error: {e}")
            return {'nodes': [], 'edges': []}
    
    def union_query_results(self, *args) -> Dict[str, Any]:
        """Union multiple query results as per your existing logic."""
        if len(args) == 1:
            return args[0]
        
        if not args or not any(args):
            return {'nodes': [], 'edges': []}
        
        # Get first non-empty result as base
        base_result = None
        for result in args:
            if result and ('nodes' in result or 'edges' in result):
                base_result = result
                break
        
        if not base_result:
            return {'nodes': [], 'edges': []}
        
        nodes = list(base_result.get('nodes', []))
        edges = list(base_result.get('edges', []))
        
        existing_node_ids = {node.get('data', {}).get('id') for node in nodes if node.get('data', {}).get('id')}
        existing_rel_ids = {rel.get('data', {}).get('id') for rel in edges if rel.get('data', {}).get('id')}
        
        # Union with remaining results
        for result in args[1:]:
            if not result:
                continue
                
            for node in result.get('nodes', []):
                node_id = node.get('data', {}).get('id')
                if node_id and node_id not in existing_node_ids:
                    nodes.append(node)
                    existing_node_ids.add(node_id)
            
            for rel in result.get('edges', []):
                rel_id = rel.get('data', {}).get('id')
                if rel_id and rel_id not in existing_rel_ids:
                    edges.append(rel)
                    existing_rel_ids.add(rel_id)
        
        return {'nodes': nodes, 'edges': edges}
    
    def get_region_graph(self, region: str, **additional_filters) -> Dict[str, Any]:
        """
        Get complete graph data for a specific region using your complex query logic.
        This replaces the simple region query with your sophisticated filtering.
        """
        region = region.upper()
        
        try:
            # Prepare filter parameters
            filter_params = {'region': region}
            filter_params.update(additional_filters)
            
            # Determine if field consultant names are provided
            field_consultant_names = additional_filters.get('field_consultant_names')
            product_rec_toggle = additional_filters.get('product_rec_toggle', False)
            
            if product_rec_toggle:
                # Create queries with product recommendations (RECOMMENDS instead of OWNS)
                query_1, params_1 = self.create_query(
                    self.no_fc_opening_statement.replace('OWNS', 'RECOMMENDS'),
                    self.no_fc_collection_statement,
                    **filter_params
                )
                
                query_2, params_2 = self.create_query(
                    self.no_fc_reverse_opening_statement.replace('OWNS', 'RECOMMENDS'), 
                    self.no_fc_reverse_collection_statement,
                    **filter_params
                )
                
                query_3, params_3 = self.create_query(
                    self.fc_opening_statement.replace('OWNS', 'RECOMMENDS'),
                    self.fc_collection_statement,
                    **filter_params
                )
                
                query_4, params_4 = self.create_query(
                    self.fc_reverse_opening_statement.replace('OWNS', 'RECOMMENDS'),
                    self.fc_reverse_collection_statement,
                    **filter_params
                )
                
                # Execute all queries
                result_1 = self.execute_query(query_1, params_1)
                result_2 = self.execute_query(query_2, params_2)
                result_3 = self.execute_query(query_3, params_3)
                result_4 = self.execute_query(query_4, params_4)
                
                # Union all results
                final_result = self.union_query_results(result_1, result_2, result_3, result_4)
                
            elif not field_consultant_names:
                # No field consultant filter - use no_fc queries
                query_1, params_1 = self.create_query(
                    self.no_fc_opening_statement,
                    self.no_fc_collection_statement,
                    **filter_params
                )
                
                query_2, params_2 = self.create_query(
                    self.no_fc_reverse_opening_statement,
                    self.no_fc_reverse_collection_statement,
                    **filter_params
                )
                
                result_1 = self.execute_query(query_1, params_1)
                result_2 = self.execute_query(query_2, params_2)
                
                final_result = self.union_query_results(result_1, result_2)
                
            else:
                # Field consultant filter provided - use all queries
                query_1, params_1 = self.create_query(
                    self.fc_opening_statement,
                    self.fc_collection_statement,
                    **filter_params
                )
                
                query_2, params_2 = self.create_query(
                    self.fc_reverse_opening_statement,
                    self.fc_reverse_collection_statement,
                    **filter_params
                )
                
                query_3, params_3 = self.create_query(
                    self.no_fc_opening_statement,
                    self.no_fc_collection_statement,
                    **filter_params
                )
                
                query_4, params_4 = self.create_query(
                    self.no_fc_reverse_opening_statement,
                    self.no_fc_reverse_collection_statement,
                    **filter_params
                )
                
                result_1 = self.execute_query(query_1, params_1)
                result_2 = self.execute_query(query_2, params_2)
                result_3 = self.execute_query(query_3, params_3)
                result_4 = self.execute_query(query_4, params_4)
                
                final_result = self.union_query_results(result_1, result_2, result_3, result_4)
            
            # Convert to the expected format for the API
            nodes = []
            relationships = []
            
            # Process nodes
            for node_data in final_result.get('nodes', []):
                if 'data' in node_data:
                    data = node_data['data']
                    nodes.append({
                        "id": str(data.get('node_name', data.get('id', ''))),
                        "labels": [data.get('label', 'UNKNOWN')],
                        "properties": {k: v for k, v in data.items() if k not in ['node_name', 'id', 'label']}
                    })
            
            # Process relationships
            for rel_data in final_result.get('edges', []):
                if 'data' in rel_data:
                    data = rel_data['data']
                    relationships.append({
                        "id": str(data.get('id', '')),
                        "type": data.get('label', 'UNKNOWN'),
                        "start_node_id": str(data.get('source', '')),
                        "end_node_id": str(data.get('target', '')),
                        "properties": {k: v for k, v in data.items() if k not in ['id', 'label', 'source', 'target']}
                    })
            
            return {
                "nodes": nodes,
                "relationships": relationships,
                "metadata": {
                    "region": region,
                    "node_count": len(nodes),
                    "relationship_count": len(relationships),
                    "applied_filters": filter_params,
                    "query_type": "field_consultant" if field_consultant_names else "no_field_consultant",
                    "product_recommendations": product_rec_toggle
                }
            }
            
        except Exception as e:
            raise Exception(f"Failed to get region graph for {region}: {str(e)}")
    
    def get_region_filter_options(self, region: str) -> Dict[str, List[str]]:
        """
        Get filter options specific to a region by analyzing the data returned 
        from get_region_graph.
        """
        try:
            # Get the region data using our complex query
            region_data = self.get_region_graph(region)
            
            filter_options = {
                "regions": [region],
                "consultants": [],
                "field_consultants": [],
                "companies": [],
                "products": [],
                "incumbent_products": [],
                "channels": [],
                "sales_regions": [],
                "asset_classes": [],
                "pcas": [],
                "acas": [],
                "privacy_levels": [],
                "jpm_flags": [],
                "rankgroups": [],
                "mandate_statuses": []
            }
            
            # Extract unique values from nodes
            for node in region_data.get("nodes", []):
                labels = node.get("labels", [])
                props = node.get("properties", {})
                
                # Categorize by node type
                if "CONSULTANT" in labels:
                    if props.get("name"):
                        filter_options["consultants"].append({
                            "id": node["id"],
                            "name": props["name"]
                        })
                    if props.get("channel"):
                        filter_options["channels"].append(props["channel"])
                    if props.get("sales_region"):
                        filter_options["sales_regions"].append(props["sales_region"])
                    if props.get("pca"):
                        filter_options["pcas"].append(props["pca"])
                
                elif "FIELD_CONSULTANT" in labels:
                    if props.get("name"):
                        filter_options["field_consultants"].append({
                            "id": node["id"],
                            "name": props["name"]
                        })
                    if props.get("channel"):
                        filter_options["channels"].append(props["channel"])
                    if props.get("sales_region"):
                        filter_options["sales_regions"].append(props["sales_region"])
                
                elif "COMPANY" in labels:
                    if props.get("name"):
                        filter_options["companies"].append({
                            "id": node["id"],
                            "name": props["name"]
                        })
                    if props.get("channel"):
                        filter_options["channels"].append(props["channel"])
                    if props.get("sales_region"):
                        filter_options["sales_regions"].append(props["sales_region"])
                    if props.get("pca"):
                        filter_options["pcas"].append(props["pca"])
                    if props.get("aca"):
                        filter_options["acas"].append(props["aca"])
                    if props.get("privacy"):
                        filter_options["privacy_levels"].append(props["privacy"])
                
                elif "PRODUCT" in labels:
                    if props.get("name"):
                        filter_options["products"].append({
                            "id": node["id"],
                            "name": props["name"]
                        })
                    if props.get("asset_class"):
                        filter_options["asset_classes"].append(props["asset_class"])
                    if props.get("jpm_flag"):
                        filter_options["jpm_flags"].append(props["jpm_flag"])
                
                elif "INCUMBENT_PRODUCT" in labels:
                    if props.get("name"):
                        filter_options["incumbent_products"].append({
                            "id": node["id"],
                            "name": props["name"]
                        })
                    if props.get("jpm_flag"):
                        filter_options["jpm_flags"].append(props["jpm_flag"])
            
            # Extract values from relationships
            for rel in region_data.get("relationships", []):
                props = rel.get("properties", {})
                
                if rel.get("type") == "RATES":
                    if props.get("rankgroup"):
                        filter_options["rankgroups"].append(props["rankgroup"])
                
                elif rel.get("type") == "OWNS":
                    if props.get("mandate_status"):
                        filter_options["mandate_statuses"].append(props["mandate_status"])
            
            # Remove duplicates and sort
            for key in filter_options:
                if isinstance(filter_options[key][0] if filter_options[key] else None, dict):
                    # For entity lists with id/name pairs, remove duplicates by id
                    seen_ids = set()
                    unique_items = []
                    for item in filter_options[key]:
                        if item["id"] not in seen_ids:
                            unique_items.append(item)
                            seen_ids.add(item["id"])
                    filter_options[key] = sorted(unique_items, key=lambda x: x["name"])
                else:
                    # For simple lists, remove duplicates and sort
                    filter_options[key] = sorted(list(set(filter_options[key])))
            
            return filter_options
            
        except Exception as e:
            raise Exception(f"Failed to get region filter options for {region}: {str(e)}")
    
    # Keep all other existing methods unchanged...
    def get_database_stats(self) -> Dict[str, Any]:
        """Get comprehensive database statistics."""
        with self.driver.session() as session:
            # Total counts
            total_nodes = session.run("MATCH (n) RETURN count(n) as count").single()["count"]
            total_rels = session.run("MATCH ()-[r]->() RETURN count(r) as count").single()["count"]
            
            # Node counts by type
            node_types_result = session.run("""
                MATCH (n) 
                RETURN labels(n)[0] as label, count(n) as count 
                ORDER BY count DESC
            """)
            node_counts = {record["label"]: record["count"] for record in node_types_result}
            
            # Relationship counts by type
            rel_types_result = session.run("""
                MATCH ()-[r]->() 
                RETURN type(r) as type, count(r) as count 
                ORDER BY count DESC
            """)
            relationship_counts = {record["type"]: record["count"] for record in rel_types_result}
            
            # Region counts
            regions_result = session.run("""
                MATCH (n) 
                WHERE n.region IS NOT NULL 
                RETURN n.region as region, count(n) as count 
                ORDER BY count DESC
            """)
            region_counts = {record["region"]: record["count"] for record in regions_result}
            
            return {
                "total_nodes": total_nodes,
                "total_relationships": total_rels,
                "node_counts": node_counts,
                "relationship_counts": relationship_counts,
                "region_counts": region_counts
            }
    
    def get_filtered_graph(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Get graph data based on filter criteria using the complex query logic."""
        # Extract region from filters
        regions = filters.get("regions", [])
        if not regions:
            raise ValueError("Region is required for filtering")
        
        # For now, handle single region (can be extended for multiple regions)
        region = regions[0] if isinstance(regions, list) else regions
        
        # Use get_region_graph with additional filters
        additional_filters = {k: v for k, v in filters.items() if k != "regions"}
        
        return self.get_region_graph(region, **additional_filters)
    
    def get_filter_options(self) -> Dict[str, List[str]]:
        """Get available filter options from all regions."""
        all_options = {
            "regions": [],
            "sales_regions": [],
            "channels": [],
            "asset_classes": [],
            "consultants": [],
            "field_consultants": [],
            "companies": [],
            "products": [],
            "incumbent_products": [],
            "pcas": [],
            "acas": [],
            "rankgroups": [],
            "mandate_statuses": [],
            "jpm_flags": [],
            "privacy_levels": []
        }
        
        # Get options for each region and combine
        for region in REGIONS:
            try:
                region_options = self.get_region_filter_options(region)
                all_options["regions"].append(region)
                
                for key in all_options:
                    if key != "regions" and key in region_options:
                        if isinstance(region_options[key], list) and region_options[key]:
                            if isinstance(region_options[key][0], dict):
                                # Entity lists - extend and deduplicate later
                                all_options[key].extend(region_options[key])
                            else:
                                # Simple lists
                                all_options[key].extend(region_options[key])
            except Exception as e:
                print(f"Warning: Could not get filter options for region {region}: {e}")
        
        # Deduplicate and sort
        for key in all_options:
            if isinstance(all_options[key][0] if all_options[key] else None, dict):
                # For entity lists, deduplicate by id
                seen_ids = set()
                unique_items = []
                for item in all_options[key]:
                    if item["id"] not in seen_ids:
                        unique_items.append(item)
                        seen_ids.add(item["id"])
                all_options[key] = sorted(unique_items, key=lambda x: x["name"])
            else:
                # For simple lists
                all_options[key] = sorted(list(set(all_options[key])))
        
        return all_options
    
    # ... (keep all other existing methods like create_consultant, etc.)


# Global service instance
graph_service = GraphService()