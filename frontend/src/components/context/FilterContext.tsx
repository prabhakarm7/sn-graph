// context/FilterContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface FilterState {
  // Core business filters
  regions: string[];
  markets: string[];
  channels: string[];
  assetClasses: string[];
  
  // Node type filters
  nodeTypes: string[];
  
  // Relationship filters
  productRatings: string[];
  influenceLevels: string[];
  
  // Specific entity filters
  fieldConsultants: string[];
  consultants: string[];
  products: string[];
  clients: string[];
  clientAdvisors: string[];
  consultantAdvisors: string[];
  
  // Status filters
  showInactiveNodes: boolean;
}

export interface FilterActions {
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  applyFilters: () => void;
  clearAllFilters: () => void;
  resetToDefaults: () => void;
}

interface FilterContextType extends FilterState, FilterActions {
  isFilterActive: boolean;
  appliedFilters: FilterState;
}

const defaultFilterState: FilterState = {
  regions: ['NAI'],
  markets: [],
  channels: [],
  assetClasses: [],
  nodeTypes: ['COMPANY', 'FIELD_CONSULTANT', 'PRODUCT', 'CONSULTANT'],
  productRatings: [],
  influenceLevels: [],
  fieldConsultants: [],
  consultants: [],
  products: [],
  clients: [],
  clientAdvisors: [],
  consultantAdvisors: [],
  showInactiveNodes: true
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentFilters, setCurrentFilters] = useState<FilterState>(defaultFilterState);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilterState);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setCurrentFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyFilters = () => {
    setAppliedFilters({ ...currentFilters });
    console.log('🔍 Applying filters:', currentFilters);
    
    // This is where we'll add Neo4j query logic later
    // Example: await fetchFilteredData(currentFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      ...defaultFilterState,
      regions: ['NAI'], // Keep NAI as default
      nodeTypes: ['COMPANY', 'FIELD_CONSULTANT', 'PRODUCT', 'CONSULTANT'] // Keep all node types
    };
    setCurrentFilters(clearedFilters);
    setAppliedFilters(clearedFilters);
  };

  const resetToDefaults = () => {
    setCurrentFilters(defaultFilterState);
  };

  // Check if any filters are active (different from defaults)
  const isFilterActive = JSON.stringify(appliedFilters) !== JSON.stringify(defaultFilterState);

  return (
    <FilterContext.Provider
      value={{
        ...currentFilters,
        appliedFilters,
        isFilterActive,
        updateFilter,
        applyFilters,
        clearAllFilters,
        resetToDefaults
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};