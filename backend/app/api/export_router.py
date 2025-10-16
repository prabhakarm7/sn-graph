# api/export_router.py
"""
Export router - Reuses get_complete_filtered_data for consistency
"""
from typing import Dict, List, Any
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import pandas as pd
import io
from datetime import datetime

from app.services.complete_backend_filter_service import complete_backend_filter_service
from app.api.complete_backend_router import CompleteFilterRequest, clean_filter_values

export_router = APIRouter(
    prefix="/complete",
    tags=["Data Export"]
)


@export_router.post("/region/{region}/export")
async def export_filtered_data(
    region: str,
    filter_request: CompleteFilterRequest,
    recommendations_mode: bool = Query(False, description="Enable recommendations mode"),
    format: str = Query("excel", regex="^(excel|csv)$", description="Export format")
):
    """
    Export current filtered view to Excel or CSV.
    Reuses get_complete_filtered_data for consistency with graph rendering.
    """
    try:
        # Clean filters (same as graph endpoint)
        cleaned_filters = clean_filter_values(filter_request.dict())
        
        print(f"📊 Export request: region={region}, mode={'reco' if recommendations_mode else 'std'}, format={format}")
        print(f"📊 Filters: {list(cleaned_filters.keys())}")
        
        # REUSE existing query - no new query needed!
        result = complete_backend_filter_service.get_complete_filtered_data(
            region=region.upper(),
            filters=cleaned_filters,
            recommendations_mode=recommendations_mode
        )
        
        # Validate result
        if not result.get('success'):
            raise HTTPException(
                status_code=500,
                detail=result.get('error', 'Failed to retrieve data')
            )
        
        if result.get('render_mode') != 'graph':
            # User hit performance limit or no data
            raise HTTPException(
                status_code=400,
                detail=result.get('data', {}).get('message', 'No data available for export. Try applying more specific filters.')
            )
        
        nodes = result['data']['nodes']
        relationships = result['data']['relationships']
        
        if not nodes or not relationships:
            raise HTTPException(
                status_code=404,
                detail="No data available for export with current filters"
            )
        
        print(f"✅ Retrieved {len(nodes)} nodes, {len(relationships)} relationships")
        
        # Flatten graph to table format
        table_data = flatten_graph_to_table(
            nodes, 
            relationships, 
            recommendations_mode
        )
        
        if not table_data:
            raise HTTPException(
                status_code=404,
                detail="No complete relationship paths found for export"
            )
        
        print(f"✅ Flattened to {len(table_data)} table rows")
        
        # Export in requested format
        if format == "excel":
            return export_to_excel(
                table_data, 
                region, 
                recommendations_mode, 
                result.get('metadata', {}),
                cleaned_filters
            )
        else:
            return export_to_csv(
                table_data, 
                region, 
                recommendations_mode
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Export error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Export failed: {str(e)}"
        )


