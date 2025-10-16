// components/ManagerRosterButton.tsx
import React, { useState } from 'react';
import { 
  IconButton, 
  Tooltip, 
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Alert,
  Snackbar,
  Chip,
  Card,
  CardContent,
  Tabs,
  Tab
} from '@mui/material';

import { 
  Download,
  Visibility,
  TableChart,
  Close,
  CheckCircle,
  TrendingUp,
  Person,
  Business,
  AccountBalance,
  ShowChart,
  Recommend,
  CompareArrows
} from '@mui/icons-material';

// Define interfaces for both data types with lowercase fields
interface ManagerViewData {
  company_id: string;
  company_name: string;
  consultant_name: string;
  manager_name: string;
  multi_mandate_manager: string;
  est_market_value: number;
  asset_class: string;
  universe_name: string;
  recommended_product: string;
}

interface RecommendationsViewData {
  company_id: string;
  consultant_name: string;
  manager_name: string;
  multi_mandate_manager: string; // "Y" or "N"
  incumbent_product: string;
  jpm_recommended_product: string;
  asset_class: string;
  universe_name: string;
  universe_recent_score: number;
  num_institutional_clients_for_product: number;
  batting_average_1_year_jpm_vs_competitor: string;
  returns_1_year_jpm_vs_competitor: string;
  standard_deviation_1_year_jpm_vs_competitor: string;
  batting_average_3_year_jpm_vs_competitor: string;
  returns_3_year_jpm_vs_competitor: string;
  standard_deviation_3_year_jpm_vs_competitor: string;
  batting_average_5_year_jpm_vs_competitor: string;
  returns_5_year_jpm_vs_competitor: string;
  standard_deviation_5_year_jpm_vs_competitor: string;
}

interface ManagerRosterResponse {
  success: boolean;
  company_id: string;
  company_name: string;
  manager_view: ManagerViewData[];
  recommendations_view: RecommendationsViewData[];
  manager_view_count: number;
  recommendations_view_count: number;
}

interface ManagerRosterButtonProps {
  companyId: string;
  companyName: string;
  isDarkTheme?: boolean;
}

