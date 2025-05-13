import React, { useState } from 'react';
import { Container, Typography, Paper, Box, Button, Grid } from '@mui/material';
import { Chat as ChatIcon, QuestionAnswer as QuestionAnswerIcon, Info as InfoIcon, OndemandVideo as OndemandVideoIcon, Launch as LaunchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const isAdmin = user?.user_metadata?.role === 'admin';

  const getDisplayName = () => {
    if (user?.name) {
      return user.name;
    }
    if (user?.email) {
      try {
        const emailParts = user.email.split('@');
        const namePart = emailParts[0];
        const firstName = namePart.split('.')[0];
        if (firstName) {
          return firstName.charAt(0).toUpperCase() + firstName.slice(1);
        }
      } catch (e) {
        // Parsing failed, fall back to full email
        console.error("Failed to parse first name from email:", e);
        return user.email; 
      }
      return user.email; // Fallback if splitting somehow fails without error but no firstname
    }
    return ''; // No user name or email
  };

  const displayName = getDisplayName();

  // Define quick links for one-click access
  const quickLinks = [
    { label: 'IT Ticketing Tool', url: 'https://othaingroup.atlassian.net/servicedesk/customer/portal/7/group/-1' },
    { label: 'Othain Website', url: 'https://www.othain.com/' },
    { label: 'Training Sessions', url: 'https://othainsoftindia.sharepoint.com/sites/Trainings/SitePages/LearningTeamHome.aspx' },
    { label: 'Goals, Objectives & PMS', url: 'https://othainsoft.keka.com/#/org/documents/org/folder/5823/document/40977' },
    { label: 'Othain Handbook', url: 'https://othainsoft.keka.com/#/org/documents/org/folder/5823/document/30082' },
    { label: 'Request Leave', url: 'https://othainsoft.keka.com/#/me/leave/summary' },
    { label: 'View Pay Slips', url: 'https://othainsoft.keka.com/#/myfinances/pay/payslips' },
    { label: 'POSH Policy', url: 'https://othainsoft.keka.com/#/org/documents/org/folder/5823/document/35440' }
  ];

  // glassmorphism shared styles
  const glassStyles = {
    bgcolor: isDarkMode ? 'rgba(30, 30, 30, 0.22)' : 'rgba(255, 255, 255, 0.01)',
    border: '0px solid rgba(255,255,255,0.3)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
  };

  const glassStyles2 = {
    bgcolor: isDarkMode ? 'rgba(28, 189, 127, 0.73)' : 'rgba(28, 189, 127, 0.73)',
    border: '0px solid rgba(255,255,255,0.3)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(28, 189, 127, 0.33)'
  };

  const glassStyles3 = {
    bgcolor: isDarkMode ? 'rgba(28, 184, 189, 0.73)' : 'rgba(17, 179, 207, 0.8)',
    border: '0px solid rgba(255,255,255,0.3)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(17, 179, 207, 0.4)'
  };

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
          ? 'linear-gradient(135deg, #121212 0%, #1e1e1e 40%, #262626 100%)'
          : 'linear-gradient(135deg, #e0f7fa 0%, #e8f5e9 40%, #f3e5f5 100%)',
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
          backgroundRepeat: 'repeat-y',
          backgroundImage: isDarkMode
            ? 'radial-gradient(circle at 30% 20%, rgba(80,80,80,0.2) 0%, transparent 25%), radial-gradient(circle at 80% 70%, rgba(30,50,80,0.15) 0%, transparent 30%)'
            : 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5) 0%, transparent 25%), radial-gradient(circle at 80% 70%, rgba(153,204,255,0.3) 0%, transparent 30%)',
          zIndex: 0,
          WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%), linear-gradient(to right, black 85%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%), linear-gradient(to right, black 85%, transparent 100%)',
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: "url('/5624633.jpg')",
          backgroundSize: 'cover',
          backgroundRepeat: 'repeat-y',
          backgroundPosition: 'center',
          opacity: 0.3,
          zIndex: 1,
          WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
        },
      }}
    >
      <Container maxWidth="lg" sx={{ pt: { xs: 2, sm: 3, md: 4 }, pb: 0, position: 'relative', zIndex: 5 }}>
        <Box sx={{ pt: 4 }}>
          {/* Welcome section */}
          <Paper 
            elevation={0} 
            sx={{
              p: { xs: 2, sm: 3, md: 4 }, // Responsive padding
              mb: 4, 
              borderRadius: 3,
              ...glassStyles
            }}
          >
            <Typography 
              variant="h4" 
              component="h1" 
              gutterBottom 
              sx={{ 
                fontWeight: 600, 
                color: isDarkMode ? 'white' : 'rgb(29, 170, 189)',
                fontSize: { xs: '1.5rem', sm: '2.0rem', md: '2.2rem' },
                overflowWrap: 'break-word', // Allow long words/emails to break
                wordBreak: 'break-word' // Adding word-break as well for broader compatibility
              }}
            >
              Welcome to Othain Employee Self-Service
              {displayName && `, ${displayName}`}
            </Typography>
            <Typography 
                variant="body1" 
                paragraph 
                sx={{ 
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'inherit',
                    fontSize: { xs: '0.8rem', sm: '1rem'} // Slightly smaller body text on xs
                }}
            >
              Your interactive Employee Self-Service designed to help with policies, benefits, workplace questions, and IT related issues.
              Start a conversation to get instant answers to your HR and IT related questions.
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
                ...glassStyles3,
                color: isDarkMode ? 'white' : 'white',
                '&:hover': {
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  bgcolor: isDarkMode ? 'rgba(30,30,30,0.25)' : 'rgba(255,255,255,0.25)'
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
              ...glassStyles,
              textAlign: 'center', // Center align content
            }}
          >
            <OndemandVideoIcon sx={{ fontSize: 48, color: isDarkMode ? 'rgba(28, 189, 127, 1)' : 'rgba(28, 189, 127, 1)', mb: 2 }} />
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', sm: '2.0rem', md: '2.2rem' }, color: isDarkMode ? 'white' : 'rgb(18, 148, 126)' }}>
            New to Othain or just need a refresher?
            </Typography>
            <Typography variant="body1" paragraph sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'text.secondary', maxWidth: '700px', margin: '0 auto 16px auto', fontSize: { xs: '0.8rem', sm: '1rem'} }}>
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
                px: 4,
                py: 1.3,
                borderRadius: 2,
                ...glassStyles2,
                color: isDarkMode ? 'white' : 'white',
                '&:hover': {
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  bgcolor: isDarkMode ? 'rgba(30,30,30,0.25)' : 'rgba(255,255,255,0.25)'
                }
              }}
            >
              Watch Onboarding Video
            </Button>
          </Paper>

          {/* Quick Links Section */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3, md: 4 },
              mb: 4,
              borderRadius: 3,
              ...glassStyles
            }}
          >
            <Typography
              variant="h5"
              component="h2"
              marginBottom={2}
              marginTop={-1}
              gutterBottom
              sx={{ fontWeight: 600, color: isDarkMode ? 'white' : 'rgb(18, 148, 126)', textAlign: 'center' }}
            >
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
              {quickLinks.map(link => (
                <Button
                  key={link.url}
                  variant="outlined"
                  startIcon={<LaunchIcon />}
                  onClick={() => window.open(link.url, '_blank')}
                  sx={{
                    ...glassStyles,
                    color: isDarkMode ? 'white' : 'inherit',
                    borderRadius: 20,
                    px: { xs: 1.5, sm: 2.5 },
                    py: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '0.75rem', sm: '1rem' },
                    '&:hover': {
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      bgcolor: isDarkMode ? 'rgba(30,30,30,0.25)' : 'rgba(255,255,255,0.25)'
                    }
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default Home; 