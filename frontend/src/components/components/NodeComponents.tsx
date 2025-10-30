import React, { useState } from 'react';
import { Handle, Position, NodeProps, EdgeProps } from 'reactflow';
import { 
  Box, 
  Typography, 
  Divider, 
  Chip, 
  Stack, 
  LinearProgress,
  Tooltip
} from '@mui/material';
import { 
  BusinessCenter,        
  Person,               
  CorporateFare,        
  AccountBalance,       
  TrendingUp,           
  Assessment,           
  Analytics,            
  ShowChart,
  Psychology,          
  Recommend,           
  AutoAwesome,          
  Star,                 
  WorkOutline,          
  Support
} from '@mui/icons-material';

import { AppNodeData, EdgeData, RankGroup } from '../types/GraphTypes';
import { 
  getConsultantColorById,
  APP_THEME_COLORS,
  ENTITY_COLORS,
  STATUS_COLORS
} from '../config/ConsultantColors';
import { ManagerRosterButton } from './ManagerRosterButton';

// Helper function to find the consultant this field consultant belongs to
const findParentConsultant = (fieldConsultantData: AppNodeData) => {
  if (fieldConsultantData.parent_consultant_id) {
    return fieldConsultantData.parent_consultant_id;
  }
  
  if (fieldConsultantData.consultant_id) {
    return fieldConsultantData.consultant_id;
  }
  
  if (fieldConsultantData.parentConsultantId) {
    return fieldConsultantData.parentConsultantId;
  }
  
  if (fieldConsultantData.id) {
    let consultantId = fieldConsultantData.id;
    
    if (consultantId.includes('_F')) {
      consultantId = consultantId.replace('_F', '_C');
    } else if (consultantId.includes('FIELD_CONSULTANT')) {
      consultantId = consultantId.replace('FIELD_CONSULTANT', 'CONSULTANT');
    } else if (consultantId.includes('FIELD')) {
      consultantId = consultantId.replace('FIELD', 'CONSULTANT');
    } else {
      const parts = consultantId.split('_');
      if (parts.length >= 2) {
        consultantId = `${parts[0]}_C${parts[parts.length - 1]}`;
      }
    }
    return consultantId;
  }
  
  if (fieldConsultantData.pca) {
    return fieldConsultantData.pca;
  }
  
  if (fieldConsultantData.name) {
    const nameMatch = fieldConsultantData.name.match(/(\w+)\s*\d*\s*\((\w+)\)/);
    if (nameMatch) {
      const region = nameMatch[2];
      const number = fieldConsultantData.id?.match(/\d+$/)?.[0] || '1';
      const consultantId = `${region}_C${number}`;
      return consultantId;
    }
  }
  
  return fieldConsultantData.id || 'default';
};