def flatten_graph_to_table(
    nodes: List[Dict], 
    relationships: List[Dict],
    recommendations_mode: bool
) -> List[Dict[str, Any]]:
    """
    Flatten graph structure into table rows.
    Shows ALL consultant-company relationships, even if no products associated.
    Products only appear for consultants specified in OWNS.consultant field.
    FIXED: Correctly extracts incumbent manager from INCUMBENT_PRODUCT node, not OWNS relationship.
    """
    
    # Create lookup maps for fast access
    nodes_by_id = {node['id']: node for node in nodes}
    
    # Helper function to create row with consistent columns
    def create_row(
        consultant=None,
        field_consultant=None,
        company=None,
        cover_rel=None,
        product_info=None,
        rating=None,
        has_products_status='Unknown'
    ):
        """Create a standardized row with all columns."""
        
        base_row = {
            # Consultant Info
            'consultant': consultant.get('data', {}).get('name', 'N/A') if consultant else 'N/A',
            'consultant_advisor': consultant.get('data', {}).get('consultant_advisor', 'N/A') if consultant else 'N/A',
            'field_consultant': field_consultant.get('data', {}).get('name', 'N/A') if field_consultant else 'N/A',
            'consultant_influence_level': cover_rel.get('data', {}).get('level_of_influence', 'N/A') if cover_rel else 'N/A',
            'consultant_rating': rating or 'N/A',
            
            # Company Info
            'company': company.get('data', {}).get('name', 'N/A') if company else 'N/A',
            'company_channel': company.get('data', {}).get('channel', 'N/A') if company else 'N/A',
            'company_sales_region': company.get('data', {}).get('sales_region', 'N/A') if company else 'N/A',
        }
        
        if recommendations_mode:
            # FIXED: Extract manager from incumbent node, not OWNS relationship
            incumbent_node = product_info['incumbent'] if product_info else None
            incumbent_data = incumbent_node.get('data', {}) if incumbent_node else {}
            
            # Recommendations mode specific columns
            base_row.update({
                # Incumbent Product Info - FIXED: from node, not relationship
                'incumbent_product': incumbent_data.get('name', 'N/A'),
                'incumbent_manager': incumbent_data.get('manager', 'N/A'),  # FROM NODE
                'incumbent_mandate_status': product_info['owns_rel'].get('data', {}).get('mandate_status', 'N/A') if product_info else 'N/A',
                'incumbent_commitment_value': product_info['owns_rel'].get('data', {}).get('commitment_market_value', 'N/A') if product_info else 'N/A',
                
                # Recommended Product Info
                'recommended_product': product_info['recommended'].get('data', {}).get('name', 'N/A') if product_info else 'N/A',
                'recommended_asset_class': product_info['recommended'].get('data', {}).get('asset_class', 'N/A') if product_info else 'N/A',
                'recommended_universe': product_info['recommended'].get('data', {}).get('universe_name', 'N/A') if product_info else 'N/A',
                
                # BI Recommendation Metrics
                'opportunity_type': product_info['bi_rel'].get('data', {}).get('opportunity_type', 'N/A') if product_info else 'N/A',
                'bi_returns_summary': product_info['bi_rel'].get('data', {}).get('returns_summary', 'N/A') if product_info else 'N/A',
                'bi_alpha_summary': product_info['bi_rel'].get('data', {}).get('annualised_alpha_summary', 'N/A') if product_info else 'N/A',
                'bi_batting_average': product_info['bi_rel'].get('data', {}).get('batting_average_summary', 'N/A') if product_info else 'N/A',
                'bi_information_ratio': product_info['bi_rel'].get('data', {}).get('information_ratio_summary', 'N/A') if product_info else 'N/A',
            })
        else:
            # Standard mode specific columns
            base_row.update({
                'consultant_region': consultant.get('data', {}).get('region', 'N/A') if consultant else 'N/A',
                'company_advisor': company.get('data', {}).get('pca', 'N/A') if company else 'N/A',
                
                # Product Info
                'product': product_info['product'].get('data', {}).get('name', 'N/A') if product_info else 'N/A',
                'product_asset_class': product_info['product'].get('data', {}).get('asset_class', 'N/A') if product_info else 'N/A',
                'product_universe': product_info['product'].get('data', {}).get('universe_name', 'N/A') if product_info else 'N/A',
                
                # Mandate Info
                'mandate_status': product_info['owns_rel'].get('data', {}).get('mandate_status', 'N/A') if product_info else 'N/A',
                'commitment_value': product_info['owns_rel'].get('data', {}).get('commitment_market_value', 'N/A') if product_info else 'N/A',
                'mandate_manager': product_info['owns_rel'].get('data', {}).get('manager', 'N/A') if product_info else 'N/A',
                'manager_since_date': product_info['owns_rel'].get('data', {}).get('manager_since_date', 'N/A') if product_info else 'N/A',
            })
        
        base_row['has_products'] = has_products_status
        
        return base_row
    
    # Pre-build consultant coverage map
    company_coverage_map = {}
    
    print("=" * 80)
    print("BUILDING COVERAGE MAP")
    print("=" * 80)
    
    for rel in relationships:
        if rel.get('data', {}).get('relType') != 'COVERS':
            continue
            
        company_id = rel['target']
        covering_entity = nodes_by_id.get(rel['source'])
        
        if not covering_entity:
            continue
        
        if company_id not in company_coverage_map:
            company_coverage_map[company_id] = []
        
        entity_type = covering_entity.get('type')
        
        if entity_type == 'FIELD_CONSULTANT':
            field_consultant = covering_entity
            parent_consultant = None
            
            for emp_r in relationships:
                if (emp_r.get('data', {}).get('relType') == 'EMPLOYS' and 
                    emp_r['target'] == field_consultant['id']):
                    parent_consultant = nodes_by_id.get(emp_r['source'])
                    break
            
            company_coverage_map[company_id].append({
                'consultant': parent_consultant,
                'field_consultant': field_consultant,
                'cover_rel': rel,
                'path_type': 'FC_PATH'
            })
                
        elif entity_type == 'CONSULTANT':
            company_coverage_map[company_id].append({
                'consultant': covering_entity,
                'field_consultant': None,
                'cover_rel': rel,
                'path_type': 'DIRECT_PATH'
            })
    
    print(f"Built coverage map for {len(company_coverage_map)} companies")
    
    table_rows = []
    
    if recommendations_mode:
        # Build a map of company -> consultant -> list of product_info
        company_consultant_products = {}
        
        print("\n" + "=" * 80)
        print("PROCESSING BI_RECOMMENDS RELATIONSHIPS")
        print("=" * 80)
        
        # First, let's debug what we're getting
        bi_recommends_rels = [r for r in relationships if r.get('data', {}).get('relType') == 'BI_RECOMMENDS']
        print(f"Total BI_RECOMMENDS relationships: {len(bi_recommends_rels)}")
        
        for bi_rel in bi_recommends_rels:
            incumbent_id = bi_rel['source']  # Source of BI_RECOMMENDS is incumbent
            recommended_id = bi_rel['target']  # Target is recommended product
            
            incumbent = nodes_by_id.get(incumbent_id, {})
            recommended = nodes_by_id.get(recommended_id, {})
            
            # Debug incumbent node
            if incumbent:
                print(f"\nIncumbent Product: {incumbent.get('data', {}).get('name')}")
                print(f"  Type: {incumbent.get('type')}")
                print(f"  Manager from node: {incumbent.get('data', {}).get('manager')}")
                print(f"  All incumbent data keys: {list(incumbent.get('data', {}).keys())}")
            
            # Debug recommended node
            if recommended:
                print(f"Recommended Product: {recommended.get('data', {}).get('name')}")
                print(f"  Asset Class: {recommended.get('data', {}).get('asset_class')}")
                print(f"  Universe: {recommended.get('data', {}).get('universe_name')}")
            
            # Find company that OWNS this incumbent product
            owns_rel = None
            company = None
            
            for owns_r in relationships:
                if owns_r.get('data', {}).get('relType') == 'OWNS' and owns_r['target'] == incumbent_id:
                    company = nodes_by_id.get(owns_r['source'])
                    owns_rel = owns_r
                    
                    if company:
                        print(f"  Owned by company: {company.get('data', {}).get('name')}")
                        print(f"  OWNS relationship data: {owns_rel.get('data', {})}")
                    
                    break
            
            if not company:
                print(f"  WARNING: No company found owning incumbent {incumbent_id}")
                continue
            
            company_id = company['id']
            
            # Extract consultant ID(s) from OWNS relationship
            owns_consultant = owns_rel.get('data', {}).get('consultant')
            owns_consultant_ids = []
            if owns_consultant:
                if isinstance(owns_consultant, list):
                    owns_consultant_ids = owns_consultant
                else:
                    owns_consultant_ids = [owns_consultant]
            
            print(f"  OWNS.consultant field: {owns_consultant_ids}")
            
            # Store product info by company and consultant
            if company_id not in company_consultant_products:
                company_consultant_products[company_id] = {}
            
            # If no specific consultant, mark as "any"
            consultant_keys = owns_consultant_ids if owns_consultant_ids else ['__ANY__']
            
            for cons_key in consultant_keys:
                if cons_key not in company_consultant_products[company_id]:
                    company_consultant_products[company_id][cons_key] = []
                
                company_consultant_products[company_id][cons_key].append({
                    'incumbent': incumbent,
                    'recommended': recommended,
                    'owns_rel': owns_rel,
                    'bi_rel': bi_rel
                })
        
        print("\n" + "=" * 80)
        print("CREATING EXPORT ROWS")
        print("=" * 80)
        
        # Now iterate through ALL company-consultant relationships
        processed_combinations = set()
        
        for company_id, coverages in company_coverage_map.items():
            company = nodes_by_id.get(company_id, {})
            
            print(f"\nCompany: {company.get('data', {}).get('name')} with {len(coverages)} coverage(s)")
            
            for coverage in coverages:
                consultant = coverage['consultant']
                field_consultant = coverage['field_consultant']
                cover_rel = coverage['cover_rel']
                
                if not consultant:
                    continue
                
                consultant_id = consultant.get('data', {}).get('id')
                consultant_name = consultant.get('data', {}).get('name', 'Unknown')
                fc_name = field_consultant.get('data', {}).get('name', 'N/A') if field_consultant else 'Direct'
                
                print(f"  Coverage: {consultant_name} via {fc_name}")
                
                # Check if this consultant has products for this company
                company_products = company_consultant_products.get(company_id, {})
                consultant_products = company_products.get(consultant_id, [])
                any_products = company_products.get('__ANY__', [])
                
                # If consultant has specific products, use those
                if consultant_products:
                    print(f"    Found {len(consultant_products)} product recommendations")
                    for product_info in consultant_products:
                        # Include field consultant ID in the unique key
                        fc_id = field_consultant['id'] if field_consultant else 'DIRECT'
                        row_key = f"{company_id}_{consultant_id}_{fc_id}_{product_info['incumbent']['id']}_{product_info['recommended']['id']}"
                        
                        if row_key in processed_combinations:
                            continue
                        processed_combinations.add(row_key)
                        
                        # Debug what we're adding to the row
                        print(f"      Adding row:")
                        print(f"        Incumbent: {product_info['incumbent'].get('data', {}).get('name')}")
                        print(f"        Manager: {product_info['incumbent'].get('data', {}).get('manager')}")
                        print(f"        Recommended: {product_info['recommended'].get('data', {}).get('name')}")
                        
                        # Find consultant rating on recommended product
                        rating = None
                        for r in relationships:
                            if (r.get('data', {}).get('relType') == 'RATES' and 
                                r['source'] == consultant['id'] and 
                                r['target'] == product_info['recommended']['id']):
                                rating = r.get('data', {}).get('rankgroup')
                                break
                        
                        row = create_row(
                            consultant=consultant,
                            field_consultant=field_consultant,
                            company=company,
                            cover_rel=cover_rel,
                            product_info=product_info,
                            rating=rating,
                            has_products_status='Yes'
                        )
                        table_rows.append(row)
                
                # If no specific products for this consultant
                else:
                    fc_id = field_consultant['id'] if field_consultant else 'DIRECT'
                    row_key = f"{company_id}_{consultant_id}_{fc_id}_NO_PRODUCTS"
                    
                    if row_key in processed_combinations:
                        continue
                    processed_combinations.add(row_key)
                    
                    status = 'No - Products belong to other consultants' if any_products else 'No - No products for company'
                    
                    row = create_row(
                        consultant=consultant,
                        field_consultant=field_consultant,
                        company=company,
                        cover_rel=cover_rel,
                        product_info=None,
                        rating=None,
                        has_products_status=status
                    )
                    table_rows.append(row)
                    print(f"    Added row without products")
    
    else:
        # Standard mode - same logic but with different product structure
        company_consultant_products = {}
        
        for owns_rel in relationships:
            if owns_rel.get('data', {}).get('relType') != 'OWNS':
                continue
            
            company_id = owns_rel['source']
            product_id = owns_rel['target']
            
            company = nodes_by_id.get(company_id, {})
            product = nodes_by_id.get(product_id, {})
            
            if not company or not product:
                continue
            
            # Extract consultant ID(s) from OWNS relationship
            owns_consultant = owns_rel.get('data', {}).get('consultant')
            owns_consultant_ids = []
            if owns_consultant:
                if isinstance(owns_consultant, list):
                    owns_consultant_ids = owns_consultant
                else:
                    owns_consultant_ids = [owns_consultant]
            
            # Store product info by company and consultant
            if company_id not in company_consultant_products:
                company_consultant_products[company_id] = {}
            
            consultant_keys = owns_consultant_ids if owns_consultant_ids else ['__ANY__']
            
            for cons_key in consultant_keys:
                if cons_key not in company_consultant_products[company_id]:
                    company_consultant_products[company_id][cons_key] = []
                
                company_consultant_products[company_id][cons_key].append({
                    'product': product,
                    'owns_rel': owns_rel
                })
        
        # Iterate through ALL company-consultant relationships
        processed_combinations = set()
        
        for company_id, coverages in company_coverage_map.items():
            company = nodes_by_id.get(company_id, {})
            
            for coverage in coverages:
                consultant = coverage['consultant']
                field_consultant = coverage['field_consultant']
                cover_rel = coverage['cover_rel']
                
                if not consultant:
                    continue
                
                consultant_id = consultant.get('data', {}).get('id')
                
                company_products = company_consultant_products.get(company_id, {})
                consultant_products = company_products.get(consultant_id, [])
                any_products = company_products.get('__ANY__', [])
                
                if consultant_products:
                    for product_info in consultant_products:
                        fc_id = field_consultant['id'] if field_consultant else 'DIRECT'
                        row_key = f"{company_id}_{consultant_id}_{fc_id}_{product_info['product']['id']}"
                        
                        if row_key in processed_combinations:
                            continue
                        processed_combinations.add(row_key)
                        
                        # Find consultant rating
                        rating = None
                        for r in relationships:
                            if (r.get('data', {}).get('relType') == 'RATES' and 
                                r['source'] == consultant['id'] and 
                                r['target'] == product_info['product']['id']):
                                rating = r.get('data', {}).get('rankgroup')
                                break
                        
                        row = create_row(
                            consultant=consultant,
                            field_consultant=field_consultant,
                            company=company,
                            cover_rel=cover_rel,
                            product_info=product_info,
                            rating=rating,
                            has_products_status='Yes'
                        )
                        table_rows.append(row)
                
                else:
                    fc_id = field_consultant['id'] if field_consultant else 'DIRECT'
                    row_key = f"{company_id}_{consultant_id}_{fc_id}_NO_PRODUCTS"
                    
                    if row_key in processed_combinations:
                        continue
                    processed_combinations.add(row_key)
                    
                    status = 'No - Products belong to other consultants' if any_products else 'No - No products for company'
                    
                    row = create_row(
                        consultant=consultant,
                        field_consultant=field_consultant,
                        company=company,
                        cover_rel=cover_rel,
                        product_info=None,
                        rating=None,
                        has_products_status=status
                    )
                    table_rows.append(row)
    
    print("\n" + "=" * 80)
    print(f"FINAL: Created {len(table_rows)} export rows")
    print("=" * 80)
    return table_rows
    
