import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Link,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Microsoft as MicrosoftIcon,
  Login as LoginIcon,
  Email as EmailIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { useDarkMode } from '../contexts/DarkModeContext';
import Avatar from '@mui/material/Avatar';
import DisclaimerOverlay from '../components/DisclaimerOverlay';
import { recordDisclaimerAcknowledgement } from '../services/supabase';

// Floating particles animation
const FloatingParticle = ({ delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 100 }}
    animate={{ 
      opacity: [0, 0.6, 0],
      y: [-100, -200],
      x: [0, Math.random() * 60 - 30]
    }}
    transition={{
      duration: 8,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    style={{
      position: 'absolute',
      width: '3px',
      height: '3px',
      borderRadius: '50%',
      background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
      filter: 'blur(1px)',
      zIndex: 0
    }}
  />
);

const Login = () => {
  const { login, isLoading, error: authError, user, signInWithMicrosoft } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isDisclaimerVisible, setIsDisclaimerVisible] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const logoVariants = {
    hidden: { opacity: 0, scale: 0.5, rotate: -180 },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 300,
        delay: 0.3
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!username || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    try {
      await login({ email: username, password });
    } catch (err) {
      setLocalError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleMicrosoftLogin = async () => {
    setLocalError('');
    try {
      await signInWithMicrosoft();
    } catch (err) {
      setLocalError(err.message || 'Microsoft login failed. Please try again.');
    }
  };

  useEffect(() => {
    if (user) {
      const needsToShowDisclaimer = localStorage.getItem('pendingDisclaimer') === 'true';
      const alreadyAcknowledgedThisLogin = localStorage.getItem('disclaimerAcknowledgedThisLogin') === 'true';

      if (needsToShowDisclaimer && !alreadyAcknowledgedThisLogin) {
        setIsDisclaimerVisible(true);
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleAcknowledgeDisclaimer = async () => {
    if (user && user.email) {
      try {
        const { error: recordError } = await recordDisclaimerAcknowledgement(user.email);
        if (recordError) {
          console.warn('Failed to record disclaimer acknowledgement:', recordError.message);
        }
      } catch (e) {
        console.warn('Error recording disclaimer acknowledgement:', e.message);
      }
    } else {
      console.warn('Cannot record disclaimer: user or email not available');
    }

    setIsDisclaimerVisible(false);
    localStorage.setItem('disclaimerAcknowledgedThisLogin', 'true');
    localStorage.removeItem('pendingDisclaimer');
    navigate('/');
  };

  if (isDisclaimerVisible) {
    return <DisclaimerOverlay open={isDisclaimerVisible} onClose={handleAcknowledgeDisclaimer} />;
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      background: isDarkMode 
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Background Particles */}
      {[...Array(12)].map((_, i) => (
        <FloatingParticle key={i} delay={i * 0.5} />
      ))}

      <Container component="main" maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <Paper
              elevation={0}
              sx={{
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(20px)',
                border: isDarkMode ? '1px solid rgba(51, 65, 85, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                borderRadius: '24px',
                padding: { xs: 3, sm: 4 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Paper decoration */}
              <Box sx={{
                position: 'absolute',
                top: '-50%',
                right: '-30%',
                width: '300px',
                height: '200px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                borderRadius: '50%',
                opacity: 0.05,
                filter: 'blur(60px)',
                zIndex: 0
              }} />

              <motion.div variants={logoVariants}>
                <Avatar sx={{ 
                  m: 2, 
                  bgcolor: 'transparent', 
                  width: { xs: 64, sm: 72 }, 
                  height: { xs: 64, sm: 72 },
                  boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
                  border: '2px solid rgba(99, 102, 241, 0.2)',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <img 
                    src={isDarkMode ? '/othainlogopreview.png' : '/OthainOcolor.png'}
                    alt="Othain Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </Avatar>
              </motion.div>

              <motion.div variants={itemVariants} style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                <Typography 
                  component="h1" 
                  variant={isMobile ? "h5" : "h4"} 
                  sx={{ 
                    mt: 1,
                    mb: 3,
                    fontWeight: 800,
                    textAlign: 'center',
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)'
                      : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  Welcome Back
                </Typography>

                <Typography 
                  variant="body1" 
                  sx={{ 
                    mb: 4,
                    textAlign: 'center',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  }}
                >
                  Sign in to access your ESS
                </Typography>

                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
                  {(localError || authError) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert 
                        severity="error" 
                        sx={{ 
                          mb: 3, 
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
                          border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}
                      >
                        {localError || (authError && typeof authError === 'string' ? authError : 'Login failed. Please check your credentials.')}
                      </Alert>
                    </motion.div>
                  )}

                  <motion.div variants={itemVariants}>
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      id="email"
                      label="Email Address"
                      name="email"
                      autoComplete="email"
                      autoFocus
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading}
                      InputProps={{
                        startAdornment: (
                          <EmailIcon sx={{ 
                            mr: 1, 
                            color: isDarkMode ? '#94a3b8' : '#64748b',
                            fontSize: '1.2rem'
                          }} />
                        ),
                      }}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '16px',
                          background: isDarkMode 
                            ? 'rgba(51, 65, 85, 0.5)' 
                            : 'rgba(248, 250, 252, 0.8)',
                          backdropFilter: 'blur(10px)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            background: isDarkMode 
                              ? 'rgba(51, 65, 85, 0.7)' 
                              : 'rgba(248, 250, 252, 1)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(99, 102, 241, 0.15)'
                          },
                          '&.Mui-focused': {
                            background: isDarkMode 
                              ? 'rgba(51, 65, 85, 0.8)' 
                              : 'rgba(255, 255, 255, 1)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(99, 102, 241, 0.25)'
                          }
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)',
                        },
                        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1',
                        },
                        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1',
                          borderWidth: '2px'
                        }
                      }}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      name="password"
                      label="Password"
                      type="password"
                      id="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      InputProps={{
                        startAdornment: (
                          <LockIcon sx={{ 
                            mr: 1, 
                            color: isDarkMode ? '#94a3b8' : '#64748b',
                            fontSize: '1.2rem'
                          }} />
                        ),
                      }}
                      sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '16px',
                          background: isDarkMode 
                            ? 'rgba(51, 65, 85, 0.5)' 
                            : 'rgba(248, 250, 252, 0.8)',
                          backdropFilter: 'blur(10px)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            background: isDarkMode 
                              ? 'rgba(51, 65, 85, 0.7)' 
                              : 'rgba(248, 250, 252, 1)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(99, 102, 241, 0.15)'
                          },
                          '&.Mui-focused': {
                            background: isDarkMode 
                              ? 'rgba(51, 65, 85, 0.8)' 
                              : 'rgba(255, 255, 255, 1)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(99, 102, 241, 0.25)'
                          }
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)',
                        },
                        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1',
                        },
                        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1',
                          borderWidth: '2px'
                        }
                      }}
                    />
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={isLoading}
                      startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                      sx={{
                        mb: 2,
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        borderRadius: '16px',
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
                        border: 'none',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5856eb 0%, #7c3aed 100%)',
                          boxShadow: '0 12px 35px rgba(99, 102, 241, 0.4)',
                          transform: 'translateY(-2px)'
                        },
                        '&:disabled': {
                          background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                          color: 'rgba(255, 255, 255, 0.7)'
                        }
                      }}
                    >
                      {isLoading ? 'Signing In...' : 'Sign In'}
                    </Button>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={handleMicrosoftLogin}
                      disabled={isLoading}
                      startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <MicrosoftIcon />}
                      sx={{
                        mb: 3,
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 600,
                        borderRadius: '16px',
                        textTransform: 'none',
                        borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.5)' : 'rgba(99, 102, 241, 0.3)',
                        color: isDarkMode ? '#f1f5f9' : '#1e293b',
                        background: isDarkMode 
                          ? 'rgba(51, 65, 85, 0.3)' 
                          : 'rgba(99, 102, 241, 0.05)',
                        backdropFilter: 'blur(10px)',
                        '&:hover': {
                          borderColor: '#6366f1',
                          background: isDarkMode 
                            ? 'rgba(99, 102, 241, 0.1)' 
                            : 'rgba(99, 102, 241, 0.1)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(99, 102, 241, 0.15)'
                        },
                        '&:disabled': {
                          borderColor: 'rgba(148, 163, 184, 0.3)',
                          color: 'rgba(148, 163, 184, 0.7)'
                        }
                      }}
                    >
                      {isLoading ? 'Signing In...' : 'Sign In with Microsoft'}
                    </Button>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Box textAlign="center">
                      <Link 
                        component={RouterLink} 
                        to="/register" 
                        variant="body2" 
                        sx={{ 
                          color: isDarkMode ? '#94a3b8' : '#64748b',
                          textDecoration: 'none',
                          fontWeight: 500,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            color: '#6366f1',
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        Don't have an account? Sign Up
                      </Link>
                    </Box>
                  </motion.div>
                </Box>
              </motion.div>
            </Paper>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  );
};

export default Login;