export const ConsultantNode = React.memo(function ConsultantNode({ data }: NodeProps<AppNodeData>) {
  const [isHovered, setIsHovered] = useState(false);
  
  const colors = ENTITY_COLORS.consultant;
  
  const consultantAdvisor = data.consultant_advisor;
  const pca = data.pca;

  return (
    <div 
      style={{ 
        padding: 16, 
        background: '#1a1a2e', 
        color: '#ffffff', 
        borderRadius: 16, 
        minWidth: 200, 
        maxWidth: 240,
        textAlign: 'center',
        boxShadow: isHovered ? `0 8px 32px ${colors.primary}66` : `0 4px 16px ${colors.primary}33`,
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: `2px solid ${colors.primary}`,
        backdropFilter: 'blur(10px)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 1 }}>
        <BusinessCenter sx={{ fontSize: '1.5rem', color: colors.primary }} />
        <Typography variant="caption" sx={{ 
          color: '#ffffff', 
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontSize: '0.7rem'
        }}>
          Consultant
        </Typography>
      </Box>
      
      <Typography variant="body1" sx={{ 
        fontWeight: 'bold', 
        fontSize: '0.95rem', 
        color: colors.primary,
        mb: 0.5
      }}>
        {data.name}
      </Typography>

      {(consultantAdvisor || pca) && (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 0.5, 
          mt: 1,
          alignItems: 'stretch',
          width: '100%'
        }}>
          {consultantAdvisor && (
            <Tooltip 
              title={`Consultant Advisor: ${Array.isArray(consultantAdvisor) ? consultantAdvisor.join(', ') : consultantAdvisor}`} 
              arrow 
              placement="top"
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 0.8,
                  borderRadius: 1.5,
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  border: `1px solid ${colors.primary}40`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                  <Support sx={{ fontSize: '0.8rem', color: colors.primary }} />
                  <Typography variant="caption" sx={{ 
                    fontSize: '0.7rem', 
                    color: '#ffffff',
                    fontWeight: 'medium'
                  }}>
                    Consultant Advisor
                  </Typography>
                </Box>
                
                <Typography variant="caption" sx={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 'bold',
                  color: colors.primary
                }}>
                  {Array.isArray(consultantAdvisor) 
                    ? consultantAdvisor.length > 1 
                      ? `${consultantAdvisor[0].split(' ')[0]}+${consultantAdvisor.length - 1}`
                      : consultantAdvisor[0].split(' ')[0]
                    : consultantAdvisor.split(' ')[0]}
                </Typography>
              </Box>
            </Tooltip>
          )}
          
          {pca && (
            <Tooltip 
              title={`Primary Consultant Advisor: ${Array.isArray(pca) ? pca.join(', ') : pca}`} 
              arrow 
              placement="top"
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 0.8,
                  borderRadius: 1.5,
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  border: `1px solid ${colors.primary}40`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                  <Star sx={{ fontSize: '0.8rem', color: colors.primary }} />
                  <Typography variant="caption" sx={{ 
                    fontSize: '0.7rem', 
                    color: '#ffffff',
                    fontWeight: 'medium'
                  }}>
                    Primary CA
                  </Typography>
                </Box>
                
                <Typography variant="caption" sx={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 'bold',
                  color: colors.primary
                }}>
                  {Array.isArray(pca) 
                    ? pca.length > 1 
                      ? `${pca[0].split(' ')[0]}+${pca.length - 1}`
                      : pca[0].split(' ')[0]
                    : pca.split(' ')[0]}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Box>
      )}
      
      <Handle type="source" position={Position.Bottom} style={{ background: colors.primary }} />
    </div>
  );
});

