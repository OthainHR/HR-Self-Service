import React from 'react';
import { Box, Typography, Container, Paper, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { AdminPasswordResetPanel } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';

const AdminPage = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const { isDarkMode } = useDarkMode();

  // Show loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4">Loading...</Typography>
      </Container>
    );
  }

  // Show access denied for non-admins
  if (!isAdmin) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Access Denied: You must be an admin to view this page.
        </Alert>
        <Typography variant="body1">
          This page is restricted to administrators only. If you believe you should have access, 
          please contact your system administrator.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography 
        variant="h3" 
        component="h1" 
        sx={{ 
          mb: 4,
          fontWeight: 700,
          background: isDarkMode 
            ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)'
            : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}
      >
        Admin Dashboard
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, color: isDarkMode ? '#e2e8f0' : '#374151' }}>
          Welcome, {user?.email}!
        </Typography>
        <Typography variant="body1" sx={{ color: isDarkMode ? '#94a3b8' : '#6b7280' }}>
          You have administrative privileges. Use the tools below to manage user accounts and system settings.
        </Typography>
      </Box>

      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mb: 4,
          background: isDarkMode 
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: isDarkMode 
            ? '1px solid rgba(71, 85, 105, 0.3)' 
            : '1px solid rgba(226, 232, 240, 0.4)',
          borderRadius: '16px'
        }}
      >
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
          User Management
        </Typography>
        
        <AdminPasswordResetPanel />
      </Paper>

      <Paper 
        elevation={2} 
        sx={{ 
          p: 3,
          background: isDarkMode 
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: isDarkMode 
            ? '1px solid rgba(71, 85, 105, 0.3)' 
            : '1px solid rgba(226, 232, 240, 0.4)',
          borderRadius: '16px'
        }}
      >
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
          System Information
        </Typography>
        
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: isDarkMode ? '#94a3b8' : '#6b7280' }}>
              Current User ID:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: isDarkMode ? '#e2e8f0' : '#374151' }}>
              {user?.id}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: isDarkMode ? '#94a3b8' : '#6b7280' }}>
              User Role:
            </Typography>
            <Typography variant="body2" sx={{ color: isDarkMode ? '#e2e8f0' : '#374151' }}>
              {user?.user_metadata?.role || 'Domain Admin'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: isDarkMode ? '#94a3b8' : '#6b7280' }}>
              Last Sign In:
            </Typography>
            <Typography variant="body2" sx={{ color: isDarkMode ? '#e2e8f0' : '#374151' }}>
              {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default AdminPage;
