// components/ConnectionTest.tsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, CircularProgress, Chip } from '@mui/material';
import { CheckCircle, Error, Refresh } from '@mui/icons-material';
import ApiNeo4jService from '../services/ApiNeo4jService';

interface ConnectionStatus {
  api: boolean;
  database: boolean;
  error?: string;
  stats?: any;
}

export const ConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>({ api: false, database: false });
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const apiService = ApiNeo4jService.getInstance();

  const testConnection = async () => {
    setLoading(true);
    setStatus({ api: false, database: false });

    try {
      console.log('🔍 Testing API connection...');
      
      // Test API health endpoint
      const response = await fetch('http://localhost:8000/health');
      const healthData = await response.json();
      
      console.log('📊 Health check response:', healthData);
      
      const apiConnected = response.ok;
      const databaseConnected = healthData.database_connected || false;
      
      if (apiConnected && databaseConnected) {
        // Get database stats
        try {
          const stats = await apiService.getDatabaseStats();
          setStatus({
            api: true,
            database: true,
            stats: stats
          });
        } catch (statsError) {
          setStatus({
            api: true,
            database: true,
            error: 'Connected but failed to get stats'
          });
        }
      } else {
        setStatus({
          api: apiConnected,
          database: databaseConnected,
          error: healthData.error || 'Connection failed'
        });
      }
      
      setLastChecked(new Date());
      
    } catch (error: unknown) {
      console.error('❌ Connection test failed:', error);
      const errorMessage =  'Connection failed';
      setStatus({
        api: false,
        database: false,
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // Test connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  const getStatusColor = (connected: boolean) => connected ? '#16a34a' : '#dc2626';
  const getStatusIcon = (connected: boolean) => connected ? <CheckCircle /> : <Error />;

  return (
    <Box sx={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 9999,
      bgcolor: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: 3,
      p: 2,
      minWidth: 280,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>
          Backend Connection
        </Typography>
        <Button
          onClick={testConnection}
          disabled={loading}
          size="small"
          startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
          sx={{ 
            color: 'white', 
            minWidth: 'auto',
            px: 1
          }}
        >
          {loading ? 'Testing...' : 'Test'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* API Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: getStatusColor(status.api), display: 'flex', alignItems: 'center' }}>
            {getStatusIcon(status.api)}
          </Box>
          <Typography variant="body2" sx={{ color: 'white' }}>
            FastAPI Server
          </Typography>
          <Chip
            label={status.api ? 'Connected' : 'Disconnected'}
            size="small"
            sx={{
              bgcolor: status.api ? 'rgba(22, 163, 74, 0.2)' : 'rgba(220, 38, 38, 0.2)',
              color: getStatusColor(status.api),
              border: `1px solid ${getStatusColor(status.api)}30`,
              ml: 'auto'
            }}
          />
        </Box>

        {/* Database Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: getStatusColor(status.database), display: 'flex', alignItems: 'center' }}>
            {getStatusIcon(status.database)}
          </Box>
          <Typography variant="body2" sx={{ color: 'white' }}>
            Neo4j Database
          </Typography>
          <Chip
            label={status.database ? 'Connected' : 'Disconnected'}
            size="small"
            sx={{
              bgcolor: status.database ? 'rgba(22, 163, 74, 0.2)' : 'rgba(220, 38, 38, 0.2)',
              color: getStatusColor(status.database),
              border: `1px solid ${getStatusColor(status.database)}30`,
              ml: 'auto'
            }}
          />
        </Box>
      </Box>

      {/* Database Stats */}
      {status.stats && (
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block', mb: 1 }}>
            Database Stats:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Chip
              label={`${status.stats.total_nodes} nodes`}
              size="small"
              variant="outlined"
              sx={{ color: '#6366f1', borderColor: '#6366f1' }}
            />
            <Chip
              label={`${status.stats.total_relationships} rels`}
              size="small"
              variant="outlined"
              sx={{ color: '#10b981', borderColor: '#10b981' }}
            />
          </Box>
        </Box>
      )}

      {/* Error Message */}
      {status.error && (
        <Alert 
          severity="error" 
          sx={{ 
            mt: 2, 
            bgcolor: 'rgba(239, 68, 68, 0.1)', 
            color: '#ef4444',
            '& .MuiAlert-icon': { color: '#ef4444' }
          }}
        >
          {status.error}
        </Alert>
      )}

      {/* Last Checked */}
      {lastChecked && (
        <Typography variant="caption" sx={{ 
          color: 'rgba(255, 255, 255, 0.5)', 
          display: 'block', 
          mt: 1, 
          textAlign: 'center' 
        }}>
          Last checked: {lastChecked.toLocaleTimeString()}
        </Typography>
      )}
    </Box>
  );
};

// ✅ Add default export to fix TypeScript module error
export default ConnectionTest;