export const ManagerRosterButton: React.FC<ManagerRosterButtonProps> = ({ 
  companyId, 
  companyName,
  isDarkTheme = true 
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [managerData, setManagerData] = useState<ManagerViewData[]>([]);
  const [recommendationsData, setRecommendationsData] = useState<RecommendationsViewData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const fetchManagerRoster = async (): Promise<ManagerRosterResponse> => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(
        `${baseUrl}/api/v1/complete/manager-roster/${companyId}?format=table`
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('Invalid response from server');
      }
      
      return result;
      
    } catch (err) {
      console.error('Failed to fetch manager roster:', err);
      throw err;
    }
  };

  const handleViewTable = async () => {
    handleMenuClose();
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchManagerRoster();
      setManagerData(data.manager_view || []);
      setRecommendationsData(data.recommendations_view || []);
      setShowTableDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch manager roster');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (format: 'excel' | 'csv') => {
    handleMenuClose();
    setIsLoading(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(
        `${baseUrl}/api/v1/complete/manager-roster/${companyId}?format=${format}`
      );
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `manager_roster_${companyId}_${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      setSuccessMessage(`Manager roster downloaded: ${filename}`);
      setShowSuccessSnackbar(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getReturnColor = (value: number) => {
    if (value >= 15) return '#10b981';
    if (value >= 10) return '#3b82f6';
    if (value >= 5) return '#f59e0b';
    return '#ef4444';
  };

  // Summary card for Manager View
  const renderManagerViewSummary = () => {
    const uniqueManagers = new Set(managerData.map(d => d.manager_name));
    const uniqueConsultants = new Set(managerData.map(d => d.consultant_name));
    const totalValue = managerData.reduce((sum, d) => sum + d.est_market_value, 0);
    
    return (
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ 
          flex: 1, 
          minWidth: 180,
          bgcolor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Person sx={{ color: '#3b82f6', fontSize: '1.2rem' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                Consultants
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ color: '#3b82f6', fontWeight: 'bold' }}>
              {uniqueConsultants.size}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ 
          flex: 1, 
          minWidth: 180,
          bgcolor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AccountBalance sx={{ color: '#3b82f6', fontSize: '1.2rem' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                Managers
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ color: '#3b82f6', fontWeight: 'bold' }}>
              {uniqueManagers.size}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ 
          flex: 1, 
          minWidth: 180,
          bgcolor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Business sx={{ color: '#3b82f6', fontSize: '1.2rem' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                Total Market Value
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '1.3rem' }}>
              {formatCurrency(totalValue)}
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ 
          flex: 1, 
          minWidth: 180,
          bgcolor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ShowChart sx={{ color: '#3b82f6', fontSize: '1.2rem' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                Multi-Mandate Managers
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ color: '#3b82f6', fontWeight: 'bold' }}>
              {managerData.filter(d => d.multi_mandate_manager === 'Y').length}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // Summary card for Recommendations View
  const renderRecommendationsViewSummary = () => {
    const uniqueProducts = new Set(recommendationsData.map(d => d.jpm_recommended_product));
    const uniqueConsultants = new Set(recommendationsData.map(d => d.consultant_name));
    const totalClients = recommendationsData.reduce((sum, d) => sum + d.num_institutional_clients_for_product, 0);
    const avgUniverse = recommendationsData.length > 0 
      ? recommendationsData.reduce((sum, d) => sum + d.universe_recent_score, 0) / recommendationsData.length 
      : 0;
    
    return (
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ 
          flex: 1, 
          minWidth: 180,
          bgcolor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Person sx={{ color: '#3b82f6', fontSize: '1.2rem' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                Consultants
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ color: '#3b82f6', fontWeight: 'bold' }}>
              {uniqueConsultants.size}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ 
          flex: 1, 
          minWidth: 180,
          bgcolor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingUp sx={{ color: '#3b82f6', fontSize: '1.2rem' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                JPM Products
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ color: '#3b82f6', fontWeight: 'bold' }}>
              {uniqueProducts.size}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ 
          flex: 1, 
          minWidth: 180,
          bgcolor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Business sx={{ color: '#3b82f6', fontSize: '1.2rem' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                Institutional Clients
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '1.3rem' }}>
              {totalClients}
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ 
          flex: 1, 
          minWidth: 180,
          bgcolor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ShowChart sx={{ color: '#3b82f6', fontSize: '1.2rem' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                Avg Universe Score
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ color: '#3b82f6', fontWeight: 'bold' }}>
              {avgUniverse.toFixed(1)}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // Manager View Table
  const renderManagerViewTable = () => (
    <TableContainer 
      component={Paper} 
      sx={{ 
        bgcolor: isDarkTheme ? 'rgba(30, 30, 30, 0.5)' : 'rgba(255, 255, 255, 0.5)',
        maxHeight: 500,
        border: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)'}`
      }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              consultant_name
            </TableCell>
            <TableCell sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              manager_name
            </TableCell>
            <TableCell sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              multi_mandate_manager
            </TableCell>
            <TableCell align="right" sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246,0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              est_market_value
            </TableCell>
            <TableCell sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              asset_class
            </TableCell>
            <TableCell sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              universe_name
            </TableCell>
            <TableCell sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              recommended_product
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {managerData.map((row, index) => (
            <TableRow 
              key={index}
              sx={{ 
                '&:hover': { 
                  bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' 
                }
              }}
            >
              <TableCell sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Person sx={{ fontSize: '0.9rem', color: '#3b82f6' }} />
                  {row.consultant_name}
                </Box>
              </TableCell>
              <TableCell sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem'
              }}>
                <Chip 
                  label={row.manager_name}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(99, 102, 241, 0.2)',
                    color: '#6366f1',
                    fontSize: '0.7rem',
                    height: 20
                  }}
                />
              </TableCell>
              <TableCell sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem'
              }}>
                <Chip 
                  label={row.multi_mandate_manager === 'Y' ? 'Yes' : 'No'}
                  size="small"
                  sx={{
                    bgcolor: row.multi_mandate_manager === 'Y' 
                      ? 'rgba(16, 185, 129, 0.2)' 
                      : 'rgba(239, 68, 68, 0.2)',
                    color: row.multi_mandate_manager === 'Y' ? '#10b981' : '#ef4444',
                    fontSize: '0.7rem',
                    height: 20
                  }}
                />
              </TableCell>
              <TableCell align="right" sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontFamily: 'monospace',
                fontWeight: 'medium',
                fontSize: '0.8rem'
              }}>
                {formatCurrency(row.est_market_value)}
              </TableCell>
              <TableCell sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem'
              }}>
                <Chip 
                  label={row.asset_class}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    fontSize: '0.7rem',
                    height: 20
                  }}
                />
              </TableCell>
              <TableCell sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem',
                maxWidth: 200
              }}>
                {row.universe_name}
              </TableCell>
              <TableCell sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem'
              }}>
                {row.recommended_product ? (
                  <Chip 
                    label={row.recommended_product}
                    size="small"
                    icon={<Recommend sx={{ fontSize: '0.8rem' }} />}
                    sx={{
                      bgcolor: 'rgba(245, 158, 11, 0.2)',
                      color: '#f59e0b',
                      fontSize: '0.7rem',
                      height: 20,
                      '& .MuiChip-icon': {
                        color: '#f59e0b'
                      }
                    }}
                  />
                ) : (
                  'N/A'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Recommendations View Table
  const renderRecommendationsViewTable = () => (
    <TableContainer 
      component={Paper} 
      sx={{ 
        bgcolor: isDarkTheme ? 'rgba(30, 30, 30, 0.5)' : 'rgba(255, 255, 255, 0.5)',
        maxHeight: 500,
        border: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)'}`,
        overflowX: 'auto'
      }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              consultant_name
            </TableCell>
            <TableCell sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              manager_name
            </TableCell>
            <TableCell sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              multi_mandate_manager
            </TableCell>
            <TableCell sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              incumbent_product
            </TableCell>
            <TableCell sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              jpm_recommended_product
            </TableCell>
            <TableCell sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246,0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              asset_class
            </TableCell>
            <TableCell sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              universe_name
            </TableCell>
            <TableCell sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              universe_recent_score
            </TableCell>
            <TableCell sx={{ 
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              num_institutional_clients_for_product
            </TableCell>
            {/* Performance metrics - 1 Year */}
            <TableCell colSpan={3} align="center" sx={{ 
              bgcolor: isDarkTheme ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem',
              borderLeft: '2px solid rgba(245, 158, 11, 0.3)',
              borderRight: '2px solid rgba(245, 158, 11, 0.3)'
            }}>
              1 Year Comparison
            </TableCell>
            {/* Performance metrics - 3 Year */}
            <TableCell colSpan={3} align="center" sx={{ 
              bgcolor: isDarkTheme ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem',
              borderLeft: '2px solid rgba(99, 102, 241, 0.3)',
              borderRight: '2px solid rgba(99, 102, 241, 0.3)'
            }}>
              3 Year Comparison
            </TableCell>
            {/* Performance metrics - 5 Year */}
            <TableCell colSpan={3} align="center" sx={{ 
              bgcolor: isDarkTheme ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.75rem',
              borderLeft: '2px solid rgba(16, 185, 129, 0.3)',
              borderRight: '2px solid rgba(16, 185, 129, 0.3)'
            }}>
              5 Year Comparison
            </TableCell>
          </TableRow>
          {/* Subheader row for performance metrics */}
          <TableRow>
            {/* First 10 columns remain empty */}
            {[...Array(9)].map((_, i) => (
              <TableCell 
                key={i}
                sx={{ 
                  bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                  padding: '4px 16px',
                  borderBottom: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)'}`
                }}
              />
            ))}
            
            {/* 1 Year metrics */}
            <TableCell align="center" sx={{ 
              bgcolor: isDarkTheme ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.7rem',
              borderLeft: '2px solid rgba(245, 158, 11, 0.3)'
            }}>
              batting_average_1_year_jpm_vs_competitor
            </TableCell>
            <TableCell align="center" sx={{ 
              bgcolor: isDarkTheme ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.7rem'
            }}>
              returns_1_year_jpm_vs_competitor
            </TableCell>
            <TableCell align="center" sx={{ 
              bgcolor: isDarkTheme ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.7rem',
              borderRight: '2px solid rgba(245, 158, 11, 0.3)'
            }}>
              standard_deviation_1_year_jpm_vs_competitor
            </TableCell>
            
            {/* 3 Year metrics */}
            <TableCell align="center" sx={{ 
              bgcolor: isDarkTheme ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.7rem',
              borderLeft: '2px solid rgba(99, 102, 241, 0.3)'
            }}>
              batting_average_3_year_jpm_vs_competitor
            </TableCell>
            <TableCell align="center" sx={{ 
              bgcolor: isDarkTheme ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.7rem'
            }}>
              returns_3_year_jpm_vs_competitor
            </TableCell>
            <TableCell align="center" sx={{ 
              bgcolor: isDarkTheme ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.7rem',
              borderRight: '2px solid rgba(99, 102, 241, 0.3)'
            }}>
              standard_deviation_3_year_jpm_vs_competitor
            </TableCell>
            
            {/* 5 Year metrics */}
            <TableCell align="center" sx={{ 
              bgcolor: isDarkTheme ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.7rem',
              borderLeft: '2px solid rgba(16, 185, 129, 0.3)'
            }}>
              batting_average_5_year_jpm_vs_competitor
            </TableCell>
            <TableCell align="center" sx={{ 
              bgcolor: isDarkTheme ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.7rem'
            }}>
              returns_5_year_jpm_vs_competitor
            </TableCell>
            <TableCell align="center" sx={{ 
              bgcolor: isDarkTheme ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
              color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
              fontWeight: 'bold',
              fontSize: '0.7rem',
              borderRight: '2px solid rgba(16, 185, 129, 0.3)'
            }}>
              standard_deviation_5_year_jpm_vs_competitor
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {recommendationsData.map((row, index) => (
            <TableRow 
              key={index}
              sx={{ 
                '&:hover': { 
                  bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' 
                }
              }}
            >
              {/* Basic information columns */}
              <TableCell sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Person sx={{ fontSize: '0.9rem', color: '#3b82f6' }} />
                  {row.consultant_name}
                </Box>
              </TableCell>
              <TableCell sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem'
              }}>
                <Chip 
                  label={row.manager_name}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(99, 102, 241, 0.2)',
                    color: '#6366f1',
                    fontSize: '0.7rem',
                    height: 20
                  }}
                />
              </TableCell>
              <TableCell sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem'
              }}>
                <Chip 
                  label={row.multi_mandate_manager === 'Y' ? 'Yes' : 'No'}
                  size="small"
                  sx={{
                    bgcolor: row.multi_mandate_manager === 'Y' 
                      ? 'rgba(16, 185, 129, 0.2)' 
                      : 'rgba(239, 68, 68, 0.2)',
                    color: row.multi_mandate_manager === 'Y' ? '#10b981' : '#ef4444',
                    fontSize: '0.7rem',
                    height: 20
                  }}
                />
              </TableCell>
              <TableCell sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem',
                maxWidth: 180
              }}>
                {row.incumbent_product}
              </TableCell>
              <TableCell sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem',
                maxWidth: 180
              }}>
                <Chip 
                  label={row.jpm_recommended_product}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(245, 158, 11, 0.2)',
                    color: '#f59e0b',
                    fontSize: '0.7rem',
                    height: 20
                  }}
                />
              </TableCell>
              <TableCell sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem'
              }}>
                <Chip 
                  label={row.asset_class}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    fontSize: '0.7rem',
                    height: 20
                  }}
                />
              </TableCell>
              <TableCell sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem',
                maxWidth: 180
              }}>
                {row.universe_name}
              </TableCell>
              <TableCell align="center" sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem',
                fontWeight: 'medium'
              }}>
                {row.universe_recent_score}
              </TableCell>
              <TableCell align="center" sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem',
                fontWeight: 'medium'
              }}>
                {row.num_institutional_clients_for_product}
              </TableCell>

              {/* 1 Year Performance Metrics */}
              <TableCell align="center" sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem',
                borderLeft: '2px solid rgba(245, 158, 11, 0.3)'
              }}>
                <Chip
                  label={row.batting_average_1_year_jpm_vs_competitor}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontSize: '0.7rem',
                    height: 20,
                    fontWeight: 'bold',
                    minWidth: 80
                  }}
                />
              </TableCell>
              <TableCell align="center" sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem'
              }}>
                <Chip
                  label={row.returns_1_year_jpm_vs_competitor}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontSize: '0.7rem',
                    height: 20,
                    fontWeight: 'bold',
                    minWidth: 80
                  }}
                />
              </TableCell>
              <TableCell align="center" sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem',
                borderRight: '2px solid rgba(245, 158, 11, 0.3)'
              }}>
                <Chip
                  label={row.standard_deviation_1_year_jpm_vs_competitor}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontSize: '0.7rem',
                    height: 20,
                    fontWeight: 'bold',
                    minWidth: 80
                  }}
                />
              </TableCell>

              {/* 3 Year Performance Metrics */}
              <TableCell align="center" sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem',
                borderLeft: '2px solid rgba(99, 102, 241, 0.3)'
              }}>
                <Chip
                  label={row.batting_average_3_year_jpm_vs_competitor}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(99, 102, 241, 0.15)',
                    color: '#6366f1',
                    fontSize: '0.7rem',
                    height: 20,
                    fontWeight: 'bold',
                    minWidth: 80
                  }}
                />
              </TableCell>
              <TableCell align="center" sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem'
              }}>
                <Chip
                  label={row.returns_3_year_jpm_vs_competitor}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(99, 102, 241, 0.15)',
                    color: '#6366f1',
                    fontSize: '0.7rem',
                    height: 20,
                    fontWeight: 'bold',
                    minWidth: 80
                  }}
                />
              </TableCell>
              <TableCell align="center" sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem',
                borderRight: '2px solid rgba(99, 102, 241, 0.3)'
              }}>
                <Chip
                  label={row.standard_deviation_3_year_jpm_vs_competitor}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(99, 102, 241, 0.15)',
                    color: '#6366f1',
                    fontSize: '0.7rem',
                    height: 20,
                    fontWeight: 'bold',
                    minWidth: 80
                  }}
                />
              </TableCell>

              {/* 5 Year Performance Metrics */}
              <TableCell align="center" sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem',
                borderLeft: '2px solid rgba(16, 185, 129, 0.3)'
              }}>
                <Chip
                  label={row.batting_average_5_year_jpm_vs_competitor}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontSize: '0.7rem',
                    height: 20,
                    fontWeight: 'bold',
                    minWidth: 80
                  }}
                />
              </TableCell>
              <TableCell align="center" sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem'
              }}>
                <Chip
                  label={row.returns_5_year_jpm_vs_competitor}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontSize: '0.7rem',
                    height: 20,
                    fontWeight: 'bold',
                    minWidth: 80
                  }}
                />
              </TableCell>
              <TableCell align="center" sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                fontSize: '0.8rem',
                borderRight: '2px solid rgba(16, 185, 129, 0.3)'
              }}>
                <Chip
                  label={row.standard_deviation_5_year_jpm_vs_competitor}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontSize: '0.7rem',
                    height: 20,
                    fontWeight: 'bold',
                    minWidth: 80
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <>
      {/* Manager Roster Icon Button */}
      <Tooltip title="Manager Roster" arrow>
        <IconButton
          onClick={handleMenuClick}
          disabled={isLoading}
          size="small"
          sx={{
            color: '#3b82f6',
            bgcolor: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 2,
            p: 0.75,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(59, 130, 246, 0.25)',
              transform: 'scale(1.05)'
            },
            '&:disabled': {
              bgcolor: 'rgba(156, 163, 175, 0.3)',
              color: 'rgba(255, 255, 255, 0.5)'
            }
          }}
        >
          {isLoading ? (
            <CircularProgress size={18} sx={{ color: '#3b82f6' }} />
          ) : (
            <TableChart sx={{ fontSize: '1rem' }} />
          )}
        </IconButton>
      </Tooltip>

      {/* Menu with View and Download options */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            bgcolor: isDarkTheme ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${isDarkTheme ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
            mt: 1
          }
        }}
      >
        <MenuItem onClick={handleViewTable}>
          <ListItemIcon>
            <Visibility sx={{ color: '#3b82f6' }} fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="View Tables"
            secondary="View manager roster & recommendations"
            primaryTypographyProps={{
              sx: { color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)', fontSize: '0.9rem' }
            }}
            secondaryTypographyProps={{
              sx: { color: isDarkTheme ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)', fontSize: '0.7rem' }
            }}
          />
        </MenuItem>
        
        <MenuItem onClick={() => handleDownload('excel')}>
          <ListItemIcon>
            <Download sx={{ color: '#10b981' }} fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Download Excel"
            secondary="Export to Excel (both sheets)"
            primaryTypographyProps={{
              sx: { color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)', fontSize: '0.9rem' }
            }}
            secondaryTypographyProps={{
              sx: { color: isDarkTheme ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)', fontSize: '0.7rem' }
            }}
          />
        </MenuItem>

        <MenuItem onClick={() => handleDownload('csv')}>
          <ListItemIcon>
            <Download sx={{ color: '#10b981' }} fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Download CSV"
            secondary="Export to CSV (ZIP with both files)"
            primaryTypographyProps={{
              sx: { color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)', fontSize: '0.9rem' }
            }}
            secondaryTypographyProps={{
              sx: { color: isDarkTheme ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)', fontSize: '0.7rem' }
            }}
          />
        </MenuItem>
      </Menu>

      {/* Table View Dialog with Tabs */}
      <Dialog
        open={showTableDialog}
        onClose={() => setShowTableDialog(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: isDarkTheme ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${isDarkTheme ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
          borderBottom: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)'}`,
          pb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TableChart sx={{ color: '#3b82f6', fontSize: '1.5rem' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                Manager Roster
              </Typography>
              <Typography variant="caption" sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                {companyName}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setShowTableDialog(false)}
            sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.54)' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        {/* Tabs for switching between views */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: '#3b82f6',
              },
              '& .MuiTab-root': {
                color: isDarkTheme ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                '&.Mui-selected': {
                  color: '#3b82f6',
                }
              }
            }}
          >
            <Tab 
              label="Manager View" 
              icon={<AccountBalance />} 
              iconPosition="start" 
              sx={{ 
                textTransform: 'none',
                fontWeight: activeTab === 0 ? 'bold' : 'normal',
                fontSize: '0.9rem'
              }}
            />
            <Tab 
              label="Recommendations View" 
              icon={<CompareArrows />} 
              iconPosition="start"
              sx={{ 
                textTransform: 'none',
                fontWeight: activeTab === 1 ? 'bold' : 'normal',
                fontSize: '0.9rem'
              }}
            />
          </Tabs>
        </Box>

        <DialogContent sx={{ pt: 3 }}>
          {activeTab === 0 ? (
            // Manager View Tab
            managerData.length > 0 ? (
              <>
                {renderManagerViewSummary()}
                {renderManagerViewTable()}
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info" sx={{ 
                    bgcolor: 'rgba(59, 130, 246, 0.1)', 
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    <Typography variant="body2">
                      Showing {managerData.length} manager relationships for {companyName}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.8 }}>
                      Multi-mandate managers are highlighted with a green tag. Switch to Recommendations view to see performance data.
                    </Typography>
                  </Alert>
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <TableChart sx={{ fontSize: '3rem', color: isDarkTheme ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)', mb: 2 }} />
                <Typography variant="h6" sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', mb: 1 }}>
                  No Manager Data Available
                </Typography>
                <Typography variant="body2" sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }}>
                  No manager roster data found for this company
                </Typography>
              </Box>
            )
          ) : (
            // Recommendations View Tab
            recommendationsData.length > 0 ? (
              <>
                {renderRecommendationsViewSummary()}
                {renderRecommendationsViewTable()}
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info" sx={{ 
                    bgcolor: 'rgba(59, 130, 246, 0.1)', 
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    <Typography variant="body2">
                      Showing {recommendationsData.length} recommendation{recommendationsData.length !== 1 ? 's' : ''} for {companyName}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.8 }}>
                      Comparison values show JPM vs competitor metrics. Values display in format: "JPM value vs competitor value"
                    </Typography>
                  </Alert>
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CompareArrows sx={{ fontSize: '3rem', color: isDarkTheme ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)', mb: 2 }} />
                <Typography variant="h6" sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', mb: 1 }}>
                  No Recommendations Available
                </Typography>
                <Typography variant="body2" sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }}>
                  No performance recommendation data found for this company
                </Typography>
              </Box>
            )
          )}
        </DialogContent>

        <DialogActions sx={{ 
          borderTop: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)'}`,
          px: 3,
          py: 2,
          justifyContent: 'space-between'
        }}>
          <Box>
            <Button
              variant="outlined"
              startIcon={<CompareArrows />}
              onClick={() => setActiveTab(activeTab === 0 ? 1 : 0)}
              sx={{
                color: '#3b82f6',
                borderColor: '#3b82f6',
                mr: 1
              }}
            >
              Switch to {activeTab === 0 ? 'Recommendations' : 'Manager'} View
            </Button>
          </Box>
          <Box>
            <Button 
              onClick={() => setShowTableDialog(false)}
              sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', mr: 1 }}
            >
              Close
            </Button>
            {(managerData.length > 0 || recommendationsData.length > 0) && (
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={() => handleDownload('excel')}
                sx={{
                  bgcolor: '#10b981',
                  '&:hover': { bgcolor: '#059669' }
                }}
              >
                Download Excel
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccessSnackbar}
        autoHideDuration={4000}
        onClose={() => setShowSuccessSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setShowSuccessSnackbar(false)} 
          severity="success"
          icon={<CheckCircle />}
          sx={{
            bgcolor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            '& .MuiAlert-icon': {
              color: '#10b981'
            }
          }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      {error && (
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setError(null)} 
            severity="error"
            sx={{
              bgcolor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444'
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                Manager Roster Error
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {error}
              </Typography>
            </Box>
          </Alert>
        </Snackbar>
      )}
    </>
  );
};
          

          