def export_to_excel(
    data: List[Dict], 
    region: str, 
    rec_mode: bool,
    metadata: Dict,
    filters: Dict
) -> StreamingResponse:
    """Generate Excel with multiple sheets and formatting."""
    df = pd.DataFrame(data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Main data sheet
        df.to_excel(writer, index=False, sheet_name='Network Data')
        
        # Summary sheet
        summary_data = {
            'metric': [
                'Total Rows Exported',
                'Region',
                'Mode',
                'Export Date & Time',
                'Total Nodes (in graph)',
                'Total Relationships (in graph)',
                'Filters Applied',
                'Data Source'
            ],
            'value': [
                len(data),
                region,
                'Recommendations' if rec_mode else 'Standard',
                datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                metadata.get('data', {}).get('total_nodes', 'N/A'),
                metadata.get('data', {}).get('total_relationships', 'N/A'),
                ', '.join(filters.keys()) if filters else 'None',
                'Smart Network Analytics'
            ]
        }
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_excel(writer, index=False, sheet_name='Summary')
        
        # Filters sheet
        if filters:
            filters_data = []
            for key, value in filters.items():
                if isinstance(value, list):
                    value_str = ', '.join(str(v) for v in value[:10])  # First 10 items
                    if len(value) > 10:
                        value_str += f' ... ({len(value)} total items)'
                else:
                    value_str = str(value)
                
                filters_data.append({
                    'filter': key,
                    'value': value_str,
                    'count': len(value) if isinstance(value, list) else 1
                })
            
            filters_df = pd.DataFrame(filters_data)
            filters_df.to_excel(writer, index=False, sheet_name='Applied Filters')
        
        # Auto-size columns in main sheet
        worksheet = writer.sheets['Network Data']
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if cell.value:
                        max_length = max(max_length, len(str(cell.value)))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width
        
        # Format header row
        for cell in worksheet[1]:
            cell.font = cell.font.copy(bold=True)
    
    output.seek(0)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"smart_network_export_{region}_{('recommendations' if rec_mode else 'standard')}_{timestamp}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Export-Rows": str(len(data)),
            "X-Export-Mode": "recommendations" if rec_mode else "standard"
        }
    )


