import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  AccountCircle as AccountIcon,
  Link as LinkIcon,
  LinkOff as UnlinkIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { hrService } from '../../services/hrService';

const KekaAuthCard = ({ onAuthStatusChange }) => {
  const [authStatus, setAuthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await hrService.checkKekaAuthStatus();
      
      if (result.success) {
        setAuthStatus(result.data);
        onAuthStatusChange?.(result.data);
      } else {
        setError(result.error || 'Failed to check Keka authentication status');
        setAuthStatus({ connected: false });
        onAuthStatusChange?.({ connected: false });
      }
    } catch (err) {
      setError('Failed to check authentication status');
      setAuthStatus({ connected: false });
      onAuthStatusChange?.({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectKeka = async () => {
    setConnecting(true);
    setError(null);

    try {
      // Get authorization URL
      const result = await hrService.getKekaAuthUrl();
      
      if (result.success && result.data.authorization_url) {
        // Open OAuth popup
        const popup = window.open(
          result.data.authorization_url, 
          'kekaAuth', 
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // If popup blocked or failed, fallback to full-page redirect
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          window.location.href = result.data.authorization_url;
          return;
        }

        // Listen for OAuth completion
        const handleMessage = (event) => {
          if (event.data.type === 'keka-oauth-result') {
            if (popup && !popup.closed) {
              popup.close();
            }
            window.removeEventListener('message', handleMessage);
            
            if (event.data.status === 'success') {
              // Refresh auth status
              checkAuthStatus();
              // Trigger refresh of HR data
              window.dispatchEvent(new CustomEvent('hrRefresh'));
            } else {
              setError(event.data.error || 'OAuth authentication failed');
            }
            setConnecting(false);
          }
        };

        window.addEventListener('message', handleMessage);

        // Check if popup was closed manually
        const checkClosed = setInterval(() => {
          if (!popup) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            setConnecting(false);
          } else if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            setConnecting(false);
          }
        }, 1000);

      } else {
        setError(result.error || 'Failed to get authorization URL');
        setConnecting(false);
      }
    } catch (err) {
      setError('Failed to initiate Keka authentication');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const result = await hrService.disconnectKekaAccount();
      
      if (result.success) {
        setAuthStatus({ connected: false });
        onAuthStatusChange?.({ connected: false });
        setShowDisconnectDialog(false);
        // Trigger refresh of HR data
        window.dispatchEvent(new CustomEvent('hrRefresh'));
      } else {
        setError(result.error || 'Failed to disconnect Keka account');
      }
    } catch (err) {
      setError('Failed to disconnect Keka account');
    }
  };

  const getStatusChip = () => {
    if (loading) return null;
    
    if (authStatus?.connected) {
      return (
        <Chip
          icon={<CheckIcon />}
          label="Connected"
          color="success"
          size="small"
          variant="outlined"
        />
      );
    } else {
      return (
        <Chip
          icon={<WarningIcon />}
          label="Not Connected"
          color="warning"
          size="small"
          variant="outlined"
        />
      );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={24} />
            <Typography>Checking Keka connection...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <AccountIcon color="primary" />
            <Typography variant="h6" component="h3">
              Keka Account
            </Typography>
            {getStatusChip()}
          </Box>

          {authStatus?.connected ? (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Your Keka account is connected and ready to use.
              </Typography>
              
              {authStatus.keka_user_id && (
                <Typography variant="caption" color="text.secondary">
                  User ID: {authStatus.keka_user_id}
                </Typography>
              )}
              
              {authStatus.expires_at && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Token expires: {new Date(authStatus.expires_at).toLocaleDateString()}
                </Typography>
              )}

              {authStatus.is_expired && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Your Keka authentication has expired. Please reconnect your account.
                </Alert>
              )}
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Connect your Keka account to access your HR data including leave balances, 
                attendance records, and payslips.
              </Typography>
              
              <Typography variant="caption" color="text.secondary">
                You'll be redirected to Keka's secure login page to authorize access.
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>

        <CardActions>
          {authStatus?.connected && !authStatus?.is_expired ? (
            <Button
              startIcon={<UnlinkIcon />}
              onClick={() => setShowDisconnectDialog(true)}
              color="error"
              variant="outlined"
              size="small"
            >
              Disconnect
            </Button>
          ) : (
            <Button
              startIcon={connecting ? <CircularProgress size={16} /> : <LinkIcon />}
              onClick={handleConnectKeka}
              disabled={connecting}
              variant="contained"
              color="primary"
            >
              {connecting ? 'Connecting...' : 'Connect Keka Account'}
            </Button>
          )}

          <Button
            onClick={checkAuthStatus}
            size="small"
            color="primary"
          >
            Refresh Status
          </Button>
        </CardActions>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={showDisconnectDialog}
        onClose={() => setShowDisconnectDialog(false)}
      >
        <DialogTitle>Disconnect Keka Account</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to disconnect your Keka account? 
            You'll lose access to your HR data until you reconnect.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDisconnectDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDisconnect} 
            color="error" 
            variant="contained"
          >
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default KekaAuthCard;


