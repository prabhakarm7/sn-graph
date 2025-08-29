import React, { useState } from 'react';
import { Handle, Position, NodeProps, EdgeProps } from 'reactflow';
import { 
  Box, 
  Typography, 
  Divider, 
  Chip, 
  Stack, 
  LinearProgress
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
  Psychology,          // For incumbent products
  Recommend,           // For incumbent products
  AutoAwesome          // For BI_RECOMMENDS edges
} from '@mui/icons-material';
import { AppNodeData, EdgeData, RankGroup } from '../types/GraphTypes';
import { 
  getConsultantColorById,
  APP_THEME_COLORS,
  ENTITY_COLORS,
  STATUS_COLORS
} from '../config/ConsultantColors';

// Helper function to find the consultant this field consultant belongs to
const findParentConsultant = (fieldConsultantData: AppNodeData) => {
  // Method 1: Use explicit parent_consultant_id from database (PREFERRED)
  if (fieldConsultantData.parent_consultant_id) {
    console.log(`🔗 Field consultant ${fieldConsultantData.id} -> Parent consultant ${fieldConsultantData.parent_consultant_id} (parent_consultant_id)`);
    return fieldConsultantData.parent_consultant_id+'asdasd';
  }
  
  // Method 2: Use consultant_id from database (NEW from database setup)
  if (fieldConsultantData.consultant_id) {
    console.log(`🔗 Field consultant ${fieldConsultantData.id} -> Parent consultant ${fieldConsultantData.consultant_id} (consultant_id)`);
    return fieldConsultantData.consultant_id;
  }
  
  // Method 3: Use legacy parentConsultantId if available (backward compatibility)
  if (fieldConsultantData.parentConsultantId) {
    console.log(`🔗 Field consultant ${fieldConsultantData.id} -> Parent consultant ${fieldConsultantData.parentConsultantId} (legacy parentConsultantId)`);
    return fieldConsultantData.parentConsultantId;
  }
  
  // Method 4: Extract from naming pattern (e.g., "NAI_F1" -> "NAI_C1")
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
    
    console.log(`🔗 Field consultant ${fieldConsultantData.id} -> Parent consultant ${consultantId} (pattern matching)`);
    return consultantId;
  }
  
  // Method 5: Use PCA if available (fallback)
  if (fieldConsultantData.pca) {
    console.log(`🔗 Field consultant ${fieldConsultantData.id} -> Using PCA ${fieldConsultantData.pca}`);
    return fieldConsultantData.pca;
  }
  
  // Method 6: Extract from name pattern
  if (fieldConsultantData.name) {
    const nameMatch = fieldConsultantData.name.match(/(\w+)\s*\d*\s*\((\w+)\)/);
    if (nameMatch) {
      const region = nameMatch[2];
      const number = fieldConsultantData.id?.match(/\d+$/)?.[0] || '1';
      const consultantId = `${region}_C${number}`;
      console.log(`🔗 Field consultant ${fieldConsultantData.id} -> Extracted from name: ${consultantId}`);
      return consultantId;
    }
  }
  
  // Fallback
  console.log(`🔗 Field consultant ${fieldConsultantData.id} -> Using own ID as fallback`);
  return fieldConsultantData.id || 'default';
};

