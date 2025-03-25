import React from 'react';
import { Paper, Typography, Box, Avatar, Tooltip, Zoom, useTheme, CircularProgress } from '@mui/material';
import { Person as PersonIcon, SmartToy as BotIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';

// Message component for displaying chat messages
function MessageItem({ message }) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  const isLoading = !isUser && message.isLoading === true;
  const isError = !isUser && message.isError === true;
  const isLongWait = !isUser && message.isLongWait === true;
  
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
          background: theme.palette.background.paper,
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
                 "AI Assistant"}
          TransitionComponent={Zoom}
          arrow
          placement="top-start"
        >
          <Avatar 
            sx={{ 
              bgcolor: isLoading ? 'warning.light' : 
                      isError ? 'error.main' : 
                      'primary.main', 
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
              border: '2px solid white',
              animation: isLoading ? 'pulse 1.5s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.6 },
                '100%': { opacity: 1 },
              },
            }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : <BotIcon />}
          </Avatar>
        </Tooltip>
      )}
      
      <Paper
        elevation={isUser ? 3 : 2}
        sx={{
          p: 2,
          px: 2.5,
          maxWidth: { xs: '85%', md: '70%' },
          borderRadius: isUser 
            ? '18px 18px 18px 18px' 
            : '18px 18px 18px 18px',
          bgcolor: 'transparent',
          background: isUser 
            ? `linear-gradient(135deg, rgba(67, 97, 238, 0.85) 0%, rgba(76, 110, 245, 0.9) 100%)` 
            : isLoading
              ? 'rgba(255, 255, 255, 0.6)'
              : isError
                ? 'rgba(255, 255, 255, 0.6)'
                : 'rgba(255, 255, 255, 0.6)',
          color: isUser ? 'white' : 'text.primary',
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
            ? 'rgba(255, 255, 255, 0.3)' 
            : isLoading 
              ? 'rgba(255, 193, 7, 0.3)'
              : isError 
                ? 'rgba(211, 47, 47, 0.3)'
                : 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(10px)',
          boxShadow: isUser 
            ? '0 4px 15px rgba(67, 97, 238, 0.2)'
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
              ? 'radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 65%)'
              : 'linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0.2))',
            zIndex: -1,
          },
        }}
      >
        {isUser ? (
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: 400,
              lineHeight: 1.5,
              letterSpacing: '0.01em',
              textShadow: isUser ? '0 1px 1px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {message.content}
          </Typography>
        ) : (
          <Box sx={{ 
            '& p': { 
              m: 0, 
              mb: 1.5,
              lineHeight: 1.6,
              '&:last-child': {
                mb: 0
              }
            },
            '& a': { 
              color: 'primary.main',
              textDecoration: 'none',
              fontWeight: 500,
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
              mb: 1.5
            },
            '& li': {
              mb: 0.5,
            },
            '& code': {
              backgroundColor: theme.palette.mode === 'light' 
                ? 'rgba(0, 0, 0, 0.04)' 
                : 'rgba(255, 255, 255, 0.1)',
              padding: '2px 4px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.875em',
            }
          }}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
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
                ? 'rgba(255, 193, 7, 0.15)'
                : isError
                  ? 'rgba(211, 47, 47, 0.15)' 
                  : theme.palette.divider}`,
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
            {message.timestamp && !isNaN(new Date(message.timestamp).getTime()) 
              ? new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
            }
          </Typography>
          
          {isLoading && !isUser && (
            <Box 
              component="span" 
              sx={{ 
                ml: 0.75, 
                bgcolor: 'rgba(255, 193, 7, 0.15)', 
                color: 'warning.main',
                px: 0.75,
                py: 0.25,
                borderRadius: '10px',
                fontSize: '0.65rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.4,
                fontWeight: 500,
                border: '1px solid rgba(255, 193, 7, 0.2)',
              }}
            >
              <CircularProgress size={10} color="inherit" sx={{ animationDuration: '1s' }} />
              processing
            </Box>
          )}
          
          {isError && !isUser && (
            <Box 
              component="span" 
              sx={{ 
                ml: 0.75, 
                bgcolor: 'rgba(211, 47, 47, 0.15)', 
                color: 'error.main',
                px: 0.75,
                py: 0.25,
                borderRadius: '10px',
                fontSize: '0.65rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.4,
                fontWeight: 500,
                border: '1px solid rgba(211, 47, 47, 0.2)',
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
              bgcolor: 'secondary.main', 
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
              border: '2px solid white',
            }}
          >
            <PersonIcon />
          </Avatar>
        </Tooltip>
      )}
    </Box>
  );
}

export default MessageItem;