def export_to_csv(
    data: List[Dict], 
    region: str, 
    rec_mode: bool
) -> StreamingResponse:
    """Generate CSV file."""
    df = pd.DataFrame(data)
    
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"smart_network_export_{region}_{('recommendations' if rec_mode else 'standard')}_{timestamp}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Export-Rows": str(len(data)),
            "X-Export-Mode": "recommendations" if rec_mode else "standard"
        }
    )

@export_router.get("/manager-roster/{company_id}")
async def get_manager_roster(
    company_id: str,
    format: str = Query("table", regex="^(table|excel|csv)$", description="Response format"),
    use_real_data: bool = Query(False, description="Use real database data instead of mock data")
):
    """
    Get manager roster data for a specific company.
    Returns both manager view and recommendations view.
    
    Manager View columns:
    - company_id, company_name, consultant_name, manager_name, 
      multi_mandate_manager, estimated_market_value, asset_class, 
      universe_name, recommended_product
    
    Recommendations View columns:
    - company_id, consultant_name, manager_name, multi_mandate_manager, 
      incumbent_product, jpm_recommended_product, asset_class, universe_name,
      universe_recent_score, num_institutional_clients_for_product,
      batting/returns/std_dev comparisons for 1/3/5 years
    """
    try:
        print(f"📊 Manager Roster request: company={company_id}, format={format}, real_data={use_real_data}")
        
        # Get data
        result = get_manager_roster_data(company_id, use_mock=not use_real_data)
        
        # Convert from tabular format back to dicts for API response
        manager_view_data = []
        if result['manager_view']['data']:
            columns = result['manager_view']['data'][0]
            for row in result['manager_view']['data'][1:]:
                manager_view_data.append(dict(zip(columns, row)))
        
        recommendations_view_data = []
        if result['recommendations_view']['data']:
            columns = result['recommendations_view']['data'][0]
            for row in result['recommendations_view']['data'][1:]:
                recommendations_view_data.append(dict(zip(columns, row)))
        
        if not manager_view_data and not recommendations_view_data:
            raise HTTPException(
                status_code=404,
                detail=f"No manager roster data found for company {company_id}"
            )
        
        # Add SQL queries to logs
        print(f"Manager View SQL: {result['manager_view']['sql']}")
        print(f"Recommendations View SQL: {result['recommendations_view']['sql']}")
        
        # Return format based on request
        if format == "table":
            return {
                "success": True,
                "company_id": company_id,
                "company_name": manager_view_data[0].get('company_name', 'Unknown') if manager_view_data else 'Unknown',
                "manager_view": manager_view_data,
                "recommendations_view": recommendations_view_data,
                "manager_view_count": len(manager_view_data),
                "recommendations_view_count": len(recommendations_view_data)
            }
        elif format == "excel":
            return export_manager_roster_excel_two_sheets(
                manager_view_data, 
                recommendations_view_data,
                company_id
            )
        else:  # csv - will create two files in a zip
            return export_manager_roster_csv_zip(
                manager_view_data,
                recommendations_view_data,
                company_id
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Manager roster error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Manager roster retrieval failed: {str(e)}"
        )


