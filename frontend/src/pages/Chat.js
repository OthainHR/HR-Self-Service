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
  CircularProgress
} from '@mui/material';
import { 
  Add as AddIcon, 
  Message as MessageIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import ChatWindow from '../components/ChatWindow';
import { chatApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function Chat() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const isAuthenticated = !!user;

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!authLoading && isAuthenticated) { 
      loadSessions();
    } else if (!authLoading && !isAuthenticated) {
      setSessions([]);
      setSelectedSessionId(null);
      setLoading(false);
      setServerError(false);
    }
  }, [isAuthenticated, authLoading]);
  
  const loadSessions = async () => {
    console.log('Loading sessions...');
    setLoading(true);
    setServerError(false);

    try {
      const sessionsData = await chatApi.getSessions();
      
      if (sessionsData && sessionsData.length > 0) {
        console.log('Successfully fetched sessions:', sessionsData.length);
        setSessions(sessionsData.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
      } else {
        console.log('No sessions found');
        setSessions([]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
      if (error.response?.status === 401 || error.response?.status === 403) {
          console.warn("Authorization error loading sessions. User might be logged out.");
      } else {
          setServerError(true);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleSessionChange = (sessionId) => {
    setSelectedSessionId(sessionId);
  };
  
  const handleNewChat = async () => {
    try {
      const newSession = await chatApi.createSession();
      
      if (newSession && newSession.id) {
        setSessions(prevSessions => [newSession, ...prevSessions]);
        
        setSelectedSessionId(newSession.id);
      } else {
        console.error('Created session missing ID:', newSession);
      }
    } catch (error) {
      console.error('Error creating new session:', error);
      alert('Failed to create a new chat. Please try again.');
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this chat session?')) {
      return;
    }
    
    try {
      await chatApi.deleteSession(sessionId);
      
      setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
      
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      
      if (error.message && error.message.includes('Invalid session ID format')) {
        alert('There was an issue with the session ID format. Please refresh the page and try again.');
      } else {
        alert('Failed to delete chat. Please try again.');
      }
    }
  };
  
  const handleLogoutClick = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed in Chat component:", error);
      alert("Logout failed. Please try again.");
    }
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
          top: 64,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #e0f7fa 0%, #e8f5e9 50%, #f3e5f5 100%)',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
          overflowY: 'auto',
          zIndex: 0,
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
        {isAuthenticated ? (
          <Grid container spacing={2} sx={{ height: 'calc(100vh - 120px)' }}>
            <Grid item xs={12} md={3}>
              <Paper elevation={2} sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  borderRadius: 2, 
                  overflow: 'hidden',
                  bgcolor: 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.6)'
              }}>
                <Box sx={{ 
                  p: 2, 
                  borderBottom: '1px solid rgba(0,0,0,0.08)', 
                  textAlign: 'center'
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Chat History</Typography>
                </Box>
                
                <ListItemButton 
                  onClick={handleNewChat}
                  sx={{ 
                    py: 1.5,
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                    bgcolor: 'rgba(255, 255, 255, 0.6)',
                    '&:hover': { 
                      bgcolor: 'rgba(67, 97, 238, 0.08)', 
                    },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1
                  }}
                >
                  <AddIcon fontSize="small" /> 
                  <Typography variant="button" sx={{ fontWeight: 600 }}>New Chat</Typography>
                </ListItemButton>

                {loading ? (
                    <Box sx={{p: 2, textAlign: 'center'}}><CircularProgress /></Box>
                ) : serverError ? (
                    <Alert severity="error" sx={{m: 2}}>Error connecting to server.</Alert>
                ) : sessions.length === 0 ? (
                    <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>No chat sessions yet.</Typography>
                ) : (
                  <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
                    {sessions.map((session) => (
                      <ListItemButton
                        key={session.id}
                        selected={selectedSessionId === session.id}
                        onClick={() => handleSessionChange(session.id)}
                        sx={{ 
                            borderBottom: '1px solid rgba(0,0,0,0.05)',
                            '&.Mui-selected': { bgcolor: 'rgba(67, 97, 238, 0.1)' },
                            '&:hover': { bgcolor: 'rgba(67, 97, 238, 0.05)' }
                        }}
                      >
                        <ListItemText 
                          primary={`Chat ${session.id.substring(0, 8)}...`} 
                          secondary={`Updated: ${formatDate(session.updated_at)}`}
                          primaryTypographyProps={{ fontWeight: 500 }}
                        />
                         <IconButton edge="end" aria-label="delete" onClick={(e) => handleDeleteSession(e, session.id)} size="small">
                           <DeleteIcon fontSize="small" />
                         </IconButton>
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={9}>
              <ChatWindow sessionId={selectedSessionId} />
            </Grid>
          </Grid>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
             {!authLoading && <Typography>Please log in to use the chat.</Typography>} 
          </Box>
        )}
      </Container>
    </>
  );
}

export default Chat;
