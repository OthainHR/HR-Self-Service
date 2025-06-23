import React, { useState } from 'react';
import { Paper, Typography, Box, Avatar, Tooltip, Zoom, useTheme, CircularProgress, IconButton, Button } from '@mui/material';
import { Person as PersonIcon, SmartToy as BotIcon, ThumbUpAltOutlined as ThumbUpIcon, ThumbDownAltOutlined as ThumbDownIcon, CheckCircleOutline as CheckCircleIcon, AutoAwesome as AIIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDarkMode } from '../contexts/DarkModeContext';
import { supabase } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Message component for displaying chat messages
function MessageItem({ message, isLast, isMobile }) {
  const theme = useTheme();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();

  // Optimize animation timing for streaming messages
  const isStreamingMessage = message.isLoading || (message.role === 'assistant' && isLast);
  const animationDuration = isStreamingMessage ? 0.1 : 0.3; // Much faster for streaming

  // Custom link renderer inside MessageItem to handle internal navigation only
  const ticketUrl = '/tickets';
  const handleTicketButtonClick = () => navigate('/tickets');
  const showTicketButton = !message.isLoading && (
    message.content.includes('Ticket type:') || message.content.includes('Create a ticket')
  );
  
  // Cab booking button logic
  const cabUrl = '/cab-service';
  const handleCabBookingClick = () => navigate('/cab-service');
  const showCabButton = !message.isLoading && (
    message.content.toLowerCase().includes('book a cab') || 
    message.content.toLowerCase().includes('request a cab') ||
    message.content.toLowerCase().includes('booking a cab') ||
    message.content.toLowerCase().includes('cab booking') ||
    message.content.toLowerCase().includes('book cab') ||
    message.content.toLowerCase().includes('transportation') ||
    message.content.toLowerCase().includes('cab service') ||
    message.content.toLowerCase().includes('pickup') ||
    message.content.toLowerCase().includes('drop off') ||
    message.content.toLowerCase().includes('drop-off') ||
    message.content.toLowerCase().includes('late night shift') ||
    message.content.toLowerCase().includes('night shift') ||
    message.content.toLowerCase().includes('othain cab service')
  );
  
  const LinkRenderer = ({ href, children }) => {
    // Block all external Atlassian URLs completely
    if (href && href.includes('atlassian.net')) {
      return null; // Don't render any Atlassian links
    }
    
    // Only handle internal ticket URLs
    if (href === ticketUrl || href === '/tickets' || `${children}` === ticketUrl) {
      // Hide raw ticket link when the ticket button is rendered
      if (showTicketButton) {
        return null;
      }
      // Render as internal navigation button instead of external link
      return (
        <button
          onClick={handleTicketButtonClick}
          style={{
            color: '#3b82f6',
            background: 'rgba(59, 130, 246, 0.1)',
            border: 'none',
            borderRadius: '6px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 'inherit',
            textDecoration: 'none',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(59, 130, 246, 0.2)';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(59, 130, 246, 0.1)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          Create A Ticket
        </button>
      );
    }

    // Handle internal cab booking URLs
    if (href === cabUrl || href === '/cab-service' || `${children}` === cabUrl) {
      // Hide raw cab link when the cab button is rendered
      if (showCabButton) {
        return null;
      }
      // Render as internal navigation button instead of external link
      return (
        <button
          onClick={handleCabBookingClick}
          style={{
            color: '#dc2626',
            background: 'rgba(220, 38, 38, 0.1)',
            border: 'none',
            borderRadius: '6px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 'inherit',
            textDecoration: 'none',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(220, 38, 38, 0.2)';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(220, 38, 38, 0.1)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          🚗 Book A Cab
        </button>
      );
    }
    
    // For any other links, render as a standard anchor tag opening in a new tab
    return (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          color: isDarkMode ? '#93c5fd' : '#3b82f6', // Brighter blue for dark mode
        fontWeight: 500,
          textDecoration: 'underline',
          cursor: 'pointer',
          padding: '1px 2px',
          borderRadius: '3px',
          transition: 'background-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = isDarkMode ? 'rgba(147, 197, 253, 0.1)' : 'rgba(59, 130, 246, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
        }}
      >
        {children}
      </a>
    );
  };
  const isUser = message.role === 'user';
  const isLoading = !isUser && message.isLoading === true;
  const isError = !isUser && message.isError === true;
  const isLongWait = !isUser && message.isLongWait === true;
  
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);

  const handleFeedback = async (feedbackType) => {
    if (!message.id || feedbackSubmitted || isSubmittingFeedback) {
      return;
    }
    setIsSubmittingFeedback(true);
    setFeedbackError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error(sessionError?.message || 'User not authenticated. Please log in.');
      }

      const apiUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${apiUrl}/api/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message_id: message.id,
          feedback_type: feedbackType,
          message_content: message.content,
        }),
      });

      if (!response.ok) {
        let errorMsg;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || `Failed to submit feedback. Status: ${response.status}`;
        } catch (parseErr) {
          const text = await response.text();
          errorMsg = text || `Failed to submit feedback. Status: ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      setFeedbackSubmitted(feedbackType);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setFeedbackError(error.message || 'Could not submit feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: animationDuration, ease: "easeOut" }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          mb: 2.5,
          maxWidth: '100%',
          position: 'relative'
        }}
      >
        {!isUser && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: isStreamingMessage ? 0.02 : 0.1, type: "spring", stiffness: 200 }}
          >
            <Tooltip 
              title={isLoading ? "AI is thinking..." : 
                     isError ? "Error occurred" : 
                     "Othain ESS Assistant"}
              TransitionComponent={Zoom}
              arrow
              placement="top-start"
            >
              <Avatar 
                sx={{ 
                  background: isLoading 
                    ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
                    : isError 
                      ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  mr: 2,
                  width: 40,
                  height: 40,
                  boxShadow: isLoading 
                    ? '0 8px 25px rgba(245, 158, 11, 0.3)'
                    : isError 
                      ? '0 8px 25px rgba(220, 38, 38, 0.3)'
                      : '0 8px 25px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: isLoading 
                      ? '0 12px 35px rgba(245, 158, 11, 0.4)'
                      : isError 
                        ? '0 12px 35px rgba(220, 38, 38, 0.4)'
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
                    animation: isLoading ? 'shimmer 2s ease-in-out infinite' : 'none'
                  }
                }}
              >
                {isLoading ? (
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                ) : (
                  <AIIcon sx={{ fontSize: '1.25rem', color: 'white', zIndex: 1 }} />
                )}
              </Avatar>
            </Tooltip>
          </motion.div>
        )}
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: isStreamingMessage ? 0.05 : 0.15, duration: animationDuration }}
          style={{ maxWidth: isMobile ? '85%' : '70%' }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '20px',
              background: isUser
                ? isDarkMode 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(139, 92, 246, 0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(139, 92, 246, 0.9) 100%)'
                : isLoading
                  ? isDarkMode
                    ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)'
                  : isError
                    ? isDarkMode
                      ? 'linear-gradient(135deg, rgba(127, 29, 29, 0.8) 0%, rgba(153, 27, 27, 0.8) 100%)'
                      : 'linear-gradient(135deg, rgba(254, 242, 242, 0.9) 0%, rgba(254, 226, 226, 0.9) 100%)'
                    : isDarkMode
                      ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
              backdropFilter: 'blur(20px)',
              border: isUser
                ? '1px solid rgba(255, 255, 255, 0.2)'
                : isLoading
                  ? isDarkMode ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                  : isError
                    ? '1px solid rgba(220, 38, 38, 0.3)'
                    : isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
              boxShadow: isUser
                ? '0 15px 35px rgba(59, 130, 246, 0.2)'
                : isLoading
                  ? '0 10px 30px rgba(245, 158, 11, 0.15)'
                  : isError
                    ? '0 10px 30px rgba(220, 38, 38, 0.15)'
                    : '0 10px 30px rgba(0, 0, 0, 0.08)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: isUser
                  ? '0 20px 45px rgba(59, 130, 246, 0.25)'
                  : isLoading
                    ? '0 15px 40px rgba(245, 158, 11, 0.2)'
                    : isError
                      ? '0 15px 40px rgba(220, 38, 38, 0.2)'
                      : '0 15px 40px rgba(0, 0, 0, 0.12)',
              },
              // Sophisticated shine effect
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 'inherit',
                background: isUser
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)'
                  : isDarkMode
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 50%)',
                zIndex: 0,
                pointerEvents: 'none',
              }
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              {isUser ? (
                <Typography 
                  variant="body1" 
                  component="div" 
                  sx={{ 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word', 
                    color: 'white',
                    fontSize: isMobile ? '0.8rem' : '0.875rem', 
                    lineHeight: 1.6, 
                    fontWeight: 500,
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    components={{ a: LinkRenderer }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </Typography>
              ) : (
                <Box sx={{ 
                  transition: theme.transitions.create(['opacity'], {
                    duration: theme.transitions.duration.short,
                  }),
                  opacity: message.isLoading ? 0.7 : 1,
                  '& p': { 
                    m: 0, 
                    mb: 1.25,
                    lineHeight: 1.6,
                    fontSize: isMobile ? '0.8rem' : '0.875rem',
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    fontWeight: 400,
                    '&:last-child': {
                      mb: 0
                    }
                  },
                  '& a': { 
                    color: '#3b82f6',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: isMobile ? '0.8rem' : '0.875rem',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'rgba(59, 130, 246, 0.2)',
                      transform: 'translateY(-1px)'
                    }
                  },
                  '& ul, & ol': {
                    pl: 2.5,
                    mb: 1.25,
                    fontSize: isMobile ? '0.8rem' : '0.875rem',
                    color: isDarkMode ? '#e2e8f0' : '#374151'
                  },
                  '& li': {
                    mb: 0.5,
                    fontSize: isMobile ? '0.8rem' : '0.875rem'
                  },
                  '& code': {
                    background: isDarkMode 
                      ? 'rgba(75, 85, 99, 0.5)' 
                      : 'rgba(241, 245, 249, 0.8)',
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
                    fontSize: isMobile ? '0.75rem' : '0.8rem',
                    fontWeight: 500,
                    border: isDarkMode ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid rgba(203, 213, 225, 0.5)'
                  },
                  '& blockquote': {
                    borderLeft: '4px solid #3b82f6',
                    pl: 2,
                    ml: 0,
                    my: 1.25,
                    fontStyle: 'italic',
                    background: isDarkMode 
                      ? 'rgba(59, 130, 246, 0.05)'
                      : 'rgba(59, 130, 246, 0.03)',
                    borderRadius: '0 8px 8px 0',
                    py: 1
                  }
                }}>
                  <AnimatePresence mode="wait">
                    {isLoading && message.content === 'Thinking...' ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: isDarkMode ? '#94a3b8' : '#64748b',
                          fontStyle: 'italic'
                        }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <AIIcon sx={{ fontSize: '1rem' }} />
                        </motion.div>
                        AI is thinking...
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{ a: LinkRenderer }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Enhanced Ticket Button */}
                  {!message.isLoading && (message.content.includes('Ticket type:') || message.content.includes('Create a ticket')) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: isStreamingMessage ? 0.2 : 0.4, duration: 0.3 }}
                    >
                      <Box sx={{ mt: 2.5 }}>
                        <Button
                          variant="contained"
                          size="large"
                          sx={{ 
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            color: 'white',
                            borderRadius: '16px',
                            px: 3,
                            py: 1.5,
                            fontWeight: 600,
                            fontSize: '0.875rem',
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
                          onClick={handleTicketButtonClick}
                        >
                          Create A Ticket
                        </Button>
                      </Box>
                    </motion.div>
                  )}

                  {/* Enhanced Cab Booking Button */}
                  {showCabButton && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: isStreamingMessage ? 0.2 : 0.4, duration: 0.3 }}
                    >
                      <Box sx={{ mt: 2.5 }}>
                        <Button
                          variant="contained"
                          size="large"
                          sx={{ 
                            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                            color: 'white',
                            borderRadius: '16px',
                            px: 3,
                            py: 1.5,
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            boxShadow: '0 8px 25px rgba(220, 38, 38, 0.3)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'hidden',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 12px 35px rgba(220, 38, 38, 0.4)'
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
                          onClick={handleCabBookingClick}
                        >
                          🚗 Book A Cab
                        </Button>
                      </Box>
                    </motion.div>
                  )}
                </Box>
              )}
              
              {/* Enhanced Feedback Section */}
              {!isUser && !isLoading && !isError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: isStreamingMessage ? 0.2 : 0.4, duration: 0.3 }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'flex-start', 
                    alignItems: 'center', 
                    mt: 2, 
                    pt: 1.5,
                    borderTop: `1px solid ${isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.5)'}`,
                    minHeight: '32px' 
                  }}>
                    {feedbackError && (
                      <Typography variant="caption" sx={{ 
                        mr: 2,
                        color: '#ef4444',
                        fontWeight: 500,
                        fontSize: '0.75rem'
                      }}>
                        {feedbackError}
                      </Typography>
                    )}
                    {!feedbackSubmitted ? (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="This was helpful" arrow>
                          <IconButton 
                            size="small" 
                            onClick={() => handleFeedback('thumbs_up')} 
                            disabled={isSubmittingFeedback || !!feedbackSubmitted}
                            sx={{ 
                              color: isDarkMode ? '#94a3b8' : '#64748b',
                              borderRadius: '12px',
                              padding: '6px',
                              transition: 'all 0.2s ease',
                              '&:hover': { 
                                color: '#10b981',
                                background: 'rgba(16, 185, 129, 0.1)',
                                transform: 'scale(1.1)'
                              },
                              '&:disabled': {
                                color: isDarkMode ? '#6b7280' : '#9ca3af'
                              }
                            }}
                          >
                            {isSubmittingFeedback ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <ThumbUpIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="This wasn't helpful" arrow>
                          <IconButton 
                            size="small" 
                            onClick={() => handleFeedback('thumbs_down')} 
                            disabled={isSubmittingFeedback || !!feedbackSubmitted}
                            sx={{ 
                              color: isDarkMode ? '#94a3b8' : '#64748b',
                              borderRadius: '12px',
                              padding: '6px',
                              transition: 'all 0.2s ease',
                              '&:hover': { 
                                color: '#ef4444',
                                background: 'rgba(239, 68, 68, 0.1)',
                                transform: 'scale(1.1)'
                              },
                              '&:disabled': {
                                color: isDarkMode ? '#6b7280' : '#9ca3af'
                              }
                            }}
                          >
                            {isSubmittingFeedback ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <ThumbDownIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '12px',
                          px: 2,
                          py: 1,
                          color: '#10b981'
                        }}>
                          <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            Thanks for your feedback!
                          </Typography>
                        </Box>
                      </motion.div>
                    )}
                  </Box>
                </motion.div>
              )}

              {/* Enhanced Timestamp */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  mt: 1.5,
                  pt: 1,
                  borderTop: `1px solid ${isUser 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.5)'}`,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: isUser 
                      ? 'rgba(255, 255, 255, 0.8)' 
                      : isDarkMode ? '#94a3b8' : '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {message.created_at && !isNaN(new Date(message.created_at).getTime()) 
                    ? new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--:--'
                  }
                </Typography>
                
                {/* Enhanced Loading Indicator */}
                {isLoading && !isUser && (
                  <Box 
                    component="span" 
                    sx={{ 
                      ml: 1.5,
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.15) 100%)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#f59e0b',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      fontWeight: 600,
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <CircularProgress size={12} color="inherit" />
                    </motion.div>
                    Thinking...
                  </Box>
                )}
                
                {/* Enhanced Error Indicator */}
                {isError && !isUser && (
                  <Box 
                    component="span" 
                    sx={{ 
                      ml: 1.5,
                      background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)',
                      border: '1px solid rgba(220, 38, 38, 0.3)',
                      color: '#dc2626',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    Error
                  </Box>
                )}
              </Box>
            </Box>
          </Paper>
        </motion.div>
        
        {isUser && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
            <Tooltip 
              title="You" 
              placement="top-end"
              TransitionComponent={Zoom}
              arrow
            >
              <Avatar 
                sx={{ 
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  ml: 2,
                  width: 40,
                  height: 40,
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.15)'
                  }
                }}
              >
                <PersonIcon 
                  fontSize="small" 
                  sx={{ 
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    fontSize: '1.25rem'
                  }} 
                />
              </Avatar>
            </Tooltip>
          </motion.div>
        )}
      </Box>

      {/* Add custom animations */}
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) translateY(-100%) rotate(45deg);
          }
          50% {
            transform: translateX(0%) translateY(0%) rotate(45deg);
          }
          100% {
            transform: translateX(100%) translateY(100%) rotate(45deg);
          }
        }
      `}</style>
    </motion.div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default React.memo(MessageItem);
