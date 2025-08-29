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
  CircularProgress,
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
  AccountBalance,
  TrendingUp,
  Security,
  Groups,
  MonetizationOn,
  Star,
  LocationOn,
  School,
  Assignment,
  Assessment,
  Engineering,
  Category,
  Refresh,
} from '@mui/icons-material';

// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// Type definitions for Consulting Business data
interface ApiCompany {
  id: string;
  name: string;
  industry: string;
  size: string;
  revenue: number;
  location: string;
  founded_year?: number;
  employee_count?: number;
  status: string;
}

interface ApiConsultant {
  id: string;
  name: string;
  expertise: string[];
  seniority: string;
  years_experience: number;
  hourly_rate: number;
  location: string;
  education?: string;
  rating: number;
  availability: string;
}

interface ApiFieldConsultant {
  id: string;
  name: string;
  specialization: string[];
  region: string;
  years_experience: number;
  certification_level: string;
  hourly_rate: number;
  languages: string[];
  rating: number;
  availability: string;
  travel_willingness: boolean;
}

interface ApiProduct {
  id: string;
  name: string;
  category: string;
  vendor: string;
  price_range: string;
  target_market: string;
  deployment_type: string;
  industry_focus: string[];
  maturity: string;
  rating: number;
}

interface NodeData {
  label: string;
  entityType: 'company' | 'consultant' | 'field_consultant' | 'product';
  properties: any;
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

// Consulting Business theme
const consultingTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2563eb', // Professional Blue
      light: '#60a5fa',
      dark: '#1d4ed8',
    },
    secondary: {
      main: '#f59e0b', // Consulting Gold
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
    success: {
      main: '#10b981',
    },
    warning: {
      main: '#f59e0b',
    },
    error: {
      main: '#ef4444',
    },
    info: {
      main: '#06b6d4',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e293b',
          backgroundImage: 'none',
          border: '1px solid #334155',
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
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
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

// API Service Functions
const apiService = {
  async get(endpoint: string, params?: Record<string, any>) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          url.searchParams.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  },

  async getCompanies(filters: Record<string, any> = {}) {
    return this.get('/api/companies', { limit: 20, ...filters });
  },

  async getConsultants(filters: Record<string, any> = {}) {
    return this.get('/api/consultants', { limit: 20, ...filters });
  },

  async getFieldConsultants(filters: Record<string, any> = {}) {
    return this.get('/api/field-consultants', { limit: 20, ...filters });
  },

  async getProducts(filters: Record<string, any> = {}) {
    return this.get('/api/products', { limit: 20, ...filters });
  },

  async getAnalytics() {
    return this.get('/api/analytics/dashboard');
  },

  async getFilters() {
    const [industries, locations, expertise, specializations, categories] = await Promise.all([
      this.get('/api/filters/industries'),
      this.get('/api/filters/locations'),
      this.get('/api/filters/expertise'),
      this.get('/api/filters/specializations'),
      this.get('/api/filters/product-categories'),
    ]);
    
    return { industries, locations, expertise, specializations, categories };
  }
};

// Custom Node Components
const CompanyNode: React.FC<NodeProps<NodeData>> = ({ data }) => (
  <Paper 
    elevation={4}
    sx={{ 
      p: 3, 
      minWidth: 240,
      border: 2, 
      borderColor: '#2563eb',
      backgroundColor: 'background.paper',
      borderRadius: 3,
      boxShadow: '0 8px 32px rgba(37, 99, 235, 0.2)'
    }}
  >
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Business sx={{ color: '#2563eb', fontSize: 24 }} />
        <Typography variant="subtitle1" fontWeight="bold" color="primary">
          {data.label}
        </Typography>
      </Stack>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Assessment sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {data.properties.industry} • {data.properties.size}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <MonetizationOn sx={{ fontSize: 16, color: 'success.main' }} />
          <Typography variant="body2" color="text.secondary">
            ${data.properties.revenue}M Revenue
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {data.properties.location}
          </Typography>
        </Stack>
        {data.properties.employee_count && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Groups sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {data.properties.employee_count.toLocaleString()} employees
            </Typography>
          </Stack>
        )}
      </Stack>
    </Stack>
  </Paper>
);

