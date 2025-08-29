// services/MockNeo4jService.ts
import { generateSampleGraph, addCrossLinks } from '../utils/GraphGenerator';
import { AppNodeData, EdgeData, RankGroup } from '../types/GraphTypes';

interface Neo4jNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

interface Neo4jRelationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, any>;
}

interface Neo4jResult {
  nodes: Neo4jNode[];
  relationships: Neo4jRelationship[];
}

// Update your FilterCriteria and FilterOptions interfaces in MockNeo4jService.ts:

export interface FilterCriteria {
  regions?: string[];
  nodeTypes?: string[];
  sales_regions?: string[];
  channels?: string[];
  ratings?: string[];
  influenceLevels?: string[];    // ✅ ADD THIS - Missing property
  assetClasses?: string[];
  consultantIds?: string[];
  fieldConsultantIds?: string[];
  clientIds?: string[];
  productIds?: string[];
  pcaIds?: string[];
  acaIds?: string[];
  mandateStatuses?: string[];    // ✅ Keep camelCase for frontend
  showInactive?: boolean;
}

export interface FilterOptions {
  regions: string[];
  sales_regions: string[];
  channels: string[];
  assetClasses: string[];
  consultants: string[];
  fieldConsultants: string[];
  clients: string[];
  products: string[];
  incumbent_products: string[];
  pcas: string[];
  acas: string[];
  ratings: string[];
  influenceLevels: string[];     // ✅ ADD THIS - Missing property
  mandateStatuses: string[];     // ✅ Keep camelCase for frontend (not mandate_statuses)
  jpm_flags: string[];
  privacy_levels: string[];
}


export default class MockNeo4jService {
  private static instance: MockNeo4jService;
  private fullDataset: Neo4jResult;
  private regionDataCache: Map<string, Neo4jResult> = new Map();
  
  private constructor() {
    this.fullDataset = this.generateFullMockDataset();
    this.preloadRegionData();
  }
  
  static getInstance(): MockNeo4jService {
    if (!MockNeo4jService.instance) {
      MockNeo4jService.instance = new MockNeo4jService();
    }
    return MockNeo4jService.instance;
  }
  
  /**
   * Step 1: Get data for specific regions (default: NAI)
   * This is the primary method that drives everything else
   */
  async getRegionData(regions: string[] = ['NAI']): Promise<Neo4jResult> {
    console.log(`🔍 Loading data for regions: ${regions.join(', ')}`);
    
    // Simulate network delay
    await this.simulateNetworkDelay();
    
    if (regions.length === 1 && this.regionDataCache.has(regions[0])) {
      console.log(`📋 Using cached data for ${regions[0]}`);
      return this.regionDataCache.get(regions[0])!;
    }
    
    // Filter full dataset by regions - STRICT filtering
    const filteredNodes = this.fullDataset.nodes.filter(node => {
      // If node has no region property, exclude it
      if (!node.properties.region) {
        console.log(`⚠️ Node ${node.id} (${node.labels[0]}) has no region, excluding`);
        return false;
      }
      // Only include nodes that match the requested regions exactly
      const matches = regions.includes(node.properties.region);
      if (!matches) {
        console.log(`❌ Node ${node.id} (${node.labels[0]}) region ${node.properties.region} not in ${regions.join(', ')}`);
      } else {
        console.log(`✅ Node ${node.id} (${node.labels[0]}) region ${node.properties.region} matches filter`);
      }
      return matches;
    });
    
    console.log(`📊 Region filtering result: ${filteredNodes.length} nodes from ${this.fullDataset.nodes.length} total`);
    console.log(`📋 Filtered nodes by region:`, {
      ...regions.reduce((acc, region) => {
        acc[region] = filteredNodes.filter(n => n.properties.region === region).length;
        return acc;
      }, {} as Record<string, number>)
    });
    
    // Get relationships for filtered nodes
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredRelationships = this.fullDataset.relationships.filter(rel => 
      nodeIds.has(rel.startNodeId) && nodeIds.has(rel.endNodeId)
    );
    
    console.log(`🔗 Relationship filtering: ${filteredRelationships.length} relationships from ${this.fullDataset.relationships.length} total`);
    
    // 🆕 DEBUG: Log OWNS relationships with mandate status
    const ownsRelationships = filteredRelationships.filter(rel => rel.type === 'OWNS');
    console.log(`🏢 OWNS relationships found: ${ownsRelationships.length}`);
    ownsRelationships.forEach(rel => {
      console.log(`  📄 OWNS: ${rel.startNodeId} -> ${rel.endNodeId} | Mandate: ${rel.properties.mandateStatus}`);
    });
    
    const result = { nodes: filteredNodes, relationships: filteredRelationships };
    
    // Cache single region results
    if (regions.length === 1) {
      this.regionDataCache.set(regions[0], result);
      console.log(`💾 Cached data for ${regions[0]}`);
    }
    
    return result;
  }
  
