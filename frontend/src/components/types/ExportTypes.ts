// types/ExportTypes.ts
export type ExportFormat = 'excel' | 'csv';

export interface ExportMetadata {
  region: string;
  mode: 'standard' | 'recommendations';
  exportDate: string;
  totalRows: number;
  totalNodes: number;
  totalRelationships: number;
  appliedFilters: Record<string, any>;
}

export interface ExportTableRow {
  [key: string]: string | number | null;
}

export interface ExportResponse {
  success: boolean;
  filename?: string;
  rowCount?: number;
  error?: string;
  metadata?: ExportMetadata;
}