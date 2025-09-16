// services/SmartQueriesService.ts - Updated to filter empty values and rename keys for NLQ
export interface SmartQuery {
  id: string;
  question: string;
  template_cypher_query: string;
  example_filters: Record<string, any>;
  expected_cypher_query: string;
  filter_list: Record<string, any> | string[]; // Support both dictionary and array formats
  auto_mode: 'standard' | 'recommendations' | 'auto';
  mode_keywords: string[];
}

export interface SmartQueriesConfig {
  smart_queries: SmartQuery[];
  metadata: {
    version: string;
    last_updated: string;
    total_queries: number;
    supported_modes: string[];
    available_filters: string[];
  };
}

export class SmartQueriesService {
  private static instance: SmartQueriesService;
  private baseUrl: string;
  private queriesConfig: SmartQueriesConfig | null = null;
  private lastConfigLoad: number = 0;
  private readonly CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  static getInstance(): SmartQueriesService {
    if (!SmartQueriesService.instance) {
      SmartQueriesService.instance = new SmartQueriesService();
    }
    return SmartQueriesService.instance;
  }

  // Load smart queries configuration from API or local file
  async loadQueriesConfig(): Promise<SmartQueriesConfig> {
    const now = Date.now();
    
    // Use cached config if still valid
    if (this.queriesConfig && (now - this.lastConfigLoad) < this.CONFIG_CACHE_TTL) {
      return this.queriesConfig;
    }

    try {
      // Try to load from API first
      const response = await fetch(`${this.baseUrl}/api/v1/smart-queries/config`);
      
      if (response.ok) {
        const configData = await response.json() as SmartQueriesConfig;
        this.queriesConfig = configData;
        this.lastConfigLoad = now;
        console.log('Smart queries config loaded from API:', configData.metadata);
        return configData;
      }
    } catch (error) {
      console.warn('Failed to load smart queries from API, using fallback:', error);
    }

    // Fallback to embedded configuration
    this.queriesConfig = this.getFallbackConfig();
    this.lastConfigLoad = now;
    return this.queriesConfig;
  }

  // Get smart queries (async now)
  async getSmartQueries(): Promise<SmartQuery[]> {
    const config = await this.loadQueriesConfig();
    return config.smart_queries;
  }

  // Get smart query by ID
  async getSmartQueryById(queryId: string): Promise<SmartQuery | null> {
    const queries = await this.getSmartQueries();
    return queries.find(q => q.id === queryId) || null;
  }

  // NEW: Filter out empty values from applied filters
  private filterNonEmptyValues(appliedFilters: Record<string, any>): Record<string, any> {
    const filtered: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(appliedFilters)) {
      // Skip nodeTypes - this is UI-only and should not be sent to API
      if (key === 'nodeTypes') {
        continue;
      }
      
      // Skip if value is null, undefined, or empty string
      if (value === null || value === undefined || value === '') {
        continue;
      }
      
      // Skip if value is an empty array
      if (Array.isArray(value) && value.length === 0) {
        continue;
      }
      
      // Skip if value is an empty object
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
        continue;
      }
      
