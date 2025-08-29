import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  LinearProgress, 
  Avatar, 
  Divider,
  IconButton,
  Fade,
  Stack
} from '@mui/material';
import { 
  Person, 
  Business, 
  AccountBalance, 
  TrendingUp,
  Email,
  LocationOn,
  Timeline,
  Star,
  Close,
  CallMade
} from '@mui/icons-material';
import { Node, Edge } from 'reactflow';
import { AppNodeData, EdgeData } from '../types/GraphTypes';

interface MetadataPanelProps {
  selectedNode?: Node<AppNodeData> | null;
  selectedEdge?: Edge<EdgeData> | null;
  onClose: () => void;
  isHover?: boolean;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ 
  selectedNode, 
  selectedEdge, 
  onClose,
  isHover = false
}) => {
  if (!selectedNode && !selectedEdge) return null;

  const getNodeIcon = (type?: string) => {
    switch (type) {
      case 'CONSULTANT': return <Person sx={{ color: '#6366f1' }} />;
      case 'FIELD_CONSULTANT': return <Business sx={{ color: '#6366f1' }} />;
      case 'COMPANY': return <AccountBalance sx={{ color: '#10b981' }} />;
      case 'PRODUCT': return <TrendingUp sx={{ color: '#3b82f6' }} />;
      default: return <Person />;
    }
  };

  const getNodeColor = (type?: string) => {
    switch (type) {
      case 'CONSULTANT': 
      case 'FIELD_CONSULTANT': 
        return 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';
      case 'COMPANY': 
        return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'PRODUCT': 
        return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      default: 
        return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
    }
  };

  const getPerformanceColor = (performance?: number) => {
    if (!performance) return '#6b7280';
    if (performance >= 80) return '#10b981';
    if (performance >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const renderNodeDetails = () => {
    if (!selectedNode) return null;

    const { data, type } = selectedNode;

    return (
      <Fade in timeout={300}>
        <Card sx={{ 
          background: getNodeColor(type),
          color: 'white',
          borderRadius: isHover ? 2 : 3,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: isHover ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 12px 48px rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          {/* Header */}
          <CardContent sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 40, height: 40 }}>
                  {getNodeIcon(type)}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                    {data.label}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {type?.replace('_', ' ').toLowerCase()}
                  </Typography>
                </Box>
              </Box>
              {!isHover && (
                <IconButton onClick={onClose} sx={{ color: 'white', p: 0.5 }}>
                  <Close fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* Performance Indicator */}
            {data.performance && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    Performance Score
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {data.performance}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={data.performance} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: 4
                    }
                  }}
                />
              </Box>
            )}
          </CardContent>

          {/* Details Grid */}
          {!isHover && (
            <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
              <CardContent>
              <Stack spacing={2}>
                {/* Contact Info */}
                {(data.contact || data.region) && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Email fontSize="small" /> Contact Information
                    </Typography>
                    <Stack spacing={1}>
                      {data.contact && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ opacity: 0.8 }}>Email:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{data.contact}</Typography>
                        </Box>
                      )}
                      {data.region && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOn fontSize="small" sx={{ opacity: 0.8 }} />
                          <Typography variant="body2">{data.region}</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                )}

                {/* Specialization & Status */}
                {(data.specialization || data.status || data.assetClass) && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Details
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {data.specialization && (
                        <Chip 
                          label={data.specialization} 
                          size="small" 
                          sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                        />
                      )}
                      {data.status && (
                        <Chip 
                          label={data.status} 
                          size="small" 
                          sx={{ bgcolor: '#10b981', color: 'white' }}
                        />
                      )}
                      {data.assetClass && (
                        <Chip 
                          label={data.assetClass} 
                          size="small" 
                          sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                        />
                      )}
                    </Stack>
                  </Box>
                )}

                {/* Influence Level */}
                {data.influence && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Star fontSize="small" /> Influence Level
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={data.influence} 
                        sx={{ 
                          flexGrow: 1,
                          height: 6, 
                          borderRadius: 3,
                          bgcolor: 'rgba(255, 255, 255, 0.2)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: '#fbbf24',
                            borderRadius: 3
                          }
                        }}
                      />
                      <Typography variant="caption" sx={{ fontWeight: 'bold', minWidth: 'fit-content' }}>
                        {data.influence}%
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Ratings */}
                {data.ratings && data.ratings.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Timeline fontSize="small" /> Recent Ratings
                    </Typography>
                    <Stack spacing={1}>
                      {data.ratings.slice(0, 4).map((rating, index) => (
                        <Box 
                          key={index}
                          sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            p: 1,
                            borderRadius: 1,
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {rating.consultant}
                          </Typography>
                          <Chip
                            size="small"
                            label={rating.rankgroup}
                            sx={{
                              bgcolor: rating.rankgroup === 'Positive' ? '#16a34a' : 
                                       rating.rankgroup === 'Negative' ? '#dc2626' : '#0891b2',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.7rem'
                            }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Duration */}
                {data.duration && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Relationship Duration:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {data.duration}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Box>
          )}
        </Card>
      </Fade>
    );
  };

  const renderEdgeDetails = () => {
    if (!selectedEdge) return null;

    const { data = {} } = selectedEdge;

    return (
      <Fade in timeout={300}>
        <Card sx={{ 
          background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
          color: 'white',
          borderRadius: isHover ? 2 : 3,
          overflow: 'hidden',
          boxShadow: isHover ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 12px 48px rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CallMade sx={{ color: '#6366f1' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {data.relType || 'Connection'}
                </Typography>
              </Box>
              {!isHover && (
                <IconButton onClick={onClose} sx={{ color: 'white', p: 0.5 }}>
                  <Close fontSize="small" />
                </IconButton>
              )}
            </Box>

            <Stack spacing={2}>
              {data.mandateStatus && (
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>Status</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {data.mandateStatus}
                  </Typography>
                </Box>
              )}

              {data.strength && (
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>Strength</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={data.strength} 
                      sx={{ 
                        flexGrow: 1,
                        height: 4, 
                        borderRadius: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#10b981',
                          borderRadius: 2
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                      {data.strength}%
                    </Typography>
                  </Box>
                </Box>
              )}

              {data.duration && (
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>Duration</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {data.duration}
                  </Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Fade>
    );
  };

  return (
    <Box sx={{ 
      position: 'absolute',
      top: isHover ? 16 : 'auto',
      bottom: isHover ? 'auto' : 16,
      right: isHover ? 16 : 'auto',
      left: isHover ? 'auto' : 16,
      maxWidth: isHover ? 320 : 400,
      zIndex: 1000,
      pointerEvents: isHover ? 'none' : 'auto'
    }}>
      {selectedNode && renderNodeDetails()}
      {selectedEdge && renderEdgeDetails()}
    </Box>
  );
};