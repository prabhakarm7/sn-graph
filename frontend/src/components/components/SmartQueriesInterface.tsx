// SmartQueriesInterface.tsx - Fixed with improved real-time filter sync

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  IconButton, 
  Chip, 
  Alert,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { Psychology, PlayArrow, TrendingUp, CheckCircle, Warning, Close } from '@mui/icons-material';
import { useGraphDataContext } from '../context/GraphDataProvider';
import { SmartQueriesService, SmartQuery } from '../services/SmartQueriesService';

interface SmartQueriesInterfaceProps {
  recommendationsMode?: boolean;
  isDarkTheme?: boolean;
  onQueryExecuted?: (result: any, query: SmartQuery) => void;
  onModeChange?: (mode: 'standard' | 'recommendations') => void;
}

// Display name mapping for user-friendly filter names
const getFilterDisplayName = (filterKey: string): string => {
  const displayNames: Record<string, string> = {
    'company.name': 'Company Name',
    'consultant.name': 'Consultant Name',
    'field_consultant.name': 'Field Consultant Name',
    'product.name': 'Product Name',
    'incumbent_product.name': 'Incumbent Product Name',
    'company.pca': 'Company PCA',
    'consultant.consultant_advisor': 'Consultant Advisor',
    'company.sales_region': 'Sales Region',
    'company.channel': 'Channel',
    'product.asset_class': 'Asset Class',
    'relationship.mandate_status': 'Mandate Status',
    'relationship.level_of_influence': 'Influence Level',
    'rating.rankgroup': 'Rating',
    'region': 'Region'
  };
  
  return displayNames[filterKey] || filterKey;
};

// Key for localStorage to make it unique per mode
const getStorageKey = (mode: boolean) => `workingFilters_pendingFilters_${mode ? 'reco' : 'std'}`;

