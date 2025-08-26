/**
 * Enhanced HR Chat Component with Keka OAuth Integration
 * Provides intelligent HR chatbot with personalized responses using Keka data
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  IconButton,
  Divider,
  Chip,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Link as ConnectIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { useKekaAuth } from '../hooks/useKekaAuth';
import KekaAccountConnection from './KekaAccountConnection';
import hrServiceEnhanced, { KekaAuthRequiredError } from '../services/hrServiceEnhanced';

const HRChatEnhanced = ({ maxHeight = '600px' }) => {
  const theme = useTheme();
  const { 
    hasValidConnection, 
    connect, 
    withKekaAuth, 
    getConnectionSummary,
    isConnected 
  } = useKekaAuth();
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConnectionPanel, setShowConnectionPanel] = useState(false);
  const [error, setError] = useState(null);
  
  // Chat examples
  const [showExamples, setShowExamples] = useState(true);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Add welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        type: 'bot',
        content: isConnected 
          ? "Hi! I'm your HR assistant. I can help you with your leave balances, attendance, payslips, and more. What would you like to know?"
          : "Hi! I'm your HR assistant. To provide personalized HR information, I'll need you to connect your Keka account first.",
        timestamp: new Date(),
        requiresKeka: !isConnected
      };
      
      setMessages([welcomeMessage]);
    }
  }, [isConnected, messages.length]);

  /**
   * Handle sending a message
   */
  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError(null);
    setLoading(true);
    setShowExamples(false);

    try {
      // Check if this is an HR query that requires Keka connection
      const isHRQuery = await isHRRelatedQuery(userMessage.content);
      
      if (isHRQuery && !hasValidConnection()) {
        // Show connection required message
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: "To answer questions about your personal HR information, I need you to connect your Keka account first. This will allow me to provide accurate information about your leave balances, attendance, payslips, and more.",
          timestamp: new Date(),
          requiresKeka: true,
          actions: ['connect']
        };
        
        setMessages(prev => [...prev, botResponse]);
        setShowConnectionPanel(true);
        return;
      }

      // Make the chat request
      let response;
      if (isHRQuery) {
        response = await withKekaAuth(() => 
          makeHRChatRequest(userMessage.content)
        );
      } else {
        response = await makeGeneralChatRequest(userMessage.content);
      }

      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.message,
        timestamp: new Date(),
        data: response.data
      };

      setMessages(prev => [...prev, botResponse]);

    } catch (error) {
      console.error('Chat request failed:', error);
      
      let errorMessage = 'Sorry, I encountered an error processing your request.';
      let requiresKeka = false;
      let actions = [];

      if (error instanceof KekaAuthRequiredError) {
        errorMessage = error.message;
        requiresKeka = true;
        actions = ['connect'];
        setShowConnectionPanel(true);
      } else if (error.message) {
        errorMessage = `Sorry, I encountered an error: ${error.message}`;
      }

      const errorResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: errorMessage,
        timestamp: new Date(),
        isError: true,
        requiresKeka,
        actions
      };

      setMessages(prev => [...prev, errorResponse]);
      setError(error.message);

    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if query is HR-related
   */
  const isHRRelatedQuery = async (query) => {
    const hrKeywords = [
      'leave', 'vacation', 'pto', 'sick', 'holiday',
      'attendance', 'timesheet', 'check in', 'check out',
      'payslip', 'salary', 'pay', 'compensation', 'bonus',
      'profile', 'employee', 'department', 'manager',
      'balance', 'remaining', 'taken', 'approved'
    ];

    const lowerQuery = query.toLowerCase();
    return hrKeywords.some(keyword => lowerQuery.includes(keyword));
  };

  /**
   * Make HR chat request with user data
   */
  const makeHRChatRequest = async (query) => {
    try {
      // For now, we'll make a simple request to the chat endpoint
      // In a real implementation, this would call your enhanced chat service
      
      // Get some context data that might be relevant
      const contextPromises = [];
      
      if (query.toLowerCase().includes('leave') || query.toLowerCase().includes('balance')) {
        contextPromises.push(hrServiceEnhanced.getLeaveBalancesSafe().catch(() => null));
      }
      
      if (query.toLowerCase().includes('attendance') || query.toLowerCase().includes('time')) {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        contextPromises.push(hrServiceEnhanced.getAttendanceSafe(
          monthStart.toISOString().split('T')[0],
          today.toISOString().split('T')[0]
        ).catch(() => null));
      }

      const contextData = await Promise.all(contextPromises);
      const validContextData = contextData.filter(data => data !== null);

      // Simulate processing the query with context
      let responseMessage = `I understand you're asking about: "${query}".`;
      
      if (validContextData.length > 0) {
        responseMessage += "\n\nBased on your current HR data, here's what I found:";
        
        // Add specific data based on what was retrieved
        validContextData.forEach(data => {
          if (Array.isArray(data) && data[0]?.leave_type) {
            // Leave balances
            responseMessage += `\n\n📊 **Your Leave Balances:**`;
            data.forEach(leave => {
              responseMessage += `\n• ${leave.leave_type}: ${leave.available_days} days available`;
            });
          } else if (Array.isArray(data) && data[0]?.date) {
            // Attendance data
            const presentDays = data.filter(d => d.status === 'Present').length;
            responseMessage += `\n\n📈 **This Month's Attendance:** ${presentDays} days worked`;
          }
        });
      } else {
        responseMessage += "\n\nI can help you get specific information about your leave balances, attendance, payslips, and more. What would you like to know?";
      }

      return {
        message: responseMessage,
        data: validContextData
      };

    } catch (error) {
      console.error('HR chat request failed:', error);
      throw error;
    }
  };

  /**
   * Make general chat request (non-HR)
   */
  const makeGeneralChatRequest = async (query) => {
    // For general queries, provide helpful responses
    return {
      message: `I'm your HR assistant, and I'm here to help with HR-related questions. Your query "${query}" doesn't seem to be HR-related, but I'm happy to help with information about leaves, attendance, payslips, holidays, and other HR matters.`,
      data: null
    };
  };

  /**
   * Handle example question click
   */
  const handleExampleClick = (example) => {
    setInput(example);
    inputRef.current?.focus();
  };

  /**
   * Handle Keka connection
   */
  const handleConnectKeka = async () => {
    try {
      const result = await connect();
      if (result.success) {
        setShowConnectionPanel(false);
        // Add success message to chat
        const successMessage = {
          id: Date.now(),
          type: 'bot',
          content: "Great! Your Keka account is now connected. I can now provide personalized information about your leave balances, attendance, and more. What would you like to know?",
          timestamp: new Date(),
          isSuccess: true
        };
        setMessages(prev => [...prev, successMessage]);
      }
    } catch (error) {
      console.error('Failed to connect Keka account:', error);
    }
  };

  // Example questions
  const exampleQuestions = [
    "How many leave days do I have remaining?",
    "Show me my attendance for this month",
    "What's my current leave balance?",
    "When are the upcoming holidays?",
    "Can you show me my recent payslips?"
  ];

  const connectionSummary = getConnectionSummary();

  return (
    <Paper
      elevation={3}
      sx={{
        height: maxHeight,
        display: 'flex',
        flexDirection: 'column',
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
        borderRadius: 3
      }}
    >
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                borderRadius: 2,
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}
            >
              <BotIcon sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                HR Assistant
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {connectionSummary.message}
              </Typography>
            </Box>
          </Box>
          
          {/* Connection Status Indicator */}
          <Tooltip title={connectionSummary.message}>
            <Chip
              size="small"
              icon={
                connectionSummary.status === 'connected' ? <CheckIcon /> :
                connectionSummary.status === 'expired' ? <WarningIcon /> :
                <ErrorIcon />
              }
              label={
                connectionSummary.status === 'connected' ? 'Connected' :
                connectionSummary.status === 'expired' ? 'Expired' :
                'Not Connected'
              }
              color={
                connectionSummary.status === 'connected' ? 'success' :
                connectionSummary.status === 'expired' ? 'warning' :
                'default'
              }
              variant="outlined"
            />
          </Tooltip>
        </Box>

        {/* Connection Panel Toggle */}
        <Collapse in={showConnectionPanel}>
          <Box sx={{ mt: 2 }}>
            <KekaAccountConnection 
              onConnectionChange={() => setShowConnectionPanel(false)}
              compact={false}
            />
          </Box>
        </Collapse>
      </Box>

      {/* Messages Area */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflowY: 'auto', 
          p: 2,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                  mb: 2
                }}
              >
                <Box
                  sx={{
                    maxWidth: '80%',
                    display: 'flex',
                    flexDirection: message.type === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: 1
                  }}
                >
                  {/* Avatar */}
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: message.type === 'user' 
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {message.type === 'user' ? 
                      <PersonIcon sx={{ color: 'white', fontSize: 18 }} /> :
                      <BotIcon sx={{ color: 'white', fontSize: 18 }} />
                    }
                  </Box>

                  {/* Message Content */}
                  <Box>
                    <Paper
                      elevation={1}
                      sx={{
                        p: 2,
                        background: message.type === 'user'
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : message.isError
                            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                            : message.isSuccess
                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                              : theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(255, 255, 255, 0.9)',
                        color: (message.type === 'user' || message.isError || message.isSuccess) ? 'white' : 'inherit',
                        borderRadius: message.type === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </Typography>

                      {/* Action buttons for bot messages */}
                      {message.actions && message.actions.length > 0 && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          {message.actions.includes('connect') && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ConnectIcon />}
                              onClick={handleConnectKeka}
                              sx={{ 
                                borderColor: 'white', 
                                color: 'white',
                                '&:hover': {
                                  borderColor: 'rgba(255,255,255,0.8)',
                                  backgroundColor: 'rgba(255,255,255,0.1)'
                                }
                              }}
                            >
                              Connect Keka Account
                            </Button>
                          )}
                        </Box>
                      )}
                    </Paper>
                    
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ 
                        display: 'block', 
                        mt: 0.5,
                        textAlign: message.type === 'user' ? 'right' : 'left'
                      }}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <BotIcon sx={{ color: 'white', fontSize: 18 }} />
              </Box>
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  background: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '18px 18px 18px 4px'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2">Thinking...</Typography>
                </Box>
              </Paper>
            </Box>
          </Box>
        )}

        {/* Example Questions */}
        {showExamples && messages.length <= 1 && isConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Try asking me:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {exampleQuestions.map((question, index) => (
                  <Chip
                    key={index}
                    label={question}
                    variant="outlined"
                    size="small"
                    onClick={() => handleExampleClick(question)}
                    sx={{ 
                      alignSelf: 'flex-start',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            ref={inputRef}
            fullWidth
            variant="outlined"
            placeholder="Ask me about your leave balances, attendance, payslips..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={loading}
            size="small"
            multiline
            maxRows={3}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(255, 255, 255, 0.9)'
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!input.trim() || loading}
            sx={{
              minWidth: 'auto',
              width: 48,
              height: 48,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
              }
            }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SendIcon />
            )}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default HRChatEnhanced;

