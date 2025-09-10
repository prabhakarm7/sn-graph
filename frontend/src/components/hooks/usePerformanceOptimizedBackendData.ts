// hooks/usePerformanceOptimizedBackendData.ts - FIXED with node type synchronization
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

interface PerformanceState {
  mode: 'filters_only' | 'graph_ready' | 'too_many_nodes';
  message?: string;
  nodeCount?: number;
  suggestions?: any[];
}

interface OptimizedGraphData {
  nodes: Node<AppNodeData>[];
  edges: Edge<EdgeData>[];
  canRender: boolean;
  performance: PerformanceState;
}

export const usePerformanceOptimizedBackendData = () => {
  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states - optimized for performance
  const [currentRegions, setCurrentRegions] = useState<string[]>(['NAI']);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [backendResponse, setBackendResponse] = useState<any>(null);
  
  // Graph data state with performance tracking
  const [graphData, setGraphData] = useState<OptimizedGraphData>({
    nodes: [],
    edges: [],
    canRender: false,
    performance: {
      mode: 'filters_only',
      message: 'Select region to load filter options'
    }
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
  
  // HELPER: Synchronize filters with backend response
  const synchronizeFiltersWithBackend = useCallback((
    requestedFilters: FilterCriteria,
    backendResponse: any
  ): FilterCriteria => {
    const backendAppliedFilters = backendResponse?.metadata?.filters_applied || {};
    
    console.log('🔄 Synchronizing filters with backend:', {
      requested: Object.keys(requestedFilters).filter(k => requestedFilters[k as keyof FilterCriteria]),
      backendApplied: Object.keys(backendAppliedFilters)
    });
    
    // Start with requested filters as base
    const synchronizedFilters: FilterCriteria = {
      ...requestedFilters,
      regions: currentRegions // Always keep current regions
    };
    
    // Override with backend-applied filters where they exist
    Object.keys(backendAppliedFilters).forEach(key => {
      const backendValue = backendAppliedFilters[key];
      if (backendValue !== null && backendValue !== undefined) {
        // Convert backend filter keys to frontend filter keys if needed
        const frontendKey = mapBackendFilterKeyToFrontend(key);
        if (frontendKey && frontendKey in synchronizedFilters) {
          (synchronizedFilters as any)[frontendKey] = backendValue;
          
          // Log discrepancies
          const requestedValue = (requestedFilters as any)[frontendKey];
          if (JSON.stringify(requestedValue) !== JSON.stringify(backendValue)) {
            console.log(`🔁 Filter sync: ${frontendKey} changed from`, requestedValue, 'to', backendValue);
          }
        }
      }
    });
    
    return synchronizedFilters;
  }, [currentRegions]);
  
  // HELPER: Map backend filter keys to frontend keys
  const mapBackendFilterKeyToFrontend = (backendKey: string): string | null => {
    const keyMap: Record<string, string> = {
      'consultantIds': 'consultantIds',
      'fieldConsultantIds': 'fieldConsultantIds', 
      'clientIds': 'clientIds',
      'productIds': 'productIds',
      'incumbentProductIds': 'incumbentProductIds',
      'clientAdvisorIds': 'clientAdvisorIds',
      'consultantAdvisorIds': 'consultantAdvisorIds',
      'channels': 'channels',
      'assetClasses': 'assetClasses',
      'mandateStatuses': 'mandateStatuses',
      'sales_regions': 'sales_regions',
      'ratings': 'ratings',
      'influenceLevels': 'influenceLevels'
    };
    
    return keyMap[backendKey] || null;
  };
  
  /**
   * STEP 1: Load region filter options only (no graph data)
   */
  const loadRegionFiltersOnly = useCallback(async (
    regions: string[], 
    recommendationsMode: boolean = false
  ) => {
    console.log(`Performance Optimization: Loading filters only for ${regions[0]}`);
    setInitialLoading(true);
    setError(null);
    
    try {
      const isConnected = await apiService.testConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to backend API');
      }
      
      // Load filter options only - no graph data
      const filterOptionsResponse = await apiService.getFilterOptions(regions[0], recommendationsMode);
      const transformedOptions = transformBackendFilterOptions(filterOptionsResponse);
      setFilterOptions(transformedOptions);
      
      setCurrentRegions(regions);
      
      // Set performance state to filters_only
      setGraphData({
        nodes: [],
        edges: [],
        canRender: false,
        performance: {
          mode: 'filters_only',
          message: `Filters loaded for ${regions[0]}. Apply filters to load graph data (region may have >50 nodes).`,
          nodeCount: 0
        }
      });
      
      // FIXED: Update filters state - RESET to defaults for new region WITH PROPER NODE TYPES
      const defaultFilters: FilterCriteria = {
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
        mandateStatuses: []
      };
      setCurrentFilters(defaultFilters);
      
      console.log('Performance Optimization: Filters loaded with node types:', defaultFilters.nodeTypes);
      
    } catch (err) {
      console.error('Performance Optimization: Filter loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load filter options');
      setGraphData({
        nodes: [],
        edges: [],
        canRender: false,
        performance: {
          mode: 'filters_only',
          message: 'Error loading filters'
        }
      });
    } finally {
      setInitialLoading(false);
    }
  }, [apiService]);
  
  /**
   * STEP 2: Apply filters and load graph data with performance check
   * UPDATED: Now synchronizes with backend-applied filters AND properly handles filter updates
   */
  const applyFilters = useCallback(async (filters: Partial<FilterCriteria>) => {
    console.log('Performance Optimization: Applying filters with performance check');
    
    if (initialLoading || filterLoading) {
      console.warn('Cannot apply filters while loading');
      return;
    }
    
    setFilterLoading(true);
    setError(null);
    
    try {
      const requestedFilters: FilterCriteria = {
        ...currentFilters,
        ...filters,
        regions: currentRegions
      };
      
      const recommendationsMode = requestedFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') || false;
      
      console.log('🚀 Requesting filters:', requestedFilters);
      
      // IMPORTANT: Update current filters immediately to ensure UI reflects changes
      setCurrentFilters(requestedFilters);
      
      // Use existing API method - backend processes and returns data
      const result = await apiService.getRegionData(currentRegions[0], requestedFilters, recommendationsMode);
      
      if (!result.success) {
        throw new Error(result.error || 'Filter application failed');
      }
      
      setBackendResponse(result);

      if (result.filter_options) {
        const transformedOptions = transformBackendFilterOptions(result.filter_options);
        setFilterOptions(transformedOptions);
      }
      
      // 🔄 SYNCHRONIZE WITH BACKEND APPLIED FILTERS (final sync)
      const synchronizedFilters = synchronizeFiltersWithBackend(requestedFilters, result);
      setCurrentFilters(synchronizedFilters);
      
      console.log('✅ Filters synchronized:', {
        requested: requestedFilters,
        synchronized: synchronizedFilters,
        backendApplied: result.metadata?.filters_applied
      });
      
      // Performance check based on existing API response structure
      if (result.render_mode === 'summary') {
        // Check if it's a "too many nodes" case vs "no filters applied"
        if (result.data.total_nodes > 100) {
          // Too many nodes case
          setGraphData({
            nodes: [],
            edges: [],
            canRender: false,
            performance: {
              mode: 'too_many_nodes',
              message: `Dataset too large (${result.data.total_nodes} nodes). Please refine your filters.`,
              nodeCount: result.data.total_nodes,
              suggestions: result.data.suggestions || []
            }
          });
          console.log(`Performance Optimization: Too many nodes (${result.data.total_nodes}), showing suggestions`);
        } else {
          // No data case - back to filters only
          setGraphData({
            nodes: [],
            edges: [],
            canRender: false,
            performance: {
              mode: 'filters_only',
              message: result.data.message || 'No data found with current filters. Try adjusting your selection.',
              nodeCount: result.data.total_nodes
            }
          });
          console.log('Performance Optimization: No data with current filters');
        }
      } else {
        // Good to render - check node count for performance
        const transformedData = transformWithEnhancedLayout(result);
        if (transformedData.nodes.length > 100) {
          // Even if backend returned data, too many for optimal performance
          setGraphData({
            nodes: [],
            edges: [],
            canRender: false,
            performance: {
              mode: 'too_many_nodes',
              message: `Graph has ${transformedData.nodes.length} nodes. Consider refining filters for better performance.`,
              nodeCount: transformedData.nodes.length,
              suggestions: result.data.suggestions || []
            }
          });
          console.log(`Performance Optimization: Frontend performance check failed (${transformedData.nodes.length} nodes)`);
        } else {
          // Good to render
          setGraphData({
            ...transformedData,
            performance: {
              mode: 'graph_ready',
              message: `Graph loaded successfully (${transformedData.nodes.length} nodes)`,
              nodeCount: transformedData.nodes.length
            }
          });
          console.log(`Performance Optimization: Graph ready (${transformedData.nodes.length} nodes)`);
        }
      }
      
    } catch (err) {
      console.error('Performance Optimization: Filter application error:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply filters');
      setGraphData({
        nodes: [],
        edges: [],
        canRender: false,
        performance: {
          mode: 'filters_only',
          message: 'Error applying filters'
        }
      });
    } finally {
      setFilterLoading(false);
    }
  }, [currentRegions, currentFilters, initialLoading, filterLoading, apiService, synchronizeFiltersWithBackend]);
  
  /**
   * STEP 3: Region change - back to filters only
   * UPDATED: Properly resets to region defaults
   */
  const changeRegions = useCallback(async (newRegions: string[]) => {
    if (JSON.stringify(newRegions.sort()) === JSON.stringify(currentRegions.sort())) {
      return;
    }
    
    console.log(`Performance Optimization: Region change ${currentRegions} → ${newRegions}`);
    
    // Clear graph data, go back to filters-only mode
    setGraphData({
      nodes: [],
      edges: [],
      canRender: false,
      performance: {
        mode: 'filters_only',
        message: 'Loading filters for new region...'
      }
    });
    
    const recommendationsMode = currentFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') || false;
    await loadRegionFiltersOnly(newRegions, recommendationsMode);
  }, [currentRegions, currentFilters.nodeTypes, loadRegionFiltersOnly]);
  
  /**
   * FIXED: Mode switching with proper node type handling
   */
  const switchMode = useCallback(async (mode: 'standard' | 'recommendations') => {
    console.log(`Performance Optimization: Mode switch to ${mode}`);
    
    const recommendationsMode = mode === 'recommendations';
    
    // FIXED: Update node types properly based on mode
    const updatedFilters: FilterCriteria = {
      ...currentFilters,
      nodeTypes: recommendationsMode 
        ? ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT', 'INCUMBENT_PRODUCT']
        : ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT']
    };
    
    // Update the current filters first
    setCurrentFilters(updatedFilters);
    
    // If we have graph data, try to switch with current filters
    if (graphData.performance.mode === 'graph_ready' && graphData.canRender) {
      await applyFilters(updatedFilters);
    } else {
      // Otherwise go back to filters-only mode with proper node types
      await loadRegionFiltersOnly(currentRegions, recommendationsMode);
    }
  }, [currentRegions, currentFilters, graphData.performance.mode, graphData.canRender, loadRegionFiltersOnly, applyFilters]);
  
  /**
   * STEP 4: Reset filters - back to filters only
   * UPDATED: Properly resets and gets fresh region data
   */
  const resetFilters = useCallback(async () => {
    console.log('Performance Optimization: Reset filters, loading fresh region data');
    
    const recommendationsMode = currentFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') || false;
    
    // Clear graph, set back to filters-only, and reload region data
    setGraphData({
      nodes: [],
      edges: [],
      canRender: false,
      performance: {
        mode: 'filters_only',
        message: `Resetting filters for ${currentRegions[0]}...`,
        nodeCount: 0
      }
    });
    
    // Reload region data to get fresh filter options and reset to defaults
    await loadRegionFiltersOnly(currentRegions, recommendationsMode);
  }, [currentFilters.nodeTypes, currentRegions, loadRegionFiltersOnly]);
  
  /**
   * Get available regions
   */
  const getAvailableRegions = useCallback(() => {
    return ['NAI', 'EMEA', 'APAC'];
  }, []);
  
  // Initial load - STEP 1: Filters only
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (!hasInitialized) {
      console.log('Performance Optimization: Initial load - filters only');
      setHasInitialized(true);
      loadRegionFiltersOnly(['NAI']);
    }
  }, [hasInitialized, loadRegionFiltersOnly]);
  
  return {
    // Optimized data with performance state
    graphData,
    filterOptions,
    currentFilters,
    currentRegions,
    updateCounter: 0, // For compatibility
    
    // Loading states
    initialLoading,
    filterLoading,
    error,
    
    // Performance-optimized actions
    changeRegions,
    applyFilters,
    resetFilters,
    getAvailableRegions,
    
    // Mode switching
    loadRecommendationsData: (regions: string[]) => loadRegionFiltersOnly(regions, true),
    switchMode,
    
    // Computed properties
    hasData: graphData.canRender && graphData.nodes.length > 0,
    nodeCount: graphData.performance.nodeCount || 0,
    edgeCount: graphData.edges.length,
    
    // Performance state
    performanceState: graphData.performance,
    
    // Mode detection
    isRecommendationsMode: currentFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') || false,
    dataSource: 'performance_optimized_backend',
    currentMode: currentFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') ? 'recommendations' : 'standard'
  };
};

