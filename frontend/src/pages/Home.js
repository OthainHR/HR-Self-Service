import React, { useState } from 'react';
import { Container, Typography, Paper, Box, Button, Grid } from '@mui/material';
import { Chat as ChatIcon, QuestionAnswer as QuestionAnswerIcon, Info as InfoIcon, OndemandVideo as OndemandVideoIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const isAdmin = user?.user_metadata?.role === 'admin';

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 80px)',
        width: '100vw',
        position: 'fixed',
        top: 64, // Add space for navbar height
        left: 0,
        right: 0,
        bottom: 0,
        background: isDarkMode 
          ? 'linear-gradient(135deg, #121212 0%, #1e1e1e 50%, #262626 100%)'
          : 'linear-gradient(135deg, #e0f7fa 0%, #e8f5e9 50%, #f3e5f5 100%)',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        overflowY: 'auto',
        zIndex: 0,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          backgroundImage: isDarkMode
            ? 'radial-gradient(circle at 30% 20%, rgba(80,80,80,0.2) 0%, transparent 25%), radial-gradient(circle at 80% 70%, rgba(30,50,80,0.15) 0%, transparent 30%)'
            : 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5) 0%, transparent 25%), radial-gradient(circle at 80% 70%, rgba(153,204,255,0.3) 0%, transparent 30%)',
          zIndex: 0,
        }
      }}
    >
      <Container maxWidth="lg" sx={{ py: 4, position: 'relative', zIndex: 5 }}>
        <Box sx={{ py: 4 }}>
          {/* Welcome section */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4, 
              mb: 4, 
              borderRadius: 3,
              bgcolor: isDarkMode ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(15px)',
              border: isDarkMode ? '1px solid rgba(50, 50, 50, 0.6)' : '1px solid rgba(255, 255, 255, 0.6)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
            }}
          >
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, color: isDarkMode ? 'white' : 'primary.main' }}>
              Welcome to Othain HR Self-Service
              {user && `, ${user.name || user.email}`}
            </Typography>
            <Typography variant="body1" paragraph sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'inherit' }}>
              Your interactive Employee Self-Service designed to help with policies, benefits, and workplace questions.
              Start a conversation to get instant answers to your HR-related inquiries.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              startIcon={<ChatIcon />}
              onClick={() => navigate('/chat')}
              sx={{ 
                mt: 2,
                mr: 2,
                px: 3,
                py: 1.2,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(67, 97, 238, 0.3)',
                background: 'linear-gradient(to right, #4361ee, #3a56d4)',
                '&:hover': {
                  boxShadow: '0 6px 25px rgba(67, 97, 238, 0.4)',
                  background: 'linear-gradient(to right, #3a56d4, #324bc1)'
                }
              }}
            >
              Start Chatting
            </Button>
          </Paper>

          {/* New Dedicated Onboarding Section */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: { xs: 2, sm: 3, md: 4 }, // Responsive padding
              mb: 4, 
              borderRadius: 3,
              bgcolor: isDarkMode ? 'rgba(40, 40, 50, 0.85)' : 'rgba(230, 240, 255, 0.7)', // A slightly different shade for distinction
              backdropFilter: 'blur(15px)',
              border: isDarkMode ? '1px solid rgba(60, 60, 70, 0.6)' : '1px solid rgba(220, 230, 255, 0.6)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.10)',
              textAlign: 'center', // Center align content
            }}
          >
            <OndemandVideoIcon sx={{ fontSize: 48, color: isDarkMode ? 'secondary.light' : 'secondary.main', mb: 2 }} />
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, color: isDarkMode ? 'white' : 'primary.dark' }}>
            New to Othain or just need a refresher?
            </Typography>
            <Typography variant="body1" paragraph sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'text.secondary', maxWidth: '700px', margin: '0 auto 16px auto' }}>
            Welcome aboard! Our onboarding video is your express guide to navigating Othain with confidence. Discover essential HR policies, learn about your valuable employee benefits, and get acquainted with our performance management system. 
            </Typography>
            <Button 
              variant="contained" 
              color="secondary" 
              size="large"
              startIcon={<OndemandVideoIcon />}
              onClick={() => navigate('/onboarding')}
              sx={{ 
                mt: 1,
                px: 4, // More horizontal padding for emphasis
                py: 1.3,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(247, 37, 133, 0.3)', // Using secondary color for shadow
                background: isDarkMode ? 'linear-gradient(to right, #f72585, #d42070)' : 'linear-gradient(to right, #f72585, #e01e75)', // Adjusted gradient for dark/light
                '&:hover': {
                  boxShadow: '0 6px 25px rgba(247, 37, 133, 0.4)',
                  background: isDarkMode ? 'linear-gradient(to right, #e01e75, #c31970)' : 'linear-gradient(to right, #d42070, #c31970)'
                }
              }}
            >
              Watch Onboarding Video
            </Button>
          </Paper>

          {/* Features grid */}
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 3, 
                  height: '100%', 
                  borderRadius: 3,
                  bgcolor: isDarkMode ? 'rgba(30, 30, 30, 0.75)' : 'rgba(255, 255, 255, 0.55)',
                  backdropFilter: 'blur(15px)',
                  border: isDarkMode ? '1px solid rgba(50, 50, 50, 0.5)' : '1px solid rgba(255, 255, 255, 0.5)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <QuestionAnswerIcon color="primary" sx={{ mr: 1.5, fontSize: 32 }} />
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 600, color: isDarkMode ? 'white' : 'primary.main' }}>
                      Ask Questions
                    </Typography>
                  </Box>
                  <Typography variant="body1" paragraph sx={{ flexGrow: 1, color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'inherit' }}>
                    Ask about company policies, benefits, time-off, workplace guidelines, and more.
                    The HR chatbot uses AI to understand your questions and provide accurate information.
                  </Typography>
                  <Box sx={{ mt: 'auto' }}>
                    <Button 
                      variant="outlined" 
                      color="primary"
                      onClick={() => navigate('/chat')}
                      sx={{
                        px: 2.5,
                        py: 1,
                        borderRadius: 2,
                        borderWidth: 1.5,
                        color: isDarkMode ? 'primary.light' : 'primary.main',
                        borderColor: isDarkMode ? 'primary.light' : 'primary.main',
                        '&:hover': {
                          borderWidth: 1.5,
                          background: isDarkMode ? 'rgba(67, 97, 238, 0.15)' : 'rgba(67, 97, 238, 0.05)',
                          boxShadow: '0 4px 12px rgba(67, 97, 238, 0.15)'
                        }
                      }}
                    >
                      Start Chatting
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 3, 
                  height: '100%', 
                  borderRadius: 3,
                  bgcolor: isDarkMode ? 'rgba(30, 30, 30, 0.75)' : 'rgba(255, 255, 255, 0.55)',
                  backdropFilter: 'blur(15px)',
                  border: isDarkMode ? '1px solid rgba(50, 50, 50, 0.5)' : '1px solid rgba(255, 255, 255, 0.5)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <InfoIcon color="primary" sx={{ mr: 1.5, fontSize: 32 }} />
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 600, color: isDarkMode ? 'white' : 'primary.main' }}>
                      Knowledge Base
                    </Typography>
                  </Box>
                  <Typography variant="body1" paragraph sx={{ flexGrow: 1, color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'inherit' }}>
                    The HR chatbot is connected to a comprehensive knowledge base of company information.
                    {isAdmin && ' As an administrator, you can manage this knowledge base to keep information accurate and up-to-date.'}
                  </Typography>
                  {isAdmin && (
                    <Box sx={{ mt: 'auto' }}>
                      <Button 
                        variant="outlined" 
                        color="primary"
                        onClick={() => navigate('/knowledge')}
                        sx={{
                          px: 2.5,
                          py: 1,
                          borderRadius: 2,
                          borderWidth: 1.5,
                          color: isDarkMode ? 'primary.light' : 'primary.main',
                          borderColor: isDarkMode ? 'primary.light' : 'primary.main',
                          '&:hover': {
                            borderWidth: 1.5,
                            background: isDarkMode ? 'rgba(67, 97, 238, 0.15)' : 'rgba(67, 97, 238, 0.05)',
                            boxShadow: '0 4px 12px rgba(67, 97, 238, 0.15)'
                          }
                        }}
                      >
                        Manage Knowledge Base
                      </Button>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default Home; 