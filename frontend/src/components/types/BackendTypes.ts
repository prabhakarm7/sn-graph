// Updated BackendTypes.ts - Added TPA range support
import { FilterOptions } from './FitlerTypes';

export interface BackendFilterOptions {
  markets?: string[];
  channels?: string[];
  asset_classes?: string[];
  consultants?: Array<{id: string, name: string}> | string[];
  field_consultants?: Array<{id: string, name: string}> | string[];
  companies?: Array<{id: string, name: string}> | string[];
  products?: Array<{id: string, name: string}> | string[];
  incumbent_products?: Array<{id: string, name: string}> | string[];
  client_advisors?: string[];
  consultant_advisors?: string[];
  ratings?: string[];
  mandate_statuses?: string[];
  mandate_managers?: string[];
  universe_names?: string[];
  influence_levels?: string[];
  jpm_flags?: string[];
  privacy_levels?: string[];
  
  // 🆕 NEW: TPA range
  tpa_range?: {
    min: number;
    max: number;
    average: number;
  };
}

// Transform backend options to frontend FilterOptions type
export function transformBackendFilterOptions(backendOptions: BackendFilterOptions | Record<string, any> | null): FilterOptions | null {
  if (!backendOptions) return null;

  const extractNames = (arr: Array<{id: string, name: string}> | string[] | undefined): string[] => {
    if (!arr || arr.length === 0) return [];
    return arr.map(item => typeof item === 'string' ? item : item.name || item.id);
  };

  const extractEntityList = (arr: Array<{id: string, name: string}> | string[] | undefined): Array<{id: string, name: string}> => {
    if (!arr || arr.length === 0) return [];
    return arr.map(item => 
      typeof item === 'string' 
        ? { id: item, name: item }
        : { id: item.id || item.name, name: item.name || item.id }
    );
  };

  return {
    regions: ['NAI', 'EMEA', 'APAC'],
    sales_regions: backendOptions.markets || [],
    channels: backendOptions.channels || [],
    assetClasses: backendOptions.asset_classes || [],
    consultants: extractEntityList(backendOptions.consultants),
    fieldConsultants: extractEntityList(backendOptions.field_consultants),
    clients: extractEntityList(backendOptions.companies),
    products: extractEntityList(backendOptions.products),
    incumbent_products: extractEntityList(backendOptions.incumbent_products),
    pcas: [], // Legacy - keep empty
    acas: [], // Legacy - keep empty
    clientAdvisors: backendOptions.client_advisors || [],
    consultantAdvisors: backendOptions.consultant_advisors || [],
    ratings: backendOptions.ratings || ['Positive', 'Negative', 'Neutral', 'Introduced'],
    influenceLevels: backendOptions.influence_levels || ['1', '2', '3', '4', 'High', 'medium', 'low', 'UNK'],
    mandateStatuses: backendOptions.mandate_statuses || ['Active', 'At Risk', 'Conversion in Progress'],
    mandateManagers: backendOptions.mandate_managers || [],
    universeNames: backendOptions.universe_names || [],    
    jpm_flags: backendOptions.jpm_flags || ['Y', 'N'],
    privacy_levels: backendOptions.privacy_levels || ['Public', 'Private', 'Confidential'],
    
    // 🆕 NEW: TPA range
    tpaRange: backendOptions.tpa_range
  };
}