// services/ApiNeo4jService.ts - COMPLETE with orphan removal functionality
import { FilterCriteria, FilterOptions, transformHierarchicalOptions } from '../types/FitlerTypes';

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

export class ApiNeo4jService {
  private static instance: ApiNeo4jService;
  public readonly baseUrl: string;
  private regionDataCache: Map<string, Neo4jResult> = new Map();
  private filterOptionsCache: Map<string, FilterOptions> = new Map();
  
  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    console.log(`🔌 ApiNeo4jService initialized with base URL: ${this.baseUrl}`);
  }
  
  static getInstance(): ApiNeo4jService {
    if (!ApiNeo4jService.instance) {
      ApiNeo4jService.instance = new ApiNeo4jService();
    }
    return ApiNeo4jService.instance;
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      
      console.log('🔍 API Health Check:', data);
      return data.status === 'healthy' && data.database_connected;
    } catch (error) {
      console.error('❌ API connection test failed:', error);
      return false;
    }
  }

  async getDatabaseStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/hierarchical/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const stats = await response.json();
      console.log('📊 Hierarchical service stats retrieved:', stats);
      
      return stats;
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      // Fallback to regular stats endpoint
      try {
        const response = await fetch(`${this.baseUrl}/api/v1/graph/stats`);
        if (response.ok) {
          return await response.json();
        }
      } catch (fallbackError) {
        console.error('❌ Fallback stats also failed:', fallbackError);
      }
      throw error;
    }
  }

  async getAvailableRegions(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/hierarchical/regions`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🌍 Available regions:', data.regions);
      
      return data.regions || ['NAI', 'EMEA', 'APAC'];
    } catch (error) {
      console.error('❌ Failed to get available regions:', error);
      return ['NAI', 'EMEA', 'APAC'];
    }
  }
  
  async getRegionData(regions: string[] = ['NAI']): Promise<Neo4jResult> {
    console.log(`🌍 Loading data for regions using hierarchical endpoint: ${regions.join(', ')}`);
    
    try {
      const region = regions[0];
      const cacheKey = regions.sort().join(',');
      
      if (this.regionDataCache.has(cacheKey)) {
        console.log(`📋 Using cached data for ${cacheKey}`);
        return this.regionDataCache.get(cacheKey)!;
      }
      
      const response = await fetch(`${this.baseUrl}/api/v1/hierarchical/region/${region}/complete`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const hierarchicalData: HierarchicalResponse = await response.json();
      
      if (!hierarchicalData.success || !hierarchicalData.data) {
        throw new Error(hierarchicalData.error || 'Failed to get hierarchical data');
      }
      
      console.log(`✅ Retrieved hierarchical data for ${region}:`, {
        nodes: hierarchicalData.data.graph_data.nodes.length,
        relationships: hierarchicalData.data.graph_data.relationships.length,
        filterOptions: hierarchicalData.data.statistics.total_filter_options
      });
      
      const transformedData: Neo4jResult = {
        nodes: hierarchicalData.data.graph_data.nodes,
        relationships: hierarchicalData.data.graph_data.relationships,
        metadata: {
          region: hierarchicalData.data.region,
          statistics: hierarchicalData.data.statistics,
          source: 'hierarchical_complete_workflow'
        }
      };
      
      this.filterOptionsCache.set(region, transformHierarchicalOptions(hierarchicalData.data.filter_options || {}));
      this.regionDataCache.set(cacheKey, transformedData);
      
      return transformedData;
      
    } catch (error) {
      console.error('❌ Failed to fetch region data:', error);
      throw new Error(`Failed to fetch region data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async changeRegion(newRegion: string, currentRegion?: string): Promise<Neo4jResult> {
    console.log(`🔄 Changing region from ${currentRegion || 'unknown'} to ${newRegion}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/hierarchical/region/change/${newRegion}?current_region=${currentRegion || ''}`, {
        method: 'PUT'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const hierarchicalData: HierarchicalResponse = await response.json();
      
      if (!hierarchicalData.success || !hierarchicalData.data) {
        throw new Error(hierarchicalData.error || 'Failed to change region');
      }
      
      console.log(`✅ Region changed to ${newRegion}:`, {
        nodes: hierarchicalData.data.graph_data.nodes.length,
        relationships: hierarchicalData.data.graph_data.relationships.length
      });
      
      this.regionDataCache.clear();
      
      const transformedData: Neo4jResult = {
        nodes: hierarchicalData.data.graph_data.nodes,
        relationships: hierarchicalData.data.graph_data.relationships,
        metadata: {
          region: hierarchicalData.data.region,
          statistics: hierarchicalData.data.statistics,
          source: 'hierarchical_region_change'
        }
      };
      
      this.filterOptionsCache.set(newRegion, transformHierarchicalOptions(hierarchicalData.data.filter_options || {}));
      this.regionDataCache.set(newRegion, transformedData);
      
      return transformedData;
      
    } catch (error) {
      console.error('❌ Failed to change region:', error);
      throw new Error(`Failed to change region: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async getFilterOptionsFromData(data: Neo4jResult): Promise<FilterOptions> {
    console.log('📊 Getting filter options from hierarchical data...');
    
    try {
      const region = data.metadata?.region;
      if (region && this.filterOptionsCache.has(region)) {
        console.log(`📋 Using cached filter options for ${region}`);
        return this.filterOptionsCache.get(region)!;
      }
      
      return this.extractFilterOptionsFromData(data);
      
    } catch (error) {
      console.error('❌ Failed to get filter options:', error);
      return this.getEmptyFilterOptions();
    }
  }

  // 🆕 ENHANCED: Main filtering method with orphan removal
    async applyFiltersToData(data: Neo4jResult, filters: FilterCriteria): Promise<Neo4jResult> {
    console.log('🔍 Enhanced applyFiltersToData with advisor filtering:', {
      nodeCount: data.nodes?.length || 0,
      relationshipCount: data.relationships?.length || 0,
      clientAdvisorIds: filters.clientAdvisorIds?.length || 0,
      consultantAdvisorIds: filters.consultantAdvisorIds?.length || 0
    });

    // 🆕 STEP 1: Apply advisor filters FIRST (most selective)
    let filteredData = { ...data };
    
    if (filters.clientAdvisorIds?.length || filters.consultantAdvisorIds?.length) {
      console.log('👥 Applying advisor filters first...');
      filteredData = this.applyAdvisorFilters(filteredData, filters);
    }

    // 🆕 STEP 2: Apply existing filtering logic
    filteredData = this.applyFiltersLocallyWithOrphanRemoval(filteredData, filters);

    console.log('✅ Enhanced filtering complete:', {
      originalNodes: data.nodes?.length || 0,
      filteredNodes: filteredData.nodes?.length || 0,
      advisorFilterApplied: !!(filters.clientAdvisorIds?.length || filters.consultantAdvisorIds?.length)
    });

    return filteredData;
  }

    // 🔧 FIXED: Enhanced advisor filtering with CORRECT relationship directions
  private applyAdvisorFilters(data: Neo4jResult, filters: FilterCriteria): Neo4jResult {
    const nodes = data.nodes || [];
    const relationships = data.relationships || [];
    
    const clientAdvisorIds = filters.clientAdvisorIds || [];
    const consultantAdvisorIds = filters.consultantAdvisorIds || [];

    console.log('👥 Applying FIXED advisor filters with correct relationship directions:', {
      clientAdvisors: clientAdvisorIds.length,
      consultantAdvisors: consultantAdvisorIds.length,
      totalNodes: nodes.length,
      totalRelationships: relationships.length
    });

    if (!clientAdvisorIds.length && !consultantAdvisorIds.length) {
      return data;
    }

    // Step 1: Find anchor nodes (companies/consultants matching advisor criteria)
    const anchorNodeIds = new Set<string>();

    // Client Advisor filtering (Company PCA/ACA) - Find matching companies
    if (clientAdvisorIds.length > 0) {
      console.log('🏢 Finding companies with Client Advisors:', clientAdvisorIds);
      nodes.forEach((node: Neo4jNode) => {
        if (node.labels?.includes('COMPANY')) {
          const props = node.properties || {};
          const companyPca = props.pca || '';
          const companyAca = props.aca || '';
          
          if (clientAdvisorIds.includes(companyPca) || clientAdvisorIds.includes(companyAca)) {
            anchorNodeIds.add(node.id);
            console.log(`   ✅ Company "${props.name || node.id}" matches (PCA: ${companyPca}, ACA: ${companyAca})`);
          }
        }
      });
    }

    // Consultant Advisor filtering (Consultant PCA/Advisor) - Find matching consultants
    if (consultantAdvisorIds.length > 0) {
      console.log('👨‍💼 Finding consultants with Consultant Advisors:', consultantAdvisorIds);
      nodes.forEach((node: Neo4jNode) => {
        if (node.labels?.includes('CONSULTANT')) {
          const props = node.properties || {};
          const consultantPca = props.pca || '';
          const consultantAdvisor = props.consultant_advisor || '';
          
          if (consultantAdvisorIds.includes(consultantPca) || consultantAdvisorIds.includes(consultantAdvisor)) {
            anchorNodeIds.add(node.id);
            console.log(`   ✅ Consultant "${props.name || node.id}" matches (PCA: ${consultantPca}, Advisor: ${consultantAdvisor})`);
          }
        }
      });
    }

    console.log(`📊 Found ${anchorNodeIds.size} anchor nodes (companies/consultants)`);

    if (anchorNodeIds.size === 0) {
      console.log('❌ No matching advisor nodes found');
      return { ...data, nodes: [], relationships: [] };
    }

    // Step 2: CORRECTED - Build complete subgraph following correct relationship paths
    const relevantNodeIds = new Set<string>(anchorNodeIds);

    // 🔧 FIXED: Specific path expansion based on anchor type
    if (clientAdvisorIds.length > 0) {
      console.log('🏢 Client Advisor path: Company → Field Consultant → Consultant → Products');
      this.expandFromCompanies(relevantNodeIds, nodes, relationships);
    }

    if (consultantAdvisorIds.length > 0) {
      console.log('👨‍💼 Consultant Advisor path: Consultant → Field Consultant → Company → Products');
      this.expandFromConsultants(relevantNodeIds, nodes, relationships);
    }

    console.log(`✅ Final expansion: ${relevantNodeIds.size} total nodes in subgraph`);

    // Step 3: Filter nodes and relationships
    const filteredNodes = nodes.filter((node: Neo4jNode) => relevantNodeIds.has(node.id));
    const filteredRelationships = relationships.filter((rel: Neo4jRelationship) => 
      relevantNodeIds.has(rel.start_node_id) && relevantNodeIds.has(rel.end_node_id)
    );

    // Step 4: Debug output - show what types of nodes we got
    const nodeTypeCounts: Record<string, number> = {};
    filteredNodes.forEach(node => {
      node.labels?.forEach(label => {
        nodeTypeCounts[label] = (nodeTypeCounts[label] || 0) + 1;
      });
    });

    console.log('📈 Filtered subgraph composition:', nodeTypeCounts);
    console.log(`✅ Advisor filtering result: ${filteredNodes.length} nodes, ${filteredRelationships.length} relationships`);

    return {
      ...data,
      nodes: filteredNodes,
      relationships: filteredRelationships,
      metadata: {
        ...data.metadata,
        advisor_filter_applied: true,
        client_advisors_selected: clientAdvisorIds.length,
        consultant_advisors_selected: consultantAdvisorIds.length,
        original_node_count: nodes.length,
        filtered_node_count: filteredNodes.length,
        anchor_nodes_found: anchorNodeIds.size,
        subgraph_composition: nodeTypeCounts
      }
    };
  }

  // 🆕 Helper: Expand from companies following: Company ← Field Consultant ← Consultant
  private expandFromCompanies(nodeIds: Set<string>, nodes: Neo4jNode[], relationships: Neo4jRelationship[]): void {
    const companies = Array.from(nodeIds).filter(id => {
      const node = nodes.find(n => n.id === id);
      return node?.labels?.includes('COMPANY');
    });

    console.log(`🏢 Expanding from ${companies.length} companies...`);

    // Step 1: Company → Products (OWNS relationship)
    relationships.forEach(rel => {
      if (rel.type === 'OWNS' && companies.includes(rel.start_node_id)) {
        nodeIds.add(rel.end_node_id); // Add product
        const product = nodes.find(n => n.id === rel.end_node_id);
        console.log(`   📦 Added Product: ${product?.properties?.name || rel.end_node_id}`);
      }
    });

    // Step 2: Company ← Field Consultant (COVERS relationship: FC -COVERS-> Company)
    const fieldConsultants = new Set<string>();
    relationships.forEach(rel => {
      if (rel.type === 'COVERS' && companies.includes(rel.end_node_id)) {
        nodeIds.add(rel.start_node_id); // Add field consultant
        fieldConsultants.add(rel.start_node_id);
        const fc = nodes.find(n => n.id === rel.start_node_id);
        console.log(`   👥 Added Field Consultant: ${fc?.properties?.name || rel.start_node_id}`);
      }
    });

    // Step 3: Field Consultant ← Consultant (EMPLOYS relationship: Consultant -EMPLOYS-> FC)
    relationships.forEach(rel => {
      if (rel.type === 'EMPLOYS' && fieldConsultants.has(rel.end_node_id)) {
        nodeIds.add(rel.start_node_id); // Add consultant
        const consultant = nodes.find(n => n.id === rel.start_node_id);
        console.log(`   👨‍💼 Added Consultant: ${consultant?.properties?.name || rel.start_node_id}`);
      }
    });
  }

  // 🆕 Helper: Expand from consultants following: Consultant → Field Consultant → Company → Products
  private expandFromConsultants(nodeIds: Set<string>, nodes: Neo4jNode[], relationships: Neo4jRelationship[]): void {
    const consultants = Array.from(nodeIds).filter(id => {
      const node = nodes.find(n => n.id === id);
      return node?.labels?.includes('CONSULTANT');
    });

    console.log(`👨‍💼 Expanding from ${consultants.length} consultants...`);

    // Step 1: Consultant → Field Consultant (EMPLOYS relationship)
    const fieldConsultants = new Set<string>();
    relationships.forEach(rel => {
      if (rel.type === 'EMPLOYS' && consultants.includes(rel.start_node_id)) {
        nodeIds.add(rel.end_node_id); // Add field consultant
        fieldConsultants.add(rel.end_node_id);
        const fc = nodes.find(n => n.id === rel.end_node_id);
        console.log(`   👥 Added Field Consultant: ${fc?.properties?.name || rel.end_node_id}`);
      }
    });

    // Step 2: Field Consultant → Company (COVERS relationship)
    const companies = new Set<string>();
    relationships.forEach(rel => {
      if (rel.type === 'COVERS' && fieldConsultants.has(rel.start_node_id)) {
        nodeIds.add(rel.end_node_id); // Add company
        companies.add(rel.end_node_id);
        const company = nodes.find(n => n.id === rel.end_node_id);
        console.log(`   🏢 Added Company: ${company?.properties?.name || rel.end_node_id}`);
      }
    });

    // Step 3: Company → Products (OWNS relationship)
    relationships.forEach(rel => {
      if (rel.type === 'OWNS' && companies.has(rel.start_node_id)) {
        nodeIds.add(rel.end_node_id); // Add product
        const product = nodes.find(n => n.id === rel.end_node_id);
        console.log(`   📦 Added Product: ${product?.properties?.name || rel.end_node_id}`);
      }
    });
  }


  // 🆕 ENHANCED: Core filtering logic with smart orphan removal
  private applyFiltersLocallyWithOrphanRemoval(data: Neo4jResult, filters: FilterCriteria): Neo4jResult {
    let filteredNodes = [...data.nodes];
    let filteredRelationships = [...data.relationships];
    
    console.log(`🔍 Starting with ${filteredNodes.length} nodes, ${filteredRelationships.length} relationships`);
    
    // Step 1: Apply node type filters
    if (filters.nodeTypes && filters.nodeTypes.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        filters.nodeTypes!.some(type => node.labels.includes(type))
      );
      console.log(`📊 After node type filter: ${filteredNodes.length} nodes`);
    }
    
    // Step 2: Apply geographic filters
    if (filters.sales_regions && filters.sales_regions.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        !node.properties.sales_region || filters.sales_regions!.includes(node.properties.sales_region)
      );
      console.log(`🌍 After sales region filter: ${filteredNodes.length} nodes`);
    }
    
    if (filters.channels && filters.channels.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        !node.properties.channel || filters.channels!.includes(node.properties.channel)
      );
      console.log(`📡 After channel filter: ${filteredNodes.length} nodes`);
    }
    
    // Step 3: Apply entity-specific filters (these create focused subgraphs)
    let focusedFiltering = false;
    
    // 🎯 CONSULTANT FILTERING with connected subgraph
    if (filters.consultantIds && filters.consultantIds.length > 0) {
      console.log(`👔 Filtering to specific consultants: ${filters.consultantIds.join(', ')}`);
      focusedFiltering = true;
      
      const connectedNodeIds = this.getConsultantSubgraph(filteredNodes, filteredRelationships, filters.consultantIds);
      filteredNodes = filteredNodes.filter(node => connectedNodeIds.has(node.id));
      console.log(`🔗 After consultant subgraph filtering: ${filteredNodes.length} nodes`);
    }
    
    // 🎯 COMPANY FILTERING with connected subgraph
    if (filters.clientIds && filters.clientIds.length > 0) {
      console.log(`🏢 Filtering to specific companies: ${filters.clientIds.join(', ')}`);
      focusedFiltering = true;
      
      const connectedNodeIds = this.getCompanySubgraph(filteredNodes, filteredRelationships, filters.clientIds);
      filteredNodes = filteredNodes.filter(node => connectedNodeIds.has(node.id));
      console.log(`🔗 After company subgraph filtering: ${filteredNodes.length} nodes`);
    }
    
    // 🎯 FIELD CONSULTANT FILTERING with connected subgraph
    if (filters.fieldConsultantIds && filters.fieldConsultantIds.length > 0) {
      console.log(`📋 Filtering to specific field consultants: ${filters.fieldConsultantIds.join(', ')}`);
      focusedFiltering = true;
      
      const connectedNodeIds = this.getFieldConsultantSubgraph(filteredNodes, filteredRelationships, filters.fieldConsultantIds);
      filteredNodes = filteredNodes.filter(node => connectedNodeIds.has(node.id));
      console.log(`🔗 After field consultant subgraph filtering: ${filteredNodes.length} nodes`);
    }
    
    // 🎯 PRODUCT FILTERING with connected subgraph
    if (filters.productIds && filters.productIds.length > 0) {
      console.log(`🏦 Filtering to specific products: ${filters.productIds.join(', ')}`);
      focusedFiltering = true;
      
      const connectedNodeIds = this.getProductSubgraph(filteredNodes, filteredRelationships, filters.productIds);
      filteredNodes = filteredNodes.filter(node => connectedNodeIds.has(node.id));
      console.log(`🔗 After product subgraph filtering: ${filteredNodes.length} nodes`);
    }
    
    // Step 4: Filter relationships based on remaining nodes
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    filteredRelationships = filteredRelationships.filter(rel => 
      nodeIds.has(rel.start_node_id) && nodeIds.has(rel.end_node_id)
    );
    console.log(`🔗 After node filtering, relationships: ${filteredRelationships.length}`);
    
    // Step 5: Apply relationship-specific filters
    if (filters.mandateStatuses && filters.mandateStatuses.length > 0) {
      filteredRelationships = filteredRelationships.filter(rel => 
        rel.type !== 'OWNS' || 
        !rel.properties.mandate_status ||
        filters.mandateStatuses!.includes(rel.properties.mandate_status)
      );
      console.log(`📋 After mandate status filter: ${filteredRelationships.length} relationships`);
    }
    
    if (filters.influenceLevels && filters.influenceLevels.length > 0) {
      filteredRelationships = filteredRelationships.filter(rel => 
        rel.type !== 'COVERS' || 
        !rel.properties.level_of_influence ||
        filters.influenceLevels!.includes(String(rel.properties.level_of_influence))
      );
      console.log(`⭐ After influence level filter: ${filteredRelationships.length} relationships`);
    }
    // 🆕 NEW: INCUMBENT PRODUCT FILTERING with connected subgraph
    if (filters.incumbentProductIds && filters.incumbentProductIds.length > 0) {
      console.log(`🎯 Filtering to specific incumbent products: ${filters.incumbentProductIds.join(', ')}`);
      focusedFiltering = true;
      
      const connectedNodeIds = this.getIncumbentProductSubgraph(filteredNodes, filteredRelationships, filters.incumbentProductIds);
      filteredNodes = filteredNodes.filter(node => connectedNodeIds.has(node.id));
      console.log(`🔗 After incumbent product subgraph filtering: ${filteredNodes.length} nodes`);
    }

    
  console.log(`🔗 After node filtering, relationships: ${filteredRelationships.length}`);
    // Step 6: Final orphan removal (unless we did focused filtering)
    if (!focusedFiltering && !filters.showInactive) {
      const connectedNodeIds = new Set([
        ...filteredRelationships.map(r => r.start_node_id),
        ...filteredRelationships.map(r => r.end_node_id)
      ]);
      
      const beforeCount = filteredNodes.length;
      filteredNodes = filteredNodes.filter(node => 
        connectedNodeIds.has(node.id)
      );
      console.log(`🧹 Removed ${beforeCount - filteredNodes.length} orphaned nodes (showInactive=false)`);
    }
    
    const result = { 
      nodes: filteredNodes, 
      relationships: filteredRelationships,
      metadata: {
        originalNodeCount: data.nodes.length,
        originalRelationshipCount: data.relationships.length,
        filteredNodeCount: filteredNodes.length,
        filteredRelationshipCount: filteredRelationships.length,
        filtersApplied: filters,
        focusedFiltering: focusedFiltering
      }
    };
    
    console.log(`✅ Final result: ${result.nodes.length} nodes, ${result.relationships.length} relationships`);
    console.log(`📊 Filtering mode: ${focusedFiltering ? 'Focused Subgraph' : 'General Filtering'}`);
    
    return result;
  }

  // 🆕 Helper method: Get consultant and connected subgraph
  private getConsultantSubgraph(nodes: Neo4jNode[], relationships: Neo4jRelationship[], consultantNames: string[]): Set<string> {
  const connectedNodeIds = new Set<string>();
  
  // Find selected consultants
  const selectedConsultants = nodes.filter(node => 
    node.labels.includes('CONSULTANT') && 
    consultantNames.includes(node.properties.name)
  );
  
  // Add selected consultants
  selectedConsultants.forEach(consultant => {
    connectedNodeIds.add(consultant.id);
    console.log(`🎯 Selected consultant: ${consultant.properties.name} (${consultant.id})`);
  });
  
  // Find field consultants employed by selected consultants
  const employmentEdges = relationships.filter(rel => 
    rel.type === 'EMPLOYS' && 
    selectedConsultants.some(c => c.id === rel.start_node_id)
  );
  
  employmentEdges.forEach(edge => {
    connectedNodeIds.add(edge.end_node_id);
    const fieldConsultant = nodes.find(n => n.id === edge.end_node_id);
    console.log(`  📋 Field consultant: ${fieldConsultant?.properties.name} (${edge.end_node_id})`);
  });
  
  // Find companies covered by these field consultants
  const coverageEdges = relationships.filter(rel => 
    rel.type === 'COVERS' && 
    connectedNodeIds.has(rel.start_node_id)
  );
  
  coverageEdges.forEach(edge => {
    connectedNodeIds.add(edge.end_node_id);
    const company = nodes.find(n => n.id === edge.end_node_id);
    console.log(`    🏢 Company: ${company?.properties.name} (${edge.end_node_id})`);
  });
  
  // Find products owned by these companies (standard path)
  const ownershipEdges = relationships.filter(rel => 
    rel.type === 'OWNS' && 
    connectedNodeIds.has(rel.start_node_id)
  );
  
  ownershipEdges.forEach(edge => {
    connectedNodeIds.add(edge.end_node_id);
    const product = nodes.find(n => n.id === edge.end_node_id);
    
    // Check if this is an INCUMBENT_PRODUCT or regular PRODUCT
    if (product?.labels.includes('INCUMBENT_PRODUCT')) {
      console.log(`      🎯 Incumbent Product: ${product?.properties.name} (${edge.end_node_id})`);
      
      // 🆕 NEW: Find products recommended by this incumbent product via BI_RECOMMENDS
      const recommendationEdges = relationships.filter(rel => 
        rel.type === 'BI_RECOMMENDS' && 
        rel.start_node_id === edge.end_node_id
      );
      
      recommendationEdges.forEach(recEdge => {
        connectedNodeIds.add(recEdge.end_node_id);
        const recommendedProduct = nodes.find(n => n.id === recEdge.end_node_id);
        console.log(`        📦 → Recommended Product: ${recommendedProduct?.properties.name} (${recEdge.end_node_id})`);
      });
      
    } else if (product?.labels.includes('PRODUCT')) {
      console.log(`      📦 Product: ${product?.properties.name} (${edge.end_node_id})`);
    }
  });
  
  return connectedNodeIds;
}

  // 🆕 Helper method: Get company and connected subgraph
  private getCompanySubgraph(nodes: Neo4jNode[], relationships: Neo4jRelationship[], companyNames: string[]): Set<string> {
    const connectedNodeIds = new Set<string>();
    
    // Find selected companies
    const selectedCompanies = nodes.filter(node => 
      node.labels.includes('COMPANY') && 
      companyNames.includes(node.properties.name)
    );
    
    // Add selected companies
    selectedCompanies.forEach(company => {
      connectedNodeIds.add(company.id);
      console.log(`🎯 Selected company: ${company.properties.name} (${company.id})`);
    });
    
    // Find field consultants covering these companies
    const coverageEdges = relationships.filter(rel => 
      rel.type === 'COVERS' && 
      selectedCompanies.some(c => c.id === rel.end_node_id)
    );
    
    coverageEdges.forEach(edge => {
      connectedNodeIds.add(edge.start_node_id);
      const fieldConsultant = nodes.find(n => n.id === edge.start_node_id);
      console.log(`  📋 Field consultant: ${fieldConsultant?.properties.name} (${edge.start_node_id})`);
    });
    
    // Find consultants employing these field consultants
    const employmentEdges = relationships.filter(rel => 
      rel.type === 'EMPLOYS' && 
      connectedNodeIds.has(rel.end_node_id)
    );
    
    employmentEdges.forEach(edge => {
      connectedNodeIds.add(edge.start_node_id);
      const consultant = nodes.find(n => n.id === edge.start_node_id);
      console.log(`👨‍💼 Consultant: ${consultant?.properties.name} (${edge.start_node_id})`);
    });
    
    // Find products owned by selected companies
    const ownershipEdges = relationships.filter(rel => 
      rel.type === 'OWNS' && 
      selectedCompanies.some(c => c.id === rel.start_node_id)
    );
    
    ownershipEdges.forEach(edge => {
      connectedNodeIds.add(edge.end_node_id);
      const product = nodes.find(n => n.id === edge.end_node_id);
      
      // Check if this is an INCUMBENT_PRODUCT or regular PRODUCT
      if (product?.labels.includes('INCUMBENT_PRODUCT')) {
        console.log(`  🎯 Incumbent Product: ${product?.properties.name} (${edge.end_node_id})`);
        
        // 🆕 NEW: Find products recommended by this incumbent product via BI_RECOMMENDS
        const recommendationEdges = relationships.filter(rel => 
          rel.type === 'BI_RECOMMENDS' && 
          rel.start_node_id === edge.end_node_id
        );
        
        recommendationEdges.forEach(recEdge => {
          connectedNodeIds.add(recEdge.end_node_id);
          const recommendedProduct = nodes.find(n => n.id === recEdge.end_node_id);
          console.log(`    📦 → Recommended Product: ${recommendedProduct?.properties.name} (${recEdge.end_node_id})`);
        });
        
      } else if (product?.labels.includes('PRODUCT')) {
        console.log(`  📦 Product: ${product?.properties.name} (${edge.end_node_id})`);
      }
    });
    
    return connectedNodeIds;
  }

  // 🆕 Helper method: Get field consultant and connected subgraph
  private getFieldConsultantSubgraph(nodes: Neo4jNode[], relationships: Neo4jRelationship[], fieldConsultantNames: string[]): Set<string> {
    const connectedNodeIds = new Set<string>();
    
    const selectedFieldConsultants = nodes.filter(node => 
      node.labels.includes('FIELD_CONSULTANT') && 
      fieldConsultantNames.includes(node.properties.name)
    );
    
    // Add selected field consultants
    selectedFieldConsultants.forEach(fc => {
      connectedNodeIds.add(fc.id);
      console.log(`🎯 Selected field consultant: ${fc.properties.name} (${fc.id})`);
    });
    
    // Find their parent consultants
    const employmentEdges = relationships.filter(rel => 
      rel.type === 'EMPLOYS' && 
      selectedFieldConsultants.some(fc => fc.id === rel.end_node_id)
    );
    
    employmentEdges.forEach(edge => {
      connectedNodeIds.add(edge.start_node_id);
      const consultant = nodes.find(n => n.id === edge.start_node_id);
      console.log(`👨‍💼 Consultant: ${consultant?.properties.name} (${edge.start_node_id})`);
    });
    
    // Find companies covered by selected field consultants
    const coverageEdges = relationships.filter(rel => 
      rel.type === 'COVERS' && 
      selectedFieldConsultants.some(fc => fc.id === rel.start_node_id)
    );
    
    coverageEdges.forEach(edge => {
      connectedNodeIds.add(edge.end_node_id);
      const company = nodes.find(n => n.id === edge.end_node_id);
      console.log(`  🏢 Company: ${company?.properties.name} (${edge.end_node_id})`);
    });
    
    // Find products owned by covered companies
    const companies = Array.from(connectedNodeIds).filter(id => {
      const node = nodes.find(n => n.id === id);
      return node?.labels.includes('COMPANY');
    });
    
    const ownershipEdges = relationships.filter(rel => 
      rel.type === 'OWNS' && companies.includes(rel.start_node_id)
    );
    
    ownershipEdges.forEach(edge => {
      connectedNodeIds.add(edge.end_node_id);
      const product = nodes.find(n => n.id === edge.end_node_id);
      
      // 🔧 NEW: Check if this is an INCUMBENT_PRODUCT or regular PRODUCT
      if (product?.labels.includes('INCUMBENT_PRODUCT')) {
        console.log(`    🎯 Incumbent Product: ${product?.properties.name} (${edge.end_node_id})`);
        
        // 🆕 NEW: Find products recommended by this incumbent product via BI_RECOMMENDS
        const recommendationEdges = relationships.filter(rel => 
          rel.type === 'BI_RECOMMENDS' && 
          rel.start_node_id === edge.end_node_id
        );
        
        recommendationEdges.forEach(recEdge => {
          connectedNodeIds.add(recEdge.end_node_id);
          const recommendedProduct = nodes.find(n => n.id === recEdge.end_node_id);
          console.log(`      📦 → Recommended Product: ${recommendedProduct?.properties.name} (${recEdge.end_node_id})`);
        });
        
      } else if (product?.labels.includes('PRODUCT')) {
        console.log(`    📦 Product: ${product?.properties.name} (${edge.end_node_id})`);
      }
    });
    
    return connectedNodeIds;
  }

  // 🆕 Helper method: Get product and connected subgraph
  private getProductSubgraph(nodes: Neo4jNode[], relationships: Neo4jRelationship[], productNames: string[]): Set<string> {
    const connectedNodeIds = new Set<string>();
    
    const selectedProducts = nodes.filter(node => 
      (node.labels.includes('PRODUCT') || node.labels.includes('INCUMBENT_PRODUCT')) && 
      productNames.includes(node.properties.name)
    );
    
    // Add selected products
    selectedProducts.forEach(product => {
      connectedNodeIds.add(product.id);
      console.log(`🎯 Selected product: ${product.properties.name} (${product.id})`);
    });
    
    // 🆕 NEW: Handle BI_RECOMMENDS relationships for both directions
    
    // Find incumbent products that recommend selected products (reverse BI_RECOMMENDS)
    const reverseRecommendationEdges = relationships.filter(rel => 
      rel.type === 'BI_RECOMMENDS' && 
      selectedProducts.some(p => p.id === rel.end_node_id)
    );
    
    reverseRecommendationEdges.forEach(edge => {
      connectedNodeIds.add(edge.start_node_id);
      const incumbentProduct = nodes.find(n => n.id === edge.start_node_id);
      console.log(`  🎯 ← Incumbent Product (recommends this): ${incumbentProduct?.properties.name} (${edge.start_node_id})`);
    });
    
    // Find products recommended by selected incumbent products (forward BI_RECOMMENDS)
    const forwardRecommendationEdges = relationships.filter(rel => 
      rel.type === 'BI_RECOMMENDS' && 
      selectedProducts.some(p => p.id === rel.start_node_id)
    );
    
    forwardRecommendationEdges.forEach(edge => {
      connectedNodeIds.add(edge.end_node_id);
      const recommendedProduct = nodes.find(n => n.id === edge.end_node_id);
      console.log(`  📦 → Recommended Product: ${recommendedProduct?.properties.name} (${edge.end_node_id})`);
    });
    
    // Find companies owning these products (including incumbent products)
    const ownershipEdges = relationships.filter(rel => 
      rel.type === 'OWNS' && 
      connectedNodeIds.has(rel.end_node_id)
    );
    
    ownershipEdges.forEach(edge => {
      connectedNodeIds.add(edge.start_node_id);
      const company = nodes.find(n => n.id === edge.start_node_id);
      console.log(`  🏢 Company: ${company?.properties.name} (${edge.start_node_id})`);
    });
    
    // Find field consultants covering these companies
    const companies = Array.from(connectedNodeIds).filter(id => {
      const node = nodes.find(n => n.id === id);
      return node?.labels.includes('COMPANY');
    });
    
    const coverageEdges = relationships.filter(rel => 
      rel.type === 'COVERS' && companies.includes(rel.end_node_id)
    );
    
    coverageEdges.forEach(edge => {
      connectedNodeIds.add(edge.start_node_id);
      const fieldConsultant = nodes.find(n => n.id === edge.start_node_id);
      console.log(`    📋 Field consultant: ${fieldConsultant?.properties.name} (${edge.start_node_id})`);
    });
    
    // Find consultants employing these field consultants
    const fieldConsultants = Array.from(connectedNodeIds).filter(id => {
      const node = nodes.find(n => n.id === id);
      return node?.labels.includes('FIELD_CONSULTANT');
    });
    
    const employmentEdges = relationships.filter(rel => 
      rel.type === 'EMPLOYS' && fieldConsultants.includes(rel.end_node_id)
    );
    
    employmentEdges.forEach(edge => {
      connectedNodeIds.add(edge.start_node_id);
      const consultant = nodes.find(n => n.id === edge.start_node_id);
      console.log(`      👨‍💼 Consultant: ${consultant?.properties.name} (${edge.start_node_id})`);
    });
    
    return connectedNodeIds;
  }
  
  private getIncumbentProductSubgraph(nodes: Neo4jNode[], relationships: Neo4jRelationship[], incumbentProductNames: string[]): Set<string> {
    const connectedNodeIds = new Set<string>();
    
    const selectedIncumbentProducts = nodes.filter(node => 
      node.labels.includes('INCUMBENT_PRODUCT') && 
      incumbentProductNames.includes(node.properties.name)
    );
    
    // Add selected incumbent products
    selectedIncumbentProducts.forEach(product => {
      connectedNodeIds.add(product.id);
      console.log(`🎯 Selected incumbent product: ${product.properties.name} (${product.id})`);
    });
    
    // Find products recommended by these incumbent products
    const recommendationEdges = relationships.filter(rel => 
      rel.type === 'BI_RECOMMENDS' && 
      selectedIncumbentProducts.some(p => p.id === rel.start_node_id)
    );
    
    recommendationEdges.forEach(edge => {
      connectedNodeIds.add(edge.end_node_id);
      const recommendedProduct = nodes.find(n => n.id === edge.end_node_id);
      console.log(`  📦 → Recommended Product: ${recommendedProduct?.properties.name} (${edge.end_node_id})`);
    });
    
    // Find companies owning these incumbent products
    const ownershipEdges = relationships.filter(rel => 
      rel.type === 'OWNS' && 
      selectedIncumbentProducts.some(p => p.id === rel.end_node_id)
    );
    
    ownershipEdges.forEach(edge => {
      connectedNodeIds.add(edge.start_node_id);
      const company = nodes.find(n => n.id === edge.start_node_id);
      console.log(`  🏢 Company: ${company?.properties.name} (${edge.start_node_id})`);
    });
    
    // Continue with standard path (field consultants, consultants)
    const companies = Array.from(connectedNodeIds).filter(id => {
      const node = nodes.find(n => n.id === id);
      return node?.labels.includes('COMPANY');
    });
    
    const coverageEdges = relationships.filter(rel => 
      rel.type === 'COVERS' && companies.includes(rel.end_node_id)
    );
    
    coverageEdges.forEach(edge => {
      connectedNodeIds.add(edge.start_node_id);
      const fieldConsultant = nodes.find(n => n.id === edge.start_node_id);
      console.log(`    📋 Field consultant: ${fieldConsultant?.properties.name} (${edge.start_node_id})`);
    });
    
    const fieldConsultants = Array.from(connectedNodeIds).filter(id => {
      const node = nodes.find(n => n.id === id);
      return node?.labels.includes('FIELD_CONSULTANT');
    });
    
    const employmentEdges = relationships.filter(rel => 
      rel.type === 'EMPLOYS' && fieldConsultants.includes(rel.end_node_id)
    );
    
    employmentEdges.forEach(edge => {
      connectedNodeIds.add(edge.start_node_id);
      const consultant = nodes.find(n => n.id === edge.start_node_id);
      console.log(`      👨‍💼 Consultant: ${consultant?.properties.name} (${edge.start_node_id})`);
    });
    
    return connectedNodeIds;
  }
  private extractFilterOptionsFromData(data: Neo4jResult): FilterOptions {
    const options: Record<string, Set<string>> = {
      regions: new Set(['NAI', 'EMEA', 'APAC']),
      sales_regions: new Set(),
      channels: new Set(),
      assetClasses: new Set(),
      consultants: new Set(),
      fieldConsultants: new Set(),
      clients: new Set(),
      products: new Set(),
      incumbent_products: new Set(),
      pcas: new Set(),
      acas: new Set(),
      ratings: new Set(['Positive', 'Negative', 'Neutral', 'Introduced']),
      mandateStatuses: new Set(['Active', 'At Risk', 'Conversion in Progress']),
      jpm_flags: new Set(['Y', 'N']),
      privacy_levels: new Set(['Public', 'Private', 'Confidential']),
      influenceLevels: new Set(['1', '2', '3', '4'])
    };
    
    data.nodes.forEach(node => {
      const props = node.properties;
      
      if (props.sales_region) options.sales_regions.add(props.sales_region);
      if (props.channel) options.channels.add(props.channel);
      if (props.asset_class) options.assetClasses.add(props.asset_class);
      if (props.pca) options.pcas.add(props.pca);
      if (props.aca) options.acas.add(props.aca);
      if (props.jpm_flag) options.jpm_flags.add(props.jpm_flag);
      if (props.privacy) options.privacy_levels.add(props.privacy);
      
      if (node.labels.includes('CONSULTANT') && props.name) {
        options.consultants.add(props.name);
      }
      if (node.labels.includes('FIELD_CONSULTANT') && props.name) {
        options.fieldConsultants.add(props.name);
      }
      if (node.labels.includes('COMPANY') && props.name) {
        options.clients.add(props.name);
      }
      if (node.labels.includes('PRODUCT') && props.name) {
        options.products.add(props.name);
      }
      if (node.labels.includes('INCUMBENT_PRODUCT') && props.name) {
        options.incumbent_products.add(props.name);
      }
    });
    
    data.relationships.forEach(rel => {
      if (rel.type === 'RATES' && rel.properties.rankgroup) {
        options.ratings.add(rel.properties.rankgroup);
      }
      if (rel.type === 'OWNS' && rel.properties.mandate_status) {
        options.mandateStatuses.add(rel.properties.mandate_status);
      }
      if (rel.type === 'COVERS' && rel.properties.level_of_influence) {
        options.influenceLevels.add(String(rel.properties.level_of_influence));
      }
    });
    
    const result: FilterOptions = {} as FilterOptions;
    Object.entries(options).forEach(([key, set]) => {
      result[key as keyof FilterOptions] = Array.from(set).sort() as any;
    });
    
    console.log('✅ Local filter options extracted:', {
      regions: result.regions.length,
      sales_regions: result.sales_regions.length,
      channels: result.channels.length,
      consultants: result.consultants.length,
      products: result.products.length
    });
    
    return result;
  }
  
  private getEmptyFilterOptions(): FilterOptions {
    return {
      regions: ['NAI', 'EMEA', 'APAC'],
      sales_regions: [],
      channels: [],
      assetClasses: [],
      consultants: [],
      fieldConsultants: [],
      clients: [],
      products: [],
      incumbent_products: [],
      pcas: [],
      acas: [],
      clientAdvisors: [], // Company PCA + ACA combined
     consultantAdvisors: [], // Consultant PCA + Advisor combined
      ratings: ['Positive', 'Negative', 'Neutral', 'Introduced'],
      mandateStatuses: ['Active', 'At Risk', 'Conversion in Progress'],
      jpm_flags: ['Y', 'N'],
      privacy_levels: ['Public', 'Private', 'Confidential'],
      influenceLevels: ['1', '2', '3', '4', 'UNK', 'High', 'medium', 'low'],
    };
  }
  
  clearCache(): void {
    this.regionDataCache.clear();
    this.filterOptionsCache.clear();
    console.log('🧹 API service cache cleared');
  }
}

export default ApiNeo4jService;