  /**
   * Step 2: Extract filter options from region data
   * This populates the filter dropdowns based on current region selection
   */
  async getFilterOptionsFromData(data: Neo4jResult): Promise<FilterOptions> {
    console.log('📊 Extracting filter options from data...', {
      totalNodes: data.nodes.length,
      nodesByType: {
        consultants: data.nodes.filter(n => n.labels.includes('CONSULTANT')).length,
        fieldConsultants: data.nodes.filter(n => n.labels.includes('FIELD_CONSULTANT')).length,
        companies: data.nodes.filter(n => n.labels.includes('COMPANY')).length,
        products: data.nodes.filter(n => n.labels.includes('PRODUCT')).length
      }
    });
    
    const options: Record<string, Set<string>> = {
      regions: new Set(['NAI', 'EMEA', 'APAC']), // Always show all regions
      sales_regions: new Set(),
      channels: new Set(),
      assetClasses: new Set(),
      consultants: new Set(),
      fieldConsultants: new Set(),
      clients: new Set(),
      products: new Set(),
      pcas: new Set(),
      acas: new Set(),
      ratings: new Set(['Positive', 'Negative', 'Introduced', 'Neutral']),
      influenceLevels: new Set(['1', '2', '3', '4', 'UNK', 'High', 'medium', 'low']),
      
      // 🆕 FIXED: Only three mandate statuses
      mandateStatuses: new Set(['Active', 'At Risk', 'Conversion in Progress'])
    };
    
    // Extract unique values from the provided data (region-specific)
    data.nodes.forEach(node => {
      const props = node.properties;
      
      // Geographic attributes
      if (props.sales_region) options.sales_regions.add(props.sales_region);
      if (props.channel) options.channels.add(props.channel);
      
      // Entity attributes
      if (props.asset_class) options.assetClasses.add(props.asset_class);
      if (props.pca) options.pcas.add(props.pca);
      if (props.aca) options.acas.add(props.aca);
      
      // Entity names (only from current region data) - Fixed logic
      if (node.labels.includes('CONSULTANT') && props.name) {
        options.consultants.add(props.name);
        console.log('➕ Added consultant:', props.name);
      }
      if (node.labels.includes('FIELD_CONSULTANT') && props.name) {
        options.fieldConsultants.add(props.name);
        console.log('➕ Added field consultant:', props.name);
      }
      if (node.labels.includes('COMPANY') && props.name) {
        options.clients.add(props.name);
        console.log('➕ Added client:', props.name);
      }
      if (node.labels.includes('PRODUCT') && props.name) {
        options.products.add(props.name);
        console.log('➕ Added product:', props.name);
      }
    });
    
    // 🆕 EXTRACT: Mandate statuses from actual OWNS relationships
    data.relationships.forEach(rel => {
      if (rel.type === 'OWNS' && rel.properties.mandateStatus) {
        options.mandateStatuses.add(rel.properties.mandateStatus);
        console.log(`📄 Found mandate status: ${rel.properties.mandateStatus}`);
      }
    });
    
    // Convert Sets to sorted Arrays
    const result: FilterOptions = {} as FilterOptions;
    Object.entries(options).forEach(([key, set]) => {
      result[key as keyof FilterOptions] = Array.from(set).sort() as any;
    });
    
    console.log('✅ Filter options extracted:', {
      regions: result.regions.length,
      sales_regions: result.sales_regions.length,
      channels: result.channels.length,
      assetClasses: result.assetClasses.length,
      consultants: result.consultants.length,
      fieldConsultants: result.fieldConsultants.length,
      clients: result.clients.length,
      products: result.products.length,
      pcas: result.pcas.length,
      acas: result.acas.length,
      mandateStatuses: result.mandateStatuses.length
    });
    
    // 🆕 DEBUG: Show mandate statuses
    console.log('📋 Available mandate statuses:', result.mandateStatuses);
    
    // Debug: Show actual values for entities
    console.log('🔍 Sample entity values:', {
      consultants: result.consultants.slice(0, 3),
      fieldConsultants: result.fieldConsultants.slice(0, 3),
      clients: result.clients.slice(0, 3),
      products: result.products.slice(0, 3)
    });
    
    return result;
  }
  
