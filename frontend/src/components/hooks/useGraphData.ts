// hooks/useGraphData.ts - COMPLETE with Recommendations Mode Support
import { useState, useEffect, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import ApiNeo4jService from '../services/ApiNeo4jService';
import { FilterCriteria, FilterOptions, transformHierarchicalOptions } from '../types/FitlerTypes';
import { AppNodeData, EdgeData } from '../types/GraphTypes';
import dagre from 'dagre';

interface Neo4jNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

interface Neo4jRelationship {
  id: string;
  type: string;
  start_node_id: string;
  end_node_id: string;
  properties: Record<string, any>;
}

interface Neo4jResult {
  nodes: Neo4jNode[];
  relationships: Neo4jRelationship[];
  metadata?: Record<string, any>;
}

interface HierarchicalResponse {
  success: boolean;
  data?: {
    region: string;
    graph_data: {
      nodes: Neo4jNode[];
      relationships: Neo4jRelationship[];
    };
    filter_options: Record<string, any>;
    statistics: {
      total_nodes: number;
      total_relationships: number;
      total_filter_options: number;
    };
  };
  message?: string;
  error?: string;
}

// Layout configuration
const NODE_W = 240;
const NODE_H = 120;

const layoutWithDagre = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 120, ranksep: 160 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const layoutedNodes = nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } };
  });

  return { nodes: layoutedNodes, edges };
};

