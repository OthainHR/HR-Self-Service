/**
 * Keka Account Connection Component
 * Handles connecting/disconnecting Keka accounts for HR data access
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Collapse,
  Divider,
  Grid
} from '@mui/material';
import {
  AccountCircle as AccountIcon,
  Link as LinkIcon,
  LinkOff as UnlinkIcon,
  Refresh as RefreshIcon,
  CheckCircle as ConnectedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import kekaOAuthService from '../services/kekaOAuthService';

const KekaAccountConnection = ({ 
  onConnectionChange = () => {}, 
  showDetails = false, 
  compact = false 
}) => {
  const theme = useTheme();
  
  // State management
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showDetails, setShowDetailsState] = useState(showDetails);
  const [error, setError] = useState(null);

  // Load connection status on mount
  useEffect(() => {
    loadConnectionStatus();
  }, []);

  /**
   * Load current connection status
   */
  const loadConnectionStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await kekaOAuthService.getConnectionStatus();
      setConnectionStatus(status);
      onConnectionChange(status);
    } catch (error) {
      console.error('Failed to load connection status:', error);
      setError(error.message);
      setConnectionStatus(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Connect Keka account
   */
  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      
      const result = await kekaOAuthService.connectKekaAccount();
      
      if (result.success) {
        // Reload status after successful connection
        await loadConnectionStatus();
      }
    } catch (error) {
      console.error('Failed to connect Keka account:', error);
      setError(error.message);
    } finally {
      setConnecting(false);
    }
  };

  /**
   * Disconnect Keka account
   */
  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      setError(null);
      
      await kekaOAuthService.disconnectAccount();
      
      // Reload status after disconnection
      await loadConnectionStatus();
      setShowDisconnectDialog(false);
    } catch (error) {
      console.error('Failed to disconnect Keka account:', error);
      setError(error.message);
    } finally {
      setDisconnecting(false);
    }
  };

  /**
   * Refresh tokens
   */
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const result = await kekaOAuthService.refreshTokens();
      
      if (result.status === 'success') {
        await loadConnectionStatus();
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      setError(error.message);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Get status info based on connection state
   */
  const getStatusInfo = () => {
    if (!connectionStatus) {
      return {
        status: 'not_connected',
        color: 'default',
        icon: <AccountIcon />,
        message: 'Keka account not connected',
        description: 'Connect your Keka account to access HR features like leave balances, attendance, and payslips.'
      };
    }

    if (!connectionStatus.connected) {
      return {
        status: 'not_connected',
        color: 'default',
        icon: <AccountIcon />,
        message: 'Keka account not connected',
        description: 'Connect your Keka account to access HR features.'
      };
    }

    if (connectionStatus.is_expired) {
      return {
        status: 'expired',
        color: 'warning',
        icon: <WarningIcon />,
        message: 'Connection expired',
        description: 'Your Keka connection has expired. Please refresh or reconnect.'
      };
    }

    return {
      status: 'connected',
      color: 'success',
      icon: <ConnectedIcon />,
      message: 'Connected to Keka',
      description: 'Your Keka account is connected and ready to use.'
    };
  };

  const statusInfo = getStatusInfo();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
        <Typography sx={{ ml: 2 }}>Checking Keka connection...</Typography>
      </Box>
    );
  }

  // Compact view
  if (compact) {
    return (
      <Chip
        icon={statusInfo.icon}
        label={statusInfo.message}
        color={statusInfo.color}
        variant={connectionStatus?.connected ? "filled" : "outlined"}
        onClick={connectionStatus?.connected ? undefined : handleConnect}
        disabled={connecting}
        sx={{
          cursor: connectionStatus?.connected ? 'default' : 'pointer',
          '& .MuiChip-icon': {
            color: 'inherit'
          }
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        sx={{
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
          borderRadius: 3
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box
              sx={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                borderRadius: 2,
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}
            >
              {statusInfo.icon}
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Keka Account Connection
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {statusInfo.description}
              </Typography>
            </Box>
            {!showDetails && (
              <IconButton
                onClick={() => setShowDetailsState(!showDetails)}
                size="small"
              >
                {showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </Box>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status Badge */}
          <Box sx={{ mb: 3 }}>
            <Chip
              icon={statusInfo.icon}
              label={statusInfo.message}
              color={statusInfo.color}
              variant="outlined"
              sx={{
                '& .MuiChip-icon': {
                  color: 'inherit'
                }
              }}
            />
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {!connectionStatus?.connected ? (
              <Button
                variant="contained"
                startIcon={connecting ? <CircularProgress size={20} color="inherit" /> : <LinkIcon />}
                onClick={handleConnect}
                disabled={connecting}
                sx={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
                  }
                }}
              >
                {connecting ? 'Connecting...' : 'Connect Keka Account'}
              </Button>
            ) : (
              <>
                {connectionStatus.is_expired && (
                  <Button
                    variant="contained"
                    startIcon={refreshing ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                    onClick={handleRefresh}
                    disabled={refreshing}
                    color="warning"
                  >
                    {refreshing ? 'Refreshing...' : 'Refresh Connection'}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<UnlinkIcon />}
                  onClick={() => setShowDisconnectDialog(true)}
                  color="error"
                >
                  Disconnect
                </Button>
              </>
            )}
          </Box>

          {/* Detailed Connection Info */}
          <Collapse in={showDetails}>
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Connection Details
              </Typography>
              <Grid container spacing={2}>
                {connectionStatus?.connected && (
                  <>
                    {connectionStatus.keka_employee_code && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Employee Code
                        </Typography>
                        <Typography variant="body1">
                          {connectionStatus.keka_employee_code}
                        </Typography>
                      </Grid>
                    )}
                    {connectionStatus.expires_at && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Token Expires
                        </Typography>
                        <Typography variant="body1">
                          {new Date(connectionStatus.expires_at).toLocaleString()}
                        </Typography>
                      </Grid>
                    )}
                    {connectionStatus.scopes && connectionStatus.scopes.length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Permissions
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {connectionStatus.scopes.map(scope => (
                            <Chip
                              key={scope}
                              label={scope.replace('read:', '').replace('_', ' ')}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}
                  </>
                )}
              </Grid>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={showDisconnectDialog}
        onClose={() => setShowDisconnectDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ErrorIcon sx={{ mr: 1, color: 'error.main' }} />
            Disconnect Keka Account
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to disconnect your Keka account? This will:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 2 }}>
            <li>Remove access to your HR data</li>
            <li>Disable HR chatbot features</li>
            <li>Delete stored authentication tokens</li>
          </Box>
          <Typography variant="body2" color="text.secondary">
            You can reconnect your account at any time.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowDisconnectDialog(false)}
            disabled={disconnecting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDisconnect}
            color="error"
            variant="contained"
            disabled={disconnecting}
            startIcon={disconnecting ? <CircularProgress size={20} color="inherit" /> : <UnlinkIcon />}
          >
            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default KekaAccountConnection;

