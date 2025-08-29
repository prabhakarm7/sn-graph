// context/GraphDataProvider.tsx - Updated for Hierarchical Integration
import React, { createContext, useContext, ReactNode } from 'react';
import type { FilterCriteria, FilterOptions } from '../types/FitlerTypes';

interface GraphDataContextType {
  // Filter data and options
  filterOptions: FilterOptions | null;
  currentFilters: FilterCriteria;
  currentRegions: string[];
  
  // Loading states
  filterLoading: boolean;
  error: string | null;
  
  // Actions
  changeRegions: (regions: string[]) => Promise<void>;
  applyFilters: (filters: Partial<FilterCriteria>) => Promise<void>;
  resetFilters: () => void;
  getAvailableRegions: () => string[];
}

const GraphDataContext = createContext<GraphDataContextType | null>(null);

interface GraphDataProviderProps {
  children: ReactNode;
  value: GraphDataContextType;
} 

export const GraphDataProvider: React.FC<GraphDataProviderProps> = ({ children, value }) => {
  return (
    <GraphDataContext.Provider value={value}>
      {children}
    </GraphDataContext.Provider>
  );
};

export const useGraphDataContext = () => {
  const context = useContext(GraphDataContext);
  if (!context) {
    throw new Error('useGraphDataContext must be used within a GraphDataProvider');
  }
  return context;
};