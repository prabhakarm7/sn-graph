import React, { useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  Node,
  Edge,
  EdgeProps,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { Box, Drawer, Typography, Divider, Chip, Stack } from '@mui/material';

/* =========================
   Types
   ========================= */
type RankGroup = 'Introduced' | 'Positive' | 'Negative';
type ProductRating = { consultant: string; rankgroup: RankGroup };
type AppNodeData = { label: string; ratings?: ProductRating[] };
type EdgeData = { relType?: 'EMPLOYS' | 'COVERS' | 'OWNS'; mandateStatus?: string };

/* =========================
   Custom Node Components (vertical handles)
   ========================= */
const ConsultantNode = React.memo(function ConsultantNode({ data }: NodeProps<AppNodeData>) {
  return (
    <div style={{ padding: 10, background: '#6366f1', color: 'white', borderRadius: 8, minWidth: 160, textAlign: 'center' }}>
      <strong>{data.label}</strong>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

const FieldConsultantNode = React.memo(function FieldConsultantNode({ data }: NodeProps<AppNodeData>) {
  return (
    <div style={{ padding: 10, background: '#10b981', color: 'white', borderRadius: 8, minWidth: 160, textAlign: 'center' }}>
      <Handle type="target" position={Position.Top} />
      <strong>{data.label}</strong>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

const CompanyNode = React.memo(function CompanyNode({ data }: NodeProps<AppNodeData>) {
  return (
    <div style={{ padding: 10, background: '#dc2626', color: 'white', borderRadius: 8, minWidth: 180, textAlign: 'center' }}>
      <Handle type="target" position={Position.Top} />
      <strong>{data.label}</strong>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

const ProductNode = React.memo(function ProductNode({ data }: NodeProps<AppNodeData>) {
  const colorFor = (rg: RankGroup) =>
    rg === 'Positive' ? '#2e7d32' : rg === 'Negative' ? '#c62828' : '#00897b';

  return (
    <div style={{ padding: 10, background: '#f59e0b', color: 'black', borderRadius: 8, minWidth: 220, textAlign: 'center' }}>
      <Handle type="target" position={Position.Top} />
      <strong>{data.label}</strong>
      <Divider style={{ margin: '6px 0' }} />
      <div style={{ fontSize: 11 }}>
        {data.ratings?.length ? (
          <Stack direction="column" spacing={0.5} sx={{ alignItems: 'stretch' }}>
            {data.ratings.map((r, i) => (
              <Chip
                key={i}
                size="small"
                label={`${r.consultant} • ${r.rankgroup}`}
                sx={{
                  width: '100%',
                  justifyContent: 'space-between',
                  backgroundColor: colorFor(r.rankgroup),
                  color: '#fff',
                  height: 24,
                }}
              />
            ))}
          </Stack>
        ) : (
          <em>No ratings</em>
        )}
      </div>
    </div>
  );
});

/* =========================
   Custom Edge (lightweight line + midpoint label)
   ========================= */
const CustomEdge = React.memo(function CustomEdge({
  id, sourceX, sourceY, targetX, targetY, selected, data = {},
}: EdgeProps<EdgeData>) {
  const stroke =
    data.relType === 'EMPLOYS' ? '#6366f1' :
    data.relType === 'COVERS' ? '#10b981' :
    data.relType === 'OWNS'   ? '#dc2626'  : '#9ca3af';

  const dash = data.relType === 'COVERS' && data.mandateStatus && data.mandateStatus !== 'Active' ? '6 6' : undefined;
  const width = selected ? 3 : 2;
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  return (
    <g>
      <path id={id} fill="none" stroke={stroke} strokeWidth={width} strokeDasharray={dash} d={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`} />
      {data.relType && (
        <text x={midX} y={midY - 6} textAnchor="middle" style={{ fontSize: 11, fill: '#374151', pointerEvents: 'none' }}>
          {data.relType}
        </text>
      )}
    </g>
  );
});

/* =========================
   Node/Edge type maps
   ========================= */
const nodeTypes = {
  CONSULTANT: ConsultantNode,
  FIELD_CONSULTANT: FieldConsultantNode,
  COMPANY: CompanyNode,
  PRODUCT: ProductNode,
};
const edgeTypes = { custom: CustomEdge };

/* =========================
   Sample Graph Generator (scales beyond 50 nodes)
   ========================= */
function generateSampleGraph({
  consultants = 3,
  fieldPerConsultant = 2,
  companiesPerField = 2,
  productsPerCompany = 2,
}: {
  consultants?: number;
  fieldPerConsultant?: number;
  companiesPerField?: number;
  productsPerCompany?: number;
}) {
  const nodes: Node<AppNodeData>[] = [];
  const edges: Edge<EdgeData>[] = [];

  // consultants
  for (let c = 1; c <= consultants; c++) {
    nodes.push({
      id: `C${c}`,
      type: 'CONSULTANT',
      data: { label: `Consultant ${c}` },
      position: { x: 0, y: 0 },
    });
  }

  let fIdx = 0, coIdx = 0, pIdx = 0;

  for (let c = 1; c <= consultants; c++) {
    for (let f = 1; f <= fieldPerConsultant; f++) {
      fIdx++;
      const fId = `F${fIdx}`;
      nodes.push({
        id: fId,
        type: 'FIELD_CONSULTANT',
        data: { label: `Field Consultant ${fIdx}` },
        position: { x: 0, y: 0 },
      });
      edges.push({ id: `eC${c}-F${fIdx}`, source: `C${c}`, target: fId, type: 'custom', data: { relType: 'EMPLOYS' } });

      for (let co = 1; co <= companiesPerField; co++) {
        coIdx++;
        const coId = `CO${coIdx}`;
        nodes.push({
          id: coId,
          type: 'COMPANY',
          data: { label: `Company ${coIdx}` },
          position: { x: 0, y: 0 },
        });
        edges.push({ id: `eF${fIdx}-CO${coIdx}`, source: fId, target: coId, type: 'custom', data: { relType: 'COVERS', mandateStatus: 'Active' } });

        for (let p = 1; p <= productsPerCompany; p++) {
          pIdx++;
          const pId = `P${pIdx}`;
          nodes.push({
            id: pId,
            type: 'PRODUCT',
            data: { label: `Product ${pIdx}`, ratings: [] },
            position: { x: 0, y: 0 },
          });
          edges.push({ id: `eCO${coIdx}-P${pIdx}`, source: coId, target: pId, type: 'custom', data: { relType: 'OWNS' } });
        }
      }
    }
  }

  return { nodes, edges };
}

/* =========================
   Cross-linker to densify overlaps and ratings
   ========================= */
function addCrossLinks(
  nodes: Node<AppNodeData>[],
  edges: Edge<EdgeData>[],
  opts: { extraCoversPerField?: number; extraRatingsPerProduct?: number } = {}
) {
  const { extraCoversPerField = 2, extraRatingsPerProduct = 3 } = opts;

  const fields = nodes.filter(n => n.type === 'FIELD_CONSULTANT');
  const companies = nodes.filter(n => n.type === 'COMPANY');
  const products = nodes.filter(n => n.type === 'PRODUCT');
  const consultants = nodes.filter(n => n.type === 'CONSULTANT');

  // 1) overlap coverage: each field takes on a few random extra companies
  let eid = 100000;
  for (const f of fields) {
    let attempts = 0;
    for (let k = 0; k < extraCoversPerField; k++) {
      const co = companies[Math.floor(Math.random() * companies.length)];
      // skip if already connected
      if (edges.some(e => e.source === f.id && e.target === co.id)) {
        if (attempts++ < 5) { k--; } // try another
        continue;
      }
      edges.push({
        id: `x-cover-${eid++}`,
        source: f.id,
        target: co.id,
        type: 'custom',
        data: { relType: 'COVERS', mandateStatus: 'Active' },
      });
    }
  }

  // 2) richer product ratings: add more distinct consultants per product
  const rankgroups: RankGroup[] = ['Introduced', 'Positive', 'Negative'];
  for (const p of products) {
    const data = p.data || {};
    const existing = new Set((data.ratings || []).map(r => r.consultant));
    const ratings = [...(data.ratings || [])];

    let added = 0;
    let tries = 0;
    while (added < extraRatingsPerProduct && tries < consultants.length * 2) {
      const c = consultants[Math.floor(Math.random() * consultants.length)];
      const cname = c.data?.label || c.id;
      if (!existing.has(cname)) {
        existing.add(cname);
        ratings.push({
          consultant: cname,
          rankgroup: rankgroups[Math.floor(Math.random() * rankgroups.length)],
        });
        added++;
      }
      tries++;
    }
    p.data = { ...data, ratings };
  }

  return { nodes, edges };
}

/* =========================
   Dagre Layout (VERTICAL)
   ========================= */
const NODE_W = 220;
const NODE_H = 100;

const layoutWithDagre = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 140 });

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

  // Bigger branching = many-to-many (50+ nodes)
  const bigGraph = useMemo(
    () => generateSampleGraph({
      consultants: 3,
      fieldPerConsultant: 1,
      companiesPerField: 1,
      productsPerCompany: 1,
    }),
    []
  );

  // Add overlaps + richer ratings
  const denseGraph = useMemo(
    () => addCrossLinks(bigGraph.nodes, bigGraph.edges, { extraCoversPerField: 2, extraRatingsPerProduct: 3 }),
    [bigGraph.nodes, bigGraph.edges]
  );

  // Layout
  const layouted = useMemo(
    () => layoutWithDagre(denseGraph.nodes, denseGraph.edges),
    [denseGraph.nodes, denseGraph.edges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<AppNodeData>(layouted.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layouted.edges);

  // ResizeObserver rAF patch (prevents loop warning)
  useEffect(() => {
    const observerCb: ResizeObserverCallback = (entries) => {
      window.requestAnimationFrame(() => {
        if (!Array.isArray(entries) || !entries.length) return;
        // could refit here if you keep a reactflow instance ref
      });
    };
    const ro = new ResizeObserver(observerCb);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Re-run layout once after mount (in case fonts load alter sizes)
  useEffect(() => {
    const { nodes: n2, edges: e2 } = layoutWithDagre(nodes as Node[], edges as Edge[]);
    setNodes(n2);
    setEdges(e2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Left Filters Panel */}
      <Drawer variant="permanent" anchor="left" sx={{ width: 240 }}>
        <Box sx={{ width: 240, p: 2 }}>
          <Typography variant="h6">Filters</Typography>
          <Divider sx={{ my: 1 }} />
          <Typography variant="body2" color="text.secondary">(Coming soon)</Typography>
        </Box>
      </Drawer>

      {/* Graph Canvas */}
      <Box sx={{ flexGrow: 1 }} ref={containerRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          panOnDrag
          zoomOnScroll
          proOptions={{ hideAttribution: true }}
          onlyRenderVisibleElements
          minZoom={0.2}
          maxZoom={1.5}
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background />
          <MiniMap pannable zoomable />
          <Controls showInteractive />
        </ReactFlow>
      </Box>

      {/* Right Details Panel */}
      <Drawer variant="permanent" anchor="right" sx={{ width: 240 }}>
        <Box sx={{ width: 240, p: 2 }}>
          <Typography variant="h6">Details</Typography>
          <Divider sx={{ my: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Click a node or edge to view details.
          </Typography>
        </Box>
      </Drawer>
    </Box>
  );
}
