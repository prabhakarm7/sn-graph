// Modified InsightsPanel.tsx - Enhanced with comma-separated values, node IDs, and consultant advisor

import React from 'react';
import { 
  Box, 
  Typography, 
  Chip, 
  LinearProgress, 
  Avatar,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  Stack
} from '@mui/material';
import { 
  Person, 
  Business, 
  AccountBalance, 
  TrendingUp,
  Timeline,
  Star,
  Speed,
  Assessment,
  BusinessCenter,
  CorporateFare,
  ShowChart,
  Analytics,
  Psychology,
  Recommend,
  AutoAwesome,
  Circle,
  Fingerprint
} from '@mui/icons-material';
import { Node, Edge } from 'reactflow';
import { AppNodeData, EdgeData } from '../types/GraphTypes';

interface InsightsPanelProps {
  selectedNode?: Node<AppNodeData> | null;
  selectedEdge?: Edge<EdgeData> | null;
  isHovered?: boolean;
  isDarkTheme?: boolean;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ 
  selectedNode, 
  selectedEdge,
  isHovered = false,
  isDarkTheme = true
}) => {
  const getNodeIcon = (type?: string) => {
    switch (type) {
      case 'CONSULTANT': return <BusinessCenter sx={{ color: '#6366f1', fontSize: '1.5rem' }} />;
      case 'FIELD_CONSULTANT': return <Person sx={{ color: '#6366f1', fontSize: '1.5rem' }} />;
      case 'COMPANY': return <CorporateFare sx={{ color: '#10b981', fontSize: '1.5rem' }} />;
      case 'PRODUCT': return <AccountBalance sx={{ color: '#3b82f6', fontSize: '1.5rem' }} />;
      case 'INCUMBENT_PRODUCT': return <Psychology sx={{ color: '#f59e0b', fontSize: '1.5rem' }} />;
      default: return <Assessment sx={{ color: '#6b7280', fontSize: '1.5rem' }} />;
    }
  };

  const getNodeTypeColor = (type?: string) => {
    switch (type) {
      case 'CONSULTANT': 
      case 'FIELD_CONSULTANT': 
        return '#6366f1';
      case 'COMPANY': 
        return '#10b981';
      case 'PRODUCT': 
        return '#3b82f6';
      case 'INCUMBENT_PRODUCT':
        return '#f59e0b';
      default: 
        return '#6b7280';
    }
  };

  const formatNodeType = (type?: string) => {
    return type?.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  const getRelationshipIcon = (relType?: string) => {
    switch (relType) {
      case 'EMPLOYS': return <Person sx={{ color: '#6366f1', fontSize: '1.5rem' }} />;
      case 'COVERS': return <Business sx={{ color: '#10b981', fontSize: '1.5rem' }} />;
      case 'RATES': return <Star sx={{ color: '#8b5cf6', fontSize: '1.5rem' }} />;
      case 'OWNS': return <TrendingUp sx={{ color: '#3b82f6', fontSize: '1.5rem' }} />;
      case 'BI_RECOMMENDS': return <AutoAwesome sx={{ color: '#f59e0b', fontSize: '1.5rem' }} />;
      default: return <Timeline sx={{ color: '#6b7280', fontSize: '1.5rem' }} />;
    }
  };

  const getRelationshipColor = (relType?: string) => {
    switch (relType) {
      case 'EMPLOYS': return '#6366f1';
      case 'COVERS': return '#10b981';
      case 'RATES': return '#8b5cf6';
      case 'OWNS': return '#3b82f6';
      case 'BI_RECOMMENDS': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const parseInfluenceLevel = (influence: any): { value: number; displayText: string; isUnknown: boolean } => {
    if (!influence) {
      return { value: 0, displayText: 'Unknown', isUnknown: true };
    }

    if (typeof influence === 'string') {
      const normalized = influence.toLowerCase().trim();
      
      switch (normalized) {
        case 'high':
          return { value: 4, displayText: 'High', isUnknown: false };
        case 'medium':
          return { value: 3, displayText: 'Medium', isUnknown: false };
        case 'low':
          return { value: 2, displayText: 'Low', isUnknown: false };
        case 'unk':
        case 'unknown':
          return { value: 0, displayText: 'Unknown', isUnknown: true };
        default:
          const numValue = parseInt(normalized, 10);
          if (!isNaN(numValue) && numValue >= 1 && numValue <= 4) {
            return { value: numValue, displayText: `${numValue}/4`, isUnknown: false };
          }
          return { value: 0, displayText: influence, isUnknown: true };
      }
    }

    if (typeof influence === 'number') {
      if (influence >= 1 && influence <= 4) {
        return { value: influence, displayText: `${influence}/4`, isUnknown: false };
      }
      return { value: 0, displayText: influence.toString(), isUnknown: true };
    }

    return { value: 0, displayText: 'Unknown', isUnknown: true };
  };

  // ENHANCED: Format array values with commas
  const formatArrayValue = (value: any): string => {
    console.log('🔍 formatArrayValue called with:', { value, type: typeof value, isArray: Array.isArray(value) });
    
    if (Array.isArray(value)) {
      const result = value.join(', ');
      console.log('✅ Array joined:', { original: value, result });
      return result;
    }
    if (typeof value === 'string' && value.includes(',')) {
      // Already comma-separated, just clean it up
      const parts = value.split(',').map(s => s.trim());
      const result = parts.join(', ');
      console.log('✅ String cleaned:', { original: value, parts, result });
      return result;
    }
    const result = String(value || '');
    console.log('✅ Fallback string conversion:', { original: value, result });
    return result;
  };

  // Helper component for ultra-compact metadata table rows (Name + Value/Visual Combined)
  const MetadataRow = ({ 
    label, 
    value, 
    valueColor = isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)',
    isArray = false 
  }: { 
    label: string; 
    value: React.ReactNode; 
    valueColor?: string;
    isArray?: boolean;
  }) => {
    console.log('🏷️ MetadataRow rendering:', { 
      label, 
      valueType: typeof value, 
      isReactElement: React.isValidElement(value),
      isArrayProp: isArray,
      isActualArray: Array.isArray(value),
      value: React.isValidElement(value) ? '[React Element]' : value
    });

    // Format value if it's an array or comma-separated string
    const formatValue = () => {
      if (React.isValidElement(value)) {
        console.log('🎨 Returning React element as-is for:', label);
        return value; // Return React elements as-is
      }
      
      if (isArray || Array.isArray(value)) {
        console.log('📋 Processing array value for:', label, { isArray, isActualArray: Array.isArray(value), value });
        const formatted = formatArrayValue(value);
        console.log('📋 Array formatting result for', label + ':', { original: value, formatted });
        return formatted;
      }
      
      console.log('➡️ Returning value unchanged for:', label, value);
      return value;
    };

    return (
      <TableRow sx={{ 
        '&:last-child td': { border: 0 },
        backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
        '&:hover': { 
          backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' 
        }
      }}>
        <TableCell 
          component="th" 
          scope="row" 
          sx={{ 
            color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', 
            fontSize: '0.75rem',
            fontWeight: 'medium',
            py: 0.75,
            px: 1.5,
            borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)',
            width: '45%',
            verticalAlign: 'middle'
          }}
        >
          {label}
        </TableCell>
        <TableCell sx={{ 
          color: valueColor,
          fontSize: '0.8rem',
          fontWeight: 'medium',
          py: 0.75,
          px: 1.5,
          borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)',
          width: '55%',
          verticalAlign: 'middle',
          wordBreak: isArray || Array.isArray(value) ? 'break-word' : 'normal'
        }}>
          {formatValue()}
        </TableCell>
      </TableRow>
    );
  };

  if (!selectedNode && !selectedEdge) {
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        bgcolor: isDarkTheme ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Assessment sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)', fontSize: '2rem' }} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)', fontWeight: 'bold', mb: 0.5 }}>
              Network Insights
            </Typography>
            <Typography variant="body2" sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
              {isHovered ? 'Hover over any node or connection to preview details' : 'Select any node or connection to view detailed insights and analytics'}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  if (selectedNode) {
    const { data, type } = selectedNode;
    
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex',
        flexDirection: 'row',
        bgcolor: isDarkTheme ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
        background: isHovered ? `linear-gradient(90deg, ${getNodeTypeColor(type)}20 0%, transparent 100%)` : 'transparent',
        transition: 'background 0.3s ease',
        borderLeft: isHovered ? `3px solid ${getNodeTypeColor(type)}` : '3px solid transparent'
      }}>
        
        {/* HEADER SECTION - 25% WIDTH */}
        <Box sx={{ 
          width: '25%',
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 2, 
          p: 2,
          borderRight: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)'}`,
          bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
          flexShrink: 0
        }}>
          <Avatar sx={{ 
            bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', 
            width: 64,
            height: 64,
            border: `2px solid ${getNodeTypeColor(type)}`,
            boxShadow: isHovered ? `0 0 20px ${getNodeTypeColor(type)}40` : 'none',
            transition: 'box-shadow 0.3s ease'
          }}>
            {getNodeIcon(type)}
          </Avatar>
          
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h6" sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)', 
                fontWeight: 'bold',
                fontSize: '1rem',
                textAlign: 'center',
                wordBreak: 'break-word',
                lineHeight: 1.2
              }}>
                {data.name}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={formatNodeType(type)} 
                size="small" 
                sx={{ 
                  bgcolor: `${getNodeTypeColor(type)}20`,
                  color: getNodeTypeColor(type),
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  height: 22
                }}
              />
              
              {/* NEW: Node ID Display */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Fingerprint sx={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }} />
                <Typography variant="caption" sx={{ 
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.65rem',
                  fontFamily: 'monospace'
                }}>
                  {data.id || selectedNode.id}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* METADATA TABLE SECTION - 75% WIDTH */}
        <Box sx={{ 
          width: '75%',
          overflowY: 'auto',
          p: 1,
          bgcolor: isDarkTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
          minHeight: 0
        }}>
          <Table 
            size="small" 
            sx={{ 
              width: '100%',
              '& .MuiTableCell-root': {
                border: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)'}`,
                padding: '6px 12px'
              },
              '& .MuiTableBody-root': {
                '& .MuiTableRow-root': {
                  '&:hover': {
                    backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                  }
                }
              }
            }}
          >
            <TableBody>
              
              {/* Node ID - for all types except INCUMBENT_PRODUCT */}
              {type !== 'INCUMBENT_PRODUCT' && (
                <MetadataRow 
                  label="ID" 
                  value={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Circle sx={{ fontSize: '0.5rem', color: getNodeTypeColor(type) }} />
                      <Typography variant="caption" sx={{ 
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: getNodeTypeColor(type),
                        fontWeight: 'medium'
                      }}>
                        {data.id || selectedNode.id}
                      </Typography>
                    </Box>
                  }
                />
              )}

              {/* Basic Properties */}
              {data.region && (
                <MetadataRow 
                  label="Region" 
                  value={data.region}
                  isArray={Array.isArray(data.region)}
                />
              )}
              
              {data.pca && (
                <MetadataRow 
                  label="PCA" 
                  value={data.pca}
                  valueColor="#6366f1"
                  isArray={Array.isArray(data.pca)}
                />
              )}
              
              {data.aca && (
                <MetadataRow 
                  label="ACA" 
                  value={data.aca}
                  valueColor="#8b5cf6"
                  isArray={Array.isArray(data.aca)}
                />
              )}
              
              {/* NEW: Consultant Advisor for CONSULTANT nodes */}
              {type === 'CONSULTANT' && data.consultant_advisor && (
                <MetadataRow 
                  label="Consultant Advisor" 
                  value={data.consultant_advisor}
                  valueColor="#6366f1"
                  isArray={Array.isArray(data.consultant_advisor)}
                />
              )}
              
              {data.sales_region && (
                <MetadataRow 
                  label="Sales Region" 
                  value={data.sales_region}
                  isArray={Array.isArray(data.sales_region)}
                />
              )}
              
              {data.channel && (
                <MetadataRow 
                  label="Channel" 
                  value={data.channel}
                  isArray={Array.isArray(data.channel)}
                />
              )}
              
              {data.asset_class && (
                <MetadataRow 
                  label="Asset Class" 
                  value={data.asset_class}
                  valueColor="#3b82f6"
                  isArray={Array.isArray(data.asset_class)}
                />
              )}

              {/* Performance Metrics */}
              {data.performance && (
                <MetadataRow 
                  label="Performance Score" 
                  value={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={data.performance} 
                        sx={{ 
                          flexGrow: 1,
                          height: 6, 
                          borderRadius: 3,
                          bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: data.performance >= 80 ? '#10b981' : 
                                     data.performance >= 60 ? '#f59e0b' : '#ef4444',
                            borderRadius: 3
                          }
                        }}
                      />
                      <Typography variant="caption" sx={{ 
                        color: data.performance >= 80 ? '#10b981' : 
                               data.performance >= 60 ? '#f59e0b' : '#ef4444',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        minWidth: 'fit-content'
                      }}>
                        {data.performance}%
                      </Typography>
                    </Box>
                  }
                />
              )}

              {/* Product-Specific Properties */}
              {type === 'PRODUCT' && data.universe_name && (
                <MetadataRow 
                  label="Universe Name" 
                  value={
                    <Chip 
                      label={data.universe_name}
                      size="small"
                      sx={{
                        bgcolor: '#3b82f620',
                        color: '#3b82f6',
                        fontSize: '0.7rem',
                        height: 20,
                        fontWeight: 'medium'
                      }}
                    />
                  }
                />
              )}

              {type === 'PRODUCT' && data.universe_score && (
                <MetadataRow 
                  label="Universe Score" 
                  value={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={(data.universe_score / 5) * 100} 
                        sx={{ 
                          flexGrow: 1,
                          height: 6, 
                          borderRadius: 3,
                          bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: data.universe_score >= 4 ? '#10b981' : 
                                     data.universe_score >= 3 ? '#f59e0b' : '#ef4444',
                            borderRadius: 3
                          }
                        }}
                      />
                      <Typography variant="caption" sx={{ 
                        color: data.universe_score >= 4 ? '#10b981' : 
                               data.universe_score >= 3 ? '#f59e0b' : '#ef4444',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        minWidth: 'fit-content'
                      }}>
                        {data.universe_score}/5
                      </Typography>
                    </Box>
                  }
                />
              )}

              {/* Incumbent Product Properties */}
              {type === 'INCUMBENT_PRODUCT' && data.evestment_product_guid && (
                <MetadataRow 
                  label="Evestment GUID" 
                  value={
                    <Chip 
                      label={data.evestment_product_guid.length > 15 ? 
                        `${data.evestment_product_guid.slice(0, 15)}...` : 
                        data.evestment_product_guid
                      }
                      size="small"
                      sx={{
                        bgcolor: '#f59e0b20',
                        color: '#f59e0b',
                        fontSize: '0.65rem',
                        height: 20,
                        fontFamily: 'monospace',
                        fontWeight: 'medium'
                      }}
                    />
                  }
                />
              )}

              {/* Privacy and Additional Details */}
              {data.privacy && (
                <MetadataRow 
                  label="Privacy Level" 
                  value={
                    <Chip 
                      label={data.privacy}
                      size="small"
                      sx={{
                        bgcolor: data.privacy === 'Public' ? '#10b98120' : 
                                 data.privacy === 'Private' ? '#f59e0b20' : '#ef444420',
                        color: data.privacy === 'Public' ? '#10b981' : 
                               data.privacy === 'Private' ? '#f59e0b' : '#ef4444',
                        fontSize: '0.7rem',
                        height: 20,
                        fontWeight: 'bold'
                      }}
                    />
                  }
                />
              )}

              {/* Field Consultant Parent */}
              {type === 'FIELD_CONSULTANT' && data.parentConsultantId && (
                <MetadataRow 
                  label="Parent Consultant" 
                  value={data.consultant_id}
                  valueColor="#6366f1"
                />
              )}

              {/* Product Ratings - ENHANCED to show main consultant first with star */}
              {(type === 'PRODUCT' || type === 'INCUMBENT_PRODUCT') && data.ratings && data.ratings.length > 0 && (
                <MetadataRow 
                  label={`Consultant Ratings (${data.ratings.length})`}
                  value={
                    <Stack direction="column" spacing={0.5} sx={{ width: '100%' }}>
                      {(() => {
                        // Sort ratings: main consultant first, then others
                        const sortedRatings = [...data.ratings].sort((a, b) => {
                          if (a.is_main_consultant && !b.is_main_consultant) return -1;
                          if (!a.is_main_consultant && b.is_main_consultant) return 1;
                          return (a.consultant || '').localeCompare(b.consultant || '');
                        });
                        
                        return sortedRatings.map((rating: any, index: number) => (
                          <Box 
                            key={index}
                            sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              p: 0.5,
                              borderRadius: 1,
                              bgcolor: rating.is_main_consultant
                                ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%)'
                                : isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                              border: rating.is_main_consultant
                                ? `2px solid rgba(255, 215, 0, 0.3)`
                                : `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                              boxShadow: rating.is_main_consultant
                                ? '0 2px 4px rgba(255, 215, 0, 0.1)'
                                : 'none',
                              position: 'relative'
                            }}
                          >
                            {/* Star indicator for main consultant */}
                            {rating.is_main_consultant && (
                              <Box sx={{
                                position: 'absolute',
                                top: -4,
                                left: -4,
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                bgcolor: '#ffd700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                                zIndex: 10
                              }}>
                                <Star sx={{ fontSize: '0.6rem', color: '#fff' }} />
                              </Box>
                            )}
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                              <Typography variant="caption" sx={{ 
                                fontSize: '0.7rem',
                                color: rating.is_main_consultant ? '#ffd700' : isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                                fontWeight: rating.is_main_consultant ? 'bold' : 'medium',
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {rating.consultant}
                              </Typography>
                              
                              {/* OWNS indicator for main consultant */}
                              {rating.is_main_consultant && (
                                <Chip
                                  label="OWNS"
                                  size="small"
                                  sx={{
                                    bgcolor: '#ffd700',
                                    color: '#000',
                                    fontSize: '0.55rem',
                                    height: 14,
                                    fontWeight: 'bold',
                                    mr: 0.5,
                                    '& .MuiChip-label': { px: 0.5 }
                                  }}
                                />
                              )}
                            </Box>
                            
                            <Chip
                              label={rating.rankgroup || rating.rating || 'N/A'}
                              size="small"
                              sx={{
                                bgcolor: rating.rankgroup === 'Positive' ? '#16a34a' : 
                                        rating.rankgroup === 'Negative' ? '#dc2626' : 
                                        rating.rankgroup === 'Introduced' ? '#0891b2' : 
                                        rating.rankgroup === 'Neutral' ? '#6b7280' : '#6b7280',
                                color: 'white',
                                fontSize: '0.65rem',
                                height: 18,
                                fontWeight: 'bold',
                                ml: 1,
                                boxShadow: rating.is_main_consultant ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
                              }}
                            />
                          </Box>
                        ));
                      })()}
                    </Stack>
                  }
                />
              )}

            </TableBody>
          </Table>
        </Box>
      </Box>
    );
  }

  if (selectedEdge) {
    const edgeData = selectedEdge.data || {};
    const relType = edgeData.relType;
    const mandateStatus = edgeData.mandateStatus || edgeData.mandate_status || edgeData.status;
    const levelOfInfluence = edgeData.levelOfInfluence || edgeData.level_of_influence || edgeData.influence;
    const rating = edgeData.rating || edgeData.rankgroup || edgeData.rank;
    
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex',
        flexDirection: 'row',
        bgcolor: isDarkTheme ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
        background: isHovered ? (() => {
          const color = getRelationshipColor(relType);
          if (color && color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);  
            const b = parseInt(color.slice(5, 7), 16);
            return `linear-gradient(90deg, rgba(${r}, ${g}, ${b}, 0.1) 0%, transparent 100%)`;
          }
          return 'linear-gradient(90deg, rgba(107, 114, 128, 0.1) 0%, transparent 100%)';
        })() : 'transparent',
        transition: 'background 0.3s ease',
        borderLeft: isHovered ? `3px solid ${getRelationshipColor(relType)}` : '3px solid transparent'
      }}>
        
        {/* HEADER SECTION - 25% WIDTH */}
        <Box sx={{ 
          width: '25%',
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 2, 
          p: 2,
          borderRight: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)'}`,
          bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
          flexShrink: 0
        }}>
          <Avatar sx={{ 
            bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', 
            width: 64, 
            height: 64,
            border: `2px solid ${getRelationshipColor(relType)}`,
            boxShadow: isHovered ? `0 0 20px ${getRelationshipColor(relType)}40` : 'none',
            transition: 'box-shadow 0.3s ease'
          }}>
            {getRelationshipIcon(relType)}
          </Avatar>
          
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h6" sx={{ 
                color: isDarkTheme ? 'white' : 'rgba(0, 0, 0, 0.87)', 
                fontWeight: 'bold',
                fontSize: '1rem',
                textAlign: 'center',
                wordBreak: 'break-word',
                lineHeight: 1.2
              }}>
                {relType === 'BI_RECOMMENDS' ? 'BI Recommendation' : relType || 'Connection'}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Chip 
                label="Relationship" 
                size="small" 
                sx={{ 
                  bgcolor: `${getRelationshipColor(relType)}20`,
                  color: getRelationshipColor(relType),
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  height: 22
                }}
              />
              
              {/* NEW: Edge ID Display */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Fingerprint sx={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }} />
                <Typography variant="caption" sx={{ 
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.65rem',
                  fontFamily: 'monospace'
                }}>
                  {selectedEdge.id}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* COMPREHENSIVE METADATA TABLE - 75% WIDTH */}
        <Box sx={{ 
          width: '75%',
          overflowY: 'auto',
          p: 1
        }}>
          <Table size="small" sx={{ width: '100%' }}>
            <TableBody>
              
              {/* Relationship Type */}
              <MetadataRow 
                label="Relationship Type" 
                value={relType || 'Unknown'}
                valueColor={getRelationshipColor(relType)}
              />

              {/* Level of Influence for COVERS */}
              {relType === 'COVERS' && levelOfInfluence && (
                (() => {
                  const parsedInfluence = parseInfluenceLevel(levelOfInfluence);
                  
                  return (
                    <MetadataRow 
                      label="Level of Influence" 
                      value={
                        parsedInfluence.isUnknown ? (
                          <Chip
                            label={`Unknown (${levelOfInfluence})`}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(156, 163, 175, 0.2)',
                              color: '#9ca3af',
                              fontSize: '0.7rem',
                              height: 20
                            }}
                          />
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={(parsedInfluence.value / 4) * 100} 
                              sx={{ 
                                flexGrow: 1,
                                height: 6, 
                                borderRadius: 3,
                                bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: parsedInfluence.value >= 4 ? '#059669' : 
                                          parsedInfluence.value >= 3 ? '#10b981' : 
                                          parsedInfluence.value >= 2 ? '#34d399' : '#6ee7b7',
                                  borderRadius: 3
                                }
                              }}
                            />
                            <Typography variant="caption" sx={{ 
                              color: parsedInfluence.value >= 4 ? '#059669' : 
                                     parsedInfluence.value >= 3 ? '#10b981' : 
                                     parsedInfluence.value >= 2 ? '#34d399' : '#6ee7b7',
                              fontWeight: 'bold',
                              fontSize: '0.75rem',
                              minWidth: 'fit-content'
                            }}>
                              {parsedInfluence.displayText}
                            </Typography>
                          </Box>
                        )
                      }
                    />
                  );
                })()
              )}

              {/* Mandate Status for OWNS */}
              {relType === 'OWNS' && mandateStatus && (
                <MetadataRow 
                  label="Mandate Status" 
                  value={
                    <Chip
                      label={mandateStatus}
                      size="small"
                      sx={{
                        bgcolor: mandateStatus === 'Active' ? '#10b981' : 
                                 mandateStatus === 'At Risk' ? '#ef4444' : 
                                 mandateStatus === 'Conversion in Progress' ? '#f59e0b' : '#6b7280',
                        color: 'white',
                        fontSize: '0.7rem',
                        height: 20,
                        fontWeight: 'bold'
                      }}
                    />
                  }
                />
              )}

              {/* OWNS specific properties (typically for Incumbent Products) */}
              {relType === 'OWNS' && edgeData.commitment_market_value && (
                <MetadataRow 
                  label="Commitment Market Value" 
                  value={
                    <Chip
                      label={`${Number(edgeData.commitment_market_value).toLocaleString()}`}
                      size="small"
                      sx={{
                        bgcolor: '#3b82f620',
                        color: '#3b82f6',
                        fontSize: '0.7rem',
                        height: 20,
                        fontWeight: 'bold',
                        fontFamily: 'monospace'
                      }}
                    />
                  }
                />
              )}

              {relType === 'OWNS' && edgeData.consultant && (
                <MetadataRow 
                  label="Associated Consultant" 
                  value={edgeData.consultant}
                  valueColor="#6366f1"
                />
              )}

              {relType === 'OWNS' && edgeData.manager && (
                <MetadataRow 
                  label="Manager" 
                  value={edgeData.manager}
                  valueColor="#10b981"
                />
              )}

              {relType === 'OWNS' && edgeData.manager_since_date && (
                <MetadataRow 
                  label="Manager Since" 
                  value={
                    <Chip
                      label={new Date(edgeData.manager_since_date).toLocaleDateString()}
                      size="small"
                      sx={{
                        bgcolor: '#8b5cf620',
                        color: '#8b5cf6',
                        fontSize: '0.7rem',
                        height: 20,
                        fontWeight: 'medium'
                      }}
                    />
                  }
                />
              )}

              {relType === 'OWNS' && edgeData.multi_mandate_manager && edgeData.multi_mandate_manager !== undefined && (
                <MetadataRow 
                  label="Multi-Mandate Manager" 
                  value={
                    <Chip
                      label={edgeData.multi_mandate_manager === 'Y' || edgeData.multi_mandate_manager === true ? 'Yes' : 'No'}
                      size="small"
                      sx={{
                        bgcolor: (edgeData.multi_mandate_manager === 'Y' || edgeData.multi_mandate_manager === true) ? '#f59e0b20' : '#6b728020',
                        color: (edgeData.multi_mandate_manager === 'Y' || edgeData.multi_mandate_manager === true) ? '#f59e0b' : '#6b7280',
                        fontSize: '0.7rem',
                        height: 20,
                        fontWeight: 'bold'
                      }}
                    />
                  }
                />
              )}

              {/* Rating for RATES */}
              {relType === 'RATES' && rating && (
                <MetadataRow 
                  label="Rating" 
                  value={
                    <Chip
                      label={rating}
                      size="small"
                      sx={{
                        bgcolor: rating === 'Positive' ? '#16a34a' : 
                                 rating === 'Negative' ? '#dc2626' : 
                                 rating === 'Introduced' ? '#0891b2' : '#6b7280',
                        color: 'white',
                        fontSize: '0.7rem',
                        height: 20,
                        fontWeight: 'bold'
                      }}
                    />
                  }
                />
              )}

              {/* BI_RECOMMENDS specific metrics */}
              {relType === 'BI_RECOMMENDS' && (
                <>
                  {edgeData.annualised_alpha_summary && (
                    <MetadataRow 
                      label="Annualised Alpha Summary" 
                      value={edgeData.annualised_alpha_summary}
                      valueColor="#f59e0b"
                    />
                  )}

                  {edgeData.batting_average_summary && (
                    <MetadataRow 
                      label="Batting Average Summary" 
                      value={edgeData.batting_average_summary}
                      valueColor="#f59e0b"
                    />
                  )}

                  {edgeData.downside_market_capture_summary && (
                    <MetadataRow 
                      label="Downside Market Capture Summary" 
                      value={edgeData.downside_market_capture_summary}
                      valueColor="#f59e0b"
                    />
                  )}

                  {edgeData.information_ratio_summary && (
                    <MetadataRow 
                      label="Information Ratio Summary" 
                      value={edgeData.information_ratio_summary}
                      valueColor="#f59e0b"
                    />
                  )}

                  {edgeData.opportunity_type && (
                    <MetadataRow 
                      label="Opportunity Type" 
                      value={
                        <Chip 
                          label={edgeData.opportunity_type}
                          size="small"
                          sx={{
                            bgcolor: '#f59e0b20',
                            color: '#f59e0b',
                            fontSize: '0.7rem',
                            height: 20,
                            fontWeight: 'medium'
                          }}
                        />
                      }
                    />
                  )}

                  {edgeData.returns && (
                    <MetadataRow 
                      label="Returns" 
                      value={edgeData.returns}
                      valueColor="#f59e0b"
                    />
                  )}

                  {edgeData.returns_summary && (
                    <MetadataRow 
                      label="Returns Summary" 
                      value={edgeData.returns_summary}
                      valueColor="#f59e0b"
                    />
                  )}

                  {edgeData.standard_deviation_summary && (
                    <MetadataRow 
                      label="Standard Deviation Summary" 
                      value={edgeData.standard_deviation_summary}
                      valueColor="#f59e0b"
                    />
                  )}

                  {edgeData.upside_market_capture_summary && (
                    <MetadataRow 
                      label="Upside Market Capture Summary" 
                      value={edgeData.upside_market_capture_summary}
                      valueColor="#f59e0b"
                    />
                  )}
                </>
              )}

              {/* Connection Strength for other relationships */}
              {edgeData.strength && relType !== 'COVERS' && (
                <MetadataRow 
                  label="Connection Strength" 
                  value={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={Number(edgeData.strength)} 
                        sx={{ 
                          flexGrow: 1,
                          height: 6, 
                          borderRadius: 3,
                          bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: Number(edgeData.strength) >= 80 ? '#10b981' : 
                                     Number(edgeData.strength) >= 60 ? '#f59e0b' : '#ef4444',
                            borderRadius: 3
                          }
                        }}
                      />
                      <Typography variant="caption" sx={{ 
                        color: Number(edgeData.strength) >= 80 ? '#10b981' : 
                               Number(edgeData.strength) >= 60 ? '#f59e0b' : '#ef4444',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        minWidth: 'fit-content'
                      }}>
                        {edgeData.strength}%
                      </Typography>
                    </Box>
                  }
                />
              )}

              {/* Influenced Consultant */}
              {edgeData.influencedConsultant && (
                <MetadataRow 
                  label="Influenced Consultant" 
                  value={edgeData.influencedConsultant}
                  valueColor="#6366f1"
                />
              )}

            </TableBody>
          </Table>
        </Box>
      </Box>
    );
  }

  return null;
};