// FilterTypes.ts - UPDATED with Complete Recommendations Mode Support

export interface FilterCriteria {
  regions?: string[];
  nodeTypes?: string[];
  sales_regions?: string[];
  channels?: string[];
  ratings?: string[];
  influenceLevels?: string[];
  assetClasses?: string[];
  consultantIds?: string[];
  fieldConsultantIds?: string[];
  clientIds?: string[];
  productIds?: string[];
  pcaIds?: string[];
  acaIds?: string[];
  // NEW: Enhanced PCA/ACA filters
  clientAdvisorIds?: string[]; // Company PCA + ACA combined
  consultantAdvisorIds?: string[]; // Consultant PCA + Advisor combined
  legacyPcaIds?: string[]; // Legacy PCA filter
  // NEW: Incumbent Products filter for recommendations mode
  incumbentProductIds?: string[];
  mandateStatuses?: string[];
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
  // NEW: Enhanced PCA/ACA options
  clientAdvisors: string[]; // Company PCA + ACA combined
  consultantAdvisors: string[]; // Consultant PCA + Advisor combined
  ratings: string[];
  influenceLevels: string[];
  mandateStatuses: string[];
  jpm_flags: string[];
  privacy_levels: string[];
}

// ✅ UPDATED: Enhanced interface with new PCA/ACA fields and incumbent products
export interface HierarchicalFilterOptions {
  markets?: string[];
  channels?: string[];
  asset_classes?: string[];
  consultants?: Array<{id: string, name: string}> | string[];
  field_consultants?: Array<{id: string, name: string}> | string[];
  companies?: Array<{id: string, name: string}> | string[];
  products?: Array<{id: string, name: string}> | string[];
  incumbent_products?: Array<{id: string, name: string}> | string[]; // NEW
  pcas?: string[];
  acas?: string[];
  // NEW: Enhanced PCA/ACA fields from backend
  client_advisors?: string[]; // Company PCA + ACA combined
  consultant_advisors?: string[]; // Consultant PCA + Advisor combined
  consultant_rankings?: string[];
  influence_levels?: string[];
  mandate_statuses?: string[];
  jpm_flags?: string[];
  privacy_levels?: string[];
}

// ✅ UPDATED: Transform function with enhanced PCA/ACA logic and incumbent products
export function transformHierarchicalOptions(hierarchicalOptions: HierarchicalFilterOptions | Record<string, any>): FilterOptions {
  // ✅ Handle both typed and untyped inputs
  const options = hierarchicalOptions as HierarchicalFilterOptions;
  
  const extractNames = (arr: Array<{id: string, name: string}> | string[] | undefined): string[] => {
    if (!arr || arr.length === 0) return [];
    return arr.map(item => typeof item === 'string' ? item : item.name || item.id);
  };

  console.log('🔄 Transforming hierarchical options with enhanced PCA/ACA logic and incumbent products:', {
    clientAdvisors: options.client_advisors?.length || 0,
    consultantAdvisors: options.consultant_advisors?.length || 0,
    incumbentProducts: options.incumbent_products?.length || 0, // NEW
    legacyPcas: options.pcas?.length || 0,
    legacyAcas: options.acas?.length || 0,
    rawClientAdvisors: options.client_advisors,
    rawConsultantAdvisors: options.consultant_advisors,
    rawIncumbentProducts: options.incumbent_products // NEW
  });

  const transformed = {
    regions: ['NAI', 'EMEA', 'APAC'],
    sales_regions: options.markets || [],
    channels: options.channels || [],
    assetClasses: options.asset_classes || [],
    consultants: extractNames(options.consultants),
    fieldConsultants: extractNames(options.field_consultants),
    clients: extractNames(options.companies),
    products: extractNames(options.products),
    incumbent_products: extractNames(options.incumbent_products), // NEW
    
    // Legacy PCA/ACA (for backward compatibility)
    pcas: options.pcas || [],
    acas: options.acas || [],
    
    // ✅ NEW: Enhanced PCA/ACA options
    clientAdvisors: options.client_advisors || [], // Company PCA + ACA combined
    consultantAdvisors: options.consultant_advisors || [], // Consultant PCA + Advisor combined
    
    ratings: options.consultant_rankings || ['Positive', 'Negative', 'Neutral', 'Introduced'],
    influenceLevels: options.influence_levels || ['1', '2', '3', '4'],
    mandateStatuses: options.mandate_statuses || ['Active', 'At Risk', 'Conversion in Progress'],
    jpm_flags: options.jpm_flags || ['Y', 'N'],
    privacy_levels: options.privacy_levels || ['Public', 'Private', 'Confidential']
  };

  console.log('✅ Transformed filter options with incumbent products support:', {
    clientAdvisors: transformed.clientAdvisors.length,
    consultantAdvisors: transformed.consultantAdvisors.length,
    incumbentProducts: transformed.incumbent_products.length, // NEW
    clientAdvisorsList: transformed.clientAdvisors.slice(0, 5),
    consultantAdvisorsList: transformed.consultantAdvisors.slice(0, 5),
    incumbentProductsList: transformed.incumbent_products.slice(0, 5) // NEW
  });

  return transformed;
}