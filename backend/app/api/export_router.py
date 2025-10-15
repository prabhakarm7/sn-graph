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
    Each row = one complete relationship path.
    FIXED: Only shows products for consultants specified in OWNS.consultant field.
    """
    
    # Create lookup maps for fast access
    nodes_by_id = {node['id']: node for node in nodes}
    
    # Pre-build consultant coverage map: company_id -> list of (consultant, field_consultant, cover_rel)
    company_coverage_map = {}
    
    # Also build consultant ID to consultant node mapping
    consultant_id_to_node = {}
    
    for node in nodes:
        if node.get('type') == 'CONSULTANT':
            consultant_id = node.get('data', {}).get('id')
            if consultant_id:
                consultant_id_to_node[consultant_id] = node
    
    print(f"Built consultant ID mapping with {len(consultant_id_to_node)} consultants")
    
    for rel in relationships:
        if rel.get('data', {}).get('relType') == 'COVERS':
            company_id = rel['target']
            covering_entity = nodes_by_id.get(rel['source'])
            
            if not covering_entity:
                continue
            
            if company_id not in company_coverage_map:
                company_coverage_map[company_id] = []
            
            if covering_entity.get('type') == 'FIELD_CONSULTANT':
                # Find parent consultant
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
                
            elif covering_entity.get('type') == 'CONSULTANT':
                company_coverage_map[company_id].append({
                    'consultant': covering_entity,
                    'field_consultant': None,
                    'cover_rel': rel,
                    'path_type': 'DIRECT_PATH'
                })
    
    print(f"Built coverage map for {len(company_coverage_map)} companies")
    
    table_rows = []
    
    if recommendations_mode:
        # Process BI_RECOMMENDS relationships
        for rel in relationships:
            if rel.get('data', {}).get('relType') != 'BI_RECOMMENDS':
                continue
            
            incumbent_id = rel['source']
            recommended_id = rel['target']
            
            incumbent = nodes_by_id.get(incumbent_id, {})
            recommended = nodes_by_id.get(recommended_id, {})
            
            # Find company that owns incumbent AND get consultant from OWNS relationship
            company = None
            owns_rel = None
            owns_consultant_ids = []  # NEW: Get consultant(s) from OWNS relationship
            
            for r in relationships:
                if r.get('data', {}).get('relType') == 'OWNS' and r['target'] == incumbent_id:
                    company = nodes_by_id.get(r['source'])
                    owns_rel = r
                    
                    # Extract consultant ID(s) from OWNS relationship
                    owns_consultant = r.get('data', {}).get('consultant')
                    if owns_consultant:
                        if isinstance(owns_consultant, list):
                            owns_consultant_ids = owns_consultant
                        else:
                            owns_consultant_ids = [owns_consultant]
                    
                    break
            
            if not company:
                continue
            
            print(f"Processing BI_RECOMMENDS: Company={company.get('data', {}).get('name')}, "
                  f"Incumbent={incumbent.get('data', {}).get('name')}, "
                  f"OWNS.consultant={owns_consultant_ids}")
            
            # Get all consultant coverages for this company
            coverages = company_coverage_map.get(company['id'], [])
            
            if not coverages:
                # No consultant coverage - only create row if OWNS has no consultant specified
                if not owns_consultant_ids:
                    row = {
                        'Consultant': 'N/A',
                        'Consultant Advisor': 'N/A',
                        'Field Consultant': 'N/A',
                        'Company': company.get('data', {}).get('name', 'N/A'),
                        'Company Channel': company.get('data', {}).get('channel', 'N/A'),
                        'Company Sales Region': company.get('data', {}).get('sales_region', 'N/A'),
                        'Incumbent Product': incumbent.get('data', {}).get('name', 'N/A'),
                        'Incumbent Manager': owns_rel.get('data', {}).get('manager', 'N/A') if owns_rel else 'N/A',
                        'Incumbent Mandate Status': owns_rel.get('data', {}).get('mandate_status', 'N/A') if owns_rel else 'N/A',
                        'Incumbent Commitment Value': owns_rel.get('data', {}).get('commitment_market_value', 'N/A') if owns_rel else 'N/A',
                        'Recommended Product': recommended.get('data', {}).get('name', 'N/A'),
                        'Recommended Asset Class': recommended.get('data', {}).get('asset_class', 'N/A'),
                        'Recommended Universe': recommended.get('data', {}).get('universe_name', 'N/A'),
                        'Opportunity Type': rel.get('data', {}).get('opportunity_type', 'N/A'),
                        'BI Returns Summary': rel.get('data', {}).get('returns_summary', 'N/A'),
                        'BI Alpha Summary': rel.get('data', {}).get('annualised_alpha_summary', 'N/A'),
                        'BI Batting Average': rel.get('data', {}).get('batting_average_summary', 'N/A'),
                        'BI Information Ratio': rel.get('data', {}).get('information_ratio_summary', 'N/A'),
                        'Consultant Rating': 'N/A',
                        'Consultant Influence Level': 'N/A'
                    }
                    table_rows.append(row)
                continue
            
            # CRITICAL FIX: Only create rows for consultants that match OWNS.consultant
            for coverage in coverages:
                consultant = coverage['consultant']
                field_consultant = coverage['field_consultant']
                cover_rel = coverage['cover_rel']
                
                # Skip if consultant doesn't exist
                if not consultant:
                    continue
                
                consultant_id = consultant.get('data', {}).get('id')
                
                # CRITICAL CHECK: Only include this row if consultant matches OWNS.consultant
                # If OWNS has no consultant specified, include all consultants
                if owns_consultant_ids and consultant_id not in owns_consultant_ids:
                    print(f"  Skipping consultant {consultant.get('data', {}).get('name')} - "
                          f"not in OWNS.consultant list")
                    continue
                
                print(f"  Including consultant {consultant.get('data', {}).get('name')} - "
                      f"matches OWNS.consultant")
                
                # Find consultant rating on recommended product (only for matching consultant)
                rating = None
                for r in relationships:
                    if (r.get('data', {}).get('relType') == 'RATES' and 
                        r['source'] == consultant['id'] and 
                        r['target'] == recommended_id):
                        rating = r.get('data', {}).get('rankgroup')
                        break
                
                # Build recommendation row
                row = {
                    'Consultant': consultant.get('data', {}).get('name', 'N/A'),
                    'Consultant Advisor': consultant.get('data', {}).get('consultant_advisor', 'N/A'),
                    'Field Consultant': field_consultant.get('data', {}).get('name', 'N/A') if field_consultant else 'N/A',
                    'Company': company.get('data', {}).get('name', 'N/A'),
                    'Company Channel': company.get('data', {}).get('channel', 'N/A'),
                    'Company Sales Region': company.get('data', {}).get('sales_region', 'N/A'),
                    'Incumbent Product': incumbent.get('data', {}).get('name', 'N/A'),
                    'Incumbent Manager': owns_rel.get('data', {}).get('manager', 'N/A') if owns_rel else 'N/A',
                    'Incumbent Mandate Status': owns_rel.get('data', {}).get('mandate_status', 'N/A') if owns_rel else 'N/A',
                    'Incumbent Commitment Value': owns_rel.get('data', {}).get('commitment_market_value', 'N/A') if owns_rel else 'N/A',
                    'Recommended Product': recommended.get('data', {}).get('name', 'N/A'),
                    'Recommended Asset Class': recommended.get('data', {}).get('asset_class', 'N/A'),
                    'Recommended Universe': recommended.get('data', {}).get('universe_name', 'N/A'),
                    'Opportunity Type': rel.get('data', {}).get('opportunity_type', 'N/A'),
                    'BI Returns Summary': rel.get('data', {}).get('returns_summary', 'N/A'),
                    'BI Alpha Summary': rel.get('data', {}).get('annualised_alpha_summary', 'N/A'),
                    'BI Batting Average': rel.get('data', {}).get('batting_average_summary', 'N/A'),
                    'BI Information Ratio': rel.get('data', {}).get('information_ratio_summary', 'N/A'),
                    'Consultant Rating': rating or 'N/A',
                    'Consultant Influence Level': cover_rel.get('data', {}).get('level_of_influence', 'N/A'),
                    'Coverage Path Type': coverage['path_type'],
                    'OWNS Consultant Match': 'Yes'  # For debugging
                }
                
                table_rows.append(row)
    
    else:
        # Process OWNS relationships (standard mode) - SAME LOGIC
        for rel in relationships:
            if rel.get('data', {}).get('relType') != 'OWNS':
                continue
            
            company_id = rel['source']
            product_id = rel['target']
            
            company = nodes_by_id.get(company_id, {})
            product = nodes_by_id.get(product_id, {})
            
            # Extract consultant ID(s) from OWNS relationship
            owns_consultant_ids = []
            owns_consultant = rel.get('data', {}).get('consultant')
            if owns_consultant:
                if isinstance(owns_consultant, list):
                    owns_consultant_ids = owns_consultant
                else:
                    owns_consultant_ids = [owns_consultant]
            
            print(f"Processing OWNS: Company={company.get('data', {}).get('name')}, "
                  f"Product={product.get('data', {}).get('name')}, "
                  f"OWNS.consultant={owns_consultant_ids}")
            
            # Get all consultant coverages for this company
            coverages = company_coverage_map.get(company_id, [])
            
            if not coverages:
                # No consultant coverage - only create row if OWNS has no consultant specified
                if not owns_consultant_ids:
                    row = {
                        'Consultant': 'N/A',
                        'Consultant Advisor': 'N/A',
                        'Consultant Region': 'N/A',
                        'Field Consultant': 'N/A',
                        'Company': company.get('data', {}).get('name', 'N/A'),
                        'Company Channel': company.get('data', {}).get('channel', 'N/A'),
                        'Company Sales Region': company.get('data', {}).get('sales_region', 'N/A'),
                        'Company Advisor': company.get('data', {}).get('pca', 'N/A'),
                        'Product': product.get('data', {}).get('name', 'N/A'),
                        'Product Asset Class': product.get('data', {}).get('asset_class', 'N/A'),
                        'Product Universe': product.get('data', {}).get('universe_name', 'N/A'),
                        'Consultant Influence Level': 'N/A',
                        'Consultant Rating': 'N/A',
                        'Mandate Status': rel.get('data', {}).get('mandate_status', 'N/A'),
                        'Commitment Value': rel.get('data', {}).get('commitment_market_value', 'N/A'),
                        'Mandate Manager': rel.get('data', {}).get('manager', 'N/A'),
                        'Manager Since Date': rel.get('data', {}).get('manager_since_date', 'N/A')
                    }
                    table_rows.append(row)
                continue
            
            # CRITICAL FIX: Only create rows for consultants that match OWNS.consultant
            for coverage in coverages:
                consultant = coverage['consultant']
                field_consultant = coverage['field_consultant']
                cover_rel = coverage['cover_rel']
                
                # Skip if consultant doesn't exist
                if not consultant:
                    continue
                
                consultant_id = consultant.get('data', {}).get('id')
                
                # CRITICAL CHECK: Only include this row if consultant matches OWNS.consultant
                # If OWNS has no consultant specified, include all consultants
                if owns_consultant_ids and consultant_id not in owns_consultant_ids:
                    print(f"  Skipping consultant {consultant.get('data', {}).get('name')} - "
                          f"not in OWNS.consultant list")
                    continue
                
                print(f"  Including consultant {consultant.get('data', {}).get('name')} - "
                      f"matches OWNS.consultant")
                
                # Find consultant rating (only for matching consultant)
                rating = None
                for r in relationships:
                    if (r.get('data', {}).get('relType') == 'RATES' and 
                        r['source'] == consultant['id'] and 
                        r['target'] == product_id):
                        rating = r.get('data', {}).get('rankgroup')
                        break
                
                # Build standard row
                row = {
                    'Consultant': consultant.get('data', {}).get('name', 'N/A'),
                    'Consultant Advisor': consultant.get('data', {}).get('consultant_advisor', 'N/A'),
                    'Consultant Region': consultant.get('data', {}).get('region', 'N/A'),
                    'Field Consultant': field_consultant.get('data', {}).get('name', 'N/A') if field_consultant else 'N/A',
                    'Company': company.get('data', {}).get('name', 'N/A'),
                    'Company Channel': company.get('data', {}).get('channel', 'N/A'),
                    'Company Sales Region': company.get('data', {}).get('sales_region', 'N/A'),
                    'Company Advisor': company.get('data', {}).get('pca', 'N/A'),
                    'Product': product.get('data', {}).get('name', 'N/A'),
                    'Product Asset Class': product.get('data', {}).get('asset_class', 'N/A'),
                    'Product Universe': product.get('data', {}).get('universe_name', 'N/A'),
                    'Consultant Influence Level': cover_rel.get('data', {}).get('level_of_influence', 'N/A'),
                    'Consultant Rating': rating or 'N/A',
                    'Mandate Status': rel.get('data', {}).get('mandate_status', 'N/A'),
                    'Commitment Value': rel.get('data', {}).get('commitment_market_value', 'N/A'),
                    'Mandate Manager': rel.get('data', {}).get('manager', 'N/A'),
                    'Manager Since Date': rel.get('data', {}).get('manager_since_date', 'N/A'),
                    'Coverage Path Type': coverage['path_type'],
                    'OWNS Consultant Match': 'Yes'  # For debugging
                }
                
                table_rows.append(row)
    
    print(f"Created {len(table_rows)} export rows from {len(nodes)} nodes and {len(relationships)} relationships")
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
            'Metric': [
                'Total Rows Exported',
                'Region',
                'Mode',
                'Export Date & Time',
                'Total Nodes (in graph)',
                'Total Relationships (in graph)',
                'Filters Applied',
                'Data Source'
            ],
            'Value': [
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
                    'Filter': key,
                    'Value': value_str,
                    'Count': len(value) if isinstance(value, list) else 1
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
    format: str = Query("table", regex="^(table|excel|csv)$", description="Response format")
):
    """
    Get manager roster data for a specific company.
    
    Returns:
    - company_name, company_id, consultant_id, consultant_name, product_name, 
      manager, estimated_market_value, commitment, asset_class, 
      1_years, 3_years, 5_years, 10_years
    
    Format options:
    - table: Returns JSON for display in UI
    - excel: Downloads as Excel file
    - csv: Downloads as CSV file
    """
    try:
        print(f"📊 Manager Roster request: company={company_id}, format={format}")
        
        # TODO: Replace with actual Redshift query
        # For now, using mock data
        manager_roster_data = get_mock_manager_roster_data(company_id)
        
        if not manager_roster_data:
            raise HTTPException(
                status_code=404,
                detail=f"No manager roster data found for company {company_id}"
            )
        
        # Return format based on request
        if format == "table":
            return {
                "success": True,
                "company_id": company_id,
                "company_name": manager_roster_data[0].get('company_name', 'Unknown') if manager_roster_data else 'Unknown',
                "data": manager_roster_data,
                "row_count": len(manager_roster_data)
            }
        elif format == "excel":
            return export_manager_roster_excel(manager_roster_data, company_id)
        else:  # csv
            return export_manager_roster_csv(manager_roster_data, company_id)
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Manager roster error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Manager roster retrieval failed: {str(e)}"
        )


def get_mock_manager_roster_data(company_id: str) -> List[Dict[str, Any]]:
    """
    Mock data for manager roster with correct column structure.
    
    TODO: Replace with actual Redshift query:
    
    SELECT 
        company_name,
        company_id,
        consultant_id,
        consultant_name,
        product_name,
        manager,
        estimated_market_value,
        commitment,
        asset_class,
        1_years,
        3_years,
        5_years,
        10_years
    FROM your_redshift_table
    WHERE company_id = '{company_id}'
    ORDER BY consultant_name, product_name
    """
    # Mock data matching the exact schema
    return [
        {
            "company_name": "Acme Corporation",
            "company_id": company_id,
            "consultant_id": "CONS_001",
            "consultant_name": "John Smith",
            "product_name": "Global Equity Fund",
            "manager": "BlackRock",
            "estimated_market_value": 5000000.00,
            "commitment": 4800000.00,
            "asset_class": "Equities",
            "1_years": 8.5,
            "3_years": 12.3,
            "5_years": 15.7,
            "10_years": 18.2
        },
        {
            "company_name": "Acme Corporation",
            "company_id": company_id,
            "consultant_id": "CONS_002",
            "consultant_name": "Jane Doe",
            "product_name": "Fixed Income Portfolio",
            "manager": "Vanguard",
            "estimated_market_value": 3500000.00,
            "commitment": 3200000.00,
            "asset_class": "Fixed Income",
            "1_years": 4.2,
            "3_years": 5.8,
            "5_years": 6.5,
            "10_years": 7.1
        },
        {
            "company_name": "Acme Corporation",
            "company_id": company_id,
            "consultant_id": "CONS_003",
            "consultant_name": "Robert Johnson",
            "product_name": "Alternative Investments",
            "manager": "Bridgewater",
            "estimated_market_value": 7500000.00,
            "commitment": 7000000.00,
            "asset_class": "Alternatives",
            "1_years": 10.8,
            "3_years": 14.2,
            "5_years": 16.9,
            "10_years": 20.5
        },
        {
            "company_name": "Acme Corporation",
            "company_id": company_id,
            "consultant_id": "CONS_001",
            "consultant_name": "John Smith",
            "product_name": "Real Estate Fund",
            "manager": "PIMCO",
            "estimated_market_value": 4200000.00,
            "commitment": 4000000.00,
            "asset_class": "Real Estate",
            "1_years": 6.5,
            "3_years": 9.2,
            "5_years": 11.8,
            "10_years": 14.3
        },
        {
            "company_name": "Acme Corporation",
            "company_id": company_id,
            "consultant_id": "CONS_004",
            "consultant_name": "Sarah Williams",
            "product_name": "Emerging Markets Equity",
            "manager": "Fidelity",
            "estimated_market_value": 2800000.00,
            "commitment": 2500000.00,
            "asset_class": "Equities",
            "1_years": 11.3,
            "3_years": 15.8,
            "5_years": 19.2,
            "10_years": 22.7
        }
    ]


def export_manager_roster_excel(
    data: List[Dict[str, Any]], 
    company_id: str
) -> StreamingResponse:
    """Export manager roster to Excel with correct column structure."""
    df = pd.DataFrame(data)
    
    # Reorder and rename columns for display
    column_mapping = {
        'company_name': 'Company Name',
        'company_id': 'Company ID',
        'consultant_id': 'Consultant ID',
        'consultant_name': 'Consultant Name',
        'product_name': 'Product Name',
        'manager': 'Manager',
        'estimated_market_value': 'Estimated Market Value',
        'commitment': 'Commitment',
        'asset_class': 'Asset Class',
        '1_years': '1 Year Return (%)',
        '3_years': '3 Year Return (%)',
        '5_years': '5 Year Return (%)',
        '10_years': '10 Year Return (%)'
    }
    
    df = df.rename(columns=column_mapping)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Manager Roster')
        
        workbook = writer.book
        worksheet = writer.sheets['Manager Roster']
        
        # Auto-size columns
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
        from openpyxl.styles import Font, PatternFill, Alignment
        header_fill = PatternFill(start_color='3B82F6', end_color='3B82F6', fill_type='solid')
        header_font = Font(bold=True, color='FFFFFF')
        
        for cell in worksheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center')
        
        # Format currency columns (G and H - Estimated Market Value and Commitment)
        from openpyxl.styles import numbers
        for row in range(2, len(data) + 2):
            worksheet[f'G{row}'].number_format = '$#,##0.00'
            worksheet[f'H{row}'].number_format = '$#,##0.00'
        
        # Format percentage columns (J, K, L, M - Returns)
        for row in range(2, len(data) + 2):
            worksheet[f'J{row}'].number_format = '0.0"%"'
            worksheet[f'K{row}'].number_format = '0.0"%"'
            worksheet[f'L{row}'].number_format = '0.0"%"'
            worksheet[f'M{row}'].number_format = '0.0"%"'
        
        # Add summary sheet
        summary_data = {
            'Metric': [
                'Total Records',
                'Unique Consultants',
                'Unique Products',
                'Total Estimated Market Value',
                'Total Commitment',
                'Company Name',
                'Company ID'
            ],
            'Value': [
                len(data),
                len(set(row['consultant_name'] for row in data)),
                len(set(row['product_name'] for row in data)),
                sum(row['estimated_market_value'] for row in data),
                sum(row['commitment'] for row in data),
                data[0]['company_name'] if data else 'N/A',
                company_id
            ]
        }
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_excel(writer, index=False, sheet_name='Summary')
        
        # Format summary sheet
        summary_ws = writer.sheets['Summary']
        for cell in summary_ws[1]:
            cell.fill = header_fill
            cell.font = header_font
        
        # Format currency in summary
        summary_ws['B5'].number_format = '$#,##0.00'
        summary_ws['B6'].number_format = '$#,##0.00'
    
    output.seek(0)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    company_name_clean = data[0]['company_name'].replace(' ', '_') if data else 'company'
    filename = f"manager_roster_{company_name_clean}_{timestamp}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Export-Rows": str(len(data)),
            "X-Company-Name": data[0]['company_name'] if data else 'Unknown'
        }
    )


def export_manager_roster_csv(
    data: List[Dict[str, Any]], 
    company_id: str
) -> StreamingResponse:
    """Export manager roster to CSV with correct column structure."""
    df = pd.DataFrame(data)
    
    # Reorder and rename columns
    column_mapping = {
        'company_name': 'Company Name',
        'company_id': 'Company ID',
        'consultant_id': 'Consultant ID',
        'consultant_name': 'Consultant Name',
        'product_name': 'Product Name',
        'manager': 'Manager',
        'estimated_market_value': 'Estimated Market Value',
        'commitment': 'Commitment',
        'asset_class': 'Asset Class',
        '1_years': '1 Year Return (%)',
        '3_years': '3 Year Return (%)',
        '5_years': '5 Year Return (%)',
        '10_years': '10 Year Return (%)'
    }
    
    df = df.rename(columns=column_mapping)
    
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    company_name_clean = data[0]['company_name'].replace(' ', '_') if data else 'company'
    filename = f"manager_roster_{company_name_clean}_{timestamp}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Export-Rows": str(len(data)),
            "X-Company-Name": data[0]['company_name'] if data else 'Unknown'
        }
    )

# def get_manager_roster_from_redshift(company_id: str) -> List[Dict[str, Any]]:
#     """
#     Execute Redshift query to get manager roster data.
#     Replace with your actual Redshift connection logic.
#     """
#     import psycopg2
#     from psycopg2.extras import RealDictCursor
    
#     # Your Redshift connection parameters
#     conn = psycopg2.connect(
#         host='your-redshift-cluster.region.redshift.amazonaws.com',
#         port=5439,
#         database='your_database',
#         user='your_username',
#         password='your_password'
#     )
    
#     query = """
#     SELECT 
#         company_name,
#         company_id,
#         consultant_id,
#         consultant_name,
#         product_name,
#         manager,
#         estimated_market_value,
#         commitment,
#         asset_class,
#         "1_years",
#         "3_years",
#         "5_years",
#         "10_years"
#     FROM your_schema.manager_roster_table
#     WHERE company_id = %s
#     ORDER BY consultant_name, product_name
#     """
    
#     try:
#         with conn.cursor(cursor_factory=RealDictCursor) as cursor:
#             cursor.execute(query, (company_id,))
#             results = cursor.fetchall()
#             return [dict(row) for row in results]
#     finally:
#         conn.close()

@export_router.get("/region/{region}/export-health")
async def export_health_check(region: str):
    """Health check for export functionality."""
    return {
        "status": "healthy",
        "region": region,
        "supported_formats": ["excel", "csv"],
        "features": [
            "Multi-sheet Excel export",
            "Auto-sized columns",
            "Summary statistics",
            "Applied filters documentation",
            "Consistent with graph rendering"
        ],
        "max_export_rows": 10000
    }