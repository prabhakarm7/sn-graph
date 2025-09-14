// services/SmartQueriesService.ts - Complete and Corrected
export interface SmartQuery {
  id: string;
  question: string;
  template_cypher_query: string;
  example_filters: Record<string, any>;
  expected_cypher_query: string;
  filter_list: string[];
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

  // Build actual Cypher query from template with filters
  buildCypherQuery(query: SmartQuery, region: string, filters: Record<string, any> = {}): string {
    let cypherQuery = query.template_cypher_query;
    
    // Replace region placeholder
    cypherQuery = cypherQuery.replace(/\{region\}/g, region.toUpperCase());
    
    // Apply filters based on filter_list
    query.filter_list.forEach(filterKey => {
      if (filters[filterKey] && filters[filterKey].length > 0) {
        // Handle different filter types
        switch (filterKey) {
          case 'consultantIds':
            if (cypherQuery.includes('cons.name')) {
              cypherQuery = cypherQuery.replace(
                /WHERE ([^}]+)/,
                `WHERE $1 AND cons.name IN [${filters[filterKey].map((id: string) => `'${id}'`).join(', ')}]`
              );
            }
            break;
          
          case 'mandateStatuses':
            if (cypherQuery.includes('mandate_status')) {
              cypherQuery = cypherQuery.replace(
                /mandate_status = '[^']+'/,
                `mandate_status IN [${filters[filterKey].map((status: string) => `'${status}'`).join(', ')}]`
              );
            }
            break;
          
          case 'influenceLevels':
            if (cypherQuery.includes('level_of_influence')) {
              cypherQuery = cypherQuery.replace(
                /level_of_influence IN \[[^\]]+\]/,
                `level_of_influence IN [${filters[filterKey].map((level: string) => `'${level}'`).join(', ')}]`
              );
            }
            break;
          
          case 'ratings':
            if (cypherQuery.includes('rankgroup')) {
              cypherQuery = cypherQuery.replace(
                /rankgroup = '[^']+'/,
                `rankgroup IN [${filters[filterKey].map((rating: string) => `'${rating}'`).join(', ')}]`
              );
              cypherQuery = cypherQuery.replace(
                /\{rating\}/g,
                filters[filterKey][0] // Use first rating as placeholder replacement
              );
            }
            break;
          
          case 'assetClasses':
            if (cypherQuery.includes('asset_class')) {
              // This would need more sophisticated template replacement logic
              console.log('Asset class filtering needs template enhancement');
            }
            break;
          
          case 'clientIds':
            if (cypherQuery.includes('c.name')) {
              const whereRegex = /(WHERE[^}]+)/;
              const match = cypherQuery.match(whereRegex);
              if (match) {
                const newWhere = match[1] + ` AND c.name IN [${filters[filterKey].map((id: string) => `'${id}'`).join(', ')}]`;
                cypherQuery = cypherQuery.replace(whereRegex, newWhere);
              }
            }
            break;
        }
      }
    });
    
    return cypherQuery;
  }

  // Enhanced execute method with template processing
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
    actualCypherQuery: string;
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

    // Build actual Cypher query from template
    const actualCypherQuery = this.buildCypherQuery(query, region, appliedFilters);
    
    console.log('Built Cypher Query:', actualCypherQuery);

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/complete/region/${region}/nlq`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cypher_query: actualCypherQuery,
            recommendations_mode: detectedMode === 'recommendations'
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
        result.metadata.template_used = query.template_cypher_query;
        result.metadata.actual_cypher_query = actualCypherQuery;
        result.metadata.detected_mode = detectedMode;
        result.metadata.mode_changed = modeChanged;
        result.metadata.filters_applied = appliedFilters;
        result.metadata.available_filters = query.filter_list;
      }

      return {
        result,
        detectedMode,
        modeChanged,
        actualCypherQuery
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

  // Validate filters against query requirements
  validateQueryFilters(query: SmartQuery, currentFilters: Record<string, any>): {
    isValid: boolean;
    missingFilters: string[];
    availableFilters: string[];
  } {
    const missingFilters: string[] = [];

    // Check for required filters in example_filters
    Object.keys(query.example_filters).forEach(filterKey => {
      if (filterKey !== 'region') { // Region handled separately
        const filterValue = currentFilters[filterKey];
        if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) {
          missingFilters.push(filterKey);
        }
      }
    });

    return {
      isValid: missingFilters.length === 0,
      missingFilters,
      availableFilters: query.filter_list
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