export const ConsultantNode = React.memo(function ConsultantNode({ data }: NodeProps<AppNodeData>) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Get color from curated palette (imported from config)
  const colors = getConsultantColorById(data.id);
  
  return (
    <div 
      style={{ 
        padding: 16, 
        background: colors.light, 
        color: 'white', 
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 1 }}>
        <BusinessCenter sx={{ fontSize: '1.5rem', color: colors.primary }} />
        <Typography variant="caption" sx={{ 
          color: `${colors.primary}dd`, 
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
      
      {/* Color indicator */}
      <Box sx={{
        mt: 1,
        width: '100%',
        height: '3px',
        background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        borderRadius: '2px'
      }} />
      
      <Handle type="source" position={Position.Bottom} style={{ background: colors.primary }} />
    </div>
  );
});

export const FieldConsultantNode = React.memo(function FieldConsultantNode({ data }: NodeProps<AppNodeData>) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Get parent consultant's color (inherits from parent)
  const parentConsultantId = findParentConsultant(data);
  const colors = getConsultantColorById(parentConsultantId);
  
  return (
    <div 
      style={{ 
        padding: 16, 
        background: colors.light, 
        color: 'white', 
        borderRadius: 16, 
        minWidth: 200, 
        textAlign: 'center',
        boxShadow: isHovered ? `0 8px 32px ${colors.primary}66` : `0 4px 16px ${colors.primary}33`,
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: `2px dashed ${colors.primary}`, // Dashed border to show it's a subordinate
        backdropFilter: 'blur(10px)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.primary }} />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 1 }}>
        <Person sx={{ fontSize: '1.5rem', color: colors.primary }} />
        <Typography variant="caption" sx={{ 
          color: `${colors.primary}dd`, 
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
      
      {/* Color indicator - thinner for field consultant */}
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

// 🏢 COMPANY NODE COMPONENT
export const CompanyNode = React.memo(function CompanyNode({ data }: NodeProps<AppNodeData>) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Use fixed company colors (separate from consultants)
  const colors = ENTITY_COLORS.company;
  
  return (
    <div 
      style={{ 
        padding: 16, 
        background: colors.light, 
        color: 'white', 
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
      <Handle type="target" position={Position.Top} style={{ background: 'inherit' }} />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 1 }}>
        <CorporateFare sx={{ fontSize: '1.5rem', color: colors.primary }} />
        <Typography variant="caption" sx={{ 
          color: `${colors.primary}dd`, 
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

// 🏦 INCUMBENT PRODUCT NODE COMPONENT (NEW)
export const IncumbentProductNode = React.memo(function IncumbentProductNode({ data }: NodeProps<AppNodeData>) {
  const [isHovered, setIsHovered] = useState(false);
  
  // 🎨 DISTINCT COLOR SCHEME for incumbent products
  const colors = {
    primary: '#f59e0b',    // Amber for incumbent products
    secondary: '#d97706',  // Darker amber
    light: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)'
  };
  
  return (
    <div 
      style={{ 
        padding: 18, 
        background: colors.light, 
        color: 'white', 
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
            color: colors.primary, 
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

      {/* Show evestment_product_guid if available */}
      {data.evestment_product_guid && (
        <Chip 
          label={`GUID: ${data.evestment_product_guid.slice(0, 8)}...`}
          size="small"
          sx={{
            bgcolor: `${colors.primary}20`,
            color: colors.primary,
            fontSize: '0.65rem',
            fontWeight: 'bold',
            mb: 1
          }}
        />
      )}

      
      
      <Handle type="source" position={Position.Bottom} style={{ background: ENTITY_COLORS.product.primary }} />
    </div>
  );
});

// 🏦 PRODUCT NODE COMPONENT (Updated)
export const ProductNode = React.memo(function ProductNode({ data }: NodeProps<AppNodeData>) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Use fixed product colors (separate from consultants)
  const colors = ENTITY_COLORS.product;
  
  const colorFor = (rg: RankGroup) =>
    rg === 'Positive' ? STATUS_COLORS.positive : 
    rg === 'Negative' ? STATUS_COLORS.negative : 
    rg === 'Introduced' ? STATUS_COLORS.neutral : 
    rg === 'Neutral' ? STATUS_COLORS.neutral : STATUS_COLORS.neutral;

  // Determine product icon based on asset class
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
        background: colors.light, 
        color: 'white', 
        borderRadius: 18, 
        minWidth: 260, 
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
        {getProductIcon()}
        <Box sx={{ textAlign: 'left' }}>
          <Typography variant="caption" sx={{ 
            color: colors.primary, 
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

      {/* Show universe properties if available */}
      {(data.universe_name || data.universe_score) && (
        <Box sx={{ mb: 1 }}>
          {data.universe_name && (
            <Chip 
              label={data.universe_name}
              size="small"
              sx={{
                bgcolor: `${colors.primary}20`,
                color: colors.primary,
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
                color: colors.primary,
                fontSize: '0.65rem',
                fontWeight: 'bold'
              }}
            />
          )}
        </Box>
      )}

      <Divider sx={{ my: 1.5, borderColor: `${colors.primary}30` }} />
      
      <Box sx={{ fontSize: 11 }}>
        {data.ratings?.length ? (
          <Stack direction="column" spacing={0.5} sx={{ alignItems: 'stretch' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
              <Assessment sx={{ fontSize: '1rem', color: colors.primary }} />
              <Typography variant="caption" sx={{ 
                color: colors.primary, 
                fontWeight: 'bold',
                fontSize: '0.75rem'
              }}>
                Consultant Ratings
              </Typography>
            </Box>
            {data.ratings.slice(0, 3).map((r: any, i: number) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 0.8,
                  borderRadius: 1.5,
                  backgroundColor: `${colors.primary}15`,
                  border: `1px solid ${colors.primary}20`
                }}
              >
                <Typography variant="caption" sx={{ 
                  fontSize: '0.7rem', 
                  color: colors.primary,
                  fontWeight: 'medium'
                }}>
                  {r.consultant}
                </Typography>
                <Chip
                  size="small"
                  label={r.rankgroup}
                  sx={{
                    backgroundColor: colorFor(r.rankgroup),
                    color: '#fff',
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    '& .MuiChip-label': { px: 1.5 }
                  }}
                />
              </Box>
            ))}
            {data.ratings.length > 3 && (
              <Typography variant="caption" sx={{ 
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.65rem',
                textAlign: 'center',
                mt: 0.5
              }}>
                +{data.ratings.length - 3} more ratings
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography variant="caption" sx={{ 
            opacity: 0.7, 
            fontStyle: 'italic', 
            color: colors.primary,
            fontSize: '0.75rem'
          }}>
            No ratings available
          </Typography>
        )}
      </Box>
    </div>
  );
});

// 🔗 CUSTOM EDGE COMPONENT (Updated with BI_RECOMMENDS)
export const CustomEdge = React.memo(function CustomEdge({
  id, sourceX, sourceY, targetX, targetY, selected, data,
}: EdgeProps<EdgeData>) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Provide default values for data properties
  const edgeData = data || {};
  const relType = edgeData.relType;
  const mandateStatus = edgeData.mandateStatus;
  const levelOfInfluence = edgeData.levelOfInfluence;
  const rating = edgeData.rating;
  
  const getEdgeColor = (relType?: string, mandateStatus?: string) => {
    switch (relType) {
      case 'EMPLOYS': return 'url(#employs-gradient)';
      case 'COVERS': return 'url(#covers-gradient)';
      case 'RATES': return 'url(#rates-gradient)';
      case 'BI_RECOMMENDS': return 'url(#bi-recommends-gradient)'; // NEW
      case 'OWNS': 
        // Color based on mandate status for client to product
        switch (mandateStatus) {
          case 'Active': return STATUS_COLORS.active;                    // Green
          case 'At Risk': return STATUS_COLORS.atRisk;                   // Red  
          case 'Conversion in Progress': return STATUS_COLORS.inProgress; // Orange
          default: return 'url(#owns-gradient)';
        }
      default: return '#94a3b8';
    }
  };

  const getEdgeWidth = (relType?: string, levelOfInfluence?: string | number) => {
    if (relType === 'COVERS' && levelOfInfluence) {
      // Significantly increased width mapping for visibility
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
      
      // Convert to string if it's a number
      const influenceKey = String(levelOfInfluence);
      const baseWidth = widthMap[influenceKey] || 8;
      return isHovered ? baseWidth + 3 : baseWidth; // Add 3px on hover
    }
    
    // Special width for BI_RECOMMENDS (thicker to show importance)
    if (relType === 'BI_RECOMMENDS') {
      return isHovered ? 12 : 8;
    }
    
    // Much larger minimum width for visibility
    return isHovered ? 10 : selected ? 8 : 6;
  };

  const stroke = getEdgeColor(relType, mandateStatus);
  const width = getEdgeWidth(relType, levelOfInfluence);
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  // Calculate path for better interaction
  const edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

  // ✅ UPDATED: Enhanced label text for BI_RECOMMENDS
  const getLabelText = () => {
    if (relType === 'COVERS') {
      return 'COVERS';
    }
    if (relType === 'RATES' && rating) {
      return rating;
    }
    if (relType === 'OWNS') {
      return 'OWNS';
    }
    if (relType === 'BI_RECOMMENDS') {
      return 'BI RECOMMENDS'; // Show "RECOMMENDS" for BI_RECOMMENDS
    }
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
      return { bg: '#f59e0b', text: 'white' }; // Amber background for recommendations
    }
    return { bg: APP_THEME_COLORS.surface, text: 'white' };
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
        {/* NEW: BI_RECOMMENDS gradient */}
        <linearGradient id="bi-recommends-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      
      {/* Invisible thick path for better hover detection */}
      <path 
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth="30"
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      
      {/* Visible edge path with enhanced visibility */}
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
          // Special styling for BI_RECOMMENDS
          strokeDasharray: relType === 'BI_RECOMMENDS' ? '8 4' : 'none'
        }}
      />
      
      {/* Additional background stroke for even better visibility */}
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
      
      {/* Edge label - always visible for important relationships */}
      {getLabelText() && (
  <g>
    {/* Enhanced label background with dynamic sizing */}
    <rect
      x={midX - (relType === 'BI_RECOMMENDS' ? 50 : 35)}
      y={midY - (relType === 'BI_RECOMMENDS' ? 15 : 12)}
      width={relType === 'BI_RECOMMENDS' ? 100 : 70}
      height={relType === 'BI_RECOMMENDS' ? 30 : 30}
      fill={getLabelColor().bg}
      rx={relType === 'BI_RECOMMENDS' ? 15 : 10}
      style={{ 
        opacity: isHovered ? 1 : 0.9,
        transition: 'opacity 0.3s ease',
        filter: isHovered ? 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))' : 'none'
      }}
    />
    
    {/* Border for mandate status labels and BI_RECOMMENDS */}
    {((relType === 'OWNS' && mandateStatus) || relType === 'BI_RECOMMENDS') && (
      <rect
          x={midX - (relType === 'BI_RECOMMENDS' ? 50 : 35)}
          y={midY - (relType === 'BI_RECOMMENDS' ? 15 : 12)}
          width={relType === 'BI_RECOMMENDS' ? 100 : 70}
          height={relType === 'BI_RECOMMENDS' ? 30 : 30}
          fill="none"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="1"
          rx={relType === 'BI_RECOMMENDS' ? 15 : 10}
        />
      )}
      
      {/* Enhanced text with better positioning for BI_RECOMMENDS */}
      <text 
        x={midX} 
        y={midY + (relType === 'BI_RECOMMENDS' ? 5 : 2)} 
        textAnchor="middle" 
        style={{ 
          fontSize: relType === 'BI_RECOMMENDS' ? 14 : (isHovered ? 12 : 10), 
          fill: getLabelColor().text, 
          fontWeight: ((relType === 'OWNS' && mandateStatus) || relType === 'BI_RECOMMENDS') ? 'bold' : isHovered ? 'bold' : 'normal',
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
          letterSpacing: relType === 'BI_RECOMMENDS' ? '0.5px' : 'normal'
        }}
      >
        {getLabelText()}
      </text>
      
      {/* Optional: Add a small icon for BI_RECOMMENDS */}
      {relType === 'BI_RECOMMENDS' && (
        <g>
          {/* Star/sparkle icon */}
          <circle
            cx={midX + 35}
            cy={midY}
            r="8"
            fill="rgba(255, 255, 255, 0.2)"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1"
          />
          <text
            x={midX + 35}
            y={midY + 3}
            textAnchor="middle"
            style={{
              fontSize: 10,
              fill: 'white',
              fontWeight: 'bold',
              pointerEvents: 'none'
            }}
          >
            ✨
          </text>
        </g>
      )}
    </g>
  )}
    </g>
  );
});

// 📋 NODE/EDGE TYPE MAPS (Updated)
export const nodeTypes = {
  CONSULTANT: ConsultantNode,
  FIELD_CONSULTANT: FieldConsultantNode,
  COMPANY: CompanyNode,
  PRODUCT: ProductNode,
  INCUMBENT_PRODUCT: IncumbentProductNode, // NEW
};

export const edgeTypes = { custom: CustomEdge };

// 🎨 EXPORT COLOR CONSTANTS
export { APP_THEME_COLORS, ENTITY_COLORS, STATUS_COLORS };