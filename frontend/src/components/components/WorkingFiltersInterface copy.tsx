// components/WorkingFiltersInterface.tsx - UPDATED with Enhanced PCA/ACA Logic

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
import { Clear, Check } from '@mui/icons-material';
import { useGraphDataContext } from '../context/GraphDataProvider';
import type { FilterCriteria } from '../types/FitlerTypes';

export const WorkingFiltersInterface: React.FC = () => {
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
  
  // ... existing helper functions for rendering chips ...
  
  // Initialize local filters when currentFilters change
  useEffect(() => {
    setLocalFilters({
      regions: currentFilters.regions,
      sales_regions: currentFilters.sales_regions || [],
      channels: currentFilters.channels || [],
      nodeTypes: currentFilters.nodeTypes || ['CONSULTANT', 'FIELD_CONSULTANT', 'COMPANY', 'PRODUCT', 'INCUMBENT_PRODUCT'],
      ratings: currentFilters.ratings || [],
      influenceLevels: currentFilters.influenceLevels || [],
      assetClasses: currentFilters.assetClasses || [],
      consultantIds: currentFilters.consultantIds || [],
      fieldConsultantIds: currentFilters.fieldConsultantIds || [],
      clientIds: currentFilters.clientIds || [],
      productIds: currentFilters.productIds || [],
      // Legacy PCA/ACA
      pcaIds: currentFilters.pcaIds || [],
      acaIds: currentFilters.acaIds || [],
      // NEW: Enhanced PCA/ACA
      clientAdvisorIds: currentFilters.clientAdvisorIds || [],
      consultantAdvisorIds: currentFilters.consultantAdvisorIds || [],
      legacyPcaIds: currentFilters.legacyPcaIds || [],
      mandateStatuses: currentFilters.mandateStatuses || [],
      showInactive: currentFilters.showInactive
    });
    setHasChanges(false);
  }, [currentFilters]);
  
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
  
  const handleRegionChange = async (newRegions: string[]) => {
    if (newRegions.length === 0) return; // Don't allow empty regions
    
    setLocalFilters(prev => ({ ...prev, regions: newRegions }));
    
    // Region change triggers immediate reload (hierarchical strategy)
    await changeRegions(newRegions);
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
  
  const selectStyles = {
    '& .MuiOutlinedInput-root': {
      bgcolor: 'rgba(255, 255, 255, 0.08)',
      color: 'white',
      '& fieldset': { 
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: '1px'
      },
      '&:hover fieldset': { 
        borderColor: 'rgba(255, 255, 255, 0.4)' 
      },
      '&.Mui-focused fieldset': { 
        borderColor: '#6366f1',
        borderWidth: '2px'
      },
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(255, 255, 255, 0.7)',
      '&.Mui-focused': {
        color: '#6366f1'
      }
    },
    '& .MuiAutocomplete-popupIndicator': {
      color: 'rgba(255, 255, 255, 0.7)'
    },
    '& .MuiAutocomplete-clearIndicator': {
      color: 'rgba(255, 255, 255, 0.7)'
    }
  };
  
  const chipStyles = {
    bgcolor: 'rgba(99, 102, 241, 0.2)',
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
    if (localFilters.clientAdvisorIds && localFilters.clientAdvisorIds.length > 0) count++;
    if (localFilters.consultantAdvisorIds && localFilters.consultantAdvisorIds.length > 0) count++;
    if (localFilters.mandateStatuses && localFilters.mandateStatuses.length > 0) count++;
    return count;
  };

  if (!filterOptions) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress sx={{ color: '#6366f1' }} />
        <Typography sx={{ ml: 2, color: 'white' }}>Loading hierarchical filter options...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        mb: 2,
        flexShrink: 0
      }}>
        <Typography variant="h6" sx={{ 
          color: 'white', 
          fontWeight: 'bold',
          fontSize: '1rem'
        }}>
          🔗 Graph Filters
        </Typography>
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
            border: '2px solid rgba(99, 102, 241, 0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#6366f1', mb: 1, fontWeight: 'bold' }}>
                🌍 Primary Region (📊 Data Source)
              </Typography>
              <Autocomplete
                multiple
                size="small"
                options={getAvailableRegions()}
                value={localFilters.regions || []}
                onChange={(_, newValue) => handleRegionChange(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Region" sx={selectStyles} />
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
                          bgcolor: 'rgba(99, 102, 241, 0.3)',
                          color: '#6366f1',
                          border: '1px solid rgba(99, 102, 241, 0.5)',
                          fontWeight: 'bold'
                        }} 
                      />
                    );
                  })
                }
                sx={selectStyles}
              />
              <Typography variant="caption" sx={{ color: 'rgba(99, 102, 241, 0.8)', mt: 0.5, display: 'block' }}>
                Current: {currentRegions.join(', ')} • Changes reload all data & filters
              </Typography>
            </CardContent>
          </Card>

          {/* Client Advisors (Company PCA + ACA) */}
          <Card sx={{ 
            bgcolor: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid rgba(16, 185, 129, 0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#10b981', mb: 1, fontWeight: 'bold' }}>
                🏢 Client Advisors (Company PCA + ACA)
              </Typography>
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
              />
              <Typography variant="caption" sx={{ color: 'rgba(16, 185, 129, 0.8)', mt: 0.5, display: 'block' }}>
                Combined from Company PCA + ACA fields • {(filterOptions.clientAdvisors || []).length} options
              </Typography>
            </CardContent>
          </Card>

          {/* Consultant Advisors (Consultant PCA + Advisor) */}
          <Card sx={{ 
            bgcolor: 'rgba(168, 85, 247, 0.1)', 
            border: '1px solid rgba(168, 85, 247, 0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#a855f7', mb: 1, fontWeight: 'bold' }}>
                👨‍💼 Consultant Advisors (Consultant PCA + Advisor)
              </Typography>
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
              />
              <Typography variant="caption" sx={{ color: 'rgba(168, 85, 247, 0.8)', mt: 0.5, display: 'block' }}>
                Combined from Consultant PCA + Advisor fields • {(filterOptions.consultantAdvisors || []).length} options
              </Typography>
            </CardContent>
          </Card>
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
              />
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
            renderTags={(value, getTagProps) => renderChips(value, getTagProps)}
            sx={selectStyles}
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
            renderTags={(value, getTagProps) => renderChips(value, getTagProps)}
            sx={selectStyles}
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
            renderTags={(value, getTagProps) => renderChips(value, getTagProps)}
            sx={selectStyles}
          />

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Node Types */}
          <Box>
            <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
              Node Types
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
                        '&.Mui-checked': { color: '#6366f1' }
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8rem' }}>
                      {nodeType.replace('_', ' ')}
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
            renderTags={(value, getTagProps) => renderChips(value, getTagProps)}
            sx={selectStyles}
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
            options={filterOptions.consultants || []}
            value={localFilters.consultantIds || []}
            onChange={(_, newValue) => handleFilterChange('consultantIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Consultants" sx={selectStyles} />
            )}
            renderTags={(value, getTagProps) => renderChips(value, getTagProps)}
            sx={selectStyles}
          />

          {/* Field Consultants */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.fieldConsultants || []}
            value={localFilters.fieldConsultantIds || []}
            onChange={(_, newValue) => handleFilterChange('fieldConsultantIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Field Consultants" sx={selectStyles} />
            )}
            renderTags={(value, getTagProps) => renderChips(value, getTagProps)}
            sx={selectStyles}
          />

          {/* Client Companies */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.clients || []}
            value={localFilters.clientIds || []}
            onChange={(_, newValue) => handleFilterChange('clientIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Client Companies" sx={selectStyles} />
            )}
            renderTags={(value, getTagProps) => renderChips(value, getTagProps)}
            sx={selectStyles}
          />

          {/* Products */}
          <Autocomplete
            multiple
            size="small"
            options={filterOptions.products || []}
            value={localFilters.productIds || []}
            onChange={(_, newValue) => handleFilterChange('productIds', newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Products" sx={selectStyles} />
            )}
            renderTags={(value, getTagProps) => renderChips(value, getTagProps)}
            sx={selectStyles}
          />
          

          <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
        
          {/* Filter Summary */}
          <Card sx={{ 
            bgcolor: 'rgba(255, 255, 255, 0.05)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
                📊 Enhanced Filter Status
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Active Filters
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 'bold' }}>
                    {getActiveFilterCount()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Current Region
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                    {currentRegions.join(', ')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Client Advisors
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                    {(filterOptions.clientAdvisors || []).length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Consultant Advisors
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#a855f7', fontWeight: 'bold' }}>
                    {(filterOptions.consultantAdvisors || []).length}
                  </Typography>
                </Box>
                {hasChanges && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      Status
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                      Unsaved Changes
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Filter Source
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 'bold' }}>
                    Enhanced Hierarchical API
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>
      
      {/* Apply/Reset Buttons */}
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