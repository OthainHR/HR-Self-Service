import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Box,
  Alert,
  IconButton,
  Fade,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Message as MessageIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import ChatWindow from '../components/ChatWindow';
import { chatApi, authApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

function Chat() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  
  // Component mount
  useEffect(() => {
    // Always try to load sessions when component mounts
    loadSessions();
  }, []);
  
  // Check authentication status on mount
  useEffect(() => {
    setIsAuthenticated(authApi.isAuthenticated());
  }, []);
  
  // Load chat sessions from Supabase
  const loadSessions = async () => {
    console.log('Loading sessions from Supabase...');
    setLoading(true);

    try {
      // Get sessions from Supabase via chatApi
      const result = await chatApi.getSessions();
      
      if (result.sessions && result.sessions.length > 0) {
        console.log('Successfully fetched sessions from Supabase:', result.sessions.length);
        setSessions(result.sessions);
      } else {
        console.log('No sessions found in Supabase');
        setSessions([]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
      setServerError(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle selecting an existing session
  const handleSessionChange = (sessionId) => {
    setSelectedSessionId(sessionId);
  };
  
  // Start a new chat
  const handleNewChat = async () => {
    try {
      // Create a new session via the API
      const newSession = await chatApi.createSession();
      
      if (newSession && newSession.id) {
        // Update the sessions list with the new session
        setSessions(prevSessions => [newSession, ...prevSessions]);
        
        // Select the newly created session
        setSelectedSessionId(newSession.id);
      } else {
        console.error('Created session missing ID:', newSession);
      }
    } catch (error) {
      console.error('Error creating new session:', error);
      alert('Failed to create a new chat. Please try again.');
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Delete a chat session
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation(); // Prevent triggering the ListItemButton click
    
    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to delete this chat session?')) {
      return;
    }
    
    try {
      await chatApi.deleteSession(sessionId);
      
      // Remove from state
      setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
      
      // If the deleted session was selected, clear the selection
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      
      // Show a more specific error message
      if (error.message && error.message.includes('Invalid session ID format')) {
        alert('There was an issue with the session ID format. Please refresh the page and try again.');
      } else {
        alert('Failed to delete chat. Please try again.');
      }
    }
  };
  
  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      await authApi.login(username, password);
      setIsAuthenticated(true);
      setShowLoginDialog(false);
      setUsername('');
      setPassword('');
      // Reload sessions after successful login
      loadSessions();
    } catch (error) {
      setLoginError('Login failed. Please check your credentials.');
    }
  };

  // Handle logout
  const handleLogout = () => {
    authApi.logout();
    setIsAuthenticated(false);
    setSessions([]);
    setSelectedSessionId(null);
  };
  
  return (
    <>
      <Box 
        sx={{
          minHeight: 'calc(100vh - 80px)',
          width: '100vw',
          margin: 0,
          padding: 0,
          position: 'fixed',
          top: 64, // Add space for navbar height
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #e0f7fa 0%, #e8f5e9 50%, #f3e5f5 100%)',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
          overflowY: 'auto',
          zIndex: 0, // Lower z-index so navbar stays on top
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5) 0%, transparent 25%), radial-gradient(circle at 80% 70%, rgba(153,204,255,0.3) 0%, transparent 30%)',
            zIndex: 0,
          }
        }}
      />
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 5, pt: 4, pb: 8, minHeight: 'calc(100vh - 100px)' }}>
        {/* Login Dialog */}
        <Dialog open={showLoginDialog} onClose={() => setShowLoginDialog(false)}>
          <form onSubmit={handleLogin}>
            <DialogTitle>Login Required</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Please login to access advanced AI features
              </Typography>
              <TextField
                autoFocus
                margin="dense"
                label="Username"
                type="text"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <TextField
                margin="dense"
                label="Password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {loginError && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  {loginError}
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowLoginDialog(false)}>Cancel</Button>
              <Button type="submit" variant="contained">Login</Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Connection Status Alert - replacing offline/online alerts */}
        {serverError ? (
          <Fade in={serverError}>
            <Alert 
              severity="error"
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
                backdropFilter: 'blur(10px)',
                bgcolor: 'rgba(253, 237, 237, 0.85)',
                border: '1px solid rgba(244, 199, 199, 0.6)',
              }}
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    color="inherit" 
                    size="small" 
                    onClick={async () => {
                      try {
                        await loadSessions();
                        setServerError(false);
                      } catch (error) {
                        console.error("Connection still failed:", error);
                      }
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Retry Connection
                  </Button>
                </Box>
              }
            >
              <strong>Connection Error:</strong> Unable to connect to the server. Some features may be limited.
            </Alert>
          </Fade>
        ) : (
          <Fade in={!serverError && isAuthenticated}>
            <Alert 
              severity="success"  
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
                backdropFilter: 'blur(10px)',
                bgcolor: 'rgba(237, 247, 237, 0.85)',
                border: '1px solid rgba(183, 223, 185, 0.6)',
              }}
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {isAuthenticated ? (
                    <Button 
                      color="inherit" 
                      size="small" 
                      onClick={handleLogout}
                      startIcon={<LogoutIcon />}
                      sx={{ textTransform: 'none' }}
                    >
                      Logout
                    </Button>
                  ) : (
                    <Button 
                      color="inherit" 
                      size="small" 
                      onClick={() => setShowLoginDialog(true)}
                      startIcon={<LoginIcon />}
                      sx={{ textTransform: 'none' }}
                    >
                      Login
                    </Button>
                  )}
                </Box>
              }
            >
              <strong>Connected:</strong> You're authenticated and connected to the Othain HR Assistant.
            </Alert>
          </Fade>
        )}
        <Grid container spacing={3} sx={{ height: 'calc(100vh - 160px)' }}>
          {/* Sidebar with chat history */}
          <Grid item xs={12} md={3}>
            <Paper 
              elevation={3} 
              sx={{ 
                height: '100%', 
                overflow: 'hidden', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.65)',
                backdropFilter: 'blur(15px)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                zIndex: 5,
              }}
            >
              <Box sx={{ 
                p: 2, 
                bgcolor: 'rgba(67, 97, 238, 0.9)', 
                backdropFilter: 'blur(10px)',
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500 }}>
                  <MessageIcon /> Chat History
                </Typography>
              </Box>
              
              <Divider sx={{ opacity: 0.5 }} />
              
              <ListItemButton 
                onClick={handleNewChat}
                sx={{ 
                  py: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(5px)',
                  '&:hover': { 
                    bgcolor: 'rgba(63, 81, 181, 0.1)', 
                    color: 'primary.main' 
                  },
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  borderRadius: 0,
                  margin: '0 !important'
                }}
              >
                <AddIcon />
                <ListItemText 
                  primary="New Chat" 
                  secondary="Start a new conversation"
                  secondaryTypographyProps={{
                    sx: { opacity: 0.7 }
                  }}
                />
              </ListItemButton>
              
              <Divider />
              
              <List sx={{ overflowY: 'auto', flex: 1, pb: 6 }}>
                {loading ? (
                  <ListItem>
                    <ListItemText primary="Loading sessions..." />
                  </ListItem>
                ) : !sessions || !Array.isArray(sessions) || sessions.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="No chat history found" secondary="Start a new chat to begin" />
                  </ListItem>
                ) : (
                  Array.isArray(sessions) && sessions.map(session => (
                    <ListItemButton
                      key={session.id}
                      selected={selectedSessionId === session.id}
                      onClick={() => handleSessionChange(session.id)}
                      sx={{
                        transition: 'all 0.2s ease',
                        borderRadius: 2,
                        mx: 1,
                        my: 0.5,
                        bgcolor: selectedSessionId === session.id 
                          ? 'rgba(63, 81, 181, 0.15)' 
                          : 'rgba(255, 255, 255, 0.4)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid',
                        borderColor: selectedSessionId === session.id 
                          ? 'rgba(63, 81, 181, 0.3)' 
                          : 'rgba(255, 255, 255, 0.5)',
                        boxShadow: selectedSessionId === session.id 
                          ? '0 4px 12px rgba(63, 81, 181, 0.15)' 
                          : '0 2px 8px rgba(0, 0, 0, 0.05)',
                        '&:hover': {
                          bgcolor: selectedSessionId === session.id 
                            ? 'rgba(63, 81, 181, 0.2)' 
                            : 'rgba(255, 255, 255, 0.6)',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                        },
                        '&.Mui-selected': {
                          bgcolor: 'rgba(63, 81, 181, 0.15)',
                          color: 'primary.main',
                          fontWeight: 500,
                          '&:hover': {
                            bgcolor: 'rgba(63, 81, 181, 0.2)',
                          },
                          '& .MuiListItemText-secondary': {
                            color: 'rgba(63, 81, 181, 0.7)',
                          }
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{`Chat ${sessions.indexOf(session) + 1}`}</span>
                          </Box>
                        }
                        secondary={formatDate(session.updated_at)}
                      />
                      <IconButton 
                        size="small" 
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        sx={{ 
                          opacity: 0.7,
                          '&:hover': { 
                            opacity: 1,
                            color: selectedSessionId === session.id ? 'white' : 'error.main'
                          },
                          color: selectedSessionId === session.id ? 'white' : 'text.secondary',
                          ml: 1
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemButton>
                  ))
                )}
              </List>
            </Paper>
          </Grid>
          
          {/* Main chat area */}
          <Grid item xs={12} md={9} sx={{ height: '100%', pb: 4 }}>
            <ChatWindow 
              sessionId={selectedSessionId}
              onSessionChange={handleSessionChange}
            />
          </Grid>
        </Grid>
        
      </Container>
    </>
  );
}

export default Chat;
