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
  Divider,
  Avatar,
  Stack,
  useTheme,
  alpha,
  Zoom,
  Slide
} from '@mui/material';
import {
  Person as PersonIcon,
  EventAvailable as LeaveIcon,
  Schedule as AttendanceIcon,
  Receipt as PayslipIcon,
  Event as HolidayIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Notifications as NotificationIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { hrService } from '../services/hrService';

// Import HR components
import HRProfile from '../components/hr/HRProfile';
import HRLeaveManagement from '../components/hr/HRLeaveManagement';
import HRAttendance from '../components/hr/HRAttendance';
import HRPayslips from '../components/hr/HRPayslips';
import HRHolidays from '../components/hr/HRHolidays';
import HRDashboard from '../components/hr/HRDashboard';
import KekaAuthCard from '../components/hr/KekaAuthCard';

const HRSelfService = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hrHealthStatus, setHrHealthStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    profile: null,
    leaveBalances: [],
    recentAttendance: [],
    upcomingHolidays: []
  });
  const [kekaAuthStatus, setKekaAuthStatus] = useState(null);

  // Enhanced tab configuration with modern styling
  const tabs = [
    {
      label: 'Dashboard',
      icon: <DashboardIcon />,
      component: HRDashboard,
      props: { data: dashboardData },
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      label: 'Profile',
      icon: <PersonIcon />,
      component: HRProfile,
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      label: 'Leave Management',
      icon: <LeaveIcon />,
      component: HRLeaveManagement,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    },
    {
      label: 'Attendance',
      icon: <AttendanceIcon />,
      component: HRAttendance,
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    },
    {
      label: 'Payslips',
      icon: <PayslipIcon />,
      component: HRPayslips,
      color: '#06b6d4',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      label: 'Holidays',
      icon: <HolidayIcon />,
      component: HRHolidays,
      color: '#ef4444',
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    }
  ];

  useEffect(() => {
    initializeHRService();
  }, []);

  const initializeHRService = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check HR service health with animation
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

      // Load dashboard data with staggered loading
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

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 0) {
      await loadDashboardData();
    } else {
      window.dispatchEvent(new CustomEvent('hrRefresh'));
    }
    setTimeout(() => setRefreshing(false), 1000); // Minimum animation time
  };

  // Modern glassmorphism background
  const modernBackgroundStyle = {
    background: `
      linear-gradient(135deg, 
        ${alpha(theme.palette.primary.main, 0.1)} 0%, 
        ${alpha(theme.palette.secondary.main, 0.05)} 100%
      )
    `,
    minHeight: '100vh',
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '300px',
      background: `
        radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.15)} 0%, transparent 50%)
      `,
      zIndex: -1
    }
  };

  if (loading) {
    return (
      <Box sx={modernBackgroundStyle}>
        <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
          <Box sx={{ mb: 4 }}>
            <Skeleton 
              variant="text" 
              width={350} 
              height={70} 
              sx={{ 
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1)
              }} 
            />
            <Skeleton 
              variant="text" 
              width={250} 
              height={40} 
              sx={{ 
                mt: 1,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.05)
              }} 
            />
          </Box>
          
          <Paper 
            elevation={0} 
            sx={{ 
              mb: 3, 
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.paper, 0.7),
              backdropFilter: 'blur(10px)'
            }}
          >
            <Skeleton variant="rectangular" width="100%" height={72} sx={{ borderRadius: 3 }} />
          </Paper>
          
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((item) => (
              <Grid item xs={12} md={6} key={item}>
                <Zoom in timeout={300 + item * 100}>
                  <Paper
                    elevation={0}
                    sx={{
                      height: 220,
                      borderRadius: 4,
                      bgcolor: alpha(theme.palette.background.paper, 0.7),
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                    }}
                  >
                    <Skeleton variant="rectangular" height="100%" sx={{ borderRadius: 4 }} />
                  </Paper>
                </Zoom>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={modernBackgroundStyle}>
        <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
          <Slide in direction="down" timeout={500}>
            <Alert 
              severity="error"
              sx={{
                borderRadius: 3,
                bgcolor: alpha(theme.palette.error.main, 0.1),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                '& .MuiAlert-icon': {
                  color: theme.palette.error.main
                }
              }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={initializeHRService}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none'
                  }}
                >
                  Retry Connection
                </Button>
              }
            >
              <Typography variant="h6" gutterBottom fontWeight={600}>
                HR Service Unavailable
              </Typography>
              <Typography variant="body2">
                {error}
              </Typography>
            </Alert>
          </Slide>
        </Container>
      </Box>
    );
  }

  const ActiveComponent = tabs[activeTab].component;

  return (
    <Box sx={modernBackgroundStyle}>
      <Container maxWidth="lg" sx={{ pt: 3, pb: 4 }}>
        {/* Modern Header */}
        <Fade in timeout={600}>
          <Box sx={{ 
            mb: 4, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box>
              <Typography 
                variant="h3" 
                component="h1" 
                gutterBottom 
                sx={{
                  fontWeight: 800,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  mb: 1
                }}
              >
                HR Self Service
              </Typography>
              
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32,
                    bgcolor: theme.palette.primary.main,
                    fontSize: '0.875rem'
                  }}
                >
                  {(user?.email || 'U').charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600} color="text.primary">
                    Welcome back!
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.email || 'user@company.com'}
                  </Typography>
                </Box>
              </Stack>
              
              {/* Enhanced HR Service Status */}
              {hrHealthStatus && (
                <Zoom in timeout={800}>
                  <Chip
                    icon={hrHealthStatus.success ? <CheckIcon /> : <WarningIcon />}
                    label={
                      hrHealthStatus.success 
                        ? `Connected • ${hrHealthStatus.data?.status || 'Active'}` 
                        : 'Service Offline'
                    }
                    sx={{
                      background: hrHealthStatus.success 
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'linear-gradient(135deg, #ef4444, #dc2626)',
                      color: 'white',
                      fontWeight: 600,
                      boxShadow: hrHealthStatus.success 
                        ? `0 4px 14px 0 ${alpha('#10b981', 0.3)}`
                        : `0 4px 14px 0 ${alpha('#ef4444', 0.3)}`,
                      border: 'none',
                      '& .MuiChip-icon': {
                        color: 'white'
                      }
                    }}
                  />
                </Zoom>
              )}
            </Box>
            
            <Stack direction="row" spacing={1}>
              <Tooltip title="Notifications" arrow>
                <IconButton 
                  sx={{ 
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    '&:hover': { 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <NotificationIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title={refreshing ? "Refreshing..." : "Refresh Data"} arrow>
                <IconButton 
                  onClick={handleRefresh} 
                  disabled={refreshing}
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    color: theme.palette.primary.main,
                    '&:hover': { 
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.25)}`
                    },
                    '&:disabled': {
                      bgcolor: alpha(theme.palette.action.disabled, 0.1)
                    },
                    transition: 'all 0.2s ease-in-out',
                    ...(refreshing && {
                      animation: 'spin 1s linear infinite',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    })
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Settings" arrow>
                <IconButton 
                  sx={{ 
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    '&:hover': { 
                      bgcolor: alpha(theme.palette.secondary.main, 0.1),
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 25px ${alpha(theme.palette.secondary.main, 0.15)}`
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </Fade>

        {/* Enhanced Keka Authentication Status */}
        {kekaAuthStatus && !kekaAuthStatus.connected && (
          <Slide in direction="up" timeout={700}>
            <Box sx={{ mb: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 4,
                  background: `linear-gradient(135deg, 
                    ${alpha(theme.palette.warning.main, 0.1)} 0%, 
                    ${alpha(theme.palette.warning.main, 0.05)} 100%
                  )`,
                  backdropFilter: 'blur(15px)',
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                  overflow: 'hidden'
                }}
              >
                <KekaAuthCard onAuthStatusChange={setKekaAuthStatus} />
              </Paper>
            </Box>
          </Slide>
        )}

        {/* Modern Navigation Tabs */}
        <Slide in direction="up" timeout={500}>
          <Paper 
            elevation={0} 
            sx={{ 
              mb: 4,
              borderRadius: 4,
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(15px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 72,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: theme.palette.text.secondary,
                  transition: 'all 0.3s ease-in-out',
                  borderRadius: 2,
                  margin: '8px 4px',
                  '&:hover': {
                    color: theme.palette.primary.main,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    transform: 'translateY(-2px)'
                  },
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                    fontWeight: 700,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.2)}`
                  }
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: 1.5,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                }
              }}
            >
              {tabs.map((tab, index) => (
                <Tab
                  key={index}
                  icon={
                    <Box sx={{ 
                      color: activeTab === index ? tab.color : 'inherit',
                      transition: 'color 0.3s ease'
                    }}>
                      {tab.icon}
                    </Box>
                  }
                  label={tab.label}
                  iconPosition="start"
                  sx={{ 
                    display: 'flex',
                    flexDirection: 'row',
                    gap: 1.5
                  }}
                />
              ))}
            </Tabs>
          </Paper>
        </Slide>

        {/* Enhanced Tab Content */}
        <Fade in timeout={400} key={activeTab}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              bgcolor: alpha(theme.palette.background.paper, 0.6),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              overflow: 'hidden',
              minHeight: '500px',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: tabs[activeTab].gradient,
                zIndex: 1
              }
            }}
          >
            <Box sx={{ p: 3 }}>
              <ActiveComponent {...(tabs[activeTab].props || {})} />
            </Box>
          </Paper>
        </Fade>

        {/* Modern Footer */}
        <Fade in timeout={1000}>
          <Box sx={{ 
            mt: 6, 
            pt: 3,
            textAlign: 'center'
          }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                bgcolor: alpha(theme.palette.background.paper, 0.4),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                py: 2,
                px: 3
              }}
            >
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                justifyContent="center" 
                alignItems="center" 
                spacing={2}
              >
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  fontWeight={500}
                >
                  HR Self Service powered by Keka Integration
                </Typography>
                
                {hrHealthStatus?.data?.keka_configured === false && (
                  <Chip 
                    label="Keka Setup Required" 
                    size="small" 
                    color="warning" 
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      fontWeight: 600,
                      bgcolor: alpha(theme.palette.warning.main, 0.1),
                      borderColor: alpha(theme.palette.warning.main, 0.3)
                    }}
                  />
                )}
                
                <Chip
                  icon={<TrendingUpIcon />}
                  label="v2.1.0"
                  size="small"
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    fontWeight: 600,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                    color: theme.palette.primary.main
                  }}
                />
              </Stack>
            </Paper>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default HRSelfService;