def get_manager_roster_data(company_id: str, use_mock: bool = True) -> dict:
    """
    Get manager roster data either from mock data or from the database.
    Returns data in format {data: [[column_names], [row1], [row2], ...], sql: 'query_text'}
    
    Args:
        company_id: The company ID to fetch data for
        use_mock: If True, returns mock data; if False, queries the database
        
    Returns:
        Dict containing data in the specified format and the SQL query used
    """
    # Return mock data if requested
    if use_mock:
        # Get mock data
        manager_view_data = get_mock_manager_view_data(company_id)
        recommendations_view_data = get_mock_recommendations_view_data(company_id)
        
        # Extract column names from first row
        manager_columns = list(manager_view_data[0].keys()) if manager_view_data else []
        recommendations_columns = list(recommendations_view_data[0].keys()) if recommendations_view_data else []
        
        # Extract values
        manager_values = [list(row.values()) for row in manager_view_data]
        recommendations_values = [list(row.values()) for row in recommendations_view_data]
        
        # Prepare response
        return {
            'manager_view': {
                'data': [manager_columns] + manager_values,
                'sql': 'Mock data - no SQL query executed'
            },
            'recommendations_view': {
                'data': [recommendations_columns] + recommendations_values,
                'sql': 'Mock data - no SQL query executed'
            }
        }
    
    # Otherwise, query the actual database
    else:
        try:

            
            # Define SQL queries
            manager_sql = """
            SELECT 
                company_id,
                company_name,
                consultant_name,
                manager_name,
                multi_mandate_manager,
                estimated_market_value,
                asset_class,
                universe_name,
                recommended_product
            FROM your_manager_roster_table
            WHERE company_id = %s
            ORDER BY consultant_name, manager_name
            """
            
            recommendations_sql = """
            SELECT 
                company_id,
                consultant_name,
                manager_name,
                multi_mandate_manager,
                incumbent_product,
                jpm_recommended_product,
                asset_class,
                universe_name,
                universe_recent_score,
                num_institutional_clients_for_product,
                batting_average_comparison_1_year_jpm_vs_competitor,
                returns_comparison_1_year_jpm_vs_competitor,
                standard_deviation_comparison_1_year_jpm_vs_competitor,
                batting_average_comparison_3_year_jpm_vs_competitor,
                returns_comparison_3_year_jpm_vs_competitor,
                standard_deviation_comparison_3_year_jpm_vs_competitor,
                batting_average_comparison_5_year_jpm_vs_competitor,
                returns_comparison_5_year_jpm_vs_competitor,
                standard_deviation_comparison_5_year_jpm_vs_competitor
            FROM your_recommendations_view_table
            WHERE company_id = %s
            ORDER BY consultant_name, incumbent_product
            """
            
            # Execute queries
            manager_results = []
            manager_columns = []
            with conn.cursor() as cursor:
                cursor.execute(manager_sql, (company_id,))
                manager_columns = [desc[0] for desc in cursor.description]
                for row in cursor:
                    manager_results.append(list(row))
            
            recommendations_results = []
            recommendations_columns = []
            with conn.cursor() as cursor:
                cursor.execute(recommendations_sql, (company_id,))
                recommendations_columns = [desc[0] for desc in cursor.description]
                for row in cursor:
                    recommendations_results.append(list(row))
                    
            # Close the connection
            conn.close()
            
            return {
                'manager_view': {
                    'data': [manager_columns] + manager_results,
                    'sql': manager_sql
                },
                'recommendations_view': {
                    'data': [recommendations_columns] + recommendations_results,
                    'sql': recommendations_sql
                }
            }
            
        except Exception as e:
            print(f"Database error: {str(e)}")
            # Fall back to mock data in case of database error
            print("Falling back to mock data")
            return get_manager_roster_data(company_id, use_mock=True)
        

