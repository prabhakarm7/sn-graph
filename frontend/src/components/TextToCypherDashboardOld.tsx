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
  Autocomplete,
  IconButton,
  AlertColor,
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
  Work,
  Timeline,
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
  Engineering,
  LocationOn,
  CalendarMonth,
  AttachMoney,
  PriorityHigh
} from '@mui/icons-material';

// Type definitions
interface NodeData {
  label: string;
  properties: {
    age?: number;
    city?: string;
    department?: string;
    industry?: string;
    employees?: number;
    founded?: number;
    status?: string;
    budget?: number;
    priority?: string;
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
  severity: AlertColor;
}

// Dark theme configuration
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
    },
    secondary: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e293b',
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1e293b',
          borderRight: '1px solid #334155',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e293b',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            color: '#6366f1',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#6366f1',
        },
      },
    },
  },
});

// Custom styled components
const StyledReactFlow = styled(Box)(({ theme }) => ({
  height: '100%',
  '& .react-flow__node': {
    fontSize: '14px',
  },
  '& .react-flow__controls': {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    '& button': {
      backgroundColor: theme.palette.background.paper,
      borderBottom: `1px solid ${theme.palette.divider}`,
      color: theme.palette.text.primary,
      '&:hover': {
        backgroundColor: theme.palette.action.hover,
      },
    },
  },
  '& .react-flow__minimap': {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
  },
}));

