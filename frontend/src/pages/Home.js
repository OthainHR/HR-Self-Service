import React, { useState, useEffect, useRef } from 'react';
import { Container, Typography, Paper, Box, Button, Grid, Card, CardContent, Avatar, Chip, Fade, Slide, CircularProgress, TextField, InputAdornment } from '@mui/material';
import { 
  Chat as ChatIcon, 
  QuestionAnswer as QuestionAnswerIcon, 
  Info as InfoIcon, 
  OndemandVideo as OndemandVideoIcon, 
  AdsClick as AdsClickIcon,
  Launch as LaunchIcon,
  Rocket as RocketIcon,
  SmartToy as SmartToyIcon,
  Business as BusinessIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  MenuBook as MenuBookIcon,
  BeachAccess as BeachAccessIcon,
  AccountBalance as AccountBalanceIcon,
  Security as SecurityIcon,
  Support as SupportIcon,
  Dashboard as DashboardIcon,
  ConfirmationNumber as TicketIcon,
  DirectionsCar as DirectionsCarIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { motion } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import { supabase } from '../services/supabase';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const theme = useTheme();
  const isAdmin = user?.user_metadata?.role === 'admin';
  const isHrAdmin = user?.email === 'hr@othainsoft.com';
  const [isUserWhitelisted, setIsUserWhitelisted] = useState(false);
  const [loadingWhitelistStatus, setLoadingWhitelistStatus] = useState(true);
  const [cabServiceGlobalVisibility, setCabServiceGlobalVisibility] = useState(true);
  const [loadingCabServiceGlobalVisibility, setLoadingCabServiceGlobalVisibility] = useState(true);
  
  // Mini chat state
  const [miniChatInput, setMiniChatInput] = useState('');
  const [isSubmittingMiniChat, setIsSubmittingMiniChat] = useState(false);
  const miniChatInputRef = useRef(null);

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

  useEffect(() => {
    const checkWhitelist = async () => {
      if (!user) { setLoadingWhitelistStatus(false); return; }
      if (isHrAdmin) { setIsUserWhitelisted(true); setLoadingWhitelistStatus(false); return; }
      try {
        setLoadingWhitelistStatus(true);
        const { data, error } = await supabase
          .from('cab_booking_whitelist')
          .select('email')
          .eq('email', user.email)
          .maybeSingle();
        if (error) throw error;
        setIsUserWhitelisted(!!data);
      } catch (err) {
        console.error('Error checking whitelist status in Home:', err);
        setIsUserWhitelisted(false);
      } finally {
        setLoadingWhitelistStatus(false);
      }
    };
    checkWhitelist();
  }, [user, isHrAdmin]);

  // Auto-focus the mini chat input when component mounts
  useEffect(() => {
    if (miniChatInputRef.current) {
      miniChatInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const fetchCabServiceVisibility = async () => {
      setLoadingCabServiceGlobalVisibility(true);
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('is_enabled')
          .eq('key', 'cab_service_visibility')
          .single();
        if (error) {
          console.error('Error fetching cab service visibility in Home:', error);
          setCabServiceGlobalVisibility(true); // Default to true
        } else {
          setCabServiceGlobalVisibility(data ? data.is_enabled : true);
        }
      } catch (err) {
        console.error('Exception fetching cab service visibility in Home:', err);
        setCabServiceGlobalVisibility(true); // Default to true
      } finally {
        setLoadingCabServiceGlobalVisibility(false);
      }
    };
    fetchCabServiceVisibility();
  }, []);

  // Mini chat handlers
  const handleMiniChatSubmit = async (e) => {
    e.preventDefault();
    if (!miniChatInput.trim() || isSubmittingMiniChat) return;
    
    setIsSubmittingMiniChat(true);
    
    // Store the message in sessionStorage to auto-fill in chat page
    sessionStorage.setItem('autoFillMessage', miniChatInput.trim());
    sessionStorage.setItem('autoSubmitChat', 'true');
    
    // Navigate to chat page
    navigate('/chat');
  };

  const handlePresetQuestion = (question) => {
    setMiniChatInput(question);
    // Auto-submit after a short delay
    setTimeout(() => {
      sessionStorage.setItem('autoFillMessage', question);
      sessionStorage.setItem('autoSubmitChat', 'true');
      navigate('/chat');
    }, 100);
  };

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
      url: 'https://othainsoft.keka.com/#/me/performance/',
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
      title: 'ESS AI Agent',
      description: 'Get instant answers to your HR and IT questions with our intelligent chatbot',
      icon: SmartToyIcon,
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
      title: 'Book A Cab',
      description: 'Book transportation for late night shifts with pickup and drop-off locations',
      icon: DirectionsCarIcon,
      action: () => navigate('/cab-service'),
      gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
      shadowColor: 'rgba(220, 38, 38, 0.3)'
    },
    {
      title: 'Onboarding Guide',
      description: 'New to Othain? Watch our comprehensive onboarding video and learn about company policies, procedures, and culture',
      icon: OndemandVideoIcon,
      action: () => navigate('/onboarding'),
      gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
      shadowColor: 'rgba(234, 88, 12, 0.3)'
    }, 
    {
      title: 'My Performance',
      description: 'View your performance goals, feedback, and ratings',
      icon: AdsClickIcon,
      action: () => window.open('https://othainsoft.keka.com/#/me/performance/', '_blank'),
      gradient: 'linear-gradient(135deg,rgb(171, 12, 234) 0%,rgb(177, 22, 249) 100%)',
      shadowColor: 'rgba(182, 12, 234, 0.3)'
    },
    {
      title: 'My Pay',
      description: 'View your pay slips, salary details, and other financial information',
      icon: AccountBalanceIcon,
      action: () => window.open('https://othainsoft.keka.com/#/myfinances/pay/salary', '_blank'),
      gradient: 'linear-gradient(135deg,rgb(12, 64, 234) 0%,rgb(12, 104, 234) 100%)',
      shadowColor: 'rgba(12, 64, 234, 0.3)'
    },
    {
      title: 'My Leave',
      description: 'View your leave balance, apply for leave, and view your leave history',
      icon: BeachAccessIcon,
      action: () => window.open('https://othainsoft.keka.com/#/me/leave/summary', '_blank'),
      gradient: 'linear-gradient(135deg,rgb(234, 12, 149) 0%,rgb(234, 12, 123) 100%)',
      shadowColor: 'rgba(234, 12, 167, 0.3)'
    }

  ];

  // Prepare main grid cards, excluding 'Book A Cab'
  const gridCards = actionCards.filter(card => card.title !== 'Book A Cab');
  // Find the 'Book A Cab' card to render separately
  const bookACabCard = actionCards.find(card => card.title === 'Book A Cab');
  const canUserAccessCabService = cabServiceGlobalVisibility && (isUserWhitelisted || isHrAdmin);

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


        {/* Mini Chat Interface */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <Box sx={{
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
            border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            mb: 4
          }}>
            {/* Mini chat background decoration */}
            <Box sx={{
              position: 'absolute',
              top: '-30%',
              right: '-20%',
              width: '200px',
              height: '200px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: '50%',
              opacity: 0.05,
              filter: 'blur(40px)',
              zIndex: 0
            }} />

            <Box sx={{ position: 'relative', zIndex: 1 }}>
              {/* Header */}  
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                {/* Logo */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
                >
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    mb: 2
                  }}>
                    <img 
                      src={isDarkMode ? '/othainlogopreview.png' : '/OthainOcolor.png'}
                      alt="Othain Logo"
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))'
                      }} 
                    />
                  </Box>
                </motion.div>
                
                {displayName && (
                  <Typography variant="h5" sx={{ 
                    fontWeight: 600,
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    mb: 1
                  }}>
                    Hello, {displayName}! <span style={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>👋</span>
                  </Typography>
                )}
                <Typography variant="h4" sx={{ 
                  fontWeight: 700,
                  color: isDarkMode ? '#f1f5f9' : '#1e293b',
                  mb: 1,
                  fontSize: {
                    xs: '1.5rem', // Mobile: smaller size
                    sm: '2rem',   // Small tablets
                    md: '2.125rem' // Desktop: original h4 size
                  }
                }}>
                  How can I help you today?
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  fontWeight: 500
                }}>
                  Ask me anything about HR, IT, or workplace policies
                </Typography>
              </Box>

              {/* Chat Input */}
              <Box component="form" onSubmit={handleMiniChatSubmit} sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Ask anything"
                  value={miniChatInput}
                  onChange={(e) => setMiniChatInput(e.target.value)}
                  disabled={isSubmittingMiniChat}
                  inputRef={miniChatInputRef}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '20px',
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                      backdropFilter: 'blur(10px)',
                      fontSize: '1rem',
                      transition: 'all 0.2s ease',
                      border: isDarkMode ? '2px solid rgba(75, 85, 99, 0.5)' : '2px solid rgba(226, 232, 240, 0.5)',
                      '&:hover': {
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
                        borderColor: '#6366f1'
                      },
                      '&.Mui-focused': {
                        boxShadow: '0 8px 25px rgba(99, 102, 241, 0.2)',
                        borderColor: '#6366f1'
                      }
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none'
                    },
                    '& .MuiInputBase-input': {
                      color: isDarkMode ? '#f1f5f9' : '#1e293b',
                      '&::placeholder': {
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        opacity: 1
                      }
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          type="submit"
                          disabled={!miniChatInput.trim() || isSubmittingMiniChat}
                          sx={{
                            borderRadius: '16px',
                            minWidth: '48px',
                            height: '48px',
                            background: !miniChatInput.trim() || isSubmittingMiniChat
                              ? (isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(226, 232, 240, 0.5)')
                              : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            color: 'white',
                            boxShadow: !miniChatInput.trim() || isSubmittingMiniChat
                              ? 'none'
                              : '0 6px 20px rgba(59, 130, 246, 0.3)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              background: !miniChatInput.trim() || isSubmittingMiniChat
                                ? (isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(226, 232, 240, 0.5)')
                                : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                              transform: !miniChatInput.trim() || isSubmittingMiniChat ? 'none' : 'translateY(-2px)',
                              boxShadow: !miniChatInput.trim() || isSubmittingMiniChat
                                ? 'none'
                                : '0 8px 25px rgba(59, 130, 246, 0.4)'
                            }
                          }}
                        >
                          {isSubmittingMiniChat ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            <SendIcon sx={{ fontSize: '1.125rem' }} />
                          )}
                        </Button>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>

              {/* Preset Questions */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ 
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  mb: 2,
                  fontWeight: 500
                }}>
                  Quick questions:
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 1,
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  {[
                    'What is the attendance policy at Othain?',
                    'How do I apply for leave?',
                    'When is salary credited each month?'
                  ].map((question, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + (index * 0.1), duration: 0.3 }}
                    >
                      <Button
                        variant="outlined"
                        onClick={() => handlePresetQuestion(question)}
                        disabled={isSubmittingMiniChat}
                        sx={{
                          borderRadius: '12px',
                          px: 2,
                          py: 1,
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          textTransform: 'none',
                          color: isDarkMode ? '#d1d5db' : '#374151',
                          background: isDarkMode 
                            ? 'rgba(55, 65, 81, 0.3)'
                            : 'rgba(255, 255, 255, 0.5)',
                          backdropFilter: 'blur(5px)',
                          border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(226, 232, 240, 0.5)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            background: isDarkMode 
                              ? 'rgba(75, 85, 99, 0.4)'
                              : 'rgba(255, 255, 255, 0.8)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                            borderColor: '#6366f1'
                          }
                        }}
                      >
                        {question}
                      </Button>
                    </motion.div>
                  ))}
                </Box>
              </Box>
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
            {gridCards.map((card, index) => (
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
                        {React.createElement(card.icon, { sx: { fontSize: '2rem', color: 'white' } })}
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
          {/* Centered Book A Cab Card */}
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mb: 6 }}> 
            {
              bookACabCard && (loadingWhitelistStatus || loadingCabServiceGlobalVisibility) ? (
                <Grid item xs={12} sm={10} md={8}>
                  <Card sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 150, background: 'transparent', boxShadow: 'none' }}>
                    <CircularProgress />
                  </Card>
                </Grid>
              ) : bookACabCard && canUserAccessCabService ? (
                <Grid item xs={12} sm={10} md={8} key={bookACabCard.title}>
                  <motion.div
                    custom={gridCards.length}
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                  >
                    <Card
                      onClick={bookACabCard.action}
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
                        boxShadow: `0 10px 30px ${bookACabCard.shadowColor}`,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        '&:hover': {
                          transform: 'translateY(-6px) scale(1.02)',
                          boxShadow: `0 15px 35px ${bookACabCard.shadowColor}`
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
                          background: bookACabCard.gradient,
                          borderRadius: '16px',
                          width: '60px',
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 1.5rem auto',
                          boxShadow: `0 8px 25px ${bookACabCard.shadowColor}`
                        }}>
                          {React.createElement(bookACabCard.icon, { sx: { fontSize: '2rem', color: 'white' } })}
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
                          {bookACabCard.title}
                        </Typography>
                        
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: isDarkMode ? '#d1d5db' : '#6b7280',
                            lineHeight: 1.6
                          }}
                        >
                          {bookACabCard.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ) : null
            }
          </Box>
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
    </Box>
  );
};

export default Home; 