export const SmartQueriesInterface: React.FC<SmartQueriesInterfaceProps> = ({
  recommendationsMode = false,
  isDarkTheme = true,
  onQueryExecuted,
  onModeChange
}) => {
  const { 
    currentFilters, 
    currentRegions,
    filterLoading,
    error 
  } = useGraphDataContext();

  const [queries, setQueries] = useState<SmartQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingQuery, setExecutingQuery] = useState<string | null>(null);
  const [lastExecutedQuery, setLastExecutedQuery] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [queriesWithFilterErrors, setQueriesWithFilterErrors] = useState<Set<string>>(new Set());
  
  // NEW: State for real-time pending filters with mode-specific storage
  const [pendingFilters, setPendingFilters] = useState<any>({});
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);
  
  // Validation dialog state
  const [validationDialog, setValidationDialog] = useState<{
    open: boolean;
    query: SmartQuery | null;
    missingFilters: string[];
  }>({ open: false, query: null, missingFilters: [] });

  const smartQueriesService = SmartQueriesService.getInstance();

  // Load smart queries
  useEffect(() => {
    const loadQueries = async () => {
      try {
        setLoading(true);
        const smartQueries = await smartQueriesService.getSmartQueries();
        setQueries(smartQueries);
        console.log('Smart queries loaded:', smartQueries.length);
      } catch (err) {
        console.error('Failed to load smart queries:', err);
      } finally {
        setLoading(false);
      }
    };

    loadQueries();
  }, []);

  // NEW: Enhanced real-time pending filters from localStorage with mode-specific keys
  useEffect(() => {
    const checkPendingFilters = () => {
      try {
        // Check for pending filters specific to this mode
        const modeSpecificKey = getStorageKey(recommendationsMode);
        const storedPending = localStorage.getItem(modeSpecificKey);
        
        if (storedPending && storedPending.trim() !== '{}' && storedPending.trim() !== '') {
          const parsed = JSON.parse(storedPending);
          if (Object.keys(parsed).length > 0) {
            setPendingFilters(parsed);
            setHasUnappliedChanges(true);
            console.log('SmartQueries: Found pending filters for mode:', recommendationsMode, parsed);
            return;
          }
        }
        
        // Fallback: check the old key for backward compatibility
        const fallbackStored = localStorage.getItem('workingFilters_pendingFilters');
        if (fallbackStored && fallbackStored.trim() !== '{}' && fallbackStored.trim() !== '') {
          const parsed = JSON.parse(fallbackStored);
          if (Object.keys(parsed).length > 0) {
            setPendingFilters(parsed);
            setHasUnappliedChanges(true);
            console.log('SmartQueries: Found pending filters (fallback):', parsed);
            return;
          }
        }
        
        // No pending filters found
        setPendingFilters({});
        setHasUnappliedChanges(false);
      } catch (error) {
        console.warn('Failed to read pending filters:', error);
        setPendingFilters({});
        setHasUnappliedChanges(false);
      }
    };

    // Initial check
    checkPendingFilters();
    
    // Poll for changes every 500ms for real-time updates
    const interval = setInterval(checkPendingFilters, 500);
    return () => clearInterval(interval);
  }, [recommendationsMode]); // Include recommendationsMode as dependency

  // NEW: Get the most current filters (pending if available, otherwise applied)
  const getCurrentFilters = () => {
    if (Object.keys(pendingFilters).length > 0) {
      return pendingFilters;
    }
    return currentFilters;
  };

  // Filter queries based on current mode
  const filteredQueries = queries.filter(query => {
    if (recommendationsMode) {
      return query.auto_mode === 'recommendations' || query.auto_mode === 'auto';
    } else {
      return query.auto_mode === 'standard' || query.auto_mode === 'auto';
    }
  });

  const validateQueryExecution = (query: SmartQuery) => {
    const filtersToUse = getCurrentFilters();
    const validation = smartQueriesService.validateQueryFilters(query, filtersToUse);
    
    console.log('Query validation result:', {
      queryId: query.id,
      isValid: validation.isValid,
      filtersToUse,
      validation,
      usingPendingFilters: Object.keys(pendingFilters).length > 0,
      mode: recommendationsMode
    });
    
    if (!validation.isValid) {
      const availableFilters = Object.keys(query.example_filters).filter(f => f !== 'region');
      
      setValidationDialog({
        open: true,
        query,
        missingFilters: availableFilters
      });
      return false;
    }
    return true;
  };

  // Execute smart query
  const executeQuery = async (query: SmartQuery) => {
    if (!currentRegions.length) {
      setExecutionError('No region selected');
      return;
    }

    // Validate filters first
    if (!validateQueryExecution(query)) {
      setQueriesWithFilterErrors(prev => new Set([...Array.from(prev), query.id]));
      return;
    }

    // Clear any previous filter errors for this query since validation passed
    setQueriesWithFilterErrors(prev => {
      const newSet = new Set(Array.from(prev));
      newSet.delete(query.id);
      return newSet;
    });

    setExecutingQuery(query.id);
    setExecutionError(null);

    try {
      const filtersToUse = getCurrentFilters();
      
      console.log('SmartQueries: Executing with filters:', {
        pendingFilters: Object.keys(pendingFilters).length,
        appliedFilters: Object.keys(currentFilters).length,
        usingPending: Object.keys(pendingFilters).length > 0,
        filtersToUse,
        mode: recommendationsMode
      });

      // Check if query requires mode switch
      const modeRequirement = await smartQueriesService.getModeRequirement(query.id);
      if (modeRequirement.requiredMode !== (recommendationsMode ? 'recommendations' : 'standard')) {
        console.log(`Smart query requires ${modeRequirement.requiredMode} mode, switching...`);
        if (onModeChange) {
          await onModeChange(modeRequirement.requiredMode);
        }
      }

      const result = await smartQueriesService.executeSmartQuery(
        query.id,
        currentRegions[0],
        filtersToUse,
        recommendationsMode ? 'recommendations' : 'standard'
      );

      console.log('Smart query executed successfully:', result);
      setLastExecutedQuery(query.id);
      
      if (onQueryExecuted) {
        onQueryExecuted(result.result, query);
      }

    } catch (err) {
      console.error('Smart query execution failed:', err);
      setExecutionError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setExecutingQuery(null);
    }
  };

  // Get execution status for a query
  const getQueryStatus = (query: SmartQuery) => {
    if (executingQuery === query.id) return 'executing';
    if (lastExecutedQuery === query.id) return 'completed';
    return 'ready';
  };

  // Updated getFilterValueDisplay function to use current filters
  const getFilterValueDisplay = (filterKey: string) => {
    const filtersToUse = getCurrentFilters();
    
    // Map dot-notation key back to frontend key to get the actual filter value
    const frontendKeyMap: Record<string, string> = {
      'company.name': 'clientIds',
      'consultant.name': 'consultantIds',
      'field_consultant.name': 'fieldConsultantIds',
      'product.name': 'productIds',
      'incumbent_product.name': 'incumbentProductIds',
      'company.pca': 'clientAdvisorIds',
      'consultant.consultant_advisor': 'consultantAdvisorIds',
      'company.sales_region': 'sales_regions',
      'company.channel': 'channels',
      'product.asset_class': 'assetClasses',
      'relationship.mandate_status': 'mandateStatuses',
      'relationship.level_of_influence': 'influenceLevels',
      'rating.rankgroup': 'ratings',
      'region': 'regions'
    };
    
    const frontendKey = frontendKeyMap[filterKey] || filterKey;
    const value = filtersToUse[frontendKey];
    
    console.log('Filter value lookup (real-time):', {
      dotNotationKey: filterKey,
      frontendKey: frontendKey,
      value: value,
      hasValue: value && (Array.isArray(value) ? value.length > 0 : true),
      usingPendingFilters: Object.keys(pendingFilters).length > 0,
      mode: recommendationsMode
    });
    
    if (!value) return null;
    
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      if (value.length === 1) return value[0];
      return `${value.length} items`;
    }
    
    return value;
  };

  // Updated hasRequiredFilters function to use current filters
  const hasRequiredFilters = (query: SmartQuery) => {
    const filtersToUse = getCurrentFilters();
    const validation = smartQueriesService.validateQueryFilters(query, filtersToUse);
    return validation.isValid;
  };

  const closeValidationDialog = () => {
    setValidationDialog({ open: false, query: null, missingFilters: [] });
  };

  if (loading) {
    return (
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        height: '200px',
        bgcolor: 'rgba(15, 23, 42, 0.98)'
      }}>
        <CircularProgress sx={{ color: recommendationsMode ? '#f59e0b' : '#6366f1', mb: 2 }} />
        <Typography sx={{ color: 'white' }}>Loading Smart Queries...</Typography>
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
      {/* Compact Header */}
      <Box sx={{ 
        flexShrink: 0,
        p: 1.5,
        borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
        bgcolor: 'rgba(15, 23, 42, 0.98)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Psychology sx={{ color: recommendationsMode ? '#f59e0b' : '#6366f1', fontSize: '1.1rem' }} />
          <Typography variant="subtitle1" sx={{ 
            color: 'white', 
            fontWeight: 'bold',
            fontSize: '0.9rem'
          }}>
            Smart Queries
          </Typography>
          <Chip
            label={recommendationsMode ? 'Recommendation' : 'Standard'}
            size="small"
            sx={{
              bgcolor: recommendationsMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(99, 102, 241, 0.2)',
              color: recommendationsMode ? '#f59e0b' : '#6366f1',
              fontSize: '0.6rem',
              height: 16
            }}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ 
            py: 0.5,
            bgcolor: 'rgba(239, 68, 68, 0.1)', 
            color: '#ef4444',
            '& .MuiAlert-message': { fontSize: '0.7rem' }
          }}>
            {error}
          </Alert>
        )}

        {executionError && (
          <Alert severity="error" sx={{ 
            py: 0.5,
            mb: 1,
            bgcolor: 'rgba(239, 68, 68, 0.1)', 
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            '& .MuiAlert-message': { fontSize: '0.75rem' }
          }}>
            {executionError}
          </Alert>
        )}
      </Box>

      {/* Compact Queries List */}
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        px: 1.5,
        pb: 1.5
      }}>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {filteredQueries.map((query) => {
            const status = getQueryStatus(query);
            const isExecuting = status === 'executing';
            const isCompleted = status === 'completed';
            const hasAllRequiredFilters = hasRequiredFilters(query);

            return (
              <Card 
                key={query.id}
                sx={{ 
                  bgcolor: recommendationsMode 
                    ? 'rgba(245, 158, 11, 0.08)' 
                    : 'rgba(99, 102, 241, 0.08)', 
                  border: `1px solid ${recommendationsMode 
                    ? 'rgba(245, 158, 11, 0.2)' 
                    : 'rgba(99, 102, 241, 0.2)'}`,
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s ease',
                  '&:hover': !isExecuting ? {
                    transform: 'translateY(-1px)',
                    boxShadow: `0 2px 8px ${recommendationsMode 
                      ? 'rgba(245, 158, 11, 0.15)' 
                      : 'rgba(99, 102, 241, 0.15)'}`
                  } : {}
                }}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  {/* Compact Header Row */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    {/* Question Text */}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ 
                        color: 'white', 
                        fontWeight: 'medium',
                        lineHeight: 1.3,
                        fontSize: '0.8rem',
                      }}>
                        {query.question}
                      </Typography>
                      
                      {/* Error message for missing filters - only after attempted execution */}
                      {!hasAllRequiredFilters && queriesWithFilterErrors.has(query.id) && (
                        <Typography variant="caption" sx={{ 
                          color: '#ef4444',
                          fontSize: '0.65rem',
                          display: 'block',
                          mt: 0.5,
                          fontStyle: 'italic'
                        }}>
                          At least one required filter must be selected before execution
                        </Typography>
                      )}
                    </Box>

                    {/* Status + Execute Button */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                      {/* Status Indicator */}
                      {isCompleted && (
                        <CheckCircle sx={{ color: '#10b981', fontSize: '0.9rem' }} />
                      )}
                      
                      {/* Execute Button - Always enabled so users can see validation popup */}
                      <IconButton
                        size="small"
                        onClick={() => executeQuery(query)}
                        disabled={isExecuting || filterLoading || !currentRegions.length}
                        sx={{
                          bgcolor: recommendationsMode ? '#f59e0b' : '#6366f1',
                          color: 'white',
                          width: 28,
                          height: 28,
                          '&:hover': {
                            bgcolor: recommendationsMode ? '#d97706' : '#4f46e5'
                          },
                          '&:disabled': {
                            bgcolor: 'rgba(156, 163, 175, 0.3)',
                            color: 'rgba(255, 255, 255, 0.5)'
                          }
                        }}
                      >
                        {isExecuting ? (
                          <CircularProgress size={12} sx={{ color: 'white' }} />
                        ) : (
                          <PlayArrow sx={{ fontSize: '0.9rem' }} />
                        )}
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Query Mode and Status */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, mb: 1 }}>
                    <Chip
                      label={query.auto_mode}
                      size="small"
                      sx={{
                        bgcolor: query.auto_mode === 'recommendations' 
                          ? 'rgba(245, 158, 11, 0.2)' 
                          : 'rgba(99, 102, 241, 0.2)',
                        color: query.auto_mode === 'recommendations' ? '#f59e0b' : '#6366f1',
                        fontSize: '0.6rem',
                        height: 16
                      }}
                    />

                    {/* Execution Status */}
                    {status !== 'ready' && (
                      <Box sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: status === 'executing' ? '#f59e0b' : '#10b981',
                        animation: status === 'executing' ? 'pulse 1.5s infinite' : 'none'
                      }} />
                    )}
                  </Box>

                  {/* Individual Filter Chips with REAL-TIME UPDATES */}
                  {query.example_filters && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.65rem',
                        display: 'block',
                        mb: 0.5
                      }}>
                        Required filters:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(() => {
                          const filterKeys = Object.keys(query.example_filters).filter(filterKey => filterKey !== 'region');
                          
                          return filterKeys.map((filterKey: string) => {
                            const filterValue = getFilterValueDisplay(filterKey);
                            const hasValue = filterValue !== null;
                            const displayName = getFilterDisplayName(filterKey);
                            
                            return (
                              <Chip
                                key={filterKey}
                                label={hasValue ? `${displayName}: ${filterValue}` : displayName}
                                size="small"
                                sx={{
                                  bgcolor: hasValue 
                                    ? (hasUnappliedChanges 
                                        ? 'rgba(245, 158, 11, 0.2)'  // Orange for pending
                                        : 'rgba(16, 185, 129, 0.2)') // Green for applied
                                    : 'rgba(156, 163, 175, 0.2)',
                                  color: hasValue 
                                    ? (hasUnappliedChanges ? '#f59e0b' : '#10b981')
                                    : '#9ca3af',
                                  fontSize: '0.6rem',
                                  height: 16,
                                  border: hasValue && hasUnappliedChanges 
                                    ? '1px solid rgba(245, 158, 11, 0.4)' 
                                    : 'none'
                                }}
                              />
                            );
                          });
                        })()}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {filteredQueries.length === 0 && (
            <Card sx={{ 
              bgcolor: 'rgba(156, 163, 175, 0.1)', 
              border: '1px solid rgba(156, 163, 175, 0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <TrendingUp sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '1.5rem', mb: 1 }} />
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  No queries for {recommendationsMode ? 'AI' : 'standard'} mode
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Box>

      {/* Validation Dialog */}
      <Dialog
        open={validationDialog.open}
        onClose={closeValidationDialog}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            color: 'white',
            border: '1px solid rgba(99, 102, 241, 0.3)'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning sx={{ color: '#f59e0b' }} />
          Missing Required Filters
          <IconButton
            onClick={closeValidationDialog}
            sx={{ ml: 'auto', color: 'rgba(255, 255, 255, 0.7)' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.8)' }}>
            This query requires <strong>at least one</strong> of the following filters to be selected. 
            You can choose any one (or more) from the list below:
          </Typography>
          <List dense>
            {validationDialog.missingFilters.map((filterKey) => {
              const filtersToUse = getCurrentFilters();
              const filterValue = filtersToUse[filterKey];
              const hasValue = filterValue && (Array.isArray(filterValue) ? filterValue.length > 0 : true);
              
              return (
                <ListItem key={filterKey} sx={{ py: 0.5 }}>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getFilterDisplayName(filterKey)}
                        {hasValue && (
                          <Chip 
                            label="✓ Selected" 
                            size="small" 
                            sx={{ 
                              bgcolor: 'rgba(16, 185, 129, 0.2)', 
                              color: '#10b981',
                              height: 16,
                              fontSize: '0.6rem'
                            }} 
                          />
                        )}
                      </Box>
                    }
                    sx={{ 
                      '& .MuiListItemText-primary': { 
                        color: hasValue ? '#10b981' : '#f59e0b',
                        fontSize: '0.9rem'
                      }
                    }}
                  />
                </ListItem>
              );
            })}
          </List>
          <Typography variant="body2" sx={{ mt: 2, color: 'rgba(255, 255, 255, 0.8)' }}>
            Please select at least one filter in the Filters tab, then try executing the query again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeValidationDialog} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};