import React from 'react';
import { Container, Typography, Paper, Box, Button, Grid } from '@mui/material';
import { Chat as ChatIcon, QuestionAnswer as QuestionAnswerIcon, Info as InfoIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
        background: 'linear-gradient(135deg, #e0f7fa 0%, #e8f5e9 50%, #f3e5f5 100%)',
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
          backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5) 0%, transparent 25%), radial-gradient(circle at 80% 70%, rgba(153,204,255,0.3) 0%, transparent 30%)',
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
              bgcolor: 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(15px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
            }}
          >
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
              Welcome to Othain HR Self-Service
              {user && `, ${user.name || user.email}`}
            </Typography>
            <Typography variant="body1" paragraph>
              Your interactive HR assistant designed to help with policies, benefits, and workplace questions.
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

          {/* Features grid */}
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 3, 
                  height: '100%', 
                  borderRadius: 3,
                  bgcolor: 'rgba(255, 255, 255, 0.55)',
                  backdropFilter: 'blur(15px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
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
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      Ask Questions
                    </Typography>
                  </Box>
                  <Typography variant="body1" paragraph sx={{ flexGrow: 1 }}>
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
                        '&:hover': {
                          borderWidth: 1.5,
                          background: 'rgba(67, 97, 238, 0.05)',
                          boxShadow: '0 4px 12px rgba(67, 97, 238, 0.15)'
                        }
                      }}
                    >
                      Get Started
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
                  bgcolor: 'rgba(255, 255, 255, 0.55)',
                  backdropFilter: 'blur(15px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
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
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      Knowledge Base
                    </Typography>
                  </Box>
                  <Typography variant="body1" paragraph sx={{ flexGrow: 1 }}>
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
                          '&:hover': {
                            borderWidth: 1.5,
                            background: 'rgba(67, 97, 238, 0.05)',
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