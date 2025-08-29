// utils/ParentConsultantHelper.ts
// Utility functions for working with parent-child consultant relationships

import { AppNodeData } from '../types/GraphTypes';
import { Node } from 'reactflow';

/**
 * Helper function to get the parent consultant ID for a field consultant
 * with fallback logic if parentConsultantId is not set
 */
export const getParentConsultantId = (fieldConsultantData: AppNodeData): string => {
  // Method 1: Use explicit parentConsultantId if available (PREFERRED)
  if (fieldConsultantData.parentConsultantId) {
    return fieldConsultantData.parentConsultantId;
  }
  
  // Method 2: Extract from ID pattern (fallback)
  if (fieldConsultantData.id) {
    let consultantId = fieldConsultantData.id;
    
    // Handle common patterns
    if (consultantId.includes('_F')) {
      consultantId = consultantId.replace('_F', '_C');
    } else if (consultantId.includes('FIELD_CONSULTANT')) {
      consultantId = consultantId.replace('FIELD_CONSULTANT', 'CONSULTANT');
    } else if (consultantId.includes('FIELD')) {
      consultantId = consultantId.replace('FIELD', 'CONSULTANT');
    }
    
    return consultantId;
  }
  
  // Method 3: Use PCA (last resort)
  if (fieldConsultantData.pca) {
    return fieldConsultantData.pca;
  }
  
  // Fallback
  return fieldConsultantData.id || 'default';
};

/**
 * Verify that all field consultants have valid parent consultant references
 */
export const validateParentConsultantReferences = (nodes: Node<AppNodeData>[]): {
  valid: boolean;
  issues: string[];
  stats: {
    totalFieldConsultants: number;
    fieldConsultantsWithParentId: number;
    fieldConsultantsWithValidParent: number;
  };
} => {
  const issues: string[] = [];
  const consultantIds = new Set(
    nodes
      .filter(node => node.type === 'CONSULTANT')
      .map(node => node.id)
  );
  
  const fieldConsultants = nodes.filter(node => node.type === 'FIELD_CONSULTANT');
  let fieldConsultantsWithParentId = 0;
  let fieldConsultantsWithValidParent = 0;
  
  fieldConsultants.forEach(fieldConsultant => {
    const parentId = fieldConsultant.data.parentConsultantId;
    
    if (parentId) {
      fieldConsultantsWithParentId++;
      
      if (consultantIds.has(parentId)) {
        fieldConsultantsWithValidParent++;
      } else {
        issues.push(`Field consultant ${fieldConsultant.id} has parentConsultantId ${parentId} but no matching consultant found`);
      }
    } else {
      issues.push(`Field consultant ${fieldConsultant.id} has no parentConsultantId set`);
    }
  });
  
  return {
    valid: issues.length === 0,
    issues,
    stats: {
      totalFieldConsultants: fieldConsultants.length,
      fieldConsultantsWithParentId,
      fieldConsultantsWithValidParent
    }
  };
};

/**
 * Get all field consultants that belong to a specific consultant
 */
export const getFieldConsultantsForConsultant = (
  consultantId: string, 
  nodes: Node<AppNodeData>[]
): Node<AppNodeData>[] => {
  return nodes.filter(node => 
    node.type === 'FIELD_CONSULTANT' && 
    (node.data.parentConsultantId === consultantId || getParentConsultantId(node.data) === consultantId)
  );
};

/**
 * Create a consultant hierarchy map
 */
export const createConsultantHierarchy = (nodes: Node<AppNodeData>[]): Map<string, Node<AppNodeData>[]> => {
  const hierarchy = new Map<string, Node<AppNodeData>[]>();
  
  const consultants = nodes.filter(node => node.type === 'CONSULTANT');
  const fieldConsultants = nodes.filter(node => node.type === 'FIELD_CONSULTANT');
  
  // Initialize with all consultants
  consultants.forEach(consultant => {
    hierarchy.set(consultant.id, []);
  });
  
  // Add field consultants to their parent consultants
  fieldConsultants.forEach(fieldConsultant => {
    const parentId = getParentConsultantId(fieldConsultant.data);
    
    if (hierarchy.has(parentId)) {
      hierarchy.get(parentId)!.push(fieldConsultant);
    } else {
      // If parent not found, create entry for debugging
      hierarchy.set(parentId, [fieldConsultant]);
    }
  });
  
  return hierarchy;
};

/**
 * Debug function to log the consultant hierarchy
 */
export const logConsultantHierarchy = (nodes: Node<AppNodeData>[]): void => {
  console.log('👔 Consultant Hierarchy:');
  const hierarchy = createConsultantHierarchy(nodes);
  
  hierarchy.forEach((fieldConsultants, consultantId) => {
    const consultant = nodes.find(n => n.id === consultantId);
    const consultantName = consultant?.data.name || 'Unknown';
    
    console.log(`  📊 ${consultantId} (${consultantName}):`);
    if (fieldConsultants.length === 0) {
      console.log(`    └── No field consultants`);
    } else {
      fieldConsultants.forEach((fc, index) => {
        const isLast = index === fieldConsultants.length - 1;
        const prefix = isLast ? '    └──' : '    ├──';
        console.log(`${prefix} ${fc.id} (${fc.data.name})`);
        
        // Show parentConsultantId if available
        if (fc.data.parentConsultantId) {
          console.log(`${isLast ? '        ' : '    │   '}   parentConsultantId: ${fc.data.parentConsultantId}`);
        }
      });
    }
  });
};