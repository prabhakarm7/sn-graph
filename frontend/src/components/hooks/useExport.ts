// hooks/useExport.ts
import { useState, useCallback } from 'react';
import { exportService, ExportOptions, ExportResult } from '../services/ExportService';

export interface UseExportResult {
  exportData: (options: ExportOptions) => Promise<ExportResult>;
  isExporting: boolean;
  exportError: string | null;
  lastExportResult: ExportResult | null;
  clearError: () => void;
}

export const useExport = (): UseExportResult => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastExportResult, setLastExportResult] = useState<ExportResult | null>(null);

  const exportData = useCallback(async (options: ExportOptions): Promise<ExportResult> => {
    setIsExporting(true);
    setExportError(null);

    try {
      const result = await exportService.exportCurrentView(options);
      
      setLastExportResult(result);
      
      if (!result.success) {
        setExportError(result.error || 'Export failed');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      setExportError(errorMessage);
      
      return {
        success: false,
        filename: '',
        error: errorMessage
      };
    } finally {
      setIsExporting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setExportError(null);
  }, []);

  return {
    exportData,
    isExporting,
    exportError,
    lastExportResult,
    clearError
  };
};