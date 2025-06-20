import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Container,
  Card,
  CardContent,
  Chip,
  Fade,
  useMediaQuery
} from '@mui/material';
import { 
  PlayArrow as PlayArrowIcon, 
  Pause as PauseIcon, 
  CheckCircle as CheckCircleIcon,
  SkipPrevious as SkipPreviousIcon,
  SkipNext as SkipNextIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  OndemandVideo as VideoIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import QuizOverlay from '../components/QuizOverlay';
import CompletionOverlay from '../components/CompletionOverlay';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useTheme } from '@mui/material';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Floating particles animation
const FloatingParticle = ({ delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 100 }}
    animate={{ 
      opacity: [0, 1, 0],
      y: [-100, -200],
      x: [0, Math.random() * 100 - 50]
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

const OnboardingPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [completedChapters, setCompletedChapters] = useState(new Set());
  const [chapterQuizCompleted, setChapterQuizCompleted] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quizOverlayVisible, setQuizOverlayVisible] = useState(false);
  const [activeQuizData, setActiveQuizData] = useState(null);
  const [quizAttemptKey, setQuizAttemptKey] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const { isDarkMode } = useDarkMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [quizAttempts, setQuizAttempts] = useState(0);

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
        ease: "easeOut"
      }
    }
  };

  const chapterVariants = {
    hidden: { opacity: 0, x: 20 },
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

  // Add timestamps (in seconds) to your chapters
  const chapters = [
    { id: 1, title: '1. Welcome to Othain', duration: '1 Min 48 Sec', timestamp: 0 },
    { id: 2, title: '2. About Our Team', duration: '1 Min 54 Sec', timestamp: 108 },
    { id: 3, title: '3. Onboarding Process', duration: '1 Min 10 Sec', timestamp: 222.5},
    { id: 4, title: '4. Policies & Procedures: Attendance', duration: '4 Min 23 Sec', timestamp: 292,
        quiz: {
            title: 'Attendance Policy Quiz',
            questions: [
              {
                id: 'q1', 
                text: "Q1. At Othain's Building B9, which clock-in/clock-out method must employees use?",
                options: [ 'A. Biometric scanner', 'B. Web clock-in/clock-out inside the office', 'C. Remote clock-in/clock-out from any location', 'D. Manual sign-in sheet'],
                correctAnswer: 'B. Web clock-in/clock-out inside the office'
              }
            ]
          }
     },
    { id: 5, title: '5. Policies & Procedures: Probation & Leave', duration: '2 Min 6 Sec', timestamp: 555.5 },
    { id: 6, title: '6. Policies & Procedures: Overtime & Sandwich Leave', duration: '1 Min 25 Sec', timestamp: 682 },
    { id: 7, title: '7. Policies & Procedures: Continued', duration: '1 Min 49 Sec', timestamp: 766.5,
        quiz: {
            title: 'Policy & Procedures Quiz',
            questions: [
              {
                id: 'q1', 
                text: 'Q2. During the six-month probation period, which leave type listed below cannot be taken?',
                options: [ 'A. Casual Leave', 'B. Sick Leave', 'C. Earned Leave (EL)', 'D. Compensatory Off'],
                correctAnswer: 'C. Earned Leave (EL)'
              },
              {
                id: 'q2', 
                text: 'Q3. If you take two or more consecutive sick-leave days, what must you provide?',
                options: ["A. No documentation is required", "B. An email notification only", "C. A doctor's medical certificate and prescription", "D. Your manager's verbal approval"],
                correctAnswer: "C. A doctor's medical certificate and prescription"
              },
              {
                id: 'q3', 
                text: 'Q3. In the event of a family emergency or when a family member is unwell, which type of leave would you typically apply for?',
                options: ['A. Sick Leave', 'B. Casual/Earned/Unpaid Leave'],
                correctAnswer: 'B. Casual/Earned/Unpaid Leave'
              },

              {
                id: 'q4', 
                text: 'Q4. Under the sandwich policy, if you are absent on both Friday and Monday without planning the leave two weeks in advance, how many leave days are deducted?',
                options: ['A. 2 days', 'B. 4 days (Friday + weekend + Monday)', 'C. 3 days', 'D. 1 day'],
                correctAnswer: 'B. 4 days (Friday + weekend + Monday)'
              }
            ]
          }
     },
    { id: 8, title: '8. PMS Cycle', duration: '1 Min 33 Sec', timestamp: 875.5 }, 
    { id: 9, title: '9. Performance Management (PMP)', duration: '2 Min 49 Sec', timestamp: 968.5, 
        quiz: {
            title: 'Performance Management Quiz',
            questions: [
              {
                id: 'q1', 
                text: "Q5. Othain's official Performance Management System (PMS) evaluation cycle runs from:",
                options: [ 'A. April – March', 'B. July – June', 'C. October – September', 'D. January – December'],
                correctAnswer: 'D. January – December'
              },
              {
                id: 'q2', 
                text: 'Q6. In the goal-setting framework for new employees, what percentage of goals relate to customers?',
                options: ['A. 20 %', 'B. 60 %', 'C. 40 %', 'D. 80 %'],
                correctAnswer: 'B. 60 %'
              }
            ]
          }
    },
    { id: 10, title: '10. Employee Benefits', duration: '55 Sec', timestamp: 1137.5, 
        quiz: {
            title: 'Employee Benefits Quiz',
            questions: [
              {
                id: 'q1', 
                text: 'Q7. What is the default medical-insurance coverage amount provided through ICICI Lombard?',
                options: [ 'A. ₹1 lakh', 'B. ₹5 lakhs', 'C. ₹10 lakhs', 'D. ₹2.5 lakhs'],
                correctAnswer: 'D. ₹2.5 lakhs'
              }
            ]
          }
     },
    { id: 11, title: '11. Questions', duration: '17 Sec', timestamp: 1192 },
    { id: 12, title: '12. Thank you!', duration: '9 Sec', timestamp: 1209 },
  ];

  const videoSrc = "/Onboarding_Video.mp4";

  const checkOverallCompletion = (currentChapterIdx) => {
    const lastChapterIndex = chapters.length - 1;
    const isLastChapter = currentChapterIdx === lastChapterIndex;
    const lastChapter = chapters[lastChapterIndex];
    const isLastChapterVideoViewed = completedChapters.has(lastChapterIndex);
    const isLastChapterQuizCompleted = !lastChapter.quiz || chapterQuizCompleted.has(lastChapterIndex);

    return isLastChapterVideoViewed && isLastChapterQuizCompleted;
  };

  const navigateToTimestamp = (chapterIndex, autoPlay = false) => {
    if (videoRef.current && chapters[chapterIndex]) {
      videoRef.current.currentTime = chapters[chapterIndex].timestamp;
      setCurrentChapterIndex(chapterIndex);
      if (autoPlay) {
        const chapter = chapters[chapterIndex];
        if (!(chapter.quiz && !chapterQuizCompleted.has(chapterIndex))) {
            videoRef.current.play().catch(error => console.error("Error attempting to play video:", error));
        }
      } else {
        const chapter = chapters[chapterIndex];
        if (chapter.quiz && !chapterQuizCompleted.has(chapterIndex)) {
            if(videoRef.current && !videoRef.current.paused) videoRef.current.pause();
        }
      }
    }
  };

  const handleNext = () => {
    if (currentChapterIndex < chapters.length - 1) {
      const nextChapterIndex = currentChapterIndex + 1;
      navigateToTimestamp(nextChapterIndex, true);
    }
  };

  const handlePrevious = () => {
    if (currentChapterIndex > 0) {
      navigateToTimestamp(currentChapterIndex - 1, false);
    }
  };

  const handleChapterClick = (index) => {
    navigateToTimestamp(index, true);
  };
  
  const showQuizForChapter = (chapterIndex) => {
    const chapter = chapters[chapterIndex];
    if (chapter && chapter.quiz && !chapterQuizCompleted.has(chapterIndex)) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      setActiveQuizData(chapter.quiz);
      setQuizFeedback(null);
      setQuizAttemptKey(prevKey => prevKey + 1);
      setQuizAttempts(0);
      setQuizOverlayVisible(true);
      return true;
    }
    return false;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const currentTime = videoRef.current.currentTime;
    const newCompletedChapters = new Set(completedChapters);
    let changedViewCompletion = false;
    
    chapters.forEach((chapter, index) => {
      const isChapterViewed = (index < chapters.length - 1) 
        ? (currentTime >= chapters[index + 1].timestamp) 
        : ( (currentTime >= chapter.timestamp + (parseFloat(chapter.duration.split(' ')[0]) || 1) -1 && videoRef.current.duration - currentTime < 1 ) || videoRef.current.ended );

      if (isChapterViewed && !newCompletedChapters.has(index)) {
        newCompletedChapters.add(index);
        changedViewCompletion = true;
        if (chapters[index].quiz && !chapterQuizCompleted.has(index)) {
            showQuizForChapter(index);
        }
      }
    });
    if (changedViewCompletion) {
      setCompletedChapters(newCompletedChapters);
    }
    const lastChapterIndex = chapters.length - 1;
    if (!chapters[lastChapterIndex]?.quiz && videoRef.current.duration - currentTime < 1) {
         if (checkOverallCompletion(lastChapterIndex)) {
            setShowCompletionOverlay(true);
        }
    }
  };

  const handleVideoEnded = () => {
    const lastChapterIndex = chapters.length - 1;
    if (chapters.length > 0) {
      if (!completedChapters.has(lastChapterIndex)){
        setCompletedChapters(prev => new Set(prev).add(lastChapterIndex));
      }
      if (chapters[lastChapterIndex].quiz && !chapterQuizCompleted.has(lastChapterIndex)) {
        showQuizForChapter(lastChapterIndex);
      } else if (checkOverallCompletion(lastChapterIndex)) {
        setShowCompletionOverlay(true);
      }
    }
  };

  const handleQuizSubmit = (submittedAnswers) => {
    if (!activeQuizData || !activeQuizData.questions) return;

    const incorrectQuestionIds = [];
    activeQuizData.questions.forEach(question => {
      if (submittedAnswers[question.id] !== question.correctAnswer) {
        incorrectQuestionIds.push(question.id);
      }
    });

    const newAttempts = quizAttempts + 1;
    setQuizAttempts(newAttempts);

    if (incorrectQuestionIds.length === 0) {
      setQuizFeedback({
        success: true,
        message: "Excellent! You got it right."
      });
    } else {
      if (newAttempts < 3) {
        setQuizFeedback({
          success: false,
          message: `Oops! Not quite. (Attempt ${newAttempts} of 3). Give it another shot!`,
          incorrectIds: incorrectQuestionIds
        });
      } else {
        setQuizFeedback({
          success: 'maxedOut',
          message: `That was the last try for this one. No worries, the main thing is to stay engaged! Let\'s move on.`,
          incorrectIds: incorrectQuestionIds
        });
      }
    }
    setQuizAttemptKey(prevKey => prevKey + 1);
  };

  const handleProceedAfterQuizAttempt = () => {
    const lastChapterIndex = chapters.length - 1;
    const justCompletedQuizIndex = currentChapterIndex;

    setChapterQuizCompleted(prev => new Set(prev).add(justCompletedQuizIndex));
    
    setQuizOverlayVisible(false);
    setActiveQuizData(null);
    setQuizFeedback(null);

    if (justCompletedQuizIndex === lastChapterIndex && (videoRef.current?.ended || (videoRef.current?.duration - videoRef.current?.currentTime < 1))) {
        if (checkOverallCompletion(lastChapterIndex)) {
            setShowCompletionOverlay(true);
        } else {
             if (currentChapterIndex < chapters.length - 1) { 
                navigateToTimestamp(currentChapterIndex + 1, true);
            } else if (videoRef.current && videoRef.current.paused && !videoRef.current.ended) {
                videoRef.current.play().catch(e => console.error("Error playing video to end:", e));
            }
        }
    } else if (currentChapterIndex < chapters.length - 1) {
        navigateToTimestamp(currentChapterIndex + 1, true);
    } else if (justCompletedQuizIndex === lastChapterIndex) { 
        if (checkOverallCompletion(lastChapterIndex)) { 
            setShowCompletionOverlay(true);
        } else if (videoRef.current && videoRef.current.paused && !videoRef.current.ended) {
            videoRef.current.play().catch(e => console.error("Error resuming video on last chapter:", e));
        }
    }
  };

  const handleCloseQuiz = () => {
    setQuizOverlayVisible(false);
    setActiveQuizData(null);
    setQuizFeedback(null); 
    setQuizAttemptKey(prevKey => prevKey + 1);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused || videoRef.current.ended) {
        videoRef.current.play().catch(error => console.error("Error attempting to play video:", error));
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleToggleFullscreen = () => {
    const elem = videoContainerRef.current;
    if (!elem) return;

    if (!document.fullscreenElement && 
        !document.mozFullScreenElement && 
        !document.webkitFullscreenElement && 
        !document.msFullscreenElement ) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    const updateFullscreenStatus = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement));
    };

    if (videoElement) {
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('pause', handlePause);
      setIsPlaying(!videoElement.paused && !videoElement.ended);

      videoElement.play().then(() => {
        setIsPlaying(true);
      }).catch(error => {
        console.warn("Autoplay prevented by browser policy:", error);
        setIsPlaying(false);
      });

      document.addEventListener('fullscreenchange', updateFullscreenStatus);
      document.addEventListener('webkitfullscreenchange', updateFullscreenStatus);
      document.addEventListener('mozfullscreenchange', updateFullscreenStatus);
      document.addEventListener('MSFullscreenChange', updateFullscreenStatus);
      updateFullscreenStatus();

      return () => {
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('pause', handlePause);
        document.removeEventListener('fullscreenchange', updateFullscreenStatus);
        document.removeEventListener('webkitfullscreenchange', updateFullscreenStatus);
        document.removeEventListener('mozfullscreenchange', updateFullscreenStatus);
        document.removeEventListener('MSFullscreenChange', updateFullscreenStatus);
      };
    }
  }, []);

  const handleGoHome = () => {
    navigate('/');
  };

  const isNextButtonDisabled = true;
  const progressValue = chapters.length > 0 ? (completedChapters.size / chapters.length) * 100 : 0;

  // Modern button styles
  const modernButtonStyles = {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '12px',
    padding: isMobile ? '8px 12px' : '10px 16px',
    color: 'white',
    fontSize: isMobile ? '0.75rem' : '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    '&:hover': {
      background: 'linear-gradient(135deg, #5856eb 0%, #7c3aed 100%)',
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)'
    },
    '&:disabled': {
      background: 'rgba(148, 163, 184, 0.5)',
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: 'none'
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: isDarkMode 
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Particles */}
      {[...Array(12)].map((_, i) => (
        <FloatingParticle key={i} delay={i * 0.5} />
      ))}

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
        {/* Hero Header */}
        <Fade in timeout={800}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <VideoIcon sx={{ 
                  fontSize: { xs: '2rem', md: '3rem' }, 
                  mr: 2,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: '50%',
                  p: 1,
                  color: 'white'
                }} />
                <Typography variant={isMobile ? "h4" : "h2"} sx={{ 
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  ...(isDarkMode && {
                    background: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  })
                }}>
                  Onboarding Experience
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ 
                color: isDarkMode ? '#94a3b8' : '#64748b',
                fontWeight: 500,
                maxWidth: '600px',
                mx: 'auto',
                fontSize: { xs: '0.9rem', md: '1.1rem' }
              }}>
                Welcome to Othain! Learn about our company culture, policies, and procedures
              </Typography>
            </motion.div>
          </Box>
        </Fade>

        <motion.div
        initial="hidden"
        animate="visible"
          variants={containerVariants}
        >
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
            gap: 4,
            alignItems: 'start'
          }}>
            {/* Video Section */}
            <motion.div variants={itemVariants}>
              <Card sx={{
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(20px)',
                border: isDarkMode ? '1px solid rgba(51, 65, 85, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                borderRadius: '24px',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
              }}>
                <CardContent sx={{ p: 4 }}>
                  {/* Progress Section */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SchoolIcon sx={{ color: '#6366f1', fontSize: '1.25rem' }} />
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700,
                          color: isDarkMode ? '#f1f5f9' : '#1e293b'
                        }}>
                          {chapters[currentChapterIndex]?.title || 'Welcome to Our Platform!'}
            </Typography>
          </Box>
                      <Chip 
                        label={`${completedChapters.size} / ${chapters.length} Complete`}
                        sx={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }}
                      />
                    </Box>
                    
          <LinearProgress 
            variant="determinate" 
            value={progressValue} 
            sx={{ 
              height: 8, 
              borderRadius: 20, 
                        backgroundColor: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)',
              '& .MuiLinearProgress-bar': { 
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          borderRadius: 20
              }
            }} 
          />
        </Box>

                  {/* Video Player */}
                  <Box 
          ref={videoContainerRef}
                    sx={{ 
                      position: 'relative',
            borderRadius: '20px',
                      overflow: 'hidden',
                      background: '#000',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                      mb: 3
          }}
        >
          <video 
            ref={videoRef}
            width="100%" 
                      style={{ 
                        display: 'block', 
                        borderRadius: '20px', 
                        cursor: 'pointer'
            }}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            onClick={togglePlayPause}
          >
            <source src={videoSrc} type="video/mp4" />
                      Your browser does not support the video tag.
          </video>

                    {/* Enhanced Controls */}
                    <Box sx={{
              position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
                      p: 2
                    }}>
                      <Box sx={{
              display: 'flex', 
              alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
              flexWrap: 'wrap' 
                      }}>
                        <Box
                          component="button"
                          onClick={handlePrevious}
                          disabled={currentChapterIndex === 0}
                          sx={{
                            ...modernButtonStyles,
                            minWidth: 'auto',
                            padding: '8px'
            }}
          >
                          <SkipPreviousIcon fontSize="small" />
                        </Box>

                        <Box
                          component="button"
              onClick={togglePlayPause}
                          sx={{
                            ...modernButtonStyles,
                            minWidth: 'auto',
                            padding: '8px'
                          }}
            >
                          {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                        </Box>

                        <Box
                          component="button"
              onClick={handleNext} 
              disabled={isNextButtonDisabled}
                          sx={{
                            ...modernButtonStyles,
                            minWidth: 'auto',
                            padding: '8px'
                          }}
            >
                          <SkipNextIcon fontSize="small" />
                        </Box>

                        <Box
                          component="button"
              onClick={handleToggleFullscreen}
                          sx={{
                            ...modernButtonStyles,
                            minWidth: 'auto',
                            padding: '8px'
                          }}
            >
                          {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  {/* Video Description */}
                  <Box>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700,
                      color: isDarkMode ? '#f1f5f9' : '#1e293b',
                      mb: 2
                    }}>
                      About Othain Onboarding
                    </Typography>
                    <Typography variant="body1" sx={{ 
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      lineHeight: 1.7
                    }}>
                      Welcome to your Othain onboarding! This course is structured to give you a clear understanding of our company, from our team and processes to essential HR policies and employee benefits. Each section is designed to help you get started confidently and quickly.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>

            {/* Chapters Sidebar */}
            <motion.div variants={itemVariants}>
              <Card sx={{
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(20px)',
                border: isDarkMode ? '1px solid rgba(51, 65, 85, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                borderRadius: '24px',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.1)',
                position: 'sticky',
                top: '2rem',
                maxHeight: 'calc(100vh - 4rem)',
                overflow: 'hidden'
              }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700,
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <SchoolIcon sx={{ color: '#8b5cf6' }} />
                    Course Sections
                  </Typography>
                  
                  <Box sx={{ 
                    maxHeight: 'calc(100vh - 12rem)',
                    overflowY: 'auto',
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
          {chapters.map((chapter, index) => {
            const isCompleted = completedChapters.has(index);
            const isActive = index === currentChapterIndex;

            return (
                          <motion.div
                key={chapter.id} 
                            custom={index}
                            initial="hidden"
                            animate="visible"
                            variants={chapterVariants}
                          >
                            <Box
                              onClick={() => handleChapterClick(index)}
                              sx={{
                                p: 2,
                                mb: 1,
                                borderRadius: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                background: isActive 
                                  ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'
                                  : isCompleted
                                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
                                    : 'transparent',
                                border: isActive 
                                  ? '2px solid rgba(99, 102, 241, 0.3)'
                                  : isCompleted
                                    ? '1px solid rgba(16, 185, 129, 0.2)'
                                    : `1px solid ${isDarkMode ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.3)'}`,
                                '&:hover': {
                                  transform: 'translateX(4px)',
                                  background: isActive 
                                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)'
                                    : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                                  boxShadow: '0 8px 25px rgba(99, 102, 241, 0.15)'
                                }
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{
                                    fontWeight: isActive ? 700 : 600,
                                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                                    mb: 0.5,
                                    fontSize: '0.875rem'
                                  }}>
                    {chapter.title}
                                  </Typography>
                                  <Typography variant="caption" sx={{
                                    color: isDarkMode ? '#94a3b8' : '#64748b',
                                    fontSize: '0.75rem'
                                  }}>
                    {chapter.duration}
                                  </Typography>
                                </Box>
                {isCompleted && (
                                  <CheckCircleIcon sx={{ 
                                    color: '#10b981',
                                    fontSize: '1.25rem',
                                    ml: 1
                                  }} />
                )}
                              </Box>
                            </Box>
                          </motion.div>
            );
          })}
                    </AnimatePresence>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Box>
        </motion.div>
      </Container>

      {/* Overlays */}
      {quizOverlayVisible && activeQuizData && (
        ReactDOM.createPortal(
          <QuizOverlay
            key={quizAttemptKey}
            quizData={activeQuizData}
            feedback={quizFeedback}
            onSubmit={handleQuizSubmit}
            onClose={handleCloseQuiz}
            onProceed={handleProceedAfterQuizAttempt}
            isFullscreen={true}
          />,
          document.body
        )
      )}

      {showCompletionOverlay && (
        ReactDOM.createPortal(
          <CompletionOverlay
            message="You have successfully completed the onboarding video."
            onGoHome={handleGoHome}
            isFullscreen={true}
          />,
          document.body
        )
      )}
    </Box>
  );
};

export default OnboardingPage;
