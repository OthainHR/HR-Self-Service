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
  Send as SendIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import { supabase } from '../services/supabase';
import { profileService } from '../services/profileService';

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
  const [userProfilePicture, setUserProfilePicture] = useState(null);
  
  // Mini chat state
  const [miniChatInput, setMiniChatInput] = useState('');
  const [isSubmittingMiniChat, setIsSubmittingMiniChat] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const miniChatInputRef = useRef(null);

  // Animation states
  const [isVisible, setIsVisible] = useState(false);

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
    setIsVisible(true);
  }, []);

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

  // Auto-focus and cycling questions
  useEffect(() => {
    if (miniChatInputRef.current) {
      miniChatInputRef.current.focus();
    }
    
    // Cycle through preset questions
    const interval = setInterval(() => {
      setCurrentQuestionIndex((prev) => (prev + 1) % 3);
    }, 3000);
    
    return () => clearInterval(interval);
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
          setCabServiceGlobalVisibility(true);
        } else {
          setCabServiceGlobalVisibility(data ? data.is_enabled : true);
        }
      } catch (err) {
        console.error('Exception fetching cab service visibility in Home:', err);
        setCabServiceGlobalVisibility(true);
      } finally {
        setLoadingCabServiceGlobalVisibility(false);
      }
    };
    fetchCabServiceVisibility();
  }, []);

  // Fetch user profile picture
  useEffect(() => {
    const fetchUserProfilePicture = async () => {
      if (!user?.id) {
        setUserProfilePicture(null);
        return;
      }

      try {
        const profilePictureUrl = await profileService.getProfilePicture(user.id);
        setUserProfilePicture(profilePictureUrl);
      } catch (error) {
        console.error('Error fetching user profile picture in Home:', error);
        setUserProfilePicture(null);
      }
    };

    fetchUserProfilePicture();

    // Subscribe to profile changes to update home page in real-time
    let subscription = null;
    if (user?.id) {
      subscription = profileService.subscribeToProfileChanges(user.id, (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          setUserProfilePicture(payload.new?.profile_picture_url || null);
        } else if (payload.eventType === 'DELETE') {
          setUserProfilePicture(null);
        }
      });
    }

    return () => {
      if (subscription) {
        profileService.unsubscribeFromProfileChanges(subscription);
      }
    };
  }, [user?.id]);

  // Mini chat handlers
  const handleMiniChatSubmit = async (e) => {
    e.preventDefault();
    if (!miniChatInput.trim() || isSubmittingMiniChat) return;
    
    setIsSubmittingMiniChat(true);
    
    sessionStorage.setItem('autoFillMessage', miniChatInput.trim());
    sessionStorage.setItem('autoSubmitChat', 'true');
    
    navigate('/chat');
  };

  const handlePresetQuestion = (question) => {
    setMiniChatInput(question);
    setTimeout(() => {
      sessionStorage.setItem('autoFillMessage', question);
      sessionStorage.setItem('autoSubmitChat', 'true');
      navigate('/chat');
    }, 100);
  };

  // Enhanced quick links with better categorization
  const quickLinks = [
    { 
      label: 'IT Support Portal', 
      url: 'https://othaingroup.atlassian.net/servicedesk/customer/portal/7/group/-1',
      icon: SupportIcon,
      category: 'Support',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      hoverGradient: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)'
    },
    { 
      label: 'Othain Website', 
      url: 'https://www.othain.com/',
      icon: BusinessIcon,
      category: 'Company',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      hoverGradient: 'linear-gradient(135deg, #ec4899 0%, #ef4444 100%)'
    },
    { 
      label: 'Training Sessions', 
      url: 'https://othainsoftindia.sharepoint.com/sites/Trainings/SitePages/LearningTeamHome.aspx',
      icon: SchoolIcon,
      category: 'Learning',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      hoverGradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)'
    },
    { 
      label: 'Goals & PMS', 
      url: 'https://othainsoft.keka.com/#/me/performance/',
      icon: TrendingUpIcon,
      category: 'Performance',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      hoverGradient: 'linear-gradient(135deg, #f59e0b 0%, #eab308 100%)'
    },
    { 
      label: 'Employee Handbook', 
      url: 'https://othainsoft.keka.com/#/org/documents/org/folder/5823/document/30082',
      icon: MenuBookIcon,
      category: 'Resources',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      hoverGradient: 'linear-gradient(135deg, #14b8a6 0%, #f472b6 100%)'
    },
    { 
      label: 'Request Leave', 
      url: 'https://othainsoft.keka.com/#/me/leave/summary',
      icon: BeachAccessIcon,
      category: 'HR',
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      hoverGradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)'
    },
    { 
      label: 'View Pay Slips', 
      url: 'https://othainsoft.keka.com/#/myfinances/pay/payslips',
      icon: AccountBalanceIcon,
      category: 'Finance',
      gradient: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
      hoverGradient: 'linear-gradient(135deg, #a855f7 0%, #eab308 100%)'
    },
    { 
      label: 'POSH Policy', 
      url: 'https://othainsoft.keka.com/#/org/documents/org/folder/5823/document/35440',
      icon: SecurityIcon,
      category: 'Policy',
      gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
      hoverGradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)'
    }
  ];

  // Enhanced action cards with better descriptions and new gradients
  const actionCards = [
    {
      title: 'ESS AI Agent',
      description: 'Get instant, intelligent answers to your HR and IT questions powered by advanced AI',
      icon: SmartToyIcon,
      action: () => navigate('/chat'),
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      shadowColor: 'rgba(102, 126, 234, 0.4)',
      accent: '#667eea'
    },
    {
      title: 'Support Tickets',
      description: 'Create, track, and manage support tickets for IT, HR, and administrative requests',
      icon: TicketIcon,
      action: () => navigate('/tickets'),
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      shadowColor: 'rgba(240, 147, 251, 0.4)',
      accent: '#f093fb'
    },
    {
      title: 'Book A Cab',
      description: 'Reserve transportation for late shifts with flexible pickup and drop-off locations',
      icon: DirectionsCarIcon,
      action: () => navigate('/cab-service'),
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      shadowColor: 'rgba(79, 172, 254, 0.4)',
      accent: '#4facfe'
    },
    {
      title: 'Onboarding Guide',
      description: 'Comprehensive onboarding resources covering company culture, policies, and procedures',
      icon: OndemandVideoIcon,
      action: () => navigate('/onboarding'),
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      shadowColor: 'rgba(250, 112, 154, 0.4)',
      accent: '#fa709a'
    }, 
    {
      title: 'My Performance',
      description: 'Access your performance dashboard with goals, feedback, and career development insights',
      icon: AdsClickIcon,
      action: () => window.open('https://othainsoft.keka.com/#/me/performance/', '_blank'),
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      shadowColor: 'rgba(168, 237, 234, 0.4)',
      accent: '#a8edea'
    },
    {
      title: 'My Pay',
      description: 'View detailed pay information, salary breakdowns, and financial statements',
      icon: AccountBalanceIcon,
      action: () => window.open('https://othainsoft.keka.com/#/myfinances/pay/salary', '_blank'),
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      shadowColor: 'rgba(255, 236, 210, 0.4)',
      accent: '#ffecd2'
    },
    {
      title: 'My Leave',
      description: 'Manage leave applications, view balance, and track your time-off history',
      icon: BeachAccessIcon,
      action: () => window.open('https://othainsoft.keka.com/#/me/leave/summary', '_blank'),
      gradient: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
      shadowColor: 'rgba(210, 153, 194, 0.4)',
      accent: '#d299c2'
    }
  ];

  const gridCards = actionCards.filter(card => card.title !== 'Book A Cab');
  const bookACabCard = actionCards.find(card => card.title === 'Book A Cab');
  const canUserAccessCabService = cabServiceGlobalVisibility && (isUserWhitelisted || isHrAdmin);

  const presetQuestions = [
    'What is the attendance policy at Othain?',
    'How do I apply for leave?',
    'When is salary credited each month?'
  ];

  // Enhanced animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.25, 0, 1]
      }
    }
  };

  const cardHoverVariants = {
    hover: {
      scale: 1.05,
      y: -8,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.25, 0, 1]
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: isDarkMode 
          ? 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)'
          : 'radial-gradient(ellipse at top, #f8fafc 0%, #e2e8f0 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Enhanced animated background */}
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDarkMode 
          ? `
            radial-gradient(circle at 25% 25%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)
          `
          : `
            radial-gradient(circle at 25% 25%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.06) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.04) 0%, transparent 50%)
          `,
        zIndex: -1
      }} />

      {/* Floating particles animation */}
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 0
      }}>
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: isDarkMode 
                ? 'linear-gradient(45deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3))'
                : 'linear-gradient(45deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))',
              left: `${20 + i * 15}%`,
              top: `${10 + i * 10}%`
            }}
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
              opacity: [0.3, 0.8, 0.3]
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </Box>

      <Container maxWidth="xl" sx={{ 
        pt: { xs: 2, sm: 3, md: 4 }, 
        pb: { xs: 2, sm: 3, md: 4 }, 
        position: 'relative', 
        zIndex: 1,
        // Remove transform scaling to fix snapping and layout issues
        // Use responsive sizing instead
        maxWidth: { xs: 'xl', sm: 'xl', md: 'xl', lg: 'xl' },
        // Responsive padding that creates zoomed out effect
        px: { xs: 2, sm: 4, md: 6, lg: 8 },
        // Ensure proper height management
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <AnimatePresence>
          {isVisible && (
        <motion.div
              variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
              {/* Enhanced Mini Chat Interface */}
              <motion.div variants={itemVariants}>
          <Box sx={{ 
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                  backdropFilter: 'blur(25px)',
                  borderRadius: '32px',
                  padding: { xs: '2rem', sm: '3rem', md: '4rem', lg: '5rem' },
                  border: isDarkMode 
                    ? '1px solid rgba(148, 163, 184, 0.1)' 
                    : '1px solid rgba(226, 232, 240, 0.3)',
                  boxShadow: isDarkMode
                    ? '0 25px 50px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                    : '0 25px 50px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                  position: 'relative',
                  overflow: 'hidden',
                  mb: { xs: 4, sm: 5, md: 6, lg: 7 }
                }}>
                  {/* Enhanced background decoration */}
            <Box sx={{
              position: 'absolute',
              top: '-50%',
                    right: '-30%',
                    width: '300px',
                    height: '300px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '50%',
                    opacity: 0.06,
              filter: 'blur(60px)',
                    zIndex: 0
                  }} />

                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    {/* Enhanced Header */}  
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.8, ease: [0.25, 0.25, 0, 1] }}
                      >
            <Box sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          mb: 3
                        }}>
              <Box sx={{
                            position: 'relative',
                            display: 'inline-block'
                          }}>
                            <img 
                              src={isDarkMode ? '/othainlogopreview.png' : '/OthainOcolor.png'}
                              alt="Othain Logo"
                              style={{ 
                                width: '50px', 
                                height: '50px', 
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 8px 25px rgba(0, 0, 0, 0.15))',
                                marginBottom: '-5px'
                              }} 
                            />
                            <motion.div
                              style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                width: '20px',
                                height: '20px',
                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, 180, 360]
                              }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            >
                              <StarIcon sx={{ fontSize: '14px', color: 'white' }} />
                            </motion.div>
              </Box>
                        </Box>
                      </motion.div>
                      
                      {/* User Profile Picture */}
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.6, ease: [0.25, 0.25, 0, 1] }}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'center',
                          marginBottom: '1.5rem'
                        }}
                      >
                        <Avatar
                          src={userProfilePicture}
                          sx={{
                            width: { xs: 100, sm: 100, md: 100 },
                            height: { xs: 100, sm: 100, md: 100 },
                            fontSize: '2.5rem',
                            fontWeight: 700,
                            background: userProfilePicture
                              ? 'none'
                              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            boxShadow: isDarkMode
                              ? 'none'
                              : 'none',
                            border: `4px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(255, 255, 255, 0.9)'}`,
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'hidden',
                            '&:hover': {
                              transform: 'scale(1.05)',
                              boxShadow: isDarkMode
                                ? 'none'
                                : 'none'
                            },
                            // Ensure circular mask clips the image
                          }}
                        >
                          {!userProfilePicture && displayName.charAt(0).toUpperCase()}
                        </Avatar>
                      </motion.div>
                      
                      {displayName && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6, duration: 0.6 }}
                        >
                          <Typography variant="h5" sx={{ 
                            fontWeight: 600,
                            color: isDarkMode ? '#f1f5f9' : '#1e293b',
                            mb: 1,
                            fontSize: { xs: '1.25rem', sm: '1.5rem' }
                          }}>
                            Hello, {displayName}! 
                            <motion.span
                              animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                              transition={{ delay: 1, duration: 0.8 }}
                              style={{ display: 'inline-block', marginLeft: '8px' }}
                            >
                              👋
                            </motion.span>
                          </Typography>
                        </motion.div>
                      )}
                      
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.6 }}
                      >
                        <Typography variant="h4" sx={{ 
                  fontWeight: 800,
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)'
                    : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                          backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                          mb: 1,
                          fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' }
                        }}>
                          How can I help you today?
              </Typography>
                        <Typography variant="body1" sx={{ 
                          color: isDarkMode ? '#94a3b8' : '#64748b',
                          fontWeight: 500,
                          fontSize: '1.1rem'
                        }}>
                          Ask me anything about HR, IT, or workplace policies
                        </Typography>
                      </motion.div>
                    </Box>

                    {/* Enhanced Chat Input */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.0, duration: 0.6 }}
                    >
                      <Box component="form" onSubmit={handleMiniChatSubmit} sx={{ mb: 4 }}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          placeholder="Ask anything..."
                          value={miniChatInput}
                          onChange={(e) => setMiniChatInput(e.target.value)}
                          disabled={isSubmittingMiniChat}
                          inputRef={miniChatInputRef}
                sx={{ 
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '24px',
                              background: isDarkMode 
                                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                              backdropFilter: 'blur(15px)',
                              fontSize: '1.1rem',
                              padding: '8px',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              border: isDarkMode 
                                ? '2px solid rgba(148, 163, 184, 0.2)' 
                                : '2px solid rgba(226, 232, 240, 0.4)',
                              '&:hover': {
                                boxShadow: isDarkMode
                                  ? '0 12px 30px rgba(0, 0, 0, 0.2)'
                                  : '0 12px 30px rgba(0, 0, 0, 0.08)',
                                borderColor: '#667eea',
                                transform: 'translateY(-2px)'
                              },
                              '&.Mui-focused': {
                                boxShadow: isDarkMode
                                  ? '0 15px 35px rgba(102, 126, 234, 0.3)'
                                  : '0 15px 35px rgba(102, 126, 234, 0.2)',
                                borderColor: '#667eea',
                                transform: 'translateY(-2px)'
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
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button
                                    type="submit"
                                    disabled={!miniChatInput.trim() || isSubmittingMiniChat}
                sx={{
                                      borderRadius: '20px',
                                      minWidth: '52px',
                                      height: '52px',
                                      background: !miniChatInput.trim() || isSubmittingMiniChat
                                        ? (isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(226, 232, 240, 0.5)')
                                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                                      boxShadow: !miniChatInput.trim() || isSubmittingMiniChat
                                        ? 'none'
                                        : '0 8px 25px rgba(102, 126, 234, 0.4)',
                                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                      '&:hover': {
                                        background: !miniChatInput.trim() || isSubmittingMiniChat
                                          ? (isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(226, 232, 240, 0.5)')
                                          : 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                                        transform: !miniChatInput.trim() || isSubmittingMiniChat ? 'none' : 'translateY(-2px)',
                                        boxShadow: !miniChatInput.trim() || isSubmittingMiniChat
                                          ? 'none'
                                          : '0 12px 30px rgba(102, 126, 234, 0.5)'
                                      }
                                    }}
                                  >
                                    {isSubmittingMiniChat ? (
                                      <CircularProgress size={22} color="inherit" />
                                    ) : (
                                      <SendIcon sx={{ fontSize: '1.25rem' }} />
                                    )}
                                  </Button>
                                </motion.div>
                              </InputAdornment>
                            )
                          }}
                        />
          </Box>
        </motion.div>

                    {/* Enhanced Preset Questions with Animation */}
        <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2, duration: 0.6 }}
                    >
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body1" sx={{ 
                          color: isDarkMode ? '#94a3b8' : '#64748b',
                          mb: 3,
                          fontWeight: 600
                        }}>
                          Popular questions:
                        </Typography>
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: { xs: 'column', sm: 'row' },
                          gap: 2,
                          justifyContent: 'center',
                          flexWrap: 'wrap'
                        }}>
                          {presetQuestions.map((question, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 1.2 + (index * 0.1), duration: 0.5 }}
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Button
                                variant="outlined"
                                onClick={() => handlePresetQuestion(question)}
                                disabled={isSubmittingMiniChat}
                                sx={{
                                  borderRadius: '16px',
                                  px: 3,
                                  py: 1.5,
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  textTransform: 'none',
                                  color: isDarkMode ? '#e2e8f0' : '#334155',
                                  background: isDarkMode 
                                    ? 'linear-gradient(135deg, rgba(51, 65, 85, 0.4) 0%, rgba(75, 85, 99, 0.4) 100%)'
                                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
                                  backdropFilter: 'blur(10px)',
                                  border: isDarkMode 
                                    ? '1px solid rgba(148, 163, 184, 0.2)' 
                                    : '1px solid rgba(226, 232, 240, 0.4)',
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    borderColor: '#667eea',
                                    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
                                  },
                                  '&:before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: '-100%',
                                    width: '100%',
                                    height: '100%',
                                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                                    transition: 'left 0.5s',
                                  },
                                  '&:hover:before': {
                                    left: '100%'
                                  }
                                }}
                              >
                                {question}
                              </Button>
                            </motion.div>
                          ))}
                        </Box>
                      </Box>
                    </motion.div>
                  </Box>
                </Box>
              </motion.div>

              {/* Enhanced Main Action Cards */}
              <motion.div variants={itemVariants}>
          <Typography 
                  variant="h4" 
            component="h2" 
            sx={{ 
              textAlign: 'center',
                    fontWeight: 800,
                    marginBottom: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)'
                      : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
              position: 'relative',
                    fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' }
            }}
          >
            Get Started
                  <Box sx={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60px',
                    height: '4px',
                    borderRadius: '2px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  }} />
          </Typography>
          
                <Grid container spacing={{ xs: 3, sm: 4, md: 5, lg: 6 }} sx={{ mb: { xs: 4, sm: 5, md: 6, lg: 7 } }}>
            {gridCards.map((card, index) => (
              <Grid item xs={12} md={4} key={card.title}>
                <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + (index * 0.1), duration: 0.6, ease: [0.25, 0.25, 0, 1] }}
                        variants={cardHoverVariants}
                        whileHover="hover"
                >
                  <Card
                    onClick={card.action}
                    sx={{
                      height: '100%',
                            minHeight: { xs: '260px', sm: '280px', md: '300px', lg: '320px' },
                      cursor: 'pointer',
                            borderRadius: '28px',
                      background: isDarkMode 
                              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)'
                              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                            backdropFilter: 'blur(25px)',
                            border: `1px solid ${card.accent}20`,
                            boxShadow: `0 20px 40px ${card.shadowColor}`,
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      '&:hover': {
                              borderColor: card.accent,
                              boxShadow: `0 25px 50px ${card.shadowColor}, 0 0 0 1px ${card.accent}40`
                            }
                          }}
                        >
                          {/* Enhanced gradient overlay */}
                          <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: card.gradient,
                            opacity: 0.8
                          }} />

                          {/* Animated background pattern */}
                    <Box sx={{
                      position: 'absolute',
                      top: '-50%',
                            right: '-50%',
                      width: '200%',
                      height: '200%',
                            background: `conic-gradient(from 0deg at 50% 50%, ${card.accent}10, transparent, ${card.accent}10)`,
                            opacity: 0.03,
                            animation: 'rotate 20s linear infinite',
                            '@keyframes rotate': {
                              '0%': { transform: 'rotate(0deg)' },
                              '100%': { transform: 'rotate(360deg)' }
                      }
                    }} />

                    <CardContent sx={{ 
                            p: { xs: 3, sm: 3.5, md: 4, lg: 4.5 }, 
                      textAlign: 'center', 
                      position: 'relative', 
                      zIndex: 1,
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                            <motion.div
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              transition={{ duration: 0.3 }}
                            >
                      <Box sx={{
                        background: card.gradient,
                                borderRadius: '20px',
                                width: { xs: '64px', sm: '68px', md: '72px', lg: '76px' },
                                height: { xs: '64px', sm: '68px', md: '72px', lg: '76px' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                                margin: '0 auto 2rem auto',
                                boxShadow: `0 12px 30px ${card.shadowColor}`,
                                position: 'relative',
                                '&:before': {
                                  content: '""',
                                  position: 'absolute',
                                  inset: '-2px',
                                  borderRadius: '22px',
                                  padding: '2px',
                                  background: card.gradient,
                                  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                  maskComposite: 'exclude',
                                  opacity: 0.5
                                }
                              }}>
                                {React.createElement(card.icon, { sx: { fontSize: { xs: '2rem', sm: '2.125rem', md: '2.25rem', lg: '2.375rem' }, color: 'white' } })}
                      </Box>
                            </motion.div>
                      
                      <Typography 
                              variant="h5" 
                        component="h3" 
                        sx={{ 
                          fontWeight: 700,
                                marginBottom: '1rem',
                                color: isDarkMode ? '#f8fafc' : '#0f172a',
                                fontSize: { xs: '1.25rem', sm: '1.3rem', md: '1.375rem', lg: '1.45rem' }
                        }}
                      >
                        {card.title}
                      </Typography>
                      
                      <Typography 
                              variant="body1" 
                        sx={{ 
                                color: isDarkMode ? '#cbd5e1' : '#64748b',
                                lineHeight: 1.6,
                                fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1rem', lg: '1.05rem' }
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

                {/* Enhanced Centered Book A Cab Card */}
                <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mb: { xs: 5, sm: 6, md: 7, lg: 8 } }}> 
            {
              bookACabCard && (loadingWhitelistStatus || loadingCabServiceGlobalVisibility) ? (
                <Grid item xs={12} sm={10} md={8}>
                        <Card sx={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center', 
                          height: { xs: '160px', sm: '170px', md: '180px', lg: '190px' },
                          borderRadius: '28px',
                          background: isDarkMode 
                            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                          backdropFilter: 'blur(25px)',
                          border: isDarkMode 
                            ? '1px solid rgba(148, 163, 184, 0.1)' 
                            : '1px solid rgba(226, 232, 240, 0.3)'
                        }}>
                          <CircularProgress size={40} sx={{ color: '#667eea' }} />
                  </Card>
                </Grid>
              ) : bookACabCard && canUserAccessCabService ? (
                <Grid item xs={12} sm={10} md={8} key={bookACabCard.title}>
                  <motion.div
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8, duration: 0.6, ease: [0.25, 0.25, 0, 1] }}
                          variants={cardHoverVariants}
                          whileHover="hover"
                  >
                    <Card
                      onClick={bookACabCard.action}
                      sx={{
                        height: '100%',
                              minHeight: { xs: '260px', sm: '280px', md: '300px', lg: '320px' },
                        cursor: 'pointer',
                              borderRadius: '28px',
                        background: isDarkMode 
                                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                              backdropFilter: 'blur(25px)',
                              border: `1px solid ${bookACabCard.accent}20`,
                              boxShadow: `0 20px 40px ${bookACabCard.shadowColor}`,
                              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        '&:hover': {
                                borderColor: bookACabCard.accent,
                                boxShadow: `0 25px 50px ${bookACabCard.shadowColor}, 0 0 0 1px ${bookACabCard.accent}40`
                        }
                      }}
                    >
                      <Box sx={{
                        position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '4px',
                              background: bookACabCard.gradient,
                              opacity: 0.8
                      }} />

                      <CardContent sx={{ 
                              p: { xs: 3, sm: 3.5, md: 4, lg: 4.5 }, 
                        textAlign: 'center', 
                        position: 'relative', 
                        zIndex: 1,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}>
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                transition={{ duration: 0.3 }}
                              >
                        <Box sx={{
                          background: bookACabCard.gradient,
                                  borderRadius: '20px',
                                  width: { xs: '64px', sm: '68px', md: '72px', lg: '76px' },
                                  height: { xs: '64px', sm: '68px', md: '72px', lg: '76px' },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                                  margin: '0 auto 2rem auto',
                                  boxShadow: `0 12px 30px ${bookACabCard.shadowColor}`
                        }}>
                                  {React.createElement(bookACabCard.icon, { sx: { fontSize: { xs: '2rem', sm: '2.125rem', md: '2.25rem', lg: '2.375rem' }, color: 'white' } })}
                        </Box>
                              </motion.div>
                        
                        <Typography 
                                variant="h5" 
                          component="h3" 
                          sx={{ 
                            fontWeight: 700,
                                  marginBottom: '1rem',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a',
                                  fontSize: { xs: '1.25rem', sm: '1.3rem', md: '1.375rem', lg: '1.45rem' }
                          }}
                        >
                          {bookACabCard.title}
                        </Typography>
                        
                        <Typography 
                                variant="body1" 
                          sx={{ 
                                  color: isDarkMode ? '#cbd5e1' : '#64748b',
                                  lineHeight: 1.6,
                                  fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1rem', lg: '1.05rem' }
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

              {/* Enhanced Quick Links Section */}
              <motion.div variants={itemVariants}>
          <Box sx={{
            background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                  backdropFilter: 'blur(25px)',
                  borderRadius: '32px',
                  padding: { xs: '2rem', sm: '3rem', md: '4rem', lg: '5rem' },
                  border: isDarkMode 
                    ? '1px solid rgba(148, 163, 184, 0.1)' 
                    : '1px solid rgba(226, 232, 240, 0.3)',
                  boxShadow: isDarkMode
                    ? '0 25px 50px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                    : '0 25px 50px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
            position: 'relative',
            overflow: 'hidden',
            mb: { xs: 3, sm: 4, md: 5, lg: 6 }
          }}>
                  {/* Enhanced background decoration */}
            <Box sx={{
              position: 'absolute',
                    top: '-40%',
                    right: '-30%',
                    width: '400px',
                    height: '400px',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '50%',
                    opacity: 0.04,
                    filter: 'blur(80px)',
              zIndex: 0
            }} />

            <Typography 
                    variant="h4" 
              component="h2" 
              sx={{ 
                textAlign: 'center',
                      fontWeight: 800,
                      marginBottom: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)'
                        : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                position: 'relative',
                      zIndex: 1,
                      fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' }
              }}
            >
              Quick Access Links
                    <Box sx={{
                      position: 'absolute',
                      bottom: '-8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '80px',
                      height: '4px',
                      borderRadius: '2px',
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                    }} />
            </Typography>
            
                  <Grid container spacing={{ xs: 2, sm: 3, md: 4, lg: 5 }} sx={{ position: 'relative', zIndex: 1 }}>
              {quickLinks.map((link, index) => (
                <Grid item xs={12} sm={6} md={3} key={link.url}>
                  <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + (index * 0.05), duration: 0.5, ease: [0.25, 0.25, 0, 1] }}
                          whileHover={{ scale: 1.05, y: -4 }}
                          whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={() => window.open(link.url, '_blank')}
                      sx={{
                        width: '100%',
                              height: { xs: '100px', sm: '110px', md: '120px', lg: '130px' },
                              borderRadius: '20px',
                        background: isDarkMode 
                                ? 'linear-gradient(135deg, rgba(51, 65, 85, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                              backdropFilter: 'blur(15px)',
                              border: isDarkMode 
                                ? '1px solid rgba(148, 163, 184, 0.2)' 
                                : '1px solid rgba(226, 232, 240, 0.4)',
                              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
                              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                              gap: 1,
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                                background: link.gradient,
                                border: 'none',
                                boxShadow: '0 15px 40px rgba(0, 0, 0, 0.2)',
                                '& .link-icon': {
                                  color: 'white !important',
                                  transform: 'scale(1.1)'
                                },
                                '& .link-text': {
                          color: 'white !important'
                        },
                                '& .link-category': {
                                  color: 'rgba(255, 255, 255, 0.9) !important',
                                  borderColor: 'rgba(255, 255, 255, 0.3) !important'
                                }
                        }
                      }}
                    >
                      <link.icon 
                        className="link-icon"
                        sx={{ 
                                fontSize: { xs: '1.75rem', sm: '1.875rem', md: '2rem', lg: '2.125rem' }, 
                          color: isDarkMode ? '#94a3b8' : '#6b7280',
                                transition: 'all 0.3s ease'
                        }} 
                      />
                      <Typography 
                        className="link-text"
                        variant="body2" 
                        sx={{ 
                                fontWeight: 700,
                          color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          textAlign: 'center',
                                fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.875rem', lg: '0.9rem' },
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
                                fontSize: { xs: '0.7rem', sm: '0.725rem', md: '0.75rem', lg: '0.775rem' },
                                height: { xs: '18px', sm: '19px', md: '20px', lg: '21px' },
                          color: isDarkMode ? '#9ca3af' : '#6b7280',
                          backgroundColor: 'transparent',
                          border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                                transition: 'all 0.3s ease',
                                fontWeight: 600
                        }}
                      />
                    </Button>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Box>
        </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Add bottom spacing to prevent unused space */}
        <Box sx={{ 
          height: { xs: '2rem', sm: '3rem', md: '4rem', lg: '5rem' },
          flexShrink: 0
        }} />
      </Container>
    </Box>
  );
};

export default Home; 