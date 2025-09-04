// hooks/useSimplifiedGraphData.ts - Minimal frontend logic, backend does everything
import { useState, useEffect, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import SimplifiedApiService from '../services/SimplifiedApiService';
import { FilterCriteria } from '../types/FitlerTypes';
import { AppNodeData, EdgeData } from '../types/GraphTypes';

interface SimplifiedGraphData {
  nodes: Node<AppNodeData>[];
  edges: Edge<EdgeData>[];
  canRender: boolean;
  summary?: {
    totalNodes: number;
    message: string;
    suggestions: any[];
  };
}

export const useSimplifiedGraphData = () => {
  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states - minimal, backend does the work
  const [currentRegions, setCurrentRegions] = useState<string[]>(['NAI']);
  const [filterOptions, setFilterOptions] = useState<Record<string, any> | null>(null);
  const [backendResponse, setBackendResponse] = useState<any>(null);
  
  // Graph data state - just what we need for ReactFlow
  const [graphData, setGraphData] = useState<SimplifiedGraphData>({
    nodes: [],
    edges: [],
    canRender: false
  });
  
  // Current filter state - just for UI display
  const [currentFilters, setCurrentFilters] = useState<FilterCriteria>({
    regions: ['NAI'],
    nodeTypes: ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT'],
    showInactive: true
  });
  
  const apiService = SimplifiedApiService.getInstance();
  
  /**
   * Load region data - backend does all processing
   */
  const loadRegionData = useCallback(async (
    regions: string[], 
    filters: FilterCriteria = {},
    recommendationsMode: boolean = false
  ) => {
    console.log(`Loading backend-processed data for ${regions[0]}`);
    setInitialLoading(true);
    setError(null);
    
    try {
      // Test connection
      const isConnected = await apiService.testConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to backend API');
      }
      
      // Get data from backend - all processing done server-side
      const result = await apiService.getRegionData(regions[0], filters, recommendationsMode);
      
      console.log('Backend response received:', {
        success: result.success,
        renderMode: result.render_mode,
        totalNodes: result.data?.total_nodes,
        serverProcessed: result.metadata?.server_side_processing
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Backend processing failed');
      }
      
      setBackendResponse(result);
      setCurrentRegions(regions);
      
      // Get filter options separately for fast dropdown population
      if (result.filter_options) {
        setFilterOptions(result.filter_options);
      } else {
        const options = await apiService.getFilterOptions(regions[0], recommendationsMode);
        setFilterOptions(options);
      }
      
      // Transform to ReactFlow format (minimal processing needed)
      const transformedData = apiService.transformToReactFlow(result);
      setGraphData(transformedData);
      
      // Update filters state
      const updatedFilters = {
        ...filters,
        regions,
        nodeTypes: recommendationsMode 
          ? ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT', 'INCUMBENT_PRODUCT']
          : ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT']
      };
      setCurrentFilters(updatedFilters);
      
      console.log('Data loading complete - backend processed');
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setGraphData({ nodes: [], edges: [], canRender: false });
    } finally {
      setInitialLoading(false);
    }
  }, [apiService]);
  
  /**
   * Apply filters - backend does all processing
   */
  const applyFilters = useCallback(async (filters: Partial<FilterCriteria>) => {
    console.log('Applying filters (backend processed):', Object.keys(filters));
    
    if (initialLoading || filterLoading) {
      console.warn('Cannot apply filters while loading');
      return;
    }
    
    setFilterLoading(true);
    setError(null);
    
    try {
      const newFilters: FilterCriteria = {
        regions: currentRegions,
        nodeTypes: currentFilters.nodeTypes,
        showInactive: true,
        ...filters
      };
      
      // Determine recommendations mode
      const recommendationsMode = newFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') || false;
      
      // Backend does all filtering work
      const result = await apiService.getRegionData(currentRegions[0], newFilters, recommendationsMode);
      
      console.log('Filter application result:', {
        success: result.success,
        renderMode: result.render_mode,
        totalNodes: result.data?.total_nodes
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Filter application failed');
      }
      
      setBackendResponse(result);
      setCurrentFilters(newFilters);
      
      // Update graph data with backend-processed results
      const transformedData = apiService.transformToReactFlow(result);
      setGraphData(transformedData);
      
      console.log('Filters applied - backend processed');
      
    } catch (err) {
      console.error('Error applying filters:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply filters');
    } finally {
      setFilterLoading(false);
    }
  }, [currentRegions, currentFilters, initialLoading, filterLoading, apiService]);
  
  /**
   * Change regions - backend handles all processing
   */
  const changeRegions = useCallback(async (newRegions: string[]) => {
    if (JSON.stringify(newRegions.sort()) === JSON.stringify(currentRegions.sort())) {
      return; // No change
    }
    
    console.log(`Changing regions: ${currentRegions} -> ${newRegions}`);
    
    // Clear current data
    setGraphData({ nodes: [], edges: [], canRender: false });
    
    // Determine current mode
    const recommendationsMode = currentFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') || false;
    
    // Load new region data
    await loadRegionData(newRegions, {}, recommendationsMode);
  }, [currentRegions, currentFilters.nodeTypes, loadRegionData]);
  
  /**
   * Switch between standard and recommendations mode
   */
  const switchMode = useCallback(async (mode: 'standard' | 'recommendations') => {
    console.log(`Switching to ${mode} mode`);
    
    const recommendationsMode = mode === 'recommendations';
    await loadRegionData(currentRegions, {}, recommendationsMode);
  }, [currentRegions, loadRegionData]);
  
  /**
   * Apply filter suggestion from performance component
   */
  const applyFilterSuggestion = useCallback(async (suggestion: any) => {
    console.log('Applying filter suggestion (backend processed):', suggestion);
    
    setFilterLoading(true);
    
    try {
      const recommendationsMode = currentFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') || false;
      
      // Backend handles suggestion application
      const result = await apiService.applyFilterSuggestion(
        currentRegions[0],
        suggestion,
        recommendationsMode
      );
      
      if (result.success) {
        setBackendResponse(result);
        
        // Update graph data
        const transformedData = apiService.transformToReactFlow(result);
        setGraphData(transformedData);
        
        // Update filter state based on suggestion
        const newFilters = { ...currentFilters };
        if (suggestion.filter_field && suggestion.filter_value) {
          newFilters[suggestion.filter_field as keyof FilterCriteria] = [suggestion.filter_value] as any;
        }
        setCurrentFilters(newFilters);
        
        console.log('Filter suggestion applied successfully');
      }
      
    } catch (err) {
      console.error('Failed to apply filter suggestion:', err);
      setError('Failed to apply filter suggestion');
    } finally {
      setFilterLoading(false);
    }
  }, [currentRegions, currentFilters, apiService]);
  
  /**
   * Force render large dataset (bypass performance limits)
   */
  const forceRender = useCallback(async () => {
    console.log('Force render not needed - backend handles performance limits');
    
    if (!backendResponse || backendResponse.render_mode !== 'summary') {
      return;
    }
    
    // Show warning but allow render
    setGraphData({
      nodes: [],
      edges: [],
      canRender: true,
      summary: {
        totalNodes: backendResponse.data.total_nodes,
        message: `Warning: Rendering ${backendResponse.data.total_nodes} nodes may impact performance`,
        suggestions: []
      }
    });
  }, [backendResponse]);
  
  /**
   * Reset filters to defaults
   */
  const resetFilters = useCallback(() => {
    const recommendationsMode = currentFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') || false;
    
    const defaultFilters: Partial<FilterCriteria> = {
      nodeTypes: recommendationsMode 
        ? ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT', 'INCUMBENT_PRODUCT']
        : ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT'],
      showInactive: true
    };
    
    console.log('Resetting filters (backend processed)');
    applyFilters(defaultFilters);
  }, [applyFilters, currentFilters.nodeTypes]);
  
  /**
   * Get available regions
   */
  const getAvailableRegions = useCallback(() => {
    return ['NAI', 'EMEA', 'APAC'];
  }, []);
  
  // Initial load - backend handles everything
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (!hasInitialized) {
      console.log('Initial load - backend will process everything');
      setHasInitialized(true);
      loadRegionData(['NAI']);
    }
  }, [hasInitialized, loadRegionData]);
  
  return {
    // Data - minimal, backend-processed
    graphData,
    backendResponse,
    filterOptions,
    currentFilters,
    currentRegions,
    
    // Loading states
    initialLoading,
    filterLoading,
    error,
    
    // Actions - all call backend
    changeRegions,
    applyFilters,
    resetFilters,
    getAvailableRegions,
    switchMode,
    forceRender,
    applyFilterSuggestion,
    
    // Computed properties
    hasData: graphData.nodes.length > 0,
    nodeCount: graphData.nodes.length,
    edgeCount: graphData.edges.length,
    canRender: graphData.canRender,
    
    // Performance info from backend
    isPerformanceLimited: backendResponse?.render_mode === 'summary',
    totalDataNodes: backendResponse?.data?.total_nodes || 0,
    performanceStatus: backendResponse?.data?.total_nodes <= 50 ? 'optimal' : 'limited',
    
    // Mode detection
    isRecommendationsMode: currentFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') || false,
    dataSource: 'complete_backend_processing',
    
    // Backend processing info
    serverSideProcessing: backendResponse?.metadata?.server_side_processing || false,
    backendOptimizations: backendResponse?.metadata?.optimizations || []
  };
};