import React, { useState } from 'react';
import { Paper, Typography, Box, Avatar, Tooltip, Zoom, useTheme, CircularProgress, IconButton, Button } from '@mui/material';
import { Person as PersonIcon, SmartToy as BotIcon, ThumbUpAltOutlined as ThumbUpIcon, ThumbDownAltOutlined as ThumbDownIcon, CheckCircleOutline as CheckCircleIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDarkMode } from '../contexts/DarkModeContext';
import supabase from '../supabaseClient';

// Message component for displaying chat messages
function MessageItem({ message, isLast, isMobile }) {
  const theme = useTheme();
  const { isDarkMode } = useDarkMode();

  // Define base glass properties for messages
  const generalMessageGlassProps = {
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '18px', // Keep existing message bubble shape
    // General shadow, can be overridden per message type if needed
    boxShadow: isDarkMode ? '0 3px 12px rgba(0,0,0,0.2)' : '0 3px 12px rgba(0,0,0,0.08)',
  };

  // Custom link renderer inside MessageItem to hide raw ticket URL when button is shown
  const ticketUrl = 'https://othaingroup.atlassian.net/servicedesk/customer/portal/7/group/-1';
  const showTicketButton = !message.isLoading && (
    message.content.includes('Ticket type:') || message.content.includes('Create a ticket')
  );
  const LinkRenderer = ({ href, children }) => {
    if (href === ticketUrl) {
      // Hide raw ticket link when the ticket button is rendered
      if (showTicketButton) {
        return null;
      }
      // If the link text is exactly the URL, display 'Create A Ticket'
      if (`${children}` === ticketUrl) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
            Create A Ticket
          </a>
        );
      }
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
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
  
  // Determine background colors for tails based on main bubble backgrounds
  const userBubbleBg = isDarkMode ? 'rgba(80, 80, 80, 0.65)' : 'rgba(100, 100, 100, 0.65)';
  const botLoadingBg = isDarkMode ? 'rgba(100, 100, 60, 0.6)' : 'rgba(255, 255, 224, 0.6)';
  const botErrorBg = isDarkMode ? 'rgba(100, 60, 60, 0.6)' : 'rgba(255, 224, 224, 0.6)';
  const botDefaultBg = isDarkMode ? 'rgba(55, 55, 55, 0.55)' : 'rgba(248, 248, 248, 0.55)';

  const botBubbleBg = isLoading ? botLoadingBg : isError ? botErrorBg : botDefaultBg;

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

      const apiUrl = process.env.REACT_APP_BACKEND_URL || ''; // Use REACT_APP_BACKEND_URL
      const response = await fetch(`${apiUrl}/api/v1/feedback`, { // Use the absolute API base URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          // 'Apikey': process.env.REACT_APP_SUPABASE_ANON_KEY, // No longer needed for calling own backend
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
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2.5,
        maxWidth: '100%',
        position: 'relative',
        '&::after': isUser ? {
          content: '""',
          position: 'absolute',
          bottom: 0,
          right: 45,
          width: 16,
          height: 16,
          background: userBubbleBg,
          borderBottomRightRadius: 16,
          boxShadow: `2px 2px 2px rgba(0, 0, 0, 0.05)`,
          zIndex: 0,
        } : !isUser ? {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 45,
          width: 16,
          height: 16,
          background: botBubbleBg,
          borderBottomLeftRadius: 16,
          boxShadow: `-2px 2px 2px rgba(0, 0, 0, 0.03)`,
          zIndex: 0,
          border: 'none',
          borderTop: 'none',
          borderRight: 'none',
        } : {}
      }}
    >
      {!isUser && (
        <Tooltip 
          title={isLoading ? "Processing..." : 
                 isError ? "Error occurred" : 
                 "Othain ESS"}
          TransitionComponent={Zoom}
          arrow
          placement="top-start"
        >
          <Avatar 
            sx={{ 
              bgcolor: isLoading ? 'warning.light' : 
                      isError ? 'error.main' : 
                      isDarkMode ? 'white' : 'black', 
              mr: 1,
              boxShadow: theme.shadows[2],
              width: 38,
              height: 38,
              zIndex: 2,
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: theme.shadows[3],
              },
              border: isDarkMode ? '2px solid rgba(30, 30, 30, 0.9)' : '2px solid white',
              animation: isLoading ? 'pulse 1.5s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.6 },
                '100%': { opacity: 1 },
              },
            }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : <img 
          src={isDarkMode ? '/OthainOcolor.png' : '/othainlogopreview.png' }
          alt="Othain Logo"
          height={isDarkMode ? "20" : "25"}
          style={{ 
            marginBottom: isDarkMode ? 0 : -2,
            opacity: 0.8 
          }}
        />}
          </Avatar>
        </Tooltip>
      )}
      
      <Paper
        elevation={isUser ? 3 : 2}
        sx={{
          ...generalMessageGlassProps,
          p: 2,
          px: 2.5,
          maxWidth: { xs: '85%', md: '70%' },
          borderRadius: '18px 18px 18px 18px',
          background: isUser
            ? userBubbleBg
            : botBubbleBg,
          color: isUser 
            ? 'white'
            : theme.palette.text.primary,
          position: 'relative',
          zIndex: 1,
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: 'translateZ(0)',
          '&:hover': {
            boxShadow: theme.shadows[isUser ? 4 : 3],
            transform: 'translateY(-1px)',
          },
          border: '1px solid',
          borderColor: isUser
            ? (isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)')
            : isLoading
              ? (isDarkMode ? 'rgba(255, 193, 7, 0.4)' : 'rgba(255, 193, 7, 0.5)')
              : isError
                ? (isDarkMode ? 'rgba(211, 47, 47, 0.4)' : 'rgba(211, 47, 47, 0.5)')
                : (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(200, 200, 200, 0.4)'),
          boxShadow: isUser
            ? (isDarkMode ? '0 4px 15px rgba(0,0,0,0.25)' : '0 4px 15px rgba(0,0,0,0.1)')
            : generalMessageGlassProps.boxShadow,
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom:0,
            borderRadius: 'inherit',
            backgroundImage: isUser
              ? 'radial-gradient(circle at top right, rgba(255,255,255,0.07) 0%, transparent 65%)'
              : isLoading || isError
                ? 'none'
                : isDarkMode
                  ? 'radial-gradient(circle at top left, rgba(255,255,255,0.04) 0%, transparent 55%)'
                  : 'radial-gradient(circle at top left, rgba(255,255,255,0.15) 0%, transparent 55%)',
            zIndex: -1,
            pointerEvents: 'none',
          },
        }}
      >
        {isUser ? (
          <Typography 
            variant="body1" 
            component="div" 
            sx={{ 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-word', 
              color: isUser ? 'white' : theme.palette.text.primary,
              fontSize: isMobile ? '0.875rem' : '1rem', 
              lineHeight: isMobile ? '1.4' : '1.5', 
              fontWeight: 400,
              letterSpacing: '0.01em',
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
            transition: theme.transitions.create(['opacity', 'color'], {
              duration: theme.transitions.duration.short,
            }),
            opacity: message.isLoading ? 0.5 : 1,
            color: message.isLoading ? 'transparent' : theme.palette.text.primary,
            '& p': { 
              m: 0, 
              mb: 1.5,
              lineHeight: 1.6,
              fontSize: isMobile ? '0.875rem' : '1rem',
              '&:last-child': {
                mb: 0
              }
            },
            '& a': { 
              color: 'rgba(17, 179, 207, 0.8)',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: isMobile ? '0.875rem' : '1rem',
              position: 'relative',
              '&:hover': {
                textDecoration: 'none',
                '&::after': {
                  width: '100%',
                }
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                fontSize: isMobile ? '0.875rem' : '1rem',
                bottom: 0,
                left: 0,
                width: 0,
                height: '1px',
                backgroundColor: 'rgba(17, 179, 207, 0.8)',
                transition: 'width 0.3s ease',
              }
            },
            '& ul, & ol': {
              pl: 2.5,
              mb: 1.5,
              fontSize: isMobile ? '0.875rem' : '1rem'
            },
            '& li': {
              mb: 0.5,
              fontSize: isMobile ? '0.875rem' : '1rem'
            },
            '& code': {
              backgroundColor: isDarkMode 
                ? 'rgba(70, 70, 70, 0.4)' 
                : 'rgba(0, 0, 0, 0.04)',
              padding: '2px 4px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: isMobile ? '0.875rem' : '1rem',
            }
          }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{ a: LinkRenderer }}
            >{message.content === 'Thinking...' && message.isLoading ? ' ' :
              message.content
            }</ReactMarkdown>
            {/* Ticket Link Button for better UX */}
            {!message.isLoading && (message.content.includes('Ticket type:') || message.content.includes('Create a ticket')) && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ 
                    marginBottom: 2,
                    borderRadius: '30px',
                    backgroundColor: 'rgba(17, 179, 207, 0.8)',
                    '&:hover': {
                      backgroundColor: 'rgba(17, 179, 207, 1)', 
                    }
                  }}
                  onClick={() => window.open('https://othaingroup.atlassian.net/servicedesk/customer/portal/7/group/-1', '_blank')}
                >
                  Create A Ticket
                </Button>
              </Box>
            )}
          </Box>
        )}
        
        {!isUser && !isLoading && !isError && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mt: 0.5, minHeight: '24px' }}>
            {feedbackError && (
              <Typography variant="caption" color="error" sx={{ mr: 1 }}>
                {feedbackError}
              </Typography>
            )}
            {!feedbackSubmitted ? (
              <>
                <Tooltip title="Helpful">
                  <span>
                    <IconButton 
                      size="small" 
                      onClick={() => handleFeedback('thumbs_up')} 
                      disabled={isSubmittingFeedback || !!feedbackSubmitted}
                      sx={{ 
                        color: isSubmittingFeedback && !feedbackError ? theme.palette.text.disabled : theme.palette.text.secondary, 
                        '&:hover': { color: !(isSubmittingFeedback || !!feedbackSubmitted) ? theme.palette.success.main : undefined }
                      }}
                    >
                      {isSubmittingFeedback ? <CircularProgress size={16} color="inherit" /> : <ThumbUpIcon fontSize="inherit" />}
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Not Helpful">
                  <span>
                    <IconButton 
                      size="small" 
                      onClick={() => handleFeedback('thumbs_down')} 
                      disabled={isSubmittingFeedback || !!feedbackSubmitted}
                      sx={{ 
                        color: isSubmittingFeedback && !feedbackError ? theme.palette.text.disabled : theme.palette.text.secondary, 
                        '&:hover': { color: !(isSubmittingFeedback || !!feedbackSubmitted) ? theme.palette.error.main : undefined }
                      }}
                    >
                      {isSubmittingFeedback ? <CircularProgress size={16} color="inherit" /> : <ThumbDownIcon fontSize="inherit" />}
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', color: theme.palette.success.main }}>
                <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="caption">Thanks for your feedback!</Typography>
              </Box>
            )}
          </Box>
        )}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            mt: 1,
            pt: 0.5,
            borderTop: `1px solid ${isUser 
              ? 'rgba(255, 255, 255, 0.15)' 
              : isLoading
                ? isDarkMode ? 'rgba(255, 193, 7, 0.12)' : 'rgba(255, 193, 7, 0.15)'
                : isError
                  ? isDarkMode ? 'rgba(211, 47, 47, 0.12)' : 'rgba(211, 47, 47, 0.15)' 
                  : isDarkMode ? 'rgba(70, 70, 70, 0.4)' : theme.palette.divider}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: isUser ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
              fontSize: '0.7rem',
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
          
          {isLoading && !isUser && (
            <Box 
              component="span" 
              sx={{ 
                ml: 0.75, 
                bgcolor: isDarkMode ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 193, 7, 0.15)', 
                color: 'warning.main',
                px: 0.75,
                py: 0.25,
                borderRadius: '10px',
                fontSize: '0.65rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.4,
                fontWeight: 500,
                border: isDarkMode ? '1px solid rgba(255, 193, 7, 0.15)' : '1px solid rgba(255, 193, 7, 0.2)',
              }}
            >
              <CircularProgress size={10} color="inherit" sx={{ animationDuration: '1s' }} />
              Thinking...
            </Box>
          )}
          
          {isError && !isUser && (
            <Box 
              component="span" 
              sx={{ 
                ml: 0.75, 
                bgcolor: isDarkMode ? 'rgba(211, 47, 47, 0.1)' : 'rgba(211, 47, 47, 0.15)', 
                color: 'error.main',
                px: 0.75,
                py: 0.25,
                borderRadius: '10px',
                fontSize: '0.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.4,
                fontWeight: 500,
                border: isDarkMode ? '1px solid rgba(211, 47, 47, 0.15)' : '1px solid rgba(211, 47, 47, 0.2)',
              }}
            >
              error
            </Box>
          )}
        </Box>
      </Paper>
      
      {isUser && (
        <Tooltip 
          title="You" 
          placement="top-end"
          TransitionComponent={Zoom}
          arrow
        >
          <Avatar 
            sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)', 
              ml: 1,
              boxShadow: theme.shadows[2],
              width: 38,
              height: 38,
              zIndex: 2,
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: theme.shadows[3],
              },
              border: isDarkMode ? '2px solid rgba(30, 30, 30, 0.9)' : '2px solid white',
            }}
          >
            <PersonIcon fontSize="small" sx={{ color: isDarkMode ? 'white' : 'black' }} />
          </Avatar>
        </Tooltip>
      )}
    </Box>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default React.memo(MessageItem);
