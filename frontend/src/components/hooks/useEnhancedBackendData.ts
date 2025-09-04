// hooks/useEnhancedBackendData.ts - Fixed type issue with filterOptions
import { useState, useEffect, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import SimplifiedApiService from '../services/SimplifiedApiService';
import { FilterCriteria, FilterOptions } from '../types/FitlerTypes';
import { AppNodeData, EdgeData } from '../types/GraphTypes';
import { BackendFilterOptions, transformBackendFilterOptions } from '../types/BackendTypes';

import dagre from 'dagre';

// Enhanced layout configuration
const NODE_W = 240;
const NODE_H = 120;

const enhancedLayoutWithDagre = (nodes: Node[], edges: Edge[]) => {
  if (nodes.length === 0) return { nodes: [], edges };
  
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  
  // Enhanced layout configuration based on node types and relationships
  const hasIncumbentProducts = nodes.some(n => n.type === 'INCUMBENT_PRODUCT');
  const totalNodes = nodes.length;
  
  // Dynamic layout based on graph complexity
  if (hasIncumbentProducts) {
    // Recommendations mode - more vertical space for AI connections
    g.setGraph({ 
      rankdir: 'TB', 
      nodesep: 150, 
      ranksep: 200, 
      marginx: 50, 
      marginy: 50 
    });
  } else if (totalNodes > 20) {
    // Large standard graphs - tighter layout
    g.setGraph({ 
      rankdir: 'TB', 
      nodesep: 100, 
      ranksep: 120, 
      marginx: 30, 
      marginy: 30 
    });
  } else {
    // Small graphs - spacious layout
    g.setGraph({ 
      rankdir: 'TB', 
      nodesep: 180, 
      ranksep: 160, 
      marginx: 60, 
      marginy: 60 
    });
  }

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  
  dagre.layout(g);

  const layoutedNodes = nodes.map((n) => {
    const pos = g.node(n.id);
    return { 
      ...n, 
      position: { 
        x: pos.x - NODE_W / 2, 
        y: pos.y - NODE_H / 2 
      } 
    };
  });

  return { nodes: layoutedNodes, edges };
};

interface EnhancedGraphData {
  nodes: Node<AppNodeData>[];
  edges: Edge<EdgeData>[];
  canRender: boolean;
  summary?: {
    totalNodes: number;
    message: string;
    suggestions: any[];
  };
}

export const useEnhancedBackendData = () => {
  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states - backend processed but frontend enhanced
  const [currentRegions, setCurrentRegions] = useState<string[]>(['NAI']);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null); // FIXED TYPE
  const [backendResponse, setBackendResponse] = useState<any>(null);
  
  // Graph data state with enhanced layout
  const [graphData, setGraphData] = useState<EnhancedGraphData>({
    nodes: [],
    edges: [],
    canRender: false
  });
  
  // Current filter state for UI display and filtering
  const [currentFilters, setCurrentFilters] = useState<FilterCriteria>({
    regions: ['NAI'],
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
    clientAdvisorIds: [],
    consultantAdvisorIds: [],
    legacyPcaIds: [],
    mandateStatuses: []
  });
  
  const apiService = SimplifiedApiService.getInstance();
  
  /**
   * Enhanced data loading with backend processing + frontend layout
   */
  const loadRegionData = useCallback(async (
    regions: string[], 
    filters: FilterCriteria = {},
    recommendationsMode: boolean = false
  ) => {
    console.log(`Loading enhanced backend data for ${regions[0]}`);
    setInitialLoading(true);
    setError(null);
    
    try {
      const isConnected = await apiService.testConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to backend API');
      }
      
      // Backend does complex processing (rating collection, filtering, etc)
      const result = await apiService.getRegionData(regions[0], filters, recommendationsMode);
      
      console.log('Enhanced backend response:', {
        success: result.success,
        renderMode: result.render_mode,
        totalNodes: result.data?.total_nodes,
        backendProcessed: result.metadata?.server_side_processing
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Backend processing failed');
      }
      
      setBackendResponse(result);
      setCurrentRegions(regions);
      
      // Get enhanced filter options and TRANSFORM to correct type
      if (result.filter_options) {
        // Transform backend filter options to match frontend format
        const transformedOptions = transformBackendFilterOptions(result.filter_options);
        setFilterOptions(transformedOptions);
      } else {
        const options = await apiService.getFilterOptions(regions[0], recommendationsMode);
        const transformedOptions = transformBackendFilterOptions(options);
        setFilterOptions(transformedOptions);
      }
      
      // Enhanced data transformation with frontend layout
      const transformedData = transformWithEnhancedLayout(result);
      setGraphData(transformedData);
      
      // Update filters state to match original hook behavior
      const updatedFilters: FilterCriteria = {
        regions,
        nodeTypes: recommendationsMode 
          ? ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT', 'INCUMBENT_PRODUCT']
          : ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT'],
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
        clientAdvisorIds: [],
        consultantAdvisorIds: [],
        legacyPcaIds: [],
        mandateStatuses: [],
        ...filters
      };
      setCurrentFilters(updatedFilters);
      
      console.log('Enhanced data loading complete');
      
    } catch (err) {
      console.error('Enhanced data loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setGraphData({ nodes: [], edges: [], canRender: false });
    } finally {
      setInitialLoading(false);
    }
  }, [apiService]);
  
  /**
   * Enhanced filter application
   */
  const applyFilters = useCallback(async (filters: Partial<FilterCriteria>) => {
    console.log('Applying enhanced filters:', Object.keys(filters));
    
    if (initialLoading || filterLoading) {
      console.warn('Cannot apply filters while loading');
      return;
    }
    
    setFilterLoading(true);
    setError(null);
    
    try {
      const newFilters: FilterCriteria = {
        ...currentFilters,
        ...filters,
        regions: currentRegions
      };
      
      const recommendationsMode = newFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') || false;
      
      // Backend does heavy processing, frontend adds layout enhancement
      const result = await apiService.getRegionData(currentRegions[0], newFilters, recommendationsMode);
      
      if (!result.success) {
        throw new Error(result.error || 'Filter application failed');
      }
      
      setBackendResponse(result);
      setCurrentFilters(newFilters);
      
      // Enhanced transformation with layout
      const transformedData = transformWithEnhancedLayout(result);
      setGraphData(transformedData);
      
      console.log('Enhanced filters applied successfully');
      
    } catch (err) {
      console.error('Enhanced filter application error:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply filters');
    } finally {
      setFilterLoading(false);
    }
  }, [currentRegions, currentFilters, initialLoading, filterLoading, apiService]);
  
  /**
   * Enhanced region change with backend processing
   */
  const changeRegions = useCallback(async (newRegions: string[]) => {
    if (JSON.stringify(newRegions.sort()) === JSON.stringify(currentRegions.sort())) {
      return;
    }
    
    console.log(`Enhanced region change: ${currentRegions} → ${newRegions}`);
    
    setGraphData({ nodes: [], edges: [], canRender: false });
    
    const recommendationsMode = currentFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') || false;
    await loadRegionData(newRegions, {}, recommendationsMode);
  }, [currentRegions, currentFilters.nodeTypes, loadRegionData]);
  
  /**
   * Mode switching with enhanced processing
   */
  const switchMode = useCallback(async (mode: 'standard' | 'recommendations') => {
    console.log(`Enhanced mode switch to ${mode}`);
    
    const recommendationsMode = mode === 'recommendations';
    await loadRegionData(currentRegions, {}, recommendationsMode);
  }, [currentRegions, loadRegionData]);
  
  /**
   * Reset filters maintaining original behavior
   */
  const resetFilters = useCallback(() => {
    const recommendationsMode = currentFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') || false;
    
    const defaultFilters: Partial<FilterCriteria> = {
      nodeTypes: recommendationsMode 
        ? ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT', 'INCUMBENT_PRODUCT']
        : ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT'],
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
      clientAdvisorIds: [],
      consultantAdvisorIds: [],
      legacyPcaIds: [],
      mandateStatuses: []
    };
    
    applyFilters(defaultFilters);
  }, [applyFilters, currentFilters.nodeTypes]);
  
  /**
   * Get available regions
   */
  const getAvailableRegions = useCallback(() => {
    return ['NAI', 'EMEA', 'APAC'];
  }, []);
  
  // Initial load
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (!hasInitialized) {
      console.log('Enhanced initial load starting');
      setHasInitialized(true);
      loadRegionData(['NAI']);
    }
  }, [hasInitialized, loadRegionData]);
  
  return {
    // Enhanced data with backend processing + frontend layout
    graphData,
    filterOptions, // Now correctly typed as FilterOptions | null
    currentFilters,
    currentRegions,
    updateCounter: 0, // For compatibility
    
    // Loading states
    initialLoading,
    filterLoading,
    error,
    
    // Enhanced actions
    changeRegions,
    applyFilters,
    resetFilters,
    getAvailableRegions,
    
    // Mode switching
    loadRecommendationsData: (regions: string[]) => loadRegionData(regions, {}, true),
    switchMode,
    
    // Computed properties matching original hook
    hasData: graphData.nodes.length > 0,
    nodeCount: graphData.nodes.length,
    edgeCount: graphData.edges.length,
    
    // Mode detection
    isRecommendationsMode: currentFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') || false,
    dataSource: 'enhanced_backend_processing',
    currentMode: currentFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') ? 'recommendations' : 'standard'
  };
};