def get_mock_manager_view_data(company_id: str) -> List[Dict[str, Any]]:
    """
    Mock data for Manager View.
    
    TODO: Replace with actual Redshift query:
    
    SELECT 
        company_id,
        company_name,
        consultant_name,
        manager_name,
        multi_mandate_manager,
        est_market_value,
        asset_class,
        universe_name,
        recommended_product
    FROM your_manager_roster_table
    WHERE company_id = '{company_id}'
    ORDER BY consultant_name, manager_name
    """
    return [
        {
            "company_id": company_id,
            "company_name": "Acme Corporation",
            "consultant_name": "John Smith",
            "manager_name": "BlackRock",
            "multi_mandate_manager": "Y",
            "est_market_value": 5000000.00,
            "asset_class": "Equities",
            "universe_name": "Large Cap Growth",
            "recommended_product": "Global Equity Fund"
        },
        {
            "company_id": company_id,
            "company_name": "Acme Corporation",
            "consultant_name": "Jane Doe",
            "manager_name": "Vanguard",
            "multi_mandate_manager": "N",
            "est_market_value": 3500000.00,
            "asset_class": "Fixed Income",
            "universe_name": "Investment Grade",
            "recommended_product": "Bond Index Fund"
        },
        {
            "company_id": company_id,
            "company_name": "Acme Corporation",
            "consultant_name": "Robert Johnson",
            "manager_name": "Bridgewater",
            "multi_mandate_manager": "Y",
            "est_market_value": 7500000.00,
            "asset_class": "Alternatives",
            "universe_name": "Hedge Funds",
            "recommended_product": "All Weather Portfolio"
        },
        {
            "company_id": company_id,
            "company_name": "Acme Corporation",
            "consultant_name": "John Smith",
            "manager_name": "PIMCO",
            "multi_mandate_manager": "N",
            "est_market_value": 4200000.00,
            "asset_class": "Real Estate",
            "universe_name": "Commercial RE",
            "recommended_product": "Real Estate Income Fund"
        },
        {
            "company_id": company_id,
            "company_name": "Acme Corporation",
            "consultant_name": "Sarah Williams",
            "manager_name": "Fidelity",
            "multi_mandate_manager": "Y",
            "est_market_value": 2800000.00,
            "asset_class": "Equities",
            "universe_name": "Emerging Markets",
            "recommended_product": "EM Equity Fund"
        }
    ]


