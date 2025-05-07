import React from 'react';
import { Paper, Typography, Box, Avatar, Tooltip, Zoom, useTheme, CircularProgress } from '@mui/material';
import { Person as PersonIcon, SmartToy as BotIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDarkMode } from '../contexts/DarkModeContext';

// Message component for displaying chat messages
function MessageItem({ message, isLast, isMobile }) {
  const theme = useTheme();
  const { isDarkMode } = useDarkMode();
  const isUser = message.role === 'user';
  const isLoading = !isUser && message.isLoading === true;
  const isError = !isUser && message.isError === true;
  const isLongWait = !isUser && message.isLongWait === true;
  
  // Pre-process content to auto-link URLs
  const linkifyContent = (text) => {
    const urlRegex = /\b((?:https?:\/\/|www\.)[^\s]+)/gi;
    return text.replace(urlRegex, (match) => {
      // Separate trailing punctuation from URL
      const boundaryRegex = /(.*?)([.,!?;:]*)$/;
      const parts = boundaryRegex.exec(match);
      const url = parts[1];
      const suffix = parts[2] || '';
      const href = url.startsWith('http') ? url : `https://${url}`;
      return `[${url}](${href})${suffix}`;
    });
  };

  const bubbleColor = isUser 
    ? (isDarkMode ? theme.palette.primary.dark : theme.palette.primary.main) 
    : (isDarkMode ? theme.palette.grey[700] : theme.palette.grey[200]);
  const textColor = isUser 
    ? theme.palette.primary.contrastText 
    : (isDarkMode ? theme.palette.text.primary : theme.palette.grey[800]);

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
          background: theme.palette.primary.main,
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
          background: isDarkMode ? 'rgba(40, 40, 40, 0.8)' : theme.palette.background.paper,
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
          p: 2,
          px: 2.5,
          maxWidth: { xs: '85%', md: '70%' },
          borderRadius: '18px 18px 18px 18px',
          background: isUser 
            ? theme.palette.grey[800]
            : isLoading
              ? isDarkMode ? 'rgba(40, 40, 40, 0.8)' : 'rgba(255, 255, 255, 0.6)'
              : isError
                ? isDarkMode ? 'rgba(40, 40, 40, 0.8)' : 'rgba(255, 255, 255, 0.6)'
                : isDarkMode ? 'rgba(40, 40, 40, 0.8)' : 'rgba(255, 255, 255, 0.6)',
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
            ? 'rgba(255, 255, 255, 0.1)'
            : isLoading 
              ? isDarkMode ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 193, 7, 0.3)'
              : isError 
                ? isDarkMode ? 'rgba(211, 47, 47, 0.2)' : 'rgba(211, 47, 47, 0.3)'
                : isDarkMode ? 'rgba(60, 60, 60, 0.5)' : 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(10px)',
          boxShadow: isUser 
            ? theme.shadows[3]
            : '0 4px 15px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            backgroundImage: isUser
              ? 'radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent 65%)'
              : isDarkMode
                ? 'linear-gradient(to bottom, rgba(60,60,60,0.3), rgba(50,50,50,0.1))'
                : 'linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0.2))',
            zIndex: -1,
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
              color: textColor,
              fontSize: isMobile ? '0.875rem' : '1rem', 
              lineHeight: isMobile ? '1.4' : '1.5', 
              fontWeight: 400,
              letterSpacing: '0.01em',
            }}
          >
            {message.content}
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
              color: 'primary.main',
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
                backgroundColor: theme.palette.primary.main,
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
            >{message.content === 'Thinking...' && message.isLoading ? ' ' :
              linkifyContent(message.content)
            }</ReactMarkdown>
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
