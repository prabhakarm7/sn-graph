h_filter-service
def get_filtered_processed_data(
    self, 
    region: str, 
    filters: Dict[str, Any] = None, 
    recommendations_mode: bool = False,
    node_limit: int = 50
) -> Dict[str, Any]:
    """
    Complete server-side processing with node limit enforcement
    - Filters should always populate (for UI dropdowns)
    - Nodes limited to 50 for performance
    - All processing done server-side
    """
    start_time = time.time()
    
    print(f"Server-side processing: region={region}, node_limit={node_limit}, filters={filters}")
    
    # Step 1: Get raw region data
    if recommendations_mode:
        raw_data = self._get_recommendations_data(region)
    else:
        raw_data = self._get_standard_data(region)
    
    # Step 2: Generate filter options from FULL dataset (before limiting)
    filter_options = self._extract_all_filter_options(raw_data)
    
    # Step 3: Apply filters server-side
    if filters:
        filtered_data = self._apply_comprehensive_server_filters(raw_data, filters)
    else:
        # Default filters
        filtered_data = self._apply_default_filters(raw_data)
    
    # Step 4: Check node count and apply limit
    node_count_after_filter = len(filtered_data['nodes'])
    
    if node_count_after_filter > node_limit:
        # Limit nodes but maintain filter options
        limited_data = self._apply_node_limit(filtered_data, node_limit)
        limited = True
        actual_nodes_shown = len(limited_data['nodes'])
    else:
        limited_data = filtered_data
        limited = False
        actual_nodes_shown = node_count_after_filter
    
    # Step 5: Process to ReactFlow format
    processed_data = self._process_to_reactflow_format_complete(limited_data)
    
    total_time = (time.time() - start_time) * 1000
    
    return {
        "success": True,
        "data": {
            "nodes": processed_data["nodes"],
            "edges": processed_data["edges"]
        },
        "filter_options": filter_options,
        "metadata": {
            "region": region,
            "mode": "recommendations" if recommendations_mode else "standard",
            "filters_applied": filters or {},
            "processing_time_ms": total_time,
            "server_processed": True,
            "node_counts": {
                "raw_total": len(raw_data['nodes']),
                "after_filters": node_count_after_filter,
                "displayed": actual_nodes_shown,
                "limit_applied": limited,
                "node_limit": node_limit
            },
            "filter_stats": {
                "total_filter_options": sum(len(v) if isinstance(v, list) else 0 for v in filter_options.values())
            }
        }
    }

