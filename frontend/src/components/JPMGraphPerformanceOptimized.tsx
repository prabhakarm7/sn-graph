// JPMGraphPerformanceOptimized.tsx - Updated with Smart Queries Interface

import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Drawer, Tabs, Tab, Typography, CircularProgress, Alert } from '@mui/material';
import { Psychology, FilterList as FilterIcon } from '@mui/icons-material';

// Import components
import { nodeTypes, edgeTypes } from './components/NodeComponents';
import { SmartQueriesInterface } from './components/SmartQueriesInterface';
import { WorkingFiltersInterface } from './components/WorkingFiltersInterface';
import { StatsCards } from './components/StatsCards';
import { InsightsPanel } from './components/InsightsPanel';
import { DebugDataDisplay } from './components/DebugDataDisplay';
import { PerformanceMessage } from './components/PerformanceMessage';
import { AppNodeData, EdgeData } from './types/GraphTypes';
import { usePerformanceOptimizedBackendData } from './hooks/usePerformanceOptimizedBackendData';
import { SmartQuery } from './services/SmartQueriesService';

import { GraphDataProvider } from './context/GraphDataProvider';

// Move nodeTypes and edgeTypes outside component to prevent recreation
const STABLE_NODE_TYPES = nodeTypes;
const STABLE_EDGE_TYPES = edgeTypes;

// Inner component that uses ReactFlow hooks
function PerformanceOptimizedGraphComponent() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { fitView } = useReactFlow();
  const [selectedNode, setSelectedNode] = useState<Node<AppNodeData> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge<EdgeData> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node<AppNodeData> | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<Edge<EdgeData> | null>(null);
  const [tabValue, setTabValue] = useState(0); // Start with Smart Queries tab (changed from 1 to 0)
  const [showDebug, setShowDebug] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  
  // Smart Queries state
  const [lastQueryResult, setLastQueryResult] = useState<any>(null);
  const [executedQuery, setExecutedQuery] = useState<SmartQuery | null>(null);
  
  // Local recommendations mode state
  const [recommendationsMode, setRecommendationsMode] = useState(false);

  // PERFORMANCE OPTIMIZED: Use performance-optimized backend data hook
  const { 
    graphData,           
    filterOptions,
    currentFilters,
    currentRegions,
    initialLoading, 
    filterLoading, 
    error,
    changeRegions,       
    applyFilters,        
    resetFilters,        
    getAvailableRegions,
    hasData,
    nodeCount,
    edgeCount,
    performanceState,    
    switchMode,
    isRecommendationsMode,
    dataSource,
    currentMode
  } = usePerformanceOptimizedBackendData();

  // Sync local state with hook's mode detection
  useEffect(() => {
    setRecommendationsMode(isRecommendationsMode);
  }, [isRecommendationsMode]);

  // Handle recommendations mode changes
  const handleRecommendationsModeChange = useCallback(async (mode: 'standard' | 'recommendations') => {
    console.log(`Performance Optimized: Switching to ${mode} mode`);
    setRecommendationsMode(mode === 'recommendations');
    
    try {
      await switchMode(mode);
      console.log(`Performance Optimized: Successfully switched to ${mode} mode`);
    } catch (err) {
      console.error(`Performance Optimized: Failed to switch to ${mode} mode:`, err);
    }
  }, [switchMode]);

  // ReactFlow state - performance optimized
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update ReactFlow when performance-optimized data changes
  useEffect(() => {
    console.log('Performance Optimized: Data state change:', {
      nodes: graphData.nodes.length,
      edges: graphData.edges.length,
      canRender: graphData.canRender,
      performanceMode: graphData.performance.mode,
      dataSource: dataSource
    });
    
    // Only update ReactFlow if we can render and have data
    if (!graphData.canRender || graphData.nodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    // Performance-optimized data with layout
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
    
    // Apply fitView with enhanced timing
    const timeoutId = setTimeout(() => {
      try {
        fitView({ padding: 0.2, duration: 500 });
        console.log('Performance Optimized: FitView applied');
      } catch (error) {
        console.warn('Performance Optimized: FitView failed:', error);
      }
    }, 150);
    
    return () => clearTimeout(timeoutId);
  }, [graphData, setNodes, setEdges, fitView, dataSource]);

  // Handle Smart Query execution
  // Handle Smart Query execution
  const handleQueryExecuted = useCallback(async (result: any, query: SmartQuery) => {
    console.log('Smart Query executed:', query.question, result);
    
    setLastQueryResult(result);
    setExecutedQuery(query);
    
    // If the query returned graph data, we need to update our ReactFlow
    if (result.success && result.render_mode === 'graph' && result.data.nodes) {
      // Transform the NLQ result to ReactFlow format
      const transformedNodes = result.data.nodes.map((node: any) => ({
        ...node,
        position: node.position || { x: Math.random() * 400, y: Math.random() * 400 }
      }));
      
      setNodes(transformedNodes);
      setEdges(result.data.relationships || []);
      
      // Fit view after a short delay
      setTimeout(() => {
        try {
          fitView({ padding: 0.2, duration: 500 });
        } catch (error) {
          console.warn('FitView failed after smart query:', error);
        }
      }, 200);
    }
  }, [setNodes, setEdges, fitView]);

  // Handle suggestion application from performance message
  const handleApplySuggestion = useCallback(async (suggestion: any) => {
    console.log('Performance Optimized: Applying suggestion:', suggestion);
    
    // Convert suggestion to filter criteria
    const filterUpdate: any = {};
    if (suggestion.filter_field && suggestion.filter_value) {
      filterUpdate[suggestion.filter_field] = [suggestion.filter_value];
    }
    
    await applyFilters(filterUpdate);
  }, [applyFilters]);

  // ResizeObserver with proper error handling
  useEffect(() => {
    const observerCb: ResizeObserverCallback = (entries) => {
      try {
        window.requestAnimationFrame(() => {
          if (!Array.isArray(entries) || !entries.length) return;
        });
      } catch (error) {
        console.debug('ResizeObserver callback error (safely ignored):', error);
      }
    };

    let resizeObserver: ResizeObserver | null = null;
    
    try {
      resizeObserver = new ResizeObserver(observerCb);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
    } catch (error) {
      console.warn('Failed to create ResizeObserver:', error);
    }

    return () => {
      try {
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      } catch (error) {
        console.debug('ResizeObserver disconnect error (safely ignored):', error);
      }
    };
  }, []);

  // Event handlers
  const handleNodeClick = (event: React.MouseEvent, node: Node<AppNodeData>) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const handleEdgeClick = (event: React.MouseEvent, edge: Edge<EdgeData>) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  const handleNodeMouseEnter = (event: React.MouseEvent, node: Node<AppNodeData>) => {
    setHoveredNode(node);
    setHoveredEdge(null);
  };

  const handleNodeMouseLeave = () => {
    setHoveredNode(null);
  };

  const handleEdgeMouseEnter = (event: React.MouseEvent, edge: Edge<EdgeData>) => {
    setHoveredEdge(edge);
    setHoveredNode(null);
  };

  const handleEdgeMouseLeave = () => {
    setHoveredEdge(null);
  };

  const handlePaneClick = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Show loading screen during initial load
  if (initialLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh', 
        background: recommendationsMode 
          ? 'linear-gradient(135deg, #0f172a 0%, #1c1917 50%, #292524 100%)'
          : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        color: 'white'
      }}>
        <CircularProgress sx={{ color: recommendationsMode ? '#f59e0b' : '#6366f1', mb: 2 }} size={60} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          Loading Smart Network Analytics
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
          Loading filters for {currentRegions.join(', ')} region
          <br />
          Apply filters or execute smart queries to load graph data
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      background: recommendationsMode 
        ? 'linear-gradient(135deg, #0f172a 0%, #1c1917 50%, #292524 100%)'
        : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      position: 'relative',
      transition: 'background 0.5s ease'
    }}>
      {/* Main Graph Section */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        height: '100vh'
      }}>
        {/* Graph Canvas - 85% of graph section */}
        <Box sx={{ 
          flexGrow: 1, 
          position: 'relative', 
          height: '85%' 
        }} ref={containerRef}>
          
          {/* Error State */}
          {error && (
            <Box sx={{ 
              position: 'absolute', 
              top: 80, 
              left: 16, 
              right: 16, 
              zIndex: 1000 
            }}>
              <Alert severity="error" sx={{ 
                bgcolor: 'rgba(239, 68, 68, 0.1)', 
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  Performance Optimized Backend Error
                </Typography>
                {error}
              </Alert>
            </Box>
          )}

          {/* Loading Overlay */}
          {filterLoading && (
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(15, 23, 42, 0.7)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(4px)'
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <CircularProgress sx={{ color: recommendationsMode ? '#f59e0b' : '#6366f1', mb: 2 }} />
                  <Typography sx={{ color: 'white' }}>
                    Processing {executedQuery ? 'smart query' : 'filters'}...
                  </Typography>
                  {executedQuery && (
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block', mt: 1 }}>
                      Executing: {executedQuery.question}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

          {/* PERFORMANCE OPTIMIZED: Show graph OR performance message */}
          {hasData && graphData.canRender ? (
            // Show ReactFlow Graph
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={STABLE_NODE_TYPES}
              edgeTypes={STABLE_EDGE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onNodeMouseEnter={handleNodeMouseEnter}
              onNodeMouseLeave={handleNodeMouseLeave}
              onEdgeMouseEnter={handleEdgeMouseEnter}
              onEdgeMouseLeave={handleEdgeMouseLeave}
              onPaneClick={handlePaneClick}
              fitView
              panOnDrag
              zoomOnScroll
              proOptions={{ hideAttribution: true }}
              onlyRenderVisibleElements={false}
              minZoom={0.1}
              maxZoom={2}
              fitViewOptions={{ padding: 0.2 }}
              style={{ background: 'transparent' }}
            >
              <Background 
                color={recommendationsMode ? "rgba(245, 158, 11, 0.1)" : "rgba(255, 255, 255, 0.1)"} 
                gap={16} 
                size={1}
                style={{ opacity: 0.3, transition: 'color 0.3s ease' }}
              />
              <MiniMap 
                pannable 
                zoomable 
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  border: recommendationsMode ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  display: 'none', // Hidden by default
                  transition: 'border-color 0.3s ease'
                }}
                maskColor="rgba(15, 23, 42, 0.6)"
              />
              <Controls 
                showInteractive 
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  border: recommendationsMode ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  transition: 'border-color 0.3s ease'
                }}
              />
            </ReactFlow>
          ) : (
            // Show Performance Message (filters_only, too_many_nodes states)
            <PerformanceMessage
              performanceState={performanceState}
              currentRegion={currentRegions[0]}
              recommendationsMode={recommendationsMode}
              onApplySuggestion={handleApplySuggestion}
              isDarkTheme={isDarkTheme}
            />
          )}

          {/* Enhanced Stats Cards with Performance Info */}
          <StatsCards 
            nodes={nodes} 
            edges={edges} 
            showDebug={showDebug}
            setShowDebug={setShowDebug}
            isDarkTheme={isDarkTheme}
            setIsDarkTheme={setIsDarkTheme}
            recommendationsMode={recommendationsMode}
            setRecommendationsMode={setRecommendationsMode}
            onModeChange={handleRecommendationsModeChange}
            currentRegions={currentRegions}
            nodeCount={nodeCount}
            edgeCount={edgeCount}
            dataSource={`${dataSource} (${performanceState.mode})`}
          />
          
          {/* Debug Data Display */}
          <DebugDataDisplay nodes={nodes} edges={edges} show={showDebug} />
          
        </Box>

        {/* Bottom Insights Panel - 15% of graph section */}
        <Box sx={{ 
          height: '15%', 
          borderTop: recommendationsMode ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
          bgcolor: recommendationsMode 
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(15, 23, 42, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(15, 23, 42, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.3s ease'
        }}>
          <InsightsPanel 
            selectedNode={selectedNode || hoveredNode}
            selectedEdge={selectedEdge || hoveredEdge}
            isHovered={!!(hoveredNode || hoveredEdge)}
            isDarkTheme={isDarkTheme}
          />
        </Box>
      </Box>

      {/* Right Panel - Smart Queries and Filters */}
      <Drawer 
        variant="permanent" 
        anchor="right" 
        sx={{ 
          width: 320,
          '& .MuiDrawer-paper': {
            width: 320,
            bgcolor: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(20px)',
            border: 'none',
            borderLeft: '1px solid rgba(99, 102, 241, 0.2)',
            height: '100vh',
            transition: 'all 0.3s ease'
          }
        }}
      >
        <Box sx={{ width: 320, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Tab header with Smart Queries and Filters */}
          <Box sx={{ 
            flexShrink: 0,
            borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
            bgcolor: 'rgba(15, 23, 42, 0.98)',
            transition: 'all 0.3s ease'
          }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              sx={{ 
                minHeight: 56,
                '& .MuiTab-root': { 
                  color: 'rgba(255, 255, 255, 0.7)',
                  minHeight: 56,
                  textTransform: 'none',
                  fontWeight: 'medium',
                  '&.Mui-selected': { 
                    color: '#6366f1',
                    fontWeight: 'bold'
                  }
                },
                '& .MuiTabs-indicator': { 
                  backgroundColor: '#6366f1',
                  transition: 'background-color 0.3s ease'
                }
              }}
            >
              <Tab 
                icon={<Psychology />} 
                label="Smart Queries" 
                iconPosition="start"
                sx={{ 
                  gap: 1,
                  px: 2
                }}
              />
              <Tab 
                icon={<FilterIcon />} 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Filters
                    {filterLoading && (
                      <CircularProgress size={12} sx={{ color: '#6366f1' }} />
                    )}
                    {/* Performance state indicator */}
                    <Box sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: performanceState.mode === 'graph_ready' ? '#10b981' : 
                               performanceState.mode === 'too_many_nodes' ? '#f59e0b' : '#6366f1'
                    }} />
                  </Box>
                }
                iconPosition="start"
                sx={{ 
                  gap: 1,
                  px: 2
                }}
              />
            </Tabs>
          </Box>
          
          {/* Tab content */}
          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'hidden',
            height: 'calc(100vh - 56px)'
          }}>
            <GraphDataProvider value={{
              filterOptions,
              currentFilters,
              currentRegions,
              filterLoading,
              error,
              changeRegions,
              applyFilters,
              resetFilters,
              getAvailableRegions
            }}>
              {tabValue === 0 && (
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <SmartQueriesInterface 
                    recommendationsMode={recommendationsMode}
                    isDarkTheme={isDarkTheme}
                    onQueryExecuted={handleQueryExecuted}
                    onModeChange={handleRecommendationsModeChange}
                  />
                </Box>
              )}
              {tabValue === 1 && (
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <WorkingFiltersInterface 
                    recommendationsMode={recommendationsMode} 
                    isDarkTheme={isDarkTheme}
                  />
                </Box>
              )}
            </GraphDataProvider>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}

// Main wrapper component with ReactFlowProvider
export default function JPMGraphPerformanceOptimized() {
  return (
    <ReactFlowProvider>
      <PerformanceOptimizedGraphComponent />
    </ReactFlowProvider>
  );
}