// Mock data for React Flow
const initialNodes: Node<NodeData>[] = [
  {
    id: '1',
    type: 'person',
    position: { x: 100, y: 100 },
    data: { 
      label: 'Cambridge Consultnat', 
      properties: { age: 32, city: 'New York', department: 'Engineering' } 
    },
  },
  {
    id: '2',
    type: 'person',
    position: { x: 300, y: 200 },
    data: { 
      label: 'Bob Smith', 
      properties: { age: 28, city: 'Boston', department: 'Marketing' } 
    },
  },
  {
    id: '3',
    type: 'company',
    position: { x: 500, y: 150 },
    data: { 
      label: 'STATE BOARD OF AD FLORIDA', 
      properties: { industry: 'Technology', employees: 500, founded: 2010 } 
    },
  },
  {
    id: '4',
    type: 'project',
    position: { x: 300, y: 50 },
    data: { 
      label: 'JPM Strategic Investements', 
      properties: { status: 'Active', budget: 1000000, priority: 'High' } 
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-3',
    source: '1',
    target: '3',
    type: 'smoothstep',
    label: 'WORKS_FOR',
    style: { stroke: '#64748b', strokeWidth: 2 },
    labelStyle: { fill: '#94a3b8', fontSize: '12px' },
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    type: 'smoothstep',
    label: 'WORKS_FOR',
    style: { stroke: '#64748b', strokeWidth: 2 },
    labelStyle: { fill: '#94a3b8', fontSize: '12px' },
  },
  {
    id: 'e1-4',
    source: '1',
    target: '4',
    type: 'smoothstep',
    label: 'MANAGES',
    style: { stroke: '#64748b', strokeWidth: 2 },
    labelStyle: { fill: '#94a3b8', fontSize: '12px' },
  },
];

// Custom Node Components
const PersonNode: React.FC<NodeProps<NodeData>> = ({ data }) => (
  <Paper 
    elevation={3}
    sx={{ 
      p: 2, 
      minWidth: 180,
      border: 2, 
      borderColor: 'primary.main',
      backgroundColor: 'background.paper'
    }}
  >
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Person color="primary" fontSize="small" />
        <Typography variant="body2" fontWeight="medium">
          {data.label}
        </Typography>
      </Stack>
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Age: {data.properties.age}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <LocationOn sx={{ fontSize: 12 }} color="action" />
          <Typography variant="caption" color="text.secondary">
            {data.properties.city}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Engineering sx={{ fontSize: 12 }} color="action" />
          <Typography variant="caption" color="text.secondary">
            {data.properties.department}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  </Paper>
);

const CompanyNode: React.FC<NodeProps<NodeData>> = ({ data }) => (
  <Paper 
    elevation={3}
    sx={{ 
      p: 2, 
      minWidth: 180,
      border: 2, 
      borderColor: 'secondary.main',
      backgroundColor: 'background.paper'
    }}
  >
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Business color="secondary" fontSize="small" />
        <Typography variant="body2" fontWeight="medium">
          {data.label}
        </Typography>
      </Stack>
      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary">
          {data.properties.industry}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {data.properties.employees} employees
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <CalendarMonth sx={{ fontSize: 12 }} color="action" />
          <Typography variant="caption" color="text.secondary">
            Founded {data.properties.founded}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  </Paper>
);

const ProjectNode: React.FC<NodeProps<NodeData>> = ({ data }) => (
  <Paper 
    elevation={3}
    sx={{ 
      p: 2, 
      minWidth: 180,
      border: 2, 
      borderColor: 'success.main',
      backgroundColor: 'background.paper'
    }}
  >
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Work color="success" fontSize="small" />
        <Typography variant="body2" fontWeight="medium">
          {data.label}
        </Typography>
      </Stack>
      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary">
          Status: {data.properties.status}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <AttachMoney sx={{ fontSize: 12 }} color="action" />
          <Typography variant="caption" color="text.secondary">
            ${data.properties.budget ? (data.properties.budget / 1000000).toFixed(1) : 0}M
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <PriorityHigh sx={{ fontSize: 12 }} color="action" />
          <Typography variant="caption" color="text.secondary">
            {data.properties.priority}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  </Paper>
);

const nodeTypes = {
  person: PersonNode,
  company: CompanyNode,
  project: ProjectNode,
};

const DRAWER_WIDTH = 72;
const RIGHT_DRAWER_WIDTH = 400;

const TextToCypherDashboard: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedNavItem, setSelectedNavItem] = useState<string>('graph');
  const [activeTab, setActiveTab] = useState<number>(0); // 0 for chat, 1 for filters
  const [cypherQuery, setCypherQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, type: 'bot', text: 'Hello! I can help you explore your graph data. What would you like to find?', timestamp: new Date() }
  ]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  
  // Filter states
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>('all');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [budgetRange, setBudgetRange] = useState<number[]>([0, 2000000]);
  const [ageRange, setAgeRange] = useState<number[]>([18, 65]);
  
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });

  const navItems = [
    { id: 'dashboard', icon: <Dashboard />, label: 'Dashboard' },
    { id: 'graph', icon: <AccountTree />, label: 'Graph Explorer' },
    { id: 'search', icon: <Search />, label: 'Search' },
    { id: 'analytics', icon: <Timeline />, label: 'Analytics' },
    { id: 'settings', icon: <Settings />, label: 'Settings' },
    { id: 'help', icon: <Help />, label: 'Help' }
  ];

  const suggestedQuestions = [
    "Find all engineers at TechCorp",
    "Show active projects and their managers", 
    "List people who joined after 2020",
    "Find the most connected person",
    "Show all departments and their employees",
    "Which projects have the highest budget?",
    "Find people working on multiple projects",
    "Show the company organizational structure"
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
    if (lower.includes('engineer')) {
      return "MATCH (p:Person)-[:WORKS_FOR]->(c:Company) WHERE p.department = 'Engineering' RETURN p, c";
    } else if (lower.includes('project') && lower.includes('active')) {
      return "MATCH (p:Project)-[r:MANAGES]-(person:Person) WHERE p.status = 'Active' RETURN p, r, person";
    } else if (lower.includes('technology')) {
      return "MATCH (c:Company) WHERE c.industry = 'Technology' RETURN c";
    } else if (lower.includes('connected')) {
      return "MATCH (n)-[r]-() WITH n, count(r) as connections ORDER BY connections DESC LIMIT 5 RETURN n, connections";
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
        showSnackbar('Query generated and ready to execute!', 'success');
      }
    }, 1500);
    
    setCurrentMessage('');
  };

  const generateIntelligentResponse = (userMessage: string): ChatMessage => {
    const lower = userMessage.toLowerCase();
    const messageId = chatMessages.length + 2;
    
    if (lower.includes('generate') || lower.includes('query') || lower.includes('find') || lower.includes('show') || lower.includes('list')) {
      const cypher = generateMockCypher(userMessage);
      return {
        id: messageId,
        type: 'bot',
        text: `I've generated a Cypher query for "${userMessage}". This query will help you explore the specific data you're looking for in your graph.`,
        cypher: cypher,
        timestamp: new Date(),
        actions: [
          { label: "Explain this query", prompt: `Explain what this Cypher query does: ${cypher}` },
          { label: "Optimize it", prompt: "How can I optimize this query for better performance?" },
          { label: "Similar queries", prompt: "Show me similar queries I can try" }
        ]
      };
    } else if (lower.includes('explain') || lower.includes('what does') || lower.includes('how does')) {
      return {
        id: messageId,
        type: 'bot',
        text: `Let me explain that for you! The query works by matching patterns in the graph database. In Cypher, we use MATCH clauses to find nodes and relationships, WHERE clauses to filter results, and RETURN to specify what data to retrieve.`,
        timestamp: new Date(),
        actions: [
          { label: "Show example", prompt: "Give me a simple example query" },
          { label: "Learn more", prompt: "Teach me more about Cypher syntax" }
        ]
      };
    } else {
      return {
        id: messageId,
        type: 'bot',
        text: `I understand you're interested in "${userMessage}". Would you like me to generate a query to investigate this, or would you prefer an explanation of how it relates to your current graph structure?`,
        timestamp: new Date(),
        actions: [
          { label: "Generate query", prompt: `Generate a query related to: ${userMessage}` },
          { label: "Show examples", prompt: "Show me example queries I can try" }
        ]
      };
    }
  };

  const clearMessages = (): void => {
    setChatMessages([
      { id: 1, type: 'bot', text: 'Chat cleared. How can I help you explore your graph data?', timestamp: new Date() }
    ]);
  };

  const showSnackbar = (message: string, severity: AlertColor = 'success'): void => {
    setSnackbar({ open: true, message, severity });
  };

  const applyFilters = (): void => {
    showSnackbar('Filters applied to graph visualization', 'success');
  };

  const clearFilters = (): void => {
    setNodeTypeFilter('all');
    setRelationshipFilter('all');
    setDepartmentFilter('all');
    setStatusFilter('all');
    setBudgetRange([0, 2000000]);
    setAgeRange([18, 65]);
    showSnackbar('All filters cleared', 'success');
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        {/* Left Navigation Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          <Toolbar sx={{ justifyContent: 'center', py: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
              <AccountTree />
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
                    sx={{
                      minHeight: 48,
                      justifyContent: 'center',
                      borderRadius: 2,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' }
                      }
                    }}
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

        {/* Main Content Area */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Top App Bar */}
          <AppBar position="static" elevation={0}>
            <Toolbar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Graph Explorer
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Explore and analyze your graph data
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
                    <Avatar sx={{ width: 32, height: 32 }}>U</Avatar>
                  </IconButton>
                </Tooltip>
              </Box>
            </Toolbar>
          </AppBar>

          {/* Graph Controls Bar */}
          <Paper sx={{ p: 2, borderRadius: 0, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                <strong>{nodes.length}</strong> nodes, <strong>{edges.length}</strong> edges
              </Typography>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Export">
                  <IconButton size="small">
                    <Download />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Paper>

          {/* React Flow Graph */}
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
              >
                <Controls />
                <MiniMap 
                  nodeColor="#6366f1"
                  maskColor="rgba(0,0,0,0.8)"
                />
                <Background color="#334155" gap={20} />
              </ReactFlow>
            </StyledReactFlow>
          </Box>
        </Box>

        {/* Right Sidebar with Tabs */}
        <Drawer
          variant="permanent"
          anchor="right"
          sx={{
            width: RIGHT_DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: RIGHT_DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          <Toolbar />
          
          {/* Tab Headers */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="fullWidth"
            >
              <Tab 
                icon={<MessageOutlined />} 
                label="AI Chat" 
                iconPosition="start"
              />
              <Tab 
                icon={<FilterList />} 
                label="Filters" 
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {activeTab === 0 ? (
              /* AI Chat Tab */
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* AI Agent Header */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                        <SmartToy fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">Graph AI Agent</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Query • Analyze • Explore
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

                {/* Suggested Questions */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Try asking:
                  </Typography>
                  <Stack spacing={1}>
                    {suggestedQuestions.slice(0, 4).map((question, index) => (
                      <Chip
                        key={index}
                        label={question}
                        size="small"
                        onClick={() => setCurrentMessage(question)}
                        sx={{ 
                          justifyContent: 'flex-start', 
                          '& .MuiChip-label': { 
                            whiteSpace: 'normal',
                            textAlign: 'left'
                          } 
                        }}
                      />
                    ))}
                  </Stack>
                </Box>

                {/* Chat Messages */}
                <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
                  <Stack spacing={2}>
                    {chatMessages.map((message) => (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <Paper
                          sx={{
                            p: 2,
                            maxWidth: '85%',
                            bgcolor: message.type === 'user' ? 'primary.main' : 'background.paper',
                            color: message.type === 'user' ? 'primary.contrastText' : 'text.primary'
                          }}
                        >
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
                              <Typography 
                                variant="body2" 
                                fontFamily="monospace" 
                                color="success.main"
                                sx={{ whiteSpace: 'pre-wrap' }}
                              >
                                {message.cypher}
                              </Typography>
                              <Button 
                                startIcon={<PlayArrow />}
                                size="small" 
                                color="success" 
                                sx={{ mt: 1 }}
                              >
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
                            <Typography variant="body2">Thinking...</Typography>
                          </Stack>
                        </Paper>
                      </Box>
                    )}
                    <div ref={messagesEndRef} />
                  </Stack>
                </Box>
                
                {/* Chat Input */}
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
                      placeholder="Ask me to generate queries, analyze data, or explain the graph..."
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
              /* Filters Tab */
              <Box sx={{ p: 2, overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Graph Filters
                </Typography>
                
                <Stack spacing={3}>
                  {/* Node Type Filter */}
                  <FormControl fullWidth size="small">
                    <InputLabel>Node Type</InputLabel>
                    <Select
                      value={nodeTypeFilter}
                      label="Node Type"
                      onChange={(e) => setNodeTypeFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="Person">People</MenuItem>
                      <MenuItem value="Company">Companies</MenuItem>
                      <MenuItem value="Project">Projects</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Relationship Filter */}
                  <FormControl fullWidth size="small">
                    <InputLabel>Relationship Type</InputLabel>
                    <Select
                      value={relationshipFilter}
                      label="Relationship Type"
                      onChange={(e) => setRelationshipFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Relationships</MenuItem>
                      <MenuItem value="WORKS_FOR">WORKS_FOR</MenuItem>
                      <MenuItem value="MANAGES">MANAGES</MenuItem>
                      <MenuItem value="PARTICIPATES_IN">PARTICIPATES_IN</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Department Filter */}
                  <Autocomplete
                    size="small"
                    options={['all', 'Engineering', 'Marketing', 'Sales', 'HR', 'Finance']}
                    value={departmentFilter}
                    onChange={(event, newValue) => setDepartmentFilter(newValue || 'all')}
                    renderInput={(params) => (
                      <TextField {...params} label="Department" />
                    )}
                  />

                  {/* Status Filter */}
                  <FormControl fullWidth size="small">
                    <InputLabel>Project Status</InputLabel>
                    <Select
                      value={statusFilter}
                      label="Project Status"
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Statuses</MenuItem>
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Completed">Completed</MenuItem>
                      <MenuItem value="On Hold">On Hold</MenuItem>
                      <MenuItem value="Cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Age Range */}
                  <Box>
                    <Typography gutterBottom>
                      Age Range: {ageRange[0]} - {ageRange[1]}
                    </Typography>
                    <Slider
                      value={ageRange}
                      onChange={(e, newValue) => setAgeRange(newValue as number[])}
                      valueLabelDisplay="auto"
                      min={18}
                      max={70}
                      marks={[
                        { value: 18, label: '18' },
                        { value: 30, label: '30' },
                        { value: 50, label: '50' },
                        { value: 70, label: '70' }
                      ]}
                    />
                  </Box>

                  {/* Budget Range */}
                  <Box>
                    <Typography gutterBottom>
                      Budget Range: ${(budgetRange[0] / 1000000).toFixed(1)}M - ${(budgetRange[1] / 1000000).toFixed(1)}M
                    </Typography>
                    <Slider
                      value={budgetRange}
                      onChange={(e, newValue) => setBudgetRange(newValue as number[])}
                      valueLabelDisplay="auto"
                      min={0}
                      max={5000000}
                      step={100000}
                      valueLabelFormat={(value) => `${(value / 1000000).toFixed(1)}M`}
                      marks={[
                        { value: 0, label: '$0M' },
                        { value: 1000000, label: '$1M' },
                        { value: 3000000, label: '$3M' },
                        { value: 5000000, label: '$5M' }
                      ]}
                    />
                  </Box>

                  {/* Additional Filters */}
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Display Options
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch defaultChecked />
                    }
                    label="Show Node Labels"
                  />

                  <FormControlLabel
                    control={
                      <Switch defaultChecked />
                    }
                    label="Show Edge Labels"
                  />

                  <FormControlLabel
                    control={
                      <Switch />
                    }
                    label="Show Node Properties"
                  />

                  <FormControlLabel
                    control={
                      <Switch />
                    }
                    label="Highlight Connected Nodes"
                  />

                  {/* Action Buttons */}
                  <Stack spacing={2} sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={applyFilters}
                      startIcon={<FilterList />}
                    >
                      Apply Filters
                    </Button>
                    
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={clearFilters}
                      startIcon={<Clear />}
                    >
                      Clear All Filters
                    </Button>
                  </Stack>

                  {/* Filter Summary */}
                  <Paper sx={{ p: 2, bgcolor: 'background.default', mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Active Filters Summary
                    </Typography>
                    <Stack spacing={1}>
                      {nodeTypeFilter !== 'all' && (
                        <Chip label={`Node Type: ${nodeTypeFilter}`} size="small" />
                      )}
                      {relationshipFilter !== 'all' && (
                        <Chip label={`Relationship: ${relationshipFilter}`} size="small" />
                      )}
                      {departmentFilter !== 'all' && (
                        <Chip label={`Department: ${departmentFilter}`} size="small" />
                      )}
                      {statusFilter !== 'all' && (
                        <Chip label={`Status: ${statusFilter}`} size="small" />
                      )}
                      {(ageRange[0] !== 18 || ageRange[1] !== 65) && (
                        <Chip label={`Age: ${ageRange[0]}-${ageRange[1]}`} size="small" />
                      )}
                      {(budgetRange[0] !== 0 || budgetRange[1] !== 2000000) && (
                        <Chip 
                          label={`Budget: ${(budgetRange[0] / 1000000).toFixed(1)}M-${(budgetRange[1] / 1000000).toFixed(1)}M`} 
                          size="small" 
                        />
                      )}
                    </Stack>
                    {nodeTypeFilter === 'all' && relationshipFilter === 'all' && departmentFilter === 'all' && statusFilter === 'all' && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        No filters applied
                      </Typography>
                    )}
                  </Paper>

                  {/* Graph Statistics */}
                  <Card sx={{ mt: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Graph Statistics
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">
                            {nodes.length}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total Nodes
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="secondary">
                            {edges.length}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total Edges
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="success.main">
                            0.4
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Graph Density
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="warning.main">
                            3
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Node Types
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Stack>
              </Box>
            )}
          </Box>
        </Drawer>

        {/* Snackbar for notifications */}
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
    </ThemeProvider>
  );
};

export default TextToCypherDashboard;