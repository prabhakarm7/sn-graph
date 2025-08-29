// types/GraphTypes.ts - Updated with parentConsultantId and proper EdgeData
export type RankGroup = 'Positive' | 'Negative' | 'Introduced' | 'Neutral';

export interface Rating {
  consultant: string;
  rankgroup: RankGroup;
  score?: number;
}

export interface AppNodeData {
  // Core properties
  id: string;
  name: string;
  label?: string;
  
  // Hierarchical relationships
  parentConsultantId?: string;
  consultant_id?: string;  // 🆕 NEW: For field consultants to reference their parent consultant
  
  // Geographic properties
  region?: string;
  sales_region?: string;
  channel?: string;
  
  // Performance metrics
  performance?: number;
  influence?: number;
  
  // Asset and product properties
  asset_class?: string;
  product_label?: string;
  
  // Relationship properties
  pca?: string;      // Primary Consultant Advisor
  aca?: string;      // Assistant/Client Advisor
  privacy?: string;
  
  // Ratings and assessments
  ratings?: Rating[];
  
  // Additional metadata
  [key: string]: any;
}

export interface EdgeData {
  // Core relationship properties - made optional since components default to empty object
  relType?: 'EMPLOYS' | 'COVERS' | 'RATES' | 'OWNS' | 'BI_RECOMMENDS';
  
  // Source and target identifiers
  sourceId?: string;
  targetId?: string;
  
  // Relationship strength and influence
  strength?: number;
  levelOfInfluence?: number | string;
  
  // Business properties
  rating?: string;
  mandateStatus?: string;
  influencedConsultant?: string;
  duration?: string;  // 🆕 NEW: Added missing duration property
  
  // Additional metadata
  [key: string]: any;
}

// 🆕 NEW: Helper types for parent-child relationships
export interface ConsultantHierarchy {
  consultant: AppNodeData;
  fieldConsultants: AppNodeData[];
}

export interface ParentConsultantValidation {
  valid: boolean;
  issues: string[];
  stats: {
    totalFieldConsultants: number;
    fieldConsultantsWithParentId: number;
    fieldConsultantsWithValidParent: number;
  };
}