/**
 * Transform backend response with enhanced layout
 */
function transformWithEnhancedLayout(backendResponse: any): OptimizedGraphData {
  if (backendResponse.render_mode === 'error' || !backendResponse.data.nodes) {
    return {
      nodes: [],
      edges: [],
      canRender: false,
      performance: {
        mode: 'filters_only',
        message: 'Error loading graph data'
      }
    };
  }

  // Backend provides data, frontend applies enhanced Dagre layout
  console.log('Performance Optimization: Applying enhanced Dagre layout to backend data:', {
    inputNodes: backendResponse.data.nodes?.length || 0,
    inputEdges: backendResponse.data.relationships?.length || 0
  });

  const rawNodes = backendResponse.data.nodes || [];
  const rawEdges = backendResponse.data.relationships || [];
  
  // Apply enhanced Dagre layout
  const layoutedData = enhancedLayoutWithDagre(rawNodes, rawEdges);
  
  console.log('Performance Optimization: Enhanced layout applied:', {
    outputNodes: layoutedData.nodes.length,
    outputEdges: layoutedData.edges.length
  });

  return {
    nodes: layoutedData.nodes,
    edges: layoutedData.edges,
    canRender: true,
    performance: {
      mode: 'graph_ready',
      nodeCount: layoutedData.nodes.length
    }
  };
}