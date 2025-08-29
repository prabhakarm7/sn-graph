import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  NodeProps,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Typography,
  Paper,
  TextField,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Avatar,
  Divider,
  Tooltip,
  Badge,
  Card,
  CardContent,
  Tab,
  Tabs,
  Stack,
  Alert,
  Snackbar,
  IconButton,
  LinearProgress,
} from '@mui/material';
import { ThemeProvider, createTheme, styled } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Dashboard,
  AccountTree,
  Search,
  FilterList,
  Settings,
  Help,
  Notifications,
  Person,
  Business,
  Download,
  Send,
  Clear,
  SmartToy,
  Code,
  MessageOutlined,
  ThumbUp,
  ThumbDown,
  ContentCopy,
  PlayArrow,
  SupportAgent,
  CheckCircle,
  Cancel,
  HourglassEmpty,
  TrendingUp,
  AccountBalance,
  Security,
  CreditCard,
  Analytics,
  RemoveCircle,
  Inventory2,
} from '@mui/icons-material';

// Enhanced Type definitions with JPM context
interface NodeData {
  label: string;
  type: 'consultant' | 'fieldconsultant' | 'client' | 'product';
  properties: {
    id?: string;
    status?: string;
    firm?: string;
    specialization?: string;
    experience?: number;
    region?: string;
    industry?: string;
    assetSize?: string;
    relationship?: string;
    category?: string;
    businessLine?: string;
    version?: string;
    consultantRatings?: Array<{
      consultantId: string;
      consultantFirm: string;
      rating: 'positive' | 'negative' | 'introduced' | 'neutral';
      comment?: string;
    }>;
  };
}

interface ChatMessage {
  id: number;
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
  cypher?: string;
  actions?: Array<{
    label: string;
    prompt: string;
  }>;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
    secondary: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
    background: { default: '#0f172a', paper: '#1e293b' },
    text: { primary: '#f8fafc', secondary: '#cbd5e1' },
    success: { main: '#10b981' },
    error: { main: '#ef4444' },
    warning: { main: '#f59e0b' },
    info: { main: '#3b82f6' },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundColor: '#1e293b', backgroundImage: 'none' } } },
    MuiDrawer: { styleOverrides: { paper: { backgroundColor: '#1e293b', borderRight: '1px solid #334155' } } },
    MuiAppBar: { styleOverrides: { root: { backgroundColor: '#1e293b', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' } } },
  },
});

const StyledReactFlow = styled(Box)(({ theme }) => ({
  height: '100%',
  width: '100%',
  '& .react-flow__renderer': {
    zIndex: 1,
  },
  '& .react-flow__edge': {
    zIndex: 5,
  },
  '& .react-flow__node': { 
    fontSize: '12px',
    zIndex: 10,
  },
  '& .react-flow__controls': {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    '& button': {
      backgroundColor: theme.palette.background.paper,
      borderBottom: `1px solid ${theme.palette.divider}`,
      color: theme.palette.text.primary,
      '&:hover': { backgroundColor: theme.palette.action.hover },
    },
  },
  '& .react-flow__minimap': {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
  },
}));

