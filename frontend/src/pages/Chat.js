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
  Menu as MenuIcon,
  History as HistoryIcon,
  AutoAwesome as AIIcon
} from '@mui/icons-material';
import ChatWindow from '../components/ChatWindow';
import { chatApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

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
              py: 1.5,
              px: 2,
              display: 'flex',
              justifyContent: 'space-between',
              borderRadius: '12px',
              mx: 1,
              mb: 1
          }}
          disabled
        >
          <Box sx={{ width: '80%' }}>
            <Skeleton variant="text" width="60%" height={24} sx={{ borderRadius: '4px' }} />
            <Skeleton variant="text" width="80%" height={18} sx={{ mt: 0.5, borderRadius: '4px' }} />
          </Box>
          <Skeleton variant="circular" width={28} height={28} />
        </ListItemButton>
      ))}
    </List>
  );
  
  const renderChatHistoryPanel = () => (
    <Paper elevation={0} sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isMobile ? 0 : '24px',
        overflow: 'hidden',
        background: isDarkMode 
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.1)',
        position: 'relative'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2.5, 
        textAlign: 'center',
        background: isDarkMode 
          ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
          : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%)',
        backdropFilter: 'blur(10px)',
        borderBottom: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Header decoration */}
        <Box sx={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '150px',
          height: '150px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '50%',
          opacity: 0.05,
          filter: 'blur(30px)'
        }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, position: 'relative', zIndex: 1, marginBottom: '2rem' }}>
          <HistoryIcon sx={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '1.25rem' }} />
          <Typography variant="h6" sx={{ 
            fontWeight: 700,
            color: isDarkMode ? '#f1f5f9' : '#1e293b',
            fontSize: '1rem'
            
          }}>
            Chat History
          </Typography>
        </Box>
      </Box>
      
      {/* New Chat Button */}
      <Box sx={{ p: 1.5 }}>
        <Button
          onClick={handleNewChat}
          fullWidth
          sx={{
            py: 1.25,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.8rem',
            boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': {
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
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
          startIcon={<AddIcon />}
        >
          New Chat
        </Button>
      </Box>

      {/* Sessions List */}
      {loading ? (
          renderSkeletons()
      ) : serverError ? (
          <Alert 
            severity="error" 
            sx={{
              m: 2, 
              flexShrink: 0,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%)',
              border: '1px solid rgba(220, 38, 38, 0.3)'
            }}
          >
            Error connecting to server.
          </Alert>
      ) : sessions.length === 0 ? (
          <Box sx={{ 
            p: 3, 
            textAlign: 'center', 
            flexShrink: 0,
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.5) 0%, rgba(75, 85, 99, 0.5) 100%)'
              : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%)',
            borderRadius: '16px',
            mx: 2,
            border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)'
          }}>
            <MessageIcon sx={{ 
              fontSize: '3rem', 
              color: isDarkMode ? '#64748b' : '#9ca3af',
              mb: 1 
            }} />
            <Typography sx={{ 
              color: isDarkMode ? '#94a3b8' : '#64748b',
              fontWeight: 500
            }}>
              No chat sessions yet.
            </Typography>
            <Typography variant="caption" sx={{ 
              color: isDarkMode ? '#64748b' : '#9ca3af',
              display: 'block',
              mt: 0.5
            }}>
              Start a new conversation above
            </Typography>
          </Box>
      ) : (
        <List sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <ListItemButton
                selected={selectedSessionId === session.id}
                onClick={() => handleSessionChange(session.id)}
                sx={{ 
                    borderRadius: '12px',
                    mx: 1,
                    mb: 1,
                    transition: 'all 0.2s ease',
                    background: selectedSessionId === session.id 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'
                      : 'transparent',
                    border: selectedSessionId === session.id 
                      ? '1px solid rgba(59, 130, 246, 0.3)'
                      : '1px solid transparent',
                    '&:hover': { 
                      background: selectedSessionId === session.id
                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)'
                        : isDarkMode 
                          ? 'rgba(55, 65, 81, 0.5)' 
                          : 'rgba(248, 250, 252, 0.8)',
                      transform: 'translateX(4px)'
                    }
                }}
              >
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AIIcon sx={{ 
                        fontSize: '1rem', 
                        color: selectedSessionId === session.id 
                          ? '#3b82f6' 
                          : isDarkMode ? '#94a3b8' : '#64748b' 
                      }} />
                      <Typography sx={{ 
                        fontWeight: selectedSessionId === session.id ? 600 : 500,
                        color: selectedSessionId === session.id 
                          ? isDarkMode ? '#60a5fa' : '#2563eb'
                          : isDarkMode ? '#f1f5f9' : '#1e293b',
                        fontSize: '0.875rem'
                      }}>
                        Chat {sessions.length - index}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ 
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      fontSize: '0.75rem'
                    }}>
                      {formatDate(session.updated_at)}
                    </Typography>
                  }
                />
                 <IconButton 
                    edge="end" 
                    aria-label="delete" 
                    onClick={(e) => handleDeleteSessionRequest(e, session.id)} 
                    size="small"
                    disabled={isDeleting && sessionToDelete === session.id}
                    sx={{
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.1)'
                      }
                    }}
                 >
                   {(isDeleting && sessionToDelete === session.id) 
                     ? <CircularProgress size={16} color="inherit" /> 
                     : <DeleteIcon fontSize="small" />
                   }
                 </IconButton>
              </ListItemButton>
            </motion.div>
          ))}
        </List>
      )}
    </Paper>
  );
  
  return (
    <>
      <Box 
        sx={{
          minHeight: '100vh',
          background: isDarkMode 
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Enhanced background decoration */}
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDarkMode 
            ? 'radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)'
            : 'radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)',
          zIndex: -1
        }} />

        {/* Mobile Controls */}
        {isMobile && isAuthenticated && (
          <Box sx={{ 
            position: 'absolute', 
            top: 70, 
            left: 12, 
            zIndex: 1000, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5,
            marginTop: '-55px'
          }}>
            <Button
              variant="contained"
              onClick={handleDrawerToggle}
              sx={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: 'white',
                borderRadius: '12px',
                px: 2.5,
                py: 0.75,
                fontWeight: 600,
                fontSize: '0.75rem',
                boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 35px rgba(59, 130, 246, 0.4)'
                }
              }}
              startIcon={<HistoryIcon />}
            >
              History
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleNewChat}
              sx={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: 'white',
                borderRadius: '12px',
                px: 2.5,
                py: 0.75,
                fontWeight: 600,
                fontSize: '0.75rem',
                boxShadow: '0 8px 25px rgba(5, 150, 105, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 35px rgba(5, 150, 105, 0.4)'
                }
              }}
            >
              New
            </Button>
          </Box>
        )}

        <Container maxWidth="xl" sx={{ 
            pt: isMobile ? 1.5 : 3,
            pb: 3, 
            height: '85vh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 1
        }}>
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
                      width: 320,
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                      backdropFilter: 'blur(20px)'
                    },
                  }}
                >
                  {renderChatHistoryPanel()}
                </Drawer>
                <Box sx={{ 
                  height: 'calc(95vh - 100px)',
                  width: '100%',
                  pt: isMobile ? '50px' : 0,
                  boxSizing: 'border-box'
                }}>
                  <ChatWindow sessionId={selectedSessionId} onSessionChange={handleSessionChange} />
                </Box>
              </>
            ) : (
              <Grid container spacing={2} sx={{ height: '100%'}}>
                <Grid item md={3} sx={{height: '100%'}}> 
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{ height: '100%' }}
                  >
                  {renderChatHistoryPanel()}
                  </motion.div>
                </Grid>
                <Grid item md={9} sx={{height: '100%'}}>
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                    style={{ height: '100%' }}
                  >
                    <ChatWindow sessionId={selectedSessionId} onSessionChange={handleSessionChange} />
                  </motion.div>
                </Grid>
              </Grid>
            )
          ) : (
            <Box sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.1)',
              padding: '2rem',
              textAlign: 'center'
            }}>
               {!authLoading && (
                 <Box>
                   <MessageIcon sx={{ 
                     fontSize: '4rem', 
                     color: isDarkMode ? '#64748b' : '#9ca3af',
                     mb: 2 
                   }} />
                   <Typography variant="h5" sx={{ 
                     fontWeight: 600,
                     color: isDarkMode ? '#f1f5f9' : '#1e293b',
                     mb: 1
                   }}>
                     Please log in to use the chat
                   </Typography>
                   <Typography sx={{ 
                     color: isDarkMode ? '#94a3b8' : '#64748b'
                   }}>
                     Access your AI assistant to get help with HR and IT questions
                   </Typography>
                 </Box>
               )} 
            </Box>
          )}
        </Container>
      </Box>

      {/* Enhanced Delete Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          sx: {
            borderRadius: '20px',
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)'
          }
        }}
      >
        <DialogTitle id="alert-dialog-title" sx={{ 
          fontWeight: 700,
          color: isDarkMode ? '#f1f5f9' : '#1e293b',
          borderBottom: isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)'
        }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <DialogContentText id="alert-dialog-description" sx={{
            color: isDarkMode ? '#d1d5db' : '#4b5563',
            fontSize: '1rem'
          }}>
            Are you sure you want to delete this chat session? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={handleCloseDeleteDialog} 
            disabled={isDeleting}
            sx={{
              borderRadius: '10px',
              px: 2.5,
              py: 0.75,
              fontWeight: 600,
              fontSize: '0.8rem',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              '&:hover': {
                background: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(248, 250, 252, 0.8)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            disabled={isDeleting}
            sx={{
              background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
              color: 'white',
              borderRadius: '10px',
              px: 2.5,
              py: 0.75,
              fontWeight: 600,
              fontSize: '0.8rem',
              boxShadow: '0 6px 20px rgba(220, 38, 38, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)',
                boxShadow: '0 8px 25px rgba(220, 38, 38, 0.4)'
              },
              '&:disabled': {
                background: isDarkMode ? '#4b5563' : '#e5e7eb',
                color: isDarkMode ? '#9ca3af' : '#9ca3af'
              }
            }}
          >
            {isDeleting ? (
              <>
                <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Snackbar */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center'}}
      >
        <SnackbarAlert 
            onClose={handleSnackbarClose} 
            severity={snackbarSeverity} 
            sx={{ 
              width: '100%', 
              borderRadius: '16px',
              fontWeight: 600,
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)'
            }}
        >
          {snackbarMessage}
        </SnackbarAlert>
      </Snackbar>
    </>
  );
}

export default Chat;
