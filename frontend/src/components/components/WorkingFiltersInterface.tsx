// WorkingFiltersInterface.tsx - Fixed version with proper state preservation

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Stack, 
  Divider, 
  Card, 
  CardContent,
  Chip,
  Autocomplete,
  TextField,
  Checkbox,
  FormGroup,
  FormControlLabel,
  CircularProgress,
  Alert,
  Switch
} from '@mui/material';
import { Clear, Check, Psychology, TrendingUp, Business, Person, Assessment, Security } from '@mui/icons-material';
import { useGraphDataContext } from '../context/GraphDataProvider';
import type { FilterCriteria } from '../types/FitlerTypes';

interface WorkingFiltersInterfaceProps {
  recommendationsMode?: boolean;
  isDarkTheme?: boolean;
}

// Key for localStorage to make it unique per mode
const getStorageKey = (mode: boolean) => `workingFilters_pendingFilters_${mode ? 'reco' : 'std'}`;

export const WorkingFiltersInterface: React.FC<WorkingFiltersInterfaceProps> = ({ 
  recommendationsMode = false,
  isDarkTheme = true
}) => {
  const { 
    filterOptions, 
    currentFilters, 
    currentRegions,
    filterLoading, 
    error,
    changeRegions, 
    applyFilters, 
    resetFilters,
    getAvailableRegions
  } = useGraphDataContext();
  
  // Local filter state (what user is editing)
  const [localFilters, setLocalFilters] = useState<Partial<FilterCriteria>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const isInitialized = useRef(false);
  const lastAppliedFiltersRef = useRef<string>('');
  const currentModeRef = useRef(recommendationsMode);
  
  // Helper function to convert entity objects to names for criteria storage
  const convertEntityToNames = (entities: Array<{id: string, name: string}>): string[] => {
    return entities.map(entity => entity.name);
  };

  // Helper function to convert names back to entity objects for autocomplete display
  const convertNamesToEntities = (names: string[], allOptions: Array<{id: string, name: string}>): Array<{id: string, name: string}> => {
    if (!names || !allOptions) return [];
    return allOptions.filter(option => names.includes(option.name));
  };

  // Write pending filters to localStorage for SmartQueriesInterface to read
  const storePendingFilters = useCallback((filters: Partial<FilterCriteria>) => {
    try {
      // Only store non-empty filters
      const nonEmptyFilters: any = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value && (Array.isArray(value) ? value.length > 0 : true)) {
          nonEmptyFilters[key] = value;
        }
      });

      const storageKey = getStorageKey(recommendationsMode);
      
      if (Object.keys(nonEmptyFilters).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(nonEmptyFilters));
        // Also store for SmartQueries compatibility
        localStorage.setItem('workingFilters_pendingFilters', JSON.stringify(nonEmptyFilters));
        console.log('WorkingFilters: Stored pending filters for mode:', recommendationsMode, Object.keys(nonEmptyFilters));
      } else {
        localStorage.removeItem(storageKey);
        localStorage.removeItem('workingFilters_pendingFilters');
      }
    } catch (error) {
      console.warn('Failed to store pending filters:', error);
    }
  }, [recommendationsMode]);

  // Read pending filters from localStorage
  const readPendingFilters = useCallback(() => {
    try {
      const storageKey = getStorageKey(recommendationsMode);
      const storedPending = localStorage.getItem(storageKey);
      
      if (storedPending && storedPending.trim() !== '{}' && storedPending.trim() !== '') {
        const parsedPending = JSON.parse(storedPending);
        if (Object.keys(parsedPending).length > 0) {
          console.log('WorkingFilters: Found stored filters for mode:', recommendationsMode, parsedPending);
          return parsedPending;
        }
      }
    } catch (error) {
      console.warn('Failed to read pending filters:', error);
    }
    return null;
  }, [recommendationsMode]);

  // Get default node types based on mode
  const getDefaultNodeTypes = useCallback(() => {
    if (recommendationsMode) {
      return ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT', 'INCUMBENT_PRODUCT'];
    } else {
      return ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT'];
    }
  }, [recommendationsMode]);
  
  // Initialize local filters - Enhanced with better mode handling
  useEffect(() => {
    // Only initialize if we have filterOptions
    if (!filterOptions) {
      return;
    }

    // Handle mode changes
    if (currentModeRef.current !== recommendationsMode) {
      console.log('WorkingFilters: Mode changed from', currentModeRef.current, 'to', recommendationsMode);
      currentModeRef.current = recommendationsMode;
      isInitialized.current = false; // Force re-initialization on mode change
    }

    // Skip if already initialized for this mode
    if (isInitialized.current) {
      return;
    }

    console.log('WorkingFilters: Initializing filters for mode:', recommendationsMode);

    // Try to restore from localStorage first
    let initialFilters = readPendingFilters();
    let foundStoredFilters = !!initialFilters;

    // Build complete filter object with defaults
    const defaultFilters = {
      regions: currentFilters.regions || currentRegions,
      sales_regions: currentFilters.sales_regions || [],
      channels: currentFilters.channels || [],
      nodeTypes: currentFilters.nodeTypes || getDefaultNodeTypes(),
      ratings: currentFilters.ratings || [],
      influenceLevels: currentFilters.influenceLevels || [],
      assetClasses: currentFilters.assetClasses || [],
      consultantIds: currentFilters.consultantIds || [],
      fieldConsultantIds: currentFilters.fieldConsultantIds || [],
      clientIds: currentFilters.clientIds || [],
      productIds: currentFilters.productIds || [],
      incumbentProductIds: currentFilters.incumbentProductIds || [],
      clientAdvisorIds: currentFilters.clientAdvisorIds || [],
      consultantAdvisorIds: currentFilters.consultantAdvisorIds || [],
      mandateStatuses: currentFilters.mandateStatuses || [],
      mandateManagers: currentFilters.mandateManagers || [],
      universeNames: currentFilters.universeNames || [],
      showInactive: currentFilters.showInactive || false
    };

    // Use stored filters if available, otherwise use defaults
    const completeFilters = foundStoredFilters 
      ? { ...defaultFilters, ...initialFilters }
      : defaultFilters;

    console.log('WorkingFilters: State restoration debug:', {
      mode: recommendationsMode,
      foundStoredFilters,
      localStorageKeys: foundStoredFilters ? Object.keys(initialFilters) : [],
      finalKeys: Object.keys(completeFilters).filter(key => {
        const value = completeFilters[key];
        return value && (Array.isArray(value) ? value.length > 0 : true);
      })
    });

    // Set the filters and mark as initialized
    setLocalFilters(completeFilters);
    isInitialized.current = true;
    setHasChanges(foundStoredFilters);
    
    // Store the current applied filters snapshot to track changes
    lastAppliedFiltersRef.current = JSON.stringify(defaultFilters);
    
    // Ensure localStorage is updated with current state
    if (foundStoredFilters) {
      storePendingFilters(completeFilters);
    }
    
    console.log('WorkingFilters: Initialized successfully for mode:', recommendationsMode, {
      foundStoredFilters,
      hasChanges: foundStoredFilters
    });
  }, [filterOptions, recommendationsMode, readPendingFilters, getDefaultNodeTypes, storePendingFilters, currentFilters, currentRegions]);

  // Sync local filters to localStorage whenever they change (but only after initialization)
  useEffect(() => {
    if (isInitialized.current) {
      storePendingFilters(localFilters);
    }
  }, [localFilters, storePendingFilters]);

  // Sync FROM applied filters only when they change AND we don't have unsaved changes
  useEffect(() => {
    if (!isInitialized.current || filterLoading) {
      return;
    }

    // Create current applied filters snapshot
    const currentAppliedSnapshot = JSON.stringify({
      regions: currentFilters.regions || currentRegions,
      sales_regions: currentFilters.sales_regions || [],
      channels: currentFilters.channels || [],
      nodeTypes: currentFilters.nodeTypes || getDefaultNodeTypes(),
      ratings: currentFilters.ratings || [],
      influenceLevels: currentFilters.influenceLevels || [],
      assetClasses: currentFilters.assetClasses || [],
      consultantIds: currentFilters.consultantIds || [],
      fieldConsultantIds: currentFilters.fieldConsultantIds || [],
      clientIds: currentFilters.clientIds || [],
      productIds: currentFilters.productIds || [],
      incumbentProductIds: currentFilters.incumbentProductIds || [],
      clientAdvisorIds: currentFilters.clientAdvisorIds || [],
      consultantAdvisorIds: currentFilters.consultantAdvisorIds || [],
      mandateStatuses: currentFilters.mandateStatuses || [],
      showInactive: currentFilters.showInactive || false
    });

    // Only sync if applied filters actually changed
    if (currentAppliedSnapshot !== lastAppliedFiltersRef.current) {
      console.log('WorkingFilters: Applied filters changed, checking if we should sync...');
      
      // Check if user has unsaved changes for this mode
      const hasPendingInStorage = readPendingFilters();
      if (hasPendingInStorage) {
        console.log('WorkingFilters: Skipping sync - user has unsaved changes for this mode');
        lastAppliedFiltersRef.current = currentAppliedSnapshot; // Update the ref but don't sync
        return;
      }

      // Safe to sync - no unsaved changes
      const newAppliedFilters = JSON.parse(currentAppliedSnapshot);
      console.log('WorkingFilters: Syncing to new applied filters');
      setLocalFilters(newAppliedFilters);
      setHasChanges(false);
      lastAppliedFiltersRef.current = currentAppliedSnapshot;
    }
  }, [currentFilters, currentRegions, filterLoading, getDefaultNodeTypes, readPendingFilters]);
  
  // Check if there are unsaved changes
  useEffect(() => {
    if (!isInitialized.current) return;

    const currentAppliedSnapshot = {
      regions: currentFilters.regions || currentRegions,
      sales_regions: currentFilters.sales_regions || [],
      channels: currentFilters.channels || [],
      nodeTypes: currentFilters.nodeTypes || getDefaultNodeTypes(),
      ratings: currentFilters.ratings || [],
      influenceLevels: currentFilters.influenceLevels || [],
      assetClasses: currentFilters.assetClasses || [],
      consultantIds: currentFilters.consultantIds || [],
      fieldConsultantIds: currentFilters.fieldConsultantIds || [],
      clientIds: currentFilters.clientIds || [],
      productIds: currentFilters.productIds || [],
      incumbentProductIds: currentFilters.incumbentProductIds || [],
      clientAdvisorIds: currentFilters.clientAdvisorIds || [],
      consultantAdvisorIds: currentFilters.consultantAdvisorIds || [],
      mandateStatuses: currentFilters.mandateStatuses || [],
      showInactive: currentFilters.showInactive || false
    };
    
    const hasUnsavedChanges = JSON.stringify(localFilters) !== JSON.stringify(currentAppliedSnapshot);
    setHasChanges(hasUnsavedChanges);
  }, [localFilters, currentFilters, currentRegions, getDefaultNodeTypes]);
  
  const handleRegionChange = async (newRegion: string) => {
    if (!newRegion) return;
    
    setLocalFilters(prev => ({ ...prev, regions: [newRegion] }));
    await changeRegions([newRegion]);
  };
  
  const handleFilterChange = (field: string, value: any) => {
    setLocalFilters(prev => ({ ...prev, [field]: value }));
    console.log(`Filter changed (real-time sync): ${field}`, value);
  };
  
  // Special handler for entity-based filters with auto-apply on removal
  const handleEntityFilterChange = (field: string, entities: Array<{id: string, name: string}>) => {
    const names = convertEntityToNames(entities);
    const currentFieldValue = localFilters[field as keyof FilterCriteria] as string[] || [];
    
    const updatedLocalFilters = { ...localFilters, [field]: names };
    setLocalFilters(updatedLocalFilters);
    
    console.log(`Entity filter changed (real-time sync): ${field}`, names);
    
    // AUTO-APPLY: If removing items, auto-apply filters
    if (names.length < currentFieldValue.length) {
      console.log(`Auto-applying filters due to removal in ${field}`);
      setTimeout(() => {
        applyFilters(updatedLocalFilters);
      }, 150);
    }
  };

  // Handler for simple filter changes with auto-apply on removal
  const handleFilterChangeWithAutoApply = (field: string, value: any) => {
    const updatedLocalFilters = { ...localFilters, [field]: value };
    setLocalFilters(updatedLocalFilters);
    
    console.log(`Filter with auto-apply changed (real-time sync): ${field}`, value);
    
    // Check if this is a removal (for array-based filters)
    if (Array.isArray(value) && Array.isArray(localFilters[field as keyof FilterCriteria])) {
      const currentValue = localFilters[field as keyof FilterCriteria] as any[];
      if (value.length < currentValue.length) {
        console.log(`Auto-applying filters due to removal in ${field}`);
        setTimeout(() => {
          applyFilters(updatedLocalFilters);
        }, 150);
      }
    }
  };
  
  const handleApplyFilters = async () => {
    console.log('Applying filters:', localFilters);
    await applyFilters(localFilters);
    
    // Clear pending filters for this mode since they're now applied
    try {
      const storageKey = getStorageKey(recommendationsMode);
      localStorage.removeItem(storageKey);
      localStorage.removeItem('workingFilters_pendingFilters');
      console.log('WorkingFilters: Cleared pending filters after apply for mode:', recommendationsMode);
    } catch (error) {
      console.warn('Failed to clear pending filters after apply:', error);
    }
  };
  
  const handleResetFilters = () => {
    console.log('Resetting filters');
    resetFilters();
    
    // Reset the component state completely
    setLocalFilters({});
    setHasChanges(false);
    isInitialized.current = false;
    lastAppliedFiltersRef.current = '';
    
    // Clear pending filters for both modes
    try {
      localStorage.removeItem(getStorageKey(true));
      localStorage.removeItem(getStorageKey(false));
      localStorage.removeItem('workingFilters_pendingFilters');
    } catch (error) {
      console.warn('Failed to clear pending filters after reset:', error);
    }
  };
  
  // Node type handling
  const handleNodeTypeChange = (nodeType: string, checked: boolean) => {
    const currentTypes = localFilters.nodeTypes || [];
    if (checked) {
      setLocalFilters(prev => ({ 
        ...prev, 
        nodeTypes: [...currentTypes, nodeType] 
      }));
    } else {
      setLocalFilters(prev => ({ 
        ...prev, 
        nodeTypes: currentTypes.filter(type => type !== nodeType) 
      }));
    }
    console.log(`Node type ${nodeType} ${checked ? 'added' : 'removed'} (real-time sync)`);
  };

  // Rest of the component styles and rendering logic remains the same...
  const selectStyles = {
    '& .MuiOutlinedInput-root': {
      bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.95)',
      color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
      '& fieldset': { 
        borderColor: isDarkTheme ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.5)',
        borderWidth: '1px'
      },
      '&:hover fieldset': { 
        borderColor: isDarkTheme ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.7)'
      },
      '&.Mui-focused fieldset': { 
        borderColor: '#6366f1',
        borderWidth: '2px'
      },
    },
    '& .MuiInputLabel-root': {
      color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
      '&.Mui-focused': {
        color: '#6366f1'
      }
    },
    '& .MuiChip-root': {
      bgcolor: 'rgba(99, 102, 241, 0.2)',
      color: '#6366f1',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      '& .MuiChip-deleteIcon': {
        color: '#6366f1',
        '&:hover': {
          color: '#4f46e5'
        }
      }
    }
  };

  const getDropdownPaperStyles = () => ({
    bgcolor: isDarkTheme ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    border: `1px solid ${isDarkTheme ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)'}`,
    '& .MuiAutocomplete-option': {
      color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
      '&:hover': {
        bgcolor: 'rgba(99, 102, 241, 0.1)'
      }
    }
  });

  if (!filterOptions) {
    return (
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        bgcolor: 'rgba(15, 23, 42, 0.98)'
      }}>
        <CircularProgress sx={{ color: '#6366f1' }} />
        <Typography sx={{ ml: 2, color: 'white' }}>
          Loading filter options...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'rgba(15, 23, 42, 0.98)'
    }}>
      {/* Header */}
      <Box sx={{ 
        flexShrink: 0,
        p: 2,
        borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
        bgcolor: 'rgba(15, 23, 42, 0.98)'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          mb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp sx={{ color: '#6366f1', fontSize: '1.2rem' }} />
            <Typography variant="h6" sx={{ 
              color: 'white', 
              fontWeight: 'bold',
              fontSize: '1rem'
            }}>
              Filters {recommendationsMode && '(Recommendations)'}
            </Typography>
            <Chip
              label={`${Object.keys(localFilters).length} filters`}
              size="small"
              sx={{
                bgcolor: 'rgba(99, 102, 241, 0.2)',
                color: '#6366f1',
                fontSize: '0.7rem'
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              icon={<Clear />}
              label="Reset"
              onClick={handleResetFilters}
              size="small"
              sx={{
                bgcolor: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.3)' }
              }}
            />
          </Box>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            {error}
          </Alert>
        )}
      </Box>
      
      {/* Scrollable Content Area */}
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        px: 2,
        pb: 2
      }}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {/* Region Filter */}
          <Card sx={{ 
            bgcolor: 'rgba(99, 102, 241, 0.1)', 
            border: '2px solid rgba(99, 102, 241, 0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ 
                color: '#6366f1', 
                mb: 1, 
                fontWeight: 'bold' 
              }}>
                Region (Data Source)
              </Typography>
              <Autocomplete
                size="small"
                options={getAvailableRegions()}
                value={currentRegions[0] || 'NAI'}
                onChange={(_, newValue) => newValue && handleRegionChange(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Select Region" sx={selectStyles} />
                )}
                disableClearable
                sx={selectStyles}
                slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
              />
            </CardContent>
          </Card>

          {/* Node Types Filter 
          <Card sx={{ 
            bgcolor: 'rgba(59, 130, 246, 0.1)', 
            border: '1px solid rgba(59, 130, 246, 0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ 
                color: '#3b82f6', 
                mb: 1, 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}>
                <Assessment sx={{ fontSize: '1rem' }} />
                Node Types
              </Typography>
              <FormGroup>
                {['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT'].map((nodeType) => (
                  <FormControlLabel
                    key={nodeType}
                    control={
                      <Checkbox
                        checked={localFilters.nodeTypes?.includes(nodeType) || false}
                        onChange={(e) => handleNodeTypeChange(nodeType, e.target.checked)}
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.7)',
                          '&.Mui-checked': { color: '#3b82f6' }
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ 
                        color: 'white', 
                        fontSize: '0.85rem',
                        textTransform: 'capitalize'
                      }}>
                        {nodeType.replace('_', ' ').toLowerCase()}
                      </Typography>
                    }
                  />
                ))}
                {recommendationsMode && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={localFilters.nodeTypes?.includes('INCUMBENT_PRODUCT') || false}
                        onChange={(e) => handleNodeTypeChange('INCUMBENT_PRODUCT', e.target.checked)}
                        sx={{ 
                          color: 'rgba(245, 158, 11, 0.7)',
                          '&.Mui-checked': { color: '#f59e0b' }
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ 
                        color: '#f59e0b', 
                        fontSize: '0.85rem',
                        fontWeight: 'bold'
                      }}>
                        Incumbent Product (AI)
                      </Typography>
                    }
                  />
                )}
              </FormGroup>
            </CardContent>
          </Card>
          */}
          {/* Entity Filters */}
          <Typography variant="subtitle2" sx={{ 
            color: 'white', 
            fontWeight: 'bold', 
            mt: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}>
            <Person sx={{ fontSize: '1rem' }} />
            Entity Filters
          </Typography>

          {/* Consultants */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.consultants || []}
            getOptionLabel={(option) => option.name}
            value={convertNamesToEntities(localFilters.consultantIds || [], filterOptions.consultants || [])}
            onChange={(_, newValue) => handleEntityFilterChange('consultantIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Consultants" sx={selectStyles} />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          {/* Field Consultants */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.fieldConsultants || []}
            getOptionLabel={(option) => option.name}
            value={convertNamesToEntities(localFilters.fieldConsultantIds || [], filterOptions.fieldConsultants || [])}
            onChange={(_, newValue) => handleEntityFilterChange('fieldConsultantIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Field Consultants" sx={selectStyles} />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          {/* Client Companies */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.clients || []}
            getOptionLabel={(option) => option.name}
            value={convertNamesToEntities(localFilters.clientIds || [], filterOptions.clients || [])}
            onChange={(_, newValue) => handleEntityFilterChange('clientIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Client Companies" sx={selectStyles} />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          {/* Products */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.products || []}
            getOptionLabel={(option) => option.name}
            value={convertNamesToEntities(localFilters.productIds || [], filterOptions.products || [])}
            onChange={(_, newValue) => handleEntityFilterChange('productIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Products" sx={selectStyles} />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          
        
        {recommendationsMode && (
          <>
          {/* Recommendation Filters */}
          <Typography variant="subtitle2" sx={{ 
            color: 'white', 
            fontWeight: 'bold', 
            mt: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}>
            <Business sx={{ fontSize: '1rem' }} />
            Recommendation Filters
          </Typography>

          <Autocomplete
                  multiple
                  size="small"
                  options={filterOptions.incumbent_products || []}
                  getOptionLabel={(option) => option.name}
                  value={convertNamesToEntities(localFilters.incumbentProductIds || [], filterOptions.incumbent_products || [])}
                  onChange={(_, newValue) => handleEntityFilterChange('incumbentProductIds', newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Incumbent Products" sx={selectStyles} />
                  )}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  sx={selectStyles}
                  slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
                />
                <Autocomplete
                  multiple
                  size="small"
                  options={filterOptions?.mandateManagers || []}
                  value={localFilters.mandateManagers || []}
                  onChange={(_, newValue) => handleFilterChangeWithAutoApply('mandateManagers', newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Mandate Managers" sx={selectStyles} />
                  )}
                  sx={selectStyles}
                  slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
                />
                <Autocomplete
                  multiple
                  size="small"
                  options={filterOptions?.universeNames || []}
                  value={localFilters.universeNames || []}
                  onChange={(_, newValue) => handleFilterChangeWithAutoApply('universeNames', newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Universe Names" sx={selectStyles} />
                  )}
                  sx={selectStyles}
                  slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
                />

            </>

          )}

          {/* Advisor Filters */}
          <Typography variant="subtitle2" sx={{ 
            color: 'white', 
            fontWeight: 'bold', 
            mt: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}>
            <Business sx={{ fontSize: '1rem' }} />
            Advisor Filters
          </Typography>

          {/* Client Advisors */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.clientAdvisors || []}
            value={localFilters.clientAdvisorIds || []}
            onChange={(_, newValue) => handleFilterChangeWithAutoApply('clientAdvisorIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Client Advisors" sx={selectStyles} />
            )}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          {/* Consultant Advisors */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.consultantAdvisors || []}
            value={localFilters.consultantAdvisorIds || []}
            onChange={(_, newValue) => handleFilterChangeWithAutoApply('consultantAdvisorIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Consultant Advisors" sx={selectStyles} />
            )}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          {/* Business Filters */}
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 1 }} />
          
          <Typography variant="subtitle2" sx={{ 
            color: 'white', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}>
            <Assessment sx={{ fontSize: '1rem' }} />
            Business Filters
          </Typography>

          {/* Sales Regions */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.sales_regions || []}
            value={localFilters.sales_regions || []}
            onChange={(_, newValue) => handleFilterChangeWithAutoApply('sales_regions', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Markets (Sales Regions)" sx={selectStyles} />
            )}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          {/* Channels */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.channels || []}
            value={localFilters.channels || []}
            onChange={(_, newValue) => handleFilterChangeWithAutoApply('channels', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Channels" sx={selectStyles} />
            )}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          {/* Asset Classes */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.assetClasses || []}
            value={localFilters.assetClasses || []}
            onChange={(_, newValue) => handleFilterChangeWithAutoApply('assetClasses', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Asset Classes" sx={selectStyles} />
            )}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          {/* Ratings */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.ratings || []}
            value={localFilters.ratings || []}
            onChange={(_, newValue) => handleFilterChangeWithAutoApply('ratings', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Ratings" sx={selectStyles} />
            )}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          {/* Influence Levels */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.influenceLevels || []}
            value={localFilters.influenceLevels || []}
            onChange={(_, newValue) => handleFilterChangeWithAutoApply('influenceLevels', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Influence Levels" sx={selectStyles} />
            )}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          {/* Mandate Statuses */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.mandateStatuses || []}
            value={localFilters.mandateStatuses || []}
            onChange={(_, newValue) => handleFilterChangeWithAutoApply('mandateStatuses', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Mandate Statuses" sx={selectStyles} />
            )}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          {/* Show Inactive Toggle */}
          <Card sx={{ 
            bgcolor: 'rgba(156, 163, 175, 0.1)', 
            border: '1px solid rgba(156, 163, 175, 0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ 
                  color: '#9ca3af', 
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}>
                  <Security sx={{ fontSize: '1rem' }} />
                  Include Inactive Records
                </Typography>
                <Switch
                  checked={localFilters.showInactive || false}
                  onChange={(e) => handleFilterChange('showInactive', e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#9ca3af',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#9ca3af',
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Add some bottom padding for the sticky button */}
          <Box sx={{ height: '80px' }} />
        </Stack>
      </Box>

      {/* Sticky Apply Button */}
      <Box sx={{ 
        flexShrink: 0,
        px: 2,
        py: 2,
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        bgcolor: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(10px)'
      }}>
        <Box
          onClick={handleApplyFilters}
          sx={{
            width: '100%',
            bgcolor: hasChanges ? '#6366f1' : 'rgba(99, 102, 241, 0.5)',
            color: 'white',
            py: 1.5,
            px: 3,
            borderRadius: 2,
            textAlign: 'center',
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            transition: 'all 0.2s ease',
            opacity: filterLoading ? 0.7 : 1,
            '&:hover': hasChanges ? {
              bgcolor: '#4f46e5',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
            } : {},
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1
          }}
        >
          {filterLoading && <CircularProgress size={16} sx={{ color: 'white' }} />}
          Apply Filters
          {hasChanges && (
            <Chip 
              label="!" 
              size="small" 
              sx={{ 
                bgcolor: '#6366f1', 
                color: 'white', 
                height: 16, 
                fontSize: '0.6rem',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }} 
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};