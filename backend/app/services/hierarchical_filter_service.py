"""
Enhanced Hierarchical Filter Service with Product Recommendations Toggle
UPDATED: Uses BI_RECOMMENDS relationships and new node properties (evestment_product_guid, product_id)
"""
import time
from typing import Dict, List, Any, Optional
from neo4j import GraphDatabase, Session
from neo4j.exceptions import Neo4jError

from app.config import (
    NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE, REGIONS
)


class HierarchicalFilterService:
    """Service implementing hierarchical filter population with product recommendations support."""
    
    def __init__(self):
        """Initialize the service with Neo4j connection."""
        self.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USERNAME, NEO4J_PASSWORD),
            database=NEO4J_DATABASE
        )
    
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
    
    def get_region_data(self, region: str, recommendations_mode: bool = False) -> Dict[str, Any]:
        """
        Step 1: Initial Region Selection with Recommendations Toggle Support
        Get ALL nodes and relationships for the specified region.
        
        Args:
            region: The region to get data for (NAI, EMEA, APAC)
            recommendations_mode: If True, use BI_RECOMMENDS relationships and include INCUMBENT_PRODUCT nodes
        """
        region = region.upper()
        
        try:
            if recommendations_mode:
                print(f"🎯 RECOMMENDATIONS MODE: Getting recommendation data for region {region}")
                return self._get_recommendations_data(region)
            else:
                print(f"📊 NORMAL MODE: Getting standard data for region {region}")
                return self._get_standard_data(region)
                
        except Exception as e:
            raise Exception(f"Failed to get region data for {region}: {str(e)}")
    
    def _get_recommendations_data(self, region: str) -> Dict[str, Any]:
        """
        Get data for recommendations mode.
        Shows: consultant -> field_consultant -> companies -> incumbent_product -> product
        UPDATED: Uses BI_RECOMMENDS relationships and new node properties.
        """
        try:
            with self.driver.session() as session:
                print(f"🔄 Executing recommendations queries for region {region}")
                
                # Query 1: Main recommendations path
                recommendations_query = self.create_recommendations_query()
                print(f"Executing Recommendations Query: {recommendations_query[:200]}...")
                result_1 = self.execute_single_query(session, recommendations_query, {"region": region})
                print(f"Recommendations query returned {len(result_1.get('nodes', []))} nodes, {len(result_1.get('edges', []))} edges")
                
                # Query 2: Reverse recommendations path  
                reverse_recommendations_query = self.create_reverse_recommendations_query()
                print(f"Executing Reverse Recommendations Query: {reverse_recommendations_query[:200]}...")
                result_2 = self.execute_single_query(session, reverse_recommendations_query, {"region": region})
                print(f"Reverse recommendations query returned {len(result_2.get('nodes', []))} nodes, {len(result_2.get('edges', []))} edges")
                
                # Query 3: Direct consultant to product recommendations
                direct_recommendations_query = self.create_direct_recommendations_query()
                print(f"Executing Direct Recommendations Query: {direct_recommendations_query[:200]}...")
                result_3 = self.execute_single_query(session, direct_recommendations_query, {"region": region})
                print(f"Direct recommendations query returned {len(result_3.get('nodes', []))} nodes, {len(result_3.get('edges', []))} edges")
                
                # Union all results
                final_result = self.union_query_results(result_1, result_2, result_3)
                print(f"Final recommendations union result: {len(final_result.get('nodes', []))} nodes, {len(final_result.get('edges', []))} edges")
                
                return self._format_query_results(final_result, region, "recommendations_mode")
                
        except Exception as e:
            raise Exception(f"Failed to get recommendations data for {region}: {str(e)}")
    
    def _get_standard_data(self, region: str) -> Dict[str, Any]:
        """
        Get data for standard mode (existing logic).
        Shows: consultant -> field_consultant -> companies -> product
        With OWNS relationships.
        """
        try:
            # Define your existing complex query statements
            fc_opening_statement = """
            Optional match (a:CONSULTANT)-[f:EMPLOYS]->(b:FIELD_CONSULTANT)
            Optional match (b:FIELD_CONSULTANT)-[i:COVERS]->(c:COMPANY)
            Optional match (c:COMPANY)-[g:OWNS]->(d:PRODUCT)
            Optional match (a:CONSULTANT)-[j:RATES]->(d:PRODUCT)
            with a,b,c,d,f,g,i,j
            """
            
            fc_collection_statement = """
            WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT b) + COLLECT(DISTINCT c) + COLLECT(DISTINCT d) AS allNodes,
            COLLECT(DISTINCT f) + COLLECT(DISTINCT g) + COLLECT(DISTINCT i) + COLLECT(DISTINCT j) AS allRels
            """
            
            fc_reverse_opening_statement = """
            Optional match (d:PRODUCT)<-[g:OWNS]-(c:COMPANY)
            Optional match (c:COMPANY)<-[i:COVERS]-(b:FIELD_CONSULTANT)
            Optional match (b:FIELD_CONSULTANT)<-[f:EMPLOYS]-(a:CONSULTANT)
            Optional match (a:CONSULTANT)-[j:RATES]->(d:PRODUCT)
            with a,b,c,d,f,g,i,j
            """
            
            fc_reverse_collection_statement = """
            WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT b) + COLLECT(DISTINCT c) + COLLECT(DISTINCT d) AS allNodes,
            COLLECT(DISTINCT f) + COLLECT(DISTINCT g) + COLLECT(DISTINCT i) + COLLECT(DISTINCT j) AS allRels
            """
            
            no_fc_opening_statement = """
            Optional match (a:CONSULTANT)-[j:RATES]->(d:PRODUCT)
            Optional match (d:PRODUCT)<-[g:OWNS]-(c:COMPANY)
            with a,c,d,g,j
            """
            
            no_fc_collection_statement = """
            WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT c) + COLLECT(DISTINCT d) AS allNodes,
            COLLECT(DISTINCT g) + COLLECT(DISTINCT j) AS allRels
            """
            
            no_fc_reverse_opening_statement = """
            Optional match (c:COMPANY)-[g:OWNS]->(d:PRODUCT)
            with c,d,g
            """
            
            no_fc_reverse_collection_statement = """
            WITH COLLECT(DISTINCT c) + COLLECT(DISTINCT d) AS allNodes,
            COLLECT(DISTINCT g) AS allRels
            """
            
            with self.driver.session() as session:
                print(f"Step 1: Getting standard data for region {region}")
                
                # Execute all query variations as per your original logic
                query_1 = self.create_query_working(fc_opening_statement, fc_collection_statement, has_field_consultant=True)
                query_2 = self.create_query_working(fc_reverse_opening_statement, fc_reverse_collection_statement, has_field_consultant=True)
                query_3 = self.create_query_working(no_fc_opening_statement, no_fc_collection_statement, has_field_consultant=False)
                query_4 = self.create_query_working(no_fc_reverse_opening_statement, no_fc_reverse_collection_statement, has_field_consultant=False)
                
                print(f"Executing Standard Query 1 (FC Main): {query_1[:200]}...")
                result_1 = self.execute_single_query(session, query_1, {"region": region})
                print(f"Standard Query 1 returned {len(result_1.get('nodes', []))} nodes, {len(result_1.get('edges', []))} edges")
                
                print(f"Executing Standard Query 2 (Reverse): {query_2[:200]}...")
                result_2 = self.execute_single_query(session, query_2, {"region": region})
                print(f"Standard Query 2 returned {len(result_2.get('nodes', []))} nodes, {len(result_2.get('edges', []))} edges")
                
                print(f"Executing Standard Query 3 (Direct Rating): {query_3[:200]}...")
                result_3 = self.execute_single_query(session, query_3, {"region": region})
                print(f"Standard Query 3 returned {len(result_3.get('nodes', []))} nodes, {len(result_3.get('edges', []))} edges")
                
                print(f"Executing Standard Query 4 (Company-Product): {query_4[:200]}...")
                result_4 = self.execute_single_query(session, query_4, {"region": region})
                print(f"Standard Query 4 returned {len(result_4.get('nodes', []))} nodes, {len(result_4.get('edges', []))} edges")
                
                # Union all results
                final_result = self.union_query_results(result_1, result_2, result_3, result_4)
                print(f"Final standard union result: {len(final_result.get('nodes', []))} nodes, {len(final_result.get('edges', []))} edges")
                
                return self._format_query_results(final_result, region, "standard_mode")
                
        except Exception as e:
            raise Exception(f"Failed to get standard data for {region}: {str(e)}")
    
    def create_recommendations_query(self) -> str:
        """
        Create the main recommendations query.
        UPDATED: Uses BI_RECOMMENDS and includes new node properties (evestment_product_guid, product_id).
        """
        return """
        Optional match (a:CONSULTANT)-[f:EMPLOYS]->(b:FIELD_CONSULTANT)
        Optional match (b:FIELD_CONSULTANT)-[i:COVERS]->(c:COMPANY)
        Optional match (c:COMPANY)-[h:OWNS]->(ip:INCUMBENT_PRODUCT)
        Optional match (ip:INCUMBENT_PRODUCT)-[r:BI_RECOMMENDS]->(p:PRODUCT)
        Optional match (a:CONSULTANT)-[j:RATES]->(p:PRODUCT)
        WHERE c.region = $region
        WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT b) + COLLECT(DISTINCT c) + COLLECT(DISTINCT ip) + COLLECT(DISTINCT p) AS allNodes,
             COLLECT(DISTINCT f) + COLLECT(DISTINCT i) + COLLECT(DISTINCT h) + COLLECT(DISTINCT r) + COLLECT(DISTINCT j) AS allRels
        WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL AND node.id IS NOT NULL] AS filteredNodes, allRels
        WITH filteredNodes, [rel IN allRels WHERE rel IS NOT NULL AND startNode(rel) IN filteredNodes AND endNode(rel) IN filteredNodes] AS filteredRelationships
        RETURN {
            nodes: [node IN filteredNodes | {
                data: {
                    name: node.name,
                    node_name: node.id,
                    label: labels(node)[0],
                    id: node.id,
                    region: node.region,
                    sales_region: node.sales_region,
                    channel: node.channel,
                    asset_class: node.asset_class,
                    privacy: node.privacy,
                    jpm_flag: node.jpm_flag,
                    pca: node.pca,
                    aca: node.aca,
                    consultant_advisor: node.consultant_advisor,
                    evestment_product_guid: node.evestment_product_guid,
                    universe_name: node.universe_name,
                    universe_score: node.universe_score
                }
            }],
            edges: [rel IN filteredRelationships | {
                data: {
                    id: toString(id(rel)),
                    source: startNode(rel).id,
                    target: endNode(rel).id,
                    label: type(rel),
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
                }
            }]
        } AS Relationships
        """
    
    def create_reverse_recommendations_query(self) -> str:
        """
        Create the reverse recommendations query.
        UPDATED: Uses BI_RECOMMENDS and includes new node properties.
        """
        return """
        Optional match (p:PRODUCT)<-[r:BI_RECOMMENDS]-(ip:INCUMBENT_PRODUCT)
        Optional match (ip:INCUMBENT_PRODUCT)<-[h:OWNS]-(c:COMPANY)
        Optional match (c:COMPANY)<-[i:COVERS]-(b:FIELD_CONSULTANT)
        Optional match (b:FIELD_CONSULTANT)<-[f:EMPLOYS]-(a:CONSULTANT)
        Optional match (a:CONSULTANT)-[j:RATES]->(p:PRODUCT)
        WHERE c.region = $region
        WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT b) + COLLECT(DISTINCT c) + COLLECT(DISTINCT ip) + COLLECT(DISTINCT p) AS allNodes,
             COLLECT(DISTINCT f) + COLLECT(DISTINCT i) + COLLECT(DISTINCT h) + COLLECT(DISTINCT r) + COLLECT(DISTINCT j) AS allRels
        WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL AND node.id IS NOT NULL] AS filteredNodes, allRels
        WITH filteredNodes, [rel IN allRels WHERE rel IS NOT NULL AND startNode(rel) IN filteredNodes AND endNode(rel) IN filteredNodes] AS filteredRelationships
        RETURN {
            nodes: [node IN filteredNodes | {
                data: {
                    name: node.name,
                    node_name: node.id,
                    label: labels(node)[0],
                    id: node.id,
                    region: node.region,
                    sales_region: node.sales_region,
                    channel: node.channel,
                    asset_class: node.asset_class,
                    privacy: node.privacy,
                    jpm_flag: node.jpm_flag,
                    pca: node.pca,
                    aca: node.aca,
                    consultant_advisor: node.consultant_advisor,
                    evestment_product_guid: node.evestment_product_guid
                }
            }],
            edges: [rel IN filteredRelationships | {
                data: {
                    id: toString(id(rel)),
                    source: startNode(rel).id,
                    target: endNode(rel).id,
                    label: type(rel),
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
                }
            }]
        } AS Relationships
        """
    
    def create_direct_recommendations_query(self) -> str:
        """
        Create direct consultant to product recommendations query.
        UPDATED: Uses BI_RECOMMENDS and includes new node properties.
        """
        return """
        Optional match (a:CONSULTANT)-[j:RATES]->(p:PRODUCT)
        Optional match (p:PRODUCT)<-[r:BI_RECOMMENDS]-(ip:INCUMBENT_PRODUCT)
        Optional match (ip:INCUMBENT_PRODUCT)<-[h:OWNS]-(c:COMPANY)
        WHERE c.region = $region
        WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT p) + COLLECT(DISTINCT ip) AS allNodes,
             COLLECT(DISTINCT j) + COLLECT(DISTINCT r) AS allRels
        WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL AND node.id IS NOT NULL] AS filteredNodes, allRels
        WITH filteredNodes, [rel IN allRels WHERE rel IS NOT NULL AND startNode(rel) IN filteredNodes AND endNode(rel) IN filteredNodes] AS filteredRelationships
        RETURN {
            nodes: [node IN filteredNodes | {
                data: {
                    name: node.name,
                    node_name: node.id,
                    label: labels(node)[0],
                    id: node.id,
                    region: node.region,
                    sales_region: node.sales_region,
                    channel: node.channel,
                    asset_class: node.asset_class,
                    privacy: node.privacy,
                    jpm_flag: node.jpm_flag,
                    pca: node.pca,
                    aca: node.aca,
                    consultant_advisor: node.consultant_advisor,
                    evestment_product_guid: node.evestment_product_guid
                }
            }],
            edges: [rel IN filteredRelationships | {
                data: {
                    id: toString(id(rel)),
                    source: startNode(rel).id,
                    target: endNode(rel).id,
                    label: type(rel),
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
                }
            }]
        } AS Relationships
        """
    
    def create_query_working(self, opening_statement: str, collection_statement: str, has_field_consultant: bool = False) -> str:
        """
        Existing query building method for standard mode.
        UPDATED: Includes new node properties.
        """
        if has_field_consultant:
            where_clause = " WHERE c.region = $region"
        else:
            where_clause = " WHERE c.region = $region"
            if "c:" not in opening_statement:
                where_clause = " WHERE c.region = $region"
        
        opening_with_filter = opening_statement + where_clause
        
        return f"""
        {opening_with_filter}
        {collection_statement}
        WITH [node IN allNodes WHERE node IS NOT NULL AND node.name IS NOT NULL AND node.id IS NOT NULL] AS filteredNodes, allRels
        WITH filteredNodes, [rel IN allRels WHERE rel IS NOT NULL AND startNode(rel) IN filteredNodes AND endNode(rel) IN filteredNodes] AS filteredRelationships
        RETURN {{
            nodes: [node IN filteredNodes | {{
                data: {{
                    name: node.name,
                    node_name: node.id,
                    label: labels(node)[0],
                    id: node.id,
                    region: node.region,
                    sales_region: node.sales_region,
                    channel: node.channel,
                    asset_class: node.asset_class,
                    privacy: node.privacy,
                    jpm_flag: node.jpm_flag,
                    pca: node.pca,
                    aca: node.aca,
                    consultant_advisor: node.consultant_advisor,
                    evestment_product_guid: node.evestment_product_guid,
                    consultant_id: node.consultant_id
                }}
            }}],
            edges: [rel IN filteredRelationships | {{
                data: {{
                    id: toString(id(rel)),
                    source: startNode(rel).id,
                    target: endNode(rel).id,
                    label: type(rel),
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
                    multi_mandate_manager: rel.multi_mandate_manager
                }}
            }}]
        }} AS Relationships
        """
    
    def _format_query_results(self, final_result: Dict[str, Any], region: str, mode: str) -> Dict[str, Any]:
        """Format query results into the expected response format."""
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
        
        # Count different node types for metadata
        node_type_counts = {}
        for node in nodes:
            for label in node.get("labels", []):
                node_type_counts[label] = node_type_counts.get(label, 0) + 1
        
        # Count recommendation-specific data - UPDATED to use BI_RECOMMENDS
        recommendations_count = sum(1 for rel in relationships if rel.get("type") == "BI_RECOMMENDS")
        incumbent_products_count = node_type_counts.get("INCUMBENT_PRODUCT", 0)
        
        return {
            "nodes": nodes,
            "relationships": relationships,
            "metadata": {
                "region": region,
                "mode": mode,
                "node_count": len(nodes),
                "relationship_count": len(relationships),
                "node_type_counts": node_type_counts,
                "recommendations_count": recommendations_count,
                "incumbent_products_count": incumbent_products_count,
                "timestamp": time.time(),
                "query_type": f"{mode}_complex_union",
                "queries_executed": 3 if mode == "recommendations_mode" else 4
            }
        }
    
    def execute_single_query(self, session: Session, query: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single query and return the result."""
        try:
            result = session.run(query, parameters)
            records = list(result)
            return {'nodes': records[0]['Relationships']['nodes'], 'edges': records[0]['Relationships']['edges']}
            if records and 'Relationships' in records[0]:
                return {'nodes': records[0]['Relationships']['nodes'], 'edges': records[0]['Relationships']['edges']}
            else:
                print("Query returned no records with 'Relationships' key")
                return {'nodes': [], 'edges': []}
                
        except Exception as e:
            print(f"Query execution error: {e}")
            return {'nodes': [], 'edges': []}
    
    def union_query_results(self, *args) -> Dict[str, Any]:
        """Union multiple query results."""
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
    
    def populate_filter_options(self, region_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Step 2: Enhanced filter population that supports both modes.
        UPDATED: Added new filters for evestment_product_guid, product_id, and updated relationship properties.
        ENHANCED: Unpacks comma-separated PCA/ACA values for client_advisors filter.
        """
        region = region_data["metadata"]["region"]
        mode = region_data["metadata"].get("mode", "standard_mode")
        nodes = region_data["nodes"]
        relationships = region_data["relationships"]
        
        print(f"\n🚀 DEBUG: ===== FILTER POPULATION START ({mode.upper()}) =====")
        print(f"📍 DEBUG: Processing region: {region}")
        print(f"📊 DEBUG: Input data - {len(nodes)} nodes, {len(relationships)} relationships")
        
        # Extract node type breakdown
        node_type_counts = {}
        for node in nodes:
            labels = node.get("labels", [])
            for label in labels:
                node_type_counts[label] = node_type_counts.get(label, 0) + 1
        
        print(f"📈 DEBUG: Node type breakdown: {node_type_counts}")
        
        # Extract companies and consultants for reference
        companies = [node for node in nodes if "COMPANY" in node.get("labels", [])]
        consultants = [node for node in nodes if "CONSULTANT" in node.get("labels", [])]
        products = [node for node in nodes if "PRODUCT" in node.get("labels", [])]
        incumbent_products = [node for node in nodes if "INCUMBENT_PRODUCT" in node.get("labels", [])]
        
        print(f"🏢 DEBUG: Found {len(companies)} companies")
        print(f"👨‍💼 DEBUG: Found {len(consultants)} consultants")
        print(f"📦 DEBUG: Found {len(products)} products")
        if mode == "recommendations_mode":
            print(f"🔄 DEBUG: Found {len(incumbent_products)} incumbent products")
        
        filter_options = {}
        
        print(f"\n📋 DEBUG: ===== POPULATING FILTERS ({mode.upper()}) =====")
        
        # Standard filters (keeping original filter structure)
        filter_options["markets"] = self.get_param_filter_list('sales_region', companies, True)
        filter_options["channels"] = self.get_param_filter_list('channel', companies, True)
        filter_options["field_consultants"] = self.get_node_filter_list('FIELD_CONSULTANT', nodes)
        filter_options["products"] = self.get_node_filter_list('PRODUCT', nodes)
        filter_options["companies"] = self.get_node_filter_list('COMPANY', nodes)
        filter_options["consultants"] = self.get_node_filter_list('CONSULTANT', nodes)
        filter_options["consultant_rankings"] = self.get_param_filter_list('rankgroup', relationships, True)
        filter_options["influence_levels"] = self.get_param_filter_list('level_of_influence', relationships, True)
        
        # Asset classes (from products)
        filter_options["asset_classes"] = self.get_param_filter_list('asset_class', products, True)
        
        # Mode-specific filters - only add incumbent_products for recommendations mode
        if mode == "recommendations_mode":
            print(f"🎯 DEBUG: Adding incumbent products for recommendations mode...")
            filter_options["incumbent_products"] = self.get_node_filter_list('INCUMBENT_PRODUCT', nodes)
        
        # ENHANCED: Unpack comma-separated PCA/ACA values for client_advisors
        print(f"🔍 DEBUG: Unpacking PCA/ACA values for client_advisors...")
        
        # Get raw PCA/ACA values from companies
        company_pcas_raw = self.get_param_filter_list_by_node_type('pca', nodes, 'COMPANY', False)
        company_acas_raw = self.get_param_filter_list_by_node_type('aca', nodes, 'COMPANY', False)
        
        print(f"📝 DEBUG: Raw company PCAs: {company_pcas_raw}")
        print(f"📝 DEBUG: Raw company ACAs: {company_acas_raw}")
        
        # Unpack comma-separated values
        unpacked_client_advisors = []
        
        #Process PCA values
        for pca_value in company_pcas_raw:
            if pca_value and pca_value.strip():
                # Handle both JSON array strings and comma-separated strings
                if pca_value.startswith('[') and pca_value.endswith(']'):
                    # Parse JSON array string: "['Akash Patel','jinny desouze']"
                    try:
                        import ast
                        parsed_values = ast.literal_eval(pca_value)
                        if isinstance(parsed_values, list):
                            for val in parsed_values:
                                if val and str(val).strip():
                                    unpacked_client_advisors.append(str(val).strip())
                    except (ValueError, SyntaxError) as e:
                        print(f"⚠️ DEBUG: Failed to parse PCA array string '{pca_value}': {e}")
                        # Fallback: treat as comma-separated
                        split_values = [val.strip() for val in pca_value.split(',') if val.strip()]
                        unpacked_client_advisors.extend(split_values)
                else:
                    # Regular comma-separated string
                    split_values = [val.strip() for val in pca_value.split(',') if val.strip()]
                    unpacked_client_advisors.extend(split_values)
        
        # Process ACA values
        for aca_value in company_acas_raw:
            if aca_value and aca_value.strip():
                # Handle both JSON array strings and comma-separated strings
                if aca_value.startswith('[') and aca_value.endswith(']'):
                    # Parse JSON array string: "['Akash Patel','jinny desouze']"
                    try:
                        import ast
                        parsed_values = ast.literal_eval(aca_value)
                        if isinstance(parsed_values, list):
                            for val in parsed_values:
                                if val and str(val).strip():
                                    unpacked_client_advisors.append(str(val).strip())
                    except (ValueError, SyntaxError) as e:
                        print(f"⚠️ DEBUG: Failed to parse ACA array string '{aca_value}': {e}")
                        # Fallback: treat as comma-separated
                        split_values = [val.strip() for val in aca_value.split(',') if val.strip()]
                        unpacked_client_advisors.extend(split_values)
                else:
                    # Regular comma-separated string
                    split_values = [val.strip() for val in aca_value.split(',') if val.strip()]
                    unpacked_client_advisors.extend(split_values)
        
        # Remove duplicates and sort
        filter_options["client_advisors"] = sorted(list(set(unpacked_client_advisors)))
        
        print(f"✅ DEBUG: Unpacked client_advisors: {len(filter_options['client_advisors'])} unique values")
        print(f"🎯 DEBUG: Client advisors sample: {filter_options['client_advisors'][:10]}")
        
        # ENHANCED: Also unpack consultant advisors if needed
        consultant_pcas_raw = self.get_param_filter_list_by_node_type('pca', nodes, 'CONSULTANT', False)
        consultant_advisors_raw = self.get_param_filter_list_by_node_type('consultant_advisor', nodes, 'CONSULTANT', False)
        
        unpacked_consultant_advisors = []
        
        # Process consultant PCA values
        for pca_value in consultant_pcas_raw:
            if pca_value and pca_value.strip():
                split_values = [val.strip() for val in pca_value.split(',') if val.strip()]
                unpacked_consultant_advisors.extend(split_values)
        
        # Process consultant advisor values
        for advisor_value in consultant_advisors_raw:
            if advisor_value and advisor_value.strip():
                split_values = [val.strip() for val in advisor_value.split(',') if val.strip()]
                unpacked_consultant_advisors.extend(split_values)
        
        filter_options["consultant_advisors"] = sorted(list(set(unpacked_consultant_advisors)))
        
        print(f"✅ DEBUG: Unpacked consultant_advisors: {len(filter_options['consultant_advisors'])} unique values")
        
        # Legacy filters (keeping original structure for backward compatibility)
        filter_options["pcas"] = self.get_param_filter_list('pca', nodes, True)
        filter_options["acas"] = self.get_param_filter_list('aca', nodes, True)
        filter_options["mandate_statuses"] = self.get_param_filter_list('mandate_status', relationships, True)
        filter_options["privacy_levels"] = self.get_param_filter_list('privacy', companies, True)
        filter_options["jpm_flags"] = self.get_param_filter_list('jpm_flag', nodes, True)
        
        print(f"\n📊 DEBUG: ===== FILTER POPULATION SUMMARY ({mode.upper()}) =====")
        for key, value in filter_options.items():
            count = len(value) if isinstance(value, list) else 0
            print(f"   {key}: {count} options")
        
        total_options = sum(len(options) if isinstance(options, list) else 0 for options in filter_options.values())
        print(f"🎯 DEBUG: Total filter options generated: {total_options}")
        print(f"✅ DEBUG: ===== FILTER POPULATION COMPLETE ({mode.upper()}) =====\n")
        
        metadata = {
            "total_options_count": total_options,
            "populated_at": time.time(),
            "source_node_count": len(nodes),
            "source_relationship_count": len(relationships),
            "node_type_breakdown": node_type_counts,
            "mode": mode,
            "pca_aca_breakdown": {
                "company_pcas_raw_count": len(company_pcas_raw),
                "company_acas_raw_count": len(company_acas_raw),
                "consultant_pcas_raw_count": len(consultant_pcas_raw),
                "consultant_advisors_raw_count": len(consultant_advisors_raw),
                "client_advisors_unpacked_count": len(filter_options["client_advisors"]),
                "consultant_advisors_unpacked_count": len(filter_options["consultant_advisors"]),
                "note": "Values are now unpacked from comma-separated strings"
            }
        }
        
        # Add recommendations-specific metadata
        if mode == "recommendations_mode":
            metadata["recommendations_breakdown"] = {
                "incumbent_products_count": len(incumbent_products),
                "recommendations_count": region_data["metadata"].get("recommendations_count", 0),
                "note": "Node and edge data enriched with new properties (evestment_product_guid, product_id, etc.) but filters kept minimal"
            }
        
        return {
            "region": region,
            "filter_options": filter_options,
            "metadata": metadata
        }
    
    def get_param_filter_list_by_node_type(self, param_name: str, elements: List[Dict], node_type: str, unique_only: bool = False) -> List[str]:
        """Enhanced helper function to extract parameter values from specific node types."""
        values = []
        matching_nodes = 0
        total_nodes = len([e for e in elements if isinstance(e, dict) and e.get('labels')])
        
        print(f"🔍 DEBUG: Searching for '{param_name}' in {node_type} nodes from {total_nodes} total nodes")
        
        for element in elements:
            if isinstance(element, dict):
                labels = element.get('labels', [])
                if node_type in labels:
                    matching_nodes += 1
                    props = element.get('properties', {})
                    if param_name in props and props[param_name] is not None and props[param_name] != "":
                        values.append(str(props[param_name]))
        
        print(f"📊 DEBUG: Found {matching_nodes} {node_type} nodes, extracted {len(values)} '{param_name}' values")
        
        if unique_only:
            original_count = len(values)
            values = list(set(values))
            print(f"🔧 DEBUG: Deduplicated {original_count} values to {len(values)} unique values")
        
        filtered_values = [v for v in values if v and v != "null"]
        final_values = sorted(filtered_values)
        print(f"✅ DEBUG: Final {param_name} list for {node_type}: {len(final_values)} values")
        
        return final_values
    
    def get_param_filter_list(self, param_name: str, elements: List[Dict], unique_only: bool = False) -> List[str]:
        """Helper function to extract unique parameter values from elements."""
        values = []
        processed_elements = 0
        
        for element in elements:
            if isinstance(element, dict):
                processed_elements += 1
                props = element.get('properties', {})
                if param_name in props and props[param_name] is not None and props[param_name] != "":
                    values.append(str(props[param_name]))
        
        if unique_only:
            values = list(set(values))
        
        filtered_values = [v for v in values if v and v != "null"]
        return sorted(filtered_values)
    
    def get_node_filter_list(self, node_type: str, elements: List[Dict]) -> List[Dict[str, str]]:
        """Helper function to get node filter list with id and name."""
        nodes = []
        
        for element in elements:
            if isinstance(element, dict):
                labels = element.get('labels', [])
                if node_type in labels:
                    props = element.get('properties', {})
                    if props.get('name'):
                        nodes.append({
                            "id": element.get('id', ''),
                            "name": props['name']
                        })
        
        # Remove duplicates based on id and sort by name
        seen_ids = set()
        unique_nodes = []
        for node in nodes:
            if node['id'] not in seen_ids:
                unique_nodes.append(node)
                seen_ids.add(node['id'])
        
        return sorted(unique_nodes, key=lambda x: x['name'])
    
    def get_region_with_filters(self, region: str, recommendations_mode: bool = False) -> Dict[str, Any]:
        """
        Complete workflow: Get region data and populate filters with recommendations support.
        """
        try:
            # Step 1: Get region data (normal or recommendations mode)
            mode_text = "recommendations" if recommendations_mode else "standard"
            print(f"Step 1: Getting {mode_text} data for region {region}")
            region_data = self.get_region_data(region, recommendations_mode)
            
            # Step 2: Populate filters based on the data
            print(f"Step 2: Populating filters based on {region} {mode_text} data")
            filter_data = self.populate_filter_options(region_data)
            
            return {
                "success": True,
                "region": region,
                "data": region_data,
                "filters": filter_data["filter_options"],
                "metadata": {
                    "region_metadata": region_data["metadata"],
                    "filter_metadata": filter_data["metadata"],
                    "workflow_completed_at": time.time(),
                    "recommendations_mode": recommendations_mode
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "region": region,
                "error": str(e),
                "metadata": {
                    "error_at": time.time(),
                    "recommendations_mode": recommendations_mode
                }
            }
    
    def change_region(self, new_region: str, recommendations_mode: bool = False) -> Dict[str, Any]:
        """
        Step 3: Region Change Handler with recommendations support.
        """
        mode_text = "recommendations" if recommendations_mode else "standard"
        print(f"Region changed to {new_region} ({mode_text} mode) - fetching new data and updating filters")
        return self.get_region_with_filters(new_region, recommendations_mode)
    
    def get_available_regions(self) -> List[str]:
        """Get list of available regions."""
        return REGIONS
    
    def validate_region(self, region: str) -> bool:
        """Validate if region is supported."""
        return region.upper() in REGIONS


# Global service instance
hierarchical_filter_service = HierarchicalFilterService()