/**
 * Transform backend response with enhanced layout
 */
function transformWithEnhancedLayout(backendResponse: any): EnhancedGraphData {
  if (backendResponse.render_mode === 'summary') {
    return {
      nodes: [],
      edges: [],
      canRender: false,
      summary: {
        totalNodes: backendResponse.data.total_nodes,
        message: backendResponse.data.message || 'Dataset too large',
        suggestions: backendResponse.data.suggestions || []
      }
    };
  }

  if (backendResponse.render_mode === 'error' || !backendResponse.data.nodes) {
    return {
      nodes: [],
      edges: [],
      canRender: false
    };
  }

  // Backend provides data, frontend applies enhanced Dagre layout
  console.log('Applying enhanced Dagre layout to backend data:', {
    inputNodes: backendResponse.data.nodes?.length || 0,
    inputEdges: backendResponse.data.relationships?.length || 0
  });

  const rawNodes = backendResponse.data.nodes || [];
  const rawEdges = backendResponse.data.relationships || [];
  
  // Apply enhanced Dagre layout
  const layoutedData = enhancedLayoutWithDagre(rawNodes, rawEdges);
  
  console.log('Enhanced layout applied:', {
    outputNodes: layoutedData.nodes.length,
    outputEdges: layoutedData.edges.length
  });

  return {
    nodes: layoutedData.nodes,
    edges: layoutedData.edges,
    canRender: true
  };
}