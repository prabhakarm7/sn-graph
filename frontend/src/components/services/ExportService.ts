// services/ExportService.ts
import { FilterCriteria } from '../types/FitlerTypes';

export interface ExportOptions {
  region: string;
  filters: Partial<FilterCriteria>;
  recommendationsMode: boolean;
  format?: 'excel' | 'csv';
}

export interface ExportResult {
  success: boolean;
  filename: string;
  rowCount?: number;
  error?: string;
}

export class ExportService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  /**
   * Export current filtered view to Excel or CSV
   * Reuses same filters as graph rendering for consistency
   */
  async exportCurrentView(options: ExportOptions): Promise<ExportResult> {
    const { region, filters, recommendationsMode, format = 'excel' } = options;

    try {
      console.log('📊 Starting export:', {
        region,
        mode: recommendationsMode ? 'recommendations' : 'standard',
        format,
        filterCount: Object.keys(filters).length
      });

      const response = await fetch(
        `${this.baseUrl}/api/v1/complete/region/${region}/export?recommendations_mode=${recommendationsMode}&format=${format}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(filters)
        }
      );

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = 'Export failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      // Get metadata from response headers
      const rowCount = parseInt(response.headers.get('X-Export-Rows') || '0');
      const exportMode = response.headers.get('X-Export-Mode') || '';

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `network_export_${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      console.log(`✅ Export successful: ${filename} (${rowCount} rows)`);

      return {
        success: true,
        filename,
        rowCount
      };

    } catch (error) {
      console.error('❌ Export failed:', error);
      
      return {
        success: false,
        filename: '',
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }

  /**
   * Check if export is available for current state
   */
  canExport(nodeCount: number): { canExport: boolean; reason?: string } {
    if (nodeCount === 0) {
      return {
        canExport: false,
        reason: 'No data available. Apply filters or execute a query first.'
      };
    }

    return { canExport: true };
  }

  /**
   * Get estimated export row count (approximation based on graph data)
   */
  estimateRowCount(nodeCount: number, edgeCount: number, recommendationsMode: boolean): number {
    // Rough estimate: each OWNS/BI_RECOMMENDS relationship becomes a row
    if (recommendationsMode) {
      // In reco mode, BI_RECOMMENDS edges become rows
      return Math.floor(edgeCount * 0.2); // Approximate BI_RECOMMENDS ratio
    } else {
      // In standard mode, OWNS edges become rows
      return Math.floor(edgeCount * 0.3); // Approximate OWNS ratio
    }
  }
}

// Singleton instance
export const exportService = new ExportService();