"""
Neo4j database connection management.
"""
import asyncio
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Any, Dict, List, Optional

from neo4j import GraphDatabase, AsyncGraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError
from loguru import logger

from app.config import settings


class Neo4jConnection:
    """Manages Neo4j database connections with connection pooling and error handling."""
    
    def __init__(self):
        self._driver = None
        self._async_driver = None
        self._connection_validated = False
    
    async def connect(self) -> None:
        """Establish connection to Neo4j database."""
        try:
            logger.info(f"🔌 Connecting to Neo4j at {settings.neo4j_uri}")
            
            # Create async driver for FastAPI
            self._async_driver = AsyncGraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_username, settings.neo4j_password),
                max_connection_lifetime=settings.neo4j_max_connection_lifetime,
                max_connection_pool_size=settings.neo4j_max_connection_pool_size,
                connection_acquisition_timeout=settings.neo4j_connection_acquisition_timeout
            )
            
            # Create sync driver for data generation scripts
            self._driver = GraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_username, settings.neo4j_password),
                max_connection_lifetime=settings.neo4j_max_connection_lifetime,
                max_connection_pool_size=settings.neo4j_max_connection_pool_size,
                connection_acquisition_timeout=settings.neo4j_connection_acquisition_timeout
            )
            
            # Validate connection
            await self._validate_connection()
            self._connection_validated = True
            
            logger.success("✅ Neo4j connection established successfully")
            
        except AuthError as e:
            logger.error(f"❌ Neo4j authentication failed: {e}")
            raise
        except ServiceUnavailable as e:
            logger.error(f"❌ Neo4j service unavailable: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Failed to connect to Neo4j: {e}")
            raise
    
    async def disconnect(self) -> None:
        """Close Neo4j database connections."""
        logger.info("🔌 Closing Neo4j connections")
        
        if self._async_driver:
            await self._async_driver.close()
            self._async_driver = None
        
        if self._driver:
            self._driver.close()
            self._driver = None
        
        self._connection_validated = False
        logger.info("✅ Neo4j connections closed")
    
    async def _validate_connection(self) -> None:
        """Validate the database connection."""
        if not self._async_driver:
            raise RuntimeError("No async driver available")
        
        try:
            async with self._async_driver.session() as session:
                result = await session.run("RETURN 1 as test")
                record = await result.single()
                if record["test"] != 1:
                    raise RuntimeError("Connection validation failed")
                    
            logger.info("✅ Neo4j connection validation passed")
            
        except Exception as e:
            logger.error(f"❌ Neo4j connection validation failed: {e}")
            raise
    
    @asynccontextmanager
    async def get_async_session(self) -> AsyncGenerator:
        """Get an async Neo4j session with proper error handling."""
        if not self._async_driver or not self._connection_validated:
            raise RuntimeError("Database connection not established")
        
        session = None
        try:
            session = self._async_driver.session(database=settings.neo4j_database)
            yield session
        except Exception as e:
            logger.error(f"❌ Database session error: {e}")
            raise
        finally:
            if session:
                await session.close()
    
    def get_sync_session(self):
        """Get a sync Neo4j session for data generation scripts."""
        if not self._driver:
            raise RuntimeError("Sync database connection not established")
        
        return self._driver.session(database=settings.neo4j_database)
    
    async def execute_query(
        self, 
        query: str, 
        parameters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Execute a Cypher query and return results."""
        start_time = time.time()
        
        try:
            async with self.get_async_session() as session:
                result = await session.run(query, parameters or {})
                records = await result.data()
                
                execution_time = time.time() - start_time
                logger.debug(f"📊 Query executed in {execution_time:.3f}s: {query[:100]}...")
                
                return records
                
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"❌ Query failed after {execution_time:.3f}s: {e}")
            logger.error(f"🔍 Query: {query}")
            logger.error(f"🔍 Parameters: {parameters}")
            raise
    
    async def execute_write_query(
        self, 
        query: str, 
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute a write Cypher query and return summary."""
        start_time = time.time()
        
        try:
            async with self.get_async_session() as session:
                result = await session.run(query, parameters or {})
                summary = await result.consume()
                
                execution_time = time.time() - start_time
                logger.debug(f"✏️ Write query executed in {execution_time:.3f}s")
                
                return {
                    "nodes_created": summary.counters.nodes_created,
                    "nodes_deleted": summary.counters.nodes_deleted,
                    "relationships_created": summary.counters.relationships_created,
                    "relationships_deleted": summary.counters.relationships_deleted,
                    "properties_set": summary.counters.properties_set,
                    "execution_time": execution_time
                }
                
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"❌ Write query failed after {execution_time:.3f}s: {e}")
            raise
    
    async def execute_batch_write(
        self, 
        queries: List[str], 
        parameters_list: List[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Execute multiple write queries in a single transaction."""
        start_time = time.time()
        parameters_list = parameters_list or [{} for _ in queries]
        
        if len(queries) != len(parameters_list):
            raise ValueError("Queries and parameters lists must have the same length")
        
        try:
            async with self.get_async_session() as session:
                async with session.begin_transaction() as tx:
                    results = []
                    
                    for query, params in zip(queries, parameters_list):
                        result = await tx.run(query, params)
                        summary = await result.consume()
                        
                        results.append({
                            "nodes_created": summary.counters.nodes_created,
                            "relationships_created": summary.counters.relationships_created,
                            "properties_set": summary.counters.properties_set
                        })
                    
                    execution_time = time.time() - start_time
                    logger.info(f"📦 Batch write completed in {execution_time:.3f}s ({len(queries)} queries)")
                    
                    return results
                    
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"❌ Batch write failed after {execution_time:.3f}s: {e}")
            raise
    
    async def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics."""
        stats_queries = {
            "total_nodes": "MATCH (n) RETURN count(n) as count",
            "total_relationships": "MATCH ()-[r]->() RETURN count(r) as count",
            "node_types": """
                MATCH (n) 
                RETURN labels(n)[0] as label, count(n) as count 
                ORDER BY count DESC
            """,
            "relationship_types": """
                MATCH ()-[r]->() 
                RETURN type(r) as type, count(r) as count 
                ORDER BY count DESC
            """,
            "regions": """
                MATCH (n) 
                WHERE n.region IS NOT NULL 
                RETURN n.region as region, count(n) as count 
                ORDER BY count DESC
            """
        }
        
        stats = {}
        
        for stat_name, query in stats_queries.items():
            try:
                result = await self.execute_query(query)
                stats[stat_name] = result
            except Exception as e:
                logger.warning(f"⚠️ Failed to get {stat_name}: {e}")
                stats[stat_name] = []
        
        return stats


# Global connection instance
neo4j_connection = Neo4jConnection()


# Dependency for FastAPI
async def get_neo4j_connection() -> Neo4jConnection:
    """FastAPI dependency to get Neo4j connection."""
    if not neo4j_connection._connection_validated:
        await neo4j_connection.connect()
    return neo4j_connection