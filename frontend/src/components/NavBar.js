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
  useTheme
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  AccountCircle, 
  Chat, 
  Book, 
  Logout, 
  Home,
  ConfirmationNumber,
  DirectionsCar,
  Receipt
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
          setCabServiceGlobalVisibility(true); // Default to true
        } else {
          setCabServiceGlobalVisibility(data ? data.is_enabled : true);
        }
      } catch (err) {
        console.error('Exception fetching cab service visibility in NavBar:', err);
        setCabServiceGlobalVisibility(true); // Default to true
      } finally {
        setLoadingCabServiceGlobalVisibility(false);
      }
    };
    fetchCabServiceVisibility();
  }, []);

  // Temporary check using email for admin - Replace with proper role check later
  const isAdmin = user?.email === 'admin@example.com';
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State for user menu
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  // State for mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Open user menu
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Close user menu
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      
    }
  };
  
  // Toggle drawer
  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };
  
  // Helper function to determine if a link is active
  const isActive = (path) => location.pathname === path;
  
  // Drawer content
  const drawerContent = () => (
    <Box
      sx={{ 
        width: '100%',
        height: '100%',
        position: 'relative',
        zIndex: 1
      }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        p: 2,
        background: isDarkMode 
          ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
          : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          left: '-30%',
          width: '120px',
          height: '120px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '50%',
          opacity: 0.08,
          filter: 'blur(30px)'
        }
      }}>
        <img 
          src={isDarkMode ? "/logowhite.png" : "/Othain-logo2.png"} 
          alt="Othain Logo" 
          height={28} 
          style={{ 
            filter: isDarkMode ? 'brightness(0) invert(1)' : 'none',
            zIndex: 1,
            position: 'relative'
          }} 
        />
      </Box>
      <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.08)' }} />
      <List>
        <ListItem 
          component={RouterLink} 
          to="/" 
          button
          selected={isActive('/')}
          sx={{ 
            my: 0.5, 
            borderRadius: 1,
            mx: 1,
            backgroundColor: isActive('/') ? 'rgba(67, 218, 238, 0.2)' : 'transparent',
            '&:hover': {
              background: 'rgba(67, 2188, 238, 0.1)',
            }
          }}
        >
          <ListItemIcon><Home sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)' }} /></ListItemIcon>
          <ListItemText 
            primary="Home" 
            primaryTypographyProps={{ 
              fontWeight: isActive('/') ? 700 : 500,
              color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)'
            }}
          />
        </ListItem>
        
        {isAuthenticated && (
          <ListItem 
            component={RouterLink} 
            to="/chat" 
            button
            selected={isActive('/chat')}
            sx={{ 
              my: 0.5, 
              borderRadius: 1,
              mx: 1,
              backgroundColor: isActive('/chat') ? 'rgba(67, 218, 238, 0.2)' : 'transparent',
              '&:hover': {
                background: 'rgba(67, 218, 238, 0.1)',
              }
            }}
          >
            <ListItemIcon><Chat sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)' }} /></ListItemIcon>
            <ListItemText 
              primary="Chat" 
              primaryTypographyProps={{ 
                fontWeight: isActive('/chat') ? 700 : 500,
                color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)'
              }}
            />
          </ListItem>
        )}
        
        {isAuthenticated && (
          <ListItem 
            component={RouterLink} 
            to="/tickets"
            sx={{ 
              my: 0.5, 
              borderRadius: 1,
              mx: 1,
              backgroundColor: isActive('/tickets') ? 'rgba(67, 218, 238, 0.2)' : 'transparent',
              '&:hover': {
                background: 'rgba(67, 218, 238, 0.1)',
              }
            }}
          >
            <ListItemIcon><ConfirmationNumber sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)' }} /></ListItemIcon>
            <ListItemText 
              primary="Ticketing" 
              primaryTypographyProps={{ 
                fontWeight: isActive('/tickets') ? 700 : 500,
                color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)'
              }}
            />
          </ListItem>
        )}

          {isAuthenticated && isExpenseApprover && (
          <ListItem 
            component={RouterLink} 
            to="/expense-tickets"
            sx={{ 
              my: 0.5, 
              borderRadius: 1,
              mx: 1,
              backgroundColor: isActive('/expense-tickets') ? 'rgba(67, 218, 238, 0.2)' : 'transparent',
              '&:hover': {
                background: 'rgba(67, 218, 238, 0.1)',
              }
            }}
          >
            <ListItemIcon><Receipt sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)' }} /></ListItemIcon>
            <ListItemText 
              primary="Expense Tickets" 
              primaryTypographyProps={{ 
                fontWeight: isActive('/expense-tickets') ? 700 : 500,
                color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)'
              }}
            />
          </ListItem>
        )}
        
        {isAuthenticated && cabServiceGlobalVisibility && (isUserWhitelisted || isHrAdmin) && (
          <ListItem 
            component={RouterLink} 
            to="/cab-service"
            sx={{ 
              my: 0.5, 
              borderRadius: 1,
              mx: 1,
              backgroundColor: isActive('/cab-service') ? 'rgba(67, 218, 238, 0.2)' : 'transparent',
              '&:hover': {
                background: 'rgba(67, 218, 238, 0.1)',
              }
            }}
          >
            <ListItemIcon><DirectionsCar sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)' }} /></ListItemIcon>
            <ListItemText 
              primary="Book A Cab" 
              primaryTypographyProps={{ 
                fontWeight: isActive('/cab-service') ? 700 : 500,
                color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)'
              }}
            />
          </ListItem>
        )}
        
        {isAuthenticated && isAdmin && (
          <ListItem 
            component={RouterLink} 
            to="/knowledge"
            sx={{ 
              my: 0.5, 
              borderRadius: 1,
              mx: 1,
              backgroundColor: isActive('/knowledge') ? 'rgba(67, 218, 238, 0.2)' : 'transparent',
              '&:hover': {
                background: 'rgba(67, 218, 238, 0.1)',
              }
            }}
          >
            <ListItemIcon><Book sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)' }} /></ListItemIcon>
            <ListItemText 
              primary="Knowledge Base" 
              primaryTypographyProps={{ 
                fontWeight: isActive('/knowledge') ? 700 : 500,
                color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)'
              }}
            />
          </ListItem>
        )}
        
        {isAdmin && (
          <ListItem 
            component={RouterLink} 
            to="/report"
            sx={{ 
              my: 0.5, 
              borderRadius: 1,
              mx: 1,
              backgroundColor: isActive('/report') ? 'rgba(67, 218, 238, 0.2)' : 'transparent',
              '&:hover': {
                background: 'rgba(67, 218, 238, 0.1)',
              }
            }}
          >
            <ListItemIcon><Book sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)' }} /></ListItemIcon>
            <ListItemText 
              primary="Weekly Report" 
              primaryTypographyProps={{ 
                fontWeight: isActive('/report') ? 700 : 500,
                color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)'
              }}
            />
          </ListItem>
        )}
        
        {isAuthenticated && user?.email === 'tickets@othainsoft.com' && (
          <ListItem 
            component={RouterLink} 
            to="/ticket-dashboard"
            button
            selected={isActive('/ticket-dashboard')}
            sx={{ 
              my: 0.5, 
              borderRadius: 1,
              mx: 1,
              backgroundColor: isActive('/ticket-dashboard') ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              '&:hover': {
                background: 'rgba(99, 102, 241, 0.08)',
              }
            }}
          >
            <ListItemIcon><ConfirmationNumber sx={{ color: isDarkMode ? '#8b5cf6' : '#6366f1' }} /></ListItemIcon>
            <ListItemText 
              primary="Ticket Dashboard" 
              primaryTypographyProps={{ 
                fontWeight: isActive('/ticket-dashboard') ? 700 : 500,
                color: isDarkMode ? '#8b5cf6' : '#6366f1'
              }}
            />
          </ListItem>
        )}
      </List>
      
      <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.08)' }} />
      
      <List>
        {isAuthenticated ? (
          <ListItem 
            button 
            onClick={handleLogout}
            sx={{ 
              my: 0.5, 
              borderRadius: 1,
              mx: 1,
              '&:hover': {
                background: 'rgba(67, 218, 238, 0.1)',
              }
            }}
          >
            <ListItemIcon><Logout sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)' }} /></ListItemIcon>
            <ListItemText 
              primary="Logout" 
              primaryTypographyProps={{ 
                fontWeight: 500,
                color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)'
              }}
            />
          </ListItem>
        ) : (
          <ListItem 
            component={RouterLink} 
            to="/login" 
            button
            selected={isActive('/login')}
            sx={{ 
              my: 0.5, 
              borderRadius: 1,
              mx: 1,
              backgroundColor: isActive('/login') ? 'rgba(67, 218, 238, 0.2)' : 'transparent',
              '&:hover': {
                background: 'rgba(67, 218, 238, 0.1)',
              }
            }}
          >
            <ListItemIcon><AccountCircle sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)' }} /></ListItemIcon>
            <ListItemText 
              primary="Login" 
              primaryTypographyProps={{ 
                fontWeight: isActive('/login') ? 700 : 500,
                color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)'
              }}
            />
          </ListItem>
        )}
        
        {/* Add Dark Mode Toggle to drawer */}
        <ListItem 
          sx={{ 
            my: 0.5, 
            borderRadius: 1,
            mx: 1,
            display: 'flex',
            justifyContent: 'space-between'
          }}
        >
          <ListItemText 
            primary="Dark Mode" 
            primaryTypographyProps={{ 
              fontWeight: 500,
              color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)'
            }}
          />
          <DarkModeSwitch checked={isDarkMode} onChange={toggleDarkMode} />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <AppBar 
      position="sticky" 
      sx={{
        background: isDarkMode 
          ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
        borderTop: 'none',
        // Ensure the bar sits below the iOS notch / dynamic island
        top: 'env(safe-area-inset-top)',
        paddingTop: 'env(safe-area-inset-top)',
        zIndex: 1300,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '200px',
          height: '200px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '50%',
          opacity: 0.03,
          filter: 'blur(40px)',
          zIndex: -1
        }
      }}
    >
      <Toolbar>
        {/* Mobile menu icon */}
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ 
              mr: 1.5,
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%)',
              backdropFilter: 'blur(10px)',
              border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
              borderRadius: '10px',
              color: isDarkMode ? '#f1f5f9' : '#1e293b',
              width: '36px',
              height: '36px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.9) 0%, rgba(107, 114, 128, 0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.9) 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
              }
            }}
            onClick={toggleDrawer(true)}
          >
            <MenuIcon sx={{ fontSize: '1.25rem' }} />
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
            flexGrow: 1,
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
            letterSpacing: '0.025em'
          }}
        >
          Employee Self Service
        </Typography>
        
        {/* Desktop navigation */}
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/"
              sx={{ 
                px: 2,
                py: 1,
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: isActive('/') 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                  : isDarkMode 
                    ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(75, 85, 99, 0.6) 100%)'
                    : 'linear-gradient(135deg, rgba(248, 250, 252, 0.6) 0%, rgba(241, 245, 249, 0.6) 100%)',
                color: isActive('/') ? 'white' : (isDarkMode ? '#f1f5f9' : '#1e293b'),
                backdropFilter: 'blur(10px)',
                border: isActive('/') 
                  ? '1px solid rgba(59, 130, 246, 0.3)'
                  : isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
                boxShadow: isActive('/') ? '0 8px 25px rgba(59, 130, 246, 0.3)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  background: isActive('/') 
                    ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
                    : isDarkMode 
                      ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.8) 0%, rgba(107, 114, 128, 0.8) 100%)'
                      : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: isActive('/') 
                    ? '0 12px 35px rgba(59, 130, 246, 0.4)'
                    : '0 8px 25px rgba(0, 0, 0, 0.1)'
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
              startIcon={<Home />}
            >
              Home
            </Button>
            
            {isAuthenticated && (
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/chat"
                sx={{ 
                  px: 2,
                  py: 1,
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: isActive('/chat') 
                    ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                    : isDarkMode 
                      ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(75, 85, 99, 0.6) 100%)'
                      : 'linear-gradient(135deg, rgba(248, 250, 252, 0.6) 0%, rgba(241, 245, 249, 0.6) 100%)',
                  color: isActive('/chat') ? 'white' : (isDarkMode ? '#f1f5f9' : '#1e293b'),
                  backdropFilter: 'blur(10px)',
                  border: isActive('/chat') 
                    ? '1px solid rgba(5, 150, 105, 0.3)'
                    : isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
                  boxShadow: isActive('/chat') ? '0 8px 25px rgba(5, 150, 105, 0.3)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: isActive('/chat') 
                      ? 'linear-gradient(135deg, #047857 0%, #059669 100%)'
                      : isDarkMode 
                        ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.8) 0%, rgba(107, 114, 128, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: isActive('/chat') 
                      ? '0 12px 35px rgba(5, 150, 105, 0.4)'
                      : '0 8px 25px rgba(0, 0, 0, 0.1)'
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
                startIcon={<Chat />}
              >
                Chat
              </Button>
            )}
            
            {isAuthenticated && (
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/tickets"
                sx={{ 
                  px: 2,
                  py: 1,
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: isActive('/tickets') 
                    ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
                    : isDarkMode 
                      ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(75, 85, 99, 0.6) 100%)'
                      : 'linear-gradient(135deg, rgba(248, 250, 252, 0.6) 0%, rgba(241, 245, 249, 0.6) 100%)',
                  color: isActive('/tickets') ? 'white' : (isDarkMode ? '#f1f5f9' : '#1e293b'),
                  backdropFilter: 'blur(10px)',
                  border: isActive('/tickets') 
                    ? '1px solid rgba(245, 158, 11, 0.3)'
                    : isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
                  boxShadow: isActive('/tickets') ? '0 8px 25px rgba(245, 158, 11, 0.3)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: isActive('/tickets') 
                      ? 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)'
                      : isDarkMode 
                        ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.8) 0%, rgba(107, 114, 128, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: isActive('/tickets') 
                      ? '0 12px 35px rgba(245, 158, 11, 0.4)'
                      : '0 8px 25px rgba(0, 0, 0, 0.1)'
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
                startIcon={<ConfirmationNumber />}
              >
                Tickets
              </Button>
            )}

{isAuthenticated && isExpenseApprover && (
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/expense-tickets"
                sx={{ 
                  px: 2,
                  py: 1,
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: isActive('/expense-tickets') 
                    ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
                    : isDarkMode 
                      ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(75, 85, 99, 0.6) 100%)'
                      : 'linear-gradient(135deg, rgba(248, 250, 252, 0.6) 0%, rgba(241, 245, 249, 0.6) 100%)',
                  color: isActive('/expense-tickets') ? 'white' : (isDarkMode ? '#f1f5f9' : '#1e293b'),
                  backdropFilter: 'blur(10px)',
                  border: isActive('/expense-tickets') 
                    ? '1px solid rgba(245, 158, 11, 0.3)'
                    : isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
                  boxShadow: isActive('/expense-tickets') ? '0 8px 25px rgba(245, 158, 11, 0.3)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: isActive('/expense-tickets') 
                      ? 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)'
                      : isDarkMode 
                        ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.8) 0%, rgba(107, 114, 128, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: isActive('/expense-tickets') 
                      ? '0 12px 35px rgba(245, 158, 11, 0.4)'
                      : '0 8px 25px rgba(0, 0, 0, 0.1)'
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
                startIcon={<Receipt />}
              >
                Expense Tickets
              </Button>
            )}
            
            {isAuthenticated && cabServiceGlobalVisibility && (isUserWhitelisted || isHrAdmin) && (
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/cab-service"
                sx={{ 
                  px: 2,
                  py: 1,
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: isActive('/cab-service') 
                    ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                    : isDarkMode 
                      ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(75, 85, 99, 0.6) 100%)'
                      : 'linear-gradient(135deg, rgba(248, 250, 252, 0.6) 0%, rgba(241, 245, 249, 0.6) 100%)',
                  color: isActive('/cab-service') ? 'white' : (isDarkMode ? '#f1f5f9' : '#1e293b'),
                  backdropFilter: 'blur(10px)',
                  border: isActive('/cab-service') 
                    ? '1px solid rgba(150, 5, 5, 0.3)'
                    : isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
                  boxShadow: isActive('/cab-service') ? '0 8px 25px rgba(150, 5, 5, 0.3)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: isActive('/cab-service') 
                      ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                      : isDarkMode 
                        ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.8) 0%, rgba(107, 114, 128, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: isActive('/cab-service') 
                      ? '0 12px 35px rgba(150, 5, 5, 0.4)'
                      : '0 8px 25px rgba(0, 0, 0, 0.1)'
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
                startIcon={<DirectionsCar />}
              >
                Book A Cab
              </Button>
            )}
            
            {isAuthenticated && isAdmin && (
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/knowledge"
                sx={{ 
                  px: 2,
                  py: 1,
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: isActive('/knowledge') 
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)'
                    : isDarkMode 
                      ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(75, 85, 99, 0.6) 100%)'
                      : 'linear-gradient(135deg, rgba(248, 250, 252, 0.6) 0%, rgba(241, 245, 249, 0.6) 100%)',
                  color: isActive('/knowledge') ? 'white' : (isDarkMode ? '#f1f5f9' : '#1e293b'),
                  backdropFilter: 'blur(10px)',
                  border: isActive('/knowledge') 
                    ? '1px solid rgba(139, 92, 246, 0.3)'
                    : isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
                  boxShadow: isActive('/knowledge') ? '0 8px 25px rgba(139, 92, 246, 0.3)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: isActive('/knowledge') 
                      ? 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)'
                      : isDarkMode 
                        ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.8) 0%, rgba(107, 114, 128, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: isActive('/knowledge') 
                      ? '0 12px 35px rgba(139, 92, 246, 0.4)'
                      : '0 8px 25px rgba(0, 0, 0, 0.1)'
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
                startIcon={<Book />}
              >
                Knowledge Base
              </Button>
            )}
            
            {isAdmin && (
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/report"
                sx={{ 
                  px: 2,
                  py: 1,
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: isActive('/report') 
                    ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                    : isDarkMode 
                      ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(75, 85, 99, 0.6) 100%)'
                      : 'linear-gradient(135deg, rgba(248, 250, 252, 0.6) 0%, rgba(241, 245, 249, 0.6) 100%)',
                  color: isActive('/report') ? 'white' : (isDarkMode ? '#f1f5f9' : '#1e293b'),
                  backdropFilter: 'blur(10px)',
                  border: isActive('/report') 
                    ? '1px solid rgba(220, 38, 38, 0.3)'
                    : isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
                  boxShadow: isActive('/report') ? '0 8px 25px rgba(220, 38, 38, 0.3)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: isActive('/report') 
                      ? 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)'
                      : isDarkMode 
                        ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.8) 0%, rgba(107, 114, 128, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: isActive('/report') 
                      ? '0 12px 35px rgba(220, 38, 38, 0.4)'
                      : '0 8px 25px rgba(0, 0, 0, 0.1)'
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
                startIcon={<Book />}
              >
                Weekly Report
              </Button>
            )}
            
            {isAuthenticated && user?.email === 'tickets@othainsoft.com' && (
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/ticket-dashboard"
                sx={{ 
                  px: 2,
                  py: 1,
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: isActive('/ticket-dashboard') 
                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                    : isDarkMode 
                      ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(75, 85, 99, 0.6) 100%)'
                      : 'linear-gradient(135deg, rgba(248, 250, 252, 0.6) 0%, rgba(241, 245, 249, 0.6) 100%)',
                  color: isActive('/ticket-dashboard') ? 'white' : (isDarkMode ? '#8b5cf6' : '#6366f1'),
                  border: isActive('/ticket-dashboard') 
                    ? '1px solid rgba(99, 102, 241, 0.3)'
                    : isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
                  boxShadow: isActive('/ticket-dashboard') ? '0 8px 25px rgba(99, 102, 241, 0.3)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: isActive('/ticket-dashboard') 
                      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                      : isDarkMode 
                        ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.8) 0%, rgba(107, 114, 128, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: isActive('/ticket-dashboard') 
                      ? '0 12px 35px rgba(99, 102, 241, 0.4)'
                      : '0 8px 25px rgba(0, 0, 0, 0.1)'
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
                startIcon={<ConfirmationNumber />}
              >
                Ticket Dashboard
              </Button>
            )}
          </Box>
        )}
        
        {/* Dark Mode Switch for desktop Dark Mode Switch*/}
        {!isMobile && (
          <Box sx={{ mx: 1 }}>
            <DarkModeSwitch checked={isDarkMode} onChange={toggleDarkMode} />
          </Box>
        )}
        
        {/* User menu */}
        {isAuthenticated ? (
          <div>
            <IconButton
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
              sx={{
                ml: 1,
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                  : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%)',
                backdropFilter: 'blur(10px)',
                border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                borderRadius: '10px',
                color: isDarkMode ? '#f1f5f9' : '#1e293b',
                width: '36px',
                height: '36px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.9) 0%, rgba(107, 114, 128, 0.9) 100%)'
                    : 'linear-gradient(135deg, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.9) 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
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
              <AccountCircle sx={{ fontSize: '1.25rem', zIndex: 1 }} />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
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
                  borderRadius: '16px',
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                  border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                  mt: 1,
                  minWidth: '200px',
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
                    opacity: 0.05,
                    filter: 'blur(40px)'
                  }
                }
              }}
            >
              <MenuItem 
                disabled
                sx={{
                  opacity: 1,
                  fontWeight: 600,
                  color: isDarkMode ? '#f1f5f9' : '#1e293b',
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.3) 0%, rgba(75, 85, 99, 0.3) 100%)'
                    : 'linear-gradient(135deg, rgba(241, 245, 249, 0.3) 0%, rgba(226, 232, 240, 0.3) 100%)',
                  borderRadius: '12px',
                  margin: '8px',
                  padding: '12px 16px',
                  zIndex: 1,
                  position: 'relative',
                  fontSize: '0.875rem',
                  '&.Mui-disabled': {
                    opacity: 1
                  }
                }}
              >
                {user?.email || 'User'}
              </MenuItem>
              <MenuItem 
                onClick={handleLogout}
                sx={{
                  color: isDarkMode ? '#f1f5f9' : '#1e293b',
                  background: 'transparent',
                  borderRadius: '12px',
                  margin: '8px',
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  zIndex: 1,
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%)',
                    color: '#dc2626',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)'
                  }
                }}
              >
                Logout
              </MenuItem>
            </Menu>
          </div>
        ) : (
          !isMobile && (
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/login"
              variant="outlined"
              startIcon={<AccountCircle />}
              sx={{ 
                border: '1px solid rgba(59, 130, 246, 0.3)',
                px: 2,
                py: 1,
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: isActive('/login') 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                  : isDarkMode 
                    ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(75, 85, 99, 0.6) 100%)'
                    : 'linear-gradient(135deg, rgba(248, 250, 252, 0.6) 0%, rgba(241, 245, 249, 0.6) 100%)',
                color: isActive('/login') ? 'white' : (isDarkMode ? '#f1f5f9' : '#1e293b'),
                backdropFilter: 'blur(10px)',
                boxShadow: isActive('/login') ? '0 8px 25px rgba(59, 130, 246, 0.3)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  background: isActive('/login') 
                    ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
                    : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  borderColor: 'rgba(59, 130, 246, 0.5)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 35px rgba(59, 130, 246, 0.4)'
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
              Login
            </Button>
          )
        )}
      </Toolbar>
      
      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        sx={{
          '& .MuiDrawer-paper': {
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
            border: 'none',
            width: '250px',
            position: 'relative',
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
              opacity: 0.05,
              filter: 'blur(40px)'
            }
          }
        }}
      >
        {drawerContent()}
      </Drawer>
    </AppBar>
  );
};

export default NavBar;
