// components/StatsCards.tsx - Simplified Version
import React, { useState } from 'react';
import { Box, Typography, Switch, FormControlLabel, IconButton, Tooltip, Chip } from '@mui/material';
import { 
  Hub, 
  Psychology, 
  BugReport, 
  DarkMode, 
  LightMode,
  TrendingUp,
  Recommend
} from '@mui/icons-material';
import { Node, Edge } from 'reactflow';
import { AppNodeData, EdgeData } from '../types/GraphTypes';

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
  nodeCount = 0,
  edgeCount = 0,
  dataSource = 'hierarchical_standard'
}) => {
  // Calculate recommendation-specific stats
  const incumbentProductsCount = nodes.filter(n => n.type === 'INCUMBENT_PRODUCT').length;
  const biRecommendsCount = edges.filter(e => e.data?.relType === 'BI_RECOMMENDS').length;
  const productsCount = nodes.filter(n => n.type === 'PRODUCT').length;
  const totalRecommendationEntities = incumbentProductsCount + biRecommendsCount;

  const handleRecommendationsToggle = (checked: boolean) => {
    console.log(`🎯 Recommendations mode ${checked ? 'ENABLED' : 'DISABLED'}`);
    setRecommendationsMode(checked);
    onModeChange(checked ? 'recommendations' : 'standard');
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

      {/* Right Side - Simplified Controls Panel */}
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
                  color: '#6366f1', // Purple for consistency
                  '&:hover': {
                    bgcolor: 'rgba(99, 102, 241, 0.08)'
                  }
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { 
                  backgroundColor: '#6366f1' // Purple for consistency
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
      </Box>
    </Box>
  );
};