// services/SimplifiedApiService.ts - Frontend just sends filters, receives ready data
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
  };
  error?: string;
}

export class SimplifiedApiService {
  private static instance: SimplifiedApiService;
  public readonly baseUrl: string;
  
  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    console.log('SimplifiedApiService: All complex logic moved to backend');
  }
  
  static getInstance(): SimplifiedApiService {
    if (!SimplifiedApiService.instance) {
      SimplifiedApiService.instance = new SimplifiedApiService();
    }
    return SimplifiedApiService.instance;
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/complete/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('Backend connection failed:', error);
      return false;
    }
  }

  /**
   * MAIN METHOD: Get region data with optional filters.
   * Backend does ALL processing - returns ready-to-render data.
   */
  async getRegionData(
    region: string,
    filters: FilterCriteria = {},
    recommendationsMode: boolean = false
  ): Promise<BackendResponse> {
    console.log(`Getting backend-processed data for ${region}:`, {
      hasFilters: Object.keys(filters).length > 0,
      recommendationsMode
    });

    try {
      const hasFilters = Object.keys(filters).some(key => 
        filters[key as keyof FilterCriteria] && 
        (filters[key as keyof FilterCriteria] as any)?.length > 0
      );

      if (hasFilters) {
        // Use filtered endpoint when filters are applied
        return await this.getFilteredData(region, filters, recommendationsMode);
      } else {
        // Use base endpoint when no filters
        return await this.getBaseRegionData(region, recommendationsMode);
      }

    } catch (error) {
      console.error('Failed to get region data:', error);
      return {
        success: false,
        render_mode: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        data: { total_nodes: 0 }
      };
    }
  }

  /**
   * Get base region data without filters
   */
  private async getBaseRegionData(region: string, recommendationsMode: boolean): Promise<BackendResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/complete/region/${region}?recommendations_mode=${recommendationsMode}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Base region data received:', {
      renderMode: result.render_mode,
      totalNodes: result.data?.total_nodes,
      hasFilterOptions: !!result.filter_options
    });

    return result;
  }

  /**
   * Get filtered data - backend applies all filters
   */
  private async getFilteredData(
    region: string, 
    filters: FilterCriteria,
    recommendationsMode: boolean
  ): Promise<BackendResponse> {
    
    const filterRequest: any = {};
  
    if (filters.consultantIds?.length) filterRequest.consultantIds = filters.consultantIds;
    if (filters.fieldConsultantIds?.length) filterRequest.fieldConsultantIds = filters.fieldConsultantIds;
    if (filters.clientIds?.length) filterRequest.clientIds = filters.clientIds;
    if (filters.productIds?.length) filterRequest.productIds = filters.productIds;
    if (filters.incumbentProductIds?.length) filterRequest.incumbentProductIds = filters.incumbentProductIds;
    if (filters.clientAdvisorIds?.length) filterRequest.clientAdvisorIds = filters.clientAdvisorIds;
    if (filters.consultantAdvisorIds?.length) filterRequest.consultantAdvisorIds = filters.consultantAdvisorIds;
    if (filters.channels?.length) filterRequest.channels = filters.channels;
    if (filters.assetClasses?.length) filterRequest.assetClasses = filters.assetClasses;
    if (filters.mandateStatuses?.length) filterRequest.mandateStatuses = filters.mandateStatuses;
    if (filters.sales_regions?.length) filterRequest.sales_regions = filters.sales_regions;
    if (filters.ratings?.length) filterRequest.ratings = filters.ratings;
    if (filters.influenceLevels?.length) filterRequest.influenceLevels = filters.influenceLevels;
   
    console.log('Sending clean filter request:', filterRequest);

    const response = await fetch(
      `${this.baseUrl}/api/v1/complete/region/${region}/filtered?recommendations_mode=${recommendationsMode}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filterRequest)
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Filtered data received:', {
      renderMode: result.render_mode,
      totalNodes: result.data?.total_nodes,
      filtersApplied: Object.keys(filterRequest).filter(k => filterRequest[k as keyof typeof filterRequest])
    });

    return result;
  }

  /**
   * Get only filter options - fast dropdown population
   */
  async getFilterOptions(region: string, recommendationsMode: boolean = false): Promise<Record<string, any>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/complete/region/${region}/filter-options?recommendations_mode=${recommendationsMode}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('Filter options loaded (server-processed):', {
          totalOptions: Object.values(result.filter_options).reduce((sum: number, arr) => 
            sum + (Array.isArray(arr) ? arr.length : 0), 0
          ),
          pcaAcaProcessedServerSide: result.server_processing?.pca_aca_parsed_server_side
        });
        return result.filter_options;
      }

      return this.getEmptyFilterOptions(recommendationsMode);

    } catch (error) {
      console.error('Failed to get filter options:', error);
      return this.getEmptyFilterOptions(recommendationsMode);
    }
  }

  /**
   * Apply a specific filter suggestion
   */
  async applyFilterSuggestion(
    region: string,
    suggestion: any,
    recommendationsMode: boolean = false
  ): Promise<BackendResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/complete/region/${region}/apply-suggestion?recommendations_mode=${recommendationsMode}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(suggestion)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Suggestion applied:', {
        suggestion: suggestion.description,
        renderMode: result.render_mode,
        totalNodes: result.data?.total_nodes
      });

      return result;

    } catch (error) {
      console.error('Failed to apply suggestion:', error);
      return {
        success: false,
        render_mode: 'error',
        error: error instanceof Error ? error.message : 'Failed to apply suggestion',
        data: { total_nodes: 0 }
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
    summary?: {
      totalNodes: number;
      message: string;
      suggestions: any[];
    };
  } {
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

    // Backend already provides ReactFlow-ready format - minimal transformation needed
    console.log('Transforming backend data (minimal processing):', {
      inputNodes: backendResponse.data.nodes?.length || 0,
      inputEdges: backendResponse.data.relationships?.length || 0,
      backendProcessed: backendResponse.metadata?.server_side_processing
    });

    return {
      nodes: backendResponse.data.nodes || [],
      edges: backendResponse.data.relationships || [],
      canRender: true
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

export default SimplifiedApiService;