# api/smart_queries_router.py - Complete and Corrected
"""
Smart Queries Configuration API Router
Manages smart queries configuration stored in JSON format
"""
import json
import os
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Path, Body
from pydantic import BaseModel, validator
from datetime import datetime

# Create router
smart_queries_router = APIRouter(
    prefix="/smart-queries",
    tags=["Smart Queries Configuration"]
)

# Path to JSON configuration file
CONFIG_FILE_PATH = os.path.join(os.path.dirname(__file__), "../config/smart_queries.json")

# Pydantic models
class SmartQuery(BaseModel):
    id: str
    question: str
    template_cypher_query: str
    example_filters: Dict[str, Any]
    expected_cypher_query: str
    filter_list: List[str]
    auto_mode: str
    mode_keywords: List[str]
    
    @validator('auto_mode')
    def validate_auto_mode(cls, v):
        if v not in ['standard', 'recommendations', 'auto']:
            raise ValueError('auto_mode must be "standard", "recommendations", or "auto"')
        return v
    
    @validator('filter_list')
    def validate_filter_list(cls, v):
        if not v or 'region' not in v:
            raise ValueError('filter_list must contain "region"')
        return v
    
    @validator('template_cypher_query')
    def validate_template_query(cls, v):
        if '{region}' not in v:
            raise ValueError('template_cypher_query must contain {region} placeholder')
        if 'AS GraphData' not in v:
            raise ValueError('template_cypher_query must return result AS GraphData')
        return v

class SmartQueriesMetadata(BaseModel):
    version: str
    last_updated: str
    total_queries: int
    supported_modes: List[str]
    available_filters: List[str]

class SmartQueriesConfig(BaseModel):
    smart_queries: List[SmartQuery]
    metadata: SmartQueriesMetadata

class SmartQueryUpdate(BaseModel):
    question: Optional[str] = None
    template_cypher_query: Optional[str] = None
    example_filters: Optional[Dict[str, Any]] = None
    expected_cypher_query: Optional[str] = None
    filter_list: Optional[List[str]] = None
    auto_mode: Optional[str] = None
    mode_keywords: Optional[List[str]] = None

