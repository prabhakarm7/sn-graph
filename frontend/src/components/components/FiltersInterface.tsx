// components/FiltersInterface.tsx
import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Stack, 
  Divider, 
  Card, 
  CardContent,
  Chip,
  Switch,
  FormControlLabel,
  Autocomplete,
  TextField,
  Checkbox,
  FormGroup
} from '@mui/material';
import { Clear } from '@mui/icons-material';

export const FiltersInterface: React.FC = () => {
  // Region filter - NAI selected by default
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['NAI']);
  const regionOptions = ['NAI', 'EMEA', 'APAC'];

  // Market (Sales Region) filter
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const marketOptions = ['East', 'West', 'Central', 'International'];

  // Channel filter
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const channelOptions = [
    'Consultant Sales',
    'North Americas Institutional DC',
    'Asia Institutional', 
    'Beta Strategies',
    'North Americas Institutional DB'
  ];

  // Node types - all selected by default
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<string[]>([
    'COMPANY', 'FIELD_CONSULTANT', 'PRODUCT', 'CONSULTANT'
  ]);
  const nodeTypeOptions = ['COMPANY', 'FIELD_CONSULTANT', 'PRODUCT', 'CONSULTANT'];

  // Product Rankings/Ratings
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);
  const ratingOptions = ['Positive', 'Negative', 'Introduced', 'Neutral'];

  // Level of Influence
  const [selectedInfluenceLevels, setSelectedInfluenceLevels] = useState<string[]>([]);
  const influenceLevelOptions = ['UNK', '1', '2', '3', '4', 'High', 'medium', 'low'];

  // Asset Class
  const [selectedAssetClasses, setSelectedAssetClasses] = useState<string[]>([]);
  const assetClassOptions = ['Equities', 'Fixed Income', 'Real Estate', 'Commodities', 'Alternatives'];

  // Specific entity filters (these would be populated from actual data)
  const [selectedFieldConsultants, setSelectedFieldConsultants] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>([]);
  const [selectedClientAdvisors, setSelectedClientAdvisors] = useState<string[]>([]);
  const [selectedConsultantAdvisors, setSelectedConsultantAdvisors] = useState<string[]>([]);

  // Mock data for entity filters
  const fieldConsultantOptions = ['Field Consultant 1', 'Field Consultant 2', 'Field Consultant 3'];
  const productOptions = ['Product 1', 'Product 2', 'Product 3', 'Product 4'];
  const clientOptions = ['Client 1', 'Client 2', 'Client 3'];
  const consultantOptions = ['Senior Consultant 1', 'Senior Consultant 2', 'Senior Consultant 3'];
  const clientAdvisorOptions = ['ACA_1', 'ACA_2', 'ACA_3'];
  const consultantAdvisorOptions = ['PCA_1', 'PCA_2', 'PCA_3'];

  // Performance and connection sliders - REMOVED
  const [showInactiveNodes, setShowInactiveNodes] = useState(true);

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

  const clearAllFilters = () => {
    setSelectedRegions(['NAI']); // Keep NAI as default
    setSelectedMarkets([]);
    setSelectedChannels([]);
    setSelectedNodeTypes(['COMPANY', 'FIELD_CONSULTANT', 'PRODUCT', 'CONSULTANT']); // Keep defaults
    setSelectedRatings([]);
    setSelectedInfluenceLevels([]);
    setSelectedAssetClasses([]);
    setSelectedFieldConsultants([]);
    setSelectedProducts([]);
    setSelectedClients([]);
    setSelectedConsultants([]);
    setSelectedClientAdvisors([]);
    setSelectedConsultantAdvisors([]);
  };

  return (
    <Box sx={{ p: 2, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        mb: 2,
        flexShrink: 0 // Prevent header from shrinking
      }}>
        <Typography variant="h6" sx={{ 
          color: 'white', 
          fontWeight: 'bold',
          fontSize: '1rem'
        }}>
          Advanced Filters
        </Typography>
        <Chip
          icon={<Clear />}
          label="Clear All"
          onClick={clearAllFilters}
          size="small"
          sx={{
            bgcolor: 'rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.3)' }
          }}
        />
      </Box>
      
      <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
        <Stack spacing={2}>
        {/* Region Filter */}
        <Autocomplete
          multiple
          size="small"
          options={regionOptions}
          value={selectedRegions}
          onChange={(_, newValue) => setSelectedRegions(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Region" sx={selectStyles} />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} {...getTagProps({ index })} sx={chipStyles} />
            ))
          }
          sx={selectStyles}
        />

        {/* Market (Sales Region) */}
        <Autocomplete
          multiple
          size="small"
          options={marketOptions}
          value={selectedMarkets}
          onChange={(_, newValue) => setSelectedMarkets(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Market (Sales Region)" sx={selectStyles} />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} {...getTagProps({ index })} sx={chipStyles} />
            ))
          }
          sx={selectStyles}
        />

        {/* Channel */}
        <Autocomplete
          multiple
          size="small"
          options={channelOptions}
          value={selectedChannels}
          onChange={(_, newValue) => setSelectedChannels(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Channel" sx={selectStyles} />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} {...getTagProps({ index })} sx={chipStyles} />
            ))
          }
          sx={selectStyles}
        />

        {/* Asset Class */}
        <Autocomplete
          multiple
          size="small"
          options={assetClassOptions}
          value={selectedAssetClasses}
          onChange={(_, newValue) => setSelectedAssetClasses(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Asset Class" sx={selectStyles} />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} {...getTagProps({ index })} sx={chipStyles} />
            ))
          }
          sx={selectStyles}
        />

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Node Types */}
        <Box>
          <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
            Node Types
          </Typography>
          <FormGroup row>
            {nodeTypeOptions.map((nodeType) => (
              <FormControlLabel
                key={`nodetype-${nodeType}`}
                control={
                  <Checkbox
                    checked={selectedNodeTypes.includes(nodeType)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedNodeTypes([...selectedNodeTypes, nodeType]);
                      } else {
                        setSelectedNodeTypes(selectedNodeTypes.filter(t => t !== nodeType));
                      }
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
          options={ratingOptions}
          value={selectedRatings}
          onChange={(_, newValue) => setSelectedRatings(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Product Ratings" sx={selectStyles} />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const color = option === 'Positive' ? '#16a34a' : 
                           option === 'Negative' ? '#dc2626' : 
                           option === 'Introduced' ? '#0891b2' : '#6b7280';
              return (
                <Chip 
                  label={option} 
                  {...getTagProps({ index })} 
                  sx={{ bgcolor: `${color}30`, color: color, border: `1px solid ${color}50` }}
                />
              );
            })
          }
          sx={selectStyles}
        />

        {/* Level of Influence */}
        <Autocomplete
          multiple
          size="small"
          options={influenceLevelOptions}
          value={selectedInfluenceLevels}
          onChange={(_, newValue) => setSelectedInfluenceLevels(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Level of Influence" sx={selectStyles} />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} {...getTagProps({ index })} sx={chipStyles} />
            ))
          }
          sx={selectStyles}
        />

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Field Consultants */}
        <Autocomplete
          multiple
          size="small"
          options={fieldConsultantOptions}
          value={selectedFieldConsultants}
          onChange={(_, newValue) => setSelectedFieldConsultants(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Field Consultants" sx={selectStyles} />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} {...getTagProps({ index })} sx={chipStyles} />
            ))
          }
          sx={selectStyles}
        />

        {/* Consultants */}
        <Autocomplete
          multiple
          size="small"
          options={consultantOptions}
          value={selectedConsultants}
          onChange={(_, newValue) => setSelectedConsultants(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Consultants" sx={selectStyles} />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} {...getTagProps({ index })} sx={chipStyles} />
            ))
          }
          sx={selectStyles}
        />

        {/* Products */}
        <Autocomplete
          multiple
          size="small"
          options={productOptions}
          value={selectedProducts}
          onChange={(_, newValue) => setSelectedProducts(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Products" sx={selectStyles} />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} {...getTagProps({ index })} sx={chipStyles} />
            ))
          }
          sx={selectStyles}
        />

        {/* Client Companies */}
        <Autocomplete
          multiple
          size="small"
          options={clientOptions}
          value={selectedClients}
          onChange={(_, newValue) => setSelectedClients(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Client Companies" sx={selectStyles} />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} {...getTagProps({ index })} sx={chipStyles} />
            ))
          }
          sx={selectStyles}
        />

        {/* Client Advisors */}
        <Autocomplete
          multiple
          size="small"
          options={clientAdvisorOptions}
          value={selectedClientAdvisors}
          onChange={(_, newValue) => setSelectedClientAdvisors(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Client Advisors (ACA)" sx={selectStyles} />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} {...getTagProps({ index })} sx={chipStyles} />
            ))
          }
          sx={selectStyles}
        />

        {/* Consultant Advisors */}
        <Autocomplete
          multiple
          size="small"
          options={consultantAdvisorOptions}
          value={selectedConsultantAdvisors}
          onChange={(_, newValue) => setSelectedConsultantAdvisors(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Consultant Advisors (PCA)" sx={selectStyles} />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} {...getTagProps({ index })} sx={chipStyles} />
            ))
          }
          sx={selectStyles}
        />

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Performance & Metrics Section - REMOVED */}

        <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
        
        {/* Network Statistics */}
        <Card sx={{ 
          bgcolor: 'rgba(255, 255, 255, 0.05)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
              Applied Filters Summary
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Active Filters
                </Typography>
                <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 'bold' }}>
                  {[
                    selectedRegions.length > 0 ? 'Region' : '',
                    selectedMarkets.length > 0 ? 'Market' : '',
                    selectedChannels.length > 0 ? 'Channel' : '',
                    selectedNodeTypes.length < 4 ? 'Nodes' : '',
                    selectedRatings.length > 0 ? 'Ratings' : '',
                    selectedInfluenceLevels.length > 0 ? 'Influence' : '',
                    selectedAssetClasses.length > 0 ? 'Assets' : ''
                  ].filter(Boolean).length}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
              </Stack>
      </Box>
      
      {/* Submit/Apply Button */}
      <Box sx={{ 
        pt: 2, 
        flexShrink: 0,
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Box sx={{
          display: 'flex',
          gap: 2
        }}>
          <Box
            onClick={() => {
              // Apply filters logic would go here
              console.log('Applying filters...');
            }}
            sx={{
              flexGrow: 1,
              bgcolor: '#6366f1',
              color: 'white',
              py: 1.5,
              px: 3,
              borderRadius: 2,
              textAlign: 'center',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: '#4f46e5',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              },
              '&:active': {
                transform: 'translateY(0px)'
              }
            }}
          >
            Apply Filters
          </Box>
          <Box
            onClick={() => {
              // Reset/refresh logic would go here
              console.log('Refreshing graph...');
            }}
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