import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Avatar,
  Chip,
  Divider,
  Alert,
  Skeleton,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { hrService } from '../../services/hrService';

const HRProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfile();

    // Listen for refresh events
    const handleRefresh = () => loadProfile();
    window.addEventListener('hrRefresh', handleRefresh);
    
    return () => window.removeEventListener('hrRefresh', handleRefresh);
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await hrService.getMyProfile();
      
      if (result.success) {
        setProfile(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatAddress = (address) => {
    if (!address) return 'Not provided';
    if (typeof address === 'string') return address;
    
    // Handle object address format
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.country) parts.push(address.country);
    if (address.postal_code) parts.push(address.postal_code);
    
    return parts.length > 0 ? parts.join(', ') : 'Not provided';
  };

  const getEmployeeStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'probation':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Skeleton variant="circular" width={120} height={120} sx={{ mx: 'auto', mb: 2 }} />
              <Skeleton variant="text" height={40} width="80%" sx={{ mx: 'auto' }} />
              <Skeleton variant="text" height={30} width="60%" sx={{ mx: 'auto' }} />
              <Skeleton variant="rounded" height={30} width="40%" sx={{ mx: 'auto', mt: 2 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Skeleton variant="text" height={40} width="50%" />
              <Box sx={{ mt: 3 }}>
                {[1, 2, 3, 4, 5].map((item) => (
                  <Box key={item} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Skeleton variant="text" height={25} width="70%" />
                      <Skeleton variant="text" height={20} width="50%" />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={null} sx={{ borderRadius: 1.5 }}>
        <Typography variant="h6" gutterBottom>
          Failed to Load Profile
        </Typography>
        {error}
      </Alert>
    );
  }

  if (!profile) {
    return (
      <Alert severity="info" sx={{ borderRadius: 1.5 }}>
        Profile information is not available.
      </Alert>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Profile Summary Card */}
      <Grid item xs={12} md={4}>
        <Card elevation={2}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 2,
                bgcolor: 'primary.main',
                fontSize: '2.5rem'
              }}
            >
              {getInitials(profile.full_name)}
            </Avatar>
            
            <Typography variant="h5" gutterBottom fontWeight="bold">
              {profile.full_name}
            </Typography>
            
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {profile.designation}
            </Typography>
            
            <Chip
              label={profile.employee_status || 'Active'}
              color={getEmployeeStatusColor(profile.employee_status)}
              variant="contained"
              sx={{ mt: 1 }}
            />
            
            <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                Employee ID
              </Typography>
              <Typography variant="h6" color="primary">
                {profile.employee_id}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Detailed Information Card */}
      <Grid item xs={12} md={8}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1 }} />
              Personal Information
            </Typography>

            <List sx={{ mt: 2 }}>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <EmailIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Email Address"
                  secondary={profile.email}
                />
              </ListItem>

              {profile.phone && (
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <PhoneIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Phone Number"
                    secondary={profile.phone}
                  />
                </ListItem>
              )}

              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Address"
                  secondary={formatAddress(profile.address)}
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <WorkIcon sx={{ mr: 1 }} />
              Work Information
            </Typography>

            <List sx={{ mt: 2 }}>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <BadgeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Designation"
                  secondary={profile.designation}
                />
              </ListItem>

              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <BusinessIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Department"
                  secondary={profile.department}
                />
              </ListItem>

              {profile.manager && (
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <PersonIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Reporting Manager"
                    secondary={profile.manager}
                  />
                </ListItem>
              )}

              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <CalendarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Date of Joining"
                  secondary={hrService.formatDate(profile.join_date)}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Additional Information Card */}
      <Grid item xs={12}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Employment Summary
            </Typography>
            
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'primary.light', 
                    textAlign: 'center',
                    borderRadius: 2 
                  }}
                >
                  <Typography variant="h4" color="primary.main">
                    {profile.join_date ? 
                      Math.floor((new Date() - new Date(profile.join_date)) / (1000 * 60 * 60 * 24 * 365.25)) 
                      : 0
                    }
                  </Typography>
                  <Typography variant="body2" color="primary.dark">
                    Years at Company
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'success.light', 
                    textAlign: 'center',
                    borderRadius: 2 
                  }}
                >
                  <Typography variant="h4" color="success.main">
                    {profile.join_date ? 
                      Math.floor((new Date() - new Date(profile.join_date)) / (1000 * 60 * 60 * 24 * 30.44)) 
                      : 0
                    }
                  </Typography>
                  <Typography variant="body2" color="success.dark">
                    Months at Company
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'info.light', 
                    textAlign: 'center',
                    borderRadius: 2 
                  }}
                >
                  <Typography variant="h4" color="info.main">
                    {profile.employee_status === 'active' ? 'Active' : 'Inactive'}
                  </Typography>
                  <Typography variant="body2" color="info.dark">
                    Current Status
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'warning.light', 
                    textAlign: 'center',
                    borderRadius: 2 
                  }}
                >
                  <Typography variant="h4" color="warning.main">
                    {profile.employee_id.slice(-4)}
                  </Typography>
                  <Typography variant="body2" color="warning.dark">
                    Employee ID
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default HRProfile;
