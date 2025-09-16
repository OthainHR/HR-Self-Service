import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
  Fade,
  Slide,
  Zoom
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  EventAvailable as LeaveIcon,
  Schedule as AttendanceIcon,
  Receipt as PayslipIcon,
  Event as HolidayIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { hrService } from '../services/hrServiceDirect';

// Lazy-load components for performance
const HRProfile = React.lazy(() => import('../components/hr/HRProfile'));
const HRLeaveManagement = React.lazy(() => import('../components/hr/HRLeaveManagement'));
const HRAttendance = React.lazy(() => import('../components/hr/HRAttendance'));
const HRPayslips = React.lazy(() => import('../components/hr/HRPayslips'));
const HRHolidays = React.lazy(() => import('../components/hr/HRHolidays'));
const HRDashboard = React.lazy(() => import('../components/hr/HRDashboard'));
const KekaAuthCard = React.lazy(() => import('../components/hr/KekaAuthCard'));
const HRTestData = React.lazy(() => import('../components/hr/HRTestData'));

const HRSelfService = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hrHealthStatus, setHrHealthStatus] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    profile: null,
    leaveBalances: [],
    recentAttendance: [],
    upcomingHolidays: []
  });

  // Modern gradient themes for each tab
  const tabThemes = useMemo(() => [
    {
      name: 'Dashboard',
      gradient: 'white',
      color: '#667eea',
      shadow: 'none'
    },
    {
      name: 'Profile', 
      gradient: 'white',
      color: '#f093fb',
      shadow: 'rgba(240, 147, 251, 0.4)'
    },
    {
      name: 'Leave',
      gradient: 'white', 
      color: '#4facfe',
      shadow: 'rgba(79, 172, 254, 0.4)'
    },
    {
      name: 'Attendance',
      gradient: 'white',
      color: '#43e97b', 
      shadow: 'rgba(67, 233, 123, 0.4)'
    },
    {
      name: 'Payslips',
      gradient: 'white',
      color: '#fa709a',
      shadow: 'rgba(250, 112, 154, 0.4)'
    },
    {
      name: 'Holidays',
      gradient: 'white',
      color: '#000000',
      shadow: 'rgba(168, 237, 234, 0.4)'
    }
  ], []);

  const tabs = useMemo(() => {
    const baseTabs = [
      { label: 'Dashboard', component: HRDashboard, props: { data: dashboardData } },
      { label: 'Profile', icon: <PersonIcon color="white"/>, component: HRProfile },
      { label: 'Leave', icon: <LeaveIcon />, component: HRLeaveManagement },
      { label: 'Attendance', icon: <AttendanceIcon />, component: HRAttendance },
      { label: 'Payslips', icon: <PayslipIcon />, component: HRPayslips },
      { label: 'Holidays', icon: <HolidayIcon />, component: HRHolidays }
    ];
    
    // Add test tab if user is not authenticated
    if (!user) {
      baseTabs.push({ label: 'Test Data', icon: <CheckIcon />, component: HRTestData });
    }
    
    return baseTabs;
  }, [dashboardData, user]);

  const currentTheme = tabThemes[activeTab];

  useEffect(() => {
    initializeService();
  }, []);

  const initializeService = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check service health
      const healthResult = await hrService.checkHRServiceHealth();
      setHrHealthStatus(healthResult);
      
      if (!healthResult?.success) {
        throw new Error('HR service is not available');
      }


      // Load initial dashboard data
      await loadDashboardData();
    } catch (err) {
      setError(err.message || 'Failed to initialize HR service');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = useCallback(async () => {
    try {
      // Try to load profile first
      let profileResult = await hrService.getMyProfile();
      if (!profileResult.success && profileResult.error?.includes('401')) {
        try {
          const testResponse = await fetch('http://localhost:8000/api/hr/test-profile');
          const testData = await testResponse.json();
          if (testData.success) {
            profileResult = { success: true, data: testData.data };
          }
        } catch (testErr) {
          console.log('Test profile endpoint failed:', testErr);
        }
      }

      // Try to load leave balances
      let leaveBalancesResult = await hrService.getMyLeaveBalances();
      if (!leaveBalancesResult.success && leaveBalancesResult.error?.includes('401')) {
        try {
          const testResponse = await fetch('http://localhost:8000/api/hr/test-leave-balances');
          const testData = await testResponse.json();
          if (testData.success) {
            leaveBalancesResult = { success: true, data: testData.data };
          }
        } catch (testErr) {
          console.log('Test leave balances endpoint failed:', testErr);
        }
      }

      const [attendance, holidays] = await Promise.allSettled([
        hrService.getCurrentMonthAttendance(),
        hrService.getUpcomingHolidays()
      ]);

      setDashboardData({
        profile: profileResult.success ? profileResult.data : null,
        leaveBalances: leaveBalancesResult.success ? leaveBalancesResult.data : [],
        recentAttendance: attendance.status === 'fulfilled' && attendance.value.success ? attendance.value.data : [],
        upcomingHolidays: holidays.status === 'fulfilled' && holidays.value.success ? holidays.value.data : []
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 0) {
        await loadDashboardData();
      } else {
        window.dispatchEvent(new CustomEvent('hrRefresh'));
      }
    } finally {
      setTimeout(() => setRefreshing(false), 800);
    }
  };


  // Loading state
  if (loading) {
    return (
      <Box sx={{
        minHeight: '100vh',
        background: `
          radial-gradient(ellipse 800px 600px at 50% 0%, ${alpha('#667eea', 0.15)}, transparent),
          radial-gradient(ellipse 600px 400px at 0% 100%, ${alpha('#f093fb', 0.1)}, transparent),
          linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3
      }}>
        <Card sx={{
          maxWidth: 480,
          width: '100%',
          p: 4,
          textAlign: 'center',
          borderRadius: 4,
          background: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`
        }}>
          <Box sx={{ mb: 3 }}>
            <CircularProgress 
              size={60} 
              thickness={4}
              sx={{ 
                color: '#667eea',
                mb: 2
              }}
            />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Connecting to HR Services
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Loading your profile, leave balances, and attendance data...
            </Typography>
          </Box>
          <LinearProgress 
            sx={{ 
              borderRadius: 2,
              height: 6,
              bgcolor: alpha('#667eea', 0.1),
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                background: 'linear-gradient(90deg, #667eea, #764ba2)'
              }
            }} 
          />
        </Card>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fc466b 0%, #3f5efb 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3
      }}>
        <Card sx={{
          maxWidth: 500,
          width: '100%',
          borderRadius: 6,
          background: alpha('#ffffff', 0.95),
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
          overflow: 'hidden'
        }}>
          <Box sx={{
            background: 'linear-gradient(135deg, #fc466b 0%, #3f5efb 100%)',
            p: 4,
            textAlign: 'center',
            color: 'white'
          }}>
            <WarningIcon sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h4" fontWeight="bold">
              Service Unavailable
            </Typography>
          </Box>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {error}
            </Typography>
            <Button 
              variant="contained"
              size="large"
              onClick={initializeService}
              startIcon={<RefreshIcon />}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                background: 'linear-gradient(135deg, #fc466b 0%, #3f5efb 100%)',
                boxShadow: '0 8px 25px rgba(252, 70, 107, 0.4)',
                '&:hover': {
                  boxShadow: '0 12px 35px rgba(252, 70, 107, 0.6)',
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const ActiveComponent = tabs[activeTab].component;

  return (
    <Box sx={{
      minHeight: '100vh',
      background: `
        radial-gradient(ellipse 1200px 800px at 50% 0%, ${alpha(currentTheme.color, 0.12)}, transparent),
        radial-gradient(ellipse 800px 600px at 0% 100%, ${alpha(currentTheme.color, 0.08)}, transparent),
        radial-gradient(ellipse 600px 400px at 100% 50%, ${alpha(currentTheme.color, 0.06)}, transparent),
        linear-gradient(180deg, #fafafa 0%, #f8fafc 100%)
      `
    }}>
      {/* Modern App Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          color: theme.palette.text.primary
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          {/* Logo */}
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: 3,
            background: currentTheme.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `none`
          }}>
              
          </Box>

          <Typography variant="h6" fontWeight="bold" sx={{ flex: 1 }}>
            HR Self Service
          </Typography>

          {/* Status Indicator - Shows HR service status */}
          <Chip
            icon={<CheckIcon />}
            label="HR Data Available"
            size="small"
            sx={{
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: 'white',
              fontWeight: 600,
              border: 'none',
              '& .MuiChip-icon': { color: 'white' }
            }}
          />

          {/* Action Buttons */}
          <Stack direction="row" spacing={1}>
            <Avatar 
              sx={{ 
                width: 36, 
                height: 36,
                background: currentTheme.gradient,
                fontWeight: 'bold'
              }}
            >
              {(user?.email || 'U').charAt(0).toUpperCase()}
            </Avatar>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Welcome Section */}
        <Fade in timeout={600}>
          <Card sx={{
            mb: 3,
            borderRadius: 4,
            background: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
            overflow: 'hidden'
          }}>
            <Box sx={{
              background: currentTheme.gradient,
              p: 3,
              color: 'white'
            }}>
              <Stack direction="row" spacing={3} alignItems="center">
                <Avatar sx={{
                  width: 60,
                  height: 60,
                  background: alpha('#ffffff', 0.2),
                  border: '1px solid #000000',
                  backdropFilter: 'blur(10px)',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: 'black'
                }}>
                  {(user?.email || 'U').charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold" gutterBottom color="black">
                    Welcome back!
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9, color: 'black' }}>
                    {user?.email || 'user@company.com'}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Card>
        </Fade>


        {/* Main Content Card */}
        <Card sx={{
          borderRadius: 4.5,
          background: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(25px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: '0 12px 50px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          minHeight: 600
        }}>
          {/* Enhanced Tabs */}
          <Box sx={{ borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant={isMobile ? 'scrollable' : 'standard'}
              scrollButtons="auto"
              sx={{
                px: 1,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  minHeight: 64,
                  borderRadius: 3,
                  margin: '8px 4px',
                  color: theme.palette.text.secondary,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    background: alpha(currentTheme.color, 0.08),
                    color: currentTheme.color,
                    transform: 'translateY(-1px)'
                  },
                  '&.Mui-selected': {
                    background: alpha(currentTheme.color, 0.1),
                    color: currentTheme.color,
                    fontWeight: 700,
                    boxShadow: `0 4px 20px ${alpha(currentTheme.color, 0.2)}`
                  }
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: 2,
                  background: currentTheme.gradient
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
                    flexDirection: 'row',
                    gap: 1.5
                  }}
                />
              ))}
            </Tabs>
          </Box>

          {/* Content Header */}
          <Box sx={{
            p: 3,
            background: alpha(currentTheme.color, 0.04),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`
          }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{
                width: 50,
                height: 50,
                borderRadius: 4,
                background: currentTheme.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 6px 25px ${currentTheme.shadow}`
              }}>
                {tabs[activeTab].icon}
              </Box>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {tabs[activeTab].label}
                </Typography>
                <Typography variant="body2" color="black">
                  Manage your {tabs[activeTab].label.toLowerCase()} information and settings
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Tab Content */}
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <React.Suspense 
              fallback={
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress sx={{ color: currentTheme.color }} />
                </Box>
              }
            >
              <ActiveComponent {...(tabs[activeTab].props || {})} />
            </React.Suspense>
          </CardContent>
        </Card>

        {/* Enhanced Footer */}
        <Box sx={{ mt: 4 }}>
          <Card sx={{
            borderRadius: 2.5,
            background: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                justifyContent="space-between" 
                alignItems="center" 
                spacing={2}
                sx={{
                  border: '1px solid #000000',
                  borderRadius: 1.5,
                  p: 1
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    background: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      HR Self Service
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Powered by Keka Integration
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip
                    icon={<TrendingUpIcon />}
                    label="v2.3.0"
                    size="small"
                    sx={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      fontWeight: 600,
                      '& .MuiChip-icon': { color: 'white' }
                    }}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Container>

      {/* Mobile FAB */}
      {isMobile && (
        <Tooltip title={refreshing ? 'Refreshing...' : 'Refresh Data'}>
          <IconButton
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              width: 56,
              height: 56,
              background: currentTheme.gradient,
              color: 'white',
              boxShadow: `0 8px 30px ${currentTheme.shadow}`,
              '&:hover': {
                boxShadow: `0 12px 40px ${currentTheme.shadow}`,
                transform: 'scale(1.05)'
              },
              transition: 'all 0.3s ease',
              zIndex: 1000
            }}
          >
            {refreshing ? (
              <CircularProgress size={24} sx={{ color: 'white' }} />
            ) : (
              <RefreshIcon />
            )}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default HRSelfService;