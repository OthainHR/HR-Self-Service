import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  Skeleton,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Fade,
  Paper,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  EventAvailable as LeaveIcon,
  Schedule as AttendanceIcon,
  Receipt as PayslipIcon,
  Event as HolidayIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { hrService } from '../services/hrService';

// Import HR components (to be created)
import HRProfile from '../components/hr/HRProfile';
import HRLeaveManagement from '../components/hr/HRLeaveManagement';
import HRAttendance from '../components/hr/HRAttendance';
import HRPayslips from '../components/hr/HRPayslips';
import HRHolidays from '../components/hr/HRHolidays';
import HRDashboard from '../components/hr/HRDashboard';
import KekaAuthCard from '../components/hr/KekaAuthCard';

const HRSelfService = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hrHealthStatus, setHrHealthStatus] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    profile: null,
    leaveBalances: [],
    recentAttendance: [],
    upcomingHolidays: []
  });
  const [kekaAuthStatus, setKekaAuthStatus] = useState(null);

  // Tab configuration
  const tabs = [
    {
      label: 'Dashboard',
      icon: <DashboardIcon />,
      component: HRDashboard,
      props: { data: dashboardData }
    },
    {
      label: 'Profile',
      icon: <PersonIcon />,
      component: HRProfile
    },
    {
      label: 'Leave Management',
      icon: <LeaveIcon />,
      component: HRLeaveManagement
    },
    {
      label: 'Attendance',
      icon: <AttendanceIcon />,
      component: HRAttendance
    },
    {
      label: 'Payslips',
      icon: <PayslipIcon />,
      component: HRPayslips
    },
    {
      label: 'Holidays',
      icon: <HolidayIcon />,
      component: HRHolidays
    }
  ];

  useEffect(() => {
    initializeHRService();
  }, []);

  const initializeHRService = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check HR service health
      const healthResult = await hrService.checkHRServiceHealth();
      setHrHealthStatus(healthResult);

      if (!healthResult.success) {
        throw new Error('HR service is not available');
      }

      // Check Keka authentication status
      try {
        const kekaStatus = await hrService.checkKekaAuthStatus();
        if (kekaStatus.success) {
          setKekaAuthStatus(kekaStatus.data);
        }
      } catch (err) {
        console.warn('Could not check Keka auth status:', err);
        setKekaAuthStatus({ connected: false });
      }

      // Load dashboard data
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to initialize HR service:', err);
      setError(err.message || 'Failed to connect to HR service');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load essential data for dashboard
      const [profileResult, leaveBalancesResult, attendanceResult, holidaysResult] = await Promise.allSettled([
        hrService.getMyProfile(),
        hrService.getMyLeaveBalances(),
        hrService.getCurrentMonthAttendance(),
        hrService.getUpcomingHolidays()
      ]);

      setDashboardData({
        profile: profileResult.status === 'fulfilled' && profileResult.value.success 
          ? profileResult.value.data : null,
        leaveBalances: leaveBalancesResult.status === 'fulfilled' && leaveBalancesResult.value.success 
          ? leaveBalancesResult.value.data : [],
        recentAttendance: attendanceResult.status === 'fulfilled' && attendanceResult.value.success 
          ? attendanceResult.value.data : [],
        upcomingHolidays: holidaysResult.status === 'fulfilled' && holidaysResult.value.success 
          ? holidaysResult.value.data : []
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    if (activeTab === 0) {
      // Refresh dashboard data
      loadDashboardData();
    } else {
      // For other tabs, the component will handle its own refresh
      // We can trigger a refresh by updating a key or calling a method
      window.dispatchEvent(new CustomEvent('hrRefresh'));
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={300} height={60} />
          <Skeleton variant="text" width={200} height={30} />
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Skeleton variant="rectangular" width="100%" height={48} />
        </Box>
        
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} md={6} key={item}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={initializeHRService}>
              Retry
            </Button>
          }
        >
          <Typography variant="h6" gutterBottom>
            HR Service Unavailable
          </Typography>
          {error}
        </Alert>
      </Container>
    );
  }

  const ActiveComponent = tabs[activeTab].component;

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            HR Self Service
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Welcome back, {user?.email || 'User'}
          </Typography>
          
          {/* HR Service Status */}
          {hrHealthStatus && (
            <Box sx={{ mt: 1 }}>
              <Chip
                icon={hrHealthStatus.success ? <TrendingUpIcon /> : undefined}
                label={
                  hrHealthStatus.success 
                    ? `HR Service: ${hrHealthStatus.data?.status || 'Active'}` 
                    : 'HR Service: Unavailable'
                }
                color={hrHealthStatus.success ? 'success' : 'error'}
                variant="outlined"
                size="small"
              />
            </Box>
          )}
        </Box>
        
        <Tooltip title="Refresh Data">
          <IconButton 
            onClick={handleRefresh} 
            color="primary"
            sx={{ 
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Keka Authentication Status */}
      {kekaAuthStatus && !kekaAuthStatus.connected && (
        <Box sx={{ mb: 3 }}>
          <KekaAuthCard onAuthStatusChange={setKekaAuthStatus} />
        </Box>
      )}

      {/* Navigation Tabs */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: 64,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500
            }
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              label={tab.label}
              iconPosition="start"
              sx={{ 
                display: 'flex',
                flexDirection: 'row',
                gap: 1
              }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Fade in timeout={300}>
        <Box>
          <ActiveComponent {...(tabs[activeTab].props || {})} />
        </Box>
      </Fade>

      {/* Footer Info */}
      <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary" align="center">
          HR Self Service powered by Keka Integration
          {hrHealthStatus?.data?.keka_configured === false && (
            <Chip 
              label="Keka Not Configured" 
              size="small" 
              color="warning" 
              variant="outlined" 
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
      </Box>
    </Container>
  );
};

export default HRSelfService;