# Helper functions
def load_config() -> SmartQueriesConfig:
    """Load smart queries configuration from JSON file."""
    try:
        if not os.path.exists(CONFIG_FILE_PATH):
            # Create default config if file doesn't exist
            default_config = get_default_config()
            save_config(default_config)
            return default_config
        
        with open(CONFIG_FILE_PATH, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
            return SmartQueriesConfig(**config_data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load configuration: {str(e)}")

def save_config(config: SmartQueriesConfig) -> None:
    """Save smart queries configuration to JSON file."""
    try:
        # Ensure config directory exists
        os.makedirs(os.path.dirname(CONFIG_FILE_PATH), exist_ok=True)
        
        # Update metadata
        config.metadata.last_updated = datetime.now().isoformat()
        config.metadata.total_queries = len(config.smart_queries)
        
        with open(CONFIG_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(config.dict(), f, indent=2, ensure_ascii=False)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")

def get_default_config() -> SmartQueriesConfig:
    """Get default smart queries configuration."""
    return SmartQueriesConfig(
        smart_queries=[
            SmartQuery(
                id="top_performers",
                question="Find consultants with the highest client coverage and positive product ratings",
                template_cypher_query="MATCH (cons:CONSULTANT)-[emp:EMPLOYS]->(fc:FIELD_CONSULTANT)-[cov:COVERS]->(c:COMPANY) WHERE (c.region = '{region}' OR '{region}' IN c.region) AND cov.level_of_influence IN ['3', '4', 'High'] OPTIONAL MATCH (cons)-[rate:RATES]->(p:PRODUCT) WHERE rate.rankgroup = 'Positive' WITH cons, fc, c, COUNT(DISTINCT c) as company_count, COUNT(DISTINCT rate) as positive_ratings WHERE company_count >= 2 RETURN {nodes: COLLECT(DISTINCT cons) + COLLECT(DISTINCT fc) + COLLECT(DISTINCT c), relationships: COLLECT(DISTINCT {id: toString(id(emp)), source: cons.id, target: fc.id, type: 'custom', data: {relType: 'EMPLOYS'}}) + COLLECT(DISTINCT {id: toString(id(cov)), source: fc.id, target: c.id, type: 'custom', data: {relType: 'COVERS', level_of_influence: cov.level_of_influence}})} AS GraphData",
                example_filters={"region": "US", "influenceLevels": ["3", "4", "High"]},
                expected_cypher_query="MATCH (cons:CONSULTANT)-[emp:EMPLOYS]->(fc:FIELD_CONSULTANT)-[cov:COVERS]->(c:COMPANY) WHERE (c.region = 'US' OR 'US' IN c.region) AND cov.level_of_influence IN ['3', '4', 'High'] OPTIONAL MATCH (cons)-[rate:RATES]->(p:PRODUCT) WHERE rate.rankgroup = 'Positive' WITH cons, fc, c, COUNT(DISTINCT c) as company_count, COUNT(DISTINCT rate) as positive_ratings WHERE company_count >= 2 RETURN {nodes: COLLECT(DISTINCT cons) + COLLECT(DISTINCT fc) + COLLECT(DISTINCT c), relationships: COLLECT(DISTINCT {id: toString(id(emp)), source: cons.id, target: fc.id, type: 'custom', data: {relType: 'EMPLOYS'}}) + COLLECT(DISTINCT {id: toString(id(cov)), source: fc.id, target: c.id, type: 'custom', data: {relType: 'COVERS', level_of_influence: cov.level_of_influence}})} AS GraphData",
                filter_list=["region", "influenceLevels", "consultantIds"],
                auto_mode="standard",
                mode_keywords=["consultant", "performance", "coverage", "influence"]
            ),
            SmartQuery(
                id="at_risk_relationships",
                question="Identify companies with 'At Risk' mandate status and their consultant coverage",
                template_cypher_query="MATCH (c:COMPANY)-[owns:OWNS]->(p:PRODUCT) WHERE (c.region = '{region}' OR '{region}' IN c.region) AND owns.mandate_status = 'At Risk' OPTIONAL MATCH (fc:FIELD_CONSULTANT)-[cov:COVERS]->(c) OPTIONAL MATCH (cons:CONSULTANT)-[emp:EMPLOYS]->(fc) RETURN {nodes: COLLECT(DISTINCT c) + COLLECT(DISTINCT p) + COLLECT(DISTINCT fc) + COLLECT(DISTINCT cons), relationships: COLLECT(DISTINCT {id: toString(id(owns)), source: c.id, target: p.id, type: 'custom', data: {relType: 'OWNS', mandate_status: owns.mandate_status}}) + COLLECT(DISTINCT {id: toString(id(cov)), source: fc.id, target: c.id, type: 'custom', data: {relType: 'COVERS', level_of_influence: cov.level_of_influence}}) + COLLECT(DISTINCT {id: toString(id(emp)), source: cons.id, target: fc.id, type: 'custom', data: {relType: 'EMPLOYS'}})} AS GraphData",
                example_filters={"region": "US", "mandateStatuses": ["At Risk"]},
                expected_cypher_query="MATCH (c:COMPANY)-[owns:OWNS]->(p:PRODUCT) WHERE (c.region = 'US' OR 'US' IN c.region) AND owns.mandate_status = 'At Risk' OPTIONAL MATCH (fc:FIELD_CONSULTANT)-[cov:COVERS]->(c) OPTIONAL MATCH (cons:CONSULTANT)-[emp:EMPLOYS]->(fc) RETURN {nodes: COLLECT(DISTINCT c) + COLLECT(DISTINCT p) + COLLECT(DISTINCT fc) + COLLECT(DISTINCT cons), relationships: COLLECT(DISTINCT {id: toString(id(owns)), source: c.id, target: p.id, type: 'custom', data: {relType: 'OWNS', mandate_status: owns.mandate_status}}) + COLLECT(DISTINCT {id: toString(id(cov)), source: fc.id, target: c.id, type: 'custom', data: {relType: 'COVERS', level_of_influence: cov.level_of_influence}}) + COLLECT(DISTINCT {id: toString(id(emp)), source: cons.id, target: fc.id, type: 'custom', data: {relType: 'EMPLOYS'}})} AS GraphData",
                filter_list=["region", "mandateStatuses", "clientIds"],
                auto_mode="standard",
                mode_keywords=["at risk", "mandate", "client", "relationship"]
            ),
            SmartQuery(
                id="recommendation_opportunities",
                question="Show incumbent products with BI recommendations and potential for conversion",
                template_cypher_query="MATCH (c:COMPANY)-[owns:OWNS]->(ip:INCUMBENT_PRODUCT)-[rec:BI_RECOMMENDS]->(p:PRODUCT) WHERE (c.region = '{region}' OR '{region}' IN c.region) OPTIONAL MATCH (fc:FIELD_CONSULTANT)-[cov:COVERS]->(c) OPTIONAL MATCH (cons:CONSULTANT)-[emp:EMPLOYS]->(fc) RETURN {nodes: COLLECT(DISTINCT c) + COLLECT(DISTINCT ip) + COLLECT(DISTINCT p) + COLLECT(DISTINCT fc) + COLLECT(DISTINCT cons), relationships: COLLECT(DISTINCT {id: toString(id(owns)), source: c.id, target: ip.id, type: 'custom', data: {relType: 'OWNS', mandate_status: owns.mandate_status}}) + COLLECT(DISTINCT {id: toString(id(rec)), source: ip.id, target: p.id, type: 'custom', data: {relType: 'BI_RECOMMENDS'}}) + COLLECT(DISTINCT {id: toString(id(cov)), source: fc.id, target: c.id, type: 'custom', data: {relType: 'COVERS', level_of_influence: cov.level_of_influence}}) + COLLECT(DISTINCT {id: toString(id(emp)), source: cons.id, target: fc.id, type: 'custom', data: {relType: 'EMPLOYS'}})} AS GraphData",
                example_filters={"region": "US", "assetClasses": ["Fixed Income", "Equity"]},
                expected_cypher_query="MATCH (c:COMPANY)-[owns:OWNS]->(ip:INCUMBENT_PRODUCT)-[rec:BI_RECOMMENDS]->(p:PRODUCT) WHERE (c.region = 'US' OR 'US' IN c.region) OPTIONAL MATCH (fc:FIELD_CONSULTANT)-[cov:COVERS]->(c) OPTIONAL MATCH (cons:CONSULTANT)-[emp:EMPLOYS]->(fc) RETURN {nodes: COLLECT(DISTINCT c) + COLLECT(DISTINCT ip) + COLLECT(DISTINCT p) + COLLECT(DISTINCT fc) + COLLECT(DISTINCT cons), relationships: COLLECT(DISTINCT {id: toString(id(owns)), source: c.id, target: ip.id, type: 'custom', data: {relType: 'OWNS', mandate_status: owns.mandate_status}}) + COLLECT(DISTINCT {id: toString(id(rec)), source: ip.id, target: p.id, type: 'custom', data: {relType: 'BI_RECOMMENDS'}}) + COLLECT(DISTINCT {id: toString(id(cov)), source: fc.id, target: c.id, type: 'custom', data: {relType: 'COVERS', level_of_influence: cov.level_of_influence}}) + COLLECT(DISTINCT {id: toString(id(emp)), source: cons.id, target: fc.id, type: 'custom', data: {relType: 'EMPLOYS'}})} AS GraphData",
                filter_list=["region", "assetClasses", "productIds"],
                auto_mode="recommendations",
                mode_keywords=["recommendation", "incumbent", "BI", "conversion", "opportunity"]
            )
        ],
        metadata=SmartQueriesMetadata(
            version="1.0",
            last_updated=datetime.now().isoformat(),
            total_queries=3,
            supported_modes=["standard", "recommendations"],
            available_filters=[
                "region", "consultantIds", "fieldConsultantIds", "clientIds",
                "productIds", "incumbentProductIds", "assetClasses", "mandateStatuses",
                "influenceLevels", "ratings", "channels", "sales_regions"
            ]
        )
    )

# API Endpoints

@smart_queries_router.get("/config", response_model=SmartQueriesConfig)
async def get_smart_queries_config():
    """Get complete smart queries configuration."""
    try:
        config = load_config()
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@smart_queries_router.put("/config")
async def update_smart_queries_config(config: SmartQueriesConfig):
    """Update complete smart queries configuration."""
    try:
        save_config(config)
        return {
            "success": True,
            "message": f"Configuration updated successfully with {len(config.smart_queries)} queries",
            "metadata": config.metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@smart_queries_router.get("/queries", response_model=List[SmartQuery])
async def get_smart_queries():
    """Get all smart queries."""
    try:
        config = load_config()
        return config.smart_queries
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@smart_queries_router.get("/query/{query_id}", response_model=SmartQuery)
async def get_smart_query(query_id: str = Path(..., description="Smart query ID")):
    """Get a specific smart query by ID."""
    try:
        config = load_config()
        query = next((q for q in config.smart_queries if q.id == query_id), None)
        
        if not query:
            raise HTTPException(status_code=404, detail=f"Smart query '{query_id}' not found")
        
        return query
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@smart_queries_router.post("/query")
async def add_smart_query(query: SmartQuery):
    """Add a new smart query."""
    try:
        config = load_config()
        
        # Check if query ID already exists
        if any(q.id == query.id for q in config.smart_queries):
            raise HTTPException(status_code=400, detail=f"Smart query with ID '{query.id}' already exists")
        
        config.smart_queries.append(query)
        save_config(config)
        
        return {
            "success": True,
            "message": f"Smart query '{query.id}' added successfully",
            "query": query
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@smart_queries_router.patch("/query/{query_id}")
async def update_smart_query(
    query_id: str = Path(..., description="Smart query ID"),
    updates: SmartQueryUpdate = Body(...)
):
    """Update a specific smart query."""
    try:
        config = load_config()
        
        query_index = next((i for i, q in enumerate(config.smart_queries) if q.id == query_id), None)
        
        if query_index is None:
            raise HTTPException(status_code=404, detail=f"Smart query '{query_id}' not found")
        
        # Apply updates
        query = config.smart_queries[query_index]
        update_data = updates.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(query, field, value)
        
        # Validate updated query
        SmartQuery(**query.dict())  # This will raise validation errors if invalid
        
        save_config(config)
        
        return {
            "success": True,
            "message": f"Smart query '{query_id}' updated successfully",
            "query": query
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@smart_queries_router.delete("/query/{query_id}")
async def delete_smart_query(query_id: str = Path(..., description="Smart query ID")):
    """Delete a specific smart query."""
    try:
        config = load_config()
        
        original_length = len(config.smart_queries)
        config.smart_queries = [q for q in config.smart_queries if q.id != query_id]
        
        if len(config.smart_queries) == original_length:
            raise HTTPException(status_code=404, detail=f"Smart query '{query_id}' not found")
        
        save_config(config)
        
        return {
            "success": True,
            "message": f"Smart query '{query_id}' deleted successfully",
            "remaining_queries": len(config.smart_queries)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@smart_queries_router.get("/metadata", response_model=SmartQueriesMetadata)
async def get_smart_queries_metadata():
    """Get smart queries metadata only."""
    try:
        config = load_config()
        return config.metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@smart_queries_router.get("/validate/{query_id}")
async def validate_smart_query(query_id: str = Path(..., description="Smart query ID")):
    """Validate a specific smart query configuration."""
    try:
        config = load_config()
        query = next((q for q in config.smart_queries if q.id == query_id), None)
        
        if not query:
            raise HTTPException(status_code=404, detail=f"Smart query '{query_id}' not found")
        
        validation_results = {
            "query_id": query_id,
            "is_valid": True,
            "errors": [],
            "warnings": []
        }
        
        # Validate template query
        if not query.template_cypher_query:
            validation_results["errors"].append("Template Cypher query is required")
            validation_results["is_valid"] = False
        elif '{region}' not in query.template_cypher_query:
            validation_results["errors"].append("Template must include {region} placeholder")
            validation_results["is_valid"] = False
        elif 'AS GraphData' not in query.template_cypher_query:
            validation_results["errors"].append("Template must return result AS GraphData")
            validation_results["is_valid"] = False
        
        # Validate filter list
        if not query.filter_list:
            validation_results["errors"].append("Filter list cannot be empty")
            validation_results["is_valid"] = False
        elif 'region' not in query.filter_list:
            validation_results["errors"].append("Filter list must include 'region'")
            validation_results["is_valid"] = False
        
        # Validate auto mode
        if query.auto_mode not in ['standard', 'recommendations', 'auto']:
            validation_results["errors"].append("Auto mode must be 'standard', 'recommendations', or 'auto'")
            validation_results["is_valid"] = False
        
        # Check for recommendations mode requirements
        if query.auto_mode == 'recommendations':
            if 'INCUMBENT_PRODUCT' not in query.template_cypher_query.upper():
                validation_results["warnings"].append("Recommendations mode query should typically include INCUMBENT_PRODUCT")
            if 'BI_RECOMMENDS' not in query.template_cypher_query.upper():
                validation_results["warnings"].append("Recommendations mode query should typically include BI_RECOMMENDS")
        
        # Validate example filters match filter list
        missing_examples = [f for f in query.filter_list if f not in query.example_filters and f != 'region']
        if missing_examples:
            validation_results["warnings"].append(f"Missing example values for filters: {missing_examples}")
        
        extra_examples = [f for f in query.example_filters.keys() if f not in query.filter_list]
        if extra_examples:
            validation_results["warnings"].append(f"Example filters not in filter_list: {extra_examples}")
        
        return validation_results
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@smart_queries_router.post("/bulk-import")
async def bulk_import_queries(queries: List[SmartQuery]):
    """Bulk import multiple smart queries."""
    try:
        config = load_config()
        
        import_results = {
            "total_imported": 0,
            "total_skipped": 0,
            "total_errors": 0,
            "results": []
        }
        
        for query in queries:
            try:
                # Check if query already exists
                if any(q.id == query.id for q in config.smart_queries):
                    import_results["total_skipped"] += 1
                    import_results["results"].append({
                        "query_id": query.id,
                        "status": "skipped",
                        "reason": "Query ID already exists"
                    })
                    continue
                
                # Validate query
                SmartQuery(**query.dict())  # This validates the query
                
                # Add to config
                config.smart_queries.append(query)
                import_results["total_imported"] += 1
                import_results["results"].append({
                    "query_id": query.id,
                    "status": "imported",
                    "reason": "Successfully imported"
                })
                
            except Exception as e:
                import_results["total_errors"] += 1
                import_results["results"].append({
                    "query_id": getattr(query, 'id', 'unknown'),
                    "status": "error",
                    "reason": str(e)
                })
        
        # Save updated config if any queries were imported
        if import_results["total_imported"] > 0:
            save_config(config)
        
        return {
            "success": True,
            "message": f"Bulk import completed: {import_results['total_imported']} imported, "
                      f"{import_results['total_skipped']} skipped, {import_results['total_errors']} errors",
            "import_results": import_results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@smart_queries_router.get("/export")
async def export_smart_queries_config():
    """Export complete smart queries configuration for backup or sharing."""
    try:
        config = load_config()
        return {
            "success": True,
            "export_timestamp": datetime.now().isoformat(),
            "config": config
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@smart_queries_router.post("/test/{query_id}")
async def test_smart_query(
    query_id: str = Path(..., description="Smart query ID"),
    test_region: str = "US",
    test_filters: Dict[str, Any] = Body(default={})
):
    """Test a smart query by building the Cypher query with provided parameters."""
    try:
        config = load_config()
        query = next((q for q in config.smart_queries if q.id == query_id), None)
        
        if not query:
            raise HTTPException(status_code=404, detail=f"Smart query '{query_id}' not found")
        
        # Build test Cypher query
        test_cypher = query.template_cypher_query.replace('{region}', test_region.upper())
        
        # Apply test filters (basic implementation)
        for filter_key, filter_value in test_filters.items():
            if filter_key in query.filter_list:
                if isinstance(filter_value, list) and filter_value:
                    value_list = "[" + ", ".join([f"'{v}'" for v in filter_value]) + "]"
                    # Simple placeholder replacement - could be enhanced
                    test_cypher = test_cypher.replace(f"'{{{filter_key}}}'", value_list)
        
        return {
            "success": True,
            "query_id": query_id,
            "test_parameters": {
                "region": test_region,
                "filters": test_filters
            },
            "generated_cypher": test_cypher,
            "template_used": query.template_cypher_query,
            "validation": {
                "has_region_placeholder": "{region}" in query.template_cypher_query,
                "returns_graph_data": "AS GraphData" in query.template_cypher_query,
                "estimated_complexity": "medium" if len(test_cypher) > 500 else "simple"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@smart_queries_router.get("/filters")
async def get_available_filters():
    """Get list of all available filters across all queries."""
    try:
        config = load_config()
        
        all_filters = set()
        filter_usage = {}
        
        for query in config.smart_queries:
            for filter_name in query.filter_list:
                all_filters.add(filter_name)
                filter_usage[filter_name] = filter_usage.get(filter_name, 0) + 1
        
        return {
            "success": True,
            "available_filters": sorted(list(all_filters)),
            "filter_usage_count": filter_usage,
            "total_unique_filters": len(all_filters),
            "metadata_filters": config.metadata.available_filters
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@smart_queries_router.get("/health")
async def smart_queries_health():
    """Health check for smart queries configuration system."""
    try:
        config = load_config()
        
        health_info = {
            "status": "healthy",
            "config_file_exists": os.path.exists(CONFIG_FILE_PATH),
            "config_file_path": CONFIG_FILE_PATH,
            "total_queries": len(config.smart_queries),
            "metadata": config.metadata,
            "validation_summary": {
                "valid_queries": 0,
                "queries_with_warnings": 0,
                "invalid_queries": 0
            }
        }
        
        # Validate all queries
        for query in config.smart_queries:
            try:
                SmartQuery(**query.dict())
                
                # Check for basic requirements
                has_warnings = False
                if '{region}' not in query.template_cypher_query:
                    health_info["validation_summary"]["invalid_queries"] += 1
                    continue
                elif query.auto_mode == 'recommendations' and 'INCUMBENT_PRODUCT' not in query.template_cypher_query.upper():
                    has_warnings = True
                
                if has_warnings:
                    health_info["validation_summary"]["queries_with_warnings"] += 1
                else:
                    health_info["validation_summary"]["valid_queries"] += 1
                    
            except Exception:
                health_info["validation_summary"]["invalid_queries"] += 1
        
        # Set overall status
        if health_info["validation_summary"]["invalid_queries"] > 0:
            health_info["status"] = "degraded"
        elif health_info["validation_summary"]["queries_with_warnings"] > 0:
            health_info["status"] = "healthy_with_warnings"
        
        return health_info
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "config_file_exists": os.path.exists(CONFIG_FILE_PATH) if CONFIG_FILE_PATH else False
        }