      // Include the filter if it has a meaningful value
      filtered[key] = value;
    }
    
    console.log('SmartQueriesService: Filtered applied filters:', {
      original: Object.keys(appliedFilters).length,
      filtered: Object.keys(filtered).length,
      removed: Object.keys(appliedFilters).filter(k => !(k in filtered)),
      kept: Object.keys(filtered),
      nodeTypesRemoved: 'nodeTypes' in appliedFilters
    });
    
    return filtered;
  }

  // NEW: Rename filter keys for NLQ payload only
  private renameFiltersForNLQ(filters: Record<string, any>): Record<string, any> {
    const keyMapping: Record<string, string> = {
      'clientIds': 'company.name',
      'consultantIds': 'consultant.name',
      'fieldConsultantIds': 'field_consultant.name',
      'productIds': 'product.name',
      'incumbentProductIds': 'incumbent_product.name',
      'clientAdvisorIds': 'company.pca',
      'consultantAdvisorIds': 'consultant.consultant_advisor',
      'sales_regions': 'company.sales_region',
      'channels': 'company.channel',
      'assetClasses': 'product.asset_class',
      'mandateStatuses': 'relationship.mandate_status',
      'influenceLevels': 'relationship.level_of_influence',
      'ratings': 'rating.rankgroup',
      'regions': 'region'
    };

    const renamedFilters: Record<string, any> = {};
    
    for (const [originalKey, value] of Object.entries(filters)) {
      const renamedKey = keyMapping[originalKey] || originalKey;
      renamedFilters[renamedKey] = value;
    }
    
    console.log('SmartQueriesService: Renamed filters for NLQ:', {
      original: Object.keys(filters),
      renamed: Object.keys(renamedFilters),
      mapping: keyMapping
    });
    
    return renamedFilters;
  }

  // Enhanced execute method - with empty value filtering and key renaming
  async executeSmartQuery(
    queryId: string,
    region: string,
    appliedFilters: Record<string, any> = {},
    currentMode?: 'standard' | 'recommendations',
    userIntent?: string
  ): Promise<{
    result: any;
    detectedMode: 'standard' | 'recommendations';
    modeChanged: boolean;
    queryObject: SmartQuery;
  }> {
    const query = await this.getSmartQueryById(queryId);
    if (!query) {
      throw new Error(`Query ${queryId} not found`);
    }

    // Detect required mode
    const detectedMode = this.detectRequiredMode(query, userIntent);
    const modeChanged = currentMode !== detectedMode;

    if (modeChanged) {
      console.log(`Auto-switching mode: ${currentMode} → ${detectedMode} for query "${query.question}"`);
    }

    // STEP 1: Filter out empty values from applied filters
    const nonEmptyFilters = this.filterNonEmptyValues(appliedFilters);
    
    // STEP 2: Rename filter keys for NLQ payload (only affects API payload, not global state)
    const renamedFiltersForNLQ = this.renameFiltersForNLQ(nonEmptyFilters);

    // Create smart query object with renamed and filtered applied filters
    const smartQueryWithFilters = {
      id: query.id,
      question: query.question,
      template_cypher_query: query.template_cypher_query,
      example_filters: query.example_filters,
      expected_cypher_query: query.expected_cypher_query,
      auto_mode: query.auto_mode,
      mode_keywords: query.mode_keywords,
      applied_filters: renamedFiltersForNLQ // Use renamed and filtered version
    };

    console.log('Executing Smart Query with filtered and renamed filters:', {
      queryId,
      region,
      originalFiltersCount: Object.keys(appliedFilters).length,
      filteredFiltersCount: Object.keys(nonEmptyFilters).length,
      renamedFiltersCount: Object.keys(renamedFiltersForNLQ).length,
      detectedMode,
      finalAppliedFilters: renamedFiltersForNLQ
    });

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/complete/region/${region}/nlq`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            smart_query: smartQueryWithFilters,
            region: region,
            recommendations_mode: detectedMode === 'recommendations',
            user_intent: userIntent
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Add enhanced metadata
      if (result.metadata) {
        result.metadata.smart_query_id = queryId;
        result.metadata.smart_query_question = query.question;
        result.metadata.detected_mode = detectedMode;
        result.metadata.mode_changed = modeChanged;
        result.metadata.original_filters_count = Object.keys(appliedFilters).length;
        result.metadata.filtered_filters_count = Object.keys(nonEmptyFilters).length;
        result.metadata.filters_sent_to_nlq = renamedFiltersForNLQ;
        result.metadata.available_filters = query.filter_list;
        result.metadata.filter_processing = {
          empty_values_removed: Object.keys(appliedFilters).length - Object.keys(nonEmptyFilters).length,
          keys_renamed_for_nlq: true,
          original_keys: Object.keys(nonEmptyFilters),
          renamed_keys: Object.keys(renamedFiltersForNLQ)
        };
      }

      return {
        result,
        detectedMode,
        modeChanged,
        queryObject: query
      };

    } catch (error) {
      console.error('Smart query execution failed:', error);
      throw error;
    }
  }

  // Mode detection
  detectRequiredMode(query: SmartQuery, userIntent?: string): 'standard' | 'recommendations' {
    if (query.auto_mode === 'recommendations') {
      console.log(`Query "${query.id}" requires recommendations mode (auto_mode: recommendations)`);
      return 'recommendations';
    }
    
    if (query.auto_mode === 'standard') {
      console.log(`Query "${query.id}" requires standard mode (auto_mode: standard)`);
      return 'standard';
    }

    // Check if query uses INCUMBENT_PRODUCT or BI_RECOMMENDS
    const cypherQuery = query.template_cypher_query.toUpperCase();
    if (cypherQuery.includes('INCUMBENT_PRODUCT') || cypherQuery.includes('BI_RECOMMENDS')) {
      console.log(`Query "${query.id}" requires recommendations mode (uses INCUMBENT_PRODUCT/BI_RECOMMENDS)`);
      return 'recommendations';
    }

    // Check keywords in question for recommendation indicators
    const textToCheck = query.question.toLowerCase();
    const recommendationKeywords = [
      'recommendation', 'incumbent', 'bi', 'ai', 'conversion', 
      'opportunity', 'suggest', 'replace', 'alternative'
    ];
    
    const hasRecommendationKeywords = recommendationKeywords.some(keyword => 
      textToCheck.includes(keyword)
    );
    
    if (hasRecommendationKeywords) {
      console.log(`Query "${query.id}" requires recommendations mode (keyword detection)`);
      return 'recommendations';
    }

    // Check user intent if provided
    if (userIntent) {
      const intentLower = userIntent.toLowerCase();
      const hasIntentKeywords = recommendationKeywords.some(keyword => 
        intentLower.includes(keyword)
      );
      
      if (hasIntentKeywords) {
        console.log(`Query "${query.id}" requires recommendations mode (user intent keywords)`);
        return 'recommendations';
      }
    }

    console.log(`Query "${query.id}" uses standard mode (default)`);
    return 'standard';
  }

  // Validate filters against query requirements - FIXED: Use dictionary filter_list
  validateQueryFilters(query: SmartQuery, currentFilters: Record<string, any>): {
    isValid: boolean;
    missingFilters: string[];
    availableFilters: string[];
  } {
    // FIXED: Handle both dictionary and array filter_list formats
    let requiredFilters: string[] = [];
    
    if (query.filter_list) {
      if (Array.isArray(query.filter_list)) {
        // Old format: array of strings
        requiredFilters = query.filter_list.filter(key => key !== 'region' && key !== 'nodeTypes');
      } else if (typeof query.filter_list === 'object') {
        // New format: dictionary/object
        requiredFilters = Object.keys(query.filter_list).filter(key => key !== 'region' && key !== 'nodeTypes');
      }
    }
    
    // If no filter_list or empty, fallback to example_filters keys
    if (requiredFilters.length === 0) {
      requiredFilters = Object.keys(query.example_filters).filter(key => key !== 'region' && key !== 'nodeTypes');
    }
    
    const filtersWithValues: string[] = [];
    const missingFilters: string[] = [];

    console.log('Validation with dictionary filter_list:', {
      queryId: query.id,
      requiredFilters,
      filterListType: Array.isArray(query.filter_list) ? 'array' : typeof query.filter_list,
      currentFiltersKeys: Object.keys(currentFilters),
      currentFiltersWithValues: Object.keys(currentFilters).filter(k => {
        const val = currentFilters[k];
        return val && (Array.isArray(val) ? val.length > 0 : true);
      })
    });

    requiredFilters.forEach(filterKey => {
      const filterValue = currentFilters[filterKey];
      const hasValue = filterValue && (
        (Array.isArray(filterValue) && filterValue.length > 0) ||
        (!Array.isArray(filterValue) && filterValue !== null && filterValue !== undefined && filterValue !== '')
      );
      
      if (hasValue) {
        filtersWithValues.push(filterKey);
      } else {
        missingFilters.push(filterKey);
      }
    });

    // Query is valid if ANY required filter has a value (not ALL)
    const isValid = filtersWithValues.length > 0;

    console.log('SmartQuery validation result:', {
      queryId: query.id,
      requiredFilters,
      filtersWithValues,
      missingFilters,
      isValid,
      validationRule: 'ANY_FILTER_SUFFICIENT'
    });

    return {
      isValid,
      missingFilters,
      availableFilters: requiredFilters
    };
  }

  // Get mode requirement info for UI
  async getModeRequirement(queryId: string): Promise<{
    requiredMode: 'standard' | 'recommendations';
    autoDetected: boolean;
    reason: string;
  }> {
    const query = await this.getSmartQueryById(queryId);
    if (!query) {
      return { requiredMode: 'standard', autoDetected: false, reason: 'Query not found' };
    }

    const detectedMode = this.detectRequiredMode(query);
    
    return {
      requiredMode: detectedMode,
      autoDetected: query.auto_mode === 'auto',
      reason: query.auto_mode === 'recommendations' ? 'Uses incumbent products and BI recommendations' :
              query.auto_mode === 'standard' ? 'Focuses on existing relationships' :
              'Auto-detected from query content'
    };
  }

  // API methods for configuration management
  async updateQueriesConfig(newConfig: SmartQueriesConfig): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/smart-queries/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });

      if (response.ok) {
        // Invalidate cache
        this.queriesConfig = null;
        this.lastConfigLoad = 0;
        console.log('Smart queries configuration updated successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update smart queries configuration:', error);
      return false;
    }
  }

  async addSmartQuery(newQuery: SmartQuery): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/smart-queries/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuery)
      });

      if (response.ok) {
        // Invalidate cache
        this.queriesConfig = null;
        this.lastConfigLoad = 0;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to add smart query:', error);
      return false;
    }
  }

  async updateSmartQuery(queryId: string, updatedQuery: Partial<SmartQuery>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/smart-queries/query/${queryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedQuery)
      });

      if (response.ok) {
        // Invalidate cache
        this.queriesConfig = null;
        this.lastConfigLoad = 0;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update smart query:', error);
      return false;
    }
  }

  async deleteSmartQuery(queryId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/smart-queries/query/${queryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Invalidate cache
        this.queriesConfig = null;
        this.lastConfigLoad = 0;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to delete smart query:', error);
      return false;
    }
  }

  // Fallback configuration (embedded in code as backup)
  private getFallbackConfig(): SmartQueriesConfig {
    return {
      smart_queries: [
        {
          id: "top_performers",
          question: "Find consultants with the highest client coverage and positive product ratings",
          template_cypher_query: "MATCH (cons:CONSULTANT)-[emp:EMPLOYS]->(fc:FIELD_CONSULTANT)-[cov:COVERS]->(c:COMPANY) WHERE (c.region = '{region}' OR '{region}' IN c.region) AND cov.level_of_influence IN ['3', '4', 'High'] OPTIONAL MATCH (cons)-[rate:RATES]->(p:PRODUCT) WHERE rate.rankgroup = 'Positive' WITH cons, fc, c, COUNT(DISTINCT c) as company_count, COUNT(DISTINCT rate) as positive_ratings WHERE company_count >= 2 RETURN {nodes: COLLECT(DISTINCT cons) + COLLECT(DISTINCT fc) + COLLECT(DISTINCT c), relationships: COLLECT(DISTINCT {id: toString(id(emp)), source: cons.id, target: fc.id, type: 'custom', data: {relType: 'EMPLOYS'}}) + COLLECT(DISTINCT {id: toString(id(cov)), source: fc.id, target: c.id, type: 'custom', data: {relType: 'COVERS', level_of_influence: cov.level_of_influence}})} AS GraphData",
          example_filters: {
            region: "US",
            influenceLevels: ["3", "4", "High"]
          },
          expected_cypher_query: "MATCH (cons:CONSULTANT)-[emp:EMPLOYS]->(fc:FIELD_CONSULTANT)-[cov:COVERS]->(c:COMPANY) WHERE (c.region = 'US' OR 'US' IN c.region) AND cov.level_of_influence IN ['3', '4', 'High'] OPTIONAL MATCH (cons)-[rate:RATES]->(p:PRODUCT) WHERE rate.rankgroup = 'Positive' WITH cons, fc, c, COUNT(DISTINCT c) as company_count, COUNT(DISTINCT rate) as positive_ratings WHERE company_count >= 2 RETURN {nodes: COLLECT(DISTINCT cons) + COLLECT(DISTINCT fc) + COLLECT(DISTINCT c), relationships: COLLECT(DISTINCT {id: toString(id(emp)), source: cons.id, target: fc.id, type: 'custom', data: {relType: 'EMPLOYS'}}) + COLLECT(DISTINCT {id: toString(id(cov)), source: fc.id, target: c.id, type: 'custom', data: {relType: 'COVERS', level_of_influence: cov.level_of_influence}})} AS GraphData",
          filter_list: ["region", "influenceLevels", "consultantIds"],
          auto_mode: "standard",
          mode_keywords: ["consultant", "performance", "coverage", "influence"]
        },
        {
          id: "at_risk_relationships",
          question: "Identify companies with 'At Risk' mandate status and their consultant coverage",
          template_cypher_query: "MATCH (c:COMPANY)-[owns:OWNS]->(p:PRODUCT) WHERE (c.region = '{region}' OR '{region}' IN c.region) AND owns.mandate_status = 'At Risk' OPTIONAL MATCH (fc:FIELD_CONSULTANT)-[cov:COVERS]->(c) OPTIONAL MATCH (cons:CONSULTANT)-[emp:EMPLOYS]->(fc) RETURN {nodes: COLLECT(DISTINCT c) + COLLECT(DISTINCT p) + COLLECT(DISTINCT fc) + COLLECT(DISTINCT cons), relationships: COLLECT(DISTINCT {id: toString(id(owns)), source: c.id, target: p.id, type: 'custom', data: {relType: 'OWNS', mandate_status: owns.mandate_status}}) + COLLECT(DISTINCT {id: toString(id(cov)), source: fc.id, target: c.id, type: 'custom', data: {relType: 'COVERS', level_of_influence: cov.level_of_influence}}) + COLLECT(DISTINCT {id: toString(id(emp)), source: cons.id, target: fc.id, type: 'custom', data: {relType: 'EMPLOYS'}})} AS GraphData",
          example_filters: {
            region: "US",
            mandateStatuses: ["At Risk"]
          },
          expected_cypher_query: "MATCH (c:COMPANY)-[owns:OWNS]->(p:PRODUCT) WHERE (c.region = 'US' OR 'US' IN c.region) AND owns.mandate_status = 'At Risk' OPTIONAL MATCH (fc:FIELD_CONSULTANT)-[cov:COVERS]->(c) OPTIONAL MATCH (cons:CONSULTANT)-[emp:EMPLOYS]->(fc) RETURN {nodes: COLLECT(DISTINCT c) + COLLECT(DISTINCT p) + COLLECT(DISTINCT fc) + COLLECT(DISTINCT cons), relationships: COLLECT(DISTINCT {id: toString(id(owns)), source: c.id, target: p.id, type: 'custom', data: {relType: 'OWNS', mandate_status: owns.mandate_status}}) + COLLECT(DISTINCT {id: toString(id(cov)), source: fc.id, target: c.id, type: 'custom', data: {relType: 'COVERS', level_of_influence: cov.level_of_influence}}) + COLLECT(DISTINCT {id: toString(id(emp)), source: cons.id, target: fc.id, type: 'custom', data: {relType: 'EMPLOYS'}})} AS GraphData",
          filter_list: ["region", "mandateStatuses", "clientIds"],
          auto_mode: "standard",
          mode_keywords: ["at risk", "mandate", "client", "relationship"]
        },
        {
          id: "recommendation_opportunities",
          question: "Show incumbent products with BI recommendations and potential for conversion",
          template_cypher_query: "MATCH (c:COMPANY)-[owns:OWNS]->(ip:INCUMBENT_PRODUCT)-[rec:BI_RECOMMENDS]->(p:PRODUCT) WHERE (c.region = '{region}' OR '{region}' IN c.region) OPTIONAL MATCH (fc:FIELD_CONSULTANT)-[cov:COVERS]->(c) OPTIONAL MATCH (cons:CONSULTANT)-[emp:EMPLOYS]->(fc) RETURN {nodes: COLLECT(DISTINCT c) + COLLECT(DISTINCT ip) + COLLECT(DISTINCT p) + COLLECT(DISTINCT fc) + COLLECT(DISTINCT cons), relationships: COLLECT(DISTINCT {id: toString(id(owns)), source: c.id, target: ip.id, type: 'custom', data: {relType: 'OWNS', mandate_status: owns.mandate_status}}) + COLLECT(DISTINCT {id: toString(id(rec)), source: ip.id, target: p.id, type: 'custom', data: {relType: 'BI_RECOMMENDS'}}) + COLLECT(DISTINCT {id: toString(id(cov)), source: fc.id, target: c.id, type: 'custom', data: {relType: 'COVERS', level_of_influence: cov.level_of_influence}}) + COLLECT(DISTINCT {id: toString(id(emp)), source: cons.id, target: fc.id, type: 'custom', data: {relType: 'EMPLOYS'}})} AS GraphData",
          example_filters: {
            region: "US",
            assetClasses: ["Fixed Income", "Equity"]
          },
          expected_cypher_query: "MATCH (c:COMPANY)-[owns:OWNS]->(ip:INCUMBENT_PRODUCT)-[rec:BI_RECOMMENDS]->(p:PRODUCT) WHERE (c.region = 'US' OR 'US' IN c.region) OPTIONAL MATCH (fc:FIELD_CONSULTANT)-[cov:COVERS]->(c) OPTIONAL MATCH (cons:CONSULTANT)-[emp:EMPLOYS]->(fc) RETURN {nodes: COLLECT(DISTINCT c) + COLLECT(DISTINCT ip) + COLLECT(DISTINCT p) + COLLECT(DISTINCT fc) + COLLECT(DISTINCT cons), relationships: COLLECT(DISTINCT {id: toString(id(owns)), source: c.id, target: ip.id, type: 'custom', data: {relType: 'OWNS', mandate_status: owns.mandate_status}}) + COLLECT(DISTINCT {id: toString(id(rec)), source: ip.id, target: p.id, type: 'custom', data: {relType: 'BI_RECOMMENDS'}}) + COLLECT(DISTINCT {id: toString(id(cov)), source: fc.id, target: c.id, type: 'custom', data: {relType: 'COVERS', level_of_influence: cov.level_of_influence}}) + COLLECT(DISTINCT {id: toString(id(emp)), source: cons.id, target: fc.id, type: 'custom', data: {relType: 'EMPLOYS'}})} AS GraphData",
          filter_list: ["region", "assetClasses", "productIds"],
          auto_mode: "recommendations",
          mode_keywords: ["recommendation", "incumbent", "BI", "conversion", "opportunity"]
        }
      ],
      metadata: {
        version: "1.0",
        last_updated: "2025-01-01",
        total_queries: 3,
        supported_modes: ["standard", "recommendations"],
        available_filters: [
          "region", "consultantIds", "fieldConsultantIds", "clientIds", 
          "productIds", "incumbentProductIds", "assetClasses", "mandateStatuses", 
          "influenceLevels", "ratings", "channels", "sales_regions"
        ]
      }
    };
  }

  // Utility method to validate query configuration
  validateQueryConfig(query: SmartQuery): string[] {
    const errors: string[] = [];
    
    if (!query.id || query.id.trim() === '') {
      errors.push('Query ID is required');
    }
    
    if (!query.question || query.question.trim() === '') {
      errors.push('Question is required');
    }
    
    if (!query.template_cypher_query || query.template_cypher_query.trim() === '') {
      errors.push('Template Cypher query is required');
    }
    
    if (!query.template_cypher_query.includes('{region}')) {
      errors.push('Template must include {region} placeholder');
    }
    
    if (!query.template_cypher_query.includes('AS GraphData')) {
      errors.push('Template must return result AS GraphData');
    }
    
    if (!query.filter_list || query.filter_list.length === 0) {
      errors.push('Filter list cannot be empty');
    }
    
    if (!query.filter_list.includes('region')) {
      errors.push('Filter list must include "region"');
    }
    
    if (!['standard', 'recommendations', 'auto'].includes(query.auto_mode)) {
      errors.push('Auto mode must be "standard", "recommendations", or "auto"');
    }
    
    return errors;
  }
}