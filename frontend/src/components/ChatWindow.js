import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Divider,
  Fade,
  IconButton,
  InputAdornment,
  Alert,
  Chip,
  Avatar,
  useTheme
} from '@mui/material';
import { 
  Send as SendIcon, 
  SmartToy as BotIcon,
  SignalWifiOff as OfflineIcon,
  WifiTethering as OnlineIcon,
  SentimentSatisfiedAlt as EmojiIcon,
  SignalWifiOff as SignalWifiOffIcon,
  SupportAgent as SupportAgentIcon,
} from '@mui/icons-material';
import MessageItem from './MessageItem';
import { chatApi } from '../services/api';
import { useDarkMode } from '../contexts/DarkModeContext';

const ChatWindow = ({ sessionId, onSessionChange }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [serverError, setServerError] = useState(false);
  const messagesEndRef = useRef(null);
  const { isDarkMode } = useDarkMode();
  const theme = useTheme();
  const currentAssistantMessageId = useRef(null);
  const bufferedContentRef = useRef('');
  const updateTimerRef = useRef(null);
  const isFirstChunkRef = useRef(true);

  // Set to false since we're removing offline mode
  const offlineMode = false;
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // Handle sending a message (Updated for Streaming with Batching)
  const handleSubmit = async (e) => {
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
  };

  // Display the status badge
  const getStatusBadge = () => {
    if (serverError || offlineMode) {
      return (
        <Chip
          icon={<SignalWifiOffIcon fontSize="small" />}
          label="Connection Error"
          size="small"
          color="default"
          sx={{ 
            borderRadius: 1, 
            mt: 1, 
            mb: 2,
            bgcolor: isDarkMode ? 'grey.800' : 'grey.200',
            '& .MuiChip-icon': { color: 'text.secondary' },
            '& .MuiChip-label': { color: 'text.primary', fontWeight: 'medium' }
          }}
        />
      );
    }
    return null;
  };

  if (!sessionId) {
    return (
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          borderRadius: 3,
          background: isDarkMode 
            ? 'linear-gradient(to bottom, rgba(67, 97, 238, 0.1), rgba(67, 97, 238, 0.15))'
            : 'linear-gradient(to bottom, rgba(67, 97, 238, 0.05), rgba(67, 97, 238, 0.1))',
          color: theme => theme.palette.text.primary,
        }}
      >
        <img 
          src={isDarkMode ? '/othainlogopreview.png' : '/OthainOcolor.png'}
          alt="Othain Logo"
          height={isDarkMode ? "60" : "50"}
          style={{ marginBottom: theme.spacing(2), opacity: 1 }}
        />
        <Typography variant="h5" color="text.primary" sx={{ mb: 1, fontWeight: 500 }}>
          Welcome to Othain Employee Self Service
        </Typography>
        <Typography variant="body1" color="textSecondary" align="center" sx={{ mb: 3, maxWidth: 500 }}>
          Select an existing chat from the sidebar or start a new conversation to get assistance with HR-related questions.
        </Typography>
        
        {offlineMode ? (
          <Alert 
            severity="info" 
            icon={<OfflineIcon />}
            sx={{ 
              borderRadius: 2,
              display: 'flex', 
              alignItems: 'center' 
            }}
          >
            Currently using offline responses
          </Alert>
        ) : (
          <Alert 
            severity="success" 
            icon={<OnlineIcon />}
            sx={{ 
              borderRadius: 2,
              display: 'flex', 
              alignItems: 'center' 
            }}
          >
            Connected to Othain ESS
          </Alert>
        )}
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: isDarkMode ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(15px)',
        border: isDarkMode ? '1px solid rgba(50, 50, 50, 0.6)' : '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        position: 'relative',
        zIndex: 5,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          backgroundImage: isDarkMode 
            ? 'linear-gradient(to bottom, rgba(40,40,40,0.5), rgba(30,30,30,0.2))'
            : 'linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0.2))',
          zIndex: 0,
        }
      }}
    >
      <Box 
        sx={{ 
          p: 2, 
          borderBottom: isDarkMode ? '1px solid rgba(50, 50, 50, 0.5)' : '1px solid rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(10px)',
          bgcolor: isDarkMode ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            sx={{
              bgcolor: theme => theme.palette.mode === 'dark' ? 'black' : 'black',
              width: 40,
              height: 40,
              mr: 1.5,
              border: isDarkMode ? '2px solid rgba(40, 40, 40, 0.8)' : '2px solid white',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <img 
            src="/othainlogopreview.png"
            alt="Othain Logo" 
            height="26" 
            style={{marginBottom: '-1px' }} 
          />
          </Avatar>
          <img 
            src={isDarkMode ? "/logowhite.png" : "/Othain-logo2.png"} 
            alt="Othain Logo" 
            height={isDarkMode ? "20" : "22"} 
            style={{ marginRight: '8px', marginBottom: '29px' }} 
          /> 
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              ESS
            </Typography>
            <Typography variant="caption" sx={{ 
              color: 'text.secondary', 
              marginLeft: isDarkMode ? '-88px' : '-95px' 
            }}>
              Employee Self Service
            </Typography>
          </Box>
        </Box>
        {getStatusBadge()}
      </Box>

      <Box 
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: isDarkMode ? 'rgba(25, 25, 25, 0.7)' : 'rgba(245, 247, 250, 0.5)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
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
                p: 3,
                textAlign: 'center',
                bgcolor: isDarkMode ? 'rgba(40, 40, 40, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                borderRadius: 3,
                backdropFilter: 'blur(8px)',
                border: isDarkMode ? '1px solid rgba(60, 60, 60, 0.3)' : '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              }}
            >
              <img 
          src={isDarkMode ? '/othainlogopreview.png' : '/OthainOcolor.png'}
          alt="Othain Logo"
          height={isDarkMode ? "50" : "42"}
          style={{ marginBottom: theme.spacing(2), opacity: 1 }}
        />
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 500, color: theme => theme.palette.text.primary }}>
                Start a conversation
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Ask me anything about HR policies, benefits, or employment questions.
              </Typography>
              
              <Box sx={{ width: '100%', maxWidth: '400px' }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 2
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => setInput('Is there a work-from-home policy at Othain, and what guidelines do employees need to follow?')}
                    sx={{
                      py: 1.5,
                      px: 3,
                      borderRadius: 2,
                      justifyContent: 'flex-start',
                      color: isDarkMode ? 'white' : 'black',
                      bgcolor: isDarkMode ? 'rgba(40, 40, 40, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(5px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                      border: isDarkMode ? '1px solid rgba(70, 70, 70, 0.5)' : '1px solid rgba(255, 255, 255, 0.5)',
                      '&:hover': {
                        bgcolor: isDarkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.05)',
                      }
                    }}
                  >
                    Is there a work-from-home policy at Othain, and what guidelines do employees need to follow?
                  </Button>
                  
                  <Button
                    variant="outlined"
                    onClick={() => setInput('What is the process for an employee to apply for leave and obtain approval?')}
                    sx={{
                      py: 1.5,
                      px: 3,
                      borderRadius: 2,
                      justifyContent: 'flex-start',
                      color: isDarkMode ? 'white' : 'black',
                      bgcolor: isDarkMode ? 'rgba(40, 40, 40, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(5px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                      border: isDarkMode ? '1px solid rgba(70, 70, 70, 0.5)' : '1px solid rgba(255, 255, 255, 0.5)',
                      '&:hover': {
                        bgcolor: isDarkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.05)',
                      }
                    }}
                  >
                    What is the process for an employee to apply for leave and obtain approval?
                  </Button>
                  
                  <Button
                    variant="outlined"
                    onClick={() => setInput('When can I expect my salary to be credited each month?')}
                    sx={{
                      py: 1.5,
                      px: 3,
                      borderRadius: 2,
                      justifyContent: 'flex-start',
                      color: isDarkMode ? 'white' : 'black',
                      bgcolor: isDarkMode ? 'rgba(40, 40, 40, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(5px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                      border: isDarkMode ? '1px solid rgba(70, 70, 70, 0.5)' : '1px solid rgba(255, 255, 255, 0.5)',
                      '&:hover': {
                        bgcolor: isDarkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.05)',
                      }
                    }}
                  >
                    When can I expect my salary to be credited each month?
                  </Button>
                </Box>
              </Box>
            </Box>
          </Fade>
        ) : (
          messages.map((message, index) => (
            <MessageItem
              key={message.id ? message.id : `temp-msg-${index}`}
              message={message}
              isLast={index === messages.length - 1}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            m: 2, 
            mb: 0,
            borderRadius: 2,
            border: '1px solid rgba(211, 47, 47, 0.2)',
            boxShadow: '0 4px 12px rgba(211, 47, 47, 0.1)',
          }}
        >
          {error}
        </Alert>
      )}

      <Box 
        component="form" 
        onSubmit={handleSubmit}
        sx={{ 
          p: 2, 
          borderTop: isDarkMode ? '1px solid rgba(50, 50, 50, 0.5)' : '1px solid rgba(255, 255, 255, 0.5)',
          bgcolor: isDarkMode ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type your message here..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!sessionId || sending}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              backgroundColor: isDarkMode ? 'rgba(40, 40, 40, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(5px)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              },
              '&.Mui-focused': {
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
              }
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!sessionId || sending || !input.trim()}
                  sx={{
                    bgcolor: theme.palette.primary?.main || '#1976d2',
                    color: theme.palette.primary?.contrastText || 'white',
                    borderRadius: '50%',
                    minWidth: 'auto',
                    width: 40,
                    height: 40,
                    p: 0,
                    boxShadow: '0 4px 8px rgba(67, 97, 238, 0.3)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: theme.palette.primary?.dark || '#1565c0',
                      boxShadow: '0 6px 12px rgba(67, 97, 238, 0.4)',
                    },
                    '&.Mui-disabled': {
                      bgcolor: theme.palette.action?.disabledBackground || 'rgba(0, 0, 0, 0.12)',
                      color: theme.palette.action?.disabled || 'rgba(0, 0, 0, 0.26)',
                      boxShadow: 'none',
                    }
                  }}
                >
                  {sending ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                </Button>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Paper>
  );
};

export default ChatWindow;
