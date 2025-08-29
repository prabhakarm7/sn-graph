"""
Pydantic models for API request/response validation.
Updated to match actual Neo4j schema from images.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any, Union, Literal
from pydantic import BaseModel, Field, validator


# ===== BASE MODELS =====

class BaseNode(BaseModel):
    """Base model for all node types."""
    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Display name")
    region: Optional[str] = Field(None, description="Geographic region")
    
    class Config:
        extra = "forbid"


class BaseRelationship(BaseModel):
    """Base model for all relationship types."""
    source_id: str = Field(..., description="Source node ID")
    target_id: str = Field(..., description="Target node ID")
    
    class Config:
        extra = "forbid"


# ===== NODE MODELS =====

class ConsultantNode(BaseNode):
    """Consultant node model based on schema."""
    # Core properties from schema
    pca: Optional[str] = Field(None, description="Primary consulting area or focus")
    consultant_advisor: Optional[str] = Field(None, description="Advisor or mentor associated with the consultant")
    sales_region: Optional[str] = Field(None, description="Sales region associated with the consultant")
    channel: Optional[str] = Field(None, description="Sales channel associated with the consultant")


class FieldConsultantNode(BaseNode):
    """Field consultant node model based on schema."""
    # Core properties from schema - simplified based on image


class CompanyNode(BaseNode):
    """Company node model based on schema."""
    # Core properties from schema
    pca: Optional[str] = Field(None, description="Primary consulting area or focus of the company")
    aca: Optional[str] = Field(None, description="Additional consulting area or focus of the company")
    sales_region: Optional[str] = Field(None, description="Sales region associated with the company")
    privacy: Optional[str] = Field(None, description="Privacy level of the company")


class ProductNode(BaseNode):
    """Product node model based on schema."""
    # Core properties from schema
    asset_class: Optional[str] = Field(None, description="Asset class or category of the product")
    jpm_flag: Optional[str] = Field(None, description="Flag indicating whether the product is associated with JPM")


class IncumbentProductNode(BaseNode):
    """Incumbent product node model based on schema."""
    # Core properties from schema
    jpm_flag: Optional[str] = Field(None, description="Flag indicating whether the incumbent product is associated with JPM")


# ===== RELATIONSHIP MODELS =====

class EmploysRelationship(BaseRelationship):
    """Employment relationship between company and consultant/field consultant."""
    # Properties: None according to schema
    pass


class CoversRelationship(BaseRelationship):
    """Coverage relationship between consultant and product/company."""
    # Properties: None according to schema
    pass


class OwnsRelationship(BaseRelationship):
    """Ownership relationship between company and product/incumbent product."""
    # Properties from schema
    mandate_status: Optional[str] = Field(None, description="Status of the mandate")
    consultant: Optional[str] = Field(None, description="Consultant associated with the ownership")
    manager: Optional[str] = Field(None, description="Manager associated with the ownership")
    commitment_market_value: Optional[float] = Field(None, description="Market value of the commitment")
    manager_since_date: Optional[str] = Field(None, description="Date since the company has owned the product")
    multi_mandate_manager: Optional[bool] = Field(None, description="Indicates if there are multiple mandate managers")


class RatesRelationship(BaseRelationship):
    """Rating relationship between consultant/company and product."""
    # Properties from schema
    rankgroup: Optional[str] = Field(None, description="Group of the rank")
    rankvalue: Optional[str] = Field(None, description="Value of the rank")
    rankorder: Optional[int] = Field(None, description="Order of the rank")
    rating_change: Optional[bool] = Field(None, description="Indicates if there has been a change in the rating")


class RecommendsRelationship(BaseRelationship):
    """Recommendation relationship between consultant/field consultant and product."""
    # Properties from schema
    annualised_alpha_summary: Optional[str] = Field(None, description="Summary of the annualised alpha performance")
    batting_average_summary: Optional[str] = Field(None, description="Summary of the batting average performance")
    downside_market_capture_summary: Optional[str] = Field(None, description="Summary of the downside market capture")
    information_ratio_summary: Optional[str] = Field(None, description="Summary of the information ratio performance")
    opportunity_type: Optional[str] = Field(None, description="Type of opportunity")
    returns: Optional[str] = Field(None, description="Overall returns performance")
    returns_summary: Optional[str] = Field(None, description="Summary of returns performance")
    standard_deviation_summary: Optional[str] = Field(None, description="Summary of the standard deviation performance")
    upside_market_capture_summary: Optional[str] = Field(None, description="Summary of the upside market capture performance")


# ===== GRAPH RESPONSE MODELS =====

class NodeResponse(BaseModel):
    """Generic node response model."""
    id: str
    labels: List[str]
    properties: Dict[str, Any]


class RelationshipResponse(BaseModel):
    """Generic relationship response model."""
    id: str
    type: str
    start_node_id: str
    end_node_id: str
    properties: Dict[str, Any]


class GraphResponse(BaseModel):
    """Complete graph response model."""
    nodes: List[NodeResponse]
    relationships: List[RelationshipResponse]
    metadata: Optional[Dict[str, Any]] = None


# ===== FILTER MODELS =====

class FilterCriteria(BaseModel):
    """Filter criteria for graph queries."""
    # Geographic filters
    regions: List[str] = Field(default=["NAI"], description="Regions to include")
    sales_regions: Optional[List[str]] = Field(None, description="Sales regions filter")
    channels: Optional[List[str]] = Field(None, description="Channels filter")
    
    # Node type filters - updated with actual node types
    node_types: List[str] = Field(
        default=["CONSULTANT", "FIELD_CONSULTANT", "COMPANY", "PRODUCT", "INCUMBENT_PRODUCT"],
        description="Node types to include"
    )
    
    # Performance filters
    rankgroups: Optional[List[str]] = Field(None, description="Rank groups filter (from RATES relationship)")
    asset_classes: Optional[List[str]] = Field(None, description="Asset classes filter")
    mandate_statuses: Optional[List[str]] = Field(None, description="Mandate statuses filter")
    
    # Entity filters
    consultant_ids: Optional[List[str]] = Field(None, description="Specific consultant IDs")
    field_consultant_ids: Optional[List[str]] = Field(None, description="Specific field consultant IDs")
    company_ids: Optional[List[str]] = Field(None, description="Specific company IDs")
    product_ids: Optional[List[str]] = Field(None, description="Specific product IDs")
    incumbent_product_ids: Optional[List[str]] = Field(None, description="Specific incumbent product IDs")
    pca_ids: Optional[List[str]] = Field(None, description="PCA filter")
    aca_ids: Optional[List[str]] = Field(None, description="ACA filter")
    
    # JPM flag filter
    jpm_flag: Optional[List[str]] = Field(None, description="JPM flag filter")
    
    # Privacy filter
    privacy_levels: Optional[List[str]] = Field(None, description="Privacy levels filter")
    
    # Status filters
    show_inactive: bool = Field(True, description="Include inactive/orphaned nodes")


class FilterOptions(BaseModel):
    """Available filter options."""
    regions: List[str] = Field(default_factory=list)
    sales_regions: List[str] = Field(default_factory=list)
    channels: List[str] = Field(default_factory=list)
    asset_classes: List[str] = Field(default_factory=list)
    consultants: List[str] = Field(default_factory=list)
    field_consultants: List[str] = Field(default_factory=list)
    companies: List[str] = Field(default_factory=list)
    products: List[str] = Field(default_factory=list)
    incumbent_products: List[str] = Field(default_factory=list)
    pcas: List[str] = Field(default_factory=list)
    acas: List[str] = Field(default_factory=list)
    rankgroups: List[str] = Field(default_factory=list)
    mandate_statuses: List[str] = Field(default_factory=list)
    jpm_flags: List[str] = Field(default_factory=list)
    privacy_levels: List[str] = Field(default_factory=list)


# ===== BULK OPERATION MODELS =====

class BulkCreateRequest(BaseModel):
    """Bulk create request model."""
    consultants: List[ConsultantNode] = Field(default_factory=list)
    field_consultants: List[FieldConsultantNode] = Field(default_factory=list)
    companies: List[CompanyNode] = Field(default_factory=list)
    products: List[ProductNode] = Field(default_factory=list)
    incumbent_products: List[IncumbentProductNode] = Field(default_factory=list)
    employs_relationships: List[EmploysRelationship] = Field(default_factory=list)
    covers_relationships: List[CoversRelationship] = Field(default_factory=list)
    owns_relationships: List[OwnsRelationship] = Field(default_factory=list)
    rates_relationships: List[RatesRelationship] = Field(default_factory=list)
    recommends_relationships: List[RecommendsRelationship] = Field(default_factory=list)


class BulkCreateResponse(BaseModel):
    """Bulk create response model."""
    success: bool
    message: str
    created_counts: Dict[str, int]
    execution_time: float
    errors: Optional[List[str]] = None


# ===== STATISTICS MODELS =====

class DatabaseStats(BaseModel):
    """Database statistics model."""
    total_nodes: int
    total_relationships: int
    node_counts: Dict[str, int]
    relationship_counts: Dict[str, int]
    region_counts: Dict[str, int]
    last_updated: datetime = Field(default_factory=datetime.now)


class RegionStats(BaseModel):
    """Region-specific statistics."""
    region: str
    consultant_count: int
    field_consultant_count: int
    company_count: int
    product_count: int
    incumbent_product_count: int
    relationship_counts: Dict[str, int]


# ===== DATA GENERATION MODELS =====

class DataGenerationConfig(BaseModel):
    """Configuration for data generation."""
    regions: List[str] = Field(default=["NAI", "EMEA", "APAC"])
    consultants_per_region: int = Field(default=20, ge=1, le=100)
    field_consultants_per_consultant: int = Field(default=3, ge=1, le=10)
    companies_per_field_consultant: int = Field(default=5, ge=1, le=20)
    products_per_company: int = Field(default=3, ge=1, le=15)
    incumbent_products_per_company: int = Field(default=2, ge=1, le=10)
    cross_coverage_probability: float = Field(default=0.3, ge=0, le=1)
    rating_probability: float = Field(default=0.8, ge=0, le=1)
    recommendation_probability: float = Field(default=0.6, ge=0, le=1)
    
    @validator('consultants_per_region')
    def validate_consultant_count(cls, v):
        if v > 100:
            raise ValueError('Too many consultants per region (max 100)')
        return v


class DataGenerationResponse(BaseModel):
    """Data generation response model."""
    success: bool
    message: str
    generation_config: DataGenerationConfig
    created_counts: Dict[str, int]
    execution_time: float
    region_stats: List[RegionStats]


# ===== ERROR MODELS =====

class ErrorResponse(BaseModel):
    """Error response model."""
    error: bool = True
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class ValidationErrorResponse(BaseModel):
    """Validation error response model."""
    error: bool = True
    message: str = "Validation error"
    validation_errors: List[Dict[str, Any]]
    timestamp: datetime = Field(default_factory=datetime.now)


# ===== HEALTH CHECK MODELS =====

class HealthCheckResponse(BaseModel):
    """Health check response model."""
    status: Literal["healthy", "unhealthy"]
    timestamp: datetime = Field(default_factory=datetime.now)
    database_connected: bool
    database_stats: Optional[DatabaseStats] = None
    version: str = "1.0.0"
    uptime_seconds: Optional[float] = None


# ===== CYPHER QUERY MODELS =====

class CypherQueryRequest(BaseModel):
    """Custom Cypher query request."""
    query: str = Field(..., description="Cypher query to execute")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Query parameters")
    read_only: bool = Field(True, description="Whether query is read-only")
    
    @validator('query')
    def validate_query_safety(cls, v, values):
        if values.get('read_only', True):
            # Basic safety check for read-only queries
            dangerous_keywords = ['CREATE', 'DELETE', 'SET', 'REMOVE', 'MERGE', 'DROP']
            query_upper = v.upper()
            for keyword in dangerous_keywords:
                if keyword in query_upper:
                    raise ValueError(f'Query contains potentially dangerous keyword: {keyword}')
        return v


class CypherQueryResponse(BaseModel):
    """Cypher query response model."""
    success: bool
    data: List[Dict[str, Any]]
    execution_time: float
    query: str
    row_count: int
    error: Optional[str] = None