// Transform Neo4j data to ReactFlow format WITH PROPER RATINGS COLLECTION
const transformNeo4jToReactFlow = (data: Neo4jResult): { nodes: Node<AppNodeData>[], edges: Edge<EdgeData>[] } => {
  console.log('🔄 TRANSFORMATION: Starting Neo4j to ReactFlow with ratings collection:', {
    inputNodes: data.nodes.length,
    inputRelationships: data.relationships.length
  });
  
  // Step 1: Find all RATES relationships
  const ratesRelationships = data.relationships.filter(rel => rel.type === 'RATES');
  console.log(`🎯 Found ${ratesRelationships.length} RATES relationships`);
  
  // Step 2: Create a map to collect ratings for each product
  const productRatingsMap = new Map<string, Array<{consultant: string, rankgroup: 'Positive' | 'Negative' | 'Introduced' | 'Neutral', rating?: string}>>();
  
  // Helper function to ensure rankgroup is a valid RankGroup
  const normalizeRankGroup = (value: string): 'Positive' | 'Negative' | 'Introduced' | 'Neutral' => {
    const normalized = value?.toLowerCase();
    switch (normalized) {
      case 'positive': return 'Positive';
      case 'negative': return 'Negative';
      case 'introduced': return 'Introduced';
      case 'neutral': return 'Neutral';
      default: return 'Neutral'; // Default fallback
    }
  };
  
  ratesRelationships.forEach(rel => {
    const consultantNode = data.nodes.find(n => n.id === rel.start_node_id);
    const productNode = data.nodes.find(n => n.id === rel.end_node_id);
    
    if (consultantNode && productNode) {
      const consultantName = consultantNode.properties.name || consultantNode.properties.label || consultantNode.id;
      const rawRatingValue = rel.properties.rankgroup || rel.properties.rating || rel.properties.rank || 'Neutral';
      const normalizedRankGroup = normalizeRankGroup(rawRatingValue);
      
      const rating = {
        consultant: consultantName,
        rankgroup: normalizedRankGroup,
        rating: rawRatingValue
      };
      
      if (!productRatingsMap.has(productNode.id)) {
        productRatingsMap.set(productNode.id, []);
      }
      productRatingsMap.get(productNode.id)!.push(rating);
      
      console.log(`📊 Collected rating: ${consultantName} rated ${productNode.properties.name || productNode.id} as "${normalizedRankGroup}"`);
    }
  });
  
  console.log(`📈 Product ratings collected for ${productRatingsMap.size} products`);
  
  // Step 3: Transform nodes and inject ratings into product nodes
  const nodes: Node<AppNodeData>[] = data.nodes.map(neo4jNode => {
    const nodeData: AppNodeData = {
      ...neo4jNode.properties,
      id: neo4jNode.properties.id || neo4jNode.id,
      name: neo4jNode.properties.name || neo4jNode.properties.label || neo4jNode.id,
      label: neo4jNode.properties.label || neo4jNode.properties.name || neo4jNode.id
    };
    
    // Inject collected ratings into product nodes
    if (neo4jNode.labels.includes('PRODUCT') || neo4jNode.labels.includes('INCUMBENT_PRODUCT')) {
      const collectedRatings = productRatingsMap.get(neo4jNode.id) || [];
      nodeData.ratings = collectedRatings;
      
      console.log(`🦄 Product "${nodeData.name}" (${neo4jNode.id}) now has ${collectedRatings.length} ratings`);
    }
    
    // Add parent consultant ID for field consultants
    if (neo4jNode.labels.includes('FIELD_CONSULTANT') && !nodeData.parentConsultantId) {
      let parentId = '';
      const nodeId = neo4jNode.id || '';
      
      if (nodeId.includes('_F')) {
        parentId = nodeId.replace('_F', '_C');
      } else if (nodeData.pca) {
        parentId = nodeData.pca;
      }
      
      if (parentId) {
        nodeData.parentConsultantId = parentId;
        console.log(`🔗 Added parent consultant ${parentId} to field consultant ${nodeId}`);
      }
    }
    
    return {
      id: neo4jNode.id,
      type: neo4jNode.labels[0],
      data: nodeData,
      position: { x: 0, y: 0 }
    };
  });
  
  // Step 4: Transform relationships (EXCLUDE RATES edges - they're embedded in product data)
  const edges: Edge<EdgeData>[] = data.relationships
    .filter(rel => rel.type !== 'RATES')
    .map(rel => {
      const edgeData: EdgeData = {
        relType: rel.type as any,
        ...rel.properties
      };
      
      // Normalize property names for better compatibility
      if (rel.properties.mandate_status && !edgeData.mandateStatus) {
        edgeData.mandateStatus = rel.properties.mandate_status;
      }
      
      if (rel.properties.level_of_influence && !edgeData.levelOfInfluence) {
        edgeData.levelOfInfluence = rel.properties.level_of_influence;
      }
      
      if (rel.properties.rankgroup && !edgeData.rating) {
        edgeData.rating = rel.properties.rankgroup;
      }
      
      // Add source and target IDs for insights panel
      edgeData.sourceId = rel.start_node_id;
      edgeData.targetId = rel.end_node_id;
      
      return {
        id: rel.id,
        source: rel.start_node_id,
        target: rel.end_node_id,
        type: 'custom',
        data: edgeData
      };
    });
  
  // Final verification and logging
  const productNodes = nodes.filter(n => n.type === 'PRODUCT' || n.type === 'INCUMBENT_PRODUCT');
  const productsWithRatings = productNodes.filter(n => n.data.ratings && n.data.ratings.length > 0);
  
  console.log(`✅ TRANSFORMATION COMPLETE:`, {
    totalProducts: productNodes.length,
    productsWithRatings: productsWithRatings.length,
    ratesProcessed: ratesRelationships.length,
    outputNodes: nodes.length,
    outputEdges: edges.length,
    nodeTypes: Array.from(new Set(nodes.map(n => n.type).filter(Boolean))),
    edgeTypes: Array.from(new Set(edges.map(e => e.data?.relType).filter(Boolean)))
  });
  
  return { nodes, edges };
};

