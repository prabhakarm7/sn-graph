"""
Enhanced API endpoints implementing the hierarchical filter population process with Product Recommendations Toggle.
UPDATED: Uses BI_RECOMMENDS relationships and new filter options for evestment_product_guid, product_id, etc.
"""
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.hierarchical_filter_service import hierarchical_filter_service
from app.config import REGIONS


# Create router for hierarchical filter endpoints
hierarchical_router = APIRouter(
    prefix="/hierarchical",
    tags=["Hierarchical Filters"]
)


@hierarchical_router.get("/regions")
async def get_available_regions():
    """Get list of available regions for selection."""
    try:
        return {
            "success": True,
            "regions": hierarchical_filter_service.get_available_regions(),
            "default_region": "NAI",
            "description": "Available regions for hierarchical filter population",
            "modes": {
                "standard": "Normal view with OWNS relationships (company -> product)",
                "recommendations": "Recommendations view with BI_RECOMMENDS relationships (company -> incumbent_product -> product)"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get regions: {str(e)}")


@hierarchical_router.get("/region/{region}/complete")
async def get_region_complete_workflow(region: str):
    """
    Complete hierarchical workflow (STANDARD MODE):
    1. Initial Region Selection → Get ALL nodes and relationships for region
    2. First-Level Filter Population → Extract unique values for dropdowns
    
    Uses OWNS relationships: consultant -> field_consultant -> company -> product
    """
    try:
        if not hierarchical_filter_service.validate_region(region):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid region: {region}. Must be one of: {REGIONS}"
            )
        
        # Execute complete workflow in STANDARD mode
        result = hierarchical_filter_service.get_region_with_filters(region.upper(), recommendations_mode=False)
        
        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process region {region}: {result.get('error')}"
            )
        
        return {
            "success": True,
            "message": f"Hierarchical filter population completed for {region} (Standard Mode)",
            "mode": "standard",
            "workflow_steps": [
                "✓ Step 1: Retrieved all nodes and relationships for region (OWNS relationships)",
                "✓ Step 2: Populated filters based on region data",
                "✓ All dropdown options are contextually relevant to selected region"
            ],
            "data": {
                "region": result["region"],
                "graph_data": {
                    "nodes": result["data"]["nodes"],
                    "relationships": result["data"]["relationships"]
                },
                "filter_options": result["filters"],
                "statistics": {
                    "total_nodes": result["data"]["metadata"]["node_count"],
                    "total_relationships": result["data"]["metadata"]["relationship_count"],
                    "total_filter_options": result["metadata"]["filter_metadata"]["total_options_count"],
                    "node_type_breakdown": result["data"]["metadata"]["node_type_counts"]
                }
            },
            "metadata": result["metadata"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Standard workflow failed: {str(e)}")


@hierarchical_router.get("/region/{region}/recommendations")
async def get_region_recommendations_workflow(region: str):
    """
    Complete hierarchical workflow (RECOMMENDATIONS MODE):
    1. Initial Region Selection → Get ALL nodes and relationships for region
    2. First-Level Filter Population → Extract unique values for dropdowns
    
    Uses BI_RECOMMENDS relationships: consultant -> field_consultant -> company -> incumbent_product -> product
    """
    try:
        if not hierarchical_filter_service.validate_region(region):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid region: {region}. Must be one of: {REGIONS}"
            )
        
        # Execute complete workflow in RECOMMENDATIONS mode
        result = hierarchical_filter_service.get_region_with_filters(region.upper(), recommendations_mode=True)
        
        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process region {region} in recommendations mode: {result.get('error')}"
            )
        
        return {
            "success": True,
            "message": f"Hierarchical filter population completed for {region} (Recommendations Mode)",
            "mode": "recommendations",
            "workflow_steps": [
                "✓ Step 1: Retrieved all nodes and relationships for region (BI_RECOMMENDS relationships)",
                "✓ Step 2: Populated filters based on recommendations data",
                "✓ All dropdown options include incumbent products and recommendation metrics"
            ],
            "data": {
                "region": result["region"],
                "graph_data": {
                    "nodes": result["data"]["nodes"],
                    "relationships": result["data"]["relationships"]
                },
                "filter_options": result["filters"],
                "statistics": {
                    "total_nodes": result["data"]["metadata"]["node_count"],
                    "total_relationships": result["data"]["metadata"]["relationship_count"],
                    "total_filter_options": result["metadata"]["filter_metadata"]["total_options_count"],
                    "recommendations_count": result["data"]["metadata"].get("recommendations_count", 0),
                    "incumbent_products_count": result["data"]["metadata"].get("incumbent_products_count", 0),
                    "node_type_breakdown": result["data"]["metadata"]["node_type_counts"]
                }
            },
            "metadata": result["metadata"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendations workflow failed: {str(e)}")


@hierarchical_router.get("/region/{region}/data")
async def get_region_data_only(
    region: str, 
    recommendations_mode: bool = Query(False, description="Enable recommendations mode")
):
    """
    Step 1 Only: Get ALL nodes and relationships for the specified region.
    Supports both standard and recommendations mode.
    """
    try:
        if not hierarchical_filter_service.validate_region(region):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid region: {region}. Must be one of: {REGIONS}"
            )
        
        region_data = hierarchical_filter_service.get_region_data(region.upper(), recommendations_mode)
        
        mode_text = "recommendations" if recommendations_mode else "standard"
        relationship_type = "BI_RECOMMENDS" if recommendations_mode else "OWNS"
        
        # Extract relationship types for summary
        rel_types = {}
        for rel in region_data["relationships"]:
            rel_type = rel.get("type", "UNKNOWN")
            rel_types[rel_type] = rel_types.get(rel_type, 0) + 1
        
        # Extract node types for summary  
        node_types = {}
        for node in region_data["nodes"]:
            for label in node.get("labels", []):
                node_types[label] = node_types.get(label, 0) + 1
        
        return {
            "success": True,
            "message": f"Retrieved all {mode_text} data for region {region}",
            "mode": mode_text,
            "region": region.upper(),
            "data": region_data,
            "summary": {
                "nodes_retrieved": len(region_data["nodes"]),
                "relationships_retrieved": len(region_data["relationships"]),
                "primary_relationship_type": relationship_type,
                "node_types": node_types,
                "relationship_types": rel_types,
                "recommendations_count": region_data["metadata"].get("recommendations_count", 0) if recommendations_mode else "N/A",
                "incumbent_products_count": region_data["metadata"].get("incumbent_products_count", 0) if recommendations_mode else "N/A"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get region data: {str(e)}")


@hierarchical_router.put("/region/change/{new_region}")
async def change_region(
    new_region: str, 
    current_region: Optional[str] = Query(None),
    recommendations_mode: bool = Query(False, description="Enable recommendations mode")
):
    """
    Step 3: Region Change Handler with Recommendations Support
    When region changes → fetch new data → update all filters
    Supports both standard and recommendations mode.
    """
    try:
        if not hierarchical_filter_service.validate_region(new_region):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid region: {new_region}. Must be one of: {REGIONS}"
            )
        
        mode_text = "recommendations" if recommendations_mode else "standard"
        print(f"🔄 Processing region change from {current_region} to {new_region} ({mode_text} mode)")
        
        # Execute complete workflow with recommendations support
        result = hierarchical_filter_service.get_region_with_filters(new_region.upper(), recommendations_mode)
        
        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to change region to {new_region}: {result.get('error')}"
            )
        
        # Return in the EXACT format expected by frontend (same as /complete and /recommendations endpoints)
        statistics = {
            "total_nodes": result["data"]["metadata"]["node_count"],
            "total_relationships": result["data"]["metadata"]["relationship_count"],
            "total_filter_options": result["metadata"]["filter_metadata"]["total_options_count"],
            "node_type_breakdown": result["data"]["metadata"]["node_type_counts"]
        }
        
        if recommendations_mode:
            statistics.update({
                "recommendations_count": result["data"]["metadata"].get("recommendations_count", 0),
                "incumbent_products_count": result["data"]["metadata"].get("incumbent_products_count", 0)
            })
        
        return {
            "success": True,
            "message": f"Region changed from {current_region or 'unknown'} to {new_region} ({mode_text} mode)",
            "mode": mode_text,
            "data": {
                "region": result["region"],
                "graph_data": {
                    "nodes": result["data"]["nodes"],
                    "relationships": result["data"]["relationships"]
                },
                "filter_options": result["filters"],
                "statistics": statistics
            },
            "metadata": result["metadata"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Region change error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Region change failed: {str(e)}")


@hierarchical_router.put("/region/change/{new_region}/recommendations")
async def change_region_recommendations(
    new_region: str, 
    current_region: Optional[str] = Query(None)
):
    """
    Step 3: Region Change Handler specifically for Recommendations Mode
    Convenience endpoint that forces recommendations mode.
    """
    return await change_region(new_region, current_region, recommendations_mode=True)


@hierarchical_router.post("/region/{region}/filters")
async def populate_filters_from_data(
    region: str, 
    region_data: Dict[str, Any],
    recommendations_mode: bool = Query(False, description="Enable recommendations mode")
):
    """
    Step 2 Only: Populate filters based on provided region data.
    Supports both standard and recommendations mode.
    """
    try:
        if not hierarchical_filter_service.validate_region(region):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid region: {region}. Must be one of: {REGIONS}"
            )
        
        # Add mode information to metadata if not present
        if "metadata" not in region_data:
            region_data["metadata"] = {}
        region_data["metadata"]["mode"] = "recommendations_mode" if recommendations_mode else "standard_mode"
        
        filter_data = hierarchical_filter_service.populate_filter_options(region_data)
        
        mode_text = "recommendations" if recommendations_mode else "standard"
        
        breakdown = {
            "markets": len(filter_data["filter_options"].get("markets", [])),
            "channels": len(filter_data["filter_options"].get("channels", [])),
            "field_consultants": len(filter_data["filter_options"].get("field_consultants", [])),
            "products": len(filter_data["filter_options"].get("products", [])),
            "companies": len(filter_data["filter_options"].get("companies", [])),
            "consultants": len(filter_data["filter_options"].get("consultants", [])),
            "consultant_rankings": len(filter_data["filter_options"].get("consultant_rankings", [])),
            "influence_levels": len(filter_data["filter_options"].get("influence_levels", [])),
            "asset_classes": len(filter_data["filter_options"].get("asset_classes", [])),
            "client_advisors": len(filter_data["filter_options"].get("client_advisors", []))
        }
        
        if recommendations_mode:
            breakdown.update({
                "incumbent_products": len(filter_data["filter_options"].get("incumbent_products", []))
            })
        
        return {
            "success": True,
            "message": f"Populated filters based on {region} data ({mode_text} mode)",
            "mode": mode_text,
            "region": region.upper(),
            "filter_options": filter_data["filter_options"],
            "breakdown": breakdown,
            "metadata": filter_data["metadata"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to populate filters: {str(e)}")


@hierarchical_router.get("/region/{region}/filters/breakdown")
async def get_filter_breakdown(
    region: str,
    recommendations_mode: bool = Query(False, description="Show breakdown for recommendations mode")
):
    """
    Get detailed breakdown of how each filter option is populated.
    UPDATED: Supports both standard and recommendations modes with new filter options.
    """
    try:
        if not hierarchical_filter_service.validate_region(region):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid region: {region}. Must be one of: {REGIONS}"
            )
        
        # Get complete workflow result
        result = hierarchical_filter_service.get_region_with_filters(region.upper(), recommendations_mode)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        mode_text = "recommendations" if recommendations_mode else "standard"
        
        # Create detailed breakdown
        breakdown = {
            "region": region.upper(),
            "mode": mode_text,
            "filter_population_process": {
                "1_markets_list": {
                    "description": "Extracts unique sales regions from companies in selected region",
                    "method": "get_param_filter_list('sales_region', companies, True)",
                    "count": len(result["filters"].get("markets", [])),
                    "values": result["filters"].get("markets", [])
                },
                "2_channels_list": {
                    "description": "Extracts unique channel values from companies in selected region", 
                    "method": "get_param_filter_list('channel', companies, True)",
                    "count": len(result["filters"].get("channels", [])),
                    "values": result["filters"].get("channels", [])
                },
                "3_field_consultants": {
                    "description": "Retrieves field consultants connected to companies in selected region",
                    "method": "get_node_filter_list('FIELD_CONSULTANT', elements)",
                    "count": len(result["filters"].get("field_consultants", [])),
                    "sample": result["filters"].get("field_consultants", [])[:5]
                },
                "4_products": {
                    "description": f"Gets products {'recommended by incumbent products' if recommendations_mode else 'owned by companies'} in selected region",
                    "method": "get_node_filter_list('PRODUCT', elements)",
                    "count": len(result["filters"].get("products", [])),
                    "sample": result["filters"].get("products", [])[:5]
                },
                "5_companies": {
                    "description": "Lists companies in selected region",
                    "method": "get_node_filter_list('COMPANY', elements)",
                    "count": len(result["filters"].get("companies", [])),
                    "sample": result["filters"].get("companies", [])[:5]
                },
                "6_consultants": {
                    "description": "Gets consultants connected to companies in selected region",
                    "method": "get_node_filter_list('CONSULTANT', elements)",
                    "count": len(result["filters"].get("consultants", [])),
                    "sample": result["filters"].get("consultants", [])[:5]
                },
                "7_consultant_rankings": {
                    "description": "Gets unique ranking values from RATES relationships",
                    "method": "get_param_filter_list('rankgroup', relationships, True)",
                    "count": len(result["filters"].get("consultant_rankings", [])),
                    "values": result["filters"].get("consultant_rankings", [])
                },
                "8_influence_levels": {
                    "description": "Extracts unique influence level values from relationships",
                    "method": "get_param_filter_list('level_of_influence', relationships, True)",
                    "count": len(result["filters"].get("influence_levels", [])),
                    "values": result["filters"].get("influence_levels", [])
                },
                "9_asset_classes": {
                    "description": "Gets unique asset class values from products",
                    "method": "get_param_filter_list('asset_class', products, True)",
                    "count": len(result["filters"].get("asset_classes", [])),
                    "values": result["filters"].get("asset_classes", [])
                },
                "10_client_advisors": {
                    "description": "Enhanced: Combines Company PCAs and ACAs",
                    "method": "Enhanced PCA/ACA logic - combines company.pca + company.aca",
                    "count": len(result["filters"].get("client_advisors", [])),
                    "sample": result["filters"].get("client_advisors", [])[:10]
                },
                "11_consultant_advisors": {
                    "description": "Enhanced: Combines Consultant PCAs and Advisors",
                    "method": "Enhanced PCA/ACA logic - combines consultant.pca + consultant.consultant_advisor",
                    "count": len(result["filters"].get("consultant_advisors", [])),
                    "sample": result["filters"].get("consultant_advisors", [])[:10]
                }
            }
        }
        
        # Add recommendations-specific breakdown (only incumbent_products filter added)
        if recommendations_mode:
            breakdown["filter_population_process"].update({
                "12_incumbent_products": {
                    "description": "Lists incumbent products that provide recommendations",
                    "method": "get_node_filter_list('INCUMBENT_PRODUCT', elements)",
                    "count": len(result["filters"].get("incumbent_products", [])),
                    "sample": result["filters"].get("incumbent_products", [])[:5]
                }
            })
        
        breakdown["summary"] = {
            "total_source_nodes": result["data"]["metadata"]["node_count"],
            "total_source_relationships": result["data"]["metadata"]["relationship_count"],
            "total_filter_options_generated": result["metadata"]["filter_metadata"]["total_options_count"],
            "contextual_relevance": f"All filter options are contextually relevant to the selected region in {mode_text} mode",
            "mode_specific_features": {
                "standard_mode": "OWNS relationships, direct company-to-product connections",
                "recommendations_mode": "BI_RECOMMENDS relationships, incumbent-product-to-product recommendations"
            }[mode_text] if recommendations_mode else {
                "standard_mode": "OWNS relationships, direct company-to-product connections", 
                "recommendations_mode": "BI_RECOMMENDS relationships, incumbent-product-to-product recommendations"
            }["standard_mode"],
            "data_enrichment": {
                "node_properties_included": [
                    "All original properties",
                    "INCUMBENT_PRODUCT.evestment_product_guid",
                    "CONSULTANT.consultant_advisor"
                ],
                "relationship_properties_included": [
                    "All original properties",
                    "OWNS: mandate_status (for PRODUCT), full properties (for INCUMBENT_PRODUCT)",
                    "BI_RECOMMENDS: recommendation metrics (annualised_alpha_summary, opportunity_type, returns, etc.)",
                    "RATES: rankgroup, rankvalue, rankorder, rating_change, level_of_influence"
                ],
                "note": "Node and edge data enriched with new properties while keeping original filter structure"
            }
        }
        
        if recommendations_mode:
            breakdown["summary"]["recommendations_specific"] = {
                "incumbent_products_count": result["data"]["metadata"].get("incumbent_products_count", 0),
                "recommendations_count": result["data"]["metadata"].get("recommendations_count", 0),
                "filter_change": "Only 'incumbent_products' filter added in recommendations mode",
                "data_enrichment": "All node/edge data includes new properties like evestment_product_guid, BI_RECOMMENDS metrics, etc."
            }
        
        return breakdown
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get filter breakdown: {str(e)}")


@hierarchical_router.get("/health")
async def health_check():
    """Health check for hierarchical filter service with recommendations support."""
    try:
        is_healthy = hierarchical_filter_service.health_check()
        
        return {
            "status": "healthy" if is_healthy else "unhealthy",
            "service": "Hierarchical Filter Service",
            "database_connected": is_healthy,
            "available_regions": REGIONS,
            "workflow_ready": is_healthy,
            "supported_modes": {
                "standard": {
                    "description": "Normal view with OWNS relationships",
                    "path": "consultant -> field_consultant -> company -> product",
                    "endpoints": ["/region/{region}/complete", "/region/change/{region}"],
                    "relationships": ["EMPLOYS", "COVERS", "OWNS", "RATES"]
                },
                "recommendations": {
                    "description": "Recommendations view with BI_RECOMMENDS relationships", 
                    "path": "consultant -> field_consultant -> company -> incumbent_product -> product",
                    "endpoints": ["/region/{region}/recommendations", "/region/change/{region}/recommendations"],
                    "relationships": ["EMPLOYS", "COVERS", "OWNS", "BI_RECOMMENDS", "RATES"]
                }
            },
            "new_features": {
                "node_properties": [
                    "INCUMBENT_PRODUCT.evestment_product_guid",
                    "CONSULTANT.consultant_advisor"
                ],
                "relationship_properties": [
                    "OWNS->PRODUCT: mandate_status only",
                    "OWNS->INCUMBENT_PRODUCT: commitment_market_value, consultant, manager, manager_since_date, multi_mandate_manager",
                    "RATES: rankgroup, rankvalue, rankorder, rating_change, level_of_influence",
                    "BI_RECOMMENDS: annualised_alpha_summary, opportunity_type, returns, etc."
                ],
                "filter_options": [
                    "product_ids",
                    "evestment_product_guids", 
                    "opportunity_types",
                    "returns_ranges",
                    "managers",
                    "multi_mandate_managers",
                    "rank_values",
                    "rank_orders",
                    "rating_changes"
                ]
            },
            "recommendations_support": is_healthy
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "Hierarchical Filter Service", 
            "error": str(e),
            "database_connected": False,
            "workflow_ready": False,
            "recommendations_support": False
        }