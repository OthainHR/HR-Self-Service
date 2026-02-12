import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Link as RouterLink } from 'react-router-dom';
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
import Avatar from '@mui/material/Avatar';
import {
  PersonAdd as PersonAddIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useDarkMode } from '../contexts/DarkModeContext';

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
      background: 'linear-gradient(45deg, #10b981, #059669)',
      filter: 'blur(1px)',
      zIndex: 0
    }}
  />
);

const Register = () => {
  const { signup, isLoading, error: authError } = useAuth();
  const { isDarkMode } = useDarkMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  const successVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 400
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');

    if (!email || !password || !confirmPassword) {
      setLocalError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    const allowedDomains = ['@othainsoft.com', '@jerseytechpartners.com', '@markenzoworldwide.com'];
    const emailDomain = email.substring(email.lastIndexOf('@'));
    if (!allowedDomains.includes(emailDomain.toLowerCase())) {
        setLocalError("Sign up failed: Only @othainsoft.com, @jerseytechpartners.com, and @markenzoworldwide.com emails are allowed.");
        return;
    }

    try {
      await signup({ email, password });
      setSuccessMessage('Signup successful! Please proceed to the login page.');
    } catch (err) {
      setLocalError(err?.message || 'An unexpected error occurred during sign up.');
    }
  };

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
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
                  boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
                  border: '2px solid rgba(16, 185, 129, 0.2)',
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
                    mb: 2,
                    fontWeight: 800,
                    textAlign: 'center',
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)'
                      : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  Create Account
                </Typography>

                

                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
                  {/* Display localError first if it exists */}
                  {localError && (
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
                        {localError}
                      </Alert>
                    </motion.div>
                  )}
                  
                  {/* Display authError only if no specific localError is set */}
                  {authError && !localError && (
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
                        {typeof authError === 'string' ? authError : 'An unexpected error occurred during sign up.'}
                      </Alert>
                    </motion.div>
                  )}
                  
                  {successMessage && (
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      variants={successVariants}
                    >
                      <Alert 
                        severity="success" 
                        sx={{ 
                          mb: 3, 
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          '& .MuiAlert-icon': {
                            color: '#10b981'
                          }
                        }}
                        icon={<CheckCircleIcon />}
                      >
                        {successMessage}
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading || !!successMessage}
                      helperText="@othainsoft.com / @jerseytechpartners.com / @markenzoworldwide.com"
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
                            boxShadow: '0 8px 25px rgba(16, 185, 129, 0.15)'
                          },
                          '&.Mui-focused': {
                            background: isDarkMode 
                              ? 'rgba(51, 65, 85, 0.8)' 
                              : 'rgba(255, 255, 255, 1)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(16, 185, 129, 0.25)'
                          }
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)',
                        },
                        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#10b981',
                        },
                        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#10b981',
                          borderWidth: '2px'
                        },
                        '& .MuiFormHelperText-root': {
                          color: isDarkMode ? '#94a3b8' : '#64748b',
                          fontSize: '0.75rem',
                          marginTop: '6px'
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
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading || !!successMessage}
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
                            boxShadow: '0 8px 25px rgba(16, 185, 129, 0.15)'
                          },
                          '&.Mui-focused': {
                            background: isDarkMode 
                              ? 'rgba(51, 65, 85, 0.8)' 
                              : 'rgba(255, 255, 255, 1)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(16, 185, 129, 0.25)'
                          }
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)',
                        },
                        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#10b981',
                        },
                        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#10b981',
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
                      name="confirmPassword"
                      label="Confirm Password"
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading || !!successMessage}
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
                            boxShadow: '0 8px 25px rgba(16, 185, 129, 0.15)'
                          },
                          '&.Mui-focused': {
                            background: isDarkMode 
                              ? 'rgba(51, 65, 85, 0.8)' 
                              : 'rgba(255, 255, 255, 1)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(16, 185, 129, 0.25)'
                          }
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)',
                        },
                        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#10b981',
                        },
                        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#10b981',
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
                      disabled={isLoading || !!successMessage}
                      startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <PersonAddIcon />}
                      sx={{
                        mb: 3,
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        borderRadius: '16px',
                        textTransform: 'none',
                        background: successMessage 
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
                        border: 'none',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          boxShadow: '0 12px 35px rgba(16, 185, 129, 0.4)',
                          transform: 'translateY(-2px)'
                        },
                        '&:disabled': {
                          background: successMessage 
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                          color: 'rgba(255, 255, 255, 0.7)'
                        }
                      }}
                    >
                      {isLoading ? 'Creating Account...' : successMessage ? 'Account Created!' : 'Sign Up'}
                    </Button>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Box textAlign="center">
                      <Link 
                        component={RouterLink} 
                        to="/login" 
                        variant="body2" 
                        sx={{ 
                          color: isDarkMode ? '#94a3b8' : '#64748b',
                          textDecoration: 'none',
                          fontWeight: 500,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            color: '#10b981',
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        Already have an account? Sign In
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

export default Register;