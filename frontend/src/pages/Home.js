import React, { useState } from 'react';
import { Container, Typography, Paper, Box, Button, Grid, Card, CardContent, Avatar, Chip, Fade, Slide } from '@mui/material';
import { 
  Chat as ChatIcon, 
  QuestionAnswer as QuestionAnswerIcon, 
  Info as InfoIcon, 
  OndemandVideo as OndemandVideoIcon, 
  Launch as LaunchIcon,
  Rocket as RocketIcon,
  Business as BusinessIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  MenuBook as MenuBookIcon,
  BeachAccess as BeachAccessIcon,
  AccountBalance as AccountBalanceIcon,
  Security as SecurityIcon,
  Support as SupportIcon,
  Dashboard as DashboardIcon,
  ConfirmationNumber as TicketIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { motion } from 'framer-motion';
import { useTheme } from '@mui/material/styles';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const theme = useTheme();
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
        return user.email; 
      }
      return user.email;
    }
    return '';
  };

  const displayName = getDisplayName();

  // Enhanced quick links with icons and categories
  const quickLinks = [
    { 
      label: 'IT Support Portal', 
      url: 'https://othaingroup.atlassian.net/servicedesk/customer/portal/7/group/-1',
      icon: SupportIcon,
      category: 'Support',
      color: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
    },
    { 
      label: 'Othain Website', 
      url: 'https://www.othain.com/',
      icon: BusinessIcon,
      category: 'Company',
      color: 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
    },
    { 
      label: 'Training Sessions', 
      url: 'https://othainsoftindia.sharepoint.com/sites/Trainings/SitePages/LearningTeamHome.aspx',
      icon: SchoolIcon,
      category: 'Learning',
      color: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'
    },
    { 
      label: 'Goals & PMS', 
      url: 'https://othainsoft.keka.com/#/org/documents/org/folder/5823/document/40977',
      icon: AssignmentIcon,
      category: 'Performance',
      color: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)'
    },
    { 
      label: 'Employee Handbook', 
      url: 'https://othainsoft.keka.com/#/org/documents/org/folder/5823/document/30082',
      icon: MenuBookIcon,
      category: 'Resources',
      color: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
    },
    { 
      label: 'Request Leave', 
      url: 'https://othainsoft.keka.com/#/me/leave/summary',
      icon: BeachAccessIcon,
      category: 'HR',
      color: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)'
    },
    { 
      label: 'View Pay Slips', 
      url: 'https://othainsoft.keka.com/#/myfinances/pay/payslips',
      icon: AccountBalanceIcon,
      category: 'Finance',
      color: 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
    },
    { 
      label: 'POSH Policy', 
      url: 'https://othainsoft.keka.com/#/org/documents/org/folder/5823/document/35440',
      icon: SecurityIcon,
      category: 'Policy',
      color: 'linear-gradient(135deg, #9333ea 0%, #a855f7 100%)'
    }
  ];

  // Main action cards
  const actionCards = [
    {
      title: 'ESS Assistant',
      description: 'Get instant answers to your HR and IT questions with our intelligent chatbot',
      icon: ChatIcon,
      action: () => navigate('/chat'),
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      shadowColor: 'rgba(59, 130, 246, 0.3)'
    },
    {
      title: 'Support Tickets',
      description: 'Create and manage support tickets for IT, HR, and other requests',
      icon: TicketIcon,
      action: () => navigate('/tickets'),
      gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      shadowColor: 'rgba(5, 150, 105, 0.3)'
    },
    {
      title: 'Onboarding Guide',
      description: 'New to Othain? Watch our comprehensive onboarding video and learn about company policies, procedures, and culture',
      icon: OndemandVideoIcon,
      action: () => navigate('/onboarding'),
      gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
      shadowColor: 'rgba(234, 88, 12, 0.3)'
    }
  ];

  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.6,
        ease: "easeOut"
      }
    })
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (i) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: isDarkMode 
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Enhanced background decoration */}
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDarkMode 
          ? 'radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)'
          : 'radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)',
        zIndex: -1
      }} />

      <Container maxWidth="xl" sx={{ 
        pt: { xs: 2, sm: 3, md: 4 }, 
        pb: { xs: 2, sm: 3, md: 4 }, 
        position: 'relative', 
        zIndex: 1 
      }}>
        {/* Hero Section */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <Box sx={{ 
            textAlign: 'center', 
            mb: 4,
            position: 'relative'
          }}>
            {/* Hero background decoration */}
            <Box sx={{
              position: 'absolute',
              top: '-50%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '400px',
              height: '200px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: '50%',
              opacity: 0.05,
              filter: 'blur(60px)',
              zIndex: -1
            }} />

            <Box sx={{
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
              border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Welcome icon */}
              <Box sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                borderRadius: '50%',
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem auto',
                boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
                animation: 'pulse 3s infinite'
              }}>
                <RocketIcon sx={{ fontSize: '2rem', color: 'white' }} />
              </Box>

              <Typography 
                variant="h2" 
                component="h1" 
                sx={{ 
                  fontWeight: 800,
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                  marginBottom: '0.75rem',
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)'
                    : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  lineHeight: 1.2
                }}
              >
                Welcome to Othain
                {displayName && (
                  <Box component="span" sx={{ display: 'block', fontSize: '0.7em', mt: 0.5 }}>
                    Hello, {displayName}! 👋
                  </Box>
                )}
              </Typography>
              
              <Typography 
                variant="h6" 
                sx={{ 
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  fontWeight: 500,
                  maxWidth: '700px',
                  margin: '0 auto 1.5rem auto',
                  lineHeight: 1.6,
                  fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' }
                }}
              >
                Your comprehensive Employee Self-Service platform for HR support, IT assistance, and workplace resources
              </Typography>

              <Chip 
                label="✨ Powered by AI" 
                sx={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  height: '32px',
                  borderRadius: '16px',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.3)'
                }}
              />
            </Box>
          </Box>
        </motion.div>

        {/* Main Action Cards */}
        <motion.div
          custom={1}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <Typography 
            variant="h5" 
            component="h2" 
            sx={{ 
              textAlign: 'center',
              fontWeight: 700,
              marginBottom: '2rem',
              color: isDarkMode ? '#f1f5f9' : '#1e293b',
              position: 'relative',
              zIndex: 1
            }}
          >
            Get Started
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {actionCards.map((card, index) => (
              <Grid item xs={12} md={4} key={card.title}>
                <motion.div
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                >
                  <Card
                    onClick={card.action}
                    sx={{
                      height: '100%',
                      minHeight: '280px',
                      cursor: 'pointer',
                      borderRadius: '20px',
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                      backdropFilter: 'blur(20px)',
                      border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                      boxShadow: `0 10px 30px ${card.shadowColor}`,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      '&:hover': {
                        transform: 'translateY(-6px) scale(1.02)',
                        boxShadow: `0 15px 35px ${card.shadowColor}`
                      }
                    }}
                  >
                    {/* Card shine effect */}
                    <Box sx={{
                      position: 'absolute',
                      top: '-50%',
                      left: '-50%',
                      width: '200%',
                      height: '200%',
                      background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
                      transform: 'rotate(45deg)',
                      transition: 'all 0.6s ease',
                      opacity: 0,
                      '.MuiCard-root:hover &': {
                        opacity: 1,
                        transform: 'translateX(100%) translateY(100%) rotate(45deg)'
                      }
                    }} />

                    <CardContent sx={{ 
                      p: 3, 
                      textAlign: 'center', 
                      position: 'relative', 
                      zIndex: 1,
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <Box sx={{
                        background: card.gradient,
                        borderRadius: '16px',
                        width: '60px',
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem auto',
                        boxShadow: `0 8px 25px ${card.shadowColor}`
                      }}>
                        <card.icon sx={{ fontSize: '2rem', color: 'white' }} />
                      </Box>
                      
                      <Typography 
                        variant="h6" 
                        component="h3" 
                        sx={{ 
                          fontWeight: 700,
                          marginBottom: '0.75rem',
                          color: isDarkMode ? '#f3f4f6' : '#1f2937'
                        }}
                      >
                        {card.title}
                      </Typography>
                      
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: isDarkMode ? '#d1d5db' : '#6b7280',
                          lineHeight: 1.6
                        }}
                      >
                        {card.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>

        {/* Quick Links Section */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <Box sx={{
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
            border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Section background decoration */}
            <Box sx={{
              position: 'absolute',
              top: '-30%',
              right: '-20%',
              width: '300px',
              height: '300px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '50%',
              opacity: 0.05,
              filter: 'blur(60px)',
              zIndex: 0
            }} />

            <Typography 
              variant="h5" 
              component="h2" 
              sx={{ 
                textAlign: 'center',
                fontWeight: 700,
                marginBottom: '2rem',
                color: isDarkMode ? '#f1f5f9' : '#1e293b',
                position: 'relative',
                zIndex: 1
              }}
            >
              Quick Access Links
            </Typography>
            
            <Grid container spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
              {quickLinks.map((link, index) => (
                <Grid item xs={12} sm={6} md={3} key={link.url}>
                  <motion.div
                    custom={index}
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                  >
                    <Button
                      onClick={() => window.open(link.url, '_blank')}
                      sx={{
                        width: '100%',
                        height: '100px',
                        borderRadius: '16px',
                        background: isDarkMode 
                          ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.75,
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
                          background: link.color
                        },
                        '&:hover .link-icon': {
                          color: 'white !important'
                        },
                        '&:hover .link-text': {
                          color: 'white !important'
                        },
                        '&:hover .link-category': {
                          color: 'rgba(255, 255, 255, 0.8) !important'
                        }
                      }}
                    >
                      <link.icon 
                        className="link-icon"
                        sx={{ 
                          fontSize: '1.75rem', 
                          color: isDarkMode ? '#94a3b8' : '#6b7280',
                          transition: 'color 0.3s ease'
                        }} 
                      />
                      <Typography 
                        className="link-text"
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600,
                          color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          textAlign: 'center',
                          fontSize: '0.8rem',
                          transition: 'color 0.3s ease'
                        }}
                      >
                        {link.label}
                      </Typography>
                      <Chip 
                        className="link-category"
                        label={link.category}
                        size="small"
                        sx={{
                          fontSize: '0.7rem',
                          height: '18px',
                          color: isDarkMode ? '#9ca3af' : '#6b7280',
                          backgroundColor: 'transparent',
                          border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </Button>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Box>
        </motion.div>
      </Container>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
    </Box>
  );
};

export default Home; 