const ConsultantNode: React.FC<NodeProps<NodeData>> = ({ data }) => (
  <Paper 
    elevation={4}
    sx={{ 
      p: 3, 
      minWidth: 260,
      border: 2, 
      borderColor: '#f59e0b',
      backgroundColor: 'background.paper',
      borderRadius: 3,
      boxShadow: '0 8px 32px rgba(245, 158, 11, 0.2)'
    }}
  >
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Person sx={{ color: '#f59e0b', fontSize: 24 }} />
        <Typography variant="subtitle1" fontWeight="bold" color="secondary">
          {data.label}
        </Typography>
      </Stack>
      <Stack spacing={1}>
        <Typography variant="body2" color="text.primary" fontWeight="medium">
          {data.properties.seniority} Consultant
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <School sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {data.properties.years_experience} years experience
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <MonetizationOn sx={{ fontSize: 16, color: 'success.main' }} />
          <Typography variant="body2" color="text.secondary">
            ${data.properties.hourly_rate}/hour
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Star sx={{ fontSize: 16, color: 'warning.main' }} />
          <Typography variant="body2" color="text.secondary">
            {data.properties.rating}/5.0 rating
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {data.properties.location}
          </Typography>
        </Stack>
        {data.properties.expertise && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Expertise:
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
              {data.properties.expertise.slice(0, 2).map((skill: string, index: number) => (
                <Chip 
                  key={index} 
                  label={skill} 
                  size="small" 
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Stack>
  </Paper>
);

const FieldConsultantNode: React.FC<NodeProps<NodeData>> = ({ data }) => (
  <Paper 
    elevation={3}
    sx={{ 
      p: 2.5, 
      minWidth: 220,
      border: 2, 
      borderColor: '#10b981',
      backgroundColor: 'background.paper',
      borderRadius: 3,
      boxShadow: '0 6px 24px rgba(16, 185, 129, 0.15)'
    }}
  >
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Engineering sx={{ color: '#10b981', fontSize: 20 }} />
        <Typography variant="body1" fontWeight="bold" color="success.main">
          {data.label}
        </Typography>
      </Stack>
      <Stack spacing={1}>
        <Typography variant="body2" color="text.primary" fontWeight="medium">
          {data.properties.certification_level} • {data.properties.region}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Work sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {data.properties.years_experience} years experience
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <MonetizationOn sx={{ fontSize: 14, color: 'success.main' }} />
          <Typography variant="body2" color="text.secondary">
            ${data.properties.hourly_rate}/hour
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Star sx={{ fontSize: 14, color: 'warning.main' }} />
          <Typography variant="body2" color="text.secondary">
            {data.properties.rating}/5.0
          </Typography>
        </Stack>
        {data.properties.specialization && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Specialization:
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
              {data.properties.specialization.slice(0, 2).map((spec: string, index: number) => (
                <Chip 
                  key={index} 
                  label={spec} 
                  size="small" 
                  variant="outlined"
                  color="success"
                  sx={{ fontSize: '0.65rem', height: 18 }}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Stack>
  </Paper>
);

const ProductNode: React.FC<NodeProps<NodeData>> = ({ data }) => (
  <Paper 
    elevation={3}
    sx={{ 
      p: 2.5, 
      minWidth: 220,
      border: 2, 
      borderColor: '#06b6d4',
      backgroundColor: 'background.paper',
      borderRadius: 3,
      boxShadow: '0 6px 24px rgba(6, 182, 212, 0.15)'
    }}
  >
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Category sx={{ color: '#06b6d4', fontSize: 20 }} />
        <Typography variant="body1" fontWeight="bold" color="info.main">
          {data.label}
        </Typography>
      </Stack>
      <Stack spacing={1}>
        <Typography variant="body2" color="text.primary" fontWeight="medium">
          {data.properties.category} • {data.properties.vendor}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Assessment sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {data.properties.target_market}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <MonetizationOn sx={{ fontSize: 14, color: 'warning.main' }} />
          <Typography variant="body2" color="text.secondary">
            {data.properties.price_range}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <TrendingUp sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {data.properties.deployment_type}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Star sx={{ fontSize: 14, color: 'warning.main' }} />
          <Typography variant="body2" color="text.secondary">
            {data.properties.rating}/5.0 rating
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  </Paper>
);

const nodeTypes = {
  company: CompanyNode,
  consultant: ConsultantNode,
  field_consultant: FieldConsultantNode,
  product: ProductNode,
};

const DRAWER_WIDTH = 72;
const RIGHT_DRAWER_WIDTH = 420;

const ConsultingDashboard: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedNavItem, setSelectedNavItem] = useState<string>('graph');
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, type: 'bot', text: 'Welcome to Consulting Business Analytics! I can help you explore consultant hierarchies, field specialist assignments, product recommendations, and client relationships. What would you like to analyze?', timestamp: new Date() }
  ]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  
  // Filter states
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [expertiseFilter, setExpertiseFilter] = useState<string>('all');
  const [seniorityFilter, setSeniorityFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<number[]>([0, 5]);
  const [experienceFilter, setExperienceFilter] = useState<number[]>([0, 20]);
  const [revenueFilter, setRevenueFilter] = useState<number[]>([0, 1500]);
  
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });
  const [filterOptions, setFilterOptions] = useState<any>({});
  const [analytics, setAnalytics] = useState<any>(null);

  const navItems = [
    { id: 'dashboard', icon: <Dashboard />, label: 'Dashboard' },
    { id: 'graph', icon: <AccountTree />, label: 'Business Graph' },
    { id: 'search', icon: <Search />, label: 'Search' },
    { id: 'analytics', icon: <Timeline />, label: 'Analytics' },
    { id: 'settings', icon: <Settings />, label: 'Settings' },
    { id: 'help', icon: <Help />, label: 'Help' }
  ];

  const consultingQuestions = [
    "Show me the senior consultant hierarchy and their field teams",
    "Which products are recommended most by our top consultants?",
    "Find all available consultants with strategy expertise",
    "Show companies in the technology sector and their coverage",
    "Which field consultants have implementation specialization?",
    "Display the relationship between consultants and their product recommendations",
    "Show me high-performing consultants by rating and experience",
    "Find all enterprise-focused products and their adoption",
    "Which consultants cover the most high-revenue companies?",
    "Show field consultant distribution across different regions"
  ];

  // Helper function for showing notifications
  const showSnackbar = useCallback((message: string, severity: AlertColor = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsDataLoading(true);
    try {
      // Load filter options first
      const filters = await apiService.getFilters();
      setFilterOptions(filters);
      
      // Load analytics data
      const analyticsData = await apiService.getAnalytics();
      setAnalytics(analyticsData);
      
      // Load main entities
      await loadGraphData();
      
      showSnackbar('Consulting business data loaded successfully!', 'success');
    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar('Error connecting to consulting API. Please check if the server is running.', 'error');
    } finally {
      setIsDataLoading(false);
    }
  };

  const loadGraphData = async () => {
    try {
      const [companies, consultants, fieldConsultants, products] = await Promise.all([
        apiService.getCompanies({ limit: 10 }),
        apiService.getConsultants({ limit: 8 }),
        apiService.getFieldConsultants({ limit: 6 }),
        apiService.getProducts({ limit: 8 })
      ]);

      // Create nodes with proper hierarchy positioning
      const newNodes: Node<NodeData>[] = [];
      const newEdges: Edge[] = [];
      
      let yOffset = 50;
      const levelSpacing = 200;
      const nodeSpacing = 250;
      
      // Level 1: Consultants (top level)
      consultants.forEach((consultant: ApiConsultant, index: number) => {
        newNodes.push({
          id: consultant.id,
          type: 'consultant',
          position: { x: 50 + (index * nodeSpacing), y: yOffset },
          data: {
            label: consultant.name,
            entityType: 'consultant',
            properties: consultant
          }
        });
      });
      
      // Level 2: Field Consultants
      yOffset += levelSpacing;
      fieldConsultants.forEach((fc: ApiFieldConsultant, index: number) => {
        newNodes.push({
          id: fc.id,
          type: 'field_consultant',
          position: { x: 100 + (index * nodeSpacing), y: yOffset },
          data: {
            label: fc.name,
            entityType: 'field_consultant',
            properties: fc
          }
        });
        
        // Connect to a consultant (simulated management relationship)
        if (consultants[index % consultants.length]) {
          newEdges.push({
            id: `manages_${consultants[index % consultants.length].id}_${fc.id}`,
            source: consultants[index % consultants.length].id,
            target: fc.id,
            type: 'smoothstep',
            label: 'MANAGES',
            style: { stroke: '#f59e0b', strokeWidth: 2 },
            labelStyle: { fill: '#cbd5e1', fontSize: '11px', fontWeight: 'bold' },
          });
        }
      });
      
      // Level 3: Products
      yOffset += levelSpacing;
      products.forEach((product: ApiProduct, index: number) => {
        newNodes.push({
          id: product.id,
          type: 'product',
          position: { x: 150 + (index * nodeSpacing), y: yOffset },
          data: {
            label: product.name,
            entityType: 'product',
            properties: product
          }
        });
        
        // Connect products to consultants (recommendations)
        const consultantIndex = index % consultants.length;
        if (consultants[consultantIndex]) {
          newEdges.push({
            id: `recommends_${consultants[consultantIndex].id}_${product.id}`,
            source: consultants[consultantIndex].id,
            target: product.id,
            type: 'smoothstep',
            label: 'RECOMMENDS',
            style: { stroke: '#10b981', strokeWidth: 2 },
            labelStyle: { fill: '#cbd5e1', fontSize: '11px', fontWeight: 'bold' },
          });
        }
      });
      
      // Level 4: Companies (clients)
      yOffset += levelSpacing;
      companies.forEach((company: ApiCompany, index: number) => {
        newNodes.push({
          id: company.id,
          type: 'company',
          position: { x: 200 + (index * nodeSpacing), y: yOffset },
          data: {
            label: company.name,
            entityType: 'company',
            properties: company
          }
        });
        
        // Connect companies to consultants (coverage)
        const consultantIndex = index % consultants.length;
        if (consultants[consultantIndex]) {
          newEdges.push({
            id: `covers_${consultants[consultantIndex].id}_${company.id}`,
            source: consultants[consultantIndex].id,
            target: company.id,
            type: 'smoothstep',
            label: 'COVERS',
            style: { stroke: '#2563eb', strokeWidth: 3 },
            labelStyle: { fill: '#cbd5e1', fontSize: '11px', fontWeight: 'bold' },
          });
        }
        
        // Connect some companies to products (ownership)
        if (products[index % products.length]) {
          newEdges.push({
            id: `owns_${company.id}_${products[index % products.length].id}`,
            source: company.id,
            target: products[index % products.length].id,
            type: 'smoothstep',
            label: 'OWNS',
            style: { stroke: '#06b6d4', strokeWidth: 2, strokeDasharray: '5,5' },
            labelStyle: { fill: '#cbd5e1', fontSize: '10px' },
          });
        }
      });
      
      setNodes(newNodes);
      setEdges(newEdges);
      
    } catch (error) {
      console.error('Error loading graph data:', error);
      showSnackbar('Error loading graph data', 'error');
    }
  };

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const generateConsultingResponse = (userMessage: string): ChatMessage => {
    const lower = userMessage.toLowerCase();
    const messageId = chatMessages.length + 2;
    
    if (lower.includes('hierarchy') || lower.includes('team') || lower.includes('consultant')) {
      return {
        id: messageId,
        type: 'bot',
        text: `I'll show you the consulting hierarchy. This displays senior consultants at the top, their field consultant teams below, the products they recommend, and the client companies they serve. The visualization shows the complete business ecosystem.`,
        timestamp: new Date(),
        actions: [
          { label: "Filter by seniority", prompt: "Show me only partner and principal level consultants" },
          { label: "Show expertise", prompt: "Group consultants by their expertise areas" },
          { label: "Team performance", prompt: "Show performance ratings across all teams" }
        ]
      };
    } else if (lower.includes('product') || lower.includes('recommend')) {
      return {
        id: messageId,
        type: 'bot',
        text: `I'll analyze product recommendations and ownership patterns. This shows which consultants recommend which products, and which companies currently own or use these products. You can see adoption patterns and consultant preferences.`,
        timestamp: new Date(),
        actions: [
          { label: "Product ratings", prompt: "Show product ratings and reviews from consultants" },
          { label: "Adoption analysis", prompt: "Analyze product adoption by company size and industry" },
          { label: "Revenue impact", prompt: "Show products with highest revenue impact" }
        ]
      };
    } else if (lower.includes('company') || lower.includes('client') || lower.includes('coverage')) {
      return {
        id: messageId,
        type: 'bot',
        text: `I'll display client coverage relationships. This shows which consultants cover which companies, including industry specializations, contract values, and satisfaction scores. You can see the consultant-client relationship matrix.`,
        timestamp: new Date(),
        actions: [
          { label: "Industry focus", prompt: "Show consultant coverage by industry vertical" },
          { label: "Revenue analysis", prompt: "Analyze client revenue and consultant assignments" },
          { label: "Satisfaction scores", prompt: "Show client satisfaction ratings by consultant" }
        ]
      };
    } else {
      return {
        id: messageId,
        type: 'bot',
        text: `I can help you explore our consulting business structure. I can show consultant hierarchies, field specialist assignments, product recommendations, client coverage, and business performance metrics. What aspect interests you most?`,
        timestamp: new Date(),
        actions: [
          { label: "Show full hierarchy", prompt: "Display the complete consultant hierarchy and team structure" },
          { label: "Analyze performance", prompt: "Show performance metrics across all consultants and teams" },
          { label: "Client relationships", prompt: "Analyze client coverage and relationship strengths" }
        ]
      };
    }
  };

  const handleSendMessage = () => {
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
      const response = generateConsultingResponse(currentMessage);
      setChatMessages(prev => [...prev, response]);
      setIsLoading(false);
      
      showSnackbar('Analysis complete!', 'success');
    }, 1500);
    
    setCurrentMessage('');
  };

  const clearMessages = () => {
    setChatMessages([
      { id: 1, type: 'bot', text: 'Chat cleared. How can I help you analyze the consulting business ecosystem?', timestamp: new Date() }
    ]);
  };

  const applyFilters = async () => {
    setIsDataLoading(true);
    try {
      const filters: any = {};
      
      if (industryFilter !== 'all') filters.industry = industryFilter;
      if (expertiseFilter !== 'all') filters.expertise = expertiseFilter;
      if (seniorityFilter !== 'all') filters.seniority = seniorityFilter;
      if (availabilityFilter !== 'all') filters.availability = availabilityFilter;
      if (ratingFilter[0] > 0) filters.min_rating = ratingFilter[0];
      if (ratingFilter[1] < 5) filters.max_rating = ratingFilter[1];
      if (experienceFilter[0] > 0) filters.min_experience = experienceFilter[0];
      if (experienceFilter[1] < 20) filters.max_experience = experienceFilter[1];

      await loadGraphData();
      showSnackbar('Consulting business filters applied successfully!', 'success');
    } catch (error) {
      showSnackbar('Error applying filters', 'error');
    } finally {
      setIsDataLoading(false);
    }
  };

  const clearFilters = () => {
    setIndustryFilter('all');
    setExpertiseFilter('all');
    setSeniorityFilter('all');
    setAvailabilityFilter('all');
    setRatingFilter([0, 5]);
    setExperienceFilter([0, 20]);
    setRevenueFilter([0, 1500]);
    showSnackbar('All filters cleared', 'success');
  };

  const refreshData = async () => {
    await loadAllData();
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <ThemeProvider theme={consultingTheme}>
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
                  Consulting Business Graph
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Consultant hierarchy • Field specialists • Product portfolio • Client coverage
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {analytics && (
                  <Box sx={{ display: 'flex', gap: 2, mr: 2 }}>
                    <Tooltip title="Total Companies">
                      <Chip 
                        icon={<Business />} 
                        label={analytics.counts?.companies || 0} 
                        size="small" 
                        color="primary"
                      />
                    </Tooltip>
                    <Tooltip title="Consultants">
                      <Chip 
                        icon={<Person />} 
                        label={analytics.counts?.consultants || 0} 
                        size="small" 
                        color="secondary"
                      />
                    </Tooltip>
                    <Tooltip title="Field Consultants">
                      <Chip 
                        icon={<Engineering />} 
                        label={analytics.counts?.field_consultants || 0} 
                        size="small" 
                        color="success"
                      />
                    </Tooltip>
                    <Tooltip title="Products">
                      <Chip 
                        icon={<Category />} 
                        label={analytics.counts?.products || 0} 
                        size="small" 
                        color="info"
                      />
                    </Tooltip>
                  </Box>
                )}
                <Tooltip title="Refresh Data">
                  <IconButton 
                    color="inherit" 
                    onClick={refreshData}
                    disabled={isDataLoading}
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Notifications">
                  <IconButton color="inherit">
                    <Badge badgeContent={3} color="secondary">
                      <Notifications />
                    </Badge>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Profile">
                  <IconButton color="inherit">
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                      CB
                    </Avatar>
                  </IconButton>
                </Tooltip>
              </Box>
            </Toolbar>
          </AppBar>

          {/* Main Graph Area */}
          <Box sx={{ flexGrow: 1, display: 'flex', position: 'relative' }}>
            <StyledReactFlow sx={{ flexGrow: 1 }}>
              {isDataLoading ? (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100%',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  <CircularProgress size={60} />
                  <Typography variant="h6" color="text.secondary">
                    Loading consulting business data...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Connecting to API and building graph hierarchy
                  </Typography>
                </Box>
              ) : (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  fitView
                  attributionPosition="bottom-left"
                >
                  <Controls />
                  <MiniMap 
                    nodeColor={(node) => {
                      switch (node.type) {
                        case 'consultant': return '#f59e0b';
                        case 'field_consultant': return '#10b981';
                        case 'product': return '#06b6d4';
                        case 'company': return '#2563eb';
                        default: return '#64748b';
                      }
                    }}
                  />
                  <Background color="#475569" gap={20} />
                </ReactFlow>
              )}
            </StyledReactFlow>

            {/* Right Side Panel */}
            <Paper
              sx={{
                width: RIGHT_DRAWER_WIDTH,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 0,
                borderLeft: '1px solid #334155',
              }}
            >
              <Box sx={{ borderBottom: '1px solid #334155' }}>
                <Tabs 
                  value={activeTab} 
                  onChange={(_, newValue) => setActiveTab(newValue)}
                  variant="fullWidth"
                >
                  <Tab icon={<FilterList />} label="Filters" />
                  <Tab icon={<SmartToy />} label="AI Assistant" />
                </Tabs>
              </Box>

              {activeTab === 0 && (
                <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilterList /> Business Filters
                  </Typography>
                  
                  <Stack spacing={3}>
                    {/* Industry Filter */}
                    <FormControl fullWidth size="small">
                      <InputLabel>Industry</InputLabel>
                      <Select
                        value={industryFilter}
                        onChange={(e) => setIndustryFilter(e.target.value)}
                        label="Industry"
                      >
                        <MenuItem value="all">All Industries</MenuItem>
                        {filterOptions.industries?.map((industry: string) => (
                          <MenuItem key={industry} value={industry}>{industry}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Expertise Filter */}
                    <FormControl fullWidth size="small">
                      <InputLabel>Expertise</InputLabel>
                      <Select
                        value={expertiseFilter}
                        onChange={(e) => setExpertiseFilter(e.target.value)}
                        label="Expertise"
                      >
                        <MenuItem value="all">All Expertise Areas</MenuItem>
                        {filterOptions.expertise?.map((exp: string) => (
                          <MenuItem key={exp} value={exp}>{exp}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Seniority Filter */}
                    <FormControl fullWidth size="small">
                      <InputLabel>Seniority Level</InputLabel>
                      <Select
                        value={seniorityFilter}
                        onChange={(e) => setSeniorityFilter(e.target.value)}
                        label="Seniority Level"
                      >
                        <MenuItem value="all">All Levels</MenuItem>
                        <MenuItem value="Partner">Partner</MenuItem>
                        <MenuItem value="Principal">Principal</MenuItem>
                        <MenuItem value="Senior">Senior</MenuItem>
                        <MenuItem value="Junior">Junior</MenuItem>
                      </Select>
                    </FormControl>

                    {/* Availability Filter */}
                    <FormControl fullWidth size="small">
                      <InputLabel>Availability</InputLabel>
                      <Select
                        value={availabilityFilter}
                        onChange={(e) => setAvailabilityFilter(e.target.value)}
                        label="Availability"
                      >
                        <MenuItem value="all">All Availability</MenuItem>
                        <MenuItem value="Available">Available</MenuItem>
                        <MenuItem value="Busy">Busy</MenuItem>
                        <MenuItem value="Unavailable">Unavailable</MenuItem>
                      </Select>
                    </FormControl>

                    {/* Rating Range */}
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        Rating Range: {ratingFilter[0]} - {ratingFilter[1]}
                      </Typography>
                      <Slider
                        value={ratingFilter}
                        onChange={(_, newValue) => setRatingFilter(newValue as number[])}
                        valueLabelDisplay="auto"
                        min={0}
                        max={5}
                        step={0.1}
                        marks={[
                          { value: 0, label: '0' },
                          { value: 2.5, label: '2.5' },
                          { value: 5, label: '5' },
                        ]}
                      />
                    </Box>

                    {/* Experience Range */}
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        Experience: {experienceFilter[0]} - {experienceFilter[1]} years
                      </Typography>
                      <Slider
                        value={experienceFilter}
                        onChange={(_, newValue) => setExperienceFilter(newValue as number[])}
                        valueLabelDisplay="auto"
                        min={0}
                        max={20}
                        marks={[
                          { value: 0, label: '0' },
                          { value: 10, label: '10' },
                          { value: 20, label: '20+' },
                        ]}
                      />
                    </Box>

                    {/* Revenue Range */}
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        Company Revenue: ${revenueFilter[0]}M - ${revenueFilter[1]}M
                      </Typography>
                      <Slider
                        value={revenueFilter}
                        onChange={(_, newValue) => setRevenueFilter(newValue as number[])}
                        valueLabelDisplay="auto"
                        min={0}
                        max={1500}
                        step={50}
                        marks={[
                          { value: 0, label: '$0M' },
                          { value: 750, label: '$750M' },
                          { value: 1500, label: '$1.5B' },
                        ]}
                      />
                    </Box>

                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        onClick={applyFilters}
                        startIcon={<FilterList />}
                        fullWidth
                        disabled={isDataLoading}
                      >
                        Apply Filters
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={clearFilters}
                        startIcon={<Clear />}
                        fullWidth
                      >
                        Clear All
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              )}

              {activeTab === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
                    {chatMessages.map((message) => (
                      <Box
                        key={message.id}
                        sx={{
                          mb: 2,
                          display: 'flex',
                          justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Paper
                          elevation={1}
                          sx={{
                            p: 2,
                            maxWidth: '85%',
                            bgcolor: message.type === 'user' ? 'primary.main' : 'background.paper',
                            color: message.type === 'user' ? 'primary.contrastText' : 'text.primary',
                          }}
                        >
                          <Typography variant="body2">
                            {message.text}
                          </Typography>
                          {message.actions && (
                            <Stack spacing={1} sx={{ mt: 2 }}>
                              {message.actions.map((action, index) => (
                                <Button
                                  key={index}
                                  variant="outlined"
                                  size="small"
                                  onClick={() => setCurrentMessage(action.prompt)}
                                  sx={{ justifyContent: 'flex-start' }}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </Stack>
                          )}
                        </Paper>
                      </Box>
                    ))}
                    {isLoading && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                        <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.paper' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={16} />
                            <Typography variant="body2">
                              Analyzing consulting data...
                            </Typography>
                          </Box>
                        </Paper>
                      </Box>
                    )}
                    <div ref={messagesEndRef} />
                  </Box>

                  {/* Quick Questions */}
                  <Box sx={{ p: 2, borderTop: '1px solid #334155' }}>
                    <Typography variant="body2" gutterBottom color="text.secondary">
                      Quick questions:
                    </Typography>
                    <Stack spacing={1} sx={{ mb: 2, maxHeight: 120, overflowY: 'auto' }}>
                      {consultingQuestions.slice(0, 3).map((question, index) => (
                        <Button
                          key={index}
                          variant="outlined"
                          size="small"
                          onClick={() => setCurrentMessage(question)}
                          sx={{ 
                            justifyContent: 'flex-start', 
                            textAlign: 'left',
                            textTransform: 'none',
                            fontSize: '0.75rem'
                          }}
                        >
                          {question}
                        </Button>
                      ))}
                    </Stack>

                    {/* Message Input */}
                    <Stack direction="row" spacing={1}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Ask about consulting business..."
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        disabled={isLoading}
                      />
                      <Button
                        variant="contained"
                        onClick={handleSendMessage}
                        disabled={isLoading || !currentMessage.trim()}
                        sx={{ minWidth: 'auto', px: 2 }}
                      >
                        <Send />
                      </Button>
                    </Stack>
                    
                    <Button
                      variant="text"
                      size="small"
                      onClick={clearMessages}
                      sx={{ mt: 1, fontSize: '0.75rem' }}
                    >
                      Clear Chat
                    </Button>
                  </Box>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default ConsultingDashboard;