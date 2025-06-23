import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, Paper, Typography, Button, Box, useTheme, useMediaQuery } from '@mui/material';
import { 
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useDarkMode } from '../contexts/DarkModeContext';

// Floating particles animation
const FloatingParticle = ({ delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 100 }}
    animate={{ 
      opacity: [0, 0.4, 0],
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
      background: 'linear-gradient(45deg, #f59e0b, #d97706)',
      filter: 'blur(1px)',
      zIndex: 0
    }}
  />
);

const DisclaimerOverlay = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isDarkMode } = useDarkMode();

  const handleModalClose = (event, reason) => {
    if (reason && reason === 'backdropClick') {
      return; // Prevent closing on backdrop click
    }
    onClose();
  };

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 50
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
        duration: 0.5
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      y: 50,
      transition: { duration: 0.2 }
    }
  };

  const contentVariants = {
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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 400,
        delay: 0.3
      }
    }
  };

  // Custom backdrop component to avoid ownerState prop warning
  const CustomBackdrop = React.forwardRef((props, ref) => {
    const { ownerState, ...otherProps } = props;
    return (
      <motion.div
        ref={ref}
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
            ? 'rgba(0, 0, 0, 0.85)' 
            : 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          outline: 'none',
          border: 'none',
          zIndex: -1
        }}
        {...otherProps}
      />
    );
  });

  return (
    <AnimatePresence>
      {open && (
    <Modal
      open={open}
          onClose={handleModalClose}
      aria-labelledby="disclaimer-title"
      aria-describedby="disclaimer-description"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
            p: 2,
            '& .MuiModal-root': {
              outline: 'none',
              border: 'none'
            },
            '& .MuiBackdrop-root': {
              outline: 'none',
              border: 'none'
            }
          }}
          BackdropComponent={CustomBackdrop}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              outline: 'none',
              border: 'none',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '24px'
            }}
          >
            {/* Background Particles */}
            {[...Array(8)].map((_, i) => (
              <FloatingParticle key={i} delay={i * 0.3} />
            ))}

        <Paper 
              elevation={0}
          sx={{ 
                position: 'relative',
                zIndex: 1,
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                backdropFilter: 'blur(20px)',
                border: isDarkMode ? '1px solid rgba(51, 65, 85, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                borderRadius: '24px',
                padding: { xs: 3, sm: 4, md: 5 },
                maxWidth: '650px',
            width: '90vw',    
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            outline: 'none',  
                '&:focus': {
                  outline: 'none'
                },
                '&:focus-visible': {
                  outline: 'none'
                },
                '&::-webkit-scrollbar': {
                  width: '6px'
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent'
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  borderRadius: '3px'
                }
              }}
            >
              {/* Paper decoration */}
              <Box sx={{
                position: 'absolute',
                top: '-50%',
                right: '-30%',
                width: '300px',
                height: '200px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '50%',
                opacity: 0.05,
                filter: 'blur(60px)',
                zIndex: 0
              }} />

              <motion.div
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                style={{ position: 'relative', zIndex: 1 }}
              >
                {/* Header with Icon */}
                <motion.div variants={itemVariants}>
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3
                  }}>
                    <motion.div variants={iconVariants}>
                      <Box sx={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        borderRadius: '16px',
                        width: { xs: 60, sm: 72 },
                        height: { xs: 60, sm: 72 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 25px rgba(245, 158, 11, 0.3)',
                        mb: 2
                      }}>
                        <InfoIcon sx={{ 
                          fontSize: { xs: '2rem', sm: '2.5rem' }, 
                          color: 'white' 
                        }} />
                      </Box>
                    </motion.div>
                  </Box>

                  <Typography 
                    variant={isMobile ? "h5" : "h4"}
                    component="h2" 
                    id="disclaimer-title" 
                    sx={{ 
                      fontWeight: 800,
                      textAlign: 'center',
                      mb: 1,
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)'
                        : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    Important Notice
                  </Typography>

                  <Typography 
                    variant="body2" 
                    sx={{ 
                      textAlign: 'center',
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      mb: 4,
                      fontSize: { xs: '0.9rem', sm: '1rem' }
                    }}
                  >
                    Please read and acknowledge the following disclaimer
          </Typography>
                </motion.div>

                {/* Content */}
                <motion.div variants={itemVariants}>
                  <Box sx={{
                    background: isDarkMode 
                      ? 'rgba(51, 65, 85, 0.3)' 
                      : 'rgba(248, 250, 252, 0.6)',
                    borderRadius: '16px',
                    p: { xs: 2.5, sm: 3 },
                    mb: 4,
                    border: isDarkMode ? '1px solid rgba(51, 65, 85, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <Typography 
                      variant="body1" 
                      id="disclaimer-description" 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.7,
                        fontSize: { xs: '0.95rem', sm: '1rem' },
                        color: isDarkMode ? '#e2e8f0' : '#374151'
                      }}
                    >
            {`Othain Employee Self Service provides information and guidance for general reference purposes only. Although we make every effort to ensure responses are helpful and current, they may occasionally be incomplete, outdated, or incorrect. Othain Group does not guarantee the accuracy or suitability of AI-generated responses.

If you have further questions, notice inaccuracies, or require official confirmation, please contact **hr@othainsoft.com**.`}
          </Typography>
                  </Box>
                </motion.div>

                {/* Action Button */}
                <motion.div 
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Button 
                      variant="contained" 
                      onClick={onClose}
                      startIcon={<CheckCircleIcon />}
                      sx={{
                        px: { xs: 4, sm: 6 },
                        py: 1.5,
                        fontSize: { xs: '1rem', sm: '1.1rem' },
                        fontWeight: 700,
                        borderRadius: '16px',
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        boxShadow: '0 8px 25px rgba(245, 158, 11, 0.3)',
                        border: 'none',
                        minWidth: { xs: '200px', sm: '220px' },
                        outline: 'none',
                        '&:focus': {
                          outline: 'none'
                        },
                        '&:focus-visible': {
                          outline: 'none'
                        },
                        '&:hover': {
                          background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                          boxShadow: '0 12px 35px rgba(245, 158, 11, 0.4)',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      I Understand & Agree
            </Button>
          </Box>
                </motion.div>
              </motion.div>
        </Paper>
          </motion.div>
    </Modal>
      )}
    </AnimatePresence>
  );
};

export default DisclaimerOverlay; 