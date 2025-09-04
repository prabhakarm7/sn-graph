// services/PerformanceOptimizedApiService.ts - API service for performance workflow
import { FilterCriteria } from '../types/FitlerTypes';
import { BackendFilterOptions, transformBackendFilterOptions } from '../types/BackendTypes';

interface BackendResponse {
  success: boolean;
  render_mode: 'graph' | 'summary' | 'error';
  data: {
    nodes?: any[];
    relationships?: any[];
    total_nodes: number;
    total_relationships?: number;
    message?: string;
    suggestions?: Array<{
      filter_type: string;
      filter_field: string;
      filter_value: string;
      description: string;
      estimated_reduction: string;
    }>;
  };
  filter_options?: Record<string, any>;
  metadata?: {
    region: string;
    mode: string;
    server_side_processing: boolean;
    filters_applied: Record<string, any>;
    performance_optimized: boolean;
  };
  error?: string;
}

interface FilterOnlyResponse {
  success: boolean;
  filter_options: Record<string, any>;
  metadata?: {
    region: string;
    mode: string;
    total_available_nodes?: number;
    filter_load_time_ms?: number;
  };
  error?: string;
}

export class PerformanceOptimizedApiService {
  private static instance: PerformanceOptimizedApiService;
  public readonly baseUrl: string;
  
  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    console.log('PerformanceOptimizedApiService: Performance-first API strategy initialized');
  }
  
  static getInstance(): PerformanceOptimizedApiService {
    if (!PerformanceOptimizedApiService.instance) {
      PerformanceOptimizedApiService.instance = new PerformanceOptimizedApiService();
    }
    return PerformanceOptimizedApiService.instance;
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/complete/health`);
      const data = await response.json();
      return data.status === 'healthy' && data.performance_optimized === true;
    } catch (error) {
      console.error('Performance API connection failed:', error);
      return false;
    }
  }

  /**
   * STEP 1: Get filter options only (no graph data) - Fast region loading
   */
  async getFilterOptionsOnly(
    region: string,
    recommendationsMode: boolean = false
  ): Promise<Record<string, any>> {
    console.log(`Performance API: Loading filters only for ${region}`);

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/complete/region/${region}/filters-options?recommendations_mode=${recommendationsMode}`,
        {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'X-Performance-Mode': 'filters-only'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: FilterOnlyResponse = await response.json();
      
      if (result.success) {
        console.log('Performance API: Filter options loaded:', {
          region,
          totalOptions: Object.values(result.filter_options).reduce((sum: number, arr) => 
            sum + (Array.isArray(arr) ? arr.length : 0), 0
          ),
          loadTimeMs: result.metadata?.filter_load_time_ms,
          estimatedNodes: result.metadata?.total_available_nodes
        });
        return result.filter_options;
      }

      throw new Error(result.error || 'Failed to load filter options');

    } catch (error) {
      console.error('Performance API: Filter options loading failed:', error);
      return this.getEmptyFilterOptions(recommendationsMode);
    }
  }

  /**
   * STEP 2: Apply filters with performance check - Returns graph OR performance message
   */
  async applyFiltersWithPerformanceCheck(
    region: string,
    filters: FilterCriteria,
    recommendationsMode: boolean = false
  ): Promise<BackendResponse> {
    console.log(`Performance API: Applying filters with performance check for ${region}`);

    try {
      const filterRequest = {
        consultantIds: filters.consultantIds || null,
        fieldConsultantIds: filters.fieldConsultantIds || null,
        clientIds: filters.clientIds || null,
        productIds: filters.productIds || null,
        incumbentProductIds: filters.incumbentProductIds || null,
        clientAdvisorIds: filters.clientAdvisorIds || null,
        consultantAdvisorIds: filters.consultantAdvisorIds || null,
        channels: filters.channels || null,
        assetClasses: filters.assetClasses || null,
        mandateStatuses: filters.mandateStatuses || null,
        sales_regions: filters.sales_regions || null,
        ratings: filters.ratings || null,
        influenceLevels: filters.influenceLevels || null,
        performance_limit: 50 // Performance threshold
      };

      const response = await fetch(
        `${this.baseUrl}/api/v1/performance/region/${region}/filtered-with-check?recommendations_mode=${recommendationsMode}`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Performance-Mode': 'check-before-render'
          },
          body: JSON.stringify(filterRequest)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: BackendResponse = await response.json();
      
      console.log('Performance API: Filter application result:', {
        renderMode: result.render_mode,
        totalNodes: result.data?.total_nodes,
        withinLimit: (result.data?.total_nodes || 0) <= 50,
        hasSuggestions: (result.data?.suggestions || []).length > 0
      });

      // Enhance metadata for performance tracking
      if (result.metadata) {
        result.metadata.performance_optimized = true;
      }

      return result;

    } catch (error) {
      console.error('Performance API: Filter application failed:', error);
      return {
        success: false,
        render_mode: 'error',
        error: error instanceof Error ? error.message : 'Performance check failed',
        data: { total_nodes: 0 },
        metadata: {
          region,
          mode: recommendationsMode ? 'recommendations' : 'standard',
          server_side_processing: true,
          filters_applied: {},
          performance_optimized: true
        }
      };
    }
  }

  /**
   * FALLBACK: Get region data (original method for compatibility)
   */
  async getRegionData(
    region: string,
    filters: FilterCriteria = {},
    recommendationsMode: boolean = false
  ): Promise<BackendResponse> {
    console.log(`Performance API: Fallback to original region data method`);

    const hasFilters = Object.keys(filters).some(key => 
      filters[key as keyof FilterCriteria] && 
      (filters[key as keyof FilterCriteria] as any)?.length > 0
    );

    if (hasFilters) {
      // Use performance-checked filtering
      return await this.applyFiltersWithPerformanceCheck(region, filters, recommendationsMode);
    } else {
      // Return filters-only response
      const filterOptions = await this.getFilterOptionsOnly(region, recommendationsMode);
      return {
        success: true,
        render_mode: 'summary',
        data: {
          total_nodes: 0,
          message: `Filters loaded for ${region}. Apply filters to load graph data.`
        },
        filter_options: filterOptions,
        metadata: {
          region,
          mode: recommendationsMode ? 'recommendations' : 'standard',
          server_side_processing: true,
          filters_applied: {},
          performance_optimized: true
        }
      };
    }
  }

  /**
   * Apply a specific filter suggestion from performance message
   */
  async applySuggestion(
    region: string,
    suggestion: any,
    recommendationsMode: boolean = false
  ): Promise<BackendResponse> {
    console.log('Performance API: Applying suggestion:', suggestion.description);

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/performance/region/${region}/apply-suggestion?recommendations_mode=${recommendationsMode}`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Performance-Mode': 'suggestion-based'
          },
          body: JSON.stringify({
            ...suggestion,
            performance_limit: 50
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: BackendResponse = await response.json();
      console.log('Performance API: Suggestion applied:', {
        suggestion: suggestion.description,
        renderMode: result.render_mode,
        totalNodes: result.data?.total_nodes,
        successful: result.success
      });

      return result;

    } catch (error) {
      console.error('Performance API: Suggestion application failed:', error);
      return {
        success: false,
        render_mode: 'error',
        error: error instanceof Error ? error.message : 'Failed to apply suggestion',
        data: { total_nodes: 0 }
      };
    }
  }

  /**
   * Get performance stats for region
   */
  async getRegionPerformanceStats(region: string): Promise<{
    total_nodes: number;
    total_relationships: number;
    estimated_render_time_ms: number;
    performance_recommendation: 'optimal' | 'acceptable' | 'requires_filtering';
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/performance/region/${region}/stats`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.stats;

    } catch (error) {
      console.error('Performance API: Stats loading failed:', error);
      return {
        total_nodes: 0,
        total_relationships: 0,
        estimated_render_time_ms: 0,
        performance_recommendation: 'requires_filtering'
      };
    }
  }

  /**
   * Transform backend response to ReactFlow format (minimal processing)
   */
  transformToReactFlow(backendResponse: BackendResponse): {
    nodes: any[];
    edges: any[];
    canRender: boolean;
    performance: {
      mode: 'filters_only' | 'graph_ready' | 'too_many_nodes';
      message?: string;
      nodeCount?: number;
      suggestions?: any[];
    };
  } {
    // Performance state mapping
    if (backendResponse.render_mode === 'summary') {
      if (backendResponse.data.total_nodes === 0) {
        // Filters-only mode
        return {
          nodes: [],
          edges: [],
          canRender: false,
          performance: {
            mode: 'filters_only',
            message: backendResponse.data.message || 'Apply filters to load graph data',
            nodeCount: 0
          }
        };
      } else {
        // Too many nodes mode
        return {
          nodes: [],
          edges: [],
          canRender: false,
          performance: {
            mode: 'too_many_nodes',
            message: backendResponse.data.message || 'Dataset too large',
            nodeCount: backendResponse.data.total_nodes,
            suggestions: backendResponse.data.suggestions || []
          }
        };
      }
    }

    if (backendResponse.render_mode === 'error' || !backendResponse.data.nodes) {
      return {
        nodes: [],
        edges: [],
        canRender: false,
        performance: {
          mode: 'filters_only',
          message: 'Error loading data'
        }
      };
    }

    // Graph ready mode
    console.log('Performance API: Transforming to ReactFlow format:', {
      inputNodes: backendResponse.data.nodes?.length || 0,
      inputEdges: backendResponse.data.relationships?.length || 0,
      performanceOptimized: backendResponse.metadata?.performance_optimized
    });

    return {
      nodes: backendResponse.data.nodes || [],
      edges: backendResponse.data.relationships || [],
      canRender: true,
      performance: {
        mode: 'graph_ready',
        message: `Graph loaded successfully (${backendResponse.data.nodes?.length || 0} nodes)`,
        nodeCount: backendResponse.data.nodes?.length || 0
      }
    };
  }
  
  private getEmptyFilterOptions(recommendationsMode: boolean): BackendFilterOptions {
    const base: BackendFilterOptions = {
      markets: [],
      channels: [],
      asset_classes: [],
      consultants: [],
      field_consultants: [],
      companies: [],
      products: [],
      client_advisors: [],
      ratings: ['Positive', 'Negative', 'Neutral', 'Introduced'],
      mandate_statuses: ['Active', 'At Risk', 'Conversion in Progress'],
      influence_levels: ['1', '2', '3', '4', 'High', 'medium', 'low', 'UNK'],
      incumbent_products: [],
      consultant_advisors: []
    };

    if (recommendationsMode) {
      base.incumbent_products = [];
      base.consultant_advisors = [];
    }

    return base;
  }
}

export default PerformanceOptimizedApiService;