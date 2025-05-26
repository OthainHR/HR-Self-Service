import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size';
import { 
  Box, 
  Typography, 
  Radio, 
  FormControlLabel, 
  RadioGroup, 
  Paper, 
  Button,
  Chip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Quiz as QuizIcon,
  School as SchoolIcon
} from '@mui/icons-material';

// Floating particles animation for background
const FloatingParticle = ({ delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 100 }}
    animate={{ 
      opacity: [0, 0.6, 0],
      y: [-50, -150],
      x: [0, Math.random() * 60 - 30]
    }}
    transition={{
      duration: 6,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    style={{
      position: 'absolute',
      width: '2px',
      height: '2px',
      borderRadius: '50%',
      background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
      filter: 'blur(0.5px)',
      zIndex: 1
    }}
  />
);

const QuizOverlay = ({ quizData, onSubmit, onClose, feedback, onProceed, isFullscreen }) => {
  const [userAnswers, setUserAnswers] = useState({});
  const [runConfetti, setRunConfetti] = useState(false);
  const [width, height] = useWindowSize();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Enhanced animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3, ease: "easeOut" }
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
        duration: 0.4, 
        ease: "easeOut",
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: 30,
      transition: { duration: 0.2 }
    }
  };

  const questionVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: "easeOut"
      }
    })
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 300,
        delay: 0.2
      }
    }
  };

  useEffect(() => {
    setUserAnswers({});
  }, [quizData, feedback]);

  useEffect(() => {
    if (feedback && feedback.success === true) { 
      setRunConfetti(true);
    } else {
      setRunConfetti(false);
    }
  }, [feedback]);

  const canProceed = feedback && (feedback.success === true || feedback.success === 'maxedOut');
  const showQuizContent = !canProceed && quizData && quizData.questions;
  const showFailureFeedback = feedback && feedback.success === false;

  if (!quizData && !canProceed) {
    return null;
  }

  const handleOptionChange = (questionId, option) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmit = () => {
    onSubmit(userAnswers);
  };

  const getFeedbackColor = () => {
    if (feedback?.success === true) return '#10b981';
    if (feedback?.success === 'maxedOut') return '#f59e0b';
    return '#ef4444';
  };

  const getFeedbackBgColor = () => {
    if (feedback?.success === true) return 'rgba(16, 185, 129, 0.1)';
    if (feedback?.success === 'maxedOut') return 'rgba(245, 158, 11, 0.1)';
    return 'rgba(239, 68, 68, 0.1)';
  };

  const allQuestionsAnswered = showQuizContent && quizData?.questions?.every(q => userAnswers[q.id]);

  return (
    <AnimatePresence>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}
      >
        {/* Background Particles */}
        {[...Array(8)].map((_, i) => (
          <FloatingParticle key={i} delay={i * 0.3} />
        ))}

        {/* Confetti Effect */}
        {runConfetti && feedback && feedback.success === true && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={200}
            gravity={0.15}
            onConfettiComplete={() => setRunConfetti(false)}
          />
        )}

        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <Paper
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(226, 232, 240, 0.5)',
              borderRadius: '24px',
              padding: { xs: 3, sm: 4 },
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Header Section */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <motion.div
                variants={iconVariants}
                initial="hidden"
                animate="visible"
              >
                {canProceed ? (
                  feedback?.success === true ? (
                    <CheckCircleIcon sx={{ 
                      fontSize: '3rem', 
                      color: '#10b981',
                      mb: 1
                    }} />
                  ) : (
                    <SchoolIcon sx={{ 
                      fontSize: '3rem', 
                      color: '#f59e0b',
                      mb: 1
                    }} />
                  )
                ) : (
                  <QuizIcon sx={{ 
                    fontSize: '3rem', 
                    color: '#6366f1',
                    mb: 1
                  }} />
                )}
              </motion.div>

              <Typography variant="h4" sx={{ 
                fontWeight: 800,
                background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
                fontSize: { xs: '1.5rem', sm: '2rem' }
              }}>
                {canProceed ? 'Quiz Results' : (quizData?.title || 'Quiz')}
              </Typography>

              {showQuizContent && (
                <Chip 
                  label={`${Object.keys(userAnswers).length}/${quizData?.questions?.length || 0} Answered`}
                  sx={{
                    background: allQuestionsAnswered 
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.75rem'
                  }}
                />
              )}
            </Box>

            {/* Feedback Message */}
            <AnimatePresence>
              {feedback && feedback.message && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Box sx={{
                    textAlign: 'center',
                    p: 3,
                    mb: 3,
                    borderRadius: '16px',
                    background: getFeedbackBgColor(),
                    border: `2px solid ${getFeedbackColor()}20`,
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Shine effect */}
                    <Box sx={{
                      position: 'absolute',
                      top: '-50%',
                      left: '-50%',
                      width: '200%',
                      height: '200%',
                      background: `linear-gradient(45deg, transparent, ${getFeedbackColor()}15, transparent)`,
                      transform: 'rotate(45deg)',
                      animation: feedback?.success === true ? 'shine 2s ease-in-out' : 'none'
                    }} />

                    <Typography variant="h6" sx={{ 
                      color: getFeedbackColor(),
                      fontWeight: 700,
                      position: 'relative',
                      zIndex: 1
                    }}>
                      {feedback.message}
                    </Typography>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quiz Content */}
            <Box sx={{ 
              maxHeight: 'calc(90vh - 300px)', 
              overflow: 'auto',
              pr: 1,
              '&::-webkit-scrollbar': {
                width: '6px'
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent'
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderRadius: '3px'
              }
            }}>
              <AnimatePresence>
                {showQuizContent && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {quizData.questions.map((question, index) => {
                      const isIncorrect = feedback && feedback.incorrectIds && feedback.incorrectIds.includes(question.id);
                      
                      return (
                        <motion.div
                          key={question.id}
                          custom={index}
                          variants={questionVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          <Box sx={{
                            mb: 3,
                            p: 3,
                            borderRadius: '20px',
                            border: isIncorrect ? '2px solid #ef4444' : '1px solid rgba(226, 232, 240, 0.5)',
                            background: isIncorrect 
                              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)'
                              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
                            backdropFilter: 'blur(10px)',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            {/* Error indicator */}
                            {isIncorrect && (
                              <Box sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '4px',
                                height: '100%',
                                background: 'linear-gradient(to bottom, #ef4444, #dc2626)'
                              }} />
                            )}

                            <Typography variant="h6" sx={{
                              fontWeight: 700,
                              color: isIncorrect ? '#dc2626' : '#1e293b',
                              mb: 2,
                              fontSize: { xs: '1rem', sm: '1.125rem' }
                            }}>
                              {question.text}
                            </Typography>

                            <RadioGroup
                              value={userAnswers[question.id] || ''}
                              onChange={(e) => handleOptionChange(question.id, e.target.value)}
                            >
                              {question.options.map((option, optionIndex) => {
                                const isSelected = userAnswers[question.id] === option;
                                const isIncorrectOption = isIncorrect && isSelected;

                                return (
                                  <motion.div
                                    key={optionIndex}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <FormControlLabel
                                      value={option}
                                      control={
                                        <Radio 
                                          sx={{
                                            color: isIncorrectOption ? '#ef4444' : '#6366f1',
                                            '&.Mui-checked': {
                                              color: isIncorrectOption ? '#ef4444' : '#6366f1'
                                            }
                                          }}
                                        />
                                      }
                                      label={
                                        <Typography sx={{ 
                                          fontWeight: isSelected ? 600 : 400,
                                          color: isIncorrectOption ? '#dc2626' : '#374151'
                                        }}>
                                          {option}
                                        </Typography>
                                      }
                                      sx={{
                                        width: '100%',
                                        m: 0,
                                        mb: 1,
                                        p: 2,
                                        borderRadius: '12px',
                                        border: isSelected 
                                          ? isIncorrectOption 
                                            ? '2px solid #ef4444'
                                            : '2px solid #6366f1'
                                          : '1px solid rgba(226, 232, 240, 0.8)',
                                        background: isSelected
                                          ? isIncorrectOption
                                            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)'
                                            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)'
                                          : 'rgba(248, 250, 252, 0.8)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        cursor: 'pointer',
                                        '&:hover': {
                                          background: isSelected
                                            ? isIncorrectOption
                                              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)'
                                              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)'
                                            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.03) 100%)',
                                          borderColor: isSelected 
                                            ? isIncorrectOption ? '#ef4444' : '#6366f1'
                                            : '#a855f7',
                                          transform: 'translateY(-1px)',
                                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
                                        }
                                      }}
                                    />
                                  </motion.div>
                                );
                              })}
                            </RadioGroup>
                          </Box>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 2, 
              mt: 4,
              pt: 3,
              borderTop: '1px solid rgba(226, 232, 240, 0.5)'
            }}>
              {showQuizContent && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleSubmit}
                    disabled={!allQuestionsAnswered}
                    sx={{
                      background: allQuestionsAnswered 
                        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                        : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                      color: 'white',
                      px: 4,
                      py: 1.5,
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '1rem',
                      textTransform: 'none',
                      boxShadow: allQuestionsAnswered 
                        ? '0 8px 25px rgba(99, 102, 241, 0.3)'
                        : '0 4px 12px rgba(148, 163, 184, 0.3)',
                      border: 'none',
                      '&:hover': {
                        background: allQuestionsAnswered 
                          ? 'linear-gradient(135deg, #5856eb 0%, #7c3aed 100%)'
                          : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                        boxShadow: allQuestionsAnswered 
                          ? '0 12px 30px rgba(99, 102, 241, 0.4)'
                          : '0 4px 12px rgba(148, 163, 184, 0.3)',
                        transform: allQuestionsAnswered ? 'translateY(-2px)' : 'none'
                      },
                      '&:disabled': {
                        background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                        color: 'rgba(255, 255, 255, 0.7)'
                      }
                    }}
                  >
                    Submit Answers
                  </Button>
                </motion.div>
              )}

              {canProceed && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={onProceed}
                    sx={{
                      background: feedback?.success === true 
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: 'white',
                      px: 4,
                      py: 1.5,
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '1rem',
                      textTransform: 'none',
                      boxShadow: feedback?.success === true 
                        ? '0 8px 25px rgba(16, 185, 129, 0.3)'
                        : '0 8px 25px rgba(245, 158, 11, 0.3)',
                      border: 'none',
                      '&:hover': {
                        background: feedback?.success === true 
                          ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                          : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                        boxShadow: feedback?.success === true 
                          ? '0 12px 30px rgba(16, 185, 129, 0.4)'
                          : '0 12px 30px rgba(245, 158, 11, 0.4)',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    Continue
                  </Button>
                </motion.div>
              )}
            </Box>
          </Paper>
        </motion.div>

        {/* Custom Animations Styles */}
        <style jsx>{`
          @keyframes shine {
            0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
            50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
            100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuizOverlay; 