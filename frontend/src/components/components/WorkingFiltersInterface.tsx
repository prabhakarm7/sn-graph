// components/WorkingFiltersInterface.tsx - FIXED Dark Background with Purple Theme

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
  Alert
} from '@mui/material';
import { Clear, Check, Psychology, TrendingUp } from '@mui/icons-material';
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
  
  // Helper function to normalize filter options
  const normalizeFilterOptions = (options: string[] | Array<{id: string, name: string}>): string[] => {
    if (!options || options.length === 0) return [];
    return options.map(item => 
      typeof item === 'string' ? item : (item.name || item.id || String(item))
    );
  };
  
  // Initialize local filters when currentFilters change
  // In WorkingFiltersInterface.tsx - Update the useEffect that initializes local filters

  useEffect(() => {
    // 🎯 FIXED: Ensure PRODUCT is included in recommendations mode
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
      nodeTypes: currentFilters.nodeTypes || getDefaultNodeTypes(), // 🎯 FIXED: Use dynamic default
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
  }, [currentFilters, recommendationsMode]); // 🎯 FIXED: Add recommendationsMode as dependency
  
  // Check if there are unsaved changes
  useEffect(() => {
    const hasUnsavedChanges = JSON.stringify(localFilters) !== JSON.stringify({
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
    });
    setHasChanges(hasUnsavedChanges);
  }, [localFilters, currentFilters]);
  
  const handleRegionChange = async (newRegions: string) => {
    if (newRegions.length === 0) return; // Don't allow empty regions
    
    setLocalFilters(prev => ({ ...prev, regions: [newRegions] }));
    
    // Region change triggers immediate reload (hierarchical strategy)
    await changeRegions([newRegions]);
  };
  
  const handleFilterChange = (field: string, value: any) => {
    setLocalFilters(prev => ({ ...prev, [field]: value }));
  };
  
  const handleApplyFilters = async () => {
    await applyFilters(localFilters);
  };
  
  const handleResetFilters = () => {
    resetFilters();
  };
  
  // Helper function to render chips correctly
  const renderChips = (value: string[], getTagProps: any, customSx?: any) => {
    return value.map((option, index) => {
      const { key, ...chipProps } = getTagProps({ index });
      return (
        <Chip 
          key={key}
          label={option} 
          {...chipProps} 
          sx={customSx || chipStyles} 
        />
      );
    });
  };
  
  // Helper function for colored chips
  const renderColoredChips = (value: string[], getTagProps: any, getColor: (option: string) => string) => {
    return value.map((option, index) => {
      const { key, ...chipProps } = getTagProps({ index });
      const color = getColor(option);
      return (
        <Chip 
          key={key}
          label={option} 
          {...chipProps} 
          sx={{ bgcolor: `${color}30`, color: color, border: `1px solid ${color}50` }}
        />
      );
    });
  };
  
  // 🎨 UNIFIED PURPLE THEME for both modes (but keep amber for incumbent products)
  const selectStyles = {
    '& .MuiOutlinedInput-root': {
      bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.95)',
      color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
      '& fieldset': { 
        borderColor: isDarkTheme ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.5)', // Purple for both
        borderWidth: '1px'
      },
      '&:hover fieldset': { 
        borderColor: isDarkTheme ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.7)'
      },
      '&.Mui-focused fieldset': { 
        borderColor: '#6366f1', // Purple for both
        borderWidth: '2px'
      },
    },
    '& .MuiInputLabel-root': {
      color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
      '&.Mui-focused': {
        color: '#6366f1' // Purple for both
      }
    },
    '& .MuiAutocomplete-popupIndicator': {
      color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'
    },
    '& .MuiAutocomplete-clearIndicator': {
      color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'
    }
  };
  
  // Dark theme dropdown paper styles
  const getDropdownPaperStyles = () => ({
    bgcolor: isDarkTheme ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    border: `1px solid ${isDarkTheme ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)'}`, // Purple for both
    '& .MuiAutocomplete-option': {
      color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
      '&:hover': {
        bgcolor: 'rgba(99, 102, 241, 0.1)' // Purple hover for both
      }
    }
  });
  
  const chipStyles = {
    bgcolor: 'rgba(99, 102, 241, 0.2)', // Purple for both
    color: '#6366f1',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    '& .MuiChip-deleteIcon': {
      color: '#6366f1'
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.sales_regions && localFilters.sales_regions.length > 0) count++;
    if (localFilters.channels && localFilters.channels.length > 0) count++;
    if (localFilters.nodeTypes && localFilters.nodeTypes.length < 5) count++;
    if (localFilters.ratings && localFilters.ratings.length > 0) count++;
    if (localFilters.influenceLevels && localFilters.influenceLevels.length > 0) count++;
    if (localFilters.assetClasses && localFilters.assetClasses.length > 0) count++;
    if (localFilters.consultantIds && localFilters.consultantIds.length > 0) count++;
    if (localFilters.fieldConsultantIds && localFilters.fieldConsultantIds.length > 0) count++;
    if (localFilters.clientIds && localFilters.clientIds.length > 0) count++;
    if (localFilters.productIds && localFilters.productIds.length > 0) count++;
    if (localFilters.incumbentProductIds && localFilters.incumbentProductIds.length > 0) count++;
    if (localFilters.clientAdvisorIds && localFilters.clientAdvisorIds.length > 0) count++;
    if (localFilters.consultantAdvisorIds && localFilters.consultantAdvisorIds.length > 0) count++;
    if (localFilters.mandateStatuses && localFilters.mandateStatuses.length > 0) count++;
    return count;
  };

  if (!filterOptions) {
    return (
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        bgcolor: 'rgba(15, 23, 42, 0.98)' // FIXED: Dark background
      }}>
        <CircularProgress sx={{ color: '#6366f1' }} />
        <Typography sx={{ ml: 2, color: 'white' }}>
          Loading hierarchical filter options...
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
      bgcolor: 'rgba(15, 23, 42, 0.98)' // FIXED: Dark background
    }}>
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
            🔗 Graph Filters
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
          {/* Region Filter - Primary Filter (Hierarchical Strategy) */}
          <Card sx={{ 
            bgcolor: 'rgba(99, 102, 241, 0.1)', 
            border: '2px solid rgba(99, 102, 241, 0.3)', // Purple for both
            backdropFilter: 'blur(10px)'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ 
                color: '#6366f1', 
                mb: 1, 
                fontWeight: 'bold' 
              }}>
                🌍 Region (📊 Data Source)
              </Typography>
              <Autocomplete
                size="small"
                options={getAvailableRegions()}
                value={currentRegions[0] || 'NAI'}
                onChange={(_, newValue) => newValue && handleRegionChange(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Select Region" sx={selectStyles} />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props} sx={{ color: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Box sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: option === currentRegions[0] ? '#10b981' : 'rgba(255, 255, 255, 0.3)'
                      }} />
                      <Typography sx={{ flexGrow: 1, color: 'white' }}>{option}</Typography>
                      {option === currentRegions[0] && (
                        <Chip 
                          label="Active" 
                          size="small" 
                          sx={{ 
                            height: 18, 
                            fontSize: '0.65rem', 
                            bgcolor: '#10b981', 
                            color: 'white',
                            fontWeight: 'bold'
                          }} 
                        />
                      )}
                    </Box>
                  </Box>
                )}
                disableClearable
                sx={selectStyles}
                slotProps={{
                  paper: {
                    sx: getDropdownPaperStyles()
                  }
                }}
              />
              <Typography variant="caption" sx={{ 
                color: 'rgba(99, 102, 241, 0.8)', 
                mt: 0.5, 
                display: 'block' 
              }}>
                Active: {currentRegions[0]} • Changes reload all data & filters
              </Typography>
            </CardContent>
          </Card>

          {/* Enhanced PCA/ACA Filters */}
          <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
            👥 Enhanced Advisor Filters
          </Typography>

          {/* Client Advisors (Company PCA + ACA) */}
          <Card sx={{ 
            bgcolor: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid rgba(16, 185, 129, 0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Autocomplete
                multiple
                size="small"
                options={filterOptions.clientAdvisors || []}
                value={localFilters.clientAdvisorIds || []}
                onChange={(_, newValue) => handleFilterChange('clientAdvisorIds', newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Client Advisors" sx={selectStyles} />
                )}
                renderTags={(value, getTagProps) => 
                  value.map((option, index) => {
                    const { key, ...chipProps } = getTagProps({ index });
                    return (
                      <Chip 
                        key={key}
                        label={option} 
                        {...chipProps} 
                        sx={{
                          bgcolor: 'rgba(16, 185, 129, 0.2)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}
                      />
                    );
                  })
                }
                sx={selectStyles}
                slotProps={{
                  paper: {
                    sx: {
                      ...getDropdownPaperStyles(),
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      '& .MuiAutocomplete-option': {
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'rgba(16, 185, 129, 0.1)'
                        }
                      }
                    }
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Consultant Advisors (Consultant PCA + Advisor) */}
          <Autocomplete
                multiple
                size="small"
                options={filterOptions.consultantAdvisors || []}
                value={localFilters.consultantAdvisorIds || []}
                onChange={(_, newValue) => handleFilterChange('consultantAdvisorIds', newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Consultant Advisors" sx={selectStyles} />
                )}
                renderTags={(value, getTagProps) => 
                  value.map((option, index) => {
                    const { key, ...chipProps } = getTagProps({ index });
                    return (
                      <Chip 
                        key={key}
                        label={option} 
                        {...chipProps} 
                        sx={{
                          bgcolor: 'rgba(168, 85, 247, 0.2)',
                          color: '#a855f7',
                          border: '1px solid rgba(168, 85, 247, 0.3)'
                        }}
                      />
                    );
                  })
                }
                sx={selectStyles}
                slotProps={{
                  paper: {
                    sx: {
                      ...getDropdownPaperStyles(),
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      '& .MuiAutocomplete-option': {
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'rgba(168, 85, 247, 0.1)'
                        }
                      }
                    }
                  }
                }}
              />

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Geographic Filters */}
          <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 'bold' }}>
            🌎 Geographic Filters
          </Typography>

          {/* Market (Sales Region) */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.sales_regions || []}
            value={localFilters.sales_regions || []}
            onChange={(_, newValue) => handleFilterChange('sales_regions', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Market (Sales Region)" sx={selectStyles} />
            )}
            renderTags={(value, getTagProps) => renderChips(value, getTagProps, chipStyles)}
            sx={selectStyles}
            slotProps={{
              paper: {
                sx: getDropdownPaperStyles()
              }
            }}
          />

          {/* Channel */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.channels || []}
            value={localFilters.channels || []}
            onChange={(_, newValue) => handleFilterChange('channels', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Channel" sx={selectStyles} />
            )}
            renderTags={(value, getTagProps) => renderChips(value, getTagProps, chipStyles)}
            sx={selectStyles}
            slotProps={{
              paper: {
                sx: getDropdownPaperStyles()
              }
            }}
          />

          {/* Asset Class */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.assetClasses || []}
            value={localFilters.assetClasses || []}
            onChange={(_, newValue) => handleFilterChange('assetClasses', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Asset Class" sx={selectStyles} />
            )}
            renderTags={(value, getTagProps) => renderChips(value, getTagProps, chipStyles)}
            sx={selectStyles}
            slotProps={{
              paper: {
                sx: getDropdownPaperStyles()
              }
            }}
          />

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Node Types */}
          <Box>
            <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
              🎯 Node Types
            </Typography>
            <FormGroup row>
              {['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT', 'INCUMBENT_PRODUCT'].map((nodeType) => (
                <FormControlLabel
                  key={`nodetype-${nodeType}`}
                  control={
                    <Checkbox
                      checked={(localFilters.nodeTypes || []).includes(nodeType)}
                      onChange={(e) => {
                        const currentTypes = localFilters.nodeTypes || [];
                        const newTypes = e.target.checked
                          ? [...currentTypes, nodeType]
                          : currentTypes.filter(t => t !== nodeType);
                        handleFilterChange('nodeTypes', newTypes);
                      }}
                      sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&.Mui-checked': { 
                          color: nodeType === 'INCUMBENT_PRODUCT' ? '#f59e0b' : '#6366f1' // Keep amber for incumbent
                        }
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ 
                      color: 'white', 
                      fontSize: '0.8rem',
                      fontWeight: nodeType === 'INCUMBENT_PRODUCT' ? 'bold' : 'normal'
                    }}>
                      {nodeType.replace('_', ' ')}
                      {nodeType === 'INCUMBENT_PRODUCT' && (
                        <Chip 
                          label="REC" 
                          size="small" 
                          sx={{ 
                            ml: 0.5, 
                            height: 16, 
                            fontSize: '0.6rem', 
                            bgcolor: '#f59e0b', 
                            color: 'white' 
                          }} 
                        />
                      )}
                    </Typography>
                  }
                />
              ))}
            </FormGroup>
          </Box>

          {/* Product Ratings */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.ratings || []}
            value={localFilters.ratings || []}
            onChange={(_, newValue) => handleFilterChange('ratings', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Product Ratings" sx={selectStyles} />
            )}
            renderTags={(value, getTagProps) => 
              renderColoredChips(value, getTagProps, (option) => 
                option === 'Positive' ? '#16a34a' : 
                option === 'Negative' ? '#dc2626' : 
                option === 'Introduced' ? '#0891b2' : '#6b7280'
              )
            }
            sx={selectStyles}
            slotProps={{
              paper: {
                sx: getDropdownPaperStyles()
              }
            }}
          />

          {/* Level of Influence */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.influenceLevels || []}
            value={localFilters.influenceLevels || []}
            onChange={(_, newValue) => handleFilterChange('influenceLevels', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Level of Influence" sx={selectStyles} />
            )}
            renderTags={(value, getTagProps) => renderChips(value, getTagProps, chipStyles)}
            sx={selectStyles}
            slotProps={{
              paper: {
                sx: getDropdownPaperStyles()
              }
            }}
          />

          {/* Mandate Status */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.mandateStatuses || []}
            value={localFilters.mandateStatuses || []}
            onChange={(_, newValue) => handleFilterChange('mandateStatuses', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Mandate Status" sx={selectStyles} />
            )}
            renderTags={(value, getTagProps) => 
              renderColoredChips(value, getTagProps, (option) => 
                option === 'Active' ? '#16a34a' : 
                option === 'At Risk' ? '#dc2626' : 
                option === 'Conversion in Progress' ? '#f59e0b' : '#6b7280'
              )
            }
            sx={selectStyles}
            slotProps={{
              paper: {
                sx: getDropdownPaperStyles()
              }
            }}
          />

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Entity Filters (Populated from Region Data) */}
          <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 'bold' }}>
            🏢 Entities (from {currentRegions.join(', ')} region)
          </Typography>

          {/* Consultants */}
          <Autocomplete
            multiple
            size="small"
            options={normalizeFilterOptions(filterOptions.consultants || [])}
            value={localFilters.consultantIds || []}
            onChange={(_, newValue) => handleFilterChange('consultantIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Consultants" sx={selectStyles} />
            )}
            renderTags={(value, getTagProps) => renderChips(value, getTagProps, chipStyles)}
            sx={selectStyles}
            slotProps={{
              paper: {
                sx: getDropdownPaperStyles()
              }
            }}
          />

          {/* Field Consultants */}
          <Autocomplete
            multiple
            size="small"
            options={normalizeFilterOptions(filterOptions.fieldConsultants || [])}
            value={localFilters.fieldConsultantIds || []}
            onChange={(_, newValue) => handleFilterChange('fieldConsultantIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Field Consultants" sx={selectStyles} />
            )}
            renderTags={(value, getTagProps) => renderChips(value, getTagProps, chipStyles)}
            sx={selectStyles}
            slotProps={{
              paper: {
                sx: getDropdownPaperStyles()
              }
            }}
          />

          {/* Client Companies */}
          <Autocomplete
            multiple
            size="small"
            options={normalizeFilterOptions(filterOptions.clients || [])}
            value={localFilters.clientIds || []}
            onChange={(_, newValue) => handleFilterChange('clientIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Client Companies" sx={selectStyles} />
            )}
            renderTags={(value, getTagProps) => renderChips(value, getTagProps, chipStyles)}
            sx={selectStyles}
            slotProps={{
              paper: {
                sx: getDropdownPaperStyles()
              }
            }}
          />

          {/* Products */}
          <Autocomplete
            multiple
            size="small"
            options={normalizeFilterOptions(filterOptions.products || [])}
            value={localFilters.productIds || []}
            onChange={(_, newValue) => handleFilterChange('productIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Products" sx={selectStyles} />
            )}
            renderTags={(value, getTagProps) => renderChips(value, getTagProps, chipStyles)}
            sx={selectStyles}
            slotProps={{
              paper: {
                sx: getDropdownPaperStyles()
              }
            }}
          />

          {/* NEW: Incumbent Products (Only in Recommendations Mode) */}
          {recommendationsMode && (
            <Card sx={{ 
              bgcolor: 'rgba(245, 158, 11, 0.1)', 
              border: '2px solid rgba(245, 158, 11, 0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#f59e0b', mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Psychology sx={{ fontSize: '1rem' }} />
                  Incumbent Products (Recommendation Engine)
                </Typography>
                <Autocomplete
                  multiple
                  size="small"
                  options={filterOptions.incumbent_products || []}
                  value={localFilters.incumbentProductIds || []}
                  onChange={(_, newValue) => handleFilterChange('incumbentProductIds', newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Incumbent Products" sx={selectStyles} />
                  )}
                  renderTags={(value, getTagProps) => renderChips(value, getTagProps, {
                    bgcolor: 'rgba(245, 158, 11, 0.2)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    '& .MuiChip-deleteIcon': {
                      color: '#f59e0b'
                    }
                  })}
                  sx={selectStyles}
                  slotProps={{
                    paper: {
                      sx: {
                        ...getDropdownPaperStyles(),
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        '& .MuiAutocomplete-option': {
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'rgba(245, 158, 11, 0.1)'
                          }
                        }
                      }
                    }
                  }}
                />
                <Typography variant="caption" sx={{ 
                  color: 'rgba(245, 158, 11, 0.8)', 
                  mt: 0.5, 
                  display: 'block',
                  fontSize: '0.7rem'
                }}>
                  Products that provide AI-driven recommendations to other products in the network
                </Typography>
              </CardContent>
            </Card>
          )}

          <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
        
          {/* Simplified Filter Summary */}
          <Card sx={{ 
            bgcolor: 'rgba(255, 255, 255, 0.05)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
                📊 Filter Status
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Active Filters
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    color: '#6366f1', 
                    fontWeight: 'bold' 
                  }}>
                    {getActiveFilterCount()}
                  </Typography>
                </Box>
                {hasChanges && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      Status
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      color: '#f59e0b', 
                      fontWeight: 'bold' 
                    }}>
                      Unsaved Changes
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>
      
      {/* Enhanced Apply/Reset Buttons */}
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
              bgcolor: hasChanges ? '#6366f1' : 'rgba(99, 102, 241, 0.5)', // Purple for both
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
              '&:active': hasChanges ? {
                transform: 'translateY(0px)'
              } : {},
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1
            }}
          >
            {filterLoading && <CircularProgress size={16} sx={{ color: 'white' }} />}
            Apply Enhanced Filters
            {hasChanges && <Chip label="!" size="small" sx={{ bgcolor: '#ef4444', color: 'white', height: 16, fontSize: '0.6rem' }} />}
          </Box>
          <Box
            onClick={handleResetFilters}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              py: 1.5,
              px: 2,
              borderRadius: 2,
              textAlign: 'center',
              cursor: 'pointer',
              fontWeight: 'medium',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                borderColor: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            ↻
          </Box>
        </Box>
      </Box>
    </Box>
  );
};