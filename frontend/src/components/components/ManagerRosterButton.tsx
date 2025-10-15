// components/ManagerRosterButton.tsx - Updated with correct columns
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
  CardContent
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
  ShowChart
} from '@mui/icons-material';

interface ManagerRosterData {
  company_name: string;
  company_id: string;
  consultant_id: string;
  consultant_name: string;
  product_name: string;
  manager: string;
  estimated_market_value: number;
  commitment: number;
  asset_class: string;
  '1_years': number;
  '3_years': number;
  '5_years': number;
  '10_years': number;
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
  const [managerData, setManagerData] = useState<ManagerRosterData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const fetchManagerRoster = async (): Promise<ManagerRosterData[]> => {
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
      
      if (!result.success || !result.data) {
        throw new Error('Invalid response from server');
      }
      
      return result.data;
      
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
      setManagerData(data);
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
            primary="View Table"
            secondary="Preview manager roster data"
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
            secondary="Export to Excel format"
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
            secondary="Export to CSV format"
            primaryTypographyProps={{
              sx: { color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)', fontSize: '0.9rem' }
            }}
            secondaryTypographyProps={{
              sx: { color: isDarkTheme ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)', fontSize: '0.7rem' }
            }}
          />
        </MenuItem>
      </Menu>

      {/* Table View Dialog */}
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
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
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

        <DialogContent sx={{ pt: 3 }}>
          {managerData.length > 0 ? (
            <>
              {/* Summary Cards */}
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
                    {new Set(managerData.map(d => d.consultant_name)).size}
                </Typography>
                </CardContent>
            </Card>

            <Card sx={{ 
                flex: 1, 
                minWidth: 180,
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
                <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <TrendingUp sx={{ color: '#10b981', fontSize: '1.2rem' }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                    Products
                    </Typography>
                </Box>
                <Typography variant="h5" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                    {new Set(managerData.map(d => d.product_name)).size}
                </Typography>
                </CardContent>
            </Card>

            {/* NEW: Managers Count Card */}
            <Card sx={{ 
                flex: 1, 
                minWidth: 180,
                bgcolor: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
                <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AccountBalance sx={{ color: '#8b5cf6', fontSize: '1.2rem' }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                    Managers
                    </Typography>
                </Box>
                <Typography variant="h5" sx={{ color: '#8b5cf6', fontWeight: 'bold' }}>
                    {new Set(managerData.map(d => d.manager)).size}
                </Typography>
                </CardContent>
            </Card>

            <Card sx={{ 
                flex: 1, 
                minWidth: 180,
                bgcolor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)'
            }}>
                <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Business sx={{ color: '#f59e0b', fontSize: '1.2rem' }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                    Total Commitment
                    </Typography>
                </Box>
                <Typography variant="h5" sx={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.3rem' }}>
                    {formatCurrency(managerData.reduce((sum, d) => sum + d.commitment, 0))}
                </Typography>
                </CardContent>
            </Card>

            {/* Optional: Total Market Value Card */}
            <Card sx={{ 
                flex: 1, 
                minWidth: 180,
                bgcolor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)'
            }}>
                <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <ShowChart sx={{ color: '#22c55e', fontSize: '1.2rem' }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                    Total Est. Value
                    </Typography>
                </Box>
                <Typography variant="h5" sx={{ color: '#22c55e', fontWeight: 'bold', fontSize: '1.3rem' }}>
                    {formatCurrency(managerData.reduce((sum, d) => sum + d.estimated_market_value, 0))}
                </Typography>
                </CardContent>
            </Card>
            </Box>

              {/* Data Table */}
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
                        Consultant
                      </TableCell>
                      <TableCell sx={{ 
                        bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}>
                        Product
                      </TableCell>
                      <TableCell sx={{ 
                        bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}>
                        Manager
                      </TableCell>
                      <TableCell sx={{ 
                        bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246,0.1)',
                        color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}>
                        Asset Class
                      </TableCell>
                      <TableCell align="right" sx={{ 
                        bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}>
                        Est. Market Value
                      </TableCell>
                      <TableCell align="right" sx={{ 
                        bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}>
                        Commitment
                      </TableCell>
                      <TableCell align="center" sx={{ 
                        bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}>
                        1Y
                      </TableCell>
                      <TableCell align="center" sx={{ 
                        bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}>
                        3Y
                      </TableCell>
                      <TableCell align="center" sx={{ 
                        bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}>
                        5Y
                      </TableCell>
                      <TableCell align="center" sx={{ 
                        bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}>
                        10Y
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
                          <Typography variant="caption" sx={{ 
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '0.65rem',
                            fontFamily: 'monospace'
                          }}>
                            {row.consultant_id}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ 
                          color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                          fontSize: '0.8rem',
                          maxWidth: 200
                        }}>
                          {row.product_name}
                        </TableCell>
                        <TableCell sx={{ 
                          color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                          fontSize: '0.8rem'
                        }}>
                          <Chip 
                            label={row.manager}
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
                        <TableCell align="right" sx={{ 
                          color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                          fontFamily: 'monospace',
                          fontWeight: 'medium',
                          fontSize: '0.8rem'
                        }}>
                          {formatCurrency(row.estimated_market_value)}
                        </TableCell>
                        <TableCell align="right" sx={{ 
                          color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
                          fontFamily: 'monospace',
                          fontWeight: 'medium',
                          fontSize: '0.8rem'
                        }}>
                          {formatCurrency(row.commitment)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={formatPercentage(row['1_years'])}
                            size="small"
                            sx={{
                              bgcolor: `${getReturnColor(row['1_years'])}20`,
                              color: getReturnColor(row['1_years']),
                              fontSize: '0.7rem',
                              height: 20,
                              fontWeight: 'bold',
                              minWidth: 60
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={formatPercentage(row['3_years'])}
                            size="small"
                            sx={{
                              bgcolor: `${getReturnColor(row['3_years'])}20`,
                              color: getReturnColor(row['3_years']),
                              fontSize: '0.7rem',
                              height: 20,
                              fontWeight: 'bold',
                              minWidth: 60
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={formatPercentage(row['5_years'])}
                            size="small"
                            sx={{
                              bgcolor: `${getReturnColor(row['5_years'])}20`,
                              color: getReturnColor(row['5_years']),
                              fontSize: '0.7rem',
                              height: 20,
                              fontWeight: 'bold',
                              minWidth: 60
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={formatPercentage(row['10_years'])}
                            size="small"
                            sx={{
                              bgcolor: `${getReturnColor(row['10_years'])}20`,
                              color: getReturnColor(row['10_years']),
                              fontSize: '0.7rem',
                              height: 20,
                              fontWeight: 'bold',
                              minWidth: 60
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 2 }}>
                <Alert severity="info" sx={{ 
                  bgcolor: 'rgba(59, 130, 246, 0.1)', 
                  color: '#3b82f6',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                  <Typography variant="body2">
                    Showing {managerData.length} manager-product relationship{managerData.length !== 1 ? 's' : ''} for {companyName}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.8 }}>
                    Return colors: <span style={{ color: '#10b981' }}>●</span> Excellent (≥15%) • 
                    <span style={{ color: '#3b82f6' }}> ●</span> Good (≥10%) • 
                    <span style={{ color: '#f59e0b' }}> ●</span> Fair (≥5%) • 
                    <span style={{ color: '#ef4444' }}> ●</span> Poor (&lt;5%)
                  </Typography>
                </Alert>
              </Box>
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <TableChart sx={{ fontSize: '3rem', color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
              <Typography variant="h6" sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', mb: 1 }}>
                No Data Available
              </Typography>
              <Typography variant="body2" sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }}>
                No manager roster data found for this company
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ 
          borderTop: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)'}`,
          px: 3,
          py: 2
        }}>
          <Button 
            onClick={() => setShowTableDialog(false)}
            sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}
          >
            Close
          </Button>
          {managerData.length > 0 && (
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