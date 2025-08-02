import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Box, 
  Menu, 
  MenuItem, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  useMediaQuery,
  useTheme,
  Chip,
  Avatar,
  Tooltip,
  Zoom,
  Fade
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  AccountCircle, 
  Forum, 
  Book, 
  Logout, 
  Home,
  ConfirmationNumber,
  DirectionsCar,
  Receipt,
  Close
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import DarkModeSwitch from './DarkModeSwitch';
import { supabase } from '../services/supabase';

const NavBar = () => {
  const { user, logout, isLoading } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const isAuthenticated = !!user;
  const location = useLocation();

  const isHrAdmin = user?.email === 'hr@othainsoft.com';
  const [isUserWhitelisted, setIsUserWhitelisted] = useState(false);
  const [loadingWhitelistStatus, setLoadingWhitelistStatus] = useState(true);
  const [cabServiceGlobalVisibility, setCabServiceGlobalVisibility] = useState(true);
  const [loadingCabServiceGlobalVisibility, setLoadingCabServiceGlobalVisibility] = useState(true);

  const EXPENSE_APPROVER_EMAILS = [
    'accounts@othainsoft.com',
    'praveen.omprakash@othainsoft.com',
    'ps@jerseytechpartners.com'
  ].map(e => e.toLowerCase());
  const isExpenseApprover = EXPENSE_APPROVER_EMAILS.includes((user?.email || '').toLowerCase());

  useEffect(() => {
    const checkWhitelist = async () => {
      if (!user) {
        setLoadingWhitelistStatus(false);
        return;
      }
      if (isHrAdmin) {
        setIsUserWhitelisted(true);
        setLoadingWhitelistStatus(false);
        return;
      }
      try {
        setLoadingWhitelistStatus(true);
        const { data, error } = await supabase
          .from('cab_booking_whitelist')
          .select('email')
          .eq('email', user.email)
          .maybeSingle();
        if (error) throw error;
        setIsUserWhitelisted(!!data);
      } catch (err) {
        console.error('Error checking whitelist status in NavBar:', err);
        setIsUserWhitelisted(false);
      } finally {
        setLoadingWhitelistStatus(false);
      }
    };
    checkWhitelist();
  }, [user, isHrAdmin]);

  useEffect(() => {
    const fetchCabServiceVisibility = async () => {
      setLoadingCabServiceGlobalVisibility(true);
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('is_enabled')
          .eq('key', 'cab_service_visibility')
          .single();
        if (error) {
          console.error('Error fetching cab service visibility in NavBar:', error);
          setCabServiceGlobalVisibility(true);
        } else {
          setCabServiceGlobalVisibility(data ? data.is_enabled : true);
        }
      } catch (err) {
        console.error('Exception fetching cab service visibility in NavBar:', err);
        setCabServiceGlobalVisibility(true);
      } finally {
        setLoadingCabServiceGlobalVisibility(false);
      }
    };
    fetchCabServiceVisibility();
  }, []);

  const isAdmin = user?.email === 'admin@example.com';
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };
  
  const isActive = (path) => location.pathname === path;
  
  // Navigation items configuration
  const navigationItems = [
    {
      label: 'Home',
      path: '/',
      icon: Home,
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      show: true
    },
    {
      label: 'Chat',
      path: '/chat',
      icon: Forum,
      color: '#0ea5e9',
      gradient: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
      show: isAuthenticated
    },
    {
      label: 'Tickets',
      path: '/tickets',
      icon: ConfirmationNumber,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
      show: isAuthenticated
    },
    {
      label: 'Expense Tickets',
      path: '/expense-tickets',
      icon: Receipt,
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      show: isAuthenticated && isExpenseApprover,
      badge: 'New'
    },
    {
      label: 'Book A Cab',
      path: '/cab-service',
      icon: DirectionsCar,
      color: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      show: isAuthenticated && cabServiceGlobalVisibility && (isUserWhitelisted || isHrAdmin)
    },
    {
      label: 'Knowledge Base',
      path: '/knowledge',
      icon: Book,
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
      show: isAuthenticated && isAdmin
    },
    {
      label: 'Weekly Report',
      path: '/report',
      icon: Book,
      color: '#f97316',
      gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      show: isAdmin
    },
    {
      label: 'Ticket Dashboard',
      path: '/ticket-dashboard',
      icon: ConfirmationNumber,
      color: '#ec4899',
      gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      show: isAuthenticated && user?.email === 'tickets@othainsoft.com'
    }
  ];

  // Modern button component with enhanced styling
  const ModernNavButton = ({ item, isActive }) => (
    <Tooltip title={item.label} arrow TransitionComponent={Zoom}>
      <Button 
        color="inherit" 
        component={RouterLink} 
        to={item.path}
      sx={{ 
          px: { xs: 1.5, md: 2.5 },
          py: 1.2,
          borderRadius: '16px',
          fontSize: { xs: '0.7rem', md: '0.8rem' },
          fontWeight: 700,
          minWidth: 'auto',
        position: 'relative',
        overflow: 'hidden',
          textTransform: 'none',
          letterSpacing: '0.025em',
          background: isActive 
            ? item.gradient
            : isDarkMode 
              ? 'rgba(30, 41, 59, 0.4)'
              : 'rgba(248, 250, 252, 0.6)',
          color: isActive ? 'white' : (isDarkMode ? '#e2e8f0' : '#334155'),
          backdropFilter: 'blur(12px)',
          border: `1px solid ${isActive ? 'rgba(255,255,255,0.2)' : (isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.4)')}`,
          boxShadow: isActive 
            ? `0 8px 32px ${item.color}30`
            : '0 2px 8px rgba(0,0,0,0.04)',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          '&:hover': {
            background: isActive 
              ? item.gradient
              : item.gradient,
            color: 'white',
            transform: 'translateY(-3px) scale(1.02)',
            boxShadow: `0 12px 40px ${item.color}40`,
            border: '1px solid rgba(255,255,255,0.3)',
          },
        '&::before': {
          content: '""',
          position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            transition: 'left 0.7s ease',
          },
          '&:hover::before': {
            left: '100%',
          },
          '&::after': isActive ? {
            content: '""',
            position: 'absolute',
            bottom: -1,
            left: '50%',
            width: '60%',
            height: '3px',
            background: 'rgba(255,255,255,0.8)',
            borderRadius: '2px',
            transform: 'translateX(-50%)',
            boxShadow: `0 0 12px ${item.color}`,
          } : {}
        }}
        startIcon={
          <item.icon sx={{ 
            fontSize: { xs: '1rem', md: '1.1rem' },
            filter: isActive ? 'drop-shadow(0 0 4px rgba(255,255,255,0.5))' : 'none'
          }} />
        }
        endIcon={
          item.badge && (
            <Chip 
              label={item.badge}
              size="small"
          sx={{ 
                height: '18px',
                fontSize: '0.6rem',
                fontWeight: 700,
                background: 'rgba(255,255,255,0.9)',
                color: item.color,
                ml: 0.5,
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.7 }
                }
              }}
            />
          )
        }
      >
        {!isMobile && item.label}
      </Button>
    </Tooltip>
  );

  // Enhanced drawer content
  const drawerContent = () => (
    <Box
            sx={{ 
        width: '280px',
        height: '100%',
        position: 'relative',
        background: isDarkMode 
          ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)'
          : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          right: '-30%',
          width: '200px',
          height: '200px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '50%',
          opacity: 0.1,
          filter: 'blur(60px)',
          animation: 'float 6s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
            '50%': { transform: 'translateY(-20px) rotate(180deg)' }
          }
        }
      }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      {/* Enhanced Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 3,
        pt: 12, // Add extra top padding to account for navbar height
        borderBottom: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.3)'}`,
        position: 'relative',
        zIndex: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            component="img"
            src={isDarkMode ? "/logowhite.png" : "/Othain-logo2.png"} 
            alt="Othain Logo" 
            sx={{
              height: '24px',
              filter: isDarkMode ? 'brightness(0) invert(1)' : 'none',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)'
              }
            }} 
          />
          <Box>
            <Typography variant="h6" sx={{ 
              fontWeight: 800, 
              fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.5px'
            }}>
            </Typography>
            <Typography variant="caption" sx={{ 
              color: isDarkMode ? '#94a3b8' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: 500
            }}>
            </Typography>
          </Box>
        </Box>
        <IconButton 
          onClick={toggleDrawer(false)}
            sx={{ 
            background: isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.3)',
              '&:hover': {
              background: isDarkMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.5)',
              transform: 'scale(1.1)'
            }
          }}
        >
          <Close sx={{ fontSize: '1.2rem' }} />
        </IconButton>
      </Box>

      {/* Navigation Items */}
      <List sx={{ px: 2, py: 2 }}>
        {navigationItems.filter(item => item.show).map((item, index) => (
          <Fade in timeout={300 + (index * 100)} key={item.path}>
          <ListItem 
            component={RouterLink} 
              to={item.path}
            sx={{ 
              my: 0.5, 
                borderRadius: '16px',
                background: isActive(item.path) 
                  ? item.gradient
                  : 'transparent',
                color: isActive(item.path) ? 'white' : (isDarkMode ? '#e2e8f0' : '#334155'),
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
              '&:hover': {
                  background: item.gradient,
                  color: 'white',
                  transform: 'translateX(8px)',
                  boxShadow: `0 8px 24px ${item.color}30`,
                },
                '&::before': isActive(item.path) ? {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  width: '4px',
                  height: '60%',
                  background: 'rgba(255,255,255,0.8)',
                  borderRadius: '0 4px 4px 0',
                  transform: 'translateY(-50%)',
                  boxShadow: '0 0 12px rgba(255,255,255,0.5)'
                } : {}
              }}
            >
              <ListItemIcon>
                <item.icon sx={{ 
                  color: 'inherit',
                  fontSize: '1.3rem',
                  filter: isActive(item.path) ? 'drop-shadow(0 0 4px rgba(255,255,255,0.5))' : 'none'
                }} />
              </ListItemIcon>
            <ListItemText 
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontWeight: isActive(item.path) ? 700 : 600, fontSize: '0.95rem' }}>
                      {item.label}
                    </Typography>
                    {item.badge && (
                      <Chip 
                        label={item.badge}
                        size="small"
            sx={{ 
                          height: '20px',
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          background: 'rgba(255,255,255,0.9)',
                          color: item.color
                        }}
                      />
                    )}
                  </Box>
                }
            />
          </ListItem>
          </Fade>
        ))}
      </List>
      
      <Divider sx={{ 
        borderColor: isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.3)',
        mx: 2
      }} />
      
      {/* User Section */}
      <List sx={{ px: 2, py: 1 }}>
        {isAuthenticated ? (
          <>
            <ListItem sx={{ 
              borderRadius: '12px',
              background: isDarkMode ? 'rgba(71, 85, 105, 0.2)' : 'rgba(248, 250, 252, 0.8)',
              mb: 1,
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 1
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Avatar sx={{ 
                  width: 32, 
                  height: 32, 
                  fontSize: '0.9rem',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                }}>
                  {user?.email?.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ 
                    fontWeight: 600, 
                    fontSize: '0.85rem',
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {user?.email || 'User'}
                  </Typography>
                  <Typography sx={{ 
                    fontSize: '0.7rem',
                    color: isDarkMode ? '#94a3b8' : '#64748b'
                  }}>
                    Online
                  </Typography>
                </Box>
                <Box sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 8px #22c55e50'
                }} />
              </Box>
            </ListItem>
            
          <ListItem 
            button 
            onClick={handleLogout}
            sx={{ 
                borderRadius: '12px',
                transition: 'all 0.3s ease',
              '&:hover': {
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                  color: '#ef4444',
                  transform: 'translateX(4px)'
              }
            }}
          >
              <ListItemIcon>
                <Logout sx={{ color: 'inherit', fontSize: '1.2rem' }} />
              </ListItemIcon>
            <ListItemText 
              primary="Logout" 
                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
            />
          </ListItem>
          </>
        ) : (
          <ListItem 
            component={RouterLink} 
            to="/login" 
            sx={{ 
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              '&:hover': {
                transform: 'translateX(4px)',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
              }
            }}
          >
            <ListItemIcon>
              <AccountCircle sx={{ color: 'white', fontSize: '1.3rem' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Login" 
              primaryTypographyProps={{ fontWeight: 700, fontSize: '0.95rem' }}
            />
          </ListItem>
        )}
        
        {/* Dark Mode Toggle */}
        <ListItem sx={{ 
          mt: 1,
          borderRadius: '12px',
          background: isDarkMode ? 'rgba(71, 85, 105, 0.2)' : 'rgba(248, 250, 252, 0.8)',
            justifyContent: 'space-between'
        }}>
          <ListItemText 
            primary="Dark Mode" 
            primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
          />
          <DarkModeSwitch checked={isDarkMode} onChange={toggleDarkMode} />
        </ListItem>
      </List>
    </Box>
  );

  return (
      <AppBar 
      position="fixed" 
        sx={{
          background: isDarkMode 
          ? 'rgba(15, 23, 42, 0.8)'
          : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.3)'}`,
        boxShadow: isDarkMode 
          ? '0 8px 32px rgba(0, 0, 0, 0.3)'
          : '0 8px 32px rgba(0, 0, 0, 0.1)',
                    zIndex: 1300,
          '&::before': {
            content: '""',
            position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDarkMode 
            ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 50%, rgba(99, 102, 241, 0.1) 100%)'
            : 'linear-gradient(90deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 50%, rgba(99, 102, 241, 0.05) 100%)',
          opacity: 0.5,
            zIndex: -1
          }
        }}
      >
      <Toolbar sx={{ 
        minHeight: { xs: '70px', md: '80px' },
        py: 1,
        px: { xs: 2, md: 3 }
      }}>
        {/* Mobile menu icon */}
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ 
              mr: 2,
              width: 44,
              height: 44,
              background: isDarkMode ? 'rgba(71, 85, 105, 0.4)' : 'rgba(248, 250, 252, 0.6)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.4)'}`,
              borderRadius: '12px',
              color: isDarkMode ? '#e2e8f0' : '#334155',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                background: isDarkMode ? 'rgba(71, 85, 105, 0.6)' : 'rgba(248, 250, 252, 0.8)',
                transform: 'scale(1.05)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
              }
            }}
            onClick={toggleDrawer(true)}
          >
            <MenuIcon sx={{ fontSize: '1.4rem' }} />
          </IconButton>
        )}
        
        {/* Othain Logo */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mr: 2, 
          flexShrink: 0,
          background: isDarkMode 
            ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(75, 85, 99, 0.6) 100%)'
            : 'linear-gradient(135deg, rgba(248, 250, 252, 0.6) 0%, rgba(241, 245, 249, 0.6) 100%)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '6px 10px',
          border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.8) 0%, rgba(107, 114, 128, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
            transform: 'translateY(-1px)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
          }
        }}>
          <Box
            component="img"
            onClick={() => navigate('/')}
            src={isDarkMode ? "/logowhite.png" : "/Othain-logo2.png"} 
            alt="Othain Logo" 
            sx={{
              height: { xs: '16px', sm: '24px' }, 
              filter: isDarkMode ? 'brightness(0) invert(1)' : 'none',
              marginRight: '2px',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)'
              }
            }} 
          />
        </Box>
        
        {/* Title */}
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 0,
            fontFamily: '"Lexend", sans-serif',
            fontWeight: 700,
            fontSize: { xs: '0.75rem', sm: '1rem' },
            background: isDarkMode 
              ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)'
              : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            marginLeft: '0.5rem',
            marginRight: '2rem',
            letterSpacing: '0.025em'
          }}
        >
          Employee Self Service
        </Typography>
        
        {/* Desktop Navigation */}
        {!isMobile && (
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5,
                  position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            alignItems: 'center'
          }}>
            {navigationItems.filter(item => item.show).map((item) => (
              <ModernNavButton 
                key={item.path} 
                item={item} 
                isActive={isActive(item.path)} 
              />
            ))}
          </Box>
        )}
        
        {/* Right side controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
          {/* Dark Mode Switch for desktop */}
        {!isMobile && (
            <Box sx={{ 
              background: isDarkMode ? 'rgba(71, 85, 105, 0.4)' : 'rgba(248, 250, 252, 0.6)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.4)'}`,
              borderRadius: '12px',
              p: 1,
              display: 'flex',
              alignItems: 'center'
            }}>
            <DarkModeSwitch checked={isDarkMode} onChange={toggleDarkMode} />
          </Box>
        )}
        
          {/* Enhanced User Menu */}
        {isAuthenticated ? (
          <div>
              <Tooltip title="Account settings" arrow>
            <IconButton
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              sx={{
                    width: 44,
                    height: 44,
                    background: isDarkMode ? 'rgba(71, 85, 105, 0.4)' : 'rgba(248, 250, 252, 0.6)',
                backdropFilter: 'blur(10px)',
                    border: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.4)'}`,
                    borderRadius: '12px',
                    color: isDarkMode ? '#e2e8f0' : '#334155',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                      background: isDarkMode ? 'rgba(71, 85, 105, 0.6)' : 'rgba(248, 250, 252, 0.8)',
                      transform: 'scale(1.05)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
                  transform: 'rotate(45deg)',
                  transition: 'all 0.6s ease',
                  opacity: 0
                },
                '&:hover::before': {
                  opacity: 1,
                  transform: 'translateX(100%) translateY(100%) rotate(45deg)'
                }
              }}
            >
                  <Avatar sx={{ 
                    width: 28, 
                    height: 28, 
                    fontSize: '0.8rem',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: '2px solid rgba(255,255,255,0.2)'
                  }}>
                    {user?.email?.charAt(0).toUpperCase()}
                  </Avatar>
            </IconButton>
              </Tooltip>
              
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                  vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={open}
              onClose={handleClose}
              sx={{
                '& .MuiPaper-root': {
                    borderRadius: '20px',
                  background: isDarkMode 
                      ? 'rgba(30, 41, 59, 0.95)' 
                      : 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
                    border: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.3)'}`,
                  mt: 1,
                    minWidth: '280px',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '-50%',
                    right: '-30%',
                    width: '150px',
                    height: '150px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    borderRadius: '50%',
                      opacity: 0.1,
                    filter: 'blur(40px)'
                  }
                }
              }}
            >
                {/* User Info Header */}
                <Box sx={{ 
                  p: 3, 
                  borderBottom: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.3)'}`,
                  position: 'relative',
                  zIndex: 1
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ 
                      width: 48, 
                      height: 48,
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                      fontSize: '1.2rem',
                      fontWeight: 700
                    }}>
                      {user?.email?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography sx={{ 
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: isDarkMode ? '#f1f5f9' : '#1e293b',
                        mb: 0.5
                      }}>
                        Welcome back!
                      </Typography>
                      <Typography sx={{ 
                        fontSize: '0.85rem',
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '180px'
                      }}>
                {user?.email || 'User'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Box sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#22c55e',
                          boxShadow: '0 0 8px #22c55e50'
                        }} />
                        <Typography sx={{ 
                          fontSize: '0.7rem',
                          color: '#22c55e',
                          fontWeight: 600
                        }}>
                          Online
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Menu Items */}
                <Box sx={{ py: 1 }}>
              <MenuItem 
                onClick={handleLogout}
                sx={{
                      mx: 2,
                      my: 0.5,
                  borderRadius: '12px',
                      py: 1.5,
                      px: 2,
                      color: isDarkMode ? '#e2e8f0' : '#334155',
                      transition: 'all 0.3s ease',
                  '&:hover': {
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                        color: '#ef4444',
                        transform: 'translateX(4px)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Logout sx={{ fontSize: '1.2rem' }} />
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Logout
                      </Typography>
                    </Box>
              </MenuItem>
                </Box>
            </Menu>
          </div>
        ) : (
          !isMobile && (
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/login"
                variant="contained"
              startIcon={<AccountCircle />}
              sx={{ 
                  px: 3,
                  py: 1.2,
                  borderRadius: '16px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                    background: 'linear-gradient(135deg, #5856eb 0%, #7c3aed 100%)',
                    transform: 'translateY(-2px) scale(1.02)',
                    boxShadow: '0 12px 32px rgba(99, 102, 241, 0.4)'
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    transition: 'left 0.7s ease',
                },
                '&:hover::before': {
                    left: '100%',
                }
              }}
            >
              Login
            </Button>
          )
        )}
        </Box>
      </Toolbar>
      
      {/* Enhanced Mobile Drawer */}
      <Drawer 
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        sx={{
          '& .MuiDrawer-paper': {
            background: 'transparent',
            boxShadow: 'none',
            border: 'none'
          },
          '& .MuiBackdrop-root': {
            backdropFilter: 'blur(8px)',
            background: 'rgba(0, 0, 0, 0.4)'
          }
        }}
      >
        {drawerContent()}
      </Drawer>
    </AppBar>
  );
};

export default NavBar;