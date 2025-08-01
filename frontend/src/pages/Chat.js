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
  useMediaQuery,
  Avatar,
  Tooltip,
  Badge
} from '@mui/material';
import { 
  Add as AddIcon, 
  Message as MessageIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Delete as DeleteIcon,
  Menu as MenuIcon,
  History as HistoryIcon,
  AutoAwesome as AIIcon,
  Settings as SettingsIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import ChatWindow from '../components/ChatWindow';
import { chatApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Enhanced Alert component
const SnackbarAlert = React.forwardRef(function SnackbarAlert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function Chat() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const isAuthenticated = !!user;

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);

  const [starredSessions, setStarredSessions] = useState(new Set());
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



  const toggleStarred = (sessionId, e) => {
    e.stopPropagation();
    const newStarred = new Set(starredSessions);
    if (newStarred.has(sessionId)) {
      newStarred.delete(sessionId);
    } else {
      newStarred.add(sessionId);
    }
    setStarredSessions(newStarred);
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

  // Handle auto-fill and auto-submit from home page
  useEffect(() => {
    const autoFillMessage = sessionStorage.getItem('autoFillMessage');
    const autoSubmitChat = sessionStorage.getItem('autoSubmitChat');
    
    if (autoFillMessage && autoSubmitChat === 'true') {
      sessionStorage.removeItem('autoFillMessage');
      sessionStorage.removeItem('autoSubmitChat');
      
      const createNewChatAndSubmit = async () => {
        try {
          if (!selectedSessionId) {
            const newSession = await chatApi.createSession();
            if (newSession && newSession.id) {
              setSessions(prevSessions => [newSession, ...prevSessions].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
              setSelectedSessionId(newSession.id);
              
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('autoSubmitMessage', {
                  detail: { message: autoFillMessage, sessionId: newSession.id }
                }));
              }, 1500);
            }
          } else {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('autoSubmitMessage', {
                detail: { message: autoFillMessage, sessionId: selectedSessionId }
              }));
            }, 1000);
          }
        } catch (error) {
          console.error('Error creating new chat session:', error);
        }
      };
      
      createNewChatAndSubmit();
    }
  }, [selectedSessionId]);
  
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
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };
  
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
  
  const handleLogoutClick = async () => {
    try {
      await logout();
    } catch (error) {
      alert("Logout failed. Please try again.");
    }
  };
  
  const renderSkeletons = () => (
    <List sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
      {[...Array(6)].map((_, index) => (
        <motion.div
          key={`skeleton-${index}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Box sx={{ 
            p: 2,
            mx: 1,
            mb: 1.5,
            borderRadius: '16px',
            background: isDarkMode 
              ? 'rgba(55, 65, 81, 0.3)'
              : 'rgba(248, 250, 252, 0.5)',
            backdropFilter: 'blur(10px)',
            border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.2)' : '1px solid rgba(226, 232, 240, 0.2)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="70%" height={20} sx={{ borderRadius: '8px' }} />
                <Skeleton variant="text" width="40%" height={16} sx={{ mt: 0.5, borderRadius: '6px' }} />
              </Box>
              <Skeleton variant="circular" width={24} height={24} />
            </Box>
          </Box>
        </motion.div>
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
          ? 'rgba(15, 23, 42, 0.8)'
          : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(40px)',
        border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
        boxShadow: isDarkMode 
          ? '0 25px 50px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 25px 50px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: isDarkMode 
            ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent)'
        }
    }}>
      {/* Enhanced Header */}
      <Box sx={{ 
        p: 3, 
        background: isDarkMode 
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(55, 65, 81, 0.9) 100%)'
          : 'linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background elements */}
        <Box sx={{
          position: 'absolute',
          top: '-100%',
          right: '-50%',
          width: '200px',
          height: '200px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
          borderRadius: '50%',
          opacity: 0.05,
          filter: 'blur(40px)',
          animation: 'float 6s ease-in-out infinite'
        }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ 
              width: 32, 
              height: 32,
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <HistoryIcon sx={{ fontSize: '1.1rem', color: 'white' }} />
            </Avatar>
            <Typography variant="h6" sx={{ 
              fontWeight: 700,
              color: isDarkMode ? '#f1f5f9' : '#1e293b',
              fontSize: '1.1rem',
              background: isDarkMode 
                ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)'
                : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Chat History
            </Typography>
          </Box>
          
          <Tooltip title="Toggle theme">
            <IconButton 
              onClick={toggleDarkMode}
              size="small"
              sx={{
                background: isDarkMode 
                  ? 'rgba(75, 85, 99, 0.5)'
                  : 'rgba(226, 232, 240, 0.5)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  background: isDarkMode 
                    ? 'rgba(75, 85, 99, 0.7)'
                    : 'rgba(226, 232, 240, 0.7)',
                  transform: 'scale(1.05)'
                }
              }}
            >
              {isDarkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>


      </Box>
      
      {/* Enhanced New Chat Button */}
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <Button
          onClick={handleNewChat}
          fullWidth
          sx={{
            py: 1.5,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.875rem',
            textTransform: 'none',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': {
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              transform: 'translateY(-2px)',
              boxShadow: '0 12px 40px rgba(59, 130, 246, 0.4)'
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              transition: 'left 0.5s ease'
            },
            '&:hover::before': {
              left: '100%'
            }
          }}
          startIcon={<AddIcon />}
        >
          Start New Conversation
        </Button>
      </Box>

      {/* Enhanced Sessions List */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {loading ? (
            renderSkeletons()
        ) : serverError ? (
            <Box sx={{ p: 2 }}>
            <Alert 
              severity="error" 
              sx={{
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                backdropFilter: 'blur(10px)'
              }}
            >
              Connection error. Please refresh and try again.
            </Alert>
          </Box>
      ) : sessions.length === 0 ? (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center', 
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.5) 0%, rgba(75, 85, 99, 0.5) 100%)'
                : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              backdropFilter: 'blur(10px)'
            }}>
              <MessageIcon sx={{ 
                fontSize: '2rem', 
                color: isDarkMode ? '#64748b' : '#9ca3af'
              }} />
            </Box>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              color: isDarkMode ? '#f1f5f9' : '#1e293b',
              mb: 1
            }}>
              No conversations yet
            </Typography>
            <Typography variant="body2" sx={{ 
              color: isDarkMode ? '#94a3b8' : '#64748b',
              maxWidth: 200,
              lineHeight: 1.5
            }}>
              Start a new conversation to get started with your AI assistant
            </Typography>
          </Box>
      ) : (
        <List sx={{ 
          flex: 1,
          overflowY: 'auto', 
          p: 1, 
          scrollbarWidth: 'thin',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <AnimatePresence>
            {sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={{ delay: index * 0.03, duration: 0.3 }}
                layout
              >
                <ListItemButton
                  selected={selectedSessionId === session.id}
                  onClick={() => handleSessionChange(session.id)}
                  sx={{ 
                      borderRadius: '16px',
                      mx: 1,
                      mb: 1.5,
                      p: 2,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: selectedSessionId === session.id 
                        ? isDarkMode
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)'
                          : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
                        : 'transparent',
                      border: selectedSessionId === session.id 
                        ? '1px solid rgba(59, 130, 246, 0.3)'
                        : '1px solid transparent',
                      backdropFilter: 'blur(10px)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': { 
                        background: selectedSessionId === session.id
                          ? isDarkMode
                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'
                            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)'
                          : isDarkMode 
                            ? 'rgba(55, 65, 81, 0.5)' 
                            : 'rgba(248, 250, 252, 0.8)',
                        transform: 'translateY(-2px)',
                        boxShadow: selectedSessionId === session.id
                          ? '0 8px 32px rgba(59, 130, 246, 0.2)'
                          : '0 4px 16px rgba(0, 0, 0, 0.1)'
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '1px',
                        background: selectedSessionId === session.id 
                          ? 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent)'
                          : 'transparent',
                        transition: 'all 0.3s ease'
                      }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                    <Avatar sx={{ 
                      width: 32, 
                      height: 32,
                      background: selectedSessionId === session.id
                        ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                        : isDarkMode 
                          ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                          : 'linear-gradient(135deg, rgba(226, 232, 240, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
                      color: selectedSessionId === session.id 
                        ? 'white'
                        : isDarkMode ? '#94a3b8' : '#64748b',
                      transition: 'all 0.3s ease'
                    }}>
                      <AIIcon sx={{ fontSize: '1rem' }} />
                    </Avatar>
                    
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ 
                        fontWeight: selectedSessionId === session.id ? 700 : 600,
                        color: selectedSessionId === session.id 
                          ? isDarkMode ? '#60a5fa' : '#2563eb'
                          : isDarkMode ? '#f1f5f9' : '#1e293b',
                        fontSize: '0.875rem',
                        mb: 0.25,
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                      }}>
                        Chat {sessions.length - index}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ 
                          color: isDarkMode ? '#94a3b8' : '#64748b',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}>
                          {formatDate(session.updated_at)}
                        </Typography>
                        {starredSessions.has(session.id) && (
                          <StarIcon sx={{ 
                            fontSize: '0.75rem', 
                            color: '#fbbf24'
                          }} />
                        )}
                      </Box>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title={starredSessions.has(session.id) ? "Remove from favorites" : "Add to favorites"}>
                      <IconButton 
                        edge="end" 
                        size="small"
                        onClick={(e) => toggleStarred(session.id, e)}
                        sx={{
                          color: starredSessions.has(session.id) ? '#fbbf24' : (isDarkMode ? '#6b7280' : '#9ca3af'),
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            color: '#fbbf24',
                            background: 'rgba(251, 191, 36, 0.1)',
                            transform: 'scale(1.1)'
                          }
                        }}
                      >
                        {starredSessions.has(session.id) ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Delete conversation">
                      <IconButton 
                        edge="end" 
                        size="small"
                        onClick={(e) => handleDeleteSessionRequest(e, session.id)} 
                        disabled={isDeleting && sessionToDelete === session.id}
                        sx={{
                          color: isDarkMode ? '#6b7280' : '#9ca3af',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            color: '#ef4444',
                            background: 'rgba(239, 68, 68, 0.1)',
                            transform: 'scale(1.1)'
                          }
                        }}
                      >
                        {(isDeleting && sessionToDelete === session.id) 
                          ? <CircularProgress size={16} color="inherit" /> 
                          : <DeleteIcon fontSize="small" />
                        }
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItemButton>
              </motion.div>
            ))}
          </AnimatePresence>
        </List>
      )}
        </Box>

      {/* Enhanced Footer with Stats */}
      {sessions.length > 0 && (
        <Box sx={{ 
          p: 2, 
          borderTop: isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
          background: isDarkMode 
            ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)'
            : 'linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%)',
          backdropFilter: 'blur(20px)'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ 
              color: isDarkMode ? '#94a3b8' : '#64748b',
              fontWeight: 500
            }}>
              {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip 
                label={`${starredSessions.size} starred`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  background: 'rgba(251, 191, 36, 0.1)',
                  color: '#fbbf24',
                  border: '1px solid rgba(251, 191, 36, 0.2)'
                }}
                icon={<StarIcon sx={{ fontSize: '0.7rem !important' }} />}
              />
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
  
  return (
    <>
      <Box 
        sx={{
          minHeight: '100vh',
          background: isDarkMode 
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Enhanced animated background */}
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDarkMode 
            ? `
              radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 60% 70%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)
            `
            : `
              radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 60% 70%, rgba(236, 72, 153, 0.08) 0%, transparent 50%)
            `,
          zIndex: -1,
          animation: 'gradientShift 15s ease infinite'
        }} />

        {/* Floating elements */}
        <Box sx={{
          position: 'fixed',
          top: '10%',
          right: '10%',
          width: '300px',
          height: '300px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'float 8s ease-in-out infinite',
          zIndex: -1
        }} />
        
        <Box sx={{
          position: 'fixed',
          bottom: '15%',
          left: '5%',
          width: '250px',
          height: '250px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%)',
          borderRadius: '50%',
          filter: 'blur(50px)',
          animation: 'float 10s ease-in-out infinite reverse',
          zIndex: -1
        }} />

        {/* Enhanced Mobile Controls */}
        {isMobile && isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Box sx={{ 
              position: 'fixed', 
              top: 16, 
              left: 16, 
              right: 16,
              zIndex: 1000, 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              background: isDarkMode 
                ? 'rgba(15, 23, 42, 0.9)'
                : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              p: 1.5,
              border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
              <Button
                variant="contained"
                onClick={handleDrawerToggle}
                sx={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  borderRadius: '14px',
                  px: 3,
                  py: 1,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)'
                  }
                }}
                startIcon={<HistoryIcon sx={{ fontSize: '1rem !important' }} />}
              >
                Chats
              </Button>
              
              <Button
                variant="contained"
                startIcon={<AddIcon sx={{ fontSize: '1rem !important' }} />}
                onClick={handleNewChat}
                sx={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: 'white',
                  borderRadius: '14px',
                  px: 3,
                  py: 1,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  boxShadow: '0 4px 16px rgba(5, 150, 105, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
                  }
                }}
              >
                New Chat
              </Button>
            </Box>
          </motion.div>
        )}

        <Container maxWidth="xl" sx={{ 
            pt: isMobile ? 10 : 3,
            pb: 3, 
            height: isMobile ? 'calc(100vh - 80px)' : '95vh',
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
                      width: 340,
                      background: isDarkMode 
                        ? 'rgba(15, 23, 42, 0.95)'
                        : 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(40px)',
                      borderRight: isDarkMode ? '1px solid rgba(55, 65, 81, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)'
                    },
                  }}
                >
                  {renderChatHistoryPanel()}
                </Drawer>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  style={{ height: '100%', width: '100%' }}
                >
                  <ChatWindow sessionId={selectedSessionId} onSessionChange={handleSessionChange} />
                </motion.div>
              </>
            ) : (
              <Grid container spacing={3} sx={{ height: '100%'}}>
                <Grid item md={3.5} sx={{height: '100%'}}> 
                  <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ height: '100%' }}
                  >
                  {renderChatHistoryPanel()}
                  </motion.div>
                </Grid>
                <Grid item md={8.5} sx={{height: '100%'}}>
                  <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    style={{ height: '100%' }}
                  >
                    <ChatWindow sessionId={selectedSessionId} onSessionChange={handleSessionChange} />
                  </motion.div>
                </Grid>
              </Grid>
            )
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              style={{ flexGrow: 1, display: 'flex' }}
            >
              <Box sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                background: isDarkMode 
                  ? 'rgba(15, 23, 42, 0.8)'
                  : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(40px)',
                borderRadius: '32px',
                border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
                boxShadow: isDarkMode 
                  ? '0 25px 50px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  : '0 25px 50px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                padding: '3rem',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Decorative elements */}
                <Box sx={{
                  position: 'absolute',
                  top: '-20%',
                  right: '-20%',
                  width: '200px',
                  height: '200px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: '50%',
                  opacity: 0.05,
                  filter: 'blur(40px)'
                }} />
                
                <Box sx={{
                  position: 'absolute',
                  bottom: '-20%',
                  left: '-20%',
                  width: '150px',
                  height: '150px',
                  background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                  borderRadius: '50%',
                  opacity: 0.05,
                  filter: 'blur(30px)'
                }} />

                {!authLoading && (
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'
                        : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                      backdropFilter: 'blur(10px)',
                      border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(59, 130, 246, 0.1)'
                    }}>
                      <MessageIcon sx={{ 
                        fontSize: '3rem', 
                        color: isDarkMode ? '#60a5fa' : '#3b82f6'
                      }} />
                    </Box>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 800,
                      color: isDarkMode ? '#f1f5f9' : '#1e293b',
                      mb: 2,
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)'
                        : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      Welcome to AI Chat
                    </Typography>
                    <Typography variant="h6" sx={{ 
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      mb: 3,
                      fontWeight: 500,
                      maxWidth: 400,
                      mx: 'auto',
                      lineHeight: 1.6
                    }}>
                      Please sign in to access your AI assistant and get help with HR and IT questions
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => navigate('/login')}
                      sx={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        color: 'white',
                        borderRadius: '16px',
                        px: 4,
                        py: 1.5,
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        textTransform: 'none',
                        boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 12px 40px rgba(59, 130, 246, 0.4)'
                        }
                      }}
                      startIcon={<LoginIcon />}
                    >
                      Sign In to Continue
                    </Button>
                  </Box>
                )} 
              </Box>
            </motion.div>
          )}
        </Container>
      </Box>

      {/* Ultra-modern Delete Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          sx: {
            borderRadius: '24px',
            background: isDarkMode 
              ? 'rgba(15, 23, 42, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(40px)',
            border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
            boxShadow: isDarkMode 
              ? '0 25px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 25px 50px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
            minWidth: 400,
            overflow: 'hidden',
            position: 'relative'
          }
        }}
      >
        {/* Dialog decoration */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #ef4444 0%, #f97316 50%, #ef4444 100%)'
        }} />
        
        <DialogTitle id="alert-dialog-title" sx={{ 
          fontWeight: 800,
          fontSize: '1.25rem',
          color: isDarkMode ? '#f1f5f9' : '#1e293b',
          pt: 3,
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar sx={{
            width: 40,
            height: 40,
            background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)'
          }}>
            <DeleteIcon />
          </Avatar>
          Delete Conversation
        </DialogTitle>
        <DialogContent sx={{ pt: 1, pb: 2 }}>
          <DialogContentText id="alert-dialog-description" sx={{
            color: isDarkMode ? '#cbd5e1' : '#475569',
            fontSize: '1rem',
            lineHeight: 1.6,
            pl: 7
          }}>
            This conversation will be permanently deleted and cannot be recovered. Are you sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2, justifyContent: 'flex-end' }}>
          <Button 
            onClick={handleCloseDeleteDialog} 
            disabled={isDeleting}
            sx={{
              borderRadius: '12px',
              px: 3,
              py: 1,
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              background: isDarkMode 
                ? 'rgba(55, 65, 81, 0.5)'
                : 'rgba(248, 250, 252, 0.8)',
              '&:hover': {
                background: isDarkMode 
                  ? 'rgba(55, 65, 81, 0.7)'
                  : 'rgba(226, 232, 240, 0.8)'
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
              borderRadius: '12px',
              px: 3,
              py: 1,
              fontWeight: 700,
              fontSize: '0.875rem',
              textTransform: 'none',
              boxShadow: '0 4px 16px rgba(220, 38, 38, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)',
                boxShadow: '0 6px 20px rgba(220, 38, 38, 0.4)',
                transform: 'translateY(-1px)'
              },
              '&:disabled': {
                background: isDarkMode ? '#4b5563' : '#e5e7eb',
                color: isDarkMode ? '#9ca3af' : '#9ca3af',
                transform: 'none'
              }
            }}
          >
            {isDeleting ? (
              <>
                <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                Deleting...
              </>
            ) : (
              <>
                <DeleteIcon sx={{ fontSize: '1rem', mr: 1 }} />
                Delete Forever
              </>
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Premium Snackbar */}
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
              fontSize: '0.875rem',
              boxShadow: isDarkMode 
                ? '0 12px 40px rgba(0, 0, 0, 0.3)'
                : '0 12px 40px rgba(0, 0, 0, 0.15)',
              backdropFilter: 'blur(20px)',
              border: snackbarSeverity === 'success' 
                ? '1px solid rgba(16, 185, 129, 0.3)'
                : '1px solid rgba(239, 68, 68, 0.3)'
            }}
        >
          {snackbarMessage}
        </SnackbarAlert>
      </Snackbar>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes gradientShift {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </>
  );
}

export default Chat;