// SmartQueriesInterface.tsx - Updated with conditional error messages after execution attempts

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
  
  // Validation dialog state
  const [validationDialog, setValidationDialog] = useState<{
    open: boolean;
    query: SmartQuery | null;
    missingFilters: string[];
  }>({ open: false, query: null, missingFilters: [] });

  // Access pending filters from localStorage
  const [pendingFilters, setPendingFilters] = useState<any>({});

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

  // Listen for pending filters from localStorage
  useEffect(() => {
    const checkPendingFilters = () => {
      try {
        const stored = localStorage.getItem('workingFilters_pendingFilters');
        if (stored) {
          const parsed = JSON.parse(stored);
          setPendingFilters(parsed);
        } else {
          setPendingFilters({});
        }
      } catch (error) {
        console.warn('Failed to read pending filters:', error);
        setPendingFilters({});
      }
    };

    checkPendingFilters();
    const interval = setInterval(checkPendingFilters, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter queries based on current mode
  const filteredQueries = queries.filter(query => {
    if (recommendationsMode) {
      return query.auto_mode === 'recommendations' || query.auto_mode === 'auto';
    } else {
      return query.auto_mode === 'standard' || query.auto_mode === 'auto';
    }
  });

  // Validate query filters
  const validateQueryExecution = (query: SmartQuery) => {
    const filtersToUse = Object.keys(pendingFilters).length > 0 ? pendingFilters : currentFilters;
    const validation = smartQueriesService.validateQueryFilters(query, filtersToUse);
    
    if (!validation.isValid) {
      setValidationDialog({
        open: true,
        query,
        missingFilters: validation.missingFilters
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
      // Add this query to the list of queries that have been attempted without proper filters
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
      const filtersToUse = Object.keys(pendingFilters).length > 0 ? pendingFilters : currentFilters;
      
      console.log('SmartQueries: Executing with filters:', {
        pendingFilters: Object.keys(pendingFilters).length,
        appliedFilters: Object.keys(currentFilters).length,
        usingPending: Object.keys(pendingFilters).length > 0
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

  // Get filter value display for individual chips
  const getFilterValueDisplay = (filterKey: string, filtersToUse: any) => {
    const value = filtersToUse[filterKey];
    
    if (!value) return null;
    
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      if (value.length === 1) return value[0];
      return `${value.length} items`;
    }
    
    return value;
  };

  // Check if query has missing required filters
  const hasRequiredFilters = (query: SmartQuery) => {
    const filtersToUse = Object.keys(pendingFilters).length > 0 ? pendingFilters : currentFilters;
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
            label={recommendationsMode ? 'AI' : 'Standard'}
            size="small"
            sx={{
              bgcolor: recommendationsMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(99, 102, 241, 0.2)',
              color: recommendationsMode ? '#f59e0b' : '#6366f1',
              fontSize: '0.6rem',
              height: 16
            }}
          />
        </Box>

        {/* Pending filters indicator */}
        {Object.keys(pendingFilters).length > 0 && (
          <Alert severity="info" sx={{ 
            py: 0.5,
            bgcolor: 'rgba(59, 130, 246, 0.1)', 
            color: '#3b82f6',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            '& .MuiAlert-message': { fontSize: '0.7rem' }
          }}>
            Using {Object.keys(pendingFilters).length} pending filters from Filters tab
          </Alert>
        )}

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
            const filtersToUse = Object.keys(pendingFilters).length > 0 ? pendingFilters : currentFilters;
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
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
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
                          Required filters must be selected before execution
                        </Typography>
                      )}
                    </Box>

                    {/* Status + Execute Button */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                      {/* Status Indicator */}
                      {isCompleted && (
                        <CheckCircle sx={{ color: '#10b981', fontSize: '0.9rem' }} />
                      )}
                      
                      {/* Execute Button */}
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

                  {/* Individual Filter Chips */}
                  {query.filter_list && query.filter_list.length > 0 && (
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
                        {query.filter_list
                          .filter(filterKey => filterKey !== 'region') // Skip region as it's handled separately
                          .map((filterKey) => {
                            const filterValue = getFilterValueDisplay(filterKey, filtersToUse);
                            const hasValue = filterValue !== null;
                            
                            return (
                              <Chip
                                key={filterKey}
                                label={hasValue ? `${filterKey}: ${filterValue}` : filterKey}
                                size="small"
                                sx={{
                                  bgcolor: hasValue 
                                    ? 'rgba(16, 185, 129, 0.2)' 
                                    : 'rgba(156, 163, 175, 0.2)',
                                  color: hasValue ? '#10b981' : '#9ca3af',
                                  fontSize: '0.6rem',
                                  height: 16,
                                  maxWidth: '120px',
                                  '& .MuiChip-label': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }
                                }}
                              />
                            );
                          })}
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
            The following filters are required for this query but haven't been selected:
          </Typography>
          <List dense>
            {validationDialog.missingFilters.map((filter) => (
              <ListItem key={filter} sx={{ py: 0.5 }}>
                <ListItemText 
                  primary={filter}
                  sx={{ 
                    '& .MuiListItemText-primary': { 
                      color: '#f59e0b',
                      fontSize: '0.9rem'
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>
          <Typography variant="body2" sx={{ mt: 2, color: 'rgba(255, 255, 255, 0.8)' }}>
            Please apply the required filters in the Filters tab before executing this query.
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