def _extract_all_filter_options(self, data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract ALL possible filter options from complete dataset"""
    print("Extracting comprehensive filter options from full dataset")
    
    nodes = data["nodes"]
    relationships = data["relationships"]
    
    options = {
        "regions": ["NAI", "EMEA", "APAC"],
        "sales_regions": set(),
        "channels": set(),
        "asset_classes": set(),
        "consultants": [],
        "field_consultants": [],
        "clients": [],
        "products": [],
        "incumbent_products": [],
        "pcas": set(),
        "acas": set(),
        "client_advisors": set(),
        "consultant_advisors": set(),
        "ratings": set(["Positive", "Negative", "Neutral", "Introduced"]),
        "influence_levels": set(["1", "2", "3", "4", "UNK", "High", "medium", "low"]),
        "mandate_statuses": set(),
        "jpm_flags": set(),
        "privacy_levels": set()
    }
    
    # Process all nodes for filter options
    for node in nodes:
        props = node["properties"]
        labels = node["labels"]
        
        # Geographic options
        if props.get("sales_region"):
            options["sales_regions"].add(props["sales_region"])
        if props.get("channel"):
            options["channels"].add(props["channel"])
        
        # Entity options
        if props.get("asset_class"):
            options["asset_classes"].add(props["asset_class"])
        if props.get("pca"):
            options["pcas"].add(props["pca"])
        if props.get("aca"):
            options["acas"].add(props["aca"])
        if props.get("jmp_flag"):
            options["jmp_flags"].add(props["jmp_flag"])
        if props.get("privacy"):
            options["privacy_levels"].add(props["privacy"])
        
        # Enhanced PCA/ACA processing
        if "COMPANY" in labels:
            # Client advisors (Company PCA + ACA)
            if props.get("pca"):
                # Handle comma-separated or JSON array format
                pca_values = self._parse_advisor_field(props["pca"])
                options["client_advisors"].update(pca_values)
            if props.get("aca"):
                aca_values = self._parse_advisor_field(props["aca"])
                options["client_advisors"].update(aca_values)
        
        if "CONSULTANT" in labels:
            # Consultant advisors (Consultant PCA + consultant_advisor)
            if props.get("pca"):
                pca_values = self._parse_advisor_field(props["pca"])
                options["consultant_advisors"].update(pca_values)
            if props.get("consultant_advisor"):
                advisor_values = self._parse_advisor_field(props["consultant_advisor"])
                options["consultant_advisors"].update(advisor_values)
        
        # Entity lists with id/name pairs
        name = props.get("name")
        if name:
            if "CONSULTANT" in labels:
                options["consultants"].append({"id": node["id"], "name": name})
            elif "FIELD_CONSULTANT" in labels:
                options["field_consultants"].append({"id": node["id"], "name": name})
            elif "COMPANY" in labels:
                options["clients"].append({"id": node["id"], "name": name})
            elif "PRODUCT" in labels:
                options["products"].append({"id": node["id"], "name": name})
            elif "INCUMBENT_PRODUCT" in labels:
                options["incumbent_products"].append({"id": node["id"], "name": name})
    
    # Process relationships for filter options
    for rel in relationships:
        if rel["type"] == "RATES" and rel.get("properties", {}).get("rankgroup"):
            options["ratings"].add(rel["properties"]["rankgroup"])
        if rel["type"] == "OWNS" and rel.get("properties", {}).get("mandate_status"):
            options["mandate_statuses"].add(rel["properties"]["mandate_status"])
        if rel["type"] == "COVERS" and rel.get("properties", {}).get("level_of_influence"):
            options["influence_levels"].add(str(rel["properties"]["level_of_influence"]))
    
    # Convert sets to sorted lists and deduplicate entity lists
    final_options = {}
    for key, value in options.items():
        if isinstance(value, set):
            final_options[key] = sorted(list(value))
        elif isinstance(value, list) and value and isinstance(value[0], dict):
            # Deduplicate entity lists by id
            seen_ids = set()
            unique_items = []
            for item in value:
                if item["id"] not in seen_ids:
                    unique_items.append(item)
                    seen_ids.add(item["id"])
            final_options[key] = sorted(unique_items, key=lambda x: x["name"])
        else:
            final_options[key] = value
    
    print(f"Filter options extracted: {sum(len(v) if isinstance(v, list) else 0 for v in final_options.values())} total options")
    
    return final_options

def _parse_advisor_field(self, field_value: str) -> set:
    """Parse PCA/ACA fields that might be comma-separated or JSON arrays"""
    if not field_value or not field_value.strip():
        return set()
    
    advisors = set()
    
    # Handle JSON array format: "['Name1','Name2']"
    if field_value.startswith('[') and field_value.endswith(']'):
        try:
            import ast
            parsed_values = ast.literal_eval(field_value)
            if isinstance(parsed_values, list):
                for val in parsed_values:
                    if val and str(val).strip():
                        advisors.add(str(val).strip())
        except (ValueError, SyntaxError):
            # Fallback to comma-separated
            advisors.update(val.strip() for val in field_value.split(',') if val.strip())
    else:
        # Regular comma-separated format
        advisors.update(val.strip() for val in field_value.split(',') if val.strip())
    
    return advisors

def _apply_comprehensive_server_filters(self, data: Dict[str, Any], filters: Dict[str, Any]) -> Dict[str, Any]:
    """Apply ALL filter types server-side"""
    nodes = data["nodes"]
    relationships = data["relationships"]
    
    print(f"Applying comprehensive filters: {list(filters.keys())}")
    
    # Node type filtering
    if filters.get("nodeTypes"):
        original_count = len(nodes)
        nodes = [n for n in nodes if any(label in filters["nodeTypes"] for label in n["labels"])]
        print(f"Node type filter: {original_count} -> {len(nodes)} nodes")
    
    # Geographic filtering
    if filters.get("sales_regions"):
        nodes = [n for n in nodes if 
                not n["properties"].get("sales_region") or 
                n["properties"]["sales_region"] in filters["sales_regions"]]
        print(f"Sales region filter: {len(nodes)} nodes")
    
    if filters.get("channels"):
        nodes = [n for n in nodes if 
                not n["properties"].get("channel") or 
                n["properties"]["channel"] in filters["channels"]]
        print(f"Channel filter: {len(nodes)} nodes")
    
    if filters.get("assetClasses"):
        nodes = [n for n in nodes if 
                not n["properties"].get("asset_class") or 
                n["properties"]["asset_class"] in filters["assetClasses"]]
        print(f"Asset class filter: {len(nodes)} nodes")
    
    # Enhanced advisor filtering
    if filters.get("clientAdvisorIds"):
        nodes = self._filter_by_client_advisors(nodes, filters["clientAdvisorIds"])
        print(f"Client advisor filter: {len(nodes)} nodes")
    
    if filters.get("consultantAdvisorIds"):
        nodes = self._filter_by_consultant_advisors(nodes, filters["consultantAdvisorIds"])
        print(f"Consultant advisor filter: {len(nodes)} nodes")
    
    # Entity-specific filtering (creates focused subgraphs)
    if filters.get("consultantIds"):
        nodes = self._get_consultant_subgraph_server_side(filters["consultantIds"], nodes, relationships)
        print(f"Consultant subgraph filter: {len(nodes)} nodes")
    
    if filters.get("clientIds"):
        nodes = self._get_company_subgraph_server_side(filters["clientIds"], nodes, relationships)
        print(f"Company subgraph filter: {len(nodes)} nodes")
    
    if filters.get("productIds"):
        nodes = self._get_product_subgraph_server_side(filters["productIds"], nodes, relationships)
        print(f"Product subgraph filter: {len(nodes)} nodes")
    
    if filters.get("incumbentProductIds"):
        nodes = self._get_incumbent_product_subgraph_server_side(filters["incumbentProductIds"], nodes, relationships)
        print(f"Incumbent product subgraph filter: {len(nodes)} nodes")
    
    # Filter relationships to match remaining nodes
    node_ids = {n["id"] for n in nodes}
    relationships = [r for r in relationships if 
                    r["start_node_id"] in node_ids and r["end_node_id"] in node_ids]
    
    # Relationship-specific filtering
    if filters.get("mandateStatuses"):
        original_count = len(relationships)
        relationships = [r for r in relationships if 
                        r["type"] != "OWNS" or 
                        not r.get("properties", {}).get("mandate_status") or
                        r["properties"]["mandate_status"] in filters["mandateStatuses"]]
        print(f"Mandate status filter: {original_count} -> {len(relationships)} relationships")
    
    if filters.get("influenceLevels"):
        relationships = [r for r in relationships if 
                        r["type"] != "COVERS" or
                        not r.get("properties", {}).get("level_of_influence") or
                        str(r["properties"]["level_of_influence"]) in filters["influenceLevels"]]
        print(f"Influence level filter: {len(relationships)} relationships")
    
    if filters.get("ratings"):
        # Filter products based on their ratings
        products_with_matching_ratings = set()
        for rel in relationships:
            if (rel["type"] == "RATES" and 
                rel.get("properties", {}).get("rankgroup") in filters["ratings"]):
                products_with_matching_ratings.add(rel["end_node_id"])
        
        if products_with_matching_ratings:
            # Keep only products that have matching ratings + all other node types
            nodes = [n for n in nodes if 
                    not any(label in ["PRODUCT", "INCUMBENT_PRODUCT"] for label in n["labels"]) or
                    n["id"] in products_with_matching_ratings]
            print(f"Rating filter: {len(nodes)} nodes")
    
    # Remove orphaned nodes if showInactive is False
    if not filters.get("showInactive", True):
        connected_nodes = set()
        for rel in relationships:
            connected_nodes.add(rel["start_node_id"])
            connected_nodes.add(rel["end_node_id"])
        original_count = len(nodes)
        nodes = [n for n in nodes if n["id"] in connected_nodes]
        print(f"Orphan removal: {original_count} -> {len(nodes)} nodes")
    
    return {"nodes": nodes, "relationships": relationships}

def _apply_node_limit(self, data: Dict[str, Any], limit: int) -> Dict[str, Any]:
    """Apply node limit while maintaining graph connectivity"""
    nodes = data["nodes"]
    relationships = data["relationships"]
    
    if len(nodes) <= limit:
        return data
    
    print(f"Applying node limit: {len(nodes)} -> {limit} nodes")
    
    # Prioritize nodes by importance (consultants > companies > products)
    priority_order = ["CONSULTANT", "FIELD_CONSULTANT", "COMPANY", "PRODUCT", "INCUMBENT_PRODUCT"]
    
    prioritized_nodes = []
    for priority_type in priority_order:
        type_nodes = [n for n in nodes if priority_type in n["labels"]]
        prioritized_nodes.extend(type_nodes)
    
    # Add any remaining nodes
    existing_ids = {n["id"] for n in prioritized_nodes}
    remaining_nodes = [n for n in nodes if n["id"] not in existing_ids]
    prioritized_nodes.extend(remaining_nodes)
    
    # Take first 'limit' nodes
    limited_nodes = prioritized_nodes[:limit]
    
    # Filter relationships to match limited nodes
    limited_node_ids = {n["id"] for n in limited_nodes}
    limited_relationships = [r for r in relationships if 
                           r["start_node_id"] in limited_node_ids and 
                           r["end_node_id"] in limited_node_ids]
    
    print(f"Node limit applied: {len(limited_nodes)} nodes, {len(limited_relationships)} relationships")
    
    return {"nodes": limited_nodes, "relationships": limited_relationships}

def _process_to_reactflow_format_complete(self, data: Dict[str, Any]) -> Dict[str, Any]:
    """Complete ReactFlow format processing with all features"""
    nodes = data["nodes"]
    relationships = data["relationships"]
    
    # Build efficient lookup maps
    node_map = {n["id"]: n for n in nodes}
    ratings_by_product = {}
    
    # Server-side rating collection
    for rel in relationships:
        if rel["type"] == "RATES":
            product_id = rel["end_node_id"]
            consultant = node_map.get(rel["start_node_id"])
            
            if product_id not in ratings_by_product:
                ratings_by_product[product_id] = []
            
            if consultant:
                ratings_by_product[product_id].append({
                    "consultant": consultant["properties"].get("name", rel["start_node_id"]),
                    "rankgroup": self._normalize_rank_group(
                        rel.get("properties", {}).get("rankgroup", "Neutral")
                    ),
                    "rating": rel.get("properties", {}).get("rankgroup")
                })
    
    # Process nodes with complete feature set
    reactflow_nodes = []
    for node in nodes:
        node_data = {
            "id": node["id"],
            "name": node["properties"].get("name", node["id"]),
            "label": node["properties"].get("name", node["id"]),
            **node["properties"]
        }
        
        # Inject ratings for products
        if any(label in ["PRODUCT", "INCUMBENT_PRODUCT"] for label in node["labels"]):
            node_data["ratings"] = ratings_by_product.get(node["id"], [])
        
        # Handle field consultant parent relationships
        if "FIELD_CONSULTANT" in node["labels"]:
            node_data["parentConsultantId"] = self._resolve_parent_consultant_server_side(node, node_map)
        
        reactflow_nodes.append({
            "id": node["id"],
            "type": node["labels"][0],
            "data": node_data,
            "position": {"x": 0, "y": 0}
        })
    
    # Process edges with complete feature set
    reactflow_edges = []
    for rel in relationships:
        if rel["type"] != "RATES":  # RATES are embedded in node data
            edge_data = {
                "relType": rel["type"],
                "sourceId": rel["start_node_id"],
                "targetId": rel["end_node_id"],
                **rel.get("properties", {})
            }
            
            # Property normalization
            if "mandate_status" in edge_data:
                edge_data["mandateStatus"] = edge_data["mandate_status"]
            if "level_of_influence" in edge_data:
                edge_data["levelOfInfluence"] = edge_data["level_of_influence"]
            
            reactflow_edges.append({
                "id": rel["id"],
                "source": rel["start_node_id"],
                "target": rel["end_node_id"],
                "type": "custom",
                "data": edge_data
            })
    
    print(f"ReactFlow processing complete: {len(reactflow_nodes)} nodes, {len(reactflow_edges)} edges")
    print(f"Products with ratings: {len([n for n in reactflow_nodes if n['data'].get('ratings')])}")
    
    return {
        "nodes": reactflow_nodes,
        "edges": reactflow_edges
    }


@filter _extract_all_filter_options
@hierarchical_router.post("/region/{region}/filtered-limited")
async def get_filtered_limited_data(
    region: str,
    filter_request: Dict[str, Any],
    recommendations_mode: bool = Query(False, description="Enable recommendations mode"),
    node_limit: int = Query(50, description="Maximum nodes to return", ge=1, le=1000)
):
    """
    Complete server-side processing with node limit:
    - All filtering done server-side
    - All processing done server-side  
    - Node count limited for performance
    - Filter options always populated from full dataset
    """
    try:
        result = hierarchical_filter_service.get_filtered_processed_data(
            region.upper(), 
            filter_request, 
            recommendations_mode,
            node_limit
        )
        
        return {
            "success": True,
            "message": f"Server-processed data for {region} (limited to {node_limit} nodes)",
            "node_limit_info": {
                "requested_limit": node_limit,
                "limit_applied": result["metadata"]["node_counts"]["limit_applied"],
                "nodes_available": result["metadata"]["node_counts"]["after_filters"],
                "nodes_displayed": result["metadata"]["node_counts"]["displayed"]
            },
            **result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server-side processing failed: {str(e)}")

@hierarchical_router.get("/region/{region}/filter-options")
async def get_filter_options_only(
    region: str,
    recommendations_mode: bool = Query(False)
):
    """
    Get ONLY filter options from full dataset (no node limit applied)
    Used to populate filter dropdowns
    """
    try:
        # Get raw data for filter option extraction
        if recommendations_mode:
            raw_data = hierarchical_filter_service._get_recommendations_data(region)
        else:
            raw_data = hierarchical_filter_service._get_standard_data(region)
        
        filter_options = hierarchical_filter_service._extract_all_filter_options(raw_data)
        
        return {
            "success": True,
            "message": f"Filter options for {region}",
            "filter_options": filter_options,
            "metadata": {
                "region": region,
                "mode": "recommendations" if recommendations_mode else "standard",
                "total_nodes_in_region": len(raw_data["nodes"]),
                "total_filter_options": sum(len(v) if isinstance(v, list) else 0 for v in filter_options.values())
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get filter options: {str(e)}")
    

    useGraphData.ts
    export const useGraphData = () => {
  const [graphData, setGraphData] = useState<{ nodes: Node<AppNodeData>[], edges: Edge<EdgeData>[] }>({ 
    nodes: [], 
    edges: [] 
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [nodeLimitInfo, setNodeLimitInfo] = useState<any>(null);
  
  const NODE_LIMIT = 50; // Configurable limit
  
  const applyFilters = useCallback(async (filters: Partial<FilterCriteria>) => {
    console.log('Applying server-side filters with node limit:', filters);
    
    if (initialLoading || filterLoading) return;
    
    setFilterLoading(true);
    setError(null);
    
    try {
      const newFilters = { ...currentFilters, ...filters };
      
      // Server-side filtering with node limit
      const response = await fetch(
        `${apiService.baseUrl}/api/v1/hierarchical/region/${currentRegions[0]}/filtered-limited?node_limit=${NODE_LIMIT}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newFilters,
            recommendations_mode: isRecommendationsMode
          })
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Server-side filtering failed');
      }
      
      console.log('Server-side processing completed:', result.metadata);
      console.log('Node limit info:', result.node_limit_info);
      
      // Data is ReactFlow-ready, only layout calculation needed
      const layoutedData = await layoutWithDagreAsync(result.data.nodes, result.data.edges);
      
      setGraphData(layoutedData);
      setCurrentFilters(newFilters);
      setNodeLimitInfo(result.node_limit_info);
      
      // Update filter options if provided
      if (result.filter_options) {
        setFilterOptions(transformHierarchicalOptions(result.filter_options));
      }
      
    } catch (err) {
      console.error('Server-side filtering error:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply filters');
    } finally {
      setFilterLoading(false);
    }
  }, [currentFilters, currentRegions, isRecommendationsMode, initialLoading, filterLoading, NODE_LIMIT]);
  
  const loadFilterOptions = useCallback(async (regions: string[]) => {
    try {
      const response = await fetch(
        `${apiService.baseUrl}/api/v1/hierarchical/region/${regions[0]}/filter-options?recommendations_mode=${isRecommendationsMode}`
      );
      
      const result = await response.json();
      
      if (result.success) {
        setFilterOptions(transformHierarchicalOptions(result.filter_options));
        console.log('Filter options loaded:', result.metadata);
      }
      
    } catch (err) {
      console.warn('Failed to load filter options:', err);
    }
  }, [isRecommendationsMode]);
  
  const changeRegions = useCallback(async (newRegions: string[]) => {
    console.log(`Changing regions with server-side processing: ${newRegions}`);
    
    setInitialLoading(true);
    setGraphData({ nodes: [], edges: [] });
    setNodeLimitInfo(null);
    
    try {
      // Load filter options first (from full dataset)
      await loadFilterOptions(newRegions);
      
      // Then apply filters with node limit
      await applyFilters({ regions: newRegions });
      
      setCurrentRegions(newRegions);
      
    } catch (err) {
      console.error('Region change error:', err);
      setError(err instanceof Error ? err.message : 'Failed to change regions');
    } finally {
      setInitialLoading(false);
    }
  }, [loadFilterOptions, applyFilters]);
  
  return {
    // Data
    graphData,
    filterOptions,
    currentFilters,
    currentRegions,
    nodeLimitInfo, // NEW: Info about node limiting
    
    // Loading states
    initialLoading,
    filterLoading,
    error,
    
    // Actions
    changeRegions,
    applyFilters,
    resetFilters: () => applyFilters({}),
    getAvailableRegions: () => ['NAI', 'EMEA', 'APAC'],
    
    // Computed properties
    hasData: graphData.nodes.length > 0,
    nodeCount: graphData.nodes.length,
    edgeCount: graphData.edges.length,
    isNodeLimited: nodeLimitInfo?.limit_applied || false,
    availableNodeCount: nodeLimitInfo?.nodes_available || 0
  };
};


statuscatd

export const StatsCards: React.FC<StatsCardsProps & {
  nodeLimitInfo?: any;
}> = ({ 
  nodes, 
  edges,
  nodeLimitInfo,
  // ... other props
}) => {
  return (
    <Box sx={{ /* existing styles */ }}>
      {/* Left side - existing title */}
      
      {/* Right side - add node limit indicator */}
      <Box sx={{ /* existing styles */ }}>
        
        {/* Add node limit indicator */}
        {nodeLimitInfo?.limit_applied && (
          <Tooltip 
            title={`Showing ${nodeLimitInfo.nodes_displayed} of ${nodeLimitInfo.nodes_available} available nodes. Adjust filters to see different results.`} 
            arrow
          >
            <Chip
              label={`${nodeLimitInfo.nodes_displayed}/${nodeLimitInfo.nodes_available}`}
              size="small"
              sx={{
                bgcolor: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                mr: 1
              }}
            />
          </Tooltip>
        )}
        
        {/* Existing controls */}
      </Box>
    </Box>
  );
};


helper h_filoter_serci
def _filter_by_client_advisors(self, nodes: List[Dict], advisor_ids: List[str]) -> List[Dict]:
    """Filter nodes by client advisor IDs (Company PCA/ACA)"""
    if not advisor_ids:
        return nodes
    
    filtered_nodes = []
    for node in nodes:
        if "COMPANY" in node["labels"]:
            props = node["properties"]
            pca_values = self._parse_advisor_field(props.get("pca", ""))
            aca_values = self._parse_advisor_field(props.get("aca", ""))
            all_advisors = pca_values.union(aca_values)
            
            if any(advisor in all_advisors for advisor in advisor_ids):
                filtered_nodes.append(node)
        else:
            # Keep non-company nodes
            filtered_nodes.append(node)
    
    return filtered_nodes

def _filter_by_consultant_advisors(self, nodes: List[Dict], advisor_ids: List[str]) -> List[Dict]:
    """Filter nodes by consultant advisor IDs (Consultant PCA/consultant_advisor)"""
    if not advisor_ids:
        return nodes
    
    filtered_nodes = []
    for node in nodes:
        if "CONSULTANT" in node["labels"]:
            props = node["properties"]
            pca_values = self._parse_advisor_field(props.get("pca", ""))
            advisor_values = self._parse_advisor_field(props.get("consultant_advisor", ""))
            all_advisors = pca_values.union(advisor_values)
            
            if any(advisor in all_advisors for advisor in advisor_ids):
                filtered_nodes.append(node)
        else:
            # Keep non-consultant nodes
            filtered_nodes.append(node)
    
    return filtered_nodes

def _get_consultant_subgraph_server_side(self, consultant_names: List[str], nodes: List[Dict], relationships: List[Dict]) -> List[Dict]:
    """Get consultant subgraph server-side"""
    connected_node_ids = set()
    
    # Find selected consultants
    selected_consultants = [n for n in nodes if 
                          "CONSULTANT" in n["labels"] and 
                          n["properties"].get("name") in consultant_names]
    
    for consultant in selected_consultants:
        connected_node_ids.add(consultant["id"])
    
    # Find field consultants employed by selected consultants
    for rel in relationships:
        if (rel["type"] == "EMPLOYS" and 
            any(c["id"] == rel["start_node_id"] for c in selected_consultants)):
            connected_node_ids.add(rel["end_node_id"])
    
    # Find companies covered by these field consultants
    for rel in relationships:
        if rel["type"] == "COVERS" and rel["start_node_id"] in connected_node_ids:
            connected_node_ids.add(rel["end_node_id"])
    
    # Find products owned by these companies
    for rel in relationships:
        if rel["type"] == "OWNS" and rel["start_node_id"] in connected_node_ids:
            connected_node_ids.add(rel["end_node_id"])
    
    return [n for n in nodes if n["id"] in connected_node_ids]

def _get_company_subgraph_server_side(self, company_names: List[str], nodes: List[Dict], relationships: List[Dict]) -> List[Dict]:
    """Get company subgraph server-side"""
    connected_node_ids = set()
    
    # Find selected companies
    selected_companies = [n for n in nodes if 
                         "COMPANY" in n["labels"] and 
                         n["properties"].get("name") in company_names]
    
    for company in selected_companies:
        connected_node_ids.add(company["id"])
    
    # Find field consultants covering these companies
    for rel in relationships:
        if (rel["type"] == "COVERS" and 
            any(c["id"] == rel["end_node_id"] for c in selected_companies)):
            connected_node_ids.add(rel["start_node_id"])
    
    # Find consultants employing these field consultants
    for rel in relationships:
        if rel["type"] == "EMPLOYS" and rel["end_node_id"] in connected_node_ids:
            connected_node_ids.add(rel["start_node_id"])
    
    # Find products owned by selected companies
    for rel in relationships:
        if (rel["type"] == "OWNS" and 
            any(c["id"] == rel["start_node_id"] for c in selected_companies)):
            connected_node_ids.add(rel["end_node_id"])
    
    return [n for n in nodes if n["id"] in connected_node_ids]

def _get_product_subgraph_server_side(self, product_names: List[str], nodes: List[Dict], relationships: List[Dict]) -> List[Dict]:
    """Get product subgraph server-side"""
    connected_node_ids = set()
    
    # Find selected products
    selected_products = [n for n in nodes if 
                        (any(label in ["PRODUCT", "INCUMBENT_PRODUCT"] for label in n["labels"])) and 
                        n["properties"].get("name") in product_names]
    
    for product in selected_products:
        connected_node_ids.add(product["id"])
    
    # Find companies owning these products
    for rel in relationships:
        if (rel["type"] == "OWNS" and 
            any(p["id"] == rel["end_node_id"] for p in selected_products)):
            connected_node_ids.add(rel["start_node_id"])
    
    # Continue building connected subgraph...
    return [n for n in nodes if n["id"] in connected_node_ids]

def _resolve_parent_consultant_server_side(self, field_consultant_node: Dict, node_map: Dict) -> str:
    """Resolve parent consultant ID server-side"""
    props = field_consultant_node["properties"]
    
    # Try explicit parent ID first
    if props.get("parentConsultantId"):
        return props["parentConsultantId"]
    
    if props.get("consultant_id"):
        return props["consultant_id"]
    
    # Pattern matching fallback
    fc_id = field_consultant_node["id"]
    if "_F" in fc_id:
        return fc_id.replace("_F", "_C")
    
    return props.get("pca", fc_id)

def _normalize_rank_group(self, rank_value: str) -> str:
    """Normalize rank group values"""
    if not rank_value:
        return "Neutral"
    
    normalized = rank_value.lower().strip()
    if normalized == "positive":
        return "Positive"
    elif normalized == "negative":
        return "Negative"
    elif normalized == "introduced":
        return "Introduced"
    else:
        return "Neutral"

def _apply_default_filters(self, data: Dict[str, Any]) -> Dict[str, Any]:
    """Apply default filters when none specified"""
    return {
        "nodes": data["nodes"],
        "relationships": data["relationships"]
    }


#statuscard
// Add to StatsCards.tsx props
interface StatsCardsProps {
  // ... existing props
  nodeLimitInfo?: {
    limit_applied: boolean;
    nodes_available: number;
    nodes_displayed: number;
  };
}


#maincom
// Add to the hook destructuring
const { 
  // ... existing
  nodeLimitInfo,
  isNodeLimited,
  availableNodeCount
} = useGraphData();

// Pass to StatsCards
<StatsCards 
  nodes={nodes} 
  edges={edges}
  nodeLimitInfo={nodeLimitInfo}
  // ... other props
/>