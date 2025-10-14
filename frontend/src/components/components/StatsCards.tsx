// components/StatsCards.tsx - Complete implementation with export feature
import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Switch, 
  FormControlLabel, 
  IconButton, 
  Tooltip, 
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Hub, 
  Psychology, 
  BugReport, 
  DarkMode, 
  LightMode,
  TrendingUp,
  Recommend,
  Download,
  FileDownload,
  TableChart,
  CheckCircle
} from '@mui/icons-material';
import { Node, Edge } from 'reactflow';
import { AppNodeData, EdgeData } from '../types/GraphTypes';
import { useExport } from '../hooks/useExport';
import { exportService } from '../services/ExportService';

interface StatsCardsProps {
  nodes: Node<AppNodeData>[];
  edges: Edge<EdgeData>[];
  showDebug?: boolean;
  setShowDebug?: (show: boolean) => void;
  isDarkTheme?: boolean;
  setIsDarkTheme?: (isDark: boolean) => void;
  // NEW: Recommendations mode props
  recommendationsMode?: boolean;
  setRecommendationsMode?: (enabled: boolean) => void;
  onModeChange?: (mode: 'standard' | 'recommendations') => void;
  // NEW: Region and data info
  currentRegions?: string[];
  currentFilters?: any;
  nodeCount?: number;
  edgeCount?: number;
  dataSource?: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ 
  nodes, 
  edges, 
  showDebug = false, 
  setShowDebug = () => {},
  isDarkTheme = true,
  setIsDarkTheme = () => {},
  // NEW: Recommendations mode
  recommendationsMode = false,
  setRecommendationsMode = () => {},
  onModeChange = () => {},
  // NEW: Region and data info
  currentRegions = ['NAI'],
  currentFilters = {},
  nodeCount = 0,
  edgeCount = 0,
  dataSource = 'hierarchical_standard'
}) => {
  // Calculate recommendation-specific stats
  const incumbentProductsCount = nodes.filter(n => n.type === 'INCUMBENT_PRODUCT').length;
  const biRecommendsCount = edges.filter(e => e.data?.relType === 'BI_RECOMMENDS').length;
  const productsCount = nodes.filter(n => n.type === 'PRODUCT').length;
  const totalRecommendationEntities = incumbentProductsCount + biRecommendsCount;

  // Export hook
  const { exportData, isExporting, exportError, lastExportResult, clearError } = useExport();
  
  // Export menu state
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const exportMenuOpen = Boolean(exportMenuAnchor);
  
  // Success snackbar state
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);

  // Check if export is available
  const { canExport, reason: cannotExportReason } = exportService.canExport(nodes.length);
  
  // Estimate export rows
  const estimatedRows = exportService.estimateRowCount(
    nodes.length, 
    edges.length, 
    recommendationsMode
  );

  const handleRecommendationsToggle = async (checked: boolean) => {
    console.log(`🎯 Recommendations mode ${checked ? 'ENABLED' : 'DISABLED'}`);
    
    // IMPORTANT: Update local state first
    setRecommendationsMode(checked);
    
    try {
      // Then call the mode change handler which should:
      // 1. Update the node types to include/exclude INCUMBENT_PRODUCT
      // 2. Reload the data with the new mode
      await onModeChange(checked ? 'recommendations' : 'standard');
      console.log(`🎯 Successfully switched to ${checked ? 'recommendations' : 'standard'} mode`);
    } catch (err) {
      console.error(`🎯 Failed to switch to ${checked ? 'recommendations' : 'standard'} mode:`, err);
      // Revert local state if the mode change failed
      setRecommendationsMode(!checked);
    }
  };

  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    if (canExport) {
      setExportMenuAnchor(event.currentTarget);
    }
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExport = async (format: 'excel' | 'csv') => {
    handleExportMenuClose();
    
    if (!currentRegions?.[0]) {
      console.error('No region selected for export');
      return;
    }

    const result = await exportData({
      region: currentRegions[0],
      filters: currentFilters,
      recommendationsMode,
      format
    });

    if (result.success) {
      setShowSuccessSnackbar(true);
    }
  };

  return (
    <Box sx={{ 
      position: 'absolute', 
      top: 16, 
      left: 16,
      right: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      pointerEvents: 'none', // Allow clicking through the container
      '& > *': { pointerEvents: 'auto' } // Re-enable pointer events for children
    }}>
      {/* Left Side - Smart Network Title */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        bgcolor: isDarkTheme ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(20px)',
        border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: 3,
        px: 3,
        py: 1.5,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          borderRadius: 2,
          bgcolor: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
        }}>
          <Hub sx={{ color: 'white', fontSize: '1.3rem' }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ 
            color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)', 
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.5px',
            fontSize: '1.1rem'
          }}>
            SMART NETWORK
          </Typography>
          <Typography variant="caption" sx={{ 
            color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
            fontWeight: 'medium',
            fontSize: '0.7rem'
          }}>
            Welcome, Prabhakar 
          </Typography>
        </Box>
      </Box>

      {/* Right Side - Controls Panel with Export */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: isDarkTheme ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(20px)',
        border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: 3,
        px: 2,
        py: 1,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Product Recommendations Toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={recommendationsMode}
              onChange={(e) => handleRecommendationsToggle(e.target.checked)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { 
                  color: '#6366f1',
                  '&:hover': {
                    bgcolor: 'rgba(99, 102, 241, 0.08)'
                  }
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { 
                  backgroundColor: '#6366f1'
                },
                '& .MuiSwitch-track': {
                  backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
                }
              }}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {recommendationsMode ? (
                  <Recommend sx={{ 
                    color: '#6366f1', 
                    fontSize: '1.2rem',
                    transition: 'color 0.2s ease'
                  }} />
                ) : (
                  <TrendingUp sx={{ 
                    color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.54)', 
                    fontSize: '1.2rem',
                    transition: 'color 0.2s ease'
                  }} />
                )}
                {/* Mode indicator dot */}
                <Box sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: recommendationsMode ? '#f59e0b' : (isDarkTheme ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'),
                  transition: 'background-color 0.2s ease'
                }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ 
                  color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)', 
                  fontWeight: 'medium',
                  lineHeight: 1,
                  fontSize: '0.85rem'
                }}>
                  Recommendations
                </Typography>
                {/* Show stats when in recommendations mode */}
                {recommendationsMode && totalRecommendationEntities > 0 && (
                  <Typography variant="caption" sx={{ 
                    color: '#f59e0b',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    display: 'block',
                    lineHeight: 1
                  }}>
                    {incumbentProductsCount} Incumbents • {biRecommendsCount} AI
                  </Typography>
                )}
              </Box>
            </Box>
          }
          sx={{ m: 0, mr: 1 }}
        />

        {/* Divider */}
        <Box sx={{
          width: '1px',
          height: '32px',
          bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
          mx: 1
        }} />

        {/* Mode Status Indicator */}
        <Tooltip 
          title={
            recommendationsMode 
              ? `Recommendations Mode: Showing ${incumbentProductsCount} incumbent products with ${biRecommendsCount} BI recommendations`
              : `Standard Mode: Showing ${productsCount} products with direct ownership relationships`
          } 
          arrow
        >
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            bgcolor: recommendationsMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
            border: recommendationsMode ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
            transition: 'all 0.2s ease'
          }}>
            {recommendationsMode ? (
              <Psychology sx={{ 
                color: '#f59e0b', 
                fontSize: '1rem' 
              }} />
            ) : (
              <TrendingUp sx={{ 
                color: '#6366f1', 
                fontSize: '1rem' 
              }} />
            )}
            <Typography variant="caption" sx={{ 
              color: recommendationsMode ? '#f59e0b' : '#6366f1',
              fontWeight: 'bold',
              fontSize: '0.75rem'
            }}>
              {recommendationsMode ? 'REC' : 'STD'}
            </Typography>
          </Box>
        </Tooltip>

        {/* Debug Toggle Button (Optional) */}
        {process.env.NODE_ENV === 'development' && (
          <Tooltip title={showDebug ? "Hide Debug Panel" : "Show Debug Panel"} arrow>
            <IconButton
              onClick={() => setShowDebug(!showDebug)}
              sx={{
                color: showDebug ? '#f59e0b' : (isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.54)'),
                bgcolor: showDebug ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                border: showDebug ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
                borderRadius: 2,
                p: 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: showDebug ? 'rgba(245, 158, 11, 0.25)' : (isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'),
                  color: showDebug ? '#f59e0b' : (isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)')
                }
              }}
            >
              <BugReport fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* Theme Toggle Button */}
        <Tooltip title={isDarkTheme ? "Switch to Light Theme" : "Switch to Dark Theme"} arrow>
          <IconButton
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            sx={{
              color: isDarkTheme ? '#6366f1' : '#f59e0b',
              bgcolor: isDarkTheme ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: isDarkTheme ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 2,
              p: 1,
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: isDarkTheme ? 'rgba(99, 102, 241, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                transform: 'scale(1.05)'
              }
            }}
          >
            {isDarkTheme ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* Divider before export button */}
        <Box sx={{
          width: '1px',
          height: '32px',
          bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
          mx: 1
        }} />

        {/* Export Button */}
        <Tooltip 
          title={
            canExport 
              ? `Export ${estimatedRows} rows to Excel or CSV` 
              : cannotExportReason
          } 
          arrow
        >
          <span>
            <IconButton
              onClick={handleExportClick}
              disabled={!canExport || isExporting}
              sx={{
                color: canExport ? '#10b981' : 'rgba(255, 255, 255, 0.3)',
                bgcolor: canExport ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                border: `1px solid ${canExport ? 'rgba(16, 185, 129, 0.3)' : 'transparent'}`,
                borderRadius: 2,
                p: 1,
                transition: 'all 0.2s ease',
                position: 'relative',
                '&:hover': canExport ? {
                  bgcolor: 'rgba(16, 185, 129, 0.25)',
                  transform: 'scale(1.05)'
                } : {},
                '&:disabled': {
                  color: 'rgba(255, 255, 255, 0.3)',
                  cursor: 'not-allowed'
                }
              }}
            >
              {isExporting ? (
                <CircularProgress size={20} sx={{ color: '#10b981' }} />
              ) : (
                <Download fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>

        {/* Export Format Menu */}
        <Menu
          anchorEl={exportMenuAnchor}
          open={exportMenuOpen}
          onClose={handleExportMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            sx: {
              bgcolor: isDarkTheme ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${isDarkTheme ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
              mt: 1
            }
          }}
        >
          <MenuItem onClick={() => handleExport('excel')}>
            <ListItemIcon>
              <TableChart sx={{ color: '#10b981' }} fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary="Export to Excel"
              secondary={`~${estimatedRows} rows, multiple sheets`}
              primaryTypographyProps={{
                sx: { color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)' }
              }}
              secondaryTypographyProps={{
                sx: { color: isDarkTheme ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)', fontSize: '0.7rem' }
              }}
            />
          </MenuItem>
          <MenuItem onClick={() => handleExport('csv')}>
            <ListItemIcon>
              <FileDownload sx={{ color: '#10b981' }} fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary="Export to CSV"
              secondary={`~${estimatedRows} rows, simple format`}
              primaryTypographyProps={{
                sx: { color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)' }
              }}
              secondaryTypographyProps={{
                sx: { color: isDarkTheme ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)', fontSize: '0.7rem' }
              }}
            />
          </MenuItem>
        </Menu>

        {/* Export indicator badge when data is exportable */}
        {canExport && estimatedRows > 0 && (
          <Chip
            label={`${estimatedRows} rows`}
            size="small"
            sx={{
              bgcolor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '0.7rem',
              height: 20,
              fontWeight: 'bold'
            }}
          />
        )}
      </Box>

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
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              Export Successful
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {lastExportResult?.filename} ({lastExportResult?.rowCount} rows)
            </Typography>
          </Box>
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={!!exportError}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={clearError} 
          severity="error"
          sx={{
            bgcolor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444'
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              Export Failed
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {exportError}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>
    </Box>
  );
};