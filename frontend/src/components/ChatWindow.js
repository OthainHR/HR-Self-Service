import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Fade,
  Alert,
  Chip,
  Avatar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Send as SendIcon, 
  SmartToy as BotIcon,
  SignalWifiOff as OfflineIcon,
  WifiTethering as OnlineIcon,
  SentimentSatisfiedAlt as EmojiIcon,
  SignalWifiOff as SignalWifiOffIcon,
  SupportAgent as SupportAgentIcon,
  AutoAwesome as AIIcon,
  CheckCircle as OnlineCheckIcon
} from '@mui/icons-material';
import MessageItem from './MessageItem';
import { chatApi } from '../services/api';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';
import { motion } from 'framer-motion';

const ChatWindow = ({ sessionId, onSessionChange }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [userProfilePicture, setUserProfilePicture] = useState(null);
  const [error, setError] = useState(null);
  const [serverError, setServerError] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const currentAssistantMessageId = useRef(null);
  const bufferedContentRef = useRef('');
  const updateTimerRef = useRef(null);
  const isFirstChunkRef = useRef(true);

  // Helper function to get display name
  const getDisplayName = () => {
    if (user?.name) {
      return user.name;
    }
    if (user?.email) {
      try {
        const emailParts = user.email.split('@');
        const namePart = emailParts[0];
        const firstName = namePart.split('.')[0];
        if (firstName) {
          return firstName.charAt(0).toUpperCase() + firstName.slice(1);
        }
      } catch (e) {
        return user.email;
      }
      return user.email;
    }
    return 'User';
  };

  // Set to false since we're removing offline mode
  const offlineMode = false;
  
  const chatWindowVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      // Scroll within the messages container only, not the entire page
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Fetch messages when sessionId changes
  useEffect(() => {
    if (!sessionId) return;
    
    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await chatApi.getSessionMessages(sessionId);
        setMessages(result.messages || []);
      } catch (error) {
        setError('Failed to load messages. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();
  }, [sessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Debounced state update function
  const applyBufferedUpdate = useCallback(() => {
    if (bufferedContentRef.current === '' || !currentAssistantMessageId.current) return;

    const contentToAdd = bufferedContentRef.current;
    bufferedContentRef.current = '';
    const targetId = currentAssistantMessageId.current;
    
    setMessages(prev => prev.map(msg => {
      if (msg.id === targetId) {
        const newContent = isFirstChunkRef.current 
          ? contentToAdd
          : msg.content + contentToAdd;
        isFirstChunkRef.current = false;
        return { ...msg, content: newContent, isLoading: false }; 
      } else {
        return msg;
      }
    }));
  }, []);

  // Handle auto-submit from home page
  useEffect(() => {
    const handleAutoSubmit = (event) => {
      const { message, sessionId: eventSessionId } = event.detail;
      if (eventSessionId === sessionId && message) {
        console.log('Auto-submitting message:', message, 'for session:', sessionId);
        
        // Auto-submit after a short delay to ensure component is ready
        setTimeout(async () => {
          try {
            // Set the input first
            setInput(message);
            
            // Wait a bit more for state to update
            setTimeout(async () => {
              if (!sessionId || sending) return;
              
              const messageText = message.trim();
              setSending(true);
              setServerError(false);
              setError(null); 
              bufferedContentRef.current = '';
              if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
              updateTimerRef.current = null;
              isFirstChunkRef.current = true;
              
              // 1. Add user message 
              const userMessage = {
                id: `user-${Date.now()}`,
                role: 'user',
                content: messageText,
                created_at: new Date().toISOString()
              };
              setMessages(prev => [...prev, userMessage]);
              
              // 2. Add placeholder
              const assistantMessageId = `assistant-${Date.now()}`;
              currentAssistantMessageId.current = assistantMessageId;
              const placeholderMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: 'Thinking...',
                created_at: new Date().toISOString(),
                isLoading: true 
              };
              setMessages(prev => [...prev, placeholderMessage]);
              
              try {
                // 3. Call the streaming API function
                await chatApi.sendMessage(sessionId, messageText, (chunk) => {
                  if (chunk === null) {
                    // Stream finished
                    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
                    updateTimerRef.current = null;
                    applyBufferedUpdate();
                    
                    setMessages(prev => {
                      const finalMsg = prev.find(m => m.id === assistantMessageId);
                      if (finalMsg && finalMsg.content.trim() === '') {
                          console.warn("Stream ended with empty content.");
                          return prev.map(m => m.id === assistantMessageId ? { ...m, content: 'Error: No response received.', isError: true, isLoading: false } : m);
                      } else {
                          return prev.map(m => m.id === assistantMessageId ? { ...m, isLoading: false } : m);
                      }
                    });

                    currentAssistantMessageId.current = null; 
                    setSending(false); 

                  } else {
                    // Append chunk to buffer
                    bufferedContentRef.current += chunk;
                    // Schedule update if timer isn't already running
                    if (!updateTimerRef.current) {
                      updateTimerRef.current = setTimeout(() => {
                        applyBufferedUpdate();
                        updateTimerRef.current = null;
                      }, 100);
                    }
                  }
                });

              } catch (error) {
                console.error("Error sending/streaming message:", error);
                if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
                updateTimerRef.current = null;
                bufferedContentRef.current = '';
                
                setMessages(prev => prev.map(msg => 
                  msg.id === currentAssistantMessageId.current
                    ? { ...msg, content: `Sorry, an error occurred: ${error.message || 'Network error'}`, isLoading: false, isError: true }
                    : msg
                ));
                currentAssistantMessageId.current = null;
                setSending(false); 
                setServerError(true); 
              }
            }, 500);
          } catch (error) {
            console.error('Error in auto-submit:', error);
            setSending(false);
          }
        }, 800);
      }
    };

    window.addEventListener('autoSubmitMessage', handleAutoSubmit);
    return () => {
      window.removeEventListener('autoSubmitMessage', handleAutoSubmit);
    };
  }, [sessionId, sending, applyBufferedUpdate]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // Fetch user profile picture
  useEffect(() => {
    const fetchUserProfilePicture = async () => {
      if (!user?.id) return;

      try {
        const profilePictureUrl = await profileService.getProfilePicture(user.id);
        setUserProfilePicture(profilePictureUrl);
      } catch (error) {
        console.error('Error fetching user profile picture:', error);
        // Don't show error to user, just silently fail
      }
    };

    fetchUserProfilePicture();
  }, [user?.id]);

  // Handle sending a message (Updated for Streaming with Batching)
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!input.trim() || !sessionId || sending) return;
    
    const messageText = input.trim();
    setInput('');
    setSending(true);
    setServerError(false);
    setError(null); 
    bufferedContentRef.current = '';
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    updateTimerRef.current = null;
    isFirstChunkRef.current = true;
    
    // 1. Add user message 
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // 2. Add placeholder
    const assistantMessageId = `assistant-${Date.now()}`;
    currentAssistantMessageId.current = assistantMessageId;
    const placeholderMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: 'Thinking...',
      created_at: new Date().toISOString(),
      isLoading: true 
    };
    setMessages(prev => [...prev, placeholderMessage]);
    
    try {
      // 3. Call the streaming API function
      await chatApi.sendMessage(sessionId, messageText, (chunk) => {
        if (chunk === null) {
          // Stream finished
          if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
          updateTimerRef.current = null;
          applyBufferedUpdate();
          
          setMessages(prev => {
            const finalMsg = prev.find(m => m.id === assistantMessageId);
            if (finalMsg && finalMsg.content.trim() === '') {
                console.warn("Stream ended with empty content.");
                return prev.map(m => m.id === assistantMessageId ? { ...m, content: 'Error: No response received.', isError: true, isLoading: false } : m);
            } else {
                return prev.map(m => m.id === assistantMessageId ? { ...m, isLoading: false } : m);
            }
          });

          currentAssistantMessageId.current = null; 
          setSending(false); 

        } else {
          // Append chunk to buffer
          bufferedContentRef.current += chunk;
          // Schedule update if timer isn't already running
          if (!updateTimerRef.current) {
            updateTimerRef.current = setTimeout(() => {
              applyBufferedUpdate();
              updateTimerRef.current = null;
            }, 100);
          }
        }
      });

    } catch (error) {
      console.error("Error sending/streaming message:", error);
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
      bufferedContentRef.current = '';
      
      setMessages(prev => prev.map(msg => 
        msg.id === currentAssistantMessageId.current
          ? { ...msg, content: `Sorry, an error occurred: ${error.message || 'Network error'}`, isLoading: false, isError: true }
          : msg
      ));
      currentAssistantMessageId.current = null;
      setSending(false); 
      setServerError(true); 
    } 
  }, [input, sessionId, sending, applyBufferedUpdate]);

  // Display the status badge
  const getStatusBadge = () => {
    if (serverError || offlineMode) {
      return (
        <Chip
          icon={<SignalWifiOffIcon fontSize="small" />}
          label="Connection Error"
          size="small"
          sx={{ 
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            color: '#dc2626',
            fontWeight: 600,
            fontSize: '0.75rem',
            '& .MuiChip-icon': { color: '#dc2626' }
          }}
        />
      );
    }
    return (
      <Chip
        icon={<OnlineCheckIcon fontSize="small" />}
        label="Connected"
        size="small"
        sx={{ 
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)',
          border: '1px solid rgba(5, 150, 105, 0.3)',
          color: '#059669',
          fontWeight: 600,
          fontSize: '0.75rem',
          '& .MuiChip-icon': { color: '#059669' }
        }}
      />
    );
  };

  if (!sessionId) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={chatWindowVariants}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '24px',
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Background decoration */}
          <Box sx={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '300px',
            height: '300px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: '50%',
            opacity: 0.05,
            filter: 'blur(40px)'
          }} />

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ zIndex: 1, textAlign: 'center' }}
          >
            <Avatar sx={{
              width: 80,
              height: 80,
              mb: 3,
              mx: 'auto',
              background: 'none',
              boxShadow: '0 15px 35px rgba(59, 130, 246, 0.3)'
            }}>
              <img 
                src={isDarkMode ? '/othainlogopreview.png' : '/OthainOcolor.png'}
                alt="Othain Logo"
                style={{ width: '70%', height: '70%', objectFit: 'contain' }}
              />
            </Avatar>
            
            <Typography variant="h4" sx={{ 
              mb: 2, 
              fontWeight: 800,
              background: isDarkMode 
                ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)'
                : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: isMobile ? '1.75rem' : '2.25rem'
            }}>
              Welcome to Othain ESS
            </Typography>
            
            <Typography variant="h6" sx={{ 
              mb: 4, 
              color: isDarkMode ? '#94a3b8' : '#64748b',
              fontWeight: 500,
              maxWidth: 500,
              mx: 'auto',
              lineHeight: 1.6,
              fontSize: isMobile ? '1rem' : '1.25rem'
            }}>
              Your AI-powered Employee Self Service assistant is ready to help with HR, IT, and workplace questions.
            </Typography>
            
            {getStatusBadge()}
          </motion.div>
        </Paper>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={chatWindowVariants}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          borderRadius: '24px',
          overflow: 'hidden',
          background: isDarkMode 
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.1)',
          position: 'relative'
        }}
      >
        {/* Enhanced Header */}
        <Box 
          sx={{ 
            py: 4,
            px: 3,
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%)',
            backdropFilter: 'blur(10px)',
            borderBottom: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Header decoration */}
          <Box sx={{
            position: 'absolute',
            top: '-50%',
            left: '-10%',
            width: '150px',
            height: '150px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: '50%',
            opacity: 0.05,
            filter: 'blur(30px)'
          }} />

          <Box sx={{ display: 'flex', alignItems: 'center', zIndex: 1 }}>
            <Avatar
              sx={{
                background: 'none',
                width: 48,
                height: 48,
                mr: 2,
                boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
                  animation: 'rotate 3s linear infinite'
                }
              }}
            >
              <img 
                src={isDarkMode ? '/logowhite.png' : '/Othain-logo2.png'}
                alt="Othain Logo"
                style={{ width: '70%', height: '70%', objectFit: 'contain', zIndex: 1, position: 'relative' }}
              />
            </Avatar>
            
            <Box>
              <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                color: isDarkMode ? '#f1f5f9' : '#1e293b',
                fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' }
              }}>
                Othain ESS Assistant
              </Typography>
              <Typography variant="caption" sx={{ 
                color: isDarkMode ? '#94a3b8' : '#64748b',
                fontWeight: 500,
                fontSize: { xs: '0.625rem', sm: '0.7rem', md: '0.75rem' }
              }}>
                AI-Powered Employee Support
              </Typography>
            </Box>
          </Box>
          
          {getStatusBadge()}
        </Box>

        {/* Messages Area */}
        <Box 
          ref={messagesContainerRef}
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            p: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.3) 0%, rgba(30, 41, 59, 0.3) 100%)'
              : 'linear-gradient(135deg, rgba(248, 250, 252, 0.3) 0%, rgba(241, 245, 249, 0.3) 100%)',
            position: 'relative',
            // Custom scrollbar
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.5) 0%, rgba(107, 114, 128, 0.5) 100%)'
                : 'linear-gradient(135deg, rgba(203, 213, 225, 0.5) 0%, rgba(226, 232, 240, 0.5) 100%)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(107, 114, 128, 0.7) 0%, rgba(156, 163, 175, 0.7) 100%)'
                : 'linear-gradient(135deg, rgba(156, 163, 175, 0.7) 0%, rgba(203, 213, 225, 0.7) 100%)',
            }
          }}
        >
          {loading ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              flexDirection: 'column'
            }}>
              <CircularProgress sx={{ 
                color: '#6366f1',
                mb: 2
              }} />
              <Typography sx={{ 
                color: isDarkMode ? '#94a3b8' : '#64748b',
                fontWeight: 500
              }}>
                Loading conversation...
              </Typography>
            </Box>
          ) : messages.length === 0 ? (
            <Fade in={true} timeout={1000}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  height: '100%',
                  p: 4,
                  textAlign: 'center',
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.5) 0%, rgba(75, 85, 99, 0.5) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
                  borderRadius: '20px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Welcome decoration */}
                <Box sx={{
                  position: 'absolute',
                  top: '-30%',
                  right: '-30%',
                  width: '200px',
                  height: '200px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: '50%',
                  opacity: 0.05,
                  filter: 'blur(40px)'
                }} />

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  style={{ zIndex: 1 }}
                >
                  <Avatar sx={{
                    width: 64,
                    height: 64,
                    mx: 'auto',
                    mb: 3,
                    background: 'none',
                    boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
                  }}>
                    <img 
                      src={isDarkMode ? '/othainlogopreview.png' : '/OthainOcolor.png'}
                      alt="Othain Logo"
                      style={{ width: '70%', height: '70%', objectFit: 'contain' }}
                    />
                  </Avatar>
                  
                  {/* User Profile Picture */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginBottom: '1rem',
                      gap: '12px'
                    }}
                  >
                    <Avatar
                      src={userProfilePicture}
                      sx={{
                        width: 48,
                        height: 48,
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        background: userProfilePicture
                          ? 'none'
                          : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                        border: `3px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(255, 255, 255, 0.8)'}`,
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {!userProfilePicture && getDisplayName().charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        color: isDarkMode ? '#e2e8f0' : '#334155',
                        fontSize: '1rem'
                      }}
                    >
                      Welcome, {getDisplayName()}!
                    </Typography>
                  </motion.div>
                  
                  <Typography variant="h5" sx={{ 
                    mb: 2, 
                    fontWeight: 700,
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    fontSize: isMobile ? '1.25rem' : '1.5rem'
                  }}>
                    Start a conversation
                  </Typography>
                  
                  <Typography variant="body1" sx={{ 
                    mb: 4, 
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    maxWidth: '400px'
                  }}>
                    Ask me anything about HR policies, benefits, IT support, or general workplace questions.
                  </Typography>
                  
                  {/* Quick Start Buttons */}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 2,
                    maxWidth: '400px',
                    width: '100%'
                  }}>
                    {[
                      'What is the attendance policy at Othain?',
                      'How do I apply for leave?',
                      'When is salary credited each month?'
                    ].map((question, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + (index * 0.1), duration: 0.3 }}
                      >
                        <Button
                          variant="outlined"
                          onClick={() => setInput(question)}
                          fullWidth
                          sx={{
                            py: 1.5,
                            px: 3,
                            borderRadius: '16px',
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            color: isDarkMode ? '#d1d5db' : '#374151',
                            background: isDarkMode 
                              ? 'rgba(55, 65, 81, 0.3)'
                              : 'rgba(255, 255, 255, 0.5)',
                            backdropFilter: 'blur(5px)',
                            border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.5)',
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            fontWeight: 500,
                            textTransform: 'none',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              background: isDarkMode 
                                ? 'rgba(75, 85, 99, 0.4)'
                                : 'rgba(255, 255, 255, 0.8)',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
                              borderColor: '#6366f1'
                            }
                          }}
                        >
                          {question}
                        </Button>
                      </motion.div>
                    ))}
                  </Box>
                </motion.div>
              </Box>
            </Fade>
          ) : (
            messages.map((message, index) => {
              const isLastMessage = index === messages.length - 1;
              const isStreamingMessage = message.isLoading || message.role === 'assistant';
              
              return (
              <motion.div
                key={message.id ? message.id : `temp-msg-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: isLastMessage ? 0 : Math.min(index * 0.02, 0.2), // No delay for last message, minimal delay for others
                    duration: isLastMessage || isStreamingMessage ? 0.15 : 0.3, // Faster animation for streaming messages
                    ease: "easeOut"
                  }}
              >
                <MessageItem
                  message={message}
                  isLast={index === messages.length - 1}
                  isMobile={isMobile}
                />
              </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert 
              severity="error" 
              sx={{ 
                m: 2, 
                mb: 0,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                backdropFilter: 'blur(10px)',
                fontWeight: 500
              }}
            >
              {error}
            </Alert>
          </motion.div>
        )}

        {/* Enhanced Input Area */}
        <Box 
          component="form" 
          onSubmit={handleSubmit}
          sx={{
            p: 2.5,
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%)',
            backdropFilter: 'blur(10px)',
            borderTop: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            position: 'relative'
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your message here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && sessionId && !sending) {
                  handleSubmit(e);
                }
              }
            }}
            disabled={!sessionId || sending}
            multiline
            maxRows={4}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '20px',
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(10px)',
                fontSize: isMobile ? '0.875rem' : '1rem',
                transition: 'all 0.2s ease',
                border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                '&:hover': {
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
                  borderColor: '#6366f1'
                },
                '&.Mui-focused': {
                  boxShadow: '0 8px 25px rgba(99, 102, 241, 0.2)',
                  borderColor: '#6366f1'
                }
              },
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none'
              },
              '& .MuiInputBase-input': {
                color: isDarkMode ? '#f1f5f9' : '#1e293b',
                '&::placeholder': {
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  opacity: 1
                }
              }
            }}
          />
          
          <Button
            type="submit"
            variant="contained"
            disabled={!sessionId || sending || !input.trim()}
            sx={{
              borderRadius: '16px',
              minWidth: '56px',
              height: '56px',
              background: !sessionId || sending || !input.trim()
                ? (isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(226, 232, 240, 0.5)')
                : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              boxShadow: !sessionId || sending || !input.trim()
                ? 'none'
                : '0 8px 25px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': {
                background: !sessionId || sending || !input.trim()
                  ? (isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(226, 232, 240, 0.5)')
                  : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                transform: !sessionId || sending || !input.trim() ? 'none' : 'translateY(-2px)',
                boxShadow: !sessionId || sending || !input.trim()
                  ? 'none'
                  : '0 12px 35px rgba(59, 130, 246, 0.4)'
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
                opacity: input.trim() && !sending ? 1 : 0,
                transform: 'translateX(100%) translateY(100%) rotate(45deg)'
              }
            }}
          >
            {sending ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              <SendIcon sx={{ fontSize: '1.25rem', zIndex: 1 }} />
            )}
          </Button>
        </Box>
      </Paper>

      {/* Add custom animations */}
      <style>{`
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </motion.div>
  );
};

export default ChatWindow;
