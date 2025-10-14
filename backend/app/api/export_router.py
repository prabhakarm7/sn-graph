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
    """
    
    # Create lookup maps for fast access
    nodes_by_id = {node['id']: node for node in nodes}
    
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
            
            # Find company that owns incumbent
            company = None
            owns_rel = None
            for r in relationships:
                if r.get('data', {}).get('relType') == 'OWNS' and r['target'] == incumbent_id:
                    company = nodes_by_id.get(r['source'])
                    owns_rel = r
                    break
            
            if not company:
                continue
            
            # Find consultant coverage
            consultant = None
            field_consultant = None
            cover_rel = None
            
            for r in relationships:
                if r.get('data', {}).get('relType') == 'COVERS' and r['target'] == company['id']:
                    fc_or_cons = nodes_by_id.get(r['source'])
                    cover_rel = r
                    
                    if fc_or_cons.get('type') == 'FIELD_CONSULTANT':
                        field_consultant = fc_or_cons
                        # Find parent consultant
                        for emp_r in relationships:
                            if emp_r.get('data', {}).get('relType') == 'EMPLOYS' and emp_r['target'] == field_consultant['id']:
                                consultant = nodes_by_id.get(emp_r['source'])
                                break
                    elif fc_or_cons.get('type') == 'CONSULTANT':
                        consultant = fc_or_cons
                    break
            
            # Find consultant rating on recommended product
            rating = None
            if consultant:
                for r in relationships:
                    if (r.get('data', {}).get('relType') == 'RATES' and 
                        r['source'] == consultant['id'] and 
                        r['target'] == recommended_id):
                        rating = r.get('data', {}).get('rankgroup')
                        break
            
            # Build recommendation row
            row = {
                'Consultant': consultant.get('data', {}).get('name', 'N/A') if consultant else 'N/A',
                'Consultant Advisor': consultant.get('data', {}).get('consultant_advisor', 'N/A') if consultant else 'N/A',
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
                'Consultant Influence Level': cover_rel.get('data', {}).get('level_of_influence', 'N/A') if cover_rel else 'N/A'
            }
            
            table_rows.append(row)
    
    else:
        # Process OWNS relationships (standard mode)
        for rel in relationships:
            if rel.get('data', {}).get('relType') != 'OWNS':
                continue
            
            company_id = rel['source']
            product_id = rel['target']
            
            company = nodes_by_id.get(company_id, {})
            product = nodes_by_id.get(product_id, {})
            
            # Find consultant coverage
            consultant = None
            field_consultant = None
            cover_rel = None
            
            for r in relationships:
                if r.get('data', {}).get('relType') == 'COVERS' and r['target'] == company_id:
                    fc_or_cons = nodes_by_id.get(r['source'])
                    cover_rel = r
                    
                    if fc_or_cons.get('type') == 'FIELD_CONSULTANT':
                        field_consultant = fc_or_cons
                        # Find parent consultant
                        for emp_r in relationships:
                            if emp_r.get('data', {}).get('relType') == 'EMPLOYS' and emp_r['target'] == field_consultant['id']:
                                consultant = nodes_by_id.get(emp_r['source'])
                                break
                    elif fc_or_cons.get('type') == 'CONSULTANT':
                        consultant = fc_or_cons
                    break
            
            # Find consultant rating
            rating = None
            if consultant:
                for r in relationships:
                    if (r.get('data', {}).get('relType') == 'RATES' and 
                        r['source'] == consultant['id'] and 
                        r['target'] == product_id):
                        rating = r.get('data', {}).get('rankgroup')
                        break
            
            # Build standard row
            row = {
                'Consultant': consultant.get('data', {}).get('name', 'N/A') if consultant else 'N/A',
                'Consultant Advisor': consultant.get('data', {}).get('consultant_advisor', 'N/A') if consultant else 'N/A',
                'Consultant Region': consultant.get('data', {}).get('region', 'N/A') if consultant else 'N/A',
                'Field Consultant': field_consultant.get('data', {}).get('name', 'N/A') if field_consultant else 'N/A',
                'Company': company.get('data', {}).get('name', 'N/A'),
                'Company Channel': company.get('data', {}).get('channel', 'N/A'),
                'Company Sales Region': company.get('data', {}).get('sales_region', 'N/A'),
                'Company Advisor': company.get('data', {}).get('pca', 'N/A'),
                'Product': product.get('data', {}).get('name', 'N/A'),
                'Product Asset Class': product.get('data', {}).get('asset_class', 'N/A'),
                'Product Universe': product.get('data', {}).get('universe_name', 'N/A'),
                'Consultant Influence Level': cover_rel.get('data', {}).get('level_of_influence', 'N/A') if cover_rel else 'N/A',
                'Consultant Rating': rating or 'N/A',
                'Mandate Status': rel.get('data', {}).get('mandate_status', 'N/A'),
                'Commitment Value': rel.get('data', {}).get('commitment_market_value', 'N/A'),
                'Mandate Manager': rel.get('data', {}).get('manager', 'N/A'),
                'Manager Since Date': rel.get('data', {}).get('manager_since_date', 'N/A')
            }
            
            table_rows.append(row)
    
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