def get_mock_recommendations_view_data(company_id: str) -> List[Dict[str, Any]]:
    """
    Mock data for Recommendations View with JPM comparison metrics.
    """
    return [
        {
            "company_id": company_id,
            "consultant_name": "Callan",
            "manager_name": "Peregrine Capital",
            "multi_mandate_manager": "N",
            "incumbent_product": "Large Cap Growth",
            "jpm_recommended_product": "JPM US Large Cap Growth",
            "asset_class": "Equity",
            "universe_name": "US Large Cap Growth",
            "universe_recent_score": 4.7,
            "num_institutional_clients_for_product": 1,
            "batting_average_comparison_1_year_jpm_vs_competitor": "0.500000 vs 0.416667",
            "returns_comparison_1_year_jpm_vs_competitor": "19.532822 vs 15.192780",
            "standard_deviation_comparison_1_year_jpm_vs_competitor": "23.978012 vs 28.298792",
            "batting_average_comparison_3_year_jpm_vs_competitor": "0.500000 vs 0.444444",
            "returns_comparison_3_year_jpm_vs_competitor": "22.516467 vs 25.813981",
            "standard_deviation_comparison_3_year_jpm_vs_competitor": "22.418930 vs 17.758622",
            "batting_average_comparison_5_year_jpm_vs_competitor": "0.383333 vs 0.483333",
            "returns_comparison_5_year_jpm_vs_competitor": "7.373197 vs 17.805176",
            "standard_deviation_comparison_5_year_jpm_vs_competitor": "23.015094 vs 18.966911"
        },
        {
            "company_id": company_id,
            "consultant_name": "NEPC",
            "manager_name": "Wellington",
            "multi_mandate_manager": "Y",
            "incumbent_product": "International Equity",
            "jpm_recommended_product": "JPM EAFE Growth",
            "asset_class": "Equity",
            "universe_name": "International Developed",
            "universe_recent_score": 4.2,
            "num_institutional_clients_for_product": 3,
            "batting_average_comparison_1_year_jpm_vs_competitor": "0.583333 vs 0.500000",
            "returns_1_year_jpm_vs_competitor": "15.892761 vs 11.437912",
            "standard_deviation_1_year_jpm_vs_competitor": "18.124566 vs 21.546789",
            "batting_average_3_year_jpm_vs_competitor": "0.611111 vs 0.527778",
            "returns_3_year_jpm_vs_competitor": "17.629354 vs 14.298766",
            "standard_deviation_3_year_jpm_vs_competitor": "16.843219 vs 19.238932",
            "batting_average_5_year_jpm_vs_competitor": "0.583333 vs 0.500000",
            "returns_5_year_jpm_vs_competitor": "12.489276 vs 9.873254",
            "standard_deviation_5_year_jpm_vs_competitor": "17.983265 vs 22.537891"
        },
        {
            "company_id": company_id,
            "consultant_name": "Mercer",
            "manager_name": "T. Rowe Price",
            "multi_mandate_manager": "N",
            "incumbent_product": "Small Cap Growth",
            "jpm_recommended_product": "JPM Small Cap Growth",
            "asset_class": "Equity",
            "universe_name": "US Small Cap Growth",
            "universe_recent_score": 3.9,
            "num_institutional_clients_for_product": 2,
            "batting_average_1_year_jpm_vs_competitor": "0.416667 vs 0.583333",
            "returns_1_year_jpm_vs_competitor": "8.345678 vs 12.897654",
            "standard_deviation_1_year_jpm_vs_competitor": "26.789543 vs 22.345687",
            "batting_average_3_year_jpm_vs_competitor": "0.472222 vs 0.527778",
            "returns_3_year_jpm_vs_competitor": "15.234765 vs 18.765432",
            "standard_deviation_3_year_jpm_vs_competitor": "24.567321 vs 21.345678",
            "batting_average_5_year_jpm_vs_competitor": "0.516667 vs 0.483333",
            "returns_5_year_jpm_vs_competitor": "13.456789 vs 12.345678",
            "standard_deviation_5_year_jpm_vs_competitor": "25.678912 vs 23.456789"
        },
        {
            "company_id": company_id,
            "consultant_name": "Aon Hewitt",
            "manager_name": "MFS",
            "multi_mandate_manager": "Y",
            "incumbent_product": "Fixed Income Core Plus",
            "jpm_recommended_product": "JPM Core Plus Bond",
            "asset_class": "Fixed Income",
            "universe_name": "US Core Plus Fixed Income",
            "universe_recent_score": 4.1,
            "num_institutional_clients_for_product": 5,
            "batting_average_1_year_jpm_vs_competitor": "0.666667 vs 0.416667",
            "returns_1_year_jpm_vs_competitor": "6.783456 vs 4.567891",
            "standard_deviation_1_year_jpm_vs_competitor": "4.563219 vs 6.789123",
            "batting_average_3_year_jpm_vs_competitor": "0.611111 vs 0.444444",
            "returns_3_year_jpm_vs_competitor": "5.678912 vs 3.456789",
            "standard_deviation_3_year_jpm_vs_competitor": "5.123456 vs 7.891234",
            "batting_average_5_year_jpm_vs_competitor": "0.633333 vs 0.466667",
            "returns_5_year_jpm_vs_competitor": "4.891234 vs 2.789123",
            "standard_deviation_5_year_jpm_vs_competitor": "5.678912 vs 8.912345"
        },
        {
            "company_id": company_id,
            "consultant_name": "Callan",
            "manager_name": "AllianceBernstein",
            "multi_mandate_manager": "N",
            "incumbent_product": "Global Value",
            "jpm_recommended_product": "JPM Global Value Equity",
            "asset_class": "Equity",
            "universe_name": "Global Value",
            "universe_recent_score": 3.8,
            "num_institutional_clients_for_product": 2,
            "batting_average_comparison_1_year_jpm_vs_competitor": "0.541667 vs 0.458333",
            "returns_comparison_1_year_jpm_vs_competitor": "10.234567 vs 8.765432",
            "standard_deviation_comparison_1_year_jpm_vs_competitor": "18.765432 vs 20.987654",
            "batting_average_comparison_3_year_jpm_vs_competitor": "0.527778 vs 0.472222",
            "returns_comparison_3_year_jpm_vs_competitor": "12.345678 vs 10.987654",
            "standard_deviation_comparison_3_year_jpm_vs_competitor": "17.654321 vs 19.876543",
            "batting_average_comparison_5_year_jpm_vs_competitor": "0.550000 vs 0.450000",
            "returns_comparison_5_year_jpm_vs_competitor": "11.234567 vs 9.876543",
            "standard_deviation_comparison_5_year_jpm_vs_competitor": "16.789123 vs 18.567890"
        }
    ]


