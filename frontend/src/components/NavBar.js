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
  Home
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import DarkModeSwitch from './DarkModeSwitch';

const NavBar = () => {
  const { user, logout, isLoading } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const isAuthenticated = !!user;
  const location = useLocation();

  // ---- START RE-ADDED DEBUG LOG ----
  useEffect(() => {
    
    if (isLoading) {
        
    } else if (user) {

    } else {
        
    }
  }, [user, isLoading]);
  // ---- END RE-ADDED DEBUG LOG ----

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
        width: 250,
        height: '100%',
        background: isDarkMode ? 'rgba(34, 34, 34, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
      }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        p: 2,
        background: isDarkMode ? 'rgba(73, 73, 73, 0.85)' : 'rgba(17, 179, 207, 0.85)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
      }}>
        <img src="/othainwhite.png" alt="Othain Logo" height={30} style={{ filter: 'brightness(0) invert(1)' }} />
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
        
        {isAuthenticated && isAdmin && (
          <ListItem 
            component={RouterLink} 
            to="/knowledge" 
            button
            selected={isActive('/knowledge')}
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
            to="/admin/report" 
            button
            selected={isActive('/admin/report')}
            sx={{ 
              my: 0.5, 
              borderRadius: 1,
              mx: 1,
              backgroundColor: isActive('/admin/report') ? 'rgba(67, 218, 238, 0.2)' : 'transparent',
              '&:hover': {
                background: 'rgba(67, 218, 238, 0.1)',
              }
            }}
          >
            <ListItemIcon><Book sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)' }} /></ListItemIcon>
            <ListItemText 
              primary="Weekly Report" 
              primaryTypographyProps={{ 
                fontWeight: isActive('/admin/report') ? 700 : 500,
                color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 179, 207, 0.8)'
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
        background: 'rgba(18, 18, 18, 0.9)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 10
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
              mr: 2,
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.15)'
              }
            }}
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
        )}
        
        {/* Othain Logo */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mr: 2, 
          flexShrink: 0,
          '&:hover': {
            opacity: 0.9,
          }
        }}>
          <Box
            component="img"
            onClick={() => navigate('/')}
            src="/logowhite.png" 
            alt="Othain Logo" 
            sx={{
              height: { xs: '20px', sm: '30px' }, 
              filter: 'brightness(0) invert(1)', 
              marginRight: '8px',
              marginBottom: '10px',
              marginTop: { xs: '9px', sm: '0' },
              transition: 'transform 0.2s ease'
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
            fontWeight: 500,
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
            marginLeft: '-10px',
            marginTop: { xs: '10px', sm: '0' },
            fontSize: { xs: '0.6rem', sm: '1.25rem' }
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
                borderRadius: 2,
                fontSize: '0.875rem',
                fontWeight: isActive('/') ? 700 : 500,
                backgroundColor: isActive('/') ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(to right, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0))',
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                },
                '&:hover::before': {
                  opacity: 1
                }
              }}
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
                  borderRadius: 2,
                  fontSize: '0.875rem',
                  fontWeight: isActive('/chat') ? 700 : 500,
                  backgroundColor: isActive('/chat') ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to right, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0))',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                  },
                  '&:hover::before': {
                    opacity: 1
                  }
                }}
              >
                Chat
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
                  borderRadius: 2,
                  fontSize: '0.875rem',
                  fontWeight: isActive('/knowledge') ? 700 : 500,
                  backgroundColor: isActive('/knowledge') ? 'rgba(67, 218, 238, 0.2)' : 'transparent',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to right, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0))',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                  },
                  '&:hover::before': {
                    opacity: 1
                  }
                }}
              >
                Knowledge Base
              </Button>
            )}
            
            {isAdmin && (
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/admin/report"
                sx={{ 
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  fontSize: '0.875rem',
                  fontWeight: isActive('/admin/report') ? 700 : 500,
                  backgroundColor: isActive('/admin/report') ? 'rgba(67, 218, 238, 0.2)' : 'transparent',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to right, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0))',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                  },
                  '&:hover::before': {
                    opacity: 1
                  }
                }}
              >
                Weekly Report
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
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(5px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                }
              }}
            >
              <AccountCircle />
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
                  borderRadius: 2,
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                  mt: 1
                }
              }}
            >
              <MenuItem 
                disabled
                sx={{
                  opacity: 0.7,
                  fontWeight: 500,
                  color: isDarkMode ? 'rgba(7, 7, 7, 0.8)' : 'rgba(0, 0, 0, 0.8)'
                }}
              >
                {user?.email || 'User'}
              </MenuItem>
              <MenuItem 
                onClick={handleLogout}
                sx={{
                  color: isDarkMode ? theme.palette.grey[500] : theme.palette.grey[500],
                  '&:hover': {
                    background: 'rgba(63, 81, 181, 0.1)'
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
                border: '1px solid rgba(255, 255, 255, 0.3)',
                px: 2,
                py: 0.7,
                borderRadius: 2,
                fontSize: '0.875rem',
                fontWeight: isActive('/login') ? 700 : 500,
                backgroundColor: isActive('/login') ? 'rgba(67, 218, 238, 0.2)' : 'transparent',
                backdropFilter: 'blur(5px)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
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
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.1)',
            border: 'none'
          }
        }}
      >
        {drawerContent()}
      </Drawer>
    </AppBar>
  );
};

export default NavBar;