export const useGraphData = () => {
  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [currentRegions, setCurrentRegions] = useState<string[]>(['NAI']);
  const [regionData, setRegionData] = useState<Neo4jResult | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  
  // Graph data state with debug tracking
  const [graphData, setGraphDataInternal] = useState<{ nodes: Node<AppNodeData>[], edges: Edge<EdgeData>[] }>({ 
    nodes: [], 
    edges: [] 
  });
  
  const [updateCounter, setUpdateCounter] = useState(0);
  
  const setGraphData = useCallback((newData: { nodes: Node<AppNodeData>[], edges: Edge<EdgeData>[] }) => {
    console.log('🚀 HOOK: setGraphData called with:', {
      nodes: newData.nodes.length,
      edges: newData.edges.length,
      timestamp: Date.now(),
      updateCounter: updateCounter + 1
    });
    
    // Debug: Check products with ratings
    const products = newData.nodes.filter(n => n.type === 'PRODUCT' || n.type === 'INCUMBENT_PRODUCT');
    const productsWithRatings = products.filter(p => p.data.ratings && p.data.ratings.length > 0);
    console.log(`📊 HOOK DEBUG: ${products.length} products, ${productsWithRatings.length} with ratings`);
    
    const forceUpdate = {
      nodes: newData.nodes,
      edges: newData.edges,
      _timestamp: Date.now(),
      _updateId: Math.random().toString(36)
    };
    
    setGraphDataInternal(forceUpdate as any);
    setUpdateCounter(prev => prev + 1);
  }, [updateCounter]);
  
  // Current filter state
  const [currentFilters, setCurrentFilters] = useState<FilterCriteria>({
    regions: ['NAI'],
    nodeTypes: ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT', 'INCUMBENT_PRODUCT'],
    showInactive: true,
    sales_regions: [],
    channels: [],
    ratings: [],
    influenceLevels: [],
    assetClasses: [],
    consultantIds: [],
    fieldConsultantIds: [],
    clientIds: [],
    productIds: [],
    incumbentProductIds: [],
    pcaIds: [],
    acaIds: [],
    mandateStatuses: []
  });
  
  const apiService = ApiNeo4jService.getInstance();
  
  /**
   * Load standard region data using hierarchical complete workflow
   */
  const loadRegionData = useCallback(async (regions: string[]) => {
    console.log(`🚀 Loading STANDARD region data: ${regions.join(', ')}`);
    setInitialLoading(true);
    setError(null);
    
    try {
      // Test API connection first
      const isConnected = await apiService.testConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to API backend. Make sure the FastAPI server is running on http://localhost:8000');
      }
      
      const response = await fetch(`${apiService.baseUrl}/api/v1/hierarchical/region/${regions[0]}/complete`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const hierarchicalData: HierarchicalResponse = await response.json();
      
      if (!hierarchicalData.success || !hierarchicalData.data) {
        throw new Error(hierarchicalData.error || 'Failed to get hierarchical data');
      }
      
      console.log(`📊 Standard data loaded:`, {
        totalNodes: hierarchicalData.data.graph_data.nodes.length,
        totalRelationships: hierarchicalData.data.graph_data.relationships.length,
        filterOptionsCount: hierarchicalData.data.statistics.total_filter_options
      });
      
      // Transform to expected format
      const data: Neo4jResult = {
        nodes: hierarchicalData.data.graph_data.nodes,
        relationships: hierarchicalData.data.graph_data.relationships,
        metadata: {
          region: hierarchicalData.data.region,
          statistics: hierarchicalData.data.statistics,
          source: 'hierarchical_complete_workflow',
          mode: 'standard'
        }
      };
      
      setRegionData(data);
      setCurrentRegions(regions);
      
      const transformedOptions = transformHierarchicalOptions(hierarchicalData.data.filter_options || {});
      setFilterOptions(transformedOptions);
      
      // Apply default filters
      const defaultFilters: FilterCriteria = {
        regions,
        nodeTypes: ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT'],
        showInactive: true,
        sales_regions: [],
        channels: [],
        ratings: [],
        influenceLevels: [],
        assetClasses: [],
        consultantIds: [],
        fieldConsultantIds: [],
        clientIds: [],
        productIds: [],
        incumbentProductIds: [],
        pcaIds: [],
        acaIds: [],
        mandateStatuses: []
      };
      
      console.log(`🔧 Applying default filters to standard data`);
      
      const filteredData = await apiService.applyFiltersToData(data, defaultFilters);
      const reactFlowData = transformNeo4jToReactFlow(filteredData);
      const layoutedData = layoutWithDagre(reactFlowData.nodes, reactFlowData.edges);
      
      console.log('🎯 Setting standard graph data:', {
        nodes: layoutedData.nodes.length,
        edges: layoutedData.edges.length,
        timestamp: Date.now()
      });
      
      const newGraphData = {
        nodes: layoutedData.nodes.map(n => ({ ...n })),
        edges: layoutedData.edges.map(e => ({ ...e }))
      };
      
      setGraphData(newGraphData);
      setCurrentFilters(defaultFilters);
      
      console.log('✅ Standard region data loaded successfully');
      
    } catch (err) {
      console.error('❌ Error loading standard region data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load region data');
      setGraphData({ nodes: [], edges: [] });
    } finally {
      setInitialLoading(false);
    }
  }, [apiService, setGraphData]);

  /**
   * 🆕 NEW: Load recommendations data for a specific region
   */
  const loadRecommendationsData = useCallback(async (regions: string[]) => {
    console.log(`🎯 Loading RECOMMENDATIONS data for: ${regions.join(', ')}`);
    setInitialLoading(true);
    setError(null);
    
    try {
      // Test API connection first
      const isConnected = await apiService.testConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to API backend. Make sure the FastAPI server is running on http://localhost:8000');
      }
      
      // 🆕 NEW: Call recommendations endpoint
      const response = await fetch(`${apiService.baseUrl}/api/v1/hierarchical/region/${regions[0]}/recommendations`);
      
      if (!response.ok) {
        // If recommendations endpoint doesn't exist yet, fall back to standard with message
        if (response.status === 404) {
          console.warn('⚠️ Recommendations endpoint not yet implemented, falling back to standard data');
          setError('Recommendations endpoint not yet implemented. Using standard data for now.');
          await loadRegionData(regions);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const hierarchicalData: HierarchicalResponse = await response.json();
      
      if (!hierarchicalData.success || !hierarchicalData.data) {
        throw new Error(hierarchicalData.error || 'Failed to get recommendations data');
      }
      
      console.log(`📊 Recommendations data loaded:`, {
        totalNodes: hierarchicalData.data.graph_data.nodes.length,
        totalRelationships: hierarchicalData.data.graph_data.relationships.length,
        incumbentProducts: hierarchicalData.data.graph_data.nodes.filter(n => n.labels?.includes('INCUMBENT_PRODUCT')).length,
        biRecommends: hierarchicalData.data.graph_data.relationships.filter(r => r.type === 'BI_RECOMMENDS').length
      });
      
      // Transform to expected format
      const data: Neo4jResult = {
        nodes: hierarchicalData.data.graph_data.nodes,
        relationships: hierarchicalData.data.graph_data.relationships,
        metadata: {
          region: hierarchicalData.data.region,
          statistics: hierarchicalData.data.statistics,
          source: 'hierarchical_recommendations',
          mode: 'recommendations'
        }
      };
      
      setRegionData(data);
      setCurrentRegions(regions);
      
      const transformedOptions = transformHierarchicalOptions(hierarchicalData.data.filter_options || {});
      setFilterOptions(transformedOptions);
      
      // Apply default filters (including INCUMBENT_PRODUCT)
      const defaultFilters: FilterCriteria = {
        regions,
        nodeTypes: ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT', 'INCUMBENT_PRODUCT'],
        showInactive: true,
        sales_regions: [],
        channels: [],
        ratings: [],
        influenceLevels: [],
        assetClasses: [],
        consultantIds: [],
        fieldConsultantIds: [],
        clientIds: [],
        productIds: [],
        incumbentProductIds: [],
        pcaIds: [],
        acaIds: [],
        mandateStatuses: []
      };
      
      console.log(`🔧 Applying default filters to recommendations data`);
      
      const filteredData = await apiService.applyFiltersToData(data, defaultFilters);
      const reactFlowData = transformNeo4jToReactFlow(filteredData);
      const layoutedData = layoutWithDagre(reactFlowData.nodes, reactFlowData.edges);
      
      console.log('🎯 Setting recommendations graph data:', {
        nodes: layoutedData.nodes.length,
        edges: layoutedData.edges.length,
        incumbentProducts: layoutedData.nodes.filter(n => n.type === 'INCUMBENT_PRODUCT').length,
        biRecommends: layoutedData.edges.filter(e => e.data?.relType === 'BI_RECOMMENDS').length,
        timestamp: Date.now()
      });
      
      const newGraphData = {
        nodes: layoutedData.nodes.map(n => ({ ...n })),
        edges: layoutedData.edges.map(e => ({ ...e }))
      };
      
      setGraphData(newGraphData);
      setCurrentFilters(defaultFilters);
      
      console.log('✅ Recommendations data loaded successfully');
      
    } catch (err) {
      console.error('❌ Error loading recommendations data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations data');
      setGraphData({ nodes: [], edges: [] });
    } finally {
      setInitialLoading(false);
    }
  }, [apiService, setGraphData, loadRegionData]);

  /**
   * 🆕 NEW: Switch between standard and recommendations mode
   */
  const switchMode = useCallback(async (mode: 'standard' | 'recommendations', regions: string[] = currentRegions) => {
    console.log(`🔄 Switching to ${mode} mode for regions: ${regions.join(', ')}`);
    
    if (mode === 'recommendations') {
      await loadRecommendationsData(regions);
    } else {
      await loadRegionData(regions);
    }
  }, [currentRegions, loadRecommendationsData, loadRegionData]);
  
  /**
   * Handle region changes using hierarchical endpoint
   */
  const changeRegions = useCallback(async (newRegions: string[]) => {
    if (JSON.stringify(newRegions.sort()) === JSON.stringify(currentRegions.sort())) {
      return; // No change
    }
    
    console.log(`🔄 Changing regions: ${currentRegions} → ${newRegions}`);
    
    // Clear existing graph data immediately
    setGraphData({ nodes: [], edges: [] });
    setInitialLoading(true);
    setError(null);
    
    try {
      // Determine current mode and load appropriate data
      const currentMode = regionData?.metadata?.mode || 'standard';
      
      if (currentMode === 'recommendations') {
        await loadRecommendationsData(newRegions);
      } else {
        await loadRegionData(newRegions);
      }
      
      console.log('✅ Region change completed successfully');
      
    } catch (err) {
      console.error('❌ Error changing regions:', err);
      setError(err instanceof Error ? err.message : 'Failed to change regions');
      setGraphData({ nodes: [], edges: [] });
    }
  }, [currentRegions, regionData?.metadata?.mode, loadRecommendationsData, loadRegionData, setGraphData]);
  
  /**
   * Apply filters to current region data
   */
  const applyFilters = useCallback(async (filters: Partial<FilterCriteria>) => {
    console.log('🔧 applyFilters() called with filters:', filters);
    
    if (initialLoading || filterLoading) {
      console.warn('⚠️ Cannot apply filters while loading');
      return;
    }
    
    if (!regionData) {
      console.warn('⚠️ No region data available to filter');
      setError('No region data available. Please wait for data to load.');
      return;
    }
    
    setFilterLoading(true);
    setError(null);
    
    try {
      const newFilters: FilterCriteria = {
        regions: currentRegions,
        nodeTypes: ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT', 'INCUMBENT_PRODUCT'],
        showInactive: true,
        sales_regions: [],
        channels: [],
        ratings: [],
        influenceLevels: [],
        assetClasses: [],
        consultantIds: [],
        fieldConsultantIds: [],
        clientIds: [],
        productIds: [],
        incumbentProductIds: [],
        pcaIds: [],
        acaIds: [],
        mandateStatuses: [],
        ...filters
      };
      
      console.log('📋 Final filters being applied:', newFilters);
      
      const filteredData = await apiService.applyFiltersToData(regionData, newFilters);
      const reactFlowData = transformNeo4jToReactFlow(filteredData);
      const layoutedData = layoutWithDagre(reactFlowData.nodes, reactFlowData.edges);
      
      setCurrentFilters(newFilters);
      
      console.log('🎯 Setting graph data from applyFilters:', {
        nodes: layoutedData.nodes.length,
        edges: layoutedData.edges.length,
        timestamp: Date.now()
      });
      
      const newGraphData = {
        nodes: layoutedData.nodes.map(n => ({ ...n })),
        edges: layoutedData.edges.map(e => ({ ...e }))
      };
      
      setGraphData(newGraphData);
      
      console.log('✅ Filters applied successfully');
      
    } catch (err) {
      console.error('❌ Error applying filters:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply filters');
    } finally {
      setFilterLoading(false);
    }
  }, [regionData, currentRegions, initialLoading, filterLoading, apiService, setGraphData]);
  
  /**
   * Reset filters to defaults
   */
  const resetFilters = useCallback(() => {
    const currentMode = regionData?.metadata?.mode || 'standard';
    
    // 🎯 FIXED: Ensure PRODUCT is always included in both modes
    const getDefaultNodeTypes = () => {
      if (currentMode === 'recommendations') {
        return ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT', 'INCUMBENT_PRODUCT'];
      } else {
        return ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT'];
      }
    };
    
    const defaultFilters: Partial<FilterCriteria> = {
      nodeTypes: getDefaultNodeTypes(), // 🎯 FIXED: Use function instead of inline logic
      showInactive: true,
      sales_regions: [],
      channels: [],
      ratings: [],
      influenceLevels: [],
      assetClasses: [],
      consultantIds: [],
      fieldConsultantIds: [],
      clientIds: [],
      productIds: [],
      incumbentProductIds: [],
      pcaIds: [],
      acaIds: [],
      mandateStatuses: []
    };
    
    console.log(`🔄 Resetting filters for ${currentMode} mode with nodeTypes:`, defaultFilters.nodeTypes);
    
    applyFilters(defaultFilters);
  }, [applyFilters, regionData?.metadata?.mode]);
  
  /**
   * Get available regions
   */
  const getAvailableRegions = useCallback(() => {
    return ['NAI', 'EMEA', 'APAC'];
  }, []);
  
  // Initial load on mount
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (!hasInitialized) {
      console.log('🚀 Initial mount - loading NAI data using standard workflow');
      setHasInitialized(true);
      loadRegionData(['NAI']);
    }
  }, [hasInitialized, loadRegionData]);
  
  return {
    // Data
    graphData,
    filterOptions,
    currentFilters,
    currentRegions,
    updateCounter,
    
    // Loading states
    initialLoading,
    filterLoading,
    error,
    
    // Actions
    changeRegions,
    applyFilters,
    resetFilters,
    getAvailableRegions,
    
    // 🆕 NEW: Recommendations mode actions
    loadRecommendationsData,
    switchMode,
    
    // Computed properties
    hasData: graphData.nodes.length > 0,
    nodeCount: graphData.nodes.length,
    edgeCount: graphData.edges.length,
    
    // 🆕 NEW: Mode detection
    isRecommendationsMode: regionData?.metadata?.mode === 'recommendations',
    dataSource: regionData?.metadata?.source || 'unknown',
    currentMode: regionData?.metadata?.mode || 'standard'
  };
};