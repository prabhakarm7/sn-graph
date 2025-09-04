// components/PerformanceMessage.tsx - Shows performance states and suggestions

import React from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  Stack,
  Button,
  Alert,
  LinearProgress,
  Divider
} from '@mui/material';
import { 
  FilterList, 
  Warning, 
  TrendingUp, 
  Lightbulb, 
  Speed,
  CheckCircle,
  Info
} from '@mui/icons-material';

interface PerformanceState {
  mode: 'filters_only' | 'graph_ready' | 'too_many_nodes';
  message?: string;
  nodeCount?: number;
  suggestions?: Array<{
    filter_type: string;
    filter_field: string;
    filter_value: string;
    description: string;
    estimated_reduction: string;
  }>;
}

interface PerformanceMessageProps {
  performanceState: PerformanceState;
  currentRegion: string;
  recommendationsMode?: boolean;
  onApplySuggestion?: (suggestion: any) => void;
  isDarkTheme?: boolean;
}

export const PerformanceMessage: React.FC<PerformanceMessageProps> = ({
  performanceState,
  currentRegion,
  recommendationsMode = false,
  onApplySuggestion,
  isDarkTheme = true
}) => {
  
  const getStateIcon = () => {
    switch (performanceState.mode) {
      case 'filters_only':
        return <FilterList sx={{ color: '#6366f1', fontSize: '2rem' }} />;
      case 'too_many_nodes':
        return <Warning sx={{ color: '#f59e0b', fontSize: '2rem' }} />;
      case 'graph_ready':
        return <CheckCircle sx={{ color: '#10b981', fontSize: '2rem' }} />;
      default:
        return <Info sx={{ color: '#6366f1', fontSize: '2rem' }} />;
    }
  };

  const getStateColor = () => {
    switch (performanceState.mode) {
      case 'filters_only':
        return '#6366f1';
      case 'too_many_nodes':
        return '#f59e0b';
      case 'graph_ready':
        return '#10b981';
      default:
        return '#6366f1';
    }
  };

  const getStateTitle = () => {
    switch (performanceState.mode) {
      case 'filters_only':
        return 'Ready to Filter';
      case 'too_many_nodes':
        return 'Dataset Too Large';
      case 'graph_ready':
        return 'Graph Loaded';
      default:
        return 'Performance Status';
    }
  };

  const getNodeCountDisplay = () => {
    if (!performanceState.nodeCount) return null;
    
    const count = performanceState.nodeCount;
    const isOverLimit = count > 50;
    
    return (
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Speed sx={{ color: getStateColor(), fontSize: '1rem' }} />
          <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 'bold' }}>
            Performance Status
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min((count / 100) * 100, 100)}
            sx={{
              flexGrow: 1,
              height: 8,
              borderRadius: 4,
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: isOverLimit ? '#f59e0b' : count > 30 ? '#f59e0b' : '#10b981',
                borderRadius: 4
              }
            }}
          />
          <Typography variant="body2" sx={{ 
            color: isOverLimit ? '#f59e0b' : '#10b981',
            fontWeight: 'bold',
            minWidth: 60
          }}>
            {count} nodes
          </Typography>
        </Box>
        
        <Typography variant="caption" sx={{ 
          color: 'rgba(255, 255, 255, 0.6)',
          display: 'block',
          mt: 0.5
        }}>
          Recommended limit: 50 nodes for optimal performance
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      p: 3,
      background: recommendationsMode 
        ? 'linear-gradient(135deg, #0f172a 0%, #1c1917 50%, #292524 100%)'
        : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    }}>
      <Card sx={{
        maxWidth: 600,
        width: '100%',
        bgcolor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
        border: `2px solid ${getStateColor()}30`,
        borderRadius: 3
      }}>
        <CardContent sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {getStateIcon()}
            <Box>
              <Typography variant="h6" sx={{ 
                color: 'white', 
                fontWeight: 'bold',
                mb: 0.5
              }}>
                {getStateTitle()}
              </Typography>
              <Chip 
                label={`${currentRegion} Region`}
                size="small"
                sx={{
                  bgcolor: `${getStateColor()}20`,
                  color: getStateColor(),
                  border: `1px solid ${getStateColor()}40`
                }}
              />
              {recommendationsMode && (
                <Chip 
                  label="Recommendations Mode"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(245, 158, 11, 0.2)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    ml: 1
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Performance Message */}
          <Alert 
            severity={performanceState.mode === 'too_many_nodes' ? 'warning' : 'info'}
            sx={{ 
              mb: 2,
              bgcolor: performanceState.mode === 'too_many_nodes' 
                ? 'rgba(245, 158, 11, 0.1)' 
                : 'rgba(99, 102, 241, 0.1)',
              color: 'white',
              border: `1px solid ${getStateColor()}30`,
              '& .MuiAlert-icon': {
                color: getStateColor()
              }
            }}
          >
            <Typography variant="body2">
              {performanceState.message}
            </Typography>
          </Alert>

          {/* Node Count Display */}
          {getNodeCountDisplay()}

          {/* Suggestions for too_many_nodes mode */}
          {performanceState.mode === 'too_many_nodes' && performanceState.suggestions && performanceState.suggestions.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Lightbulb sx={{ color: '#f59e0b', fontSize: '1.2rem' }} />
                <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 'bold' }}>
                  Performance Suggestions
                </Typography>
              </Box>
              
              <Stack spacing={1}>
                {performanceState.suggestions.slice(0, 4).map((suggestion, index) => (
                  <Card key={index} sx={{
                    bgcolor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 2 }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" sx={{ color: 'white', mb: 0.5 }}>
                            {suggestion.description}
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            color: 'rgba(255, 255, 255, 0.6)',
                            display: 'block'
                          }}>
                            Filter: {suggestion.filter_field} = "{suggestion.filter_value}"
                          </Typography>
                          <Chip 
                            label={`~${suggestion.estimated_reduction} reduction`}
                            size="small"
                            sx={{
                              mt: 1,
                              bgcolor: 'rgba(16, 185, 129, 0.2)',
                              color: '#10b981',
                              fontSize: '0.7rem'
                            }}
                          />
                        </Box>
                        
                        {onApplySuggestion && (
                          <Button
                            size="small"
                            onClick={() => onApplySuggestion(suggestion)}
                            sx={{
                              bgcolor: 'rgba(245, 158, 11, 0.2)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              '&:hover': {
                                bgcolor: 'rgba(245, 158, 11, 0.3)'
                              },
                              fontSize: '0.75rem',
                              minWidth: 'auto',
                              px: 2
                            }}
                          >
                            Apply
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>

              <Typography variant="caption" sx={{ 
                color: 'rgba(255, 255, 255, 0.6)',
                display: 'block',
                mt: 2,
                textAlign: 'center'
              }}>
                Apply filters manually or click suggestions above to reduce dataset size
              </Typography>
            </Box>
          )}

          {/* Instructions for filters_only mode */}
          {performanceState.mode === 'filters_only' && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mb: 2 }} />
              
              <Typography variant="subtitle2" sx={{ color: 'white', mb: 2, fontWeight: 'bold' }}>
                Next Steps
              </Typography>
              
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    1
                  </Box>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    Use filters in the right panel to narrow down your data
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    2
                  </Box>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    Click "Apply Backend Filters" to load the graph
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    3
                  </Box>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    Graph will load if dataset is ≤50 nodes for optimal performance
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};