const initialNodes: Node<NodeData>[] = [
  {
    id: 'c1', type: 'consultant', position: { x: 100, y: 50 },
    data: { 
      label: 'McKinsey & Company', type: 'consultant',
      properties: { id: 'C001', firm: 'McKinsey & Company', specialization: 'Digital Banking Strategy', experience: 12, status: 'Active' } 
    }
  },
  {
    id: 'c2', type: 'consultant', position: { x: 300, y: 50 },
    data: { 
      label: 'Boston Consulting Group', type: 'consultant',
      properties: { id: 'C002', firm: 'Boston Consulting Group', specialization: 'Investment Management', experience: 10, status: 'Active' } 
    }
  },
  {
    id: 'c3', type: 'consultant', position: { x: 500, y: 50 },
    data: { 
      label: 'Deloitte Financial Services', type: 'consultant',
      properties: { id: 'C003', firm: 'Deloitte Financial Services', specialization: 'Risk & Compliance', experience: 8, status: 'Active' } 
    }
  },
  {
    id: 'c4', type: 'consultant', position: { x: 700, y: 50 },
    data: { 
      label: 'Accenture Financial Services', type: 'consultant',
      properties: { id: 'C004', firm: 'Accenture Financial Services', specialization: 'Technology Implementation', experience: 15, status: 'Active' } 
    }
  },
  {
    id: 'fc1', type: 'fieldconsultant', position: { x: 150, y: 200 },
    data: { 
      label: 'Sarah Mitchell', type: 'fieldconsultant',
      properties: { id: 'FC001', firm: 'JPM Implementation Team', region: 'North America', specialization: 'Consumer Banking', status: 'On Assignment' } 
    }
  },
  {
    id: 'fc2', type: 'fieldconsultant', position: { x: 400, y: 200 },
    data: { 
      label: 'James Anderson', type: 'fieldconsultant',
      properties: { id: 'FC002', firm: 'JPM Implementation Team', region: 'EMEA', specialization: 'Investment Banking', status: 'Available' } 
    }
  },
  {
    id: 'fc3', type: 'fieldconsultant', position: { x: 650, y: 200 },
    data: { 
      label: 'Lisa Chen', type: 'fieldconsultant',
      properties: { id: 'FC003', firm: 'JPM Implementation Team', region: 'APAC', specialization: 'Asset Management', status: 'On Assignment' } 
    }
  },
  {
    id: 'cl1', type: 'client', position: { x: 100, y: 350 },
    data: { 
      label: 'Chase Consumer Banking', type: 'client',
      properties: { id: 'CL001', industry: 'Retail Banking', assetSize: '$2.3T AUM', relationship: 'Internal Division', status: 'Active Implementation' } 
    }
  },
  {
    id: 'cl2', type: 'client', position: { x: 300, y: 350 },
    data: { 
      label: 'JPM Investment Bank', type: 'client',
      properties: { id: 'CL002', industry: 'Investment Banking', assetSize: '$3.7T Assets', relationship: 'Internal Division', status: 'Strategy Review' } 
    }
  },
  {
    id: 'cl3', type: 'client', position: { x: 500, y: 350 },
    data: { 
      label: 'JPM Asset Management', type: 'client',
      properties: { id: 'CL003', industry: 'Asset Management', assetSize: '$2.6T AUM', relationship: 'Internal Division', status: 'Product Rollout' } 
    }
  },
  {
    id: 'cl4', type: 'client', position: { x: 700, y: 350 },
    data: { 
      label: 'Corporate & Investment Bank', type: 'client',
      properties: { id: 'CL004', industry: 'Corporate Banking', assetSize: '$1.8T Assets', relationship: 'Internal Division', status: 'Technology Upgrade' } 
    }
  },
  {
    id: 'p1', type: 'product', position: { x: 50, y: 500 },
    data: { 
      label: 'JPM Digital Wallet', type: 'product',
      properties: { 
        id: 'P001', category: 'Consumer Banking', businessLine: 'Chase', version: '4.2.1', status: 'Production',
        consultantRatings: [
          { consultantId: 'C001', consultantFirm: 'McKinsey & Company', rating: 'positive', comment: 'Strong user adoption' },
          { consultantId: 'C002', consultantFirm: 'Boston Consulting Group', rating: 'positive', comment: 'Market-leading features' },
          { consultantId: 'C004', consultantFirm: 'Accenture Financial Services', rating: 'introduced', comment: 'Rolling out enhancements' },
        ]
      } 
    }
  },
  {
    id: 'p2', type: 'product', position: { x: 250, y: 500 },
    data: { 
      label: 'Investment Analytics Platform', type: 'product',
      properties: { 
        id: 'P002', category: 'Investment Management', businessLine: 'Asset Management', version: '3.1.0', status: 'Beta Testing',
        consultantRatings: [
          { consultantId: 'C002', consultantFirm: 'Boston Consulting Group', rating: 'positive', comment: 'Excellent analytics capabilities' },
          { consultantId: 'C003', consultantFirm: 'Deloitte Financial Services', rating: 'introduced', comment: 'Compliance review in progress' },
          { consultantId: 'C001', consultantFirm: 'McKinsey & Company', rating: 'neutral', comment: 'Awaiting performance benchmarks' },
        ]
      } 
    }
  },
  {
    id: 'p3', type: 'product', position: { x: 450, y: 500 },
    data: { 
      label: 'Risk Management Suite', type: 'product',
      properties: { 
        id: 'P003', category: 'Risk & Compliance', businessLine: 'Corporate Banking', version: '2.3.2', status: 'Production',
        consultantRatings: [
          { consultantId: 'C003', consultantFirm: 'Deloitte Financial Services', rating: 'positive', comment: 'Robust compliance features' },
          { consultantId: 'C001', consultantFirm: 'McKinsey & Company', rating: 'positive', comment: 'Reduces operational risk' },
          { consultantId: 'C004', consultantFirm: 'Accenture Financial Services', rating: 'negative', comment: 'Integration challenges' },
          { consultantId: 'C002', consultantFirm: 'Boston Consulting Group', rating: 'introduced', comment: 'Pilot implementation started' },
        ]
      } 
    }
  },
  {
    id: 'p4', type: 'product', position: { x: 650, y: 500 },
    data: { 
      label: 'Trading Platform Next-Gen', type: 'product',
      properties: { 
        id: 'P004', category: 'Trading Technology', businessLine: 'Investment Banking', version: '5.0.1', status: 'Production',
        consultantRatings: [
          { consultantId: 'C004', consultantFirm: 'Accenture Financial Services', rating: 'positive', comment: 'Superior performance' },
          { consultantId: 'C002', consultantFirm: 'Boston Consulting Group', rating: 'positive', comment: 'Competitive advantage' },
          { consultantId: 'C003', consultantFirm: 'Deloitte Financial Services', rating: 'neutral', comment: 'Regulatory review pending' },
        ]
      } 
    }
  },
];

