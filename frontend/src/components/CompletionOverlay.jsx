import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size';
import { Box, Typography, Button, useTheme, useMediaQuery } from '@mui/material';
import { 
  Home as HomeIcon,
  EmojiEvents as TrophyIcon,
  Celebration as CelebrationIcon
} from '@mui/icons-material';
import { useDarkMode } from '../contexts/DarkModeContext';

// Floating particles animation
const FloatingParticle = ({ delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 100 }}
    animate={{ 
      opacity: [0, 0.6, 0],
      y: [-100, -200],
      x: [0, Math.random() * 80 - 40]
    }}
    transition={{
      duration: 10,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    style={{
      position: 'absolute',
      width: '4px',
      height: '4px',
      borderRadius: '50%',
      background: 'linear-gradient(45deg, #10b981, #059669)',
      filter: 'blur(1px)',
      zIndex: 1
    }}
  />
);

const CompletionOverlay = ({ message, onGoHome }) => {
  const [width, height] = useWindowSize();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isDarkMode } = useDarkMode();

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.5 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  const containerVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.6,
      y: 100
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 300,
        duration: 0.8
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.6,
      y: 100,
      transition: { duration: 0.3 }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const trophyVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 400,
        delay: 0.5
      }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDarkMode 
            ? 'rgba(0, 0, 0, 0.9)' 
            : 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}
      >
        {/* Background Particles */}
        {[...Array(20)].map((_, i) => (
          <FloatingParticle key={i} delay={i * 0.2} />
        ))}

        {/* Confetti */}
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={400}
          gravity={0.15}
          style={{ zIndex: 2001 }}
        />

        {/* Main Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            position: 'relative',
            zIndex: 2002
          }}
        >
          <Box sx={{
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: isDarkMode ? '1px solid rgba(51, 65, 85, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            borderRadius: '24px',
            padding: { xs: 4, sm: 5, md: 6 },
            textAlign: 'center',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            overflow: 'hidden',
            maxWidth: { xs: '350px', sm: '450px', md: '500px' },
            width: '100%'
          }}>
            {/* Background decoration */}
            <Box sx={{
              position: 'absolute',
              top: '-50%',
              left: '-30%',
              width: '300px',
              height: '200px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '50%',
              opacity: 0.08,
              filter: 'blur(60px)',
              zIndex: 0
            }} />

            <motion.div
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              style={{ position: 'relative', zIndex: 1 }}
            >
              {/* Trophy Icon */}
              <motion.div variants={trophyVariants}>
                <motion.div variants={pulseVariants} animate="animate">
                  <Box sx={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderRadius: '20px',
                    width: { xs: 80, sm: 100 },
                    height: { xs: 80, sm: 100 },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 2rem auto',
                    boxShadow: '0 12px 30px rgba(245, 158, 11, 0.4)',
                    position: 'relative'
                  }}>
                    <TrophyIcon sx={{ 
                      fontSize: { xs: '3rem', sm: '4rem' }, 
                      color: 'white' 
                    }} />
                    
                    {/* Sparkle effect */}
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        width: '20px',
                        height: '20px',
                        background: 'linear-gradient(45deg, #fbbf24, #f59e0b)',
                        borderRadius: '50%',
                        boxShadow: '0 0 20px rgba(251, 191, 36, 0.6)'
                      }}
                    />
                  </Box>
                </motion.div>
              </motion.div>

              {/* Main Title */}
              <motion.div variants={itemVariants}>
                <Typography 
                  variant={isMobile ? "h4" : "h3"}
                  sx={{ 
                    fontWeight: 900,
                    mb: 1,
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)'
                      : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1
                  }}
                >
                  <CelebrationIcon sx={{ 
                    fontSize: { xs: '2rem', sm: '2.5rem' },
                    color: '#10b981'
                  }} />
                  Amazing Work!
                  <CelebrationIcon sx={{ 
                    fontSize: { xs: '2rem', sm: '2.5rem' },
                    color: '#10b981'
                  }} />
                </Typography>
              </motion.div>

              {/* Subtitle */}
              <motion.div variants={itemVariants}>
                <Typography 
                  variant="h6"
                  sx={{ 
                    color: '#10b981',
                    fontWeight: 600,
                    mb: 3,
                    fontSize: { xs: '1.1rem', sm: '1.25rem' }
                  }}
                >
                  Congratulations on your achievement!
                </Typography>
              </motion.div>

              {/* Message */}
              <motion.div variants={itemVariants}>
                <Box sx={{
                  background: isDarkMode 
                    ? 'rgba(51, 65, 85, 0.4)' 
                    : 'rgba(248, 250, 252, 0.8)',
                  borderRadius: '16px',
                  p: { xs: 2.5, sm: 3 },
                  mb: 4,
                  border: isDarkMode ? '1px solid rgba(51, 65, 85, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <Typography 
                    variant="body1"
                    sx={{ 
                      fontSize: { xs: '1rem', sm: '1.1rem' },
                      lineHeight: 1.6,
                      color: isDarkMode ? '#e2e8f0' : '#374151',
                      fontWeight: 500
                    }}
                  >
                    {message || 'You have successfully completed the onboarding video.'}
                  </Typography>
                </Box>
              </motion.div>

              {/* Action Button */}
              <motion.div 
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  onClick={onGoHome}
                  variant="contained"
                  size="large"
                  startIcon={<HomeIcon />}
                  sx={{
                    px: { xs: 4, sm: 6 },
                    py: 2,
                    fontSize: { xs: '1.1rem', sm: '1.2rem' },
                    fontWeight: 700,
                    borderRadius: '16px',
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)',
                    border: 'none',
                    minWidth: { xs: '200px', sm: '250px' },
                    '&:hover': {
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      boxShadow: '0 12px 35px rgba(16, 185, 129, 0.5)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  Go to Home Page
                </Button>
              </motion.div>
            </motion.div>
          </Box>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CompletionOverlay; 