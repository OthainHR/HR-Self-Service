import React, { useState, useEffect, useRef } from 'react';
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

const ChatWindow = ({ sessionId, onSessionChange }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [serverError, setServerError] = useState(false);
  const messagesEndRef = useRef(null);

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
        console.error('Error fetching messages:', error);
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

  // Handle sending a message
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || !sessionId || sending) return;
    
    const messageText = input.trim();
    setInput('');
    setSending(true);
    setServerError(false);
    
    // Immediately add user message to UI for better responsiveness
    const userMessage = {
      id: Date.now() + '-user',
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Add a temporary placeholder for the bot's response
    const tempId = Date.now() + '-temp';
    const loadingMessage = {
      id: tempId,
      role: 'assistant',
      content: 'Thinking...',
      created_at: new Date().toISOString(),
      isLoading: true
    };
    
    setMessages(prev => [...prev, loadingMessage]);
    
    // Set a timeout for the AI response
    const responseTimeout = setTimeout(() => {
      // If we're still waiting after 10 seconds, update the loading message
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { ...msg, content: "Taking longer than usual to respond...", isLongWait: true }
          : msg
      ));
    }, 10000);
    
    try {
      const result = await chatApi.sendMessage(sessionId, messageText);
      
      // Clear the timeout
      clearTimeout(responseTimeout);
      
      // Remove the loading message
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      // If result has messages array, use it directly (only add the bot response)
      if (result.messages && Array.isArray(result.messages)) {
        // Find the assistant message in the result
        const assistantMessage = result.messages.find(msg => msg.role === 'assistant');
        if (assistantMessage) {
          setMessages(prev => [...prev, assistantMessage]);
        }
      } 
      // If result has traditional format with message property
      else if (result.message) {
        setMessages(prev => [...prev, result.message]);
      }
      // If result has response property (backwards compatibility)
      else if (result.response) {
        // Add assistant response
        const assistantMessage = {
          id: Date.now() + '-assistant',
          role: 'assistant',
          content: result.response.content,
          created_at: result.response.timestamp || new Date().toISOString()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Clear the timeout
      clearTimeout(responseTimeout);
      
      // Remove the loading message
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      // Add an error message from the bot
      const errorMessage = {
        id: Date.now() + '-error',
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. This might be due to a connection issue or authentication problem. Please try again later or sign out and sign back in.',
        created_at: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Show an error alert to the user
      setError('Failed to send message. Please check your connection and try again.');
      
      // Clear the error after 5 seconds
      setTimeout(() => {
        setError('');
      }, 5000);
      
      setServerError(true);
    } finally {
      setSending(false);
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
            bgcolor: 'grey.200',
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
          background: 'linear-gradient(to bottom, rgba(67, 97, 238, 0.05), rgba(67, 97, 238, 0.1))',
        }}
      >
        <BotIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2, opacity: 0.8 }} />
        <Typography variant="h5" color="primary" sx={{ mb: 1, fontWeight: 500 }}>
          Welcome to Othain HR Assistant
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
            Currently using simulated AI responses
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
            Connected to API - all features available
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
        bgcolor: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(15px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
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
          backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0.2))',
          zIndex: 0,
        }
      }}
    >
      <Box 
        sx={{ 
          p: 2, 
          borderBottom: '1px solid rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(10px)',
          bgcolor: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 40,
              height: 40,
              mr: 2,
              border: '2px solid white',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <SupportAgentIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
              Othain HR Assistant
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              AI-powered support
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
          bgcolor: 'rgba(245, 247, 250, 0.5)',
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
                bgcolor: 'rgba(255, 255, 255, 0.6)',
                borderRadius: 3,
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              }}
            >
              <BotIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2, opacity: 0.8 }} />
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 500, color: 'primary.main' }}>
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
                    color="primary"
                    onClick={() => setInput('What is our vacation policy?')}
                    sx={{
                      py: 1.5,
                      px: 3,
                      borderRadius: 2,
                      justifyContent: 'flex-start',
                      bgcolor: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(5px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.05)',
                      }
                    }}
                  >
                    What is our vacation policy?
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setInput('How do I apply for parental leave?')}
                    sx={{
                      py: 1.5,
                      px: 3,
                      borderRadius: 2,
                      justifyContent: 'flex-start',
                      bgcolor: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(5px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.05)',
                      }
                    }}
                  >
                    How do I apply for parental leave?
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setInput('What are our health insurance benefits?')}
                    sx={{
                      py: 1.5,
                      px: 3,
                      borderRadius: 2,
                      justifyContent: 'flex-start',
                      bgcolor: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(5px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.05)',
                      }
                    }}
                  >
                    What are our health insurance benefits?
                  </Button>
                </Box>
              </Box>
            </Box>
          </Fade>
        ) : (
          messages.map((message) => (
            <MessageItem key={message.id} message={message} />
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
          borderTop: '1px solid rgba(255, 255, 255, 0.5)',
          bgcolor: 'rgba(255, 255, 255, 0.7)',
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
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
                  color="primary"
                  variant="contained"
                  disabled={!sessionId || sending || !input.trim()}
                  sx={{ 
                    borderRadius: '50%', 
                    minWidth: 'auto', 
                    width: 40, 
                    height: 40,
                    p: 0,
                    boxShadow: '0 4px 8px rgba(67, 97, 238, 0.3)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 6px 12px rgba(67, 97, 238, 0.4)',
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