const initialEdges: Edge[] = [
  // Simple test edges that should definitely work
  { 
    id: 'e1-2', 
    source: 'c1', 
    target: 'fc1', 
    animated: true,
    style: { stroke: '#ff0000', strokeWidth: 5 }
  },
  { 
    id: 'e2-3', 
    source: 'fc1', 
    target: 'cl1', 
    animated: true,
    style: { stroke: '#00ff00', strokeWidth: 5 }
  },
  { 
    id: 'e3-4', 
    source: 'cl1', 
    target: 'p1', 
    style: { stroke: '#0000ff', strokeWidth: 5 }
  },
  { 
    id: 'e4-5', 
    source: 'c2', 
    target: 'fc2', 
    style: { stroke: '#ffff00', strokeWidth: 5 }
  },
];

const ConsultantNode: React.FC<NodeProps<NodeData>> = ({ data }) => (
  <Box sx={{ textAlign: 'center' }}>
    <Avatar sx={{ bgcolor: 'primary.main', width: 60, height: 60, border: 3, borderColor: 'primary.light', mb: 1, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
      <Person sx={{ fontSize: 28 }} />
    </Avatar>
    <Typography variant="body2" fontWeight="bold" color="primary.main" sx={{ maxWidth: 120 }}>
      {data.properties.firm}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {data.properties.specialization}
    </Typography>
  </Box>
);

const FieldConsultantNode: React.FC<NodeProps<NodeData>> = ({ data }) => (
  <Box sx={{ textAlign: 'center' }}>
    <Avatar sx={{ bgcolor: 'secondary.main', width: 60, height: 60, border: 3, borderColor: 'secondary.light', mb: 1, boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>
      <SupportAgent sx={{ fontSize: 28 }} />
    </Avatar>
    <Typography variant="body2" fontWeight="bold" color="secondary.main" sx={{ maxWidth: 140 }}>
      {data.label}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {data.properties.region}
    </Typography>
  </Box>
);

const ClientNode: React.FC<NodeProps<NodeData>> = ({ data }) => (
  <Box sx={{ textAlign: 'center' }}>
    <Avatar sx={{ bgcolor: 'success.main', width: 60, height: 60, border: 3, borderColor: 'success.light', mb: 1, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
      <AccountBalance sx={{ fontSize: 28 }} />
    </Avatar>
    <Typography variant="body2" fontWeight="bold" color="success.main" sx={{ maxWidth: 140 }}>
      {data.label}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {data.properties.assetSize}
    </Typography>
  </Box>
);

const ProductNode: React.FC<NodeProps<NodeData>> = ({ data }) => {
  const { consultantRatings } = data.properties;
  
  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'positive': return <CheckCircle sx={{ color: '#10b981', fontSize: 16 }} />;
      case 'negative': return <Cancel sx={{ color: '#ef4444', fontSize: 16 }} />;
      case 'introduced': return <HourglassEmpty sx={{ color: '#f59e0b', fontSize: 16 }} />;
      case 'neutral': return <RemoveCircle sx={{ color: '#6b7280', fontSize: 16 }} />;
      default: return null;
    }
  };

  const getProductIcon = (category: string) => {
    switch (category) {
      case 'Consumer Banking': return <CreditCard sx={{ fontSize: 20, color: '#3b82f6' }} />;
      case 'Investment Management': return <TrendingUp sx={{ fontSize: 20, color: '#10b981' }} />;  
      case 'Risk & Compliance': return <Security sx={{ fontSize: 20, color: '#ef4444' }} />;
      case 'Trading Technology': return <Analytics sx={{ fontSize: 20, color: '#8b5cf6' }} />;
      default: return <Inventory2 sx={{ fontSize: 20, color: '#64748b' }} />;
    }
  };

  return (
    <Paper elevation={4} sx={{ p: 2, minWidth: 220, maxWidth: 280, border: 2, borderColor: 'info.main', backgroundColor: 'background.paper', borderRadius: 2, boxShadow: '0 8px 24px rgba(59, 130, 246, 0.2)' }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ bgcolor: 'info.main', width: 36, height: 36 }}>
            {getProductIcon(data.properties.category!)}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" color="info.main">
              {data.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {data.properties.businessLine} • v{data.properties.version}
            </Typography>
          </Box>
        </Stack>

        {consultantRatings && consultantRatings.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block', mb: 1 }}>
              Consultant Ratings ({consultantRatings.length} firms)
            </Typography>
            <Stack spacing={1}>
              {consultantRatings.map((rating, index) => (
                <Stack key={index} direction="row" spacing={1} alignItems="center" sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  {getRatingIcon(rating.rating)}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="caption" fontWeight="medium">
                      {rating.consultantFirm.split(' ')[0]}
                    </Typography>
                    {rating.comment && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '10px' }}>
                        {rating.comment}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}

        <Stack direction="row" spacing={1} justifyContent="space-between">
          <Chip label={data.properties.status} size="small" color={data.properties.status === 'Production' ? 'success' : 'warning'} />
          <Typography variant="caption" color="text.secondary">
            {data.properties.category}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};

const nodeTypes = { consultant: ConsultantNode, fieldconsultant: FieldConsultantNode, client: ClientNode, product: ProductNode };

const DRAWER_WIDTH = 72;
const RIGHT_DRAWER_WIDTH = 400;

const TextToCypherDashboard: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedNavItem, setSelectedNavItem] = useState<string>('graph');
  const [activeTab, setActiveTab] = useState<number>(0);
  const [cypherQuery, setCypherQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, type: 'bot', text: 'Hello! I can help you analyze JPM\'s consultant network and product ratings across business lines. What would you like to explore?', timestamp: new Date() }
  ]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>('all');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all');
  const [businessLineFilter, setBusinessLineFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [experienceRange, setExperienceRange] = useState<number[]>([0, 20]);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });

  const navItems = [
    { id: 'dashboard', icon: <Dashboard />, label: 'Dashboard' },
    { id: 'graph', icon: <AccountTree />, label: 'JPM Network' },
    { id: 'search', icon: <Search />, label: 'Search' },
    { id: 'analytics', icon: <TrendingUp />, label: 'Analytics' },
    { id: 'settings', icon: <Settings />, label: 'Settings' },
    { id: 'help', icon: <Help />, label: 'Help' }
  ];

  const suggestedQuestions = [
    "Show McKinsey's ratings across all JPM products",
    "Which products have the most positive consultant feedback?", 
    "Find consulting firms working with Asset Management",
    "Show product adoption by business line",
    "List all Risk & Compliance product ratings",
    "Which consultants specialize in digital banking?",
    "Show products with implementation challenges",
    "Compare consultant ratings across Investment Banking products"
  ];

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isLoading]);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const generateMockCypher = (naturalQuery: string): string => {
    const lower = naturalQuery.toLowerCase();
    if (lower.includes('mckinsey') && lower.includes('rating')) {
      return "MATCH (c:Consultant {firm: 'McKinsey & Company'})-[r:RATES]->(p:Product) RETURN c, r, p, r.rating, r.comment";
    } else if (lower.includes('positive') && lower.includes('feedback')) {
      return "MATCH (p:Product)<-[r:RATES]-(c:Consultant) WHERE r.rating = 'positive' WITH p, count(r) as positiveCount ORDER BY positiveCount DESC RETURN p, positiveCount";
    } else if (lower.includes('asset management')) {
      return "MATCH (c:Consultant)-[r]-(cl:Client {industry: 'Asset Management'}) RETURN c, r, cl";
    } else if (lower.includes('business line')) {
      return "MATCH (p:Product) WITH p.businessLine as line, collect(p) as products RETURN line, products, size(products) as productCount";
    } else if (lower.includes('risk') && lower.includes('compliance')) {
      return "MATCH (p:Product {category: 'Risk & Compliance'})<-[r:RATES]-(c:Consultant) RETURN p, c, r.rating, r.comment";
    } else if (lower.includes('digital banking')) {
      return "MATCH (c:Consultant) WHERE c.specialization CONTAINS 'Digital Banking' RETURN c";
    } else if (lower.includes('implementation') && lower.includes('challenges')) {
      return "MATCH (p:Product)<-[r:RATES]-(c:Consultant) WHERE r.rating = 'negative' RETURN p, c, r.comment";
    } else if (lower.includes('investment banking')) {
      return "MATCH (p:Product {businessLine: 'Investment Banking'})<-[r:RATES]-(c:Consultant) RETURN p, c, r.rating ORDER BY c.firm";
    } else {
      return "MATCH (n)-[r]-(m) RETURN n, r, m LIMIT 25";
    }
  };

  const handleSendMessage = (): void => {
    if (!currentMessage.trim()) return;
    
    const newMessage: ChatMessage = {
      id: chatMessages.length + 1,
      type: 'user',
      text: currentMessage,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setIsLoading(true);
    
    setTimeout(() => {
      const response = generateIntelligentResponse(currentMessage);
      setChatMessages(prev => [...prev, response]);
      setIsLoading(false);
      
      if (response.cypher) {
        setCypherQuery(response.cypher);
        showSnackbar('JPM network query generated!', 'success');
      }
    }, 1500);
    
    setCurrentMessage('');
  };

  const generateIntelligentResponse = (userMessage: string): ChatMessage => {
    const lower = userMessage.toLowerCase();
    const messageId = chatMessages.length + 2;
    
    if (lower.includes('mckinsey') || lower.includes('bcg') || lower.includes('deloitte') || lower.includes('accenture')) {
      const cypher = generateMockCypher(userMessage);
      return {
        id: messageId,
        type: 'bot',
        text: `I've analyzed the specific consulting firm's engagement with JPM products. The data shows their ratings and implementation feedback across different business lines including Consumer Banking, Investment Management, and Risk & Compliance.`,
        cypher: cypher,
        timestamp: new Date(),
        actions: [
          { label: "Show firm comparison", prompt: "Compare ratings across all consulting firms" },
          { label: "Business line breakdown", prompt: "Break down ratings by JPM business line" }
        ]
      };
    } else if (lower.includes('product') && lower.includes('rating')) {
      const cypher = generateMockCypher(userMessage);
      return {
        id: messageId,
        type: 'bot',
        text: `Based on the JPM product portfolio analysis, the Trading Platform Next-Gen and JPM Digital Wallet show the strongest positive ratings from consulting firms, while the Risk Management Suite has mixed feedback due to integration complexity.`,
        cypher: cypher,
        timestamp: new Date(),
        actions: [
          { label: "Show detailed ratings", prompt: "Show all consultant comments by product" },
          { label: "Implementation timeline", prompt: "Show product rollout progress" }
        ]
      };
    } else if (lower.includes('business line') || lower.includes('division')) {
      const cypher = generateMockCypher(userMessage);
      return {
        id: messageId,
        type: 'bot',
        text: `JPM's business lines show varied consultant engagement: Chase Consumer Banking leads in digital innovation, Investment Banking focuses on trading technology, Asset Management emphasizes analytics, and Corporate Banking prioritizes risk management solutions.`,
        cypher: cypher,
        timestamp: new Date(),
        actions: [
          { label: "Division deep dive", prompt: "Analyze specific business line performance" },
          { label: "Cross-division synergies", prompt: "Find shared consultant recommendations" }
        ]
      };
    } else {
      const cypher = generateMockCypher(userMessage);
      return {
        id: messageId,
        type: 'bot',
        text: `I've generated a query to explore "${userMessage}" within JPM's consultant network and product ecosystem. This will help analyze relationships between consulting firms, implementation teams, business divisions, and product ratings.`,
        cypher: cypher,
        timestamp: new Date(),
        actions: [
          { label: "Explain insights", prompt: `Provide insights on: ${userMessage}` },
          { label: "Related patterns", prompt: "Show me related network patterns in JPM" }
        ]
      };
    }
  };

  const clearMessages = (): void => {
    setChatMessages([
      { id: 1, type: 'bot', text: 'Chat cleared. How can I help you analyze JPM\'s consultant network?', timestamp: new Date() }
    ]);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success'): void => {
    setSnackbar({ open: true, message, severity });
  };

  const applyFilters = (): void => {
    showSnackbar('Filters applied to JPM network visualization', 'success');
  };

  const clearFilters = (): void => {
    setNodeTypeFilter('all');
    setRelationshipFilter('all');
    setBusinessLineFilter('all');
    setStatusFilter('all');
    setExperienceRange([0, 20]);
    showSnackbar('All filters cleared', 'success');
  };

  const consultantCount = nodes.filter(n => n.data.type === 'consultant').length;
  const fieldConsultantCount = nodes.filter(n => n.data.type === 'fieldconsultant').length;
  const clientCount = nodes.filter(n => n.data.type === 'client').length;
  const productCount = nodes.filter(n => n.data.type === 'product').length;

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ReactFlowProvider>
        <Box sx={{ display: 'flex', height: '100vh' }}>
        <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}>
          <Toolbar sx={{ justifyContent: 'center', py: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
              <AccountBalance />
            </Avatar>
          </Toolbar>
          <Divider />
          <List sx={{ px: 1 }}>
            {navItems.map((item) => (
              <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
                <Tooltip title={item.label} placement="right">
                  <ListItemButton
                    selected={selectedNavItem === item.id}
                    onClick={() => setSelectedNavItem(item.id)}
                    sx={{ minHeight: 48, justifyContent: 'center', borderRadius: 2, '&.Mui-selected': { bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } } }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', color: 'inherit' }}>
                      {item.icon}
                    </ListItemIcon>
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Drawer>

        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <AppBar position="static" elevation={0}>
            <Toolbar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  JPM Consultant Network Explorer
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Analyze consultant ratings and product adoption across business lines
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Notifications">
                  <IconButton color="inherit">
                    <Badge badgeContent={3} color="secondary">
                      <Notifications />
                    </Badge>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Profile">
                  <IconButton color="inherit">
                    <Avatar sx={{ width: 32, height: 32 }}>JPM</Avatar>
                  </IconButton>
                </Tooltip>
              </Box>
            </Toolbar>
          </AppBar>

          <Box sx={{ flexGrow: 1 }}>
            <StyledReactFlow>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.1 }}
              >
                <Controls />
                <MiniMap 
                  nodeColor={(node) => {
                    switch (node.data?.type) {
                      case 'consultant': return '#6366f1';
                      case 'fieldconsultant': return '#f59e0b';  
                      case 'client': return '#10b981';
                      case 'product': return '#3b82f6';
                      default: return '#64748b';
                    }
                  }}
                  maskColor="rgba(0,0,0,0.8)"
                />
                <Background color="#334155" gap={20} />
              </ReactFlow>
            </StyledReactFlow>
          </Box>
        </Box>

        <Drawer variant="permanent" anchor="right" sx={{ width: RIGHT_DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: RIGHT_DRAWER_WIDTH, boxSizing: 'border-box' } }}>
          <Toolbar />
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} variant="fullWidth">
              <Tab icon={<MessageOutlined />} label="AI Chat" iconPosition="start" />
              <Tab icon={<FilterList />} label="Filters" iconPosition="start" />
            </Tabs>
          </Box>

          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {activeTab === 0 ? (
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                        <SmartToy fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">JPM Network AI</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Consultant • Product • Rating Analysis
                        </Typography>
                      </Box>
                    </Stack>
                    <Tooltip title="Clear conversation">
                      <IconButton onClick={clearMessages} size="small">
                        <Clear />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>

                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    JPM Network Insights:
                  </Typography>
                  <Stack spacing={1}>
                    {suggestedQuestions.slice(0, 4).map((question, index) => (
                      <Chip
                        key={index}
                        label={question}
                        size="small"
                        onClick={() => setCurrentMessage(question)}
                        sx={{ justifyContent: 'flex-start', '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'left' } }}
                      />
                    ))}
                  </Stack>
                </Box>

                <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
                  <Stack spacing={2}>
                    {chatMessages.map((message) => (
                      <Box key={message.id} sx={{ display: 'flex', justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start' }}>
                        <Paper sx={{ p: 2, maxWidth: '85%', bgcolor: message.type === 'user' ? 'primary.main' : 'background.paper', color: message.type === 'user' ? 'primary.contrastText' : 'text.primary' }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {message.text}
                          </Typography>
                          
                          {message.cypher && (
                            <Paper sx={{ mt: 2, p: 2, bgcolor: 'background.default' }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Code fontSize="small" color="success" />
                                  <Typography variant="caption" color="text.secondary">
                                    Generated Cypher Query
                                  </Typography>
                                </Stack>
                                <Tooltip title="Copy query">
                                  <IconButton 
                                    size="small"
                                    onClick={() => {
                                      navigator.clipboard.writeText(message.cypher!);
                                      showSnackbar('Query copied to clipboard!', 'success');
                                    }}
                                  >
                                    <ContentCopy fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                              <Typography variant="body2" fontFamily="monospace" color="success.main" sx={{ whiteSpace: 'pre-wrap' }}>
                                {message.cypher}
                              </Typography>
                              <Button startIcon={<PlayArrow />} size="small" color="success" sx={{ mt: 1 }}>
                                Execute Query
                              </Button>
                            </Paper>
                          )}
                          
                          {message.actions && (
                            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
                              {message.actions.map((action, index) => (
                                <Chip
                                  key={index}
                                  label={action.label}
                                  size="small"
                                  onClick={() => setCurrentMessage(action.prompt)}
                                  sx={{ mb: 1 }}
                                />
                              ))}
                            </Stack>
                          )}
                          
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                              {message.timestamp.toLocaleTimeString()}
                            </Typography>
                            {message.type === 'bot' && (
                              <Stack direction="row">
                                <IconButton size="small">
                                  <ThumbUp fontSize="small" />
                                </IconButton>
                                <IconButton size="small">
                                  <ThumbDown fontSize="small" />
                                </IconButton>
                              </Stack>
                            )}
                          </Stack>
                        </Paper>
                      </Box>
                    ))}
                    
                    {isLoading && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <SmartToy color="primary" />
                            <Typography variant="body2">Analyzing JPM network...</Typography>
                          </Stack>
                        </Paper>
                      </Box>
                    )}
                    <div ref={messagesEndRef} />
                  </Stack>
                </Box>
                
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Stack spacing={1}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Ask about consultant ratings, business line performance, or product adoption across JPM..."
                      variant="outlined"
                      size="small"
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            onClick={handleSendMessage}
                            disabled={!currentMessage.trim() || isLoading}
                            color="primary"
                          >
                            <Send />
                          </IconButton>
                        ),
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Press Enter to send • Shift+Enter for new line
                    </Typography>
                  </Stack>
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 2, overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  JPM Network Filters
                </Typography>
                
                <Stack spacing={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Node Type</InputLabel>
                    <Select value={nodeTypeFilter} label="Node Type" onChange={(e) => setNodeTypeFilter(e.target.value)}>
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="consultant">Consulting Firms</MenuItem>
                      <MenuItem value="fieldconsultant">Implementation Teams</MenuItem>
                      <MenuItem value="client">Business Lines</MenuItem>
                      <MenuItem value="product">JPM Products</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Business Line</InputLabel>
                    <Select value={businessLineFilter} label="Business Line" onChange={(e) => setBusinessLineFilter(e.target.value)}>
                      <MenuItem value="all">All Business Lines</MenuItem>
                      <MenuItem value="Chase">Chase Consumer Banking</MenuItem>
                      <MenuItem value="Asset Management">JPM Asset Management</MenuItem>
                      <MenuItem value="Investment Banking">Investment Banking</MenuItem>
                      <MenuItem value="Corporate Banking">Corporate & Investment Bank</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Relationship Type</InputLabel>
                    <Select value={relationshipFilter} label="Relationship Type" onChange={(e) => setRelationshipFilter(e.target.value)}>
                      <MenuItem value="all">All Relationships</MenuItem>
                      <MenuItem value="ADVISES">ADVISES</MenuItem>
                      <MenuItem value="IMPLEMENTS">IMPLEMENTS</MenuItem>
                      <MenuItem value="SERVES">SERVES</MenuItem>
                      <MenuItem value="USES">USES</MenuItem>
                      <MenuItem value="EVALUATES">EVALUATES</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                      <MenuItem value="all">All Statuses</MenuItem>
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Production">Production</MenuItem>
                      <MenuItem value="Beta Testing">Beta Testing</MenuItem>
                      <MenuItem value="On Assignment">On Assignment</MenuItem>
                      <MenuItem value="Available">Available</MenuItem>
                    </Select>
                  </FormControl>

                  <Box>
                    <Typography gutterBottom>
                      Experience Range: {experienceRange[0]} - {experienceRange[1]} years
                    </Typography>
                    <Slider
                      value={experienceRange}
                      onChange={(e, newValue) => setExperienceRange(newValue as number[])}
                      valueLabelDisplay="auto"
                      min={0}
                      max={25}
                      marks={[
                        { value: 0, label: '0y' },
                        { value: 5, label: '5y' },
                        { value: 10, label: '10y' },
                        { value: 15, label: '15y' },
                        { value: 20, label: '20y' },
                        { value: 25, label: '25y' }
                      ]}
                    />
                  </Box>

                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Product Rating Filters
                  </Typography>

                  <FormControlLabel control={<Switch defaultChecked />} label="Show Positive Ratings Only" />
                  <FormControlLabel control={<Switch />} label="Show Products with Issues" />
                  <FormControlLabel control={<Switch defaultChecked />} label="Show Implementation Progress" />

                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Display Options
                  </Typography>

                  <FormControlLabel control={<Switch defaultChecked />} label="Show Consultant Ratings" />
                  <FormControlLabel control={<Switch defaultChecked />} label="Show Edge Labels" />
                  <FormControlLabel control={<Switch />} label="Highlight Critical Paths" />
                  <FormControlLabel control={<Switch />} label="Show Business Line Colors" />

                  <Stack spacing={2} sx={{ mt: 3 }}>
                    <Button variant="contained" fullWidth onClick={applyFilters} startIcon={<FilterList />}>
                      Apply Filters
                    </Button>
                    <Button variant="outlined" fullWidth onClick={clearFilters} startIcon={<Clear />}>
                      Clear All Filters
                    </Button>
                  </Stack>

                  <Card sx={{ mt: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        JPM Business Performance
                      </Typography>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="body2" gutterBottom>Consultant Satisfaction</Typography>
                          <LinearProgress variant="determinate" value={82} color="success" sx={{ height: 8, borderRadius: 4 }} />
                          <Typography variant="caption" color="text.secondary">82% positive consultant ratings</Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" gutterBottom>Product Adoption Rate</Typography>
                          <LinearProgress variant="determinate" value={75} color="primary" sx={{ height: 8, borderRadius: 4 }} />
                          <Typography variant="caption" color="text.secondary">75% of products in active use</Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" gutterBottom>Implementation Success</Typography>
                          <LinearProgress variant="determinate" value={91} color="success" sx={{ height: 8, borderRadius: 4 }} />
                          <Typography variant="caption" color="text.secondary">91% successful implementations</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>

                  <Card sx={{ mt: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>Network Overview</Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">15</Typography>
                          <Typography variant="caption" color="text.secondary">Total Ratings</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="success.main">$4.2T</Typography>
                          <Typography variant="caption" color="text.secondary">Assets Under Management</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="secondary.main">3</Typography>
                          <Typography variant="caption" color="text.secondary">Global Regions</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="info.main">4</Typography>
                          <Typography variant="caption" color="text.secondary">Business Lines</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>

                  <Card sx={{ mt: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>Rating Distribution</Typography>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CheckCircle sx={{ color: '#10b981', fontSize: 16 }} />
                            <Typography variant="caption">Positive</Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight="bold" color="success.main">9 ratings</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <HourglassEmpty sx={{ color: '#f59e0b', fontSize: 16 }} />
                            <Typography variant="caption">In Progress</Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight="bold" color="warning.main">4 ratings</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <RemoveCircle sx={{ color: '#6b7280', fontSize: 16 }} />
                            <Typography variant="caption">Neutral</Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight="bold" sx={{ color: '#6b7280' }}>2 ratings</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Cancel sx={{ color: '#ef4444', fontSize: 16 }} />
                            <Typography variant="caption">Negative</Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight="bold" color="error.main">1 rating</Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Stack>
              </Box>
            )}
          </Box>
        </Drawer>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert 
            severity={snackbar.severity} 
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
      </ReactFlowProvider>
    </ThemeProvider>
  );
};

export default TextToCypherDashboard;