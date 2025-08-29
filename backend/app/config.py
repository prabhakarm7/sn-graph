"""
Simple configuration without pydantic dependencies.
"""
import os
from typing import List

# Neo4j Configuration
NEO4J_URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "test1234")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

# FastAPI Configuration
API_HOST = os.getenv("API_HOST", "localhost")
API_PORT = int(os.getenv("API_PORT", "8000"))
DEBUG = os.getenv("DEBUG", "True").lower() == "true"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = os.getenv("LOG_FILE", "logs/app.log")

# API Configuration
API_TITLE = "Smart Network Backend API"
API_DESCRIPTION = "Backend API for Smart Network Graph Application"
API_VERSION = "1.0.0"

# CORS
ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:3001","http://localhost:8000","http://localhost:57527"]
ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE"]
ALLOWED_HEADERS = ["*"]

# Database Pool Configuration
NEO4J_MAX_CONNECTION_LIFETIME = 3600
NEO4J_MAX_CONNECTION_POOL_SIZE = 50
NEO4J_CONNECTION_ACQUISITION_TIMEOUT = 60

# Regional configuration
REGIONS = ["NAI", "EMEA", "APAC"]

SALES_REGIONS = [
    "East", "West", "Central", "International",
    "North", "South", "Europe", "Asia", "United States", "Australia", "Hong Kong"
]

CHANNELS = [
    "Consultant Sales", "North Americas Institutional DC", "Asia Institutional",
    "Beta Strategies", "Direct", "Partner", "Digital", "Institutional"
]

ASSET_CLASSES = [
    "Equities", "Fixed Income", "Real Estate", 
    "Commodities", "Alternatives", "Multi-Asset"
]

PRIVACY_LEVELS = ["Public", "Private", "Confidential"]
MANDATE_STATUSES = ["Active", "At Risk", "Conversion in Progress"]
RANKGROUP_VALUES = ["Positive", "Negative", "Neutral", "Introduced"]
JPM_FLAG_VALUES = ["Y", "N"]

# Data generation weights
MANDATE_STATUS_WEIGHTS = {
    "Active": 0.7,
    "At Risk": 0.2,
    "Conversion in Progress": 0.1
}

RANKGROUP_WEIGHTS = {
    "Positive": 0.4,
    "Negative": 0.2,
    "Neutral": 0.2,
    "Introduced": 0.2
}


def validate_neo4j_connection() -> bool:
    """Validate Neo4j connection parameters."""
    try:
        from neo4j import GraphDatabase
        
        driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
        )
        
        with driver.session() as session:
            result = session.run("RETURN 1 as test")
            return result.single()["test"] == 1
            
    except Exception as e:
        print(f"❌ Neo4j connection validation failed: {e}")
        return False
    finally:
        if 'driver' in locals():
            driver.close()