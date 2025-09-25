// Fixed FilterTypes.ts - Proper separation between options and criteria

export interface FilterCriteria {
  regions?: string[];
  nodeTypes?: string[];
  sales_regions?: string[];
  channels?: string[];
  ratings?: string[];
  influenceLevels?: string[];
  assetClasses?: string[];
  // These remain string arrays - they store the selected NAME values
  consultantIds?: string[];
  fieldConsultantIds?: string[];
  clientIds?: string[];
  productIds?: string[];
  incumbentProductIds?: string[];
  // String arrays for advisor filters
  pcaIds?: string[];
  acaIds?: string[];
  clientAdvisorIds?: string[];
  consultantAdvisorIds?: string[];
  legacyPcaIds?: string[];
  mandateStatuses?: string[];
  mandateManagers?: string[];     // ADD THIS LINE
  universeNames?: string[];       // ADD THIS LINE
  showInactive?: boolean;
}

// FilterOptions - what's available for selection (entities have id/name, simple filters are strings)
export interface FilterOptions {
  regions: string[];
  sales_regions: string[];
  channels: string[];
  assetClasses: string[];
  // Entity options - provide {id, name} for dropdowns
  consultants: Array<{id: string, name: string}>;
  fieldConsultants: Array<{id: string, name: string}>;
  clients: Array<{id: string, name: string}>;
  products: Array<{id: string, name: string}>;
  incumbent_products: Array<{id: string, name: string}>;
  // String arrays for simple filters
  pcas: string[];
  acas: string[];
  clientAdvisors: string[];
  consultantAdvisors: string[];
  ratings: string[];
  influenceLevels: string[];
  mandateStatuses: string[];
  mandateManagers?: string[];     // ADD THIS LINE
  universeNames?: string[];       // ADD THIS LINE
  jpm_flags: string[];
  privacy_levels: string[];
}

// Helper function to extract names from entity options for filter criteria
export function extractNamesFromEntityOptions(entityOptions: Array<{id: string, name: string}>): string[] {
  return entityOptions.map(item => item.name);
}

// Helper function to convert string names back to entity objects
export function convertNamesToEntityOptions(names: string[], allOptions: Array<{id: string, name: string}>): Array<{id: string, name: string}> {
  return allOptions.filter(option => names.includes(option.name));
}

// Updated transform function for hierarchical options
export function transformHierarchicalOptions(hierarchicalOptions: HierarchicalFilterOptions | Record<string, any>): FilterOptions {
  const options = hierarchicalOptions as HierarchicalFilterOptions;
  
  const extractEntityList = (arr: Array<{id: string, name: string}> | string[] | undefined): Array<{id: string, name: string}> => {
    if (!arr || arr.length === 0) return [];
    return arr.map(item => 
      typeof item === 'string' ? { id: item, name: item } : item
    );
  };

  const extractStringArray = (arr: string[] | undefined): string[] => {
    return arr || [];
  };

  console.log('Transforming hierarchical options with proper entity/string separation:', {
    clientAdvisors: options.client_advisors?.length || 0,
    consultantAdvisors: options.consultant_advisors?.length || 0,
    incumbentProducts: options.incumbent_products?.length || 0
  });

  return {
    regions: ['NAI', 'EMEA', 'APAC'],
    sales_regions: extractStringArray(options.markets),
    channels: extractStringArray(options.channels),
    assetClasses: extractStringArray(options.asset_classes),
    // Entity lists (for dropdown options)
    consultants: extractEntityList(options.consultants),
    fieldConsultants: extractEntityList(options.field_consultants),
    clients: extractEntityList(options.companies),
    products: extractEntityList(options.products),
    incumbent_products: extractEntityList(options.incumbent_products),
    // String arrays (for simple filters)
    pcas: extractStringArray(options.pcas),
    acas: extractStringArray(options.acas),
    clientAdvisors: extractStringArray(options.client_advisors),
    consultantAdvisors: extractStringArray(options.consultant_advisors),
    ratings: extractStringArray(options.consultant_rankings) || ['Positive', 'Negative', 'Neutral', 'Introduced'],
    influenceLevels: extractStringArray(options.influence_levels) || ['1', '2', '3', '4'],
    mandateStatuses: extractStringArray(options.mandate_statuses) || ['Active', 'At Risk', 'Conversion in Progress'],
    jpm_flags: extractStringArray(options.jpm_flags) || ['Y', 'N'],
    privacy_levels: extractStringArray(options.privacy_levels) || ['Public', 'Private', 'Confidential']
  };
}

export interface HierarchicalFilterOptions {
  markets?: string[];
  channels?: string[];
  asset_classes?: string[];
  consultants?: Array<{id: string, name: string}> | string[];
  field_consultants?: Array<{id: string, name: string}> | string[];
  companies?: Array<{id: string, name: string}> | string[];
  products?: Array<{id: string, name: string}> | string[];
  incumbent_products?: Array<{id: string, name: string}> | string[];
  pcas?: string[];
  acas?: string[];
  client_advisors?: string[];
  consultant_advisors?: string[];
  consultant_rankings?: string[];
  influence_levels?: string[];
  mandate_statuses?: string[];
  jpm_flags?: string[];
  privacy_levels?: string[];
}