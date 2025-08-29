import React, { useEffect, useMemo, useRef, useState } from "react";
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
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";

/* =========================================
   Types & helpers
   ========================================= */
type RankGroup = "Introduced" | "Positive" | "Negative";
type ProductRating = { consultant: string; rankgroup: RankGroup };
type AppNodeData = { label: string; ratings?: ProductRating[] };
type EdgeData = { relType?: "EMPLOYS" | "COVERS" | "OWNS"; mandateStatus?: string };

const NODE_W = 220;
const NODE_H = 100;

const colorForRank = (rg: RankGroup) =>
  rg === "Positive" ? "#2e7d32" : rg === "Negative" ? "#c62828" : "#00897b";

/* =========================================
   Nodes & Edges (UI)
   ========================================= */
const ConsultantNode = ({ data }: NodeProps<AppNodeData>) => (
  <div className="rounded-xl text-white text-center min-w-[160px] px-3 py-2 shadow" style={{ background: "#1f4fd7" }}>
    <strong>{data.label}</strong>
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const FieldConsultantNode = ({ data }: NodeProps<AppNodeData>) => (
  <div className="rounded-xl text-white text-center min-w-[160px] px-3 py-2 shadow" style={{ background: "#10b981" }}>
    <Handle type="target" position={Position.Top} />
    <strong>{data.label}</strong>
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const CompanyNode = ({ data }: NodeProps<AppNodeData>) => (
  <div className="rounded-xl text-white text-center min-w-[180px] px-3 py-2 shadow" style={{ background: "#dc2626" }}>
    <Handle type="target" position={Position.Top} />
    <strong>{data.label}</strong>
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const ProductNode = ({ data }: NodeProps<AppNodeData>) => (
  <div className="rounded-xl text-black text-center min-w-[240px] px-3 py-2 shadow bg-amber-400">
    <Handle type="target" position={Position.Top} />
    <strong>{data.label}</strong>
    <div className="my-2 h-px bg-black/10" />
    <div className="text-xs space-y-1">
      {data.ratings?.length ? (
        <div className="flex flex-col gap-1">
          {data.ratings.map((r, i) => (
            <div
              key={i}
              className="px-2 py-1 rounded text-white flex items-center justify-between"
              style={{ background: colorForRank(r.rankgroup) }}
            >
              <span className="font-medium">{r.consultant}</span>
              <span className="opacity-90">{r.rankgroup}</span>
            </div>
          ))}
        </div>
      ) : (
        <em>No ratings</em>
      )}
    </div>
  </div>
);

const RelationshipEdge = ({ id, sourceX, sourceY, targetX, targetY, selected, data = {} }: EdgeProps<EdgeData>) => {
  const stroke =
    data.relType === "EMPLOYS" ? "#1f4fd7" :
    data.relType === "COVERS" ? "#10b981" :
    data.relType === "OWNS"   ? "#dc2626"  : "#9ca3af";

  const dash = data.relType === "COVERS" && data.mandateStatus && data.mandateStatus !== "Active" ? "6 6" : undefined;
  const width = selected ? 3 : 2;
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  return (
    <g>
      <path id={id} fill="none" stroke={stroke} strokeWidth={width} strokeDasharray={dash} d={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`} />
      {data.relType && (
        <text x={midX} y={midY - 6} textAnchor="middle" style={{ fontSize: 11, fill: "#374151", pointerEvents: "none" }}>
          {data.relType}
        </text>
      )}
    </g>
  );
};

const nodeTypes = {
  CONSULTANT: ConsultantNode,
  FIELD_CONSULTANT: FieldConsultantNode,
  COMPANY: CompanyNode,
  PRODUCT: ProductNode,
};
const edgeTypes = { custom: RelationshipEdge };

/* =========================================
   Sample graph generator + densifier
   ========================================= */
function generateSampleGraph({
  consultants = 3,
  fieldPerConsultant = 4,
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

  for (let c = 1; c <= consultants; c++) {
    nodes.push({ id: `C${c}`, type: "CONSULTANT", data: { label: `Consultant ${c}` }, position: { x: 0, y: 0 } });
  }

  let fIdx = 0, coIdx = 0, pIdx = 0;

  for (let c = 1; c <= consultants; c++) {
    for (let f = 1; f <= fieldPerConsultant; f++) {
      fIdx++;
      const fId = `F${fIdx}`;
      nodes.push({ id: fId, type: "FIELD_CONSULTANT", data: { label: `Field Consultant ${fIdx}` }, position: { x: 0, y: 0 } });
      edges.push({ id: `eC${c}-F${fIdx}`, source: `C${c}`, target: fId, type: "custom", data: { relType: "EMPLOYS" } });

      for (let co = 1; co <= companiesPerField; co++) {
        coIdx++;
        const coId = `CO${coIdx}`;
        nodes.push({ id: coId, type: "COMPANY", data: { label: `Company ${coIdx}` }, position: { x: 0, y: 0 } });
        edges.push({ id: `eF${fIdx}-CO${coIdx}`, source: fId, target: coId, type: "custom", data: { relType: "COVERS", mandateStatus: "Active" } });

        for (let p = 1; p <= productsPerCompany; p++) {
          pIdx++;
          const pId = `P${pIdx}`;
          nodes.push({ id: pId, type: "PRODUCT", data: { label: `Product ${pIdx}`, ratings: [] }, position: { x: 0, y: 0 } });
          edges.push({ id: `eCO${coIdx}-P${pIdx}`, source: coId, target: pId, type: "custom", data: { relType: "OWNS" } });
        }
      }
    }
  }

  return { nodes, edges };
}

function addCrossLinks(
  nodes: Node<AppNodeData>[],
  edges: Edge<EdgeData>[],
  opts: { extraCoversPerField?: number; extraRatingsPerProduct?: number } = {}
) {
  const { extraCoversPerField = 1, extraRatingsPerProduct = 3 } = opts;
  const fields = nodes.filter(n => n.type === "FIELD_CONSULTANT");
  const companies = nodes.filter(n => n.type === "COMPANY");
  const products = nodes.filter(n => n.type === "PRODUCT");
  const consultants = nodes.filter(n => n.type === "CONSULTANT");

  // overlap: fields cover extra random companies
  let eid = 100000;
  for (const f of fields) {
    let attempts = 0;
    for (let k = 0; k < extraCoversPerField; k++) {
      const co = companies[Math.floor(Math.random() * companies.length)];
      if (edges.some(e => e.source === f.id && e.target === co.id)) { if (attempts++ < 5) { k--; } continue; }
      edges.push({ id: `x-cover-${eid++}`, source: f.id, target: co.id, type: "custom", data: { relType: "COVERS", mandateStatus: "Active" } });
    }
  }

  // richer product ratings
  const rankgroups: RankGroup[] = ["Introduced", "Positive", "Negative"];
  for (const p of products) {
    const data = p.data || {} as AppNodeData;
    const existing = new Set((data.ratings || []).map(r => r.consultant));
    const ratings = [...(data.ratings || [])];

    let added = 0, tries = 0;
    while (added < extraRatingsPerProduct && tries < consultants.length * 2) {
      const c = consultants[Math.floor(Math.random() * consultants.length)];
      const cname = (c.data as AppNodeData)?.label || c.id;
      if (!existing.has(cname)) {
        existing.add(cname);
        ratings.push({ consultant: cname, rankgroup: rankgroups[Math.floor(Math.random() * rankgroups.length)] });
        added++;
      }
      tries++;
    }
    p.data = { ...(p.data as AppNodeData), ratings };
  }

  return { nodes, edges };
}

/* =========================================
   Dagre layout (vertical top-to-bottom)
   ========================================= */
const layoutWithDagre = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 100, ranksep: 140 });

  nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const layoutedNodes = nodes.map(n => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } };
  });
  return { nodes: layoutedNodes, edges };
};

/* =========================================
   Preview Shell (Header + Filters + Graph + Chat)
   ========================================= */
export default function EnterpriseGraphPreview() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // mock filter state
  const [region, setRegion] = useState<string>("All");
  const [rank, setRank] = useState<RankGroup | "All">("All");

  // bigger graph + overlap
  const base = useMemo(() => generateSampleGraph({ consultants: 3, fieldPerConsultant: 4, companiesPerField: 2, productsPerCompany: 2 }), []);
  const dense = useMemo(() => addCrossLinks(base.nodes, base.edges, { extraCoversPerField: 1, extraRatingsPerProduct: 3 }), [base.nodes, base.edges]);
  const layouted = useMemo(() => layoutWithDagre(dense.nodes, dense.edges), [dense.nodes, dense.edges]);

  const [nodes, , onNodesChange] = useNodesState<AppNodeData>(layouted.nodes);
  const [edges, , onEdgesChange] = useEdgesState(layouted.edges);

  // ResizeObserver rAF patch
  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        if (!Array.isArray(entries) || !entries.length) return;
      });
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header */}
      <div className="h-14 border-b bg-white/80 backdrop-blur flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-600" />
          <div>
            <div className="font-semibold">Consultant Network Intelligence</div>
            <div className="text-xs text-gray-500">ReactFlow • Dagre • Filters • Chat</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-sm">
          <span className="px-2 py-1 rounded bg-gray-100">ENV: Dev</span>
          <span className="px-2 py-1 rounded bg-gray-100">v0.1 Preview</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 grid grid-cols-[280px_1fr_360px] min-h-0">
        {/* Filters */}
        <aside className="border-r bg-white p-3 overflow-auto">
          <div className="font-semibold mb-2">Filters</div>
          <div className="text-xs text-gray-500 mb-3">(Preview only)</div>

          <div className="mb-3">
            <div className="text-xs text-gray-600 mb-1">Region</div>
            <select className="w-full border rounded px-2 py-1" value={region} onChange={(e)=>setRegion(e.target.value)}>
              <option>All</option>
              <option>APAC</option>
              <option>EMEA</option>
              <option>NA</option>
            </select>
          </div>

          <div className="mb-3">
            <div className="text-xs text-gray-600 mb-1">Rank Group</div>
            <select className="w-full border rounded px-2 py-1" value={rank} onChange={(e)=>setRank(e.target.value as any)}>
              <option>All</option>
              <option>Introduced</option>
              <option>Positive</option>
              <option>Negative</option>
            </select>
          </div>

          <button className="w-full mt-2 bg-indigo-600 text-white rounded px-3 py-2 text-sm hover:bg-indigo-700">Apply</button>
          <button className="w-full mt-2 bg-gray-100 rounded px-3 py-2 text-sm hover:bg-gray-200">Reset</button>

          <div className="mt-6 text-xs text-gray-500">Saved Views (soon)</div>
        </aside>

        {/* Graph */}
        <main className="relative" ref={containerRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            onlyRenderVisibleElements
            minZoom={0.2}
            maxZoom={1.5}
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <MiniMap pannable zoomable />
            <Controls showInteractive />
          </ReactFlow>
        </main>

        {/* Right panel: Tabs mock (Details / Chat) */}
        <aside className="border-l bg-white flex flex-col">
          <div className="h-11 border-b flex items-center gap-3 px-3 text-sm">
            <button className="px-3 py-1 rounded bg-gray-100">Details</button>
            <button className="px-3 py-1 rounded bg-indigo-50 text-indigo-700">Chat</button>
          </div>
          <div className="flex-1 p-3 overflow-auto">
            {/* Chat preview */}
            <div className="text-xs text-gray-500 mb-2">LLM Chat (preview)</div>
            <div className="space-y-2 text-sm">
              <div className="bg-gray-50 rounded p-2">User: "Show me APAC products rated Positive and Introduced"</div>
              <div className="bg-indigo-50 rounded p-2">Assistant: Applied filters → Region: APAC; Rank Group: Positive, Introduced. 63 nodes, 142 edges.</div>
            </div>
          </div>
          <div className="p-2 border-t flex gap-2">
            <input className="flex-1 border rounded px-2 py-2 text-sm" placeholder="Ask about the graph..." />
            <button className="px-3 py-2 rounded bg-indigo-600 text-white text-sm">Send</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