def export_manager_roster_excel_two_sheets(
    manager_view_data: List[Dict[str, Any]],
    recommendations_view_data: List[Dict[str, Any]],
    company_id: str
) -> StreamingResponse:
    """Export manager roster with TWO sheets - Manager View and Recommendations View."""
    
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        
        # ============ SHEET 1: MANAGER VIEW ============
        if manager_view_data:
            df_manager = pd.DataFrame(manager_view_data)
            
            # Rename columns for Manager View
            manager_columns = {
                'company_id': 'company_id',
                'company_name': 'company_name',
                'consultant_name': 'consultant_name',
                'manager_name': 'manager_name',
                'multi_mandate_manager': 'multi_mandate_manager',
                'est_market_value': 'est_market_value',
                'asset_class': 'asset_class',
                'universe_name': 'universe_name',
                'recommended_product': 'recommended_product'
            }
            
            df_manager = df_manager.rename(columns=manager_columns)
            df_manager.to_excel(writer, index=False, sheet_name='Manager View')
            
            # Format Manager View sheet
            ws_manager = writer.sheets['Manager View']
            
            # Auto-size columns
            for column in ws_manager.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if cell.value:
                            max_length = max(max_length, len(str(cell.value)))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                ws_manager.column_dimensions[column_letter].width = adjusted_width
            
            # Format header
            from openpyxl.styles import Font, PatternFill, Alignment
            header_fill = PatternFill(start_color='3B82F6', end_color='3B82F6', fill_type='solid')
            header_font = Font(bold=True, color='FFFFFF')
            
            for cell in ws_manager[1]:
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal='center', vertical='center')
            
            # Format currency column (F - Estimated Market Value)
            from openpyxl.styles import numbers
            for row in range(2, len(manager_view_data) + 2):
                ws_manager[f'F{row}'].number_format = '$#,##0.00'
        
        # ============ SHEET 2: RECOMMENDATIONS VIEW ============
        if recommendations_view_data:
            df_reco = pd.DataFrame(recommendations_view_data)
            
            # Rename columns for Recommendations View - keep lowercase
            reco_columns = {
                'company_id': 'company_id',
                'consultant_name': 'consultant_name',
                'manager_name': 'manager_name',
                'multi_mandate_manager': 'multi_mandate_manager',
                'incumbent_product': 'incumbent_product',
                'jpm_recommended_product': 'jpm_recommended_product',
                'asset_class': 'asset_class',
                'universe_name': 'universe_name',
                'universe_recent_score': 'universe_recent_score',
                'num_institutional_clients_for_product': 'num_institutional_clients_for_product',
                'batting_average_comparison_1_year_jpm_vs_competitor': 'batting_average_comparison_1_year_jpm_vs_competitor',
                'returns_comparison_1_year_jpm_vs_competitor': 'returns_comparison_1_year_jpm_vs_competitor',
                'standard_deviation_comparison_1_year_jpm_vs_competitor': 'standard_deviation_comparison_1_year_jpm_vs_competitor',
                'batting_average_comparison_3_year_jpm_vs_competitor': 'batting_average_comparison_3_year_jpm_vs_competitor',
                'returns_comparison_3_year_jpm_vs_competitor': 'returns_comparison_3_year_jpm_vs_competitor',
                'standard_deviation_comparison_3_year_jpm_vs_competitor': 'standard_deviation_comparison_3_year_jpm_vs_competitor',
                'batting_average_comparison_5_year_jpm_vs_competitor': 'batting_average_comparison_5_year_jpm_vs_competitor',
                'returns_comparison_5_year_jpm_vs_competitor': 'returns_comparison_5_year_jpm_vs_competitor',
                'standard_deviation_comparison_5_year_jpm_vs_competitor': 'standard_deviation_comparison_5_year_jpm_vs_competitor'
            }
            
            df_reco = df_reco.rename(columns=reco_columns)
            df_reco.to_excel(writer, index=False, sheet_name='Recommendations View')
            
            # Format Recommendations View sheet
            ws_reco = writer.sheets['Recommendations View']
            
            # Auto-size columns
            for column in ws_reco.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if cell.value:
                            max_length = max(max_length, len(str(cell.value)))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                ws_reco.column_dimensions[column_letter].width = adjusted_width
            
            # Format header
            for cell in ws_reco[1]:
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal='center', vertical='center')
        
        # ============ SHEET 3: SUMMARY ============
        summary_data = {
            'metric': [
                'company_name',
                'company_id',
                '---',
                'manager_view_records',
                'unique_managers',
                'unique_consultants',
                'total_market_value',
                '---',
                'recommendations_view_records',
                'jpm_recommended_products',
                'unique_consultants_recommendations'
            ],
            'value': [
                manager_view_data[0]['company_name'] if manager_view_data else 'N/A',
                company_id,
                '',
                len(manager_view_data),
                len(set(row['manager_name'] for row in manager_view_data)) if manager_view_data else 0,
                len(set(row['consultant_name'] for row in manager_view_data)) if manager_view_data else 0,
                sum(row['est_market_value'] for row in manager_view_data) if manager_view_data else 0,
                '',
                len(recommendations_view_data),
                len(set(row['jpm_recommended_product'] for row in recommendations_view_data)) if recommendations_view_data else 0,
                len(set(row['consultant_name'] for row in recommendations_view_data)) if recommendations_view_data else 0,
            ]
        }
        
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_excel(writer, index=False, sheet_name='Summary')
        
        # Format summary sheet
        ws_summary = writer.sheets['Summary']
        for cell in ws_summary[1]:
            cell.fill = header_fill
            cell.font = header_font
        
        # Format currency in summary
        ws_summary['B7'].number_format = '$#,##0.00'
    
    output.seek(0)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    company_name_clean = manager_view_data[0]['company_name'].replace(' ', '_') if manager_view_data else 'company'
    filename = f"manager_roster_{company_name_clean}_{timestamp}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Export-Manager-Rows": str(len(manager_view_data)),
            "X-Export-Reco-Rows": str(len(recommendations_view_data)),
            "X-Company-Name": manager_view_data[0]['company_name'] if manager_view_data else 'Unknown'
        }
    )


def export_manager_roster_csv_zip(
    manager_view_data: List[Dict[str, Any]],
    recommendations_view_data: List[Dict[str, Any]],
    company_id: str
) -> StreamingResponse:
    """Export both views as CSV files in a ZIP."""
    import zipfile
    
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        company_name_clean = manager_view_data[0]['company_name'].replace(' ', '_') if manager_view_data else 'company'
        
        # Manager View CSV
        if manager_view_data:
            df_manager = pd.DataFrame(manager_view_data)
            
            csv_manager = df_manager.to_csv(index=False)
            zip_file.writestr(
                f"manager_view_{company_name_clean}_{timestamp}.csv",
                csv_manager
            )
        
        # Recommendations View CSV
        if recommendations_view_data:
            df_reco = pd.DataFrame(recommendations_view_data)
            
            csv_reco = df_reco.to_csv(index=False)
            zip_file.writestr(
                f"recommendations_view_{company_name_clean}_{timestamp}.csv",
                csv_reco
            )
    
    zip_buffer.seek(0)
    
    filename = f"manager_roster_{company_name_clean}_{timestamp}.zip"
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Export-Manager-Rows": str(len(manager_view_data)),
            "X-Export-Reco-Rows": str(len(recommendations_view_data))
        }
    )

@export_router.get("/export-health")
async def export_health_check():
    """Health check for export functionality."""
    return {
        "status": "healthy",
        "supported_formats": ["excel", "csv"],
        "features": [
            "multi-sheet excel export",
            "auto-sized columns",
            "summary statistics", 
            "applied filters documentation",
            "consistent with graph rendering",
            "manager roster with tabs",
            "recommendations comparison metrics"
        ],
        "max_export_rows": 10000
    }