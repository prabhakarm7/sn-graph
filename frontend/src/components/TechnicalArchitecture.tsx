import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Application color scheme
const COLORS = {
  source: '#ef4444',      // Red for source systems
  redshift: '#f59e0b',    // Amber for Redshift
  etl: '#8b5cf6',         // Purple for ETL
  neo4j: '#3b82f6',       // Blue for Neo4j
  backend: '#10b981',     // Green for backend
  frontend: '#6366f1',    // Indigo for frontend
  user: '#ec4899',        // Pink for user layer
  dark: '#0f172a',
  light: 'rgba(255, 255, 255, 0.95)'
};

interface CustomNodeData {
  label: string;
  icon: string;
  description?: string;
  details?: string[];
  nodeType: 'source' | 'redshift' | 'etl' | 'neo4j' | 'backend' | 'frontend' | 'user' | 'insight';
  highlight?: boolean;
}

interface CustomNode extends Node {
  data: CustomNodeData;
}

const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({ data, selected }) => {
  const getNodeStyle = (): React.CSSProperties => {
    const getBackgroundColor = () => {
      switch (data.nodeType) {
        case 'source': return `linear-gradient(135deg, ${COLORS.source} 0%, #dc2626 100%)`;
        case 'redshift': return `linear-gradient(135deg, ${COLORS.redshift} 0%, #d97706 100%)`;
        case 'etl': return `linear-gradient(135deg, ${COLORS.etl} 0%, #7c3aed 100%)`;
        case 'neo4j': return `linear-gradient(135deg, ${COLORS.neo4j} 0%, #2563eb 100%)`;
        case 'backend': return `linear-gradient(135deg, ${COLORS.backend} 0%, #059669 100%)`;
        case 'frontend': return `linear-gradient(135deg, ${COLORS.frontend} 0%, #4f46e5 100%)`;
        case 'user': return `linear-gradient(135deg, ${COLORS.user} 0%, #db2777 100%)`;
        case 'insight': return `linear-gradient(135deg, #10b981 0%, #059669 100%)`;
        default: return `linear-gradient(135deg, ${COLORS.frontend} 0%, #4f46e5 100%)`;
      }
    };

    return {
      background: getBackgroundColor(),
      color: 'white',
      border: selected ? `3px solid #fbbf24` : data.highlight ? `3px solid #fbbf24` : `2px solid rgba(255,255,255,0.3)`,
      borderRadius: '16px',
      padding: '16px',
      minWidth: data.nodeType === 'redshift' ? '280px' : '220px',
      textAlign: 'center' as const,
      boxShadow: selected 
        ? `0 12px 40px rgba(251, 191, 36, 0.4)`
        : data.highlight 
        ? `0 8px 30px rgba(251, 191, 36, 0.3)`
        : `0 6px 20px rgba(0, 0, 0, 0.3)`,
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)',
      position: 'relative' as const
    };
  };

  return (
    <div style={getNodeStyle()}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '1.8rem', marginRight: '10px' }}>{data.icon}</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', lineHeight: 1.2 }}>{data.label}</div>
          {data.description && (
            <div style={{ fontSize: '0.8rem', opacity: 0.9, lineHeight: 1.2 }}>{data.description}</div>
          )}
        </div>
      </div>
      {data.details && (
        <div style={{ fontSize: '0.75rem', opacity: 0.9, lineHeight: 1.4, textAlign: 'left' }}>
          {data.details.map((detail, i) => (
            <div key={i} style={{ marginBottom: '2px' }}>• {detail}</div>
          ))}
        </div>
      )}
      {data.highlight && (
        <div style={{
          position: 'absolute',
          top: '-5px',
          right: '-5px',
          width: '20px',
          height: '20px',
          background: '#fbbf24',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          animation: 'pulse 2s infinite'
        }}>
          ⭐
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

// Complete data flow nodes
const initialNodes: CustomNode[] = [
  // Data Source Layer
  {
    id: '1',
    type: 'custom',
    position: { x: 50, y: 50 },
    data: {
      label: 'CRM Systems',
      icon: '🏢',
      description: 'Client relationship data',
      details: ['Client contacts', 'Meeting history', 'Relationship mapping'],
      nodeType: 'source'
    },
  },
  {
    id: '2',
    type: 'custom',
    position: { x: 320, y: 50 },
    data: {
      label: 'Portfolio Systems',
      icon: '📊',
      description: 'Product & mandate data',
      details: ['Product ownership', 'Mandate statuses', 'Performance metrics'],
      nodeType: 'source'
    },
  },
  {
    id: '3',
    type: 'custom',
    position: { x: 590, y: 50 },
    data: {
      label: 'External Data',
      icon: '🌐',
      description: 'Third-party sources',
      details: ['Evestment data', 'Market data', 'Benchmark data'],
      nodeType: 'source'
    },
  },

  // Redshift - The missing component
  {
    id: '4',
    type: 'custom',
    position: { x: 250, y: 220 },
    data: {
      label: 'AWS Redshift',
      icon: '🏭',
      description: 'Data Warehouse & Analytics',
      details: [
        'Client-consultant mappings',
        'Product ownership tracking',
        'Coverage analysis',
        'BI recommendation engine',
        'Historical trend data',
        'Performance aggregations'
      ],
      nodeType: 'redshift',
      highlight: true
    },
  },

  // ETL Pipeline
  {
    id: '5',
    type: 'custom',
    position: { x: 250, y: 420 },
    data: {
      label: 'ETL Pipeline',
      icon: '⚙️',
      description: 'Data transformation',
      details: ['Data cleansing', 'Relationship mapping', 'Graph structure creation'],
      nodeType: 'etl'
    },
  },

  // Neo4j Database
  {
    id: '6',
    type: 'custom',
    position: { x: 250, y: 580 },
    data: {
      label: 'Neo4j Graph DB',
      icon: '🕸️',
      description: 'Graph relationships',
      details: ['CONSULTANT → FIELD_CONSULTANT → COMPANY → PRODUCT', 'BI_RECOMMENDS relationships', 'COVERS & RATES data'],
      nodeType: 'neo4j'
    },
  },

  // Backend Services
  {
    id: '7',
    type: 'custom',
    position: { x: 100, y: 750 },
    data: {
      label: 'Backend Services',
      icon: '🚀',
      description: 'API & processing',
      details: ['FastAPI endpoints', 'Filter processing', 'Query optimization'],
      nodeType: 'backend'
    },
  },
  {
    id: '8',
    type: 'custom',
    position: { x: 400, y: 750 },
    data: {
      label: 'Memory Cache',
      icon: '💾',
      description: 'Performance layer',
      details: ['Filter options cache', 'LRU eviction', '3600s TTL'],
      nodeType: 'backend'
    },
  },

  // Frontend Layer
  {
    id: '9',
    type: 'custom',
    position: { x: 250, y: 920 },
    data: {
      label: 'Smart Network UI',
      icon: '🎨',
      description: 'React visualization',
      details: ['ReactFlow graphs', 'Filter interface', 'Smart queries'],
      nodeType: 'frontend'
    },
  },

  // User Layer
  {
    id: '10',
    type: 'custom',
    position: { x: 250, y: 1080 },
    data: {
      label: 'Client Advisor',
      icon: '👨‍💼',
      description: 'End user',
      details: ['Network analysis', 'Coverage insights', 'Action planning'],
      nodeType: 'user'
    },
  },

  // Operating Modes
  {
    id: '11',
    type: 'custom',
    position: { x: 50, y: 920 },
    data: {
      label: 'Standard Mode',
      icon: '📈',
      description: 'Current relationships',
      details: ['4 node types', 'Traditional flow'],
      nodeType: 'frontend'
    },
  },
  {
    id: '12',
    type: 'custom',
    position: { x: 450, y: 920 },
    data: {
      label: 'Recommendations',
      icon: '🤖',
      description: 'AI opportunities',
      details: ['Incumbent products', 'BI recommendations'],
      nodeType: 'frontend'
    },
  },

  // Business Insights
  {
    id: '13',
    type: 'custom',
    position: { x: 650, y: 1080 },
    data: {
      label: 'Business Actions',
      icon: '🎯',
      description: 'Advisor decisions',
      details: ['Coverage gaps', 'At-risk mandates', 'Opportunities'],
      nodeType: 'insight'
    },
  },
];

// Define edges showing complete data flow
const initialEdges: Edge[] = [
  // Source to Redshift
  { id: 'e1-4', source: '1', target: '4', type: 'smoothstep', animated: true, style: { stroke: COLORS.source, strokeWidth: 3 }, label: 'CRM Data' },
  { id: 'e2-4', source: '2', target: '4', type: 'smoothstep', animated: true, style: { stroke: COLORS.source, strokeWidth: 3 }, label: 'Portfolio Data' },
  { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', animated: true, style: { stroke: COLORS.source, strokeWidth: 3 }, label: 'External Data' },
  
  // Redshift to ETL
  { id: 'e4-5', source: '4', target: '5', type: 'smoothstep', animated: true, style: { stroke: COLORS.redshift, strokeWidth: 4 }, label: 'Data Warehouse' },
  
  // ETL to Neo4j
  { id: 'e5-6', source: '5', target: '6', type: 'smoothstep', animated: true, style: { stroke: COLORS.etl, strokeWidth: 4 }, label: 'Graph Transform' },
  
  // Neo4j to Backend
  { id: 'e6-7', source: '6', target: '7', type: 'smoothstep', animated: true, style: { stroke: COLORS.neo4j, strokeWidth: 3 } },
  { id: 'e6-8', source: '6', target: '8', type: 'smoothstep', animated: true, style: { stroke: COLORS.neo4j, strokeWidth: 3 } },
  
  // Backend to Frontend
  { id: 'e7-9', source: '7', target: '9', type: 'smoothstep', animated: true, style: { stroke: COLORS.backend, strokeWidth: 3 } },
  { id: 'e8-9', source: '8', target: '9', type: 'smoothstep', animated: true, style: { stroke: COLORS.backend, strokeWidth: 3 } },
  
  // Mode connections
  { id: 'e11-9', source: '11', target: '9', type: 'smoothstep', style: { stroke: COLORS.frontend, strokeDasharray: '5,5' } },
  { id: 'e12-9', source: '12', target: '9', type: 'smoothstep', style: { stroke: COLORS.frontend, strokeDasharray: '5,5' } },
  
  // Frontend to User
  { id: 'e9-10', source: '9', target: '10', type: 'smoothstep', animated: true, style: { stroke: COLORS.frontend, strokeWidth: 4 }, label: 'Visualization' },
  
  // User to Insights
  { id: 'e10-13', source: '10', target: '13', type: 'smoothstep', animated: true, style: { stroke: COLORS.user, strokeWidth: 3 }, label: 'Decision Making' },
];

const ClientAdvisorFlowDiagram: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [viewMode, setViewMode] = useState<'complete' | 'data-flow' | 'user-journey'>('complete');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleViewMode = (mode: 'complete' | 'data-flow' | 'user-journey') => {
    setViewMode(mode);
    // Could filter nodes/edges based on selected mode
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: `linear-gradient(135deg, ${COLORS.dark} 0%, #1e293b 50%, #334155 100%)` }}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>
      
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: COLORS.light,
        backdropFilter: 'blur(10px)',
        padding: '20px',
        borderBottom: `1px solid ${COLORS.frontend}30`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            background: `linear-gradient(135deg, ${COLORS.frontend}, ${COLORS.user})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '1.6rem',
            fontWeight: 'bold'
          }}>
            Client Advisor Data Flow - Complete Architecture
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '1rem' }}>
            From Source Systems → Redshift → Neo4j → Smart Network Application
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => handleViewMode('complete')}
            style={{
              background: viewMode === 'complete' ? COLORS.frontend : 'transparent',
              color: viewMode === 'complete' ? 'white' : COLORS.frontend,
              border: `2px solid ${COLORS.frontend}`,
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
          >
            Complete Flow
          </button>
          <button
            onClick={() => handleViewMode('data-flow')}
            style={{
              background: viewMode === 'data-flow' ? COLORS.redshift : 'transparent',
              color: viewMode === 'data-flow' ? 'white' : COLORS.redshift,
              border: `2px solid ${COLORS.redshift}`,
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
          >
            Data Pipeline
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        top: '100px',
        right: '20px',
        zIndex: 1000,
        background: COLORS.light,
        backdropFilter: 'blur(10px)',
        padding: '20px',
        borderRadius: '12px',
        border: `1px solid ${COLORS.frontend}30`,
        minWidth: '250px',
        maxHeight: '600px',
        overflowY: 'auto'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: COLORS.frontend, fontSize: '1.1rem' }}>Architecture Layers</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '20px', height: '20px', background: COLORS.source, borderRadius: '4px' }}></div>
            <span>Source Systems</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '20px', height: '20px', background: COLORS.redshift, borderRadius: '4px' }}></div>
            <span>AWS Redshift (NEW)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '20px', height: '20px', background: COLORS.etl, borderRadius: '4px' }}></div>
            <span>ETL Pipeline</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '20px', height: '20px', background: COLORS.neo4j, borderRadius: '4px' }}></div>
            <span>Neo4j Database</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '20px', height: '20px', background: COLORS.backend, borderRadius: '4px' }}></div>
            <span>Backend Services</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '20px', height: '20px', background: COLORS.frontend, borderRadius: '4px' }}></div>
            <span>Frontend UI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '20px', height: '20px', background: COLORS.user, borderRadius: '4px' }}></div>
            <span>Client Advisor</span>
          </div>
        </div>
        
        {/* Client Advisor Use Cases */}
        <div style={{ marginTop: '20px', padding: '15px', background: `${COLORS.user}10`, borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: COLORS.user, fontSize: '1rem' }}>Key Use Cases</h4>
          <div style={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.5 }}>
            <div style={{ marginBottom: '8px' }}>🎯 <strong>Coverage Analysis:</strong> Which consultants cover my clients?</div>
            <div style={{ marginBottom: '8px' }}>⚠️ <strong>Risk Assessment:</strong> Which mandates are at risk?</div>
            <div style={{ marginBottom: '8px' }}>💡 <strong>Opportunities:</strong> BI recommendation insights</div>
            <div style={{ marginBottom: '8px' }}>📊 <strong>Performance:</strong> Relationship effectiveness</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div style={{ marginTop: '15px', padding: '15px', background: `${COLORS.frontend}10`, borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: COLORS.frontend, fontSize: '1rem' }}>Performance</h4>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            <div>• 50 nodes optimal rendering</div>
            <div>• 500 nodes hard limit</div>
            <div>• &lt;500ms response time</div>
            <div>• 3600s cache TTL</div>
          </div>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        style={{ marginTop: '120px' }}
      >
        <Background 
          color={COLORS.frontend} 
          gap={20} 
          size={1}
          style={{ opacity: 0.05 }}
        />
        <Controls 
          style={{
            backgroundColor: COLORS.light,
            border: `1px solid ${COLORS.frontend}30`,
            borderRadius: '8px',
          }}
        />
        <MiniMap 
          nodeColor={(node) => {
            switch (node.data.nodeType) {
              case 'source': return COLORS.source;
              case 'redshift': return COLORS.redshift;
              case 'etl': return COLORS.etl;
              case 'neo4j': return COLORS.neo4j;
              case 'backend': return COLORS.backend;
              case 'frontend': return COLORS.frontend;
              case 'user': return COLORS.user;
              case 'insight': return '#10b981';
              default: return COLORS.frontend;
            }
          }}
          style={{
            backgroundColor: COLORS.light,
            border: `1px solid ${COLORS.frontend}30`,
            borderRadius: '8px',
          }}
        />
      </ReactFlow>
    </div>
  );
};

export default ClientAdvisorFlowDiagram;