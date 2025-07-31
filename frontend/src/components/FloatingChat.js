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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const tooltipTimerRef = useRef(null);
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
      // Use a longer delay to ensure the chat window is fully rendered
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

  // Display the status badge
  const getStatusBadge = () => {
    if (serverError) {
      return (
        <Chip
          icon={<SignalWifiOffIcon fontSize="small" />}
          label="Error"
          size="small"
          sx={{ 
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            color: '#dc2626',
            fontWeight: 600,
            fontSize: '0.625rem',
            height: '20px',
            '& .MuiChip-icon': { color: '#dc2626', fontSize: '0.75rem' }
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
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)',
          border: '1px solid rgba(5, 150, 105, 0.3)',
          color: '#059669',
          fontWeight: 600,
          fontSize: '0.625rem',
          height: '20px',
          '& .MuiChip-icon': { color: '#059669', fontSize: '0.75rem' }
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
    } else {
      // Reset tooltip state when closing chat
      setShowTooltip(false);
      setIsHovered(false);
      // Clear any pending tooltip timer
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
        tooltipTimerRef.current = null;
      }
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    setShowTooltip(false);
    // Clear any existing timer
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
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
    }, 1300); // 300ms for shrink + 1000ms pause
  };

  // Don't render on mobile devices
  if (isMobile) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: isHovered ? 1.1 : (isAnimating ? 1 : [1, 1.1, 1]),
          opacity: 1,
          y: isHovered ? -8 : (isAnimating ? 0 : [0, -8, 0])
        }}
        transition={{ 
          delay: isHovered ? 0 : (isAnimating ? 0 : 1), 
          duration: 0.3,
          y: {
            duration: isHovered ? 0.3 : (isAnimating ? 0.3 : 2),
            repeat: isHovered ? 0 : (isAnimating ? 0 : Infinity),
            ease: "easeInOut"
          },
          scale: {
            duration: isHovered ? 0.3 : (isAnimating ? 0.3 : 2),
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

      {/* Mini Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ 
              duration: 0.25, 
              ease: [0.4, 0.0, 0.2, 1],
              opacity: { duration: 0.2 }
            }}
            style={{
              position: 'fixed',
              bottom: '100px',
              right: '20px',
              width: '400px',
              height: '500px',
              zIndex: 999,
              maxWidth: '400px'
            }}
          >
            <Paper
              elevation={8}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '20px',
                overflow: 'hidden',
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                backdropFilter: 'blur(20px)',
                border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
                position: 'relative'
              }}
            >
              {/* Header */}
              <Box 
                sx={{ 
                  py: 2,
                  px: 2,
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderBottom: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar
                    sx={{
                      background: 'none',
                      width: 32,
                      height: 32,
                      mr: 1.5,
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    <img 
                      src={isDarkMode ? '/logowhite.png' : '/Othain-logo2.png'}
                      alt="Othain Logo"
                      style={{ width: '70%', height: '70%', objectFit: 'contain' }}
                    />
                  </Avatar>
                  
                  <Box>
                    <Typography variant="subtitle2" sx={{ 
                      fontWeight: 700, 
                      color: isDarkMode ? '#f1f5f9' : '#1e293b',
                      fontSize: '0.875rem'
                    }}>
                      Othain Agent
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      fontWeight: 500,
                      fontSize: '0.625rem'
                    }}>
                      Ask me anything
                    </Typography>
                  </Box>
                </Box>
                
                {getStatusBadge()}
              </Box>

              {/* Messages Area */}
              <Box 
                sx={{ 
                  flexGrow: 1, 
                  overflow: 'auto',
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.3) 0%, rgba(30, 41, 59, 0.3) 100%)'
                    : 'linear-gradient(135deg, rgba(248, 250, 252, 0.3) 0%, rgba(241, 245, 249, 0.3) 100%)',
                  // Custom scrollbar
                  '&::-webkit-scrollbar': {
                    width: '4px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: isDarkMode 
                      ? 'rgba(75, 85, 99, 0.5)'
                      : 'rgba(203, 213, 225, 0.5)',
                    borderRadius: '10px',
                  }
                }}
              >
                {messages.length === 0 ? (
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      height: '100%',
                      p: 2,
                      textAlign: 'center'
                    }}
                  >
                    <Avatar sx={{
                      width: 48,
                      height: 48,
                      mx: 'auto',
                      mb: 2,
                      background: 'none',
                      boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)'
                    }}>
                      <img 
                        src={isDarkMode ? '/othainlogopreview.png' : '/OthainOcolor.png'}
                        alt="Othain Logo"
                        style={{ width: '70%', height: '70%', objectFit: 'contain' }}
                      />
                    </Avatar>
                    
                    <Typography variant="body2" sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      color: isDarkMode ? '#f1f5f9' : '#1e293b',
                      fontSize: '0.875rem'
                    }}>
                      Welcome to Othain ESS!
                    </Typography>
                    
                    <Typography variant="caption" sx={{ 
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      fontSize: '0.75rem',
                      maxWidth: '250px'
                    }}>
                      Ask about HR policies, benefits, IT support, or anything else.
                    </Typography>
                  </Box>
                ) : (
                  messages.map((message, index) => (
                    <Box
                      key={message.id || index}
                      sx={{
                        mb: 2,
                        display: 'flex',
                        justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: '80%',
                          p: 1.5,
                          borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: message.role === 'user'
                            ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                            : isDarkMode 
                              ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                          backdropFilter: 'blur(10px)',
                          border: message.role === 'user'
                            ? '1px solid rgba(59, 130, 246, 0.3)'
                            : isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          wordBreak: 'break-word'
                        }}
                      >
                        {message.role === 'user' ? (
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'white',
                              fontSize: '0.75rem',
                              lineHeight: 1.4,
                              fontWeight: 500
                            }}
                          >
                            {message.content}
                          </Typography>
                        ) : (
                          <Box sx={{ 
                            color: isDarkMode ? '#f1f5f9' : '#1e293b',
                            fontSize: '0.75rem',
                            lineHeight: 1.4,
                            fontWeight: 400,
                            '& h1, & h2, & h3, & h4, & h5, & h6': {
                              color: isDarkMode ? '#f1f5f9' : '#1e293b',
                              fontWeight: 600,
                              margin: '8px 0 4px 0',
                              fontSize: '0.875rem'
                            },
                            '& p': {
                              margin: '4px 0',
                              fontSize: '0.75rem'
                            },
                            '& ul, & ol': {
                              margin: '4px 0',
                              paddingLeft: '16px'
                            },
                            '& li': {
                              margin: '2px 0',
                              fontSize: '0.75rem'
                            },
                            '& strong, & b': {
                              fontWeight: 600,
                              color: isDarkMode ? '#f1f5f9' : '#1e293b'
                            },
                            '& em, & i': {
                              fontStyle: 'italic'
                            },
                            '& code': {
                              backgroundColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.5)',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontFamily: 'monospace'
                            },
                            '& pre': {
                              backgroundColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.5)',
                              padding: '8px',
                              borderRadius: '8px',
                              overflow: 'auto',
                              margin: '8px 0',
                              fontSize: '0.7rem'
                            },
                            '& blockquote': {
                              borderLeft: `3px solid ${isDarkMode ? '#6366f1' : '#3b82f6'}`,
                              paddingLeft: '8px',
                              margin: '8px 0',
                              fontStyle: 'italic',
                              color: isDarkMode ? '#94a3b8' : '#64748b'
                            }
                          }}>
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                // Custom components for better styling
                                p: ({ children }) => <Typography component="p" variant="body2" sx={{ margin: '4px 0', fontSize: '0.75rem' }}>{children}</Typography>,
                                strong: ({ children }) => <strong style={{ fontWeight: 600, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>{children}</strong>,
                                em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                                code: ({ children, className }) => {
                                  const isInline = !className;
                                  if (isInline) {
                                    return (
                                      <code style={{
                                        backgroundColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.5)',
                                        padding: '2px 4px',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        fontFamily: 'monospace'
                                      }}>
                                        {children}
                                      </code>
                                    );
                                  }
                                  return (
                                    <pre style={{
                                      backgroundColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.5)',
                                      padding: '8px',
                                      borderRadius: '8px',
                                      overflow: 'auto',
                                      margin: '8px 0',
                                      fontSize: '0.7rem'
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
                              <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                gap: 0.5,
                                mt: 1
                              }}>
                                {/* AI is thinking... section */}
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 0.5,
                                  fontSize: '0.625rem',
                                  fontStyle: 'italic',
                                  color: isDarkMode ? '#94a3b8' : '#64748b',
                                  fontWeight: 500
                                }}>
                                  <motion.div
                                    animate={{ 
                                      scale: [1, 1.2, 1],
                                      rotate: [0, 10, -10, 0]
                                    }}
                                    transition={{ 
                                      duration: 2, 
                                      repeat: Infinity, 
                                      ease: "easeInOut" 
                                    }}
                                    style={{ fontSize: '0.75rem' }}
                                  >
                                    ✨
                                  </motion.div>
                                  <motion.div
                                    animate={{ 
                                      scale: [1, 1.1, 1],
                                      rotate: [0, -5, 5, 0]
                                    }}
                                    transition={{ 
                                      duration: 1.5, 
                                      repeat: Infinity, 
                                      ease: "easeInOut",
                                      delay: 0.5
                                    }}
                                    style={{ fontSize: '0.625rem' }}
                                  >
                                    ✨
                                  </motion.div>
                                  
                                </Box>
                                
                                {/* Thinking button */}
                                <motion.div
                                  animate={{ 
                                    scale: [1, 1.05, 1],
                                    y: [0, -2, 0]
                                  }}
                                  transition={{ 
                                    duration: 1.5, 
                                    repeat: Infinity, 
                                    ease: "easeInOut" 
                                  }}
                                >
                                  <Box sx={{ 
                                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                    color: '#92400e',
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: '12px',
                                    fontSize: '0.625rem',
                                    fontWeight: 600,
                                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    alignSelf: 'flex-start'
                                  }}>
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                      <CircularProgress size={8} sx={{ color: 'inherit' }} />
                                    </motion.div>
                                    Thinking...
                                  </Box>
                                </motion.div>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  ))
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Input Area */}
              <Box 
                component="form" 
                onSubmit={handleSubmit}
                sx={{
                  p: 2,
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderTop: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
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
                  size="small"
                  inputRef={inputRef}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '16px',
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                      backdropFilter: 'blur(10px)',
                      fontSize: '0.75rem',
                      border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                      '&:hover': {
                        borderColor: '#6366f1'
                      },
                      '&.Mui-focused': {
                        borderColor: '#6366f1'
                      }
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none'
                    },
                    '& .MuiInputBase-input': {
                      color: isDarkMode ? '#f1f5f9' : '#1e293b',
                      fontSize: '0.75rem',
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
                  size="small"
                  sx={{
                    borderRadius: '12px',
                    minWidth: '40px',
                    height: '40px',
                    background: !sessionId || sending || !input.trim()
                      ? (isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(226, 232, 240, 0.5)')
                      : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    color: 'white',
                    boxShadow: !sessionId || sending || !input.trim()
                      ? 'none'
                      : '0 4px 12px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: !sessionId || sending || !input.trim()
                        ? (isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(226, 232, 240, 0.5)')
                        : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                      transform: !sessionId || sending || !input.trim() ? 'none' : 'translateY(-1px)',
                      boxShadow: !sessionId || sending || !input.trim()
                        ? 'none'
                        : '0 6px 20px rgba(59, 130, 246, 0.4)'
                    }
                  }}
                >
                  {sending ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SendIcon sx={{ fontSize: '1rem' }} />
                  )}
                </Button>
              </Box>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingChat; 