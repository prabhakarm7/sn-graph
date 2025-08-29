import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { Box, Drawer, Tabs, Tab, Typography } from '@mui/material';
import { Chat as ChatIcon, FilterList as FilterIcon } from '@mui/icons-material';

// Import components
import { nodeTypes, edgeTypes } from './components/NodeComponents';
import { generateSampleGraph, addCrossLinks } from './utils/GraphGenerator';
import { ChatInterface } from './components/ChatInterface';
import { FiltersInterface } from './components/FiltersInterface';
import { StatsCards } from './components/StatsCards';
import { InsightsPanel } from './components/InsightsPanel';
import { AppNodeData, EdgeData } from './types/GraphTypes';

/* =========================
   Dagre Layout
   ========================= */
const NODE_W = 240;
const NODE_H = 120;

const layoutWithDagre = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 120, ranksep: 160 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const layoutedNodes = nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } };
  });

  return { nodes: layoutedNodes, edges };
};

/* =========================
   Main Component
   ========================= */
export default function JPMGraphPreview() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node<AppNodeData> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge<EdgeData> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node<AppNodeData> | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<Edge<EdgeData> | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Generate graph data
  const bigGraph = useMemo(
    () => generateSampleGraph({
      consultants: 2,
      fieldPerConsultant: 1,
      companiesPerField: 1,
      productsPerCompany: 1,
    }),
    []
  );

  const denseGraph = useMemo(
    () => addCrossLinks(bigGraph.nodes, bigGraph.edges, { 
      extraCoversPerField: 1, 
      extraRatingsPerProduct: 2 
    }),
    [bigGraph.nodes, bigGraph.edges]
  );

  const layouted = useMemo(
    () => layoutWithDagre(denseGraph.nodes, denseGraph.edges),
    [denseGraph.nodes, denseGraph.edges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<AppNodeData>(layouted.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layouted.edges);

  // Handle resize observer
  useEffect(() => {
    const observerCb: ResizeObserverCallback = (entries) => {
      window.requestAnimationFrame(() => {
        if (!Array.isArray(entries) || !entries.length) return;
      });
    };
    const ro = new ResizeObserver(observerCb);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Re-layout on mount
  useEffect(() => {
    const { nodes: n2, edges: e2 } = layoutWithDagre(nodes as Node[], edges as Edge[]);
    setNodes(n2);
    setEdges(e2);
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

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      position: 'relative'
    }}>
      {/* Main Graph Section - 90:10 split internally */}
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
          height: '90%' 
        }} ref={containerRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
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
            onlyRenderVisibleElements
            minZoom={0.1}
            maxZoom={2}
            fitViewOptions={{ padding: 0.2 }}
            style={{ background: 'transparent' }}
          >
            <Background 
              color="rgba(255, 255, 255, 0.1)" 
              gap={16} 
              size={1}
              style={{ opacity: 0.3 }}
            />
            <MiniMap 
              pannable 
              zoomable 
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px'
              }}
              maskColor="rgba(15, 23, 42, 0.6)"
            />
            <Controls 
              showInteractive 
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px'
              }}
            />
          </ReactFlow>

          {/* Floating Stats Cards */}
          <StatsCards nodes={nodes} edges={edges} />
        </Box>

        {/* Bottom Insights Panel - 10% of graph section */}
        <Box sx={{ 
          height: '10%', 
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          bgcolor: 'rgba(15, 23, 42, 0.98)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center'
        }}>
          <InsightsPanel 
            selectedNode={selectedNode || hoveredNode}
            selectedEdge={selectedEdge || hoveredEdge}
            isHovered={!!(hoveredNode || hoveredEdge)}
          />
        </Box>
      </Box>

      {/* Right Filter Panel - Full Height */}
      <Drawer 
        variant="permanent" 
        anchor="right" 
        sx={{ 
          width: 320,
          '& .MuiDrawer-paper': {
            width: 320,
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            border: 'none',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            height: '100vh' // Full height
          }
        }}
      >
        <Box sx={{ width: 320, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{ 
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              '& .MuiTab-root': { 
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-selected': { color: '#6366f1' }
              },
              '& .MuiTabs-indicator': { backgroundColor: '#6366f1' }
            }}
          >
            <Tab 
              icon={<ChatIcon />} 
              label="Chat" 
              sx={{ minHeight: 64, textTransform: 'none' }}
            />
            <Tab 
              icon={<FilterIcon />} 
              label="Filters" 
              sx={{ minHeight: 64, textTransform: 'none' }}
            />
          </Tabs>
          
          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            {tabValue === 0 && <ChatInterface />}
            {tabValue === 1 && <FiltersInterface />}
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}