// utils/graphLayout.ts
import dagre from 'dagre';
import { Node, Edge } from 'reactflow';

const NODE_W = 240;
const NODE_H = 120;

export const enhancedLayoutWithDagre = (nodes: Node[], edges: Edge[]) => {
  // Copy the exact function from usePerformanceOptimizedBackendData.ts
  if (nodes.length === 0) return { nodes: [], edges };
  
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  
  // Enhanced layout configuration based on node types and relationships
  const hasIncumbentProducts = nodes.some(n => n.type === 'INCUMBENT_PRODUCT');
  const totalNodes = nodes.length;
  
  // Dynamic layout based on graph complexity
  if (hasIncumbentProducts) {
    g.setGraph({ 
      rankdir: 'TB', 
      nodesep: 150, 
      ranksep: 200, 
      marginx: 50, 
      marginy: 50 
    });
  } else if (totalNodes > 20) {
    g.setGraph({ 
      rankdir: 'TB', 
      nodesep: 100, 
      ranksep: 120, 
      marginx: 30, 
      marginy: 30 
    });
  } else {
    g.setGraph({ 
      rankdir: 'TB', 
      nodesep: 180, 
      ranksep: 160, 
      marginx: 60, 
      marginy: 60 
    });
  }

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  
  dagre.layout(g);

  const layoutedNodes = nodes.map((n) => {
    const pos = g.node(n.id);
    return { 
      ...n, 
      position: { 
        x: pos.x - NODE_W / 2, 
        y: pos.y - NODE_H / 2 
      } 
    };
  });

  return { nodes: layoutedNodes, edges };
};