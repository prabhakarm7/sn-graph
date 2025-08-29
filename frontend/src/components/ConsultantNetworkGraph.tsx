import React, { useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Position,
  Node,
  Edge,
  Connection,
  NodeProps,
  EdgeProps,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Type definitions
interface NodeData {
  type: 'CONSULTANT' | 'FIELD_CONSULTANT' | 'COMPANY' | 'PRODUCT';
  name: string;
  region?: string;
  salesRegion?: string;
  channel?: string;
  assetClass?: string;
  mandateStatus?: string;
  levelOfInfluence?: string;
  pca?: string;
  teamSize?: string;
  revenue?: string;
  employees?: string;
  rating?: string;
}

interface EdgeData {
  type: 'EMPLOYS' | 'COVERS' | 'OWNS' | 'RATES';
  rating?: string;
  rankValue?: string;
  ratingChange?: string;
  mandateStatus?: string;
  startDate?: string;
}

type CustomNode = Node<NodeData>;
type CustomEdge = Edge<EdgeData>;

// Custom Node Component with hover tooltip
const CustomNode: React.FC<NodeProps<NodeData>> = ({ data, selected }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const getNodeColor = (type: string): string => {
    switch (type) {
      case 'CONSULTANT': return '#6366f1'; // Indigo
      case 'FIELD_CONSULTANT': return '#059669'; // Emerald
      case 'COMPANY': return '#dc2626'; // Red
      case 'PRODUCT': return '#ea580c'; // Orange
      default: return '#6b7280'; // Gray
    }
  };

  const getNodeIcon = (type: string): string => {
    switch (type) {
      case 'CONSULTANT': return '👨‍💼';
      case 'FIELD_CONSULTANT': return '👥';
      case 'COMPANY': return '🏢';
      case 'PRODUCT': return '📦';
      default: return '🔷';
    }
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`px-4 py-3 rounded-lg border-2 bg-white shadow-lg transition-all duration-200 min-w-[160px] ${
          selected ? 'border-blue-500 shadow-xl' : 'border-gray-300'
        } hover:shadow-xl hover:scale-105`}
        style={{ borderLeftColor: getNodeColor(data.type), borderLeftWidth: '6px' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{getNodeIcon(data.type)}</span>
          <div>
            <div className="font-semibold text-gray-800 text-sm">{data.name}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">{data.type.replace('_', ' ')}</div>
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bg-gray-900 text-white p-3 rounded-lg shadow-xl text-xs max-w-xs -top-2 left-full ml-2 pointer-events-none">
          <div className="font-semibold text-yellow-300 mb-2">{data.name}</div>
          <div className="space-y-1">
            <div><span className="text-gray-300">Type:</span> {data.type.replace('_', ' ')}</div>
            {data.region && <div><span className="text-gray-300">Region:</span> {data.region}</div>}
            {data.salesRegion && <div><span className="text-gray-300">Sales Region:</span> {data.salesRegion}</div>}
            {data.channel && <div><span className="text-gray-300">Channel:</span> {data.channel}</div>}
            {data.assetClass && <div><span className="text-gray-300">Asset Class:</span> {data.assetClass}</div>}
            {data.mandateStatus && <div><span className="text-gray-300">Mandate:</span> {data.mandateStatus}</div>}
            {data.levelOfInfluence && <div><span className="text-gray-300">Influence:</span> {data.levelOfInfluence}</div>}
            {data.pca && <div><span className="text-gray-300">PCA:</span> {data.pca}</div>}
            {data.teamSize && <div><span className="text-gray-300">Team Size:</span> {data.teamSize}</div>}
            {data.revenue && <div><span className="text-gray-300">Revenue:</span> {data.revenue}</div>}
            {data.employees && <div><span className="text-gray-300">Employees:</span> {data.employees}</div>}
            {data.rating && <div><span className="text-gray-300">Rating:</span> {data.rating}</div>}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-4 -left-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
};

// Custom Edge Component with hover tooltip
const CustomEdge: React.FC<EdgeProps<EdgeData> & {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}> = ({ id, sourceX, sourceY, targetX, targetY, data, selected }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getEdgeColor = (type: string): string => {
    switch (type) {
      case 'EMPLOYS': return '#6366f1';
      case 'COVERS': return '#059669';
      case 'OWNS': return '#dc2626';
      case 'RATES': return '#ea580c';
      default: return '#6b7280';
    }
  };

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  return (
    <g>
      <path
        id={id}
        d={`M${sourceX},${sourceY} L${targetX},${targetY}`}
        stroke={getEdgeColor(data?.type || '')}
        strokeWidth={selected ? 4 : 2}
        fill="none"
        className="transition-all duration-200"
        markerEnd="url(#arrowhead)"
      />
      
      {/* Edge label */}
      <text
        x={midX}
        y={midY - 5}
        textAnchor="middle"
        className="text-xs font-medium fill-gray-600 pointer-events-none"
      >
        {data?.type}
      </text>
      
      {/* Tooltip on hover */}
      {showTooltip && data && (
        <g>
          <rect
            x={midX - 60}
            y={midY - 40}
            width="120"
            height="60"
            fill="rgba(0,0,0,0.8)"
            rx="4"
          />
          <text
            x={midX}
            y={midY - 20}
            textAnchor="middle"
            className="text-xs fill-white"
          >
            {data.type}
          </text>
          {data.rating && (
            <text
              x={midX}
              y={midY - 5}
              textAnchor="middle"
              className="text-xs fill-white"
            >
              Rating: {data.rating}
            </text>
          )}
        </g>
      )}
      
      {/* Invisible hover area */}
      <path
        d={`M${sourceX},${sourceY} L${targetX},${targetY}`}
        stroke="transparent"
        strokeWidth={20}
        fill="none"
        className="cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      />
    </g>
  );
};

// Rich sample data
const sampleNodes: CustomNode[] = [
  // Consultants (Top Level)
  {
    id: '1',
    type: 'input',
    data: {
      type: 'CONSULTANT',
      name: 'Sarah Chen',
      region: 'APAC',
      salesRegion: 'Asia Pacific',
      levelOfInfluence: 'Senior',
      teamSize: '45 consultants',
      pca: 'Primary Asia Lead'
    },
    position: { x: 100, y: 50 },
    sourcePosition: Position.Bottom,
  },
  {
    id: '2',
    type: 'input',
    data: {
      type: 'CONSULTANT',
      name: 'Marcus Johnson',
      region: 'NAI',
      salesRegion: 'North America',
      levelOfInfluence: 'Executive',
      teamSize: '67 consultants',
      pca: 'Americas Director'
    },
    position: { x: 500, y: 50 },
    sourcePosition: Position.Bottom,
  },
  {
    id: '3',
    type: 'input',
    data: {
      type: 'CONSULTANT',
      name: 'Elena Rodriguez',
      region: 'EMEA',
      salesRegion: 'Europe & Middle East',
      levelOfInfluence: 'Senior',
      teamSize: '52 consultants',
      pca: 'EMEA Regional Lead'
    },
    position: { x: 900, y: 50 },
    sourcePosition: Position.Bottom,
  },
  
  // Field Consultants (Second Level)
  {
    id: '4',
    data: {
      type: 'FIELD_CONSULTANT',
      name: 'David Kim',
      region: 'APAC',
      salesRegion: 'Southeast Asia',
      channel: 'Institutional',
      levelOfInfluence: 'Mid-Level'
    },
    position: { x: 50, y: 200 },
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
  },
  {
    id: '5',
    data: {
      type: 'FIELD_CONSULTANT',
      name: 'Lisa Zhang',
      region: 'APAC',
      salesRegion: 'Greater China',
      channel: 'Retail',
      levelOfInfluence: 'Senior'
    },
    position: { x: 200, y: 200 },
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
  },
  {
    id: '6',
    data: {
      type: 'FIELD_CONSULTANT',
      name: 'James Wilson',
      region: 'NAI',
      salesRegion: 'US West',
      channel: 'Private Banking',
      levelOfInfluence: 'Senior'
    },
    position: { x: 450, y: 200 },
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
  },
  {
    id: '7',
    data: {
      type: 'FIELD_CONSULTANT',
      name: 'Anna Thompson',
      region: 'NAI',
      salesRegion: 'US East',
      channel: 'Wealth Management',
      levelOfInfluence: 'Mid-Level'
    },
    position: { x: 600, y: 200 },
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
  },
  {
    id: '8',
    data: {
      type: 'FIELD_CONSULTANT',
      name: 'Pierre Dubois',
      region: 'EMEA',
      salesRegion: 'Western Europe',
      channel: 'Investment Banking',
      levelOfInfluence: 'Senior'
    },
    position: { x: 850, y: 200 },
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
  },
  {
    id: '9',
    data: {
      type: 'FIELD_CONSULTANT',
      name: 'Ahmed Hassan',
      region: 'EMEA',
      salesRegion: 'Middle East',
      channel: 'Corporate Banking',
      levelOfInfluence: 'Mid-Level'
    },
    position: { x: 1000, y: 200 },
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
  },
  
  // Companies (Third Level)
  {
    id: '10',
    data: {
      type: 'COMPANY',
      name: 'TechCorp Asia',
      region: 'APAC',
      salesRegion: 'Southeast Asia',
      channel: 'Institutional',
      employees: '15,000',
      revenue: '$2.4B'
    },
    position: { x: 100, y: 350 },
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
  },
  {
    id: '11',
    data: {
      type: 'COMPANY',
      name: 'Dragon Industries',
      region: 'APAC',
      salesRegion: 'Greater China',
      channel: 'Retail',
      employees: '8,500',
      revenue: '$1.8B'
    },
    position: { x: 300, y: 350 },
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
  },
  {
    id: '12',
    data: {
      type: 'COMPANY',
      name: 'Silicon Valley Bank',
      region: 'NAI',
      salesRegion: 'US West',
      channel: 'Private Banking',
      employees: '12,000',
      revenue: '$3.2B'
    },
    position: { x: 500, y: 350 },
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
  },
  {
    id: '13',
    data: {
      type: 'COMPANY',
      name: 'Atlantic Financial',
      region: 'NAI',
      salesRegion: 'US East',
      channel: 'Wealth Management',
      employees: '25,000',
      revenue: '$5.1B'
    },
    position: { x: 700, y: 350 },
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
  },
  {
    id: '14',
    data: {
      type: 'COMPANY',
      name: 'European Capital',
      region: 'EMEA',
      salesRegion: 'Western Europe',
      channel: 'Investment Banking',
      employees: '18,000',
      revenue: '$4.2B'
    },
    position: { x: 900, y: 350 },
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
  },
  
  // Products (Fourth Level)
  {
    id: '15',
    type: 'output',
    data: {
      type: 'PRODUCT',
      name: 'Asia Growth Fund',
      assetClass: 'Equity',
      mandateStatus: 'Active',
      rating: '4.8/5.0',
      region: 'APAC'
    },
    position: { x: 50, y: 500 },
    targetPosition: Position.Top,
  },
  {
    id: '16',
    type: 'output',
    data: {
      type: 'PRODUCT',
      name: 'Tech Innovation ETF',
      assetClass: 'Technology',
      mandateStatus: 'Active',
      rating: '4.6/5.0',
      region: 'APAC'
    },
    position: { x: 200, y: 500 },
    targetPosition: Position.Top,
  },
  {
    id: '17',
    type: 'output',
    data: {
      type: 'PRODUCT',
      name: 'China Market Fund',
      assetClass: 'Regional Equity',
      mandateStatus: 'Active',
      rating: '4.4/5.0',
      region: 'APAC'
    },
    position: { x: 350, y: 500 },
    targetPosition: Position.Top,
  },
  {
    id: '18',
    type: 'output',
    data: {
      type: 'PRODUCT',
      name: 'US Large Cap Fund',
      assetClass: 'Equity',
      mandateStatus: 'Active',
      rating: '4.7/5.0',
      region: 'NAI'
    },
    position: { x: 500, y: 500 },
    targetPosition: Position.Top,
  },
  {
    id: '19',
    type: 'output',
    data: {
      type: 'PRODUCT',
      name: 'Bond Plus Strategy',
      assetClass: 'Fixed Income',
      mandateStatus: 'Active',
      rating: '4.5/5.0',
      region: 'NAI'
    },
    position: { x: 650, y: 500 },
    targetPosition: Position.Top,
  },
  {
    id: '20',
    type: 'output',
    data: {
      type: 'PRODUCT',
      name: 'European Value Fund',
      assetClass: 'Equity',
      mandateStatus: 'Active',
      rating: '4.3/5.0',
      region: 'EMEA'
    },
    position: { x: 800, y: 500 },
    targetPosition: Position.Top,
  },
  {
    id: '21',
    type: 'output',
    data: {
      type: 'PRODUCT',
      name: 'ESG Global Fund',
      assetClass: 'Sustainable',
      mandateStatus: 'Active',
      rating: '4.9/5.0',
      region: 'Global'
    },
    position: { x: 950, y: 500 },
    targetPosition: Position.Top,
  }
];

const sampleEdges: CustomEdge[] = [
  // EMPLOYS relationships (Consultant -> Field Consultant)
  { 
    id: 'employs-1-4', 
    source: '1', 
    target: '4', 
    type: 'custom',
    label: 'EMPLOYS',
    animated: false,
    style: { stroke: '#6366f1', strokeWidth: 2 },
    data: { type: 'EMPLOYS', startDate: '2022-01-15', mandateStatus: 'Active' } 
  },
  { 
    id: 'employs-1-5', 
    source: '1', 
    target: '5', 
    type: 'custom',
    label: 'EMPLOYS',
    style: { stroke: '#6366f1', strokeWidth: 2 },
    data: { type: 'EMPLOYS', startDate: '2021-06-20', mandateStatus: 'Active' } 
  },
  { 
    id: 'employs-2-6', 
    source: '2', 
    target: '6', 
    type: 'custom',
    label: 'EMPLOYS',
    style: { stroke: '#6366f1', strokeWidth: 2 },
    data: { type: 'EMPLOYS', startDate: '2020-11-10', mandateStatus: 'Active' } 
  },
  { 
    id: 'employs-2-7', 
    source: '2', 
    target: '7', 
    type: 'custom',
    label: 'EMPLOYS',
    style: { stroke: '#6366f1', strokeWidth: 2 },
    data: { type: 'EMPLOYS', startDate: '2022-03-05', mandateStatus: 'Active' } 
  },
  { 
    id: 'employs-3-8', 
    source: '3', 
    target: '8', 
    type: 'custom',
    label: 'EMPLOYS',
    style: { stroke: '#6366f1', strokeWidth: 2 },
    data: { type: 'EMPLOYS', startDate: '2021-09-12', mandateStatus: 'Active' } 
  },
  { 
    id: 'employs-3-9', 
    source: '3', 
    target: '9', 
    type: 'custom',
    label: 'EMPLOYS',
    style: { stroke: '#6366f1', strokeWidth: 2 },
    data: { type: 'EMPLOYS', startDate: '2022-07-30', mandateStatus: 'Active' } 
  },
  
  // COVERS relationships (Field Consultant -> Company)
  { 
    id: 'covers-4-10', 
    source: '4', 
    target: '10', 
    type: 'custom',
    label: 'COVERS',
    style: { stroke: '#059669', strokeWidth: 2 },
    data: { type: 'COVERS', mandateStatus: 'Primary', startDate: '2022-02-01' } 
  },
  { 
    id: 'covers-5-11', 
    source: '5', 
    target: '11', 
    type: 'custom',
    label: 'COVERS',
    style: { stroke: '#059669', strokeWidth: 2 },
    data: { type: 'COVERS', mandateStatus: 'Primary', startDate: '2021-08-15' } 
  },
  { 
    id: 'covers-6-12', 
    source: '6', 
    target: '12', 
    type: 'custom',
    label: 'COVERS',
    style: { stroke: '#059669', strokeWidth: 2 },
    data: { type: 'COVERS', mandateStatus: 'Primary', startDate: '2021-01-20' } 
  },
  { 
    id: 'covers-7-13', 
    source: '7', 
    target: '13', 
    type: 'custom',
    label: 'COVERS',
    style: { stroke: '#059669', strokeWidth: 2 },
    data: { type: 'COVERS', mandateStatus: 'Primary', startDate: '2022-04-10' } 
  },
  { 
    id: 'covers-8-14', 
    source: '8', 
    target: '14', 
    type: 'custom',
    label: 'COVERS',
    style: { stroke: '#059669', strokeWidth: 2 },
    data: { type: 'COVERS', mandateStatus: 'Primary', startDate: '2021-12-05' } 
  },
  
  // COVERS relationships (Field Consultant -> Product)
  { 
    id: 'covers-4-15', 
    source: '4', 
    target: '15', 
    type: 'custom',
    label: 'COVERS',
    style: { stroke: '#059669', strokeWidth: 2, strokeDasharray: '5,5' },
    data: { type: 'COVERS', mandateStatus: 'Active', rating: '4.8' } 
  },
  { 
    id: 'covers-4-16', 
    source: '4', 
    target: '16', 
    type: 'custom',
    label: 'COVERS',
    style: { stroke: '#059669', strokeWidth: 2, strokeDasharray: '5,5' },
    data: { type: 'COVERS', mandateStatus: 'Active', rating: '4.6' } 
  },
  { 
    id: 'covers-5-17', 
    source: '5', 
    target: '17', 
    type: 'custom',
    label: 'COVERS',
    style: { stroke: '#059669', strokeWidth: 2, strokeDasharray: '5,5' },
    data: { type: 'COVERS', mandateStatus: 'Active', rating: '4.4' } 
  },
  { 
    id: 'covers-6-18', 
    source: '6', 
    target: '18', 
    type: 'custom',
    label: 'COVERS',
    style: { stroke: '#059669', strokeWidth: 2, strokeDasharray: '5,5' },
    data: { type: 'COVERS', mandateStatus: 'Active', rating: '4.7' } 
  },
  { 
    id: 'covers-7-19', 
    source: '7', 
    target: '19', 
    type: 'custom',
    label: 'COVERS',
    style: { stroke: '#059669', strokeWidth: 2, strokeDasharray: '5,5' },
    data: { type: 'COVERS', mandateStatus: 'Active', rating: '4.5' } 
  },
  { 
    id: 'covers-8-20', 
    source: '8', 
    target: '20', 
    type: 'custom',
    label: 'COVERS',
    style: { stroke: '#059669', strokeWidth: 2, strokeDasharray: '5,5' },
    data: { type: 'COVERS', mandateStatus: 'Active', rating: '4.3' } 
  },
  { 
    id: 'covers-9-21', 
    source: '9', 
    target: '21', 
    type: 'custom',
    label: 'COVERS',
    style: { stroke: '#059669', strokeWidth: 2, strokeDasharray: '5,5' },
    data: { type: 'COVERS', mandateStatus: 'Active', rating: '4.9' } 
  },
  
  // OWNS relationships (Company -> Product)
  { 
    id: 'owns-10-15', 
    source: '10', 
    target: '15', 
    type: 'custom',
    label: 'OWNS',
    style: { stroke: '#dc2626', strokeWidth: 3 },
    data: { type: 'OWNS', mandateStatus: 'Full Ownership', startDate: '2020-01-01' } 
  },
  { 
    id: 'owns-11-17', 
    source: '11', 
    target: '17', 
    type: 'custom',
    label: 'OWNS',
    style: { stroke: '#dc2626', strokeWidth: 3 },
    data: { type: 'OWNS', mandateStatus: 'Full Ownership', startDate: '2019-06-15' } 
  },
  { 
    id: 'owns-12-18', 
    source: '12', 
    target: '18', 
    type: 'custom',
    label: 'OWNS',
    style: { stroke: '#dc2626', strokeWidth: 3 },
    data: { type: 'OWNS', mandateStatus: 'Full Ownership', startDate: '2018-11-20' } 
  },
  { 
    id: 'owns-13-19', 
    source: '13', 
    target: '19', 
    type: 'custom',
    label: 'OWNS',
    style: { stroke: '#dc2626', strokeWidth: 3 },
    data: { type: 'OWNS', mandateStatus: 'Full Ownership', startDate: '2020-03-10' } 
  },
  { 
    id: 'owns-14-20', 
    source: '14', 
    target: '20', 
    type: 'custom',
    label: 'OWNS',
    style: { stroke: '#dc2626', strokeWidth: 3 },
    data: { type: 'OWNS', mandateStatus: 'Full Ownership', startDate: '2019-09-05' } 
  },
  
  // RATES relationships (Consultant -> Product - cross network ratings)
  { 
    id: 'rates-1-18', 
    source: '1', 
    target: '18', 
    type: 'custom',
    label: 'RATES',
    animated: true,
    style: { stroke: '#ea580c', strokeWidth: 2, strokeDasharray: '8,4' },
    data: { type: 'RATES', rating: '4.2', rankValue: 'Buy', ratingChange: 'Upgrade' } 
  },
  { 
    id: 'rates-2-17', 
    source: '2', 
    target: '17', 
    type: 'custom',
    label: 'RATES',
    animated: true,
    style: { stroke: '#ea580c', strokeWidth: 2, strokeDasharray: '8,4' },
    data: { type: 'RATES', rating: '4.0', rankValue: 'Hold', ratingChange: 'Stable' } 
  },
  { 
    id: 'rates-3-16', 
    source: '3', 
    target: '16', 
    type: 'custom',
    label: 'RATES',
    animated: true,
    style: { stroke: '#ea580c', strokeWidth: 2, strokeDasharray: '8,4' },
    data: { type: 'RATES', rating: '4.5', rankValue: 'Buy', ratingChange: 'Upgrade' } 
  }
];

const nodeTypes = {
  default: CustomNode,
  input: CustomNode,
  output: CustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const ConsultantNetworkGraph: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(sampleNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(sampleEdges);
  const [selectedNodeType, setSelectedNodeType] = useState<string>('ALL');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const filteredNodes = selectedNodeType === 'ALL' 
    ? nodes 
    : nodes.filter(node => node.data.type === selectedNodeType);

  const filteredEdges = selectedNodeType === 'ALL'
    ? edges
    : edges.filter(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        return sourceNode && targetNode && 
               filteredNodes.includes(sourceNode) && 
               filteredNodes.includes(targetNode);
      });

  // Suppress ResizeObserver errors
  React.useEffect(() => {
    const handleResizeError = (e: ErrorEvent) => {
      if (e.message.includes('ResizeObserver loop completed')) {
        e.stopImmediatePropagation();
        return;
      }
    };
    
    window.addEventListener('error', handleResizeError);
    return () => window.removeEventListener('error', handleResizeError);
  }, []);

  return (
    <div className="w-full h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Consultant Network Analysis</h1>
            <p className="text-gray-600">Interactive graph visualization of consultant relationships and influence networks</p>
          </div>
          
          {/* Filter Controls */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by Node Type:</label>
            <select 
              value={selectedNodeType}
              onChange={(e) => setSelectedNodeType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="CONSULTANT">Consultants</option>
              <option value="FIELD_CONSULTANT">Field Consultants</option>
              <option value="COMPANY">Companies</option>
              <option value="PRODUCT">Products</option>
            </select>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-indigo-500 rounded"></div>
            <span>👨‍💼 Consultant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-600 rounded"></div>
            <span>👥 Field Consultant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span>🏢 Company</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-600 rounded"></div>
            <span>📦 Product</span>
          </div>
          
          {/* Edge Legend */}
          <div className="border-l border-gray-300 pl-6 ml-6">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-indigo-500"></div>
                <span>EMPLOYS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-emerald-600"></div>
                <span>COVERS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-red-600"></div>
                <span>OWNS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-orange-600 border-dashed border-t-2"></div>
                <span>RATES</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div style={{ width: '100%', height: 'calc(100vh - 120px)' }}>
        <ReactFlow
          nodes={filteredNodes}
          edges={filteredEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          onlyRenderVisibleElements={false}
          preventScrolling={false}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          fitViewOptions={{
            padding: 0.1,
            includeHiddenNodes: false,
            minZoom: 0.1,
            maxZoom: 1.5,
          }}
          attributionPosition="top-right"
          defaultEdgeOptions={{
            animated: false,
            style: { 
              strokeWidth: 2, 
              stroke: '#6b7280' 
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#6b7280',
            },
          }}
          connectionLineStyle={{ strokeWidth: 2, stroke: '#374151' }}
          onEdgeClick={(event, edge) => console.log('Edge clicked:', edge)}
          onNodeClick={(event, node) => console.log('Node clicked:', node)}
        >
          <MiniMap 
            nodeStrokeColor={(n: CustomNode) => {
              switch (n.data.type) {
                case 'CONSULTANT': return '#6366f1';
                case 'FIELD_CONSULTANT': return '#059669';
                case 'COMPANY': return '#dc2626';
                case 'PRODUCT': return '#ea580c';
                default: return '#6b7280';
              }
            }}
            nodeColor={(n: CustomNode) => {
              switch (n.data.type) {
                case 'CONSULTANT': return '#6366f1';
                case 'FIELD_CONSULTANT': return '#059669';
                case 'COMPANY': return '#dc2626';
                case 'PRODUCT': return '#ea580c';
                default: return '#6b7280';
              }
            }}
            nodeBorderRadius={2}
          />
          <Controls />
          <Background color="#aaa" gap={16} />
          
        </ReactFlow>
      </div>
      
      {/* Stats Panel */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 text-sm">
        <div className="font-semibold text-gray-800 mb-2">Network Statistics</div>
        <div className="space-y-1 text-gray-600">
          <div>Total Nodes: {filteredNodes.length}</div>
          <div>Total Edges: {filteredEdges.length}</div>
          <div>Consultants: {filteredNodes.filter(n => n.data.type === 'CONSULTANT').length}</div>
          <div>Field Consultants: {filteredNodes.filter(n => n.data.type === 'FIELD_CONSULTANT').length}</div>
          <div>Companies: {filteredNodes.filter(n => n.data.type === 'COMPANY').length}</div>
          <div>Products: {filteredNodes.filter(n => n.data.type === 'PRODUCT').length}</div>
        </div>
      </div>
      
      {/* Debug Panel */}
      <div className="absolute bottom-4 right-4 bg-yellow-100 rounded-lg shadow-lg p-3 text-xs max-w-xs">
        <div className="font-semibold text-gray-800 mb-2">Debug Info</div>
        <div className="space-y-1 text-gray-600">
          <div>Sample Edges: {sampleEdges.length}</div>
          <div>Filtered Edges: {filteredEdges.length}</div>
          <div>First Edge: {filteredEdges[0]?.id || 'None'}</div>
          <div>Edge Types: {Array.from(new Set(filteredEdges.map(e => e.type))).join(', ')}</div>
          <div>Custom Edge Component: {typeof edgeTypes.custom !== 'undefined' ? '✅' : '❌'}</div>
        </div>
      </div>
    </div>
  );
};

export default ConsultantNetworkGraph;