export const FieldConsultantNode = React.memo(function FieldConsultantNode({ data }: NodeProps<AppNodeData>) {
  const [isHovered, setIsHovered] = useState(false);
  
  const parentConsultantId = findParentConsultant(data);
  const colors = ENTITY_COLORS.fieldConsultant;
  
  return (
    <div 
      style={{ 
        padding: 16, 
        background: '#1a1a2e', 
        color: '#ffffff', 
        borderRadius: 16, 
        minWidth: 200, 
        textAlign: 'center',
        boxShadow: isHovered ? `0 8px 32px ${colors.primary}66` : `0 4px 16px ${colors.primary}33`,
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: `2px solid ${colors.primary}`,
        backdropFilter: 'blur(10px)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.primary }} />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 1 }}>
        <Person sx={{ fontSize: '1.5rem', color: colors.primary }} />
        <Typography variant="caption" sx={{ 
          color: '#ffffff', 
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontSize: '0.7rem'
        }}>
          Field Consultant
        </Typography>
      </Box>
      <Typography variant="body1" sx={{ 
        fontWeight: 'bold', 
        fontSize: '0.95rem', 
        color: colors.primary,
        mb: 0.5
      }}>
        {data.name}
      </Typography>
      
      <Box sx={{
        mt: 1,
        width: '80%',
        height: '2px',
        background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        borderRadius: '2px',
        mx: 'auto'
      }} />
      
      <Handle type="source" position={Position.Bottom} style={{ background: ENTITY_COLORS.company.primary }} />
    </div>
  );
});

export const CompanyNode = React.memo(function CompanyNode({ data }: NodeProps<AppNodeData>) {
  const [isHovered, setIsHovered] = useState(false);
  
  const colors = ENTITY_COLORS.company;
  
  return (
    <div 
      style={{ 
        padding: 16, 
        background: '#1a1a2e', 
        color: '#ffffff', 
        borderRadius: 16, 
        minWidth: 220, 
        textAlign: 'center',
        boxShadow: isHovered ? `0 8px 32px ${colors.primary}66` : `0 4px 16px ${colors.primary}33`,
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: `2px solid ${colors.primary}`,
        backdropFilter: 'blur(10px)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box sx={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10
      }}>
        <ManagerRosterButton 
          companyId={data.id}
          companyName={data.name}
          isDarkTheme={true}
        />
      </Box>
      <Handle type="target" position={Position.Top} style={{ background: 'inherit' }} />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 1 }}>
        <CorporateFare sx={{ fontSize: '1.5rem', color: colors.primary }} />
        <Typography variant="caption" sx={{ 
          color: '#ffffff', 
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontSize: '0.7rem'
        }}>
          Company
        </Typography>
      </Box>
      <Typography variant="body1" sx={{ 
        fontWeight: 'bold', 
        fontSize: '0.95rem', 
        color: colors.primary,
        mb: 0.5
      }}>
        {data.name}
      </Typography>
      <Handle type="source" position={Position.Bottom} style={{ background: ENTITY_COLORS.product.primary }} />
    </div>
  );
});


export const IncumbentProductNode = React.memo(function IncumbentProductNode({ data }: NodeProps<AppNodeData>) {
  const [isHovered, setIsHovered] = useState(false);
  
  const colors = {
    primary: '#f59e0b',
    secondary: '#d97706',
    light: '#1a1a2e'
  };
  
  return (
    <div 
      style={{ 
        padding: 18, 
        background: colors.light, 
        color: '#ffffff', 
        borderRadius: 18, 
        minWidth: 280, 
        textAlign: 'center',
        boxShadow: isHovered ? `0 12px 48px ${colors.primary}40` : `0 6px 24px ${colors.primary}20`,
        transform: isHovered ? 'scale(1.03)' : 'scale(1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: `2px solid ${colors.primary}`,
        backdropFilter: 'blur(20px)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Handle type="target" position={Position.Top} style={{ background: ENTITY_COLORS.company.primary }} />
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, gap: 1 }}>
        <Psychology sx={{ fontSize: '1.5rem', color: colors.primary }} />
        <Box sx={{ textAlign: 'left' }}>
          <Typography variant="caption" sx={{ 
            color: '#ffffff', 
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontSize: '0.7rem',
            display: 'block'
          }}>
            Incumbent Product
          </Typography>
          <Typography variant="caption" sx={{ 
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.65rem',
            display: 'block'
          }}>
            Recommendation Engine
          </Typography>
        </Box>
      </Box>

      <Typography variant="body1" sx={{ 
        fontWeight: 'bold', 
        fontSize: '1rem', 
        color: colors.primary,
        mb: 1
      }}>
        {data.name}
      </Typography>

      <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
        {data.evestment_product_guid && (
          <Chip 
            label={`GUID: ${data.evestment_product_guid.slice(0, 8)}...`}
            size="small"
            sx={{
              bgcolor: `${colors.primary}20`,
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 'bold'
            }}
          />
        )}
        
        {data.manager && (
          <Chip 
            label={`Manager: ${data.manager}`}
            size="small"
            icon={<WorkOutline sx={{ fontSize: '0.8rem', color: '#ffffff' }} />}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 'medium',
              '& .MuiChip-icon': {
                color: '#ffffff'
              }
            }}
          />
        )}
      </Box>
      
      <Handle type="source" position={Position.Bottom} style={{ background: ENTITY_COLORS.product.primary }} />
    </div>
  );
});


