// WorkingFiltersInterface.tsx - Original design with all filters and fixed entity handling

import React, { useState, useEffect } from 'react';
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
  
  // Helper function to convert entity objects to names for criteria storage
  const convertEntityToNames = (entities: Array<{id: string, name: string}>): string[] => {
    return entities.map(entity => entity.name);
  };

  // Helper function to convert names back to entity objects for autocomplete display
  const convertNamesToEntities = (names: string[], allOptions: Array<{id: string, name: string}>): Array<{id: string, name: string}> => {
    if (!names || !allOptions) return [];
    return allOptions.filter(option => names.includes(option.name));
  };
  
  // Initialize local filters when currentFilters change
  useEffect(() => {
    const getDefaultNodeTypes = () => {
      if (recommendationsMode) {
        return ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT', 'INCUMBENT_PRODUCT'];
      } else {
        return ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT'];
      }
    };

    setLocalFilters({
      regions: currentFilters.regions,
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
      pcaIds: currentFilters.pcaIds || [],
      acaIds: currentFilters.acaIds || [],
      clientAdvisorIds: currentFilters.clientAdvisorIds || [],
      consultantAdvisorIds: currentFilters.consultantAdvisorIds || [],
      legacyPcaIds: currentFilters.legacyPcaIds || [],
      mandateStatuses: currentFilters.mandateStatuses || [],
      showInactive: currentFilters.showInactive
    });
    setHasChanges(false);
  }, [currentFilters, recommendationsMode]);
  
  // Check if there are unsaved changes
  useEffect(() => {
    const currentSnapshot = {
      regions: currentFilters.regions,
      sales_regions: currentFilters.sales_regions || [],
      channels: currentFilters.channels || [],
      nodeTypes: currentFilters.nodeTypes,
      ratings: currentFilters.ratings || [],
      influenceLevels: currentFilters.influenceLevels || [],
      assetClasses: currentFilters.assetClasses || [],
      consultantIds: currentFilters.consultantIds || [],
      fieldConsultantIds: currentFilters.fieldConsultantIds || [],
      clientIds: currentFilters.clientIds || [],
      productIds: currentFilters.productIds || [],
      incumbentProductIds: currentFilters.incumbentProductIds || [],
      pcaIds: currentFilters.pcaIds || [],
      acaIds: currentFilters.acaIds || [],
      clientAdvisorIds: currentFilters.clientAdvisorIds || [],
      consultantAdvisorIds: currentFilters.consultantAdvisorIds || [],
      legacyPcaIds: currentFilters.legacyPcaIds || [],
      mandateStatuses: currentFilters.mandateStatuses || [],
      showInactive: currentFilters.showInactive
    };
    
    const hasUnsavedChanges = JSON.stringify(localFilters) !== JSON.stringify(currentSnapshot);
    setHasChanges(hasUnsavedChanges);
  }, [localFilters, currentFilters]);
  
  const handleRegionChange = async (newRegion: string) => {
    if (!newRegion) return;
    
    setLocalFilters(prev => ({ ...prev, regions: [newRegion] }));
    await changeRegions([newRegion]);
  };
  
  const handleFilterChange = (field: string, value: any) => {
    setLocalFilters(prev => ({ ...prev, [field]: value }));
  };
  
  // Special handler for entity-based filters - converts entity objects to string arrays
  const handleEntityFilterChange = (field: string, entities: Array<{id: string, name: string}>) => {
    const names = convertEntityToNames(entities);
    setLocalFilters(prev => ({ ...prev, [field]: names }));
  };
  
  const handleApplyFilters = async () => {
    await applyFilters(localFilters);
  };
  
  const handleResetFilters = () => {
    resetFilters();
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
  };
  
  // Styles - ORIGINAL DESIGN
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
          Loading backend-processed filter options...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 2, 
      height: '100%', 
      overflowY: 'auto', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'rgba(15, 23, 42, 0.98)'
    }}>
      {/* Header - ORIGINAL DESIGN */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        mb: 2,
        flexShrink: 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp sx={{ color: '#6366f1', fontSize: '1.2rem' }} />
          <Typography variant="h6" sx={{ 
            color: 'white', 
            fontWeight: 'bold',
            fontSize: '1rem'
          }}>
            Backend Processed Filters
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {hasChanges && (
            <Chip
              icon={<Check />}
              label="Apply"
              onClick={handleApplyFilters}
              disabled={filterLoading}
              size="small"
              sx={{
                bgcolor: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.3)' },
                fontWeight: 'bold'
              }}
            />
          )}
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
      
      <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
        <Stack spacing={2}>
          {/* Region Filter - ORIGINAL DESIGN */}
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
                Region (Backend Data Source)
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

          {/* Node Types Filter */}
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

          {/* Entity Filters - ORIGINAL DESIGN WITH FIXES */}
          <Typography variant="subtitle2" sx={{ 
            color: 'white', 
            fontWeight: 'bold', 
            mt: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}>
            <Person sx={{ fontSize: '1rem' }} />
            Entity Filters (Backend Processed)
          </Typography>

          {/* Consultants - FIXED */}
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

          {/* Field Consultants - FIXED */}
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

          {/* Client Companies - FIXED */}
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

          {/* Products - FIXED */}
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

          {/* Incumbent Products (Recommendations Mode) - FIXED */}
          {recommendationsMode && (
            <Card sx={{ 
              bgcolor: 'rgba(245, 158, 11, 0.1)', 
              border: '2px solid rgba(245, 158, 11, 0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ 
                  color: '#f59e0b', 
                  mb: 1, 
                  fontWeight: 'bold', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5 
                }}>
                  <Psychology sx={{ fontSize: '1rem' }} />
                  Incumbent Products (AI Recommendations)
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
              </CardContent>
            </Card>
          )}

          {/* Advisor Filters - ORIGINAL DESIGN */}
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
            onChange={(_, newValue) => handleFilterChange('clientAdvisorIds', newValue)}
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
            onChange={(_, newValue) => handleFilterChange('consultantAdvisorIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Consultant Advisors" sx={selectStyles} />
            )}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          {/* Legacy PCA/ACA Filters */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.pcas || []}
            value={localFilters.pcaIds || []}
            onChange={(_, newValue) => handleFilterChange('pcaIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="PCAs (Legacy)" sx={selectStyles} />
            )}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          <Autocomplete
            multiple
            size="small"
            options={filterOptions.acas || []}
            value={localFilters.acaIds || []}
            onChange={(_, newValue) => handleFilterChange('acaIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="ACAs (Legacy)" sx={selectStyles} />
            )}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          {/* Business Filters - ORIGINAL DESIGN */}
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 1 }} />
          
          <Typography variant="subtitle2" sx={{ 
            color: 'white', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}>
            <Assessment sx={{ fontSize: '1rem' }} />
            Business Filters (Backend Processed)
          </Typography>

          {/* Sales Regions */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.sales_regions || []}
            value={localFilters.sales_regions || []}
            onChange={(_, newValue) => handleFilterChange('sales_regions', newValue)}
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
            onChange={(_, newValue) => handleFilterChange('channels', newValue)}
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
            onChange={(_, newValue) => handleFilterChange('assetClasses', newValue)}
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
            onChange={(_, newValue) => handleFilterChange('ratings', newValue)}
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
            onChange={(_, newValue) => handleFilterChange('influenceLevels', newValue)}
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
            onChange={(_, newValue) => handleFilterChange('mandateStatuses', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Mandate Statuses" sx={selectStyles} />
            )}
            sx={selectStyles}
            slotProps={{ paper: { sx: getDropdownPaperStyles() } }}
          />

          {/* Show Inactive Toggle - ORIGINAL DESIGN */}
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

          {/* Apply/Reset buttons - ORIGINAL DESIGN */}
          <Box sx={{ 
            pt: 2, 
            flexShrink: 0,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box
                onClick={handleApplyFilters}
                sx={{
                  flexGrow: 1,
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
                Apply Backend Filters
                {hasChanges && <Chip label="!" size="small" sx={{ bgcolor: '#ef4444', color: 'white', height: 16, fontSize: '0.6rem' }} />}
              </Box>
            </Box>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};