// JPMGraphPreviewWithFilters.tsx - FIXED Chat Tab and Tab Header Background
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
import { Chat as ChatIcon, FilterList as FilterIcon } from '@mui/icons-material';

// Import components
import { nodeTypes, edgeTypes } from './components/NodeComponents';
import { ChatInterface } from './components/ChatInterface';
import { WorkingFiltersInterface } from './components/WorkingFiltersInterface';
import { StatsCards } from './components/StatsCards';
import { InsightsPanel } from './components/InsightsPanel';
import { DebugDataDisplay } from './components/DebugDataDisplay';
import { AppNodeData, EdgeData } from './types/GraphTypes';
import { useGraphData } from './hooks/useGraphData';
import { GraphDataProvider } from './context/GraphDataProvider';

// Move nodeTypes and edgeTypes outside component to prevent recreation
const STABLE_NODE_TYPES = nodeTypes;
const STABLE_EDGE_TYPES = edgeTypes;

// Inner component that uses ReactFlow hooks
function GraphComponent() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { fitView } = useReactFlow();
  const [selectedNode, setSelectedNode] = useState<Node<AppNodeData> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge<EdgeData> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node<AppNodeData> | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<Edge<EdgeData> | null>(null);
  const [tabValue, setTabValue] = useState(1); // Start with filters tab
  const [showDebug, setShowDebug] = useState(false); // Debug toggle state
  const [isDarkTheme, setIsDarkTheme] = useState(true); // Theme toggle state
  
  // 🆕 NEW: Local recommendations mode state
  const [recommendationsMode, setRecommendationsMode] = useState(false);

  // 🎯 USE ENHANCED useGraphData HOOK
  const { 
    graphData,           // Already contains transformed nodes/edges
    filterOptions,
    currentFilters,
    currentRegions,
    initialLoading, 
    filterLoading, 
    error,
    changeRegions,       // Already handles hierarchical region changes
    applyFilters,        // Already handles hierarchical filtering
    resetFilters,
    getAvailableRegions,
    hasData,
    nodeCount,
    edgeCount,
    // 🆕 NEW: Recommendations mode methods
    switchMode,          // Switch between standard/recommendations
    isRecommendationsMode, // Detect current mode
    dataSource,          // Track data source
    currentMode          // Current mode string
  } = useGraphData();

  // 🆕 NEW: Sync local state with hook's mode detection
  useEffect(() => {
    setRecommendationsMode(isRecommendationsMode);
  }, [isRecommendationsMode]);

  // 🆕 NEW: Handle recommendations mode changes
  const handleRecommendationsModeChange = useCallback(async (mode: 'standard' | 'recommendations') => {
    console.log(`🎯 Switching to ${mode} mode`);
    setRecommendationsMode(mode === 'recommendations');
    
    // 🎯 USE HOOK'S switchMode method
    try {
      await switchMode(mode, currentRegions);
      console.log(`✅ Successfully switched to ${mode} mode`);
    } catch (err) {
      console.error(`❌ Failed to switch to ${mode} mode:`, err);
    }
  }, [currentRegions, switchMode]);

  // 🎯 USE graphData directly from hook (no need for local state)
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update ReactFlow when graphData changes (from hook)
  useEffect(() => {
    console.log('🔄 GraphData from hook changed:', {
      nodes: graphData.nodes.length,
      edges: graphData.edges.length,
      incumbentProducts: graphData.nodes.filter(n => n.type === 'INCUMBENT_PRODUCT').length,
      biRecommends: graphData.edges.filter(e => e.data?.relType === 'BI_RECOMMENDS').length,
      mode: currentMode,
      recommendationsMode
    });
    
    if (graphData.nodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    // Hook already provides layouted data, so use it directly
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
    
    // Apply fitView
    const timeoutId = setTimeout(() => {
      try {
        fitView({ padding: 0.2, duration: 500 });
        console.log('✅ FitView applied');
      } catch (error) {
        console.warn('⚠️ FitView failed:', error);
      }
    }, 150);
    
    return () => clearTimeout(timeoutId);
  }, [graphData, setNodes, setEdges, fitView, currentMode, recommendationsMode]);

  // Debug: Log ReactFlow state changes - FIXED Set iteration
  useEffect(() => {
    console.log('🔍 ReactFlow nodes state changed:', {
      count: nodes.length,
      nodeIds: nodes.slice(0, 5).map(n => n.id),
      nodeTypes: Array.from(new Set(nodes.map(n => n.type).filter(Boolean))), // FIXED
      sampleNode: nodes[0] ? {
        id: nodes[0].id,
        type: nodes[0].type,
        name: nodes[0].data?.name,
        position: nodes[0].position
      } : null
    });
  }, [nodes]);

  useEffect(() => {
    console.log('🔍 ReactFlow edges state changed:', {
      count: edges.length,
      edgeIds: edges.slice(0, 5).map(e => e.id),
      edgeTypes: Array.from(new Set(edges.map(e => e.data?.relType).filter(Boolean))), // FIXED
      sampleEdge: edges[0] ? {
        id: edges[0].id,
        source: edges[0].source,
        target: edges[0].target,
        type: edges[0].type,
        relType: edges[0].data?.relType
      } : null
    });
  }, [edges]);

  // FIXED: ResizeObserver with proper error handling
  useEffect(() => {
    const observerCb: ResizeObserverCallback = (entries) => {
      try {
        window.requestAnimationFrame(() => {
          if (!Array.isArray(entries) || !entries.length) return;
          // Process resize entries if needed
          // For now, we just ensure the callback doesn't throw errors
        });
      } catch (error) {
        // Silently catch ResizeObserver errors to prevent console spam
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
          🔗 Loading {recommendationsMode ? 'Recommendations' : 'Standard'} Network Data
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          Initializing region data for {currentRegions.join(', ')} using {currentMode} workflow...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      background: recommendationsMode 
        ? 'linear-gradient(135deg, #0f172a 0%, #1c1917 50%, #292524 100%)' // Amber-tinted background
        : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)', // Standard background
      position: 'relative',
      transition: 'background 0.5s ease' // Smooth background transition
    }}>
      {/* Main Graph Section */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        height: '100vh'
      }}>
        {/* Graph Canvas - 90% of graph section */}
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
                  {recommendationsMode ? 'Recommendations System Error' : 'Network Loading Error'}
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
                  Applying {recommendationsMode ? 'recommendations' : 'hierarchical'} filters...
                </Typography>
              </Box>
            </Box>
          )}

          {/* ReactFlow Graph */}
          {hasData ? (
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
            // Empty state
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: 'white'
            }}>
              <Typography variant="h6" sx={{ mb: 1, opacity: 0.8 }}>
                No Data Available
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.6 }}>
                Try adjusting your {recommendationsMode ? 'recommendations' : 'hierarchical'} filters or check your region selection
              </Typography>
            </Box>
          )}

          {/* 🆕 UPDATED: Floating Stats Cards with Recommendations Support */}
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
            dataSource={dataSource}
          />
          
          {/* Debug Data Display */}
          <DebugDataDisplay nodes={nodes} edges={edges} show={showDebug} />
          
          {/* REMOVED: Status bar moved to StatsCards */}
        </Box>

        {/* Bottom Insights Panel - 10% of graph section */}
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

      {/* Right Panel - Filters and Chat */}
      <Drawer 
        variant="permanent" 
        anchor="right" 
        sx={{ 
          width: 320,
          '& .MuiDrawer-paper': {
            width: 320,
            bgcolor: 'rgba(15, 23, 42, 0.98)', // FIXED: Same dark background as filter sections
            backdropFilter: 'blur(20px)',
            border: 'none',
            borderLeft: '1px solid rgba(99, 102, 241, 0.2)', // Purple theme
            height: '100vh',
            transition: 'all 0.3s ease'
          }
        }}
      >
        <Box sx={{ width: 320, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Tab header with FIXED background color */}
          <Box sx={{ 
            flexShrink: 0,
            borderBottom: '1px solid rgba(99, 102, 241, 0.2)', // Purple theme
            bgcolor: 'rgba(15, 23, 42, 0.98)', // FIXED: Same dark background as filter sections
            transition: 'all 0.3s ease'
          }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              sx={{ 
                minHeight: 56, // Fixed height for consistent spacing
                '& .MuiTab-root': { 
                  color: 'rgba(255, 255, 255, 0.7)',
                  minHeight: 56,
                  textTransform: 'none',
                  fontWeight: 'medium',
                  '&.Mui-selected': { 
                    color: '#6366f1', // Purple for both
                    fontWeight: 'bold'
                  }
                },
                '& .MuiTabs-indicator': { 
                  backgroundColor: '#6366f1', // Purple for both
                  transition: 'background-color 0.3s ease'
                }
              }}
            >
              <Tab 
                icon={<ChatIcon />} 
                label="Chat" 
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
                    {/* Show mode indicator */}
                    {recommendationsMode && (
                      <Box sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: '#f59e0b'
                      }} />
                    )}
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
          
          {/* Tab content with proper height calculation */}
          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'hidden',
            height: 'calc(100vh - 56px)' // Subtract tab header height
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
                  <ChatInterface />
                </Box>
              )}
              {tabValue === 1 && (
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  {/* 🆕 UPDATED: Pass recommendations mode to WorkingFiltersInterface */}
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

// Main wrapper component with ReactFlowProvider - UNCHANGED
export default function JPMGraphPreviewWithFilters() {
  return (
    <ReactFlowProvider>
      <GraphComponent />
    </ReactFlowProvider>
  );
}