export const ProductNode = React.memo(function ProductNode({ data }: NodeProps<AppNodeData>) {
  const [isHovered, setIsHovered] = useState(false);
  
  const colors = ENTITY_COLORS.product;
  
  const colorFor = (rg: RankGroup) =>
    rg === 'Positive' ? STATUS_COLORS.positive : 
    rg === 'Negative' ? STATUS_COLORS.negative : 
    rg === 'Introduced' ? STATUS_COLORS.neutral : 
    rg === 'Neutral' ? STATUS_COLORS.neutral : STATUS_COLORS.neutral;

  const getAssociatedConsultants = () => {
    if (data.consultant_name) {
      return Array.isArray(data.consultant_name) ? data.consultant_name : [data.consultant_name];
    }
    return [];
  };
  
  const associatedConsultants = getAssociatedConsultants();
  const hasConsultantInfluence = associatedConsultants.length > 0;
  
  const getProductIcon = () => {
    const assetClass = data.asset_class?.toLowerCase();
    switch (assetClass) {
      case 'equities':
        return <ShowChart sx={{ fontSize: '1.5rem', color: colors.primary }} />;
      case 'fixed income':
        return <AccountBalance sx={{ fontSize: '1.5rem', color: colors.primary }} />;
      case 'alternatives':
        return <Analytics sx={{ fontSize: '1.5rem', color: colors.primary }} />;
      case 'real estate':
        return <CorporateFare sx={{ fontSize: '1.5rem', color: colors.primary }} />;
      default:
        return <TrendingUp sx={{ fontSize: '1.5rem', color: colors.primary }} />;
    }
  };

  return (
    <div 
      style={{ 
        padding: 18, 
        background: '#1a1a2e', 
        color: '#ffffff', 
        borderRadius: 18, 
        minWidth: 260, 
        textAlign: 'center',
        boxShadow: isHovered ? `0 12px 48px ${colors.primary}40` : `0 6px 24px ${colors.primary}20`,
        transform: isHovered ? 'scale(1.03)' : 'scale(1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: `2px solid ${colors.primary}`,
        backdropFilter: 'blur(20px)',
        position: 'relative'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Handle type="target" position={Position.Top} style={{ background: ENTITY_COLORS.company.primary }} />
      
      {hasConsultantInfluence && (
        <Box sx={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 24,
          height: 24,
          borderRadius: '50%',
          bgcolor: '#6366f1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
          zIndex: 10
        }}>
          <Star sx={{ fontSize: '0.9rem', color: 'white' }} />
        </Box>
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, gap: 1 }}>
        {getProductIcon()}
        <Box sx={{ textAlign: 'left' }}>
          <Typography variant="caption" sx={{ 
            color: '#ffffff', 
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontSize: '0.7rem',
            display: 'block'
          }}>
            Product
          </Typography>
          <Typography variant="caption" sx={{ 
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.65rem',
            display: 'block'
          }}>
            {data.asset_class || 'Investment Solution'}
          </Typography>
        </Box>
      </Box>

      <Typography variant="body1" sx={{ 
        fontWeight: 'bold', 
        fontSize: '1rem', 
        color: colors.primary,
        mb: 1
      }}>
        {data.name}
      </Typography>

      {(data.universe_name || data.universe_score) && (
        <Box sx={{ mb: 1 }}>
          {data.universe_name && (
            <Chip 
              label={data.universe_name}
              size="small"
              sx={{
                bgcolor: `${colors.primary}20`,
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                mr: 0.5
              }}
            />
          )}
          {data.universe_score && (
            <Chip 
              label={`Score: ${data.universe_score}`}
              size="small"
              sx={{
                bgcolor: `${colors.primary}30`,
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 'bold'
              }}
            />
          )}
        </Box>
      )}

      <Divider sx={{ my: 1.5, borderColor: `${colors.primary}30` }} />
      
      {associatedConsultants.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.8 }}>
            <Star sx={{ fontSize: '0.9rem', color: '#ffd700' }} />
            <Typography variant="caption" sx={{ 
              color: '#ffd700', 
              fontWeight: 'bold',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>
              Associated Consultant{associatedConsultants.length > 1 ? 's' : ''}
            </Typography>
          </Box>
          <Stack direction="column" spacing={0.5}>
            {associatedConsultants.map((consultant, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 0.8,
                  borderRadius: 1.5,
                  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 193, 7, 0.1) 100%)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5
                }}
              >
                <BusinessCenter sx={{ fontSize: '0.8rem', color: '#ffd700' }} />
                <Typography variant="caption" sx={{ 
                  fontSize: '0.7rem', 
                  color: '#ffd700',
                  fontWeight: 'medium'
                }}>
                  {consultant}
                </Typography>
              </Box>
            ))}
          </Stack>
          <Divider sx={{ my: 1.5, borderColor: `${colors.primary}30` }} />
        </Box>
      )}
      
      <Box sx={{ fontSize: 11 }}>
        {data.ratings?.length ? (
          <Stack direction="column" spacing={0.5} sx={{ alignItems: 'stretch' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
              <Assessment sx={{ fontSize: '1rem', color: colors.primary }} />
              <Typography variant="caption" sx={{ 
                color: '#ffffff', 
                fontWeight: 'bold',
                fontSize: '0.75rem'
              }}>
                Consultant Ratings
              </Typography>
              <Chip 
                label={`${data.ratings.length}${associatedConsultants.length > 0 ? ' +★' : ''}`}
                size="small"
                sx={{
                  bgcolor: associatedConsultants.length > 0 ? '#ffd70020' : `${colors.primary}20`,
                  color: associatedConsultants.length > 0 ? '#ffd700' : '#ffffff',
                  fontSize: '0.6rem',
                  height: 16,
                  fontWeight: 'bold'
                }}
              />
            </Box>
            {(() => {
              const sortedRatings = [...data.ratings].sort((a, b) => {
                if (a.is_main_consultant && !b.is_main_consultant) return -1;
                if (!a.is_main_consultant && b.is_main_consultant) return 1;
                return (a.consultant || '').localeCompare(b.consultant || '');
              });
              
              return sortedRatings.slice(0, 3).map((r: any, i: number) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 0.8,
                    borderRadius: 1.5,
                    backgroundColor: r.is_main_consultant 
                      ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 193, 7, 0.1) 100%)'
                      : `${colors.primary}15`,
                    border: r.is_main_consultant 
                      ? '2px solid rgba(255, 215, 0, 0.4)'
                      : `1px solid ${colors.primary}20`,
                    boxShadow: r.is_main_consultant 
                      ? '0 2px 8px rgba(255, 215, 0, 0.2)'
                      : 'none',
                    position: 'relative'
                  }}
                >
                  {r.is_main_consultant && (
                    <Box sx={{
                      position: 'absolute',
                      top: -6,
                      left: -6,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      bgcolor: '#ffd700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                      zIndex: 10
                    }}>
                      <Star sx={{ fontSize: '0.7rem', color: '#fff' }} />
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                    <Typography variant="caption" sx={{ 
                      fontSize: '0.7rem', 
                      color: r.is_main_consultant ? '#ffd700' : '#ffffff',
                      fontWeight: r.is_main_consultant ? 'bold' : 'medium',
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {r.consultant}
                    </Typography>
                    
                    {r.is_main_consultant && (
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
                    size="small"
                    label={r.rankgroup}
                    sx={{
                      backgroundColor: colorFor(r.rankgroup),
                      color: '#fff',
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      '& .MuiChip-label': { px: 1.5 },
                      boxShadow: r.is_main_consultant ? '0 2px 4px rgba(0, 0, 0, 0.2)' : 'none'
                    }}
                  />
                </Box>
              ));
            })()}
            {data.ratings.length > 3 && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <Typography variant="caption" sx={{ 
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.65rem'
                }}>
                  +{data.ratings.length - 3} more ratings
                </Typography>
                {data.ratings.length > 3 && 
                 data.ratings.slice(3).some((r: any) => r.is_main_consultant) && (
                  <Star sx={{ fontSize: '0.6rem', color: '#ffd700' }} />
                )}
              </Box>
            )}
          </Stack>
        ) : (
          <Typography variant="caption" sx={{ 
            opacity: 0.7, 
            fontStyle: 'italic', 
            color: '#ffffff',
            fontSize: '0.75rem'
          }}>
            No ratings available
          </Typography>
        )}
      </Box>
    </div>
  );
});


export const CustomEdge = React.memo(function CustomEdge({
  id, sourceX, sourceY, targetX, targetY, selected, data,
}: EdgeProps<EdgeData>) {
  const [isHovered, setIsHovered] = useState(false);
  
  const edgeData = data || {};
  const relType = edgeData.relType;
  const mandateStatus = edgeData.mandate_status;
  const levelOfInfluence = edgeData.level_of_influence;
  const rating = edgeData.rating;
  
  const getEdgeColor = (relType?: string, mandateStatus?: string) => {
    switch (relType) {
      case 'EMPLOYS': return 'url(#employs-gradient)';
      case 'COVERS': return 'url(#employs-gradient)';
      case 'RATES': return 'url(#rates-gradient)';
      case 'BI_RECOMMENDS': return 'url(#bi-recommends-gradient)';
      case 'OWNS': 
        switch (mandateStatus) {
          case 'Active': return STATUS_COLORS.active;
          case 'At Risk': return STATUS_COLORS.atRisk;
          case 'Conversion in Progress': return STATUS_COLORS.inProgress;
          default: return 'url(#owns-gradient)';
        }
      default: return '#94a3b8';
    }
  };

  const getEdgeWidth = (relType?: string, levelOfInfluence?: string | number) => {
    if (relType === 'COVERS' && levelOfInfluence) {
      const widthMap: { [key: string]: number } = {
        'UNK': 6,
        '1': 6,
        '2': 10,
        '3': 14,
        '4': 14,
        'High': 14,
        'medium': 10,
        'low': 6
      };
      
      const influenceKey = String(levelOfInfluence);
      const baseWidth = widthMap[influenceKey] || 8;
      return isHovered ? baseWidth + 3 : baseWidth;
    }
    
    if (relType === 'BI_RECOMMENDS') {
      return isHovered ? 12 : 8;
    }
    
    return isHovered ? 10 : selected ? 8 : 6;
  };

  const stroke = getEdgeColor(relType, mandateStatus);
  const width = getEdgeWidth(relType, levelOfInfluence);
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  const edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

  const getLabelText = () => {
    if (relType === 'COVERS') return 'COVERS';
    if (relType === 'RATES' && rating) return rating;
    if (relType === 'OWNS') return 'OWNS';
    if (relType === 'BI_RECOMMENDS') return 'BI RECOMMENDS';
    return relType || '';
  };

  const getLabelColor = () => {
    if (relType === 'OWNS' && mandateStatus) {
      switch (mandateStatus) {
        case 'Active': return { bg: STATUS_COLORS.active, text: 'white' };
        case 'At Risk': return { bg: STATUS_COLORS.atRisk, text: 'white' };
        case 'Conversion in Progress': return { bg: STATUS_COLORS.inProgress, text: 'white' };
        default: return { bg: APP_THEME_COLORS.surface, text: 'white' };
      }
    }
    if (relType === 'BI_RECOMMENDS') {
      return { bg: '#f59e0b', text: 'white' };
    }
    return { bg: APP_THEME_COLORS.surface, text: 'white' };
  };

  const getTooltipContent = () => {
    const parts = [];
    if (relType) parts.push(`Relationship: ${relType}`);
    if (mandateStatus) parts.push(`Status: ${mandateStatus}`);
    if (levelOfInfluence) parts.push(`Influence: ${levelOfInfluence}`);
    if (rating) parts.push(`Rating: ${rating}`);
    return parts.join(' | ');
  };

  return (
    <g>
      <defs>
        <linearGradient id="employs-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={APP_THEME_COLORS.primary} />
          <stop offset="100%" stopColor={APP_THEME_COLORS.secondary} />
        </linearGradient>
        <linearGradient id="covers-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={APP_THEME_COLORS.primary} />
          <stop offset="100%" stopColor={ENTITY_COLORS.company.primary} />
        </linearGradient>
        <linearGradient id="rates-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="owns-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={ENTITY_COLORS.company.primary} />
          <stop offset="100%" stopColor={ENTITY_COLORS.product.primary} />
        </linearGradient>
        <linearGradient id="bi-recommends-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      
      <path 
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth="30"
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <title>{getTooltipContent()}</title>
      </path>
      
      <path 
        id={id} 
        fill="none" 
        stroke={stroke} 
        strokeWidth={width} 
        d={edgePath}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ 
          filter: isHovered ? `drop-shadow(0 0 8px ${stroke})` : 'none',
          transition: 'all 0.3s ease',
          pointerEvents: 'none',
          opacity: 1,
          zIndex: 1,
          strokeDasharray: relType === 'BI_RECOMMENDS' ? '8 4' : 'none'
        }}
      />
      
      <path 
        id={`${id}-background`} 
        fill="none" 
        stroke="rgba(255, 255, 255, 0.1)" 
        strokeWidth={width + 2} 
        d={edgePath}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ 
          opacity: 0.3,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      
      {isHovered && getLabelText() && (
        <g>
          <rect
            x={midX - (relType === 'BI_RECOMMENDS' ? 55 : 40)}
            y={midY - 18}
            width={relType === 'BI_RECOMMENDS' ? 110 : 80}
            height={36}
            fill={getLabelColor().bg}
            rx={12}
            style={{ 
              opacity: 0.95,
              filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))',
              animation: 'fadeIn 0.2s ease-in'
            }}
          />
          
          <rect
            x={midX - (relType === 'BI_RECOMMENDS' ? 55 : 40)}
            y={midY - 18}
            width={relType === 'BI_RECOMMENDS' ? 110 : 80}
            height={36}
            fill="none"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1.5"
            rx={12}
          />
          
          <text 
            x={midX} 
            y={midY + 6} 
            textAnchor="middle" 
            style={{ 
              fontSize: relType === 'BI_RECOMMENDS' ? 13 : 11, 
              fill: getLabelColor().text, 
              fontWeight: 'bold',
              pointerEvents: 'none',
              letterSpacing: '0.3px'
            }}
          >
            {getLabelText()}
          </text>
          
          {relType === 'BI_RECOMMENDS' && (
            <text
              x={midX - 40}
              y={midY + 5}
              textAnchor="middle"
              style={{
                fontSize: 16,
                fill: 'white',
                pointerEvents: 'none'
              }}
            >
              ✨
            </text>
          )}
        </g>
      )}
    </g>
  );
});

export const nodeTypes = {
  CONSULTANT: ConsultantNode,
  FIELD_CONSULTANT: FieldConsultantNode,
  COMPANY: CompanyNode,
  PRODUCT: ProductNode,
  INCUMBENT_PRODUCT: IncumbentProductNode,
};

export const edgeTypes = { custom: CustomEdge };

export { APP_THEME_COLORS, ENTITY_COLORS, STATUS_COLORS };