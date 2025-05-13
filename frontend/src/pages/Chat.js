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
  CircularProgress,
  Skeleton,
  DialogContentText,
  Snackbar,
  Alert as MuiAlert,
  Drawer,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Add as AddIcon, 
  Message as MessageIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Delete as DeleteIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import ChatWindow from '../components/ChatWindow';
import { chatApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useNavigate } from 'react-router-dom';

// Use Alert inside Snackbar
const SnackbarAlert = React.forwardRef(function SnackbarAlert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function Chat() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { isDarkMode } = useDarkMode();
  const isAuthenticated = !!user;

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  const navigate = useNavigate();
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  // Shared glassmorphism styles
  const glassStyles = {
    bgcolor: isDarkMode ? 'rgba(30,30,30,0.15)' : 'rgba(255,255,255,0.15)',
    border: '0px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
  };

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };
  
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
    setLoading(true);
    setServerError(false);

    try {
      const sessionsData = await chatApi.getSessions();
      
      if (sessionsData && sessionsData.length > 0) {
        setSessions(sessionsData.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
      } else {
        setSessions([]);
      }
      return sessionsData;
    } catch (error) {
      setSessions([]);
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Handle auth error silently or redirect if needed
      } else {
          setServerError(true);
      }
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  const handleSessionChange = (sessionId) => {
    setSelectedSessionId(sessionId);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };
  
  const handleNewChat = async () => {
    try {
      const newSession = await chatApi.createSession();
      
      if (newSession && newSession.id) {
        setSessions(prevSessions => [newSession, ...prevSessions].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
        setSelectedSessionId(newSession.id);
        if (isMobile) {
          setMobileDrawerOpen(false);
        }
      } else {
        showSnackbar('Failed to create new chat session.', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to create a new chat. Please try again.', 'error');
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // --- Delete Handling with Dialog & Feedback ---
  const handleDeleteSessionRequest = (e, sessionId) => {
    e.stopPropagation(); 
    setSessionToDelete(sessionId);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    if (isDeleting) return;
    setIsDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete || isDeleting) return;
    
    const sessionId = sessionToDelete;
    setIsDeleting(true);
    setIsDeleteDialogOpen(false); 

    try {
      await chatApi.deleteSession(sessionId);
      setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
      showSnackbar('Chat session deleted successfully.', 'success');
    } catch (error) {
      let errorMsg = 'Failed to delete chat. Please try again.';
      if (error.message && error.message.includes('Invalid session ID format')) {
        errorMsg = 'There was an issue deleting the chat. Please refresh and try again.';
      }
      showSnackbar(errorMsg, 'error');
    } finally {
      setIsDeleting(false);
      setSessionToDelete(null);
    }
  };
  // --- End Delete Handling ---
  
  const handleLogoutClick = async () => {
    try {
      await logout();
    } catch (error) {
      
      alert("Logout failed. Please try again.");
    }
  };
  
  const renderSkeletons = () => (
    <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
      {[...Array(5)].map((_, index) => (
        <ListItemButton 
          key={`skeleton-${index}`} 
          sx={{ 
              borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
              py: 1.2,
              display: 'flex',
              justifyContent: 'space-between'
          }}
          disabled
        >
          <Box sx={{ width: '80%' }}>
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="80%" height={16} sx={{ mt: 0.5 }} />
          </Box>
          <Skeleton variant="circular" width={24} height={24} />
        </ListItemButton>
      ))}
    </List>
  );
  
  const renderChatHistoryPanel = () => (
    <Paper elevation={0} sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isMobile ? 0 : 2,
        overflow: 'hidden',
        ...glassStyles,
        color: theme => theme.palette.text.primary
    }}>
      <Box sx={{ 
        p: 2, 
        borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)', 
        textAlign: 'center'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Chat History</Typography>
      </Box>
      
      <ListItemButton
        onClick={handleNewChat}
        sx={{
          py: 1.5,
          flexShrink: 0,
          height: 54,
          minHeight: 54,
          maxHeight: 84,
          borderRadius: 2,
          ...glassStyles,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          '&:hover': {
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            bgcolor: isDarkMode ? 'rgba(30,30,30,0.25)' : 'rgba(255,255,255,0.25)'
          }
        }}
      >
        <AddIcon fontSize="small" /> 
        <Typography variant="button" sx={{ fontWeight: 600 }}>New Chat</Typography>
      </ListItemButton>

      {loading ? (
          renderSkeletons()
      ) : serverError ? (
          <Alert severity="error" sx={{m: 2, flexShrink: 0}}>Error connecting to server.</Alert>
      ) : sessions.length === 0 ? (
          <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary', flexShrink: 0 }}>No chat sessions yet.</Typography>
      ) : (
        <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
          {sessions.map((session, index) => (
            <ListItemButton
              key={session.id}
              selected={selectedSessionId === session.id}
              onClick={() => handleSessionChange(session.id)}
              sx={{ 
                  borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
                  '&.Mui-selected': { bgcolor: isDarkMode ? 'rgba(67, 97, 238, 0.2)' : 'rgba(67, 97, 238, 0.1)' },
                  '&:hover': { bgcolor: isDarkMode ? 'rgba(67, 97, 238, 0.1)' : 'rgba(67, 97, 238, 0.05)' }
              }}
            >
              <ListItemText 
                primary={`Chat ${sessions.length - index}`}
                secondary={`Updated: ${formatDate(session.updated_at)}`}
                primaryTypographyProps={{ fontWeight: 500 }}
              />
               <IconButton 
                  edge="end" aria-label="delete" 
                  onClick={(e) => handleDeleteSessionRequest(e, session.id)} 
                  size="small"
                  disabled={isDeleting && sessionToDelete === session.id}
               >
                 {(isDeleting && sessionToDelete === session.id) 
                   ? <CircularProgress size={20} /> 
                   : <DeleteIcon fontSize="small" />
                 }
               </IconButton>
            </ListItemButton>
          ))}
        </List>
      )}
    </Paper>
  );
  
  return (
    <>
      <Box 
        sx={{
          minHeight: 'calc(100vh - 80px)',
          width: '100vw',
          margin: 0,
          padding: 0,
          position: 'fixed',
          top: isMobile ? 56 : 64,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDarkMode 
            ? 'linear-gradient(135deg, #121212 0%, #1e1e1e 50%, #262626 100%)'
            : 'linear-gradient(135deg, #e0f7fa 0%, #e8f5e9 50%, #f3e5f5 100%)',
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
            backgroundImage: isDarkMode
              ? 'radial-gradient(circle at 30% 20%, rgba(80,80,80,0.2) 0%, transparent 25%), radial-gradient(circle at 80% 70%, rgba(30,50,80,0.15) 0%, transparent 30%)'
              : 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5) 0%, transparent 25%), radial-gradient(circle at 80% 70%, rgba(153,204,255,0.3) 0%, transparent 30%)',
            zIndex: 0,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: "url('/5624633.jpg')",
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: 0.4,
            zIndex: 1,
            WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
            WebkitMaskSize: '100% 100%',
            maskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
          },
        }}
      />
      <Container maxWidth="xl" sx={{ 
          position: 'relative', zIndex: 5, 
          pt: isMobile ? 1 : 4,
          pb: 8, 
          height: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column'
      }}>
        {isMobile && isAuthenticated && (
          <Box sx={{ position: 'fixed', top: 76, left: 58, zIndex: 1301, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              variant="outlined"
              onClick={handleDrawerToggle}
              sx={{
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                color: isDarkMode ? 'white' : 'black',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                border: 'none',
                backdropFilter: 'blur(5px)',
                textTransform: 'none',
                borderRadius: '20px',
                padding: '8px 12px',
                fontSize: '0.8rem',

                lineHeight: '1.2',
                minWidth: 'auto',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                  boxShadow: 'none',
                }
              }}
            >
              Chat History
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon fontSize="small" />}
              onClick={handleNewChat}
              sx={{
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                color: isDarkMode ? 'white' : 'black',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                border: 'none',
                backdropFilter: 'blur(5px)',
                textTransform: 'none',
                borderRadius: '20px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                lineHeight: '1.2',
                minWidth: 'auto',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                  boxShadow: 'none',
                }
              }}
            >
              New Chat
            </Button>
          </Box>
        )}

        {isAuthenticated ? (
          isMobile ? (
            <>
              <Drawer
                variant="temporary"
                open={mobileDrawerOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                  display: { xs: 'block', md: 'none' },
                  '& .MuiDrawer-paper': { 
                    boxSizing: 'border-box', 
                    width: 280,
                  },
                }}
              >
                {renderChatHistoryPanel()}
              </Drawer>
              <Box sx={{ 
                height: '100%',
                width: '100%',
                pt: isMobile ? '80px' : 0,
                boxSizing: 'border-box'
              }}>
                <ChatWindow sessionId={selectedSessionId} onSessionChange={handleSessionChange} />
              </Box>
            </>
          ) : (
            <Grid container spacing={2} sx={{ height: '100%'}}>
              <Grid item md={3} sx={{height: '100%'}}> 
                {renderChatHistoryPanel()}
              </Grid>
              <Grid item md={9} sx={{height: '100%'}}>
                <ChatWindow sessionId={selectedSessionId} onSessionChange={handleSessionChange} />
              </Grid>
            </Grid>
          )
        ) : (
          <Box sx={{ flexGrow:1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
             {!authLoading && <Typography>Please log in to use the chat.</Typography>} 
          </Box>
        )}
      </Container>

      <Dialog
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this chat session?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar style={{ marginLeft: '140px', marginRight: 'auto' }}
        open={snackbarOpen} 
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center'}}
      >
        <SnackbarAlert 
            onClose={handleSnackbarClose} 
            severity={snackbarSeverity} 
            sx={{ width: '100%', color: 'white' }}
        >
          {snackbarMessage}
        </SnackbarAlert>
      </Snackbar>
    </>
  );
}

export default Chat;
