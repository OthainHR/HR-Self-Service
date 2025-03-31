import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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

const NavBar = () => {
  const { user, logout, isLoading } = useAuth();
  const isAuthenticated = !!user;

  // ---- START RE-ADDED DEBUG LOG ----
  useEffect(() => {
    console.log("--- Vercel NavBar Debug ---");
    if (isLoading) {
        console.log("Auth is loading...");
    } else if (user) {
      console.log("User object (Vercel):", JSON.stringify(user, null, 2)); // Stringify for better logging
      console.log("User email (Vercel):", user.email);
      console.log("Is Admin check (Vercel):", user?.email === 'admin@example.com');
    } else {
        console.log("User object is null or undefined.");
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
      console.error('Logout failed:', error);
    }
  };
  
  // Toggle drawer
  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };
  
  // Drawer content
  const drawerContent = () => (
    <Box
      sx={{ 
        width: 250,
        height: '100%',
        background: 'rgba(255, 255, 255, 0.9)',
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
        background: 'rgba(67, 97, 238, 0.85)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
      }}>
        <img src="/othainwhite.png" alt="Othain Logo" height="60" style={{ filter: 'brightness(0) invert(1)' }} />
      </Box>
      <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.08)' }} />
      <List>
        <ListItem 
          component={RouterLink} 
          to="/" 
          button
          sx={{ 
            my: 0.5, 
            borderRadius: 1,
            mx: 1,
            '&:hover': {
              background: 'rgba(67, 97, 238, 0.1)',
            }
          }}
        >
          <ListItemIcon><Home sx={{ color: 'primary.main' }} /></ListItemIcon>
          <ListItemText 
            primary="Home" 
            primaryTypographyProps={{ 
              fontWeight: 500,
              color: 'primary.main'
            }}
          />
        </ListItem>
        
        {isAuthenticated && (
          <ListItem 
            component={RouterLink} 
            to="/chat" 
            button
            sx={{ 
              my: 0.5, 
              borderRadius: 1,
              mx: 1,
              '&:hover': {
                background: 'rgba(67, 97, 238, 0.1)',
              }
            }}
          >
            <ListItemIcon><Chat sx={{ color: 'primary.main' }} /></ListItemIcon>
            <ListItemText 
              primary="Chat" 
              primaryTypographyProps={{ 
                fontWeight: 500,
                color: 'primary.main'
              }}
            />
          </ListItem>
        )}
        
        {isAuthenticated && isAdmin && (
          <ListItem 
            component={RouterLink} 
            to="/knowledge" 
            button
            sx={{ 
              my: 0.5, 
              borderRadius: 1,
              mx: 1,
              '&:hover': {
                background: 'rgba(67, 97, 238, 0.1)',
              }
            }}
          >
            <ListItemIcon><Book sx={{ color: 'primary.main' }} /></ListItemIcon>
            <ListItemText 
              primary="Knowledge Base" 
              primaryTypographyProps={{ 
                fontWeight: 500,
                color: 'primary.main'
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
                background: 'rgba(67, 97, 238, 0.1)',
              }
            }}
          >
            <ListItemIcon><Logout sx={{ color: 'primary.main' }} /></ListItemIcon>
            <ListItemText 
              primary="Logout" 
              primaryTypographyProps={{ 
                fontWeight: 500,
                color: 'primary.main'
              }}
            />
          </ListItem>
        ) : (
          <ListItem 
            component={RouterLink} 
            to="/login" 
            button
            sx={{ 
              my: 0.5, 
              borderRadius: 1,
              mx: 1,
              '&:hover': {
                background: 'rgba(67, 97, 238, 0.1)',
              }
            }}
          >
            <ListItemIcon><AccountCircle sx={{ color: 'primary.main' }} /></ListItemIcon>
            <ListItemText 
              primary="Login" 
              primaryTypographyProps={{ 
                fontWeight: 500,
                color: 'primary.main'
              }}
            />
          </ListItem>
        )}
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
          <img 
            src="/othainwhite.png" 
            alt="Othain Logo" 
            height="36" 
            style={{ 
              filter: 'brightness(0) invert(1)', 
              marginRight: '8px',
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
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
          }}
        >
          HR Assistant
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
                fontWeight: 500,
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
                  fontWeight: 500,
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
                  fontWeight: 500,
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
                  color: 'primary.main'
                }}
              >
                {user?.email || 'User'}
              </MenuItem>
              <MenuItem 
                onClick={handleLogout}
                sx={{
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
                fontWeight: 500,
                background: 'rgba(255, 255, 255, 0.1)',
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