  /**
   * Step 3: Apply filters to data (when user clicks "Apply Filter")
   * This takes the region data and applies additional filters
   */
  async applyFiltersToData(data: Neo4jResult, filters: FilterCriteria): Promise<Neo4jResult> {
    console.log('🔧 Applying filters:', filters);
    
    // Simulate processing time
    await this.simulateNetworkDelay(50, 150);
    
    let filteredNodes = [...data.nodes];
    let filteredRelationships = [...data.relationships];
    
    // Apply node type filters
    if (filters.nodeTypes && filters.nodeTypes.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        filters.nodeTypes!.some(type => node.labels.includes(type))
      );
      console.log(`🔍 After node type filter: ${filteredNodes.length} nodes`);
    }
    
    // Apply geographic filters
    if (filters.sales_regions && filters.sales_regions.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        !node.properties.sales_region || filters.sales_regions!.includes(node.properties.sales_region)
      );
      console.log(`🔍 After sales region filter: ${filteredNodes.length} nodes`);
    }
    
    if (filters.channels && filters.channels.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        !node.properties.channel || filters.channels!.includes(node.properties.channel)
      );
      console.log(`🔍 After channel filter: ${filteredNodes.length} nodes`);
    }
    
    // Apply asset class filters
    if (filters.assetClasses && filters.assetClasses.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        !node.properties.asset_class || filters.assetClasses!.includes(node.properties.asset_class)
      );
      console.log(`🔍 After asset class filter: ${filteredNodes.length} nodes`);
    }
    
    // FIXED: Apply entity-specific filters by NAME (not by node type check)
    if (filters.consultantIds && filters.consultantIds.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        // Keep non-consultant nodes OR consultants that are in the filter list
        !node.labels.includes('CONSULTANT') || 
        filters.consultantIds!.includes(node.properties.name)
      );
      console.log(`🔍 After consultant filter: ${filteredNodes.length} nodes (keeping: ${filters.consultantIds.join(', ')})`);
    }
    
    if (filters.fieldConsultantIds && filters.fieldConsultantIds.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        // Keep non-field-consultant nodes OR field consultants that are in the filter list
        !node.labels.includes('FIELD_CONSULTANT') || 
        filters.fieldConsultantIds!.includes(node.properties.name)
      );
      console.log(`🔍 After field consultant filter: ${filteredNodes.length} nodes`);
    }
    
    if (filters.clientIds && filters.clientIds.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        // Keep non-company nodes OR companies that are in the filter list
        !node.labels.includes('COMPANY') || 
        filters.clientIds!.includes(node.properties.name)
      );
      console.log(`🔍 After client filter: ${filteredNodes.length} nodes`);
    }
    
    if (filters.productIds && filters.productIds.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        // Keep non-product nodes OR products that are in the filter list
        !node.labels.includes('PRODUCT') || 
        filters.productIds!.includes(node.properties.name)
      );
      console.log(`🔍 After product filter: ${filteredNodes.length} nodes`);
    }
    
    // Apply PCA/ACA filters
    if (filters.pcaIds && filters.pcaIds.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        !node.properties.pca || filters.pcaIds!.includes(node.properties.pca)
      );
      console.log(`🔍 After PCA filter: ${filteredNodes.length} nodes`);
    }
    
    if (filters.acaIds && filters.acaIds.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        !node.properties.aca || filters.acaIds!.includes(node.properties.aca)
      );
      console.log(`🔍 After ACA filter: ${filteredNodes.length} nodes`);
    }
    
    // FIXED: Apply rating filters (for products with ratings)
    if (filters.ratings && filters.ratings.length > 0) {
      filteredNodes = filteredNodes.filter(node => {
        // Keep non-product nodes
        if (!node.labels.includes('PRODUCT')) return true;
        
        // For products, check if they have any ratings that match the filter
        if (!node.properties.ratings || !Array.isArray(node.properties.ratings)) return false;
        
        const hasMatchingRating = node.properties.ratings.some((rating: any) => 
          filters.ratings!.includes(rating.rankgroup)
        );
        
        console.log(`🔍 Product ${node.properties.name} ratings: ${node.properties.ratings.map((r: any) => r.rankgroup).join(', ')} - Match: ${hasMatchingRating}`);
        return hasMatchingRating;
      });
      console.log(`🔍 After ratings filter: ${filteredNodes.length} nodes (filtering for: ${filters.ratings.join(', ')})`);
    }
    
    // Filter relationships based on remaining nodes
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    filteredRelationships = filteredRelationships.filter(rel => 
      nodeIds.has(rel.startNodeId) && nodeIds.has(rel.endNodeId)
    );
    console.log(`🔍 After node filtering, relationships: ${filteredRelationships.length}`);
    
    // Apply relationship-specific filters
    if (filters.influenceLevels && filters.influenceLevels.length > 0) {
      filteredRelationships = filteredRelationships.filter(rel => 
        rel.type !== 'COVERS' || 
        !rel.properties.levelOfInfluence ||
        filters.influenceLevels!.includes(String(rel.properties.levelOfInfluence))
      );
      console.log(`🔍 After influence level filter: ${filteredRelationships.length} relationships`);
    }
    
    // 🆕 ENHANCED: Mandate status filtering with detailed logging
    if (filters.mandateStatuses && filters.mandateStatuses.length > 0) {
      const beforeCount = filteredRelationships.length;
      const ownsBeforeFilter = filteredRelationships.filter(rel => rel.type === 'OWNS');
      
      console.log(`📄 Before mandate filter: ${ownsBeforeFilter.length} OWNS relationships`);
      ownsBeforeFilter.forEach(rel => {
        console.log(`  📋 OWNS: ${rel.startNodeId} -> ${rel.endNodeId} | Status: ${rel.properties.mandateStatus}`);
      });
      
      filteredRelationships = filteredRelationships.filter(rel => {
        // Keep all non-OWNS relationships
        if (rel.type !== 'OWNS') return true;
        
        // For OWNS relationships, check mandate status
        if (!rel.properties.mandateStatus) {
          console.log(`⚠️ OWNS relationship ${rel.id} has no mandate status`);
          return false;
        }
        
        const matches = filters.mandateStatuses!.includes(rel.properties.mandateStatus);
        console.log(`📄 OWNS ${rel.id}: ${rel.properties.mandateStatus} ${matches ? '✅ KEEP' : '❌ FILTER OUT'}`);
        return matches;
      });
      
      const ownsAfterFilter = filteredRelationships.filter(rel => rel.type === 'OWNS');
      console.log(`📄 After mandate filter: ${ownsAfterFilter.length} OWNS relationships (was ${ownsBeforeFilter.length})`);
      console.log(`🔍 Total relationships after mandate filter: ${filteredRelationships.length} (was ${beforeCount})`);
    }
    
    // FIXED: Handle orphaned nodes based on showInactive setting
    if (!filters.showInactive) {
      // Remove nodes that have no connections (orphaned nodes)
      const connectedNodeIds = new Set([
        ...filteredRelationships.map(r => r.startNodeId),
        ...filteredRelationships.map(r => r.endNodeId)
      ]);
      
      const beforeCount = filteredNodes.length;
      filteredNodes = filteredNodes.filter(node => 
        connectedNodeIds.has(node.id)
      );
      console.log(`🔍 Removed ${beforeCount - filteredNodes.length} orphaned nodes (showInactive=false)`);
    }
    
    const result = { nodes: filteredNodes, relationships: filteredRelationships };
    console.log(`✅ Final result: ${result.nodes.length} nodes, ${result.relationships.length} relationships`);
    
    // 🆕 FINAL DEBUG: Log final OWNS relationships
    const finalOwnsRelationships = result.relationships.filter(rel => rel.type === 'OWNS');
    console.log(`📄 Final OWNS relationships: ${finalOwnsRelationships.length}`);
    finalOwnsRelationships.forEach(rel => {
      console.log(`  ✅ Final OWNS: ${rel.startNodeId} -> ${rel.endNodeId} | Status: ${rel.properties.mandateStatus}`);
    });
    
    return result;
  }
  
  private generateFullMockDataset(): Neo4jResult {
    const allRegions = ['NAI', 'EMEA', 'APAC'];
    const allNodes: Neo4jNode[] = [];
    const allRelationships: Neo4jRelationship[] = [];
    let relationshipCounter = 0;
    
    // Generate data for each region
    allRegions.forEach((region, regionIndex) => {
      console.log(`🏭 Generating data for region: ${region}`);
      
      const { nodes: reactFlowNodes, edges: reactFlowEdges } = generateSampleGraph({
        consultants: 2,        // Reduced for cleaner data
        fieldPerConsultant: 2, // Reduced to ensure connections
        companiesPerField: 1,  // Reduced to avoid too many orphans
        productsPerCompany: 1  // Ensure 1:1 relationship
      });
      
      console.log(`📊 Generated for ${region}:`, {
        consultants: reactFlowNodes.filter(n => n.type === 'CONSULTANT').length,
        fieldConsultants: reactFlowNodes.filter(n => n.type === 'FIELD_CONSULTANT').length,
        companies: reactFlowNodes.filter(n => n.type === 'COMPANY').length,
        products: reactFlowNodes.filter(n => n.type === 'PRODUCT').length,
        relationships: reactFlowEdges.length
      });
      
      // Add SOME cross-links but not too many
      const enhanced = addCrossLinks(reactFlowNodes, reactFlowEdges, {
        extraCoversPerField: 0, // Reduced to avoid complexity
        extraRatingsPerProduct: 1
      });
      
      console.log(`🔗 After cross-links for ${region}:`, {
        nodes: enhanced.nodes.length,
        edges: enhanced.edges.length,
        productNodes: enhanced.nodes.filter(n => n.type === 'PRODUCT').length
      });
      
      // 🆕 NEW: Create a mapping of field consultants to their parent consultants
      const consultantToFieldMapping = new Map<string, string[]>();
      const fieldToConsultantMapping = new Map<string, string>();
      
      // First pass: identify consultant-field consultant relationships from edges
      enhanced.edges.forEach(edge => {
        if (edge.data?.relType === 'EMPLOYS') {
          const consultantId = edge.source;
          const fieldConsultantId = edge.target;
          
          // Build the mapping
          if (!consultantToFieldMapping.has(consultantId)) {
            consultantToFieldMapping.set(consultantId, []);
          }
          consultantToFieldMapping.get(consultantId)!.push(fieldConsultantId);
          fieldToConsultantMapping.set(fieldConsultantId, consultantId);
          
          console.log(`👔 Mapping: Consultant ${consultantId} employs Field Consultant ${fieldConsultantId}`);
        }
      });
      
      // Convert to Neo4j format with region-specific IDs and realistic data
      enhanced.nodes.forEach(node => {
        // Create more realistic data based on node type
        let enhancedData = { ...node.data };
        const regionNodeId = `${region}_${node.id}`;
        
        if (node.type === 'CONSULTANT') {
          enhancedData = {
            ...enhancedData,
            name: `${node.data?.name?.replace(/\d+/, '')} ${regionIndex * 3 + parseInt(node.id.replace(/\D/g, ''))} (${region})`,
            region: region,
            sales_region: ['East', 'West', 'Central', 'International'][Math.floor(Math.random() * 4)],
            channel: ['Consultant Sales', 'North Americas Institutional DC', 'Asia Institutional'][Math.floor(Math.random() * 3)],
            pca: `PCA_${regionIndex * 3 + parseInt(node.id.replace(/\D/g, ''))}`
          };
        } else if (node.type === 'FIELD_CONSULTANT') {
          // 🆕 NEW: Set parentConsultantId for field consultants
          const parentConsultantId = fieldToConsultantMapping.get(node.id);
          const regionParentConsultantId = parentConsultantId ? `${region}_${parentConsultantId}` : undefined;
          
          enhancedData = {
            ...enhancedData,
            name: `${node.data?.name?.replace(/\d+/, '')} ${regionIndex * 6 + parseInt(node.id.replace(/\D/g, ''))} (${region})`,
            region: region,
            parentConsultantId: regionParentConsultantId, // 🆕 NEW: Explicit parent reference
            sales_region: ['East', 'West', 'Central', 'International'][Math.floor(Math.random() * 4)],
            channel: ['Consultant Sales', 'Beta Strategies'][Math.floor(Math.random() * 2)]
          };
          
          console.log(`👨‍💼 Field Consultant ${regionNodeId} -> Parent: ${regionParentConsultantId}`);
        } else if (node.type === 'COMPANY') {
          enhancedData = {
            ...enhancedData,
            name: `${node.data?.name?.replace(/\d+/, '')} ${regionIndex * 6 + parseInt(node.id.replace(/\D/g, ''))} (${region})`,
            region: region,
            privacy: ['Public', 'Private', 'Confidential'][Math.floor(Math.random() * 3)],
            sales_region: ['East', 'West', 'Central', 'International'][Math.floor(Math.random() * 4)],
            channel: ['Direct', 'Partner', 'Digital', 'Institutional'][Math.floor(Math.random() * 4)],
            aca: `ACA_${regionIndex * 3 + Math.ceil(Math.random() * 3)}`
          };
        } else if (node.type === 'PRODUCT') {
          enhancedData = {
            ...enhancedData,
            region: region,
            name: `${node.data?.name?.replace(/\d+/, '')} ${regionIndex * 12 + parseInt(node.id.replace(/\D/g, ''))} (${region})`,
            asset_class: ['Equities', 'Fixed Income', 'Real Estate', 'Commodities', 'Alternatives'][Math.floor(Math.random() * 5)],
            product_label: `${region}_PROD_${regionIndex * 12 + parseInt(node.id.replace(/\D/g, ''))}`
          };
        }
        
        allNodes.push({
          id: regionNodeId,
          labels: [node.type || 'Unknown'], // This should match the node.type exactly
          properties: {
            ...enhancedData,
            id: regionNodeId,
            label: enhancedData.name
          }
        });
      });
      
      // Convert edges to relationships with proper mandate status
      enhanced.edges.forEach((edge) => {
        const relationship = {
          id: `rel_${relationshipCounter++}`,
          type: edge.data?.relType || 'CONNECTED_TO',
          startNodeId: `${region}_${edge.source}`,
          endNodeId: `${region}_${edge.target}`,
          properties: {
            ...edge.data,
            sourceId: `${region}_${edge.data?.sourceId || edge.source}`,
            targetId: `${region}_${edge.data?.targetId || edge.target}`
          }
        };
        
        // 🆕 ENSURE: OWNS relationships have mandate status
        if (relationship.type === 'OWNS') {
          if (!relationship.properties.mandateStatus) {
            // Assign a random mandate status if missing
            const mandateStatuses = ['Active', 'At Risk', 'Conversion in Progress'];
            relationship.properties.mandateStatus = mandateStatuses[Math.floor(Math.random() * mandateStatuses.length)];
          }
          console.log(`📄 OWNS relationship: ${relationship.startNodeId} -> ${relationship.endNodeId} | Status: ${relationship.properties.mandateStatus}`);
        }
        
        allRelationships.push(relationship);
        
        // Debug: Log each relationship creation
        console.log(`🔗 Created ${relationship.type} relationship: ${relationship.startNodeId} → ${relationship.endNodeId}`);
      });
    });
    
    console.log(`📋 Generated full dataset: ${allNodes.length} nodes, ${allRelationships.length} relationships`);
    
    // 🆕 NEW: Log field consultant parent mappings for verification
    const fieldConsultants = allNodes.filter(n => n.labels.includes('FIELD_CONSULTANT'));
    console.log('👔 Field Consultant Parent Mappings:');
    fieldConsultants.forEach(fc => {
      console.log(`  ${fc.id} -> ${fc.properties.parentConsultantId || 'NO PARENT'}`);
    });
    
    // 🆕 NEW: Log OWNS relationships with mandate status
    const ownsRelationships = allRelationships.filter(r => r.type === 'OWNS');
    console.log(`📄 OWNS relationships in full dataset: ${ownsRelationships.length}`);
    const mandateStatusCounts = ownsRelationships.reduce((acc, rel) => {
      const status = rel.properties.mandateStatus || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('📊 Mandate status distribution:', mandateStatusCounts);
    
    console.log('📊 Sample nodes by type:', {
      consultants: allNodes.filter(n => n.labels.includes('CONSULTANT')).map(n => n.properties.name),
      fieldConsultants: allNodes.filter(n => n.labels.includes('FIELD_CONSULTANT')).map(n => n.properties.name),
      companies: allNodes.filter(n => n.labels.includes('COMPANY')).map(n => n.properties.name),
      products: allNodes.filter(n => n.labels.includes('PRODUCT')).map(n => n.properties.name)
    });
    
    return { nodes: allNodes, relationships: allRelationships };
  }
  
  private preloadRegionData(): void {
    // Pre-cache NAI data since it's the default
    this.getRegionData(['NAI']).then(() => {
      console.log('✅ NAI data pre-cached');
    });
  }
  
  private async simulateNetworkDelay(min: number = 100, max: number = 300): Promise<void> {
    const delay = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}