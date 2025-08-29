"""
Updated Filters API router integrating with the new region-based query logic.
"""
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from app.database.models import (
    FilterCriteria, FilterOptions, GraphResponse, ErrorResponse,
    DatabaseStats, RegionStats
)
from app.services.graph_service import graph_service
from app.config import REGIONS, SALES_REGIONS, CHANNELS, ASSET_CLASSES, PRIVACY_LEVELS

# Create the filters router
filters_router = APIRouter(
    prefix="/filters",
    responses={
        404: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)


@filters_router.get("/options", response_model=FilterOptions)
def get_filter_options():
    """
    Get all available filter options from the database using the complex query logic.
    Returns unique values for each filterable field across all regions.
    """
    try:
        options = graph_service.get_filter_options()
        
        return FilterOptions(
            regions=options.get("regions", REGIONS),
            sales_regions=options.get("sales_regions", SALES_REGIONS),
            channels=options.get("channels", CHANNELS),
            asset_classes=options.get("asset_classes", ASSET_CLASSES),
            consultants=options.get("consultants", []),
            field_consultants=options.get("field_consultants", []),
            companies=options.get("companies", []),
            products=options.get("products", []),
            incumbent_products=options.get("incumbent_products", []),
            pcas=options.get("pcas", []),
            acas=options.get("acas", []),
            rankgroups=options.get("rankgroups", []),
            mandate_statuses=options.get("mandate_statuses", []),
            jpm_flags=options.get("jpm_flags", []),
            privacy_levels=options.get("privacy_levels", PRIVACY_LEVELS)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get filter options: {str(e)}")


@filters_router.get("/region/{region}/options")
def get_region_filter_options(region: str):
    """
    Get filter options specific to a region using the complex query logic.
    This populates filters based on actual data in the region.
    """
    try:
        region = region.upper()
        if region not in REGIONS:
            raise HTTPException(status_code=400, detail=f"Invalid region: {region}")
        
        # Get region-specific filter options using the new method
        region_options = graph_service.get_region_filter_options(region)
        
        return {
            "region": region,
            "options": region_options,
            "metadata": {
                "consultant_count": len(region_options.get("consultants", [])),
                "field_consultant_count": len(region_options.get("field_consultants", [])),
                "company_count": len(region_options.get("companies", [])),
                "product_count": len(region_options.get("products", [])),
                "incumbent_product_count": len(region_options.get("incumbent_products", [])),
                "available_channels": len(region_options.get("channels", [])),
                "available_asset_classes": len(region_options.get("asset_classes", []))
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get region filter options: {str(e)}")


@filters_router.post("/apply", response_model=GraphResponse)
def apply_filters(filter_criteria: FilterCriteria):
    """
    Apply filter criteria and return filtered graph data using the complex query logic.
    """
    try:
        # Convert Pydantic model to dict for the service
        filters_dict = filter_criteria.dict(exclude_unset=True)
        
        # Get filtered graph data using the enhanced query logic
        graph_data = graph_service.get_filtered_graph(filters_dict)
        
        return GraphResponse(
            nodes=graph_data["nodes"],
            relationships=graph_data["relationships"],
            metadata=graph_data.get("metadata", {})
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply filters: {str(e)}")


@filters_router.get("/region/{region}/data")
def get_region_data_with_filters(
    region: str,
    field_consultant_names: Optional[List[str]] = Query(None),
    product_names: Optional[List[str]] = Query(None),
    company_names: Optional[List[str]] = Query(None),
    consultant_names: Optional[List[str]] = Query(None),
    channel_names: Optional[List[str]] = Query(None),
    asset_class: Optional[List[str]] = Query(None),
    sales_regions: Optional[List[str]] = Query(None),
    pca: Optional[List[str]] = Query(None),
    aca: Optional[List[str]] = Query(None),
    privacy_levels: Optional[List[str]] = Query(None),
    jpm_flag: Optional[List[str]] = Query(None),
    rankgroups: Optional[List[str]] = Query(None),
    mandate_statuses: Optional[List[str]] = Query(None),
    product_rec_toggle: bool = Query(False)
):
    """
    Get region data with optional filters applied using your complex query logic.
    This is a convenient GET endpoint for region-based filtering with query parameters.
    """
    try:
        region = region.upper()
        if region not in REGIONS:
            raise HTTPException(status_code=400, detail=f"Invalid region: {region}")
        
        # Build additional filters
        additional_filters = {}
        
        if field_consultant_names:
            additional_filters['field_consultant_names'] = field_consultant_names
        if product_names:
            additional_filters['product_names'] = product_names
        if company_names:
            additional_filters['company_names'] = company_names
        if consultant_names:
            additional_filters['consultant_names'] = consultant_names
        if channel_names:
            additional_filters['channel_names'] = channel_names
        if asset_class:
            additional_filters['asset_class'] = asset_class
        if sales_regions:
            additional_filters['sales_regions'] = sales_regions
        if pca:
            additional_filters['pca'] = pca
        if aca:
            additional_filters['aca'] = aca
        if privacy_levels:
            additional_filters['privacy_levels'] = privacy_levels
        if jpm_flag:
            additional_filters['jpm_flag'] = jpm_flag
        if rankgroups:
            additional_filters['rankgroups'] = rankgroups
        if mandate_statuses:
            additional_filters['mandate_statuses'] = mandate_statuses
        
        additional_filters['product_rec_toggle'] = product_rec_toggle
        
        # Get region data with filters
        graph_data = graph_service.get_region_graph(region, **additional_filters)
        
        return {
            "success": True,
            "region": region,
            "applied_filters": additional_filters,
            "data": {
                "nodes": graph_data["nodes"],
                "relationships": graph_data["relationships"],
                "metadata": graph_data.get("metadata", {})
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get region data: {str(e)}")


@filters_router.get("/validate")
def validate_filters(
    regions: Optional[List[str]] = Query(None),
    sales_regions: Optional[List[str]] = Query(None),
    channels: Optional[List[str]] = Query(None),
    node_types: Optional[List[str]] = Query(None),
    asset_classes: Optional[List[str]] = Query(None),
    privacy_levels: Optional[List[str]] = Query(None)
):
    """
    Validate filter values against available options from the complex query results.
    Returns validation results and suggestions.
    """
    try:
        # Get available options using the enhanced query logic
        available_options = graph_service.get_filter_options()
        
        validation_results = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "suggestions": {}
        }
        
        # Validate regions
        if regions:
            invalid_regions = [r for r in regions if r not in available_options.get("regions", REGIONS)]
            if invalid_regions:
                validation_results["valid"] = False
                validation_results["errors"].append(f"Invalid regions: {invalid_regions}")
                validation_results["suggestions"]["regions"] = available_options.get("regions", REGIONS)
        
        # Validate sales regions
        if sales_regions:
            invalid_sales_regions = [sr for sr in sales_regions if sr not in available_options.get("sales_regions", [])]
            if invalid_sales_regions:
                validation_results["valid"] = False
                validation_results["errors"].append(f"Invalid sales regions: {invalid_sales_regions}")
                validation_results["suggestions"]["sales_regions"] = available_options.get("sales_regions", [])
        
        # Validate channels
        if channels:
            invalid_channels = [c for c in channels if c not in available_options.get("channels", [])]
            if invalid_channels:
                validation_results["valid"] = False
                validation_results["errors"].append(f"Invalid channels: {invalid_channels}")
                validation_results["suggestions"]["channels"] = available_options.get("channels", [])
        
        # Validate node types
        if node_types:
            valid_node_types = ["CONSULTANT", "FIELD_CONSULTANT", "COMPANY", "PRODUCT", "INCUMBENT_PRODUCT"]
            invalid_node_types = [nt for nt in node_types if nt not in valid_node_types]
            if invalid_node_types:
                validation_results["valid"] = False
                validation_results["errors"].append(f"Invalid node types: {invalid_node_types}")
                validation_results["suggestions"]["node_types"] = valid_node_types
        
        # Validate asset classes
        if asset_classes:
            invalid_asset_classes = [ac for ac in asset_classes if ac not in available_options.get("asset_classes", [])]
            if invalid_asset_classes:
                validation_results["valid"] = False
                validation_results["errors"].append(f"Invalid asset classes: {invalid_asset_classes}")
                validation_results["suggestions"]["asset_classes"] = available_options.get("asset_classes", [])
        
        # Validate privacy levels
        if privacy_levels:
            invalid_privacy_levels = [pl for pl in privacy_levels if pl not in available_options.get("privacy_levels", [])]
            if invalid_privacy_levels:
                validation_results["valid"] = False
                validation_results["errors"].append(f"Invalid privacy levels: {invalid_privacy_levels}")
                validation_results["suggestions"]["privacy_levels"] = available_options.get("privacy_levels", [])
        
        return validation_results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate filters: {str(e)}")


@filters_router.get("/combinations")
def get_filter_combinations():
    """
    Get common filter combinations and their result counts based on actual region data.
    Useful for suggesting popular filter presets.
    """
    try:
        combinations = []
        
        # Get combinations for each region using the complex query
        for region in REGIONS:
            try:
                # Get basic region data to understand what's available
                region_options = graph_service.get_region_filter_options(region)
                region_data = graph_service.get_region_graph(region)
                
                combinations.append({
                    "name": f"All {region} Data",
                    "description": f"Complete graph for {region} region",
                    "filters": {"regions": [region]},
                    "estimated_count": len(region_data.get("nodes", []))
                })
                
                # Add asset class combinations for this region
                for asset_class in region_options.get("asset_classes", [])[:3]:  # Top 3
                    try:
                        filtered_data = graph_service.get_region_graph(region, asset_class=[asset_class])
                        combinations.append({
                            "name": f"{region} {asset_class} Focus",
                            "description": f"{asset_class} products and related entities in {region}",
                            "filters": {
                                "regions": [region],
                                "asset_class": [asset_class]
                            },
                            "estimated_count": len(filtered_data.get("nodes", []))
                        })
                    except Exception as e:
                        print(f"Warning: Could not get combination for {region} {asset_class}: {e}")
                
                # Add channel combinations
                for channel in region_options.get("channels", [])[:2]:  # Top 2
                    try:
                        filtered_data = graph_service.get_region_graph(region, channel_names=[channel])
                        combinations.append({
                            "name": f"{region} {channel} Channel",
                            "description": f"{channel} channel entities in {region}",
                            "filters": {
                                "regions": [region],
                                "channel_names": [channel]
                            },
                            "estimated_count": len(filtered_data.get("nodes", []))
                        })
                    except Exception as e:
                        print(f"Warning: Could not get combination for {region} {channel}: {e}")
                        
            except Exception as e:
                print(f"Warning: Could not process region {region}: {e}")
        
        # Add cross-regional combinations
        try:
            # All consultants across regions
            consultant_count = 0
            for region in REGIONS:
                try:
                    region_options = graph_service.get_region_filter_options(region)
                    consultant_count += len(region_options.get("consultants", []))
                except:
                    pass
            
            combinations.append({
                "name": "Global Consultants",
                "description": "All consultants across all regions",
                "filters": {"regions": REGIONS},
                "estimated_count": consultant_count
            })
            
            # Product recommendations toggle
            combinations.append({
                "name": "Product Recommendations Mode",
                "description": "All data with product recommendation relationships",
                "filters": {"regions": REGIONS, "product_rec_toggle": True},
                "estimated_count": "Variable"
            })
            
        except Exception as e:
            print(f"Warning: Could not create cross-regional combinations: {e}")
        
        # Sort by estimated count (handle 'Variable' entries)
        def sort_key(x):
            count = x["estimated_count"]
            return count if isinstance(count, int) else 0
        
        combinations.sort(key=sort_key, reverse=True)
        
        return {
            "combinations": combinations[:20],  # Return top 20
            "total_available": len(combinations)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get filter combinations: {str(e)}")


@filters_router.post("/count")
def count_filtered_results(filter_criteria: FilterCriteria):
    """
    Get count of nodes and relationships that would be returned by the filters
    without actually returning the data. Uses the complex query logic for accurate counts.
    """
    try:
        # Convert Pydantic model to dict
        filters_dict = filter_criteria.dict(exclude_unset=True)
        
        # Get filtered data using the complex query logic
        result = graph_service.get_filtered_graph(filters_dict)
        
        node_count = len(result.get("nodes", []))
        relationship_count = len(result.get("relationships", []))
        
        return {
            "filters_applied": filters_dict,
            "node_count": node_count,
            "relationship_count": relationship_count,
            "total_elements": node_count + relationship_count,
            "metadata": result.get("metadata", {})
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to count filtered results: {str(e)}")


@filters_router.delete("/clear")
def clear_filters():
    """
    Return default filter criteria (essentially clearing all filters).
    """
    return FilterCriteria()


@filters_router.get("/presets")
def get_filter_presets():
    """
    Get predefined filter presets for common use cases using the complex query logic.
    """
    presets = [
        {
            "id": "all_nai",
            "name": "North America",
            "description": "All data for North America region",
            "filters": FilterCriteria(regions=["NAI"]).dict()
        },
        {
            "id": "all_emea",
            "name": "EMEA",
            "description": "All data for Europe, Middle East & Africa",
            "filters": FilterCriteria(regions=["EMEA"]).dict()
        },
        {
            "id": "all_apac",
            "name": "APAC",
            "description": "All data for Asia Pacific region",
            "filters": FilterCriteria(regions=["APAC"]).dict()
        },
        {
            "id": "consultants_only",
            "name": "Consultants Only",
            "description": "Show only consultant and field consultant nodes",
            "filters": FilterCriteria(node_types=["CONSULTANT", "FIELD_CONSULTANT"]).dict()
        },
        {
            "id": "products_only",
            "name": "Products Only",
            "description": "Show only product and incumbent product nodes",
            "filters": FilterCriteria(node_types=["PRODUCT", "INCUMBENT_PRODUCT"]).dict()
        },
        {
            "id": "equities_focus",
            "name": "Equities Focus",
            "description": "Focus on equities asset class",
            "filters": FilterCriteria(asset_classes=["Equities"]).dict()
        },
        {
            "id": "fixed_income_focus",
            "name": "Fixed Income Focus", 
            "description": "Focus on fixed income asset class",
            "filters": FilterCriteria(asset_classes=["Fixed Income"]).dict()
        },
        {
            "id": "product_recommendations",
            "name": "Product Recommendations",
            "description": "View with product recommendation relationships",
            "filters": {"regions": ["NAI"], "product_rec_toggle": True}
        },
        {
            "id": "high_activity",
            "name": "High Activity",
            "description": "Companies and products with active mandates",
            "filters": FilterCriteria(
                node_types=["COMPANY", "PRODUCT", "INCUMBENT_PRODUCT"],
                mandate_statuses=["Active"]
            ).dict()
        }
    ]
    
    return {
        "presets": presets,
        "total_count": len(presets)
    }