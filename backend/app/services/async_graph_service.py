"""
Async Graph service for handling Neo4j database operations.
Provides high-level async interface for CRUD operations on the smart network graph.
"""
import time
from typing import Dict, List, Any, Optional, Tuple
from neo4j import AsyncGraphDatabase, AsyncDriver, AsyncSession
from neo4j.exceptions import Neo4jError

from app.config import (
    NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE,
    REGIONS, SALES_REGIONS, CHANNELS, ASSET_CLASSES, PRIVACY_LEVELS,
    MANDATE_STATUSES, RANKGROUP_VALUES, JPM_FLAG_VALUES
)


class AsyncGraphService:
    """Async service class for graph database operations."""
    
    def __init__(self):
        """Initialize the async graph service with Neo4j connection."""
        self.driver: Optional[AsyncDriver] = None
        self._database = NEO4J_DATABASE
        
    async def connect(self):
        """Initialize the async driver."""
        if not self.driver:
            self.driver = AsyncGraphDatabase.driver(
                NEO4J_URI,
                auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
            )
    
    async def close(self):
        """Close the database connection."""
        if self.driver:
            await self.driver.close()
            self.driver = None
    
    async def health_check(self) -> bool:
        """Check if database connection is healthy."""
        try:
            if not self.driver:
                await self.connect()
            
            async with self.driver.session(database=self._database) as session:
                result = await session.run("RETURN 1 as test")
                record = await result.single()
                return record["test"] == 1
        except Exception:
            return False
    
    # ===== GRAPH DATA RETRIEVAL =====
    
    async def get_region_graph(self, region: str) -> Dict[str, Any]:
        """Get complete graph data for a specific region."""
        if not self.driver:
            await self.connect()
            
        region = region.upper()
        
        async with self.driver.session(database=self._database) as session:
            # Get all nodes in the region
            nodes_query = """
            MATCH (n {region: $region})
            RETURN n, labels(n) as labels, id(n) as neo4j_id
            ORDER BY labels(n)[0], n.name
            """
            
            nodes_result = await session.run(nodes_query, {"region": region})
            nodes = []
            
            async for record in nodes_result:
                node_data = dict(record["n"])
                nodes.append({
                    "id": str(record["neo4j_id"]),
                    "labels": record["labels"],
                    "properties": node_data
                })
            
            # Get all relationships between nodes in this region
            relationships_query = """
            MATCH (source {region: $region})-[r]->(target {region: $region})
            RETURN r, type(r) as rel_type, id(r) as neo4j_id,
                   id(source) as source_id, id(target) as target_id
            ORDER BY type(r)
            """
            
            rels_result = await session.run(relationships_query, {"region": region})
            relationships = []
            
            async for record in rels_result:
                rel_data = dict(record["r"])
                relationships.append({
                    "id": str(record["neo4j_id"]),
                    "type": record["rel_type"],
                    "start_node_id": str(record["source_id"]),
                    "end_node_id": str(record["target_id"]),
                    "properties": rel_data
                })
            
            return {
                "nodes": nodes,
                "relationships": relationships,
                "metadata": {
                    "region": region,
                    "node_count": len(nodes),
                    "relationship_count": len(relationships)
                }
            }
    
    async def get_filtered_graph(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Get graph data based on filter criteria."""
        if not self.driver:
            await self.connect()
            
        async with self.driver.session(database=self._database) as session:
            # Build dynamic WHERE clause
            where_clauses = []
            params = {}
            
            # Region filter
            if filters.get("regions"):
                where_clauses.append("n.region IN $regions")
                params["regions"] = filters["regions"]
            
            # Node type filter
            if filters.get("node_types"):
                node_labels = " OR ".join([f"n:{label}" for label in filters["node_types"]])
                where_clauses.append(f"({node_labels})")
            
            # Sales region filter
            if filters.get("sales_regions"):
                where_clauses.append("n.sales_region IN $sales_regions")
                params["sales_regions"] = filters["sales_regions"]
            
            # Channel filter
            if filters.get("channels"):
                where_clauses.append("n.channel IN $channels")
                params["channels"] = filters["channels"]
            
            # Asset class filter
            if filters.get("asset_classes"):
                where_clauses.append("n.asset_class IN $asset_classes")
                params["asset_classes"] = filters["asset_classes"]
            
            # Privacy filter
            if filters.get("privacy_levels"):
                where_clauses.append("n.privacy IN $privacy_levels")
                params["privacy_levels"] = filters["privacy_levels"]
            
            # JPM flag filter (fixed typo)
            if filters.get("jpm_flag"):
                where_clauses.append("n.jpm_flag IN $jpm_flag")
                params["jpm_flag"] = filters["jpm_flag"]
            
            # Build query
            where_clause = " AND ".join(where_clauses) if where_clauses else "TRUE"
            
            nodes_query = f"""
            MATCH (n)
            WHERE {where_clause}
            RETURN n, labels(n) as labels, id(n) as neo4j_id
            ORDER BY labels(n)[0], n.name
            """
            
            nodes_result = await session.run(nodes_query, params)
            nodes = []
            node_ids = set()
            
            async for record in nodes_result:
                node_id = str(record["neo4j_id"])
                node_ids.add(node_id)
                node_data = dict(record["n"])
                nodes.append({
                    "id": node_id,
                    "labels": record["labels"],
                    "properties": node_data
                })
            
            # Get relationships between filtered nodes
            if node_ids:
                relationships_query = """
                MATCH (source)-[r]->(target)
                WHERE id(source) IN $node_ids AND id(target) IN $node_ids
                RETURN r, type(r) as rel_type, id(r) as neo4j_id,
                       id(source) as source_id, id(target) as target_id
                ORDER BY type(r)
                """
                
                rels_result = await session.run(relationships_query, {"node_ids": list(map(int, node_ids))})
                relationships = []
                
                async for record in rels_result:
                    rel_data = dict(record["r"])
                    relationships.append({
                        "id": str(record["neo4j_id"]),
                        "type": record["rel_type"],
                        "start_node_id": str(record["source_id"]),
                        "end_node_id": str(record["target_id"]),
                        "properties": rel_data
                    })
            else:
                relationships = []
            
            return {
                "nodes": nodes,
                "relationships": relationships,
                "metadata": {
                    "filters_applied": filters,
                    "node_count": len(nodes),
                    "relationship_count": len(relationships)
                }
            }
    
    # ===== STATISTICS AND METADATA =====
    
    async def get_database_stats(self) -> Dict[str, Any]:
        """Get comprehensive database statistics."""
        if not self.driver:
            await self.connect()
            
        async with self.driver.session(database=self._database) as session:
            # Total counts
            total_nodes_result = await session.run("MATCH (n) RETURN count(n) as count")
            total_nodes = (await total_nodes_result.single())["count"]
            
            total_rels_result = await session.run("MATCH ()-[r]->() RETURN count(r) as count")
            total_rels = (await total_rels_result.single())["count"]
            
            # Node counts by type
            node_types_result = await session.run("""
                MATCH (n) 
                RETURN labels(n)[0] as label, count(n) as count 
                ORDER BY count DESC
            """)
            node_counts = {}
            async for record in node_types_result:
                node_counts[record["label"]] = record["count"]
            
            # Relationship counts by type
            rel_types_result = await session.run("""
                MATCH ()-[r]->() 
                RETURN type(r) as type, count(r) as count 
                ORDER BY count DESC
            """)
            relationship_counts = {}
            async for record in rel_types_result:
                relationship_counts[record["type"]] = record["count"]
            
            # Region counts
            regions_result = await session.run("""
                MATCH (n) 
                WHERE n.region IS NOT NULL 
                RETURN n.region as region, count(n) as count 
                ORDER BY count DESC
            """)
            region_counts = {}
            async for record in regions_result:
                region_counts[record["region"]] = record["count"]
            
            return {
                "total_nodes": total_nodes,
                "total_relationships": total_rels,
                "node_counts": node_counts,
                "relationship_counts": relationship_counts,
                "region_counts": region_counts
            }
    
    async def get_region_stats(self, region: str) -> Dict[str, Any]:
        """Get statistics for a specific region."""
        if not self.driver:
            await self.connect()
            
        region = region.upper()
        
        async with self.driver.session(database=self._database) as session:
            # Node counts by type in region
            node_counts_result = await session.run("""
                MATCH (n {region: $region})
                RETURN labels(n)[0] as label, count(n) as count
                ORDER BY count DESC
            """, {"region": region})
            
            node_counts = {}
            async for record in node_counts_result:
                node_counts[record["label"]] = record["count"]
            
            # Relationship counts in region
            rel_counts_result = await session.run("""
                MATCH (source {region: $region})-[r]->(target {region: $region})
                RETURN type(r) as type, count(r) as count
                ORDER BY count DESC
            """, {"region": region})
            
            relationship_counts = {}
            async for record in rel_counts_result:
                relationship_counts[record["type"]] = record["count"]
            
            return {
                "region": region,
                "node_counts": node_counts,
                "relationship_counts": relationship_counts,
                "total_nodes": sum(node_counts.values()),
                "total_relationships": sum(relationship_counts.values())
            }
    
    async def get_filter_options(self) -> Dict[str, List[str]]:
        """Get available filter options from the database."""
        if not self.driver:
            await self.connect()
            
        async with self.driver.session(database=self._database) as session:
            filter_options = {}
            
            # Get unique regions
            regions_result = await session.run("MATCH (n) WHERE n.region IS NOT NULL RETURN DISTINCT n.region as value ORDER BY value")
            filter_options["regions"] = []
            async for record in regions_result:
                filter_options["regions"].append(record["value"])
            
            # Get unique sales regions
            sales_regions_result = await session.run("MATCH (n) WHERE n.sales_region IS NOT NULL RETURN DISTINCT n.sales_region as value ORDER BY value")
            filter_options["sales_regions"] = []
            async for record in sales_regions_result:
                filter_options["sales_regions"].append(record["value"])
            
            # Get unique channels
            channels_result = await session.run("MATCH (n) WHERE n.channel IS NOT NULL RETURN DISTINCT n.channel as value ORDER BY value")
            filter_options["channels"] = []
            async for record in channels_result:
                filter_options["channels"].append(record["value"])
            
            # Get unique asset classes
            asset_classes_result = await session.run("MATCH (n) WHERE n.asset_class IS NOT NULL RETURN DISTINCT n.asset_class as value ORDER BY value")
            filter_options["asset_classes"] = []
            async for record in asset_classes_result:
                filter_options["asset_classes"].append(record["value"])
            
            # Get unique PCAs
            pcas_result = await session.run("MATCH (n) WHERE n.pca IS NOT NULL RETURN DISTINCT n.pca as value ORDER BY value")
            filter_options["pcas"] = []
            async for record in pcas_result:
                filter_options["pcas"].append(record["value"])
            
            # Get unique ACAs
            acas_result = await session.run("MATCH (n) WHERE n.aca IS NOT NULL RETURN DISTINCT n.aca as value ORDER BY value")
            filter_options["acas"] = []
            async for record in acas_result:
                filter_options["acas"].append(record["value"])
            
            # Get unique privacy levels
            privacy_result = await session.run("MATCH (n) WHERE n.privacy IS NOT NULL RETURN DISTINCT n.privacy as value ORDER BY value")
            filter_options["privacy_levels"] = []
            async for record in privacy_result:
                filter_options["privacy_levels"].append(record["value"])
            
            # Get unique JPM flags (fixed typo)
            jpm_flags_result = await session.run("MATCH (n) WHERE n.jpm_flag IS NOT NULL RETURN DISTINCT n.jpm_flag as value ORDER BY value")
            filter_options["jpm_flags"] = []
            async for record in jpm_flags_result:
                filter_options["jpm_flags"].append(record["value"])
            
            # Get unique mandate statuses from relationships
            mandate_statuses_result = await session.run("MATCH ()-[r:OWNS]->() WHERE r.mandate_status IS NOT NULL RETURN DISTINCT r.mandate_status as value ORDER BY value")
            filter_options["mandate_statuses"] = []
            async for record in mandate_statuses_result:
                filter_options["mandate_statuses"].append(record["value"])
            
            # Get unique rank groups from relationships
            rankgroups_result = await session.run("MATCH ()-[r:RATES]->() WHERE r.rankgroup IS NOT NULL RETURN DISTINCT r.rankgroup as value ORDER BY value")
            filter_options["rankgroups"] = []
            async for record in rankgroups_result:
                filter_options["rankgroups"].append(record["value"])
            
            return filter_options

    # Add other methods (create_node, search, etc.) as async versions...


# Global async service instance
async_graph_service = AsyncGraphService()