import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Fade,
  Slide,
  Avatar,
  Chip,
  useTheme,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import { 
  Send as SendIcon,
  Close as CloseIcon,
  SmartToy as BotIcon,
  CheckCircle as OnlineCheckIcon,
  SignalWifiOff as SignalWifiOffIcon
} from '@mui/icons-material';
import { useDarkMode } from '../contexts/DarkModeContext';
import { chatApi } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [serverError, setServerError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [autoAttentionMode, setAutoAttentionMode] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const tooltipTimerRef = useRef(null);
  const autoAttentionTimerRef = useRef(null);
  const { isDarkMode } = useDarkMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const currentAssistantMessageId = useRef(null);
  const bufferedContentRef = useRef('');
  const updateTimerRef = useRef(null);
  const isFirstChunkRef = useRef(true);

  // Create session when chat is opened
  useEffect(() => {
    if (isOpen && !sessionId) {
      const createSession = async () => {
        try {
          const newSession = await chatApi.createSession();
          if (newSession && newSession.id) {
            setSessionId(newSession.id);
          }
        } catch (error) {
          console.error('Error creating chat session:', error);
          setError('Failed to start chat session');
        }
      };
      createSession();
    }
  }, [isOpen, sessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input field when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

  // Handle sending a message
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
    
    // Add user message 
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Add placeholder
    const assistantMessageId = `assistant-${Date.now()}`;
    currentAssistantMessageId.current = assistantMessageId;
    const placeholderMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      isLoading: true 
    };
    setMessages(prev => [...prev, placeholderMessage]);
    
    try {
      await chatApi.sendMessage(sessionId, messageText, (chunk) => {
        if (chunk === null) {
          // Stream finished
          if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
          updateTimerRef.current = null;
          applyBufferedUpdate();
          
          setMessages(prev => {
            const finalMsg = prev.find(m => m.id === assistantMessageId);
            if (finalMsg && finalMsg.content.trim() === '') {
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // Auto-attention mechanism - show hover and tooltip every 30 seconds
  useEffect(() => {
    if (!isOpen) {
      // Start auto-attention timer when chat is closed
      autoAttentionTimerRef.current = setInterval(() => {
        // Only trigger if chat is still closed and not already in auto-attention mode
        if (!isOpen && !autoAttentionMode) {
          setAutoAttentionMode(true);
          setIsHovered(true);
          setShowTooltip(true);
          
          // Keep the attention for 3 seconds, then hide everything smoothly
          const hideTimeout = setTimeout(() => {
            // Use the same smooth transition as manual hover
            setShowTooltip(false);
            setIsHovered(false);
            setIsAnimating(true);
            setAutoAttentionMode(false);
            
            // Wait for shrink animation to complete, then stop animating
            setTimeout(() => {
              setIsAnimating(false);
            }, 1300); // 300ms for shrink + 1000ms pause
          }, 3000);
          
          // Store the timeout reference for cleanup
          if (tooltipTimerRef.current) {
            clearTimeout(tooltipTimerRef.current);
          }
          tooltipTimerRef.current = hideTimeout;
        }
      }, 30000); // Every 30 seconds
    } else {
      // Clear auto-attention timer when chat is open
      if (autoAttentionTimerRef.current) {
        clearInterval(autoAttentionTimerRef.current);
        autoAttentionTimerRef.current = null;
      }
      // Also clear any pending hide timeout
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
        tooltipTimerRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (autoAttentionTimerRef.current) {
        clearInterval(autoAttentionTimerRef.current);
        autoAttentionTimerRef.current = null;
      }
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
        tooltipTimerRef.current = null;
      }
    };
  }, [isOpen, autoAttentionMode]);

  // Display the status badge
  const getStatusBadge = () => {
    if (serverError) {
      return (
        <Chip
          icon={<SignalWifiOffIcon fontSize="small" />}
          label="Error"
          size="small"
          sx={{ 
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            fontWeight: 600,
            fontSize: '0.7rem',
            height: '24px',
            '& .MuiChip-icon': { color: '#ef4444', fontSize: '0.8rem' },
            transition: 'all 0.3s ease'
          }}
        />
      );
    }
    return (
      <Chip
        icon={<OnlineCheckIcon fontSize="small" />}
        label="Online"
        size="small"
        sx={{ 
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          color: '#22c55e',
          fontWeight: 600,
          fontSize: '0.7rem',
          height: '24px',
          '& .MuiChip-icon': { color: '#22c55e', fontSize: '0.8rem' },
          transition: 'all 0.3s ease'
        }}
      />
    );
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setMessages([]);
      setError(null);
      setServerError(false);
      // Clear auto-attention when opening chat
      setAutoAttentionMode(false);
      setIsHovered(false);
      setShowTooltip(false);
    } else {
      // Reset tooltip state when closing chat
      setShowTooltip(false);
      setIsHovered(false);
      setAutoAttentionMode(false);
      // Clear any pending tooltip timer
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
        tooltipTimerRef.current = null;
      }
    }
  };

  const handleMouseEnter = () => {
    // Clear auto-attention state immediately
    setAutoAttentionMode(false);
    setIsHovered(true);
    setShowTooltip(false);
    
    // Clear any existing auto-attention timers
    if (autoAttentionTimerRef.current) {
      clearInterval(autoAttentionTimerRef.current);
      autoAttentionTimerRef.current = null;
    }
    
    // Clear any existing tooltip timer
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    
    // Show tooltip after icon has fully grown
    tooltipTimerRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 300); // Wait for growth animation to complete
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowTooltip(false);
    setIsAnimating(true);
    
    // Clear the tooltip timer
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    
    // Wait for shrink animation to complete, then pause for 1 second before resuming pulsing
    setTimeout(() => {
      setIsAnimating(false);
      
      // Restart auto-attention timer after user stops hovering (only if chat is closed)
      if (!isOpen && !autoAttentionTimerRef.current) {
        autoAttentionTimerRef.current = setInterval(() => {
          if (!isOpen && !autoAttentionMode) {
            setAutoAttentionMode(true);
            setIsHovered(true);
            setShowTooltip(true);
            
            // Keep the attention for 3 seconds, then hide everything smoothly
            const hideTimeout = setTimeout(() => {
              // Use the same smooth transition as manual hover
              setShowTooltip(false);
              setIsHovered(false);
              setIsAnimating(true);
              setAutoAttentionMode(false);
              
              // Wait for shrink animation to complete, then stop animating
              setTimeout(() => {
                setIsAnimating(false);
              }, 1300); // 300ms for shrink + 1000ms pause
            }, 3000);
            
            if (tooltipTimerRef.current) {
              clearTimeout(tooltipTimerRef.current);
            }
            tooltipTimerRef.current = hideTimeout;
          }
        }, 30000); // Every 30 seconds
      }
    }, 1300); // 300ms for shrink + 1000ms pause
  };

  // Safety check: ensure tooltip is hidden if auto-attention is off
  useEffect(() => {
    if (!autoAttentionMode && !isHovered) {
      setShowTooltip(false);
    }
  }, [autoAttentionMode, isHovered]);

  // Additional safety: force hide tooltip after 5 seconds if auto-attention is active
  useEffect(() => {
    if (autoAttentionMode && showTooltip) {
      const safetyTimeout = setTimeout(() => {
        // Use the same smooth transition as manual hover
        setShowTooltip(false);
        setIsHovered(false);
        setIsAnimating(true);
        setAutoAttentionMode(false);
        
        // Wait for shrink animation to complete, then stop animating
        setTimeout(() => {
          setIsAnimating(false);
        }, 1300); // 300ms for shrink + 1000ms pause
      }, 5000); // 5 second safety timeout

      return () => clearTimeout(safetyTimeout);
    }
  }, [autoAttentionMode, showTooltip]);

  // Don't render on mobile devices
  if (isMobile) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button - UNCHANGED */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: isHovered ? 1.1 : (isAnimating ? 1 : [1, 1.1, 1]),
          opacity: 1,
          y: isHovered ? -8 : (isAnimating ? 0 : [0, -8, 0])
        }}
        transition={{ 
          delay: isHovered ? 0 : (isAnimating ? 0 : 4.5), 
          duration: 1.2,
          y: {
            duration: isHovered ? 0.4 : (isAnimating ? 0.4 : 3),
            repeat: isHovered ? 0 : (isAnimating ? 0 : Infinity),
            ease: "easeInOut"
          },
          scale: {
            duration: isHovered ? 0.4 : (isAnimating ? 0.4 : 3),
            repeat: isHovered ? 0 : (isAnimating ? 0 : Infinity),
            ease: "easeInOut"
          }
        }}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000
        }}
      >
        <Tooltip
          title={
            <Box sx={{ textAlign: 'left', paddingRight: '10px', paddingLeft: '10px' }}>
              <Typography variant="body1" sx={{ 
                fontWeight: 700, 
                color: 'white', 
                mb: 2, 
                fontSize: '1rem',
                lineHeight: 0.4,
                paddingTop: '18px'
              }}>
                Othain AI
              </Typography>
              <Typography variant="body2" sx={{ 
                color: 'rgba(255, 255, 255, 0.9)', 
                fontSize: '0.875rem',
                lineHeight: 1.5,
                paddingBottom: '10px'
              }}>
                Ask, search, or get help
              </Typography>
            </Box>
          }
          placement="top-start"
          arrow
          open={showTooltip && !isOpen}
          onClose={() => setShowTooltip(false)}
          enterDelay={0}
          sx={{
            '& .MuiTooltip-tooltip': {
              background: 'rgba(0, 0, 0, 0.9)',
              borderRadius: '12px',
              padding: '20px 24px',
              fontSize: '0.875rem',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
              minWidth: '200px'
            },
            '& .MuiTooltip-arrow': {
              color: 'rgba(0, 0, 0, 0.9)'
            }
          }}
        >
          <IconButton
            onClick={toggleChat}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            sx={{
              width: 60,
              height: 60,
              background: 'white',
              color: 'white',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              padding: 0,
              '&:hover': {
                background: 'white',
                transform: 'translateY(-2px) scale(1.05)',
                boxShadow: '0 12px 35px rgba(0, 0, 0, 0.2)'
              }
            }}
          >
            {isOpen ? (
              <CloseIcon sx={{ color: '#1e293b' }} />
            ) : (
              <img 
                src="/OthainOcolor.png"
                alt="Othain Logo"
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  objectFit: 'contain'
                }} 
              />
            )}
          </IconButton>
        </Tooltip>
      </motion.div>

      {/* Modern Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: '100%', opacity: 0, scale: 0.9 }}
            transition={{ 
              duration: 0.25, 
              ease: [0.25, 0.1, 0.25, 1]
            }}
            style={{
              position: 'fixed',
              bottom: '100px',
              right: '20px',
              width: '420px',
              height: '600px',
              zIndex: 999,
              maxWidth: '420px'
            }}
          >
            <Paper
              elevation={0}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '24px',
                overflow: 'hidden',
                background: isDarkMode 
                  ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 50%, rgba(51, 65, 85, 0.98) 100%)'
                  : 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(24px)',
                border: isDarkMode 
                  ? '1px solid rgba(71, 85, 105, 0.3)' 
                  : '1px solid rgba(226, 232, 240, 0.4)',
                boxShadow: isDarkMode
                  ? '0 32px 64px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(71, 85, 105, 0.1)'
                  : '0 32px 64px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(226, 232, 240, 0.3)',
                position: 'relative'
              }}
            >
              {/* Modern Header */}
              <Box 
                sx={{ 
                  py: 3,
                  px: 3,
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(71, 85, 105, 0.4) 0%, rgba(51, 65, 85, 0.4) 100%)'
                    : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(16px)',
                  borderBottom: isDarkMode 
                    ? '1px solid rgba(71, 85, 105, 0.2)' 
                    : '1px solid rgba(226, 232, 240, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative'
                }}
              >
                {/* Subtle animated background */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(45deg, 
                      ${isDarkMode ? 'rgba(99, 102, 241, 0.03)' : 'rgba(99, 102, 241, 0.02)'} 0%, 
                      transparent 25%, 
                      transparent 75%, 
                      ${isDarkMode ? 'rgba(139, 92, 246, 0.03)' : 'rgba(139, 92, 246, 0.02)'} 100%)`,
                    animation: 'subtle-flow 8s ease-in-out infinite',
                    '@keyframes subtle-flow': {
                      '0%, 100%': { opacity: 0.3 },
                      '50%': { opacity: 0.6 }
                    }
                  }}
                />
                
                <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.5, ease: "backOut" }}
                  >
                    <Avatar
                      sx={{
                        background: isDarkMode ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255, 255, 255, 0.9)',
                        width: 40,
                        height: 40,
                        mr: 2,
                        boxShadow: isDarkMode ? '0 8px 24px rgba(102, 126, 234, 0.3)' : '0 8px 24px rgba(0, 0, 0, 0.1)',
                        border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid rgba(226, 232, 240, 0.3)'
                      }}
                    >
                      <img 
                        src={isDarkMode ? '/logowhite.png' : '/Othain-logo2.png'}
                        alt="Othain Logo"
                        style={{ width: '70%', height: '70%', objectFit: 'contain' }}
                      />
                    </Avatar>
                  </motion.div>
                  
                  <Box>
                    <motion.div
                      initial={{ x: -15, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.15, duration: 0.3 }}
                    >
                      <Typography variant="h6" sx={{ 
                        fontWeight: 700, 
                        color: isDarkMode ? '#f1f5f9' : '#1e293b',
                        fontSize: '1rem',
                        letterSpacing: '-0.025em'
                      }}>
                        Othain Agent
                      </Typography>
                    </motion.div>
                    <motion.div
                      initial={{ x: -15, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      <Typography variant="body2" sx={{ 
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        fontWeight: 500,
                        fontSize: '0.75rem'
                      }}>
                        Ask me anything
                      </Typography>
                    </motion.div>
                  </Box>
                </Box>
                
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.25 }}
                >
                  {getStatusBadge()}
                </motion.div>
              </Box>

              {/* Enhanced Messages Area */}
              <Box 
                sx={{ 
                  flexGrow: 1, 
                  overflow: 'auto',
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  background: isDarkMode 
                    ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.2) 0%, rgba(30, 41, 59, 0.2) 100%)'
                    : 'rgba(255, 255, 255, 0.5)',
                  position: 'relative',
                  // Modern scrollbar
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: isDarkMode 
                      ? 'linear-gradient(to bottom, rgba(71, 85, 105, 0.4), rgba(51, 65, 85, 0.4))'
                      : 'linear-gradient(to bottom, rgba(203, 213, 225, 0.4), rgba(148, 163, 184, 0.4))',
                    borderRadius: '10px',
                    '&:hover': {
                      background: isDarkMode 
                        ? 'linear-gradient(to bottom, rgba(71, 85, 105, 0.6), rgba(51, 65, 85, 0.6))'
                        : 'linear-gradient(to bottom, rgba(203, 213, 225, 0.6), rgba(148, 163, 184, 0.6))'
                    }
                  }
                }}
              >
                {messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                  >
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        height: '100%',
                        p: 3,
                        textAlign: 'center'
                      }}
                    >
                      <motion.div
                        animate={{ 
                          y: [0, -8, 0],
                          scale: [1, 1.05, 1]
                        }}
                        transition={{ 
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Avatar sx={{
                          width: 64,
                          height: 64,
                          mx: 'auto',
                          mb: 3,
                          background: isDarkMode ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255, 255, 255, 0.9)',
                          boxShadow: isDarkMode ? '0 16px 32px rgba(102, 126, 234, 0.3)' : '0 16px 32px rgba(0, 0, 0, 0.1)',
                          border: isDarkMode ? '3px solid rgba(255, 255, 255, 0.1)' : '3px solid rgba(226, 232, 240, 0.3)'
                        }}>
                          <img 
                            src={isDarkMode ? '/othainlogopreview.png' : '/OthainOcolor.png'}
                            alt="Othain Logo"
                            style={{ width: '70%', height: '70%', objectFit: 'contain' }}
                          />
                        </Avatar>
                      </motion.div>
                      
                      <Typography variant="h5" sx={{ 
                        mb: 2, 
                        fontWeight: 700,
                        color: isDarkMode ? '#f1f5f9' : '#1e293b',
                        fontSize: '1.25rem',
                        letterSpacing: '-0.025em'
                      }}>
                        Welcome to Othain ESS!
                      </Typography>
                      
                      <Typography variant="body1" sx={{ 
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        fontSize: '0.9rem',
                        maxWidth: '280px',
                        lineHeight: 1.6,
                        mb: 3
                      }}>
                        Ask about HR policies, benefits, IT support, or anything else. I'm here to help!
                      </Typography>

                      {/* Quick action suggestions */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                        {['HR Policy', 'Benefits', 'IT Support'].map((suggestion, index) => (
                          <motion.div
                            key={suggestion}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + index * 0.05, duration: 0.2 }}
                          >
                            <Chip
                              label={suggestion}
                              size="small"
                              onClick={() => setInput(`Tell me about ${suggestion.toLowerCase()}`)}
                              sx={{
                                background: isDarkMode 
                                  ? 'linear-gradient(135deg, rgba(71, 85, 105, 0.3) 0%, rgba(51, 65, 85, 0.3) 100%)'
                                  : 'rgba(255, 255, 255, 0.8)',
                                color: isDarkMode ? '#e2e8f0' : '#475569',
                                border: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.4)' : 'rgba(226, 232, 240, 0.4)'}`,
                                fontWeight: 500,
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  background: isDarkMode 
                                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'
                                    : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                                  transform: 'translateY(-1px)',
                                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                }
                              }}
                            />
                          </motion.div>
                        ))}
                      </Box>
                    </Box>
                  </motion.div>
                ) : (
                  messages.map((message, index) => (
                    <motion.div
                      key={message.id || index}
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <Box
                        sx={{
                          mb: 3,
                          display: 'flex',
                          justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: '85%',
                            p: 2.5,
                            borderRadius: message.role === 'user' ? '20px 20px 8px 20px' : '20px 20px 20px 8px',
                            background: message.role === 'user'
                              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              : isDarkMode 
                                ? 'linear-gradient(135deg, rgba(71, 85, 105, 0.4) 0%, rgba(51, 65, 85, 0.4) 100%)'
                                : 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(16px)',
                            border: message.role === 'user'
                              ? '1px solid rgba(102, 126, 234, 0.3)'
                              : isDarkMode ? '1px solid rgba(71, 85, 105, 0.3)' : '1px solid rgba(226, 232, 240, 0.4)',
                            boxShadow: message.role === 'user'
                              ? '0 8px 24px rgba(102, 126, 234, 0.2)'
                              : '0 8px 24px rgba(0, 0, 0, 0.08)',
                            wordBreak: 'break-word',
                            position: 'relative'
                          }}
                        >
                          {message.role === 'user' ? (
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'white',
                                fontSize: '0.875rem',
                                lineHeight: 1.5,
                                fontWeight: 500
                              }}
                            >
                              {message.content}
                            </Typography>
                          ) : (
                            <Box sx={{ 
                              color: isDarkMode ? '#f1f5f9' : '#1e293b',
                              fontSize: '0.875rem',
                              lineHeight: 1.6,
                              fontWeight: 400,
                              '& h1, & h2, & h3, & h4, & h5, & h6': {
                                color: isDarkMode ? '#f1f5f9' : '#1e293b',
                                fontWeight: 600,
                                margin: '12px 0 8px 0',
                                fontSize: '1rem'
                              },
                              '& p': {
                                margin: '8px 0',
                                fontSize: '0.875rem'
                              },
                              '& ul, & ol': {
                                margin: '8px 0',
                                paddingLeft: '20px'
                              },
                              '& li': {
                                margin: '4px 0',
                                fontSize: '0.875rem'
                              },
                              '& strong, & b': {
                                fontWeight: 600,
                                color: isDarkMode ? '#f1f5f9' : '#1e293b'
                              },
                              '& em, & i': {
                                fontStyle: 'italic'
                              },
                              '& code': {
                                backgroundColor: isDarkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.6)',
                                padding: '3px 6px',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontFamily: 'Monaco, Consolas, monospace',
                                border: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.4)'}`
                              },
                              '& pre': {
                                backgroundColor: isDarkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.6)',
                                padding: '12px',
                                borderRadius: '12px',
                                overflow: 'auto',
                                margin: '12px 0',
                                fontSize: '0.8rem',
                                border: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.4)'}`
                              },
                              '& blockquote': {
                                borderLeft: `4px solid ${isDarkMode ? '#667eea' : '#3b82f6'}`,
                                paddingLeft: '12px',
                                margin: '12px 0',
                                fontStyle: 'italic',
                                color: isDarkMode ? '#94a3b8' : '#64748b',
                                background: isDarkMode ? 'rgba(51, 65, 85, 0.2)' : 'rgba(248, 250, 252, 0.5)',
                                borderRadius: '0 8px 8px 0',
                                padding: '8px 12px'
                              }
                            }}>
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({ children }) => <Typography component="p" variant="body2" sx={{ margin: '8px 0', fontSize: '0.875rem', lineHeight: 1.6 }}>{children}</Typography>,
                                  strong: ({ children }) => <strong style={{ fontWeight: 600, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>{children}</strong>,
                                  em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                                  code: ({ children, className }) => {
                                    const isInline = !className;
                                    if (isInline) {
                                      return (
                                        <code style={{
                                          backgroundColor: isDarkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.6)',
                                          padding: '3px 6px',
                                          borderRadius: '6px',
                                          fontSize: '0.8rem',
                                          fontFamily: 'Monaco, Consolas, monospace',
                                          border: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.4)'}`
                                        }}>
                                          {children}
                                        </code>
                                      );
                                    }
                                    return (
                                      <pre style={{
                                        backgroundColor: isDarkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.6)',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        overflow: 'auto',
                                        margin: '12px 0',
                                        fontSize: '0.8rem',
                                        border: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.4)'}`
                                      }}>
                                        <code>{children}</code>
                                      </pre>
                                    );
                                  }
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                              {message.isLoading && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <Box sx={{ 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    gap: 1.5,
                                    mt: 2
                                  }}>
                                    {/* Enhanced AI thinking section */}
                                    <Box sx={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 1,
                                      fontSize: '0.75rem',
                                      fontStyle: 'italic',
                                      color: isDarkMode ? '#94a3b8' : '#64748b',
                                      fontWeight: 500
                                    }}>
                                      <motion.div
                                        animate={{ 
                                          scale: [1, 1.3, 1],
                                          rotate: [0, 15, -15, 0]
                                        }}
                                        transition={{ 
                                          duration: 2.5, 
                                          repeat: Infinity, 
                                          ease: "easeInOut" 
                                        }}
                                        style={{ fontSize: '1rem' }}
                                      >
                                        ✨
                                      </motion.div>
                                      <motion.div
                                        animate={{ 
                                          scale: [1, 1.2, 1],
                                          rotate: [0, -10, 10, 0]
                                        }}
                                        transition={{ 
                                          duration: 2, 
                                          repeat: Infinity, 
                                          ease: "easeInOut",
                                          delay: 0.5
                                        }}
                                        style={{ fontSize: '0.8rem' }}
                                      >
                                        ✨
                                      </motion.div>
                                      <motion.div
                                        animate={{ 
                                          scale: [1, 1.1, 1],
                                          rotate: [0, 8, -8, 0]
                                        }}
                                        transition={{ 
                                          duration: 1.8, 
                                          repeat: Infinity, 
                                          ease: "easeInOut",
                                          delay: 1
                                        }}
                                        style={{ fontSize: '0.7rem' }}
                                      >
                                        ✨
                                      </motion.div>
                                    </Box>
                                    
                                    {/* Enhanced thinking indicator */}
                                    <motion.div
                                      animate={{ 
                                        scale: [1, 1.02, 1],
                                        y: [0, -1, 0]
                                      }}
                                      transition={{ 
                                        duration: 2, 
                                        repeat: Infinity, 
                                        ease: "easeInOut" 
                                      }}
                                    >
                                      <Box sx={{ 
                                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                        color: '#92400e',
                                        px: 2,
                                        py: 1,
                                        borderRadius: '16px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        alignSelf: 'flex-start',
                                        border: '1px solid rgba(245, 158, 11, 0.2)',
                                        backdropFilter: 'blur(8px)'
                                      }}>
                                        <motion.div
                                          animate={{ rotate: 360 }}
                                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                        >
                                          <CircularProgress size={12} sx={{ color: 'inherit' }} />
                                        </motion.div>
                                        AI is thinking...
                                      </Box>
                                    </motion.div>
                                  </Box>
                                </motion.div>
                              )}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Enhanced Input Area */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <Box 
                  component="form" 
                  onSubmit={handleSubmit}
                  sx={{
                    p: 3,
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, rgba(71, 85, 105, 0.4) 0%, rgba(51, 65, 85, 0.4) 100%)'
                      : 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(16px)',
                    borderTop: isDarkMode 
                      ? '1px solid rgba(71, 85, 105, 0.3)' 
                      : '1px solid rgba(226, 232, 240, 0.3)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 2
                  }}
                >
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Type your message..."
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
                    inputRef={inputRef}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '20px',
                        background: isDarkMode 
                          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(51, 65, 85, 0.6) 100%)'
                          : 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(12px)',
                        fontSize: '0.875rem',
                        border: isDarkMode 
                          ? '1px solid rgba(71, 85, 105, 0.4)' 
                          : '1px solid rgba(226, 232, 240, 0.4)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: '#667eea',
                          boxShadow: '0 4px 16px rgba(102, 126, 234, 0.1)'
                        },
                        '&.Mui-focused': {
                          borderColor: '#667eea',
                          boxShadow: '0 4px 16px rgba(102, 126, 234, 0.2)'
                        }
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        border: 'none'
                      },
                      '& .MuiInputBase-input': {
                        color: isDarkMode ? '#f1f5f9' : '#1e293b',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                        '&::placeholder': {
                          color: isDarkMode ? '#94a3b8' : '#64748b',
                          opacity: 1
                        }
                      }
                    }}
                  />
                  
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={!sessionId || sending || !input.trim()}
                      sx={{
                        borderRadius: '16px',
                        minWidth: '48px',
                        height: '48px',
                        background: !sessionId || sending || !input.trim()
                          ? (isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.3)')
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        boxShadow: !sessionId || sending || !input.trim()
                          ? 'none'
                          : '0 8px 24px rgba(102, 126, 234, 0.3)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          background: !sessionId || sending || !input.trim()
                            ? (isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.3)')
                            : 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                          transform: !sessionId || sending || !input.trim() ? 'none' : 'translateY(-2px)',
                          boxShadow: !sessionId || sending || !input.trim()
                            ? 'none'
                            : '0 12px 32px rgba(102, 126, 234, 0.4)'
                        },
                        '&:disabled': {
                          color: isDarkMode ? 'rgba(148, 163, 184, 0.5)' : 'rgba(100, 116, 139, 0.5)'
                        }
                      }}
                    >
                      {sending ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <CircularProgress size={20} color="inherit" />
                        </motion.div>
                      ) : (
                        <SendIcon sx={{ fontSize: '1.25rem' }} />
                      )}
                    </Button>
                  </motion.div>
                </Box>
              </motion.div>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingChat;