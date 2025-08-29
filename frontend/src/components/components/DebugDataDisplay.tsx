// components/DebugDataDisplay.tsx
import React from 'react';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { Node, Edge } from 'reactflow';
import { AppNodeData, EdgeData } from '../types/GraphTypes';

interface DebugDataDisplayProps {
  nodes: Node<AppNodeData>[];
  edges: Edge<EdgeData>[];
  show?: boolean;
}

export const DebugDataDisplay: React.FC<DebugDataDisplayProps> = ({ 
  nodes, 
  edges, 
  show = false 
}) => {
  if (!show) return null;

  return (
    <Box sx={{
      position: 'absolute',
      top: 100,
      right: 340, // Next to the filter panel
      width: 300,
      maxHeight: '60vh',
      overflowY: 'auto',
      bgcolor: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: 2,
      p: 2,
      zIndex: 1000
    }}>
      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
        🐛 Debug Data
      </Typography>
      
      <Accordion sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
          <Typography sx={{ color: 'white' }}>
            Nodes ({nodes.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
            {nodes.map((node, index) => (
              <Box key={node.id} sx={{ mb: 1, p: 1, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: '#6366f1' }}>
                  {index + 1}. {node.id}
                </Typography>
                <Typography variant="caption" sx={{ color: 'white', display: 'block' }}>
                  Type: {node.type}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block' }}>
                  Name: {node.data?.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block' }}>
                  Position: ({Math.round(node.position.x)}, {Math.round(node.position.y)})
                </Typography>
              </Box>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }}>
        <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
          <Typography sx={{ color: 'white' }}>
            Edges ({edges.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
            {edges.map((edge, index) => (
              <Box key={edge.id} sx={{ mb: 1, p: 1, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: '#10b981' }}>
                  {index + 1}. {edge.id}
                </Typography>
                <Typography variant="caption" sx={{ color: 'white', display: 'block' }}>
                  {edge.source} → {edge.target}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block' }}>
                  Type: {edge.data?.relType}
                </Typography>
              </Box>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

// Export for module resolution
export default DebugDataDisplay;