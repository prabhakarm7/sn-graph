// JPMGraphComplete.tsx - Main component using complete backend processing
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Typography, CircularProgress, Alert, Button, Card, CardContent, Chip } from '@mui/material';
import { Speed as SpeedIcon, Cloud as CloudIcon } from '@mui/icons-material';

// Import components
import { nodeTypes, edgeTypes } from './components/NodeComponents';
import { AppNodeData, EdgeData } from './types/GraphTypes';
import { useSimplifiedGraphData } from './hooks/useSimplifiedGraphData';

// Stable references to prevent re-creation
const STABLE_NODE_TYPES = nodeTypes;
const STABLE_EDGE_TYPES = edgeTypes;

// Performance warning component
const PerformanceWarning: React.FC<{
  summary: { totalNodes: number; message: string; suggestions: any[] };
  onApplySuggestion: (suggestion: any) => void;
  onForceRender: () => void;
}> = ({ summary, onApplySuggestion, onForceRender }) => (
  <Box sx={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    maxWidth: 600,
    p: 3,
    textAlign: 'center',
    color: 'white'
  }}>
    <CloudIcon sx={{ fontSize: '4rem', color: '#f59e0b', mb: 2 }} />
    
    <Typography variant="h5" sx={{ mb: 2, color: '#f59e0b', fontWeight: 'bold' }}>
      Dataset Processed on Server
    </Typography>
    
    <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
      {summary.message}
    </Typography>
    
    <Chip 
      label={`${summary.totalNodes} nodes found`}
      sx={{ 
        bgcolor: 'rgba(245, 158, 11, 0.2)', 
        color: '#f59e0b',
        mb: 3,
        fontSize: '0.9rem',
        height: 32
      }} 
    />
    
    {summary.suggestions?.length > 0 && (
      <Card sx={{ 
        mb: 3, 
        bgcolor: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
            Smart Filter Suggestions
          </Typography>
          {summary.suggestions.slice(0, 3).map((suggestion, index) => (
            <Box key={index} sx={{ mb: 1, textAlign: 'left' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => onApplySuggestion(suggestion)}
                sx={{ 
                  color: '#6366f1',
                  borderColor: 'rgba(99, 102, 241, 0.5)',
                  mb: 0.5,
                  mr: 1
                }}
              >
                Apply
              </Button>
              <Typography variant="body2" component="span" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                {suggestion.description}
              </Typography>
            </Box>
          ))}
        </CardContent>
      </Card>
    )}
    
    <Button
      variant="contained"
      onClick={onForceRender}
      sx={{ 
        bgcolor: '#ef4444', 
        '&:hover': { bgcolor: '#dc2626' },
        mr: 2
      }}
    >
      Force Render (Performance Risk)
    </Button>
  </Box>
);

// Main graph component
function CompleteGraphComponent() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { fitView } = useReactFlow();
  
  // Use simplified hook - backend does all processing
  const { 
    graphData,
    backendResponse,
    filterOptions,
    currentFilters,
    currentRegions,
    initialLoading,
    filterLoading,
    error,
    changeRegions,
    applyFilters,
    resetFilters,
    switchMode,
    applyFilterSuggestion,
    forceRender,
    hasData,
    nodeCount,
    edgeCount,
    canRender,
    isPerformanceLimited,
    totalDataNodes,
    isRecommendationsMode,
    serverSideProcessing,
    backendOptimizations
  } = useSimplifiedGraphData();

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Simple filter state for demo
  const [showFilters, setShowFilters] = useState(true);

  // Update ReactFlow when backend-processed data changes
  useEffect(() => {
    console.log('Backend-processed data received:', {
      nodes: graphData.nodes.length,
      edges: graphData.edges.length,
      canRender: graphData.canRender,
      serverProcessed: serverSideProcessing
    });
    
    if (!graphData.canRender) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    // Backend already provides positioned nodes - no client processing needed
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
    
    // Fit view for rendered graphs
    if (graphData.nodes.length > 0) {
      const timeoutId = setTimeout(() => {
        try {
          fitView({ padding: 0.2, duration: 500 });
          console.log('FitView applied to backend-processed graph');
        } catch (error) {
          console.warn('FitView failed:', error);
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [graphData, setNodes, setEdges, fitView, serverSideProcessing]);

  // Memoized filter panel
  const filterPanel = useMemo(() => {
    if (!showFilters || !filterOptions) return null;

    return (
      <Card sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 300,
        maxHeight: '80vh',
        overflow: 'auto',
        bgcolor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        zIndex: 1000
      }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            Backend-Processed Filters
          </Typography>
          
          {serverSideProcessing && (
            <Chip 
              label="Server-Side Processing Active"
              size="small"
              sx={{ 
                bgcolor: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                mb: 2
              }}
            />
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1 }}>
              Region: {currentRegions[0]}
            </Typography>
            
            <Button
              size="small"
              variant="outlined"
              onClick={() => changeRegions(['EMEA'])}
              disabled={currentRegions[0] === 'EMEA' || filterLoading}
              sx={{ color: '#6366f1', borderColor: 'rgba(99, 102, 241, 0.5)', mr: 1 }}
            >
              EMEA
            </Button>
            <Button
              size="small" 
              variant="outlined"
              onClick={() => changeRegions(['APAC'])}
              disabled={currentRegions[0] === 'APAC' || filterLoading}
              sx={{ color: '#6366f1', borderColor: 'rgba(99, 102, 241, 0.5)' }}
            >
              APAC
            </Button>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1 }}>
              Mode
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => switchMode(isRecommendationsMode ? 'standard' : 'recommendations')}
              disabled={filterLoading}
              sx={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.5)' }}
            >
              {isRecommendationsMode ? 'Switch to Standard' : 'Switch to Recommendations'}
            </Button>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1 }}>
              Quick Filters (Backend Applied)
            </Typography>
            
            {filterOptions.companies?.slice(0, 3).map((company: any, index: number) => (
              <Button
                key={index}
                size="small"
                variant="text"
                onClick={() => applyFilters({ clientIds: [company.name] })}
                disabled={filterLoading}
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  display: 'block',
                  textAlign: 'left',
                  mb: 0.5
                }}
              >
                {company.name}
              </Button>
            ))}
          </Box>

          <Button
            variant="outlined"
            fullWidth
            onClick={resetFilters}
            disabled={filterLoading}
            sx={{ 
              color: '#ef4444',
              borderColor: 'rgba(239, 68, 68, 0.5)',
              mt: 2
            }}
          >
            Reset All Filters
          </Button>

          <Button
            variant="text"
            size="small"
            onClick={() => setShowFilters(false)}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.6)',
              mt: 1
            }}
          >
            Hide Filters
          </Button>
        </CardContent>
      </Card>
    );
  }, [showFilters, filterOptions, serverSideProcessing, currentRegions, isRecommendationsMode, filterLoading, changeRegions, switchMode, applyFilters, resetFilters]);

  // Show loading screen
  if (initialLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        color: 'white'
      }}>
        <CloudIcon sx={{ fontSize: '4rem', color: '#6366f1', mb: 2 }} />
        <CircularProgress sx={{ color: '#6366f1', mb: 2 }} size={60} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          Backend Processing Network Data
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
          All complex logic handled server-side
          <br />
          Rating collection, filtering, and layout calculation in progress...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh',
      background: isRecommendationsMode 
        ? 'linear-gradient(135deg, #0f172a 0%, #1c1917 50%, #292524 100%)'
        : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      position: 'relative'
    }}>
      {/* Main graph area */}
      <Box sx={{ 
        flexGrow: 1, 
        position: 'relative',
        height: '100vh'
      }} ref={containerRef}>
        
        {/* Error state */}
        {error && (
          <Box sx={{ 
            position: 'absolute', 
            top: 16, 
            left: 16, 
            right: 320, 
            zIndex: 1000 
          }}>
            <Alert severity="error">
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                Backend Processing Error
              </Typography>
              {error}
            </Alert>
          </Box>
        )}

        {/* Loading overlay */}
        {filterLoading && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(15, 23, 42, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999,
            backdropFilter: 'blur(4px)'
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <CloudIcon sx={{ fontSize: '3rem', color: '#6366f1', mb: 1 }} />
              <CircularProgress sx={{ color: '#6366f1', mb: 2 }} />
              <Typography sx={{ color: 'white' }}>
                Backend processing filters...
              </Typography>
            </Box>
          </Box>
        )}

        {/* Performance warning overlay */}
        {isPerformanceLimited && graphData.summary && (
          <PerformanceWarning
            summary={graphData.summary}
            onApplySuggestion={applyFilterSuggestion}
            onForceRender={forceRender}
          />
        )}

        {/* ReactFlow graph */}
        {canRender && hasData ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={STABLE_NODE_TYPES}
            edgeTypes={STABLE_EDGE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            panOnDrag
            zoomOnScroll
            proOptions={{ hideAttribution: true }}
            onlyRenderVisibleElements={true}
            minZoom={0.1}
            maxZoom={2}
            fitViewOptions={{ padding: 0.2 }}
            style={{ background: 'transparent' }}
          >
            <Background 
              color="rgba(255, 255, 255, 0.1)" 
              gap={16} 
              size={1}
            />
            <Controls 
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px'
              }}
            />
          </ReactFlow>
        ) : canRender ? (
          // Empty state
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: 'white'
          }}>
            <CloudIcon sx={{ fontSize: '4rem', opacity: 0.6, mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1, opacity: 0.8 }}>
              No Data Available
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.6, textAlign: 'center' }}>
              Backend processed your request but no data matches the criteria
              <br />
              Try adjusting your filters or selecting a different region
            </Typography>
          </Box>
        ) : null}

        {/* Status indicator */}
        <Box sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          display: 'flex',
          gap: 1
        }}>
          <Chip
            icon={<SpeedIcon />}
            label={`${nodeCount} nodes`}
            size="small"
            sx={{
              bgcolor: 'rgba(15, 23, 42, 0.8)',
              color: 'white',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}
          />
          {serverSideProcessing && (
            <Chip
              icon={<CloudIcon />}
              label="Backend Processed"
              size="small"
              sx={{
                bgcolor: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}
            />
          )}
        </Box>

        {/* Toggle filters button */}
        {!showFilters && (
          <Button
            onClick={() => setShowFilters(true)}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              bgcolor: 'rgba(99, 102, 241, 0.2)',
              color: '#6366f1',
              '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.3)' }
            }}
          >
            Show Filters
          </Button>
        )}

        {/* Filter panel */}
        {filterPanel}
      </Box>
    </Box>
  );
}

// Main wrapper with ReactFlow provider
export default function JPMGraphComplete() {
  return (
    <ReactFlowProvider>
      <CompleteGraphComponent />
    </ReactFlowProvider>
  );
}