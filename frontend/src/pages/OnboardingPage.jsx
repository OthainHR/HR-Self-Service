import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  LinearProgress
} from '@mui/material';
import { PlayArrow as PlayArrowIcon, Pause as PauseIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import QuizOverlay from '../components/QuizOverlay';
import CompletionOverlay from '../components/CompletionOverlay';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useTheme, useMediaQuery } from '@mui/material';
import ReactDOM from 'react-dom'; // Ensure this import is present

// Placeholder QuizOverlay component (we will create this file next)
/*
const QuizOverlay = ({ quizData, onSubmit, onClose }) => {
  // ... (placeholder code removed) ...
};
*/

const OnboardingPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null); // Ref for the video's parent div for fullscreen
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [completedChapters, setCompletedChapters] = useState(new Set());
  const [chapterQuizCompleted, setChapterQuizCompleted] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false); // New state for fullscreen status
  const [quizOverlayVisible, setQuizOverlayVisible] = useState(false);
  const [activeQuizData, setActiveQuizData] = useState(null);
  const [quizAttemptKey, setQuizAttemptKey] = useState(0); // Key to force re-render/reset of QuizOverlay
  const [quizFeedback, setQuizFeedback] = useState(null); // { message: string, incorrectIds?: string[], success?: boolean }
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const { isDarkMode } = useDarkMode(); // Get dark mode state
  const theme = useTheme(); // MUI theme
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // Check for mobile screen size
  const [quizAttempts, setQuizAttempts] = useState(0); // ADDED: For quiz attempts

  // Glassmorphism shared styles
  const glassStyles = {
    backgroundColor: isDarkMode ? 'rgba(30,30,30,0.15)' : 'rgba(255,255,255,0.15)',
    border: '0px solid rgba(255,255,255,0.3)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    
    borderRadius: '16px', // Added borderRadius for glass effect
  };

  // Add timestamps (in seconds) to your chapters
  // PLEASE UPDATE THESE TIMESTAMPS TO MATCH YOUR VIDEO
  const chapters = [
    { id: 1, title: '1. Welcome to Othain', duration: '1 Min 48 Sec', timestamp: 0 },
    { id: 2, title: '2. About Our Team', duration: '1 Min 54 Sec', timestamp: 108 }, // e.g., 1 minute
    {
      id: 3, title: '3. Onboarding Process', duration: '1 Min 10 Sec', timestamp: 222.5},
    { id: 4, title: '4. Policies & Procedures: Attendance', duration: '4 Min 23 Sec', timestamp: 292,
        quiz: {
            title: 'Attendance Policy Quiz',
            questions: [
              {
                id: 'q1', 
                text: "Q1. At Othain's Building B9, which clock-in/clock-out method must employees use?",
                options: [ 'A. Biometric scanner', 'B. Web clock-in/clock-out inside the office', 'C. Remote clock-in/clock-out from any location', 'D. Manual sign-in sheet'],
                correctAnswer: 'B. Web clock-in/clock-out inside the office' // Or index 3
              }
            ]
          }
     }, // e.g., 4.5 minutes
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
                correctAnswer: 'C. Earned Leave (EL)' // Or index 3
              },
              {
                id: 'q2', 
                text: 'Q3. If you take three consecutive sick-leave days, what must you provide?',
                options: ["A. No documentation is required", "B. An email notification only", "C. A doctor's medical certificate and prescription", "D. Your manager's verbal approval"],
                correctAnswer: "C. A doctor's medical certificate and prescription" // Or index 2
              },
              {
                id: 'q3', 
                text: 'Q4. Under the sandwich policy, if you are absent on both Friday and Monday without planning the leave two weeks in advance, how many leave days are deducted?',
                options: ['A. 2 days', 'B. 4 days (Friday + weekend + Monday)', 'C. 3 days', 'D. 1 day'],
                correctAnswer: 'B. 4 days (Friday + weekend + Monday)' // Or index 2
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
                correctAnswer: 'D. January – December' // Or index 3
              },
              {
                id: 'q2', 
                text: 'Q6. In the goal-setting framework for new employees, what percentage of goals relate to customers?',
                options: ['A. 20 %', 'B. 60 %', 'C. 40 %', 'D. 80 %'],
                correctAnswer: 'B. 60 %' // Or index 2
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
                correctAnswer: 'D. ₹2.5 lakhs' // Or index 3
              }
            ]
          }
     },
    { id: 11, title: '11. Questions', duration: '17 Sec', timestamp: 1192 },
    { id: 12, title: '12. Thank you!', duration: '9 Sec', timestamp: 1209 },
    
  ];
  const videoSrc = "/Onboarding_Video.mp4"; // User updated video path

  const checkOverallCompletion = (currentChapterIdx) => {
    const lastChapterIndex = chapters.length - 1;
    const isLastChapter = currentChapterIdx === lastChapterIndex;
    const lastChapter = chapters[lastChapterIndex];
    const isLastChapterVideoViewed = completedChapters.has(lastChapterIndex);
    const isLastChapterQuizCompleted = !lastChapter.quiz || chapterQuizCompleted.has(lastChapterIndex);

    // Consider overall complete if the last chapter's video is viewed 
    // AND its quiz (if it has one) is also completed.
    return isLastChapterVideoViewed && isLastChapterQuizCompleted;
  };

  const navigateToTimestamp = (chapterIndex, autoPlay = false) => {
    if (videoRef.current && chapters[chapterIndex]) {
      videoRef.current.currentTime = chapters[chapterIndex].timestamp;
      setCurrentChapterIndex(chapterIndex);
      if (autoPlay) {
        // If there's an incomplete quiz for this chapter, don't autoplay yet.
        // Autoplay will be handled after quiz completion if needed.
        const chapter = chapters[chapterIndex];
        if (!(chapter.quiz && !chapterQuizCompleted.has(chapterIndex))) {
            videoRef.current.play().catch(error => console.error("Error attempting to play video:", error));
        }
      } else {
        // If not autoplaying, but seeking to a chapter with an incomplete quiz, ensure video is paused.
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
      // Check if current chapter had a quiz that was just completed, then proceed.
      // Otherwise, standard navigation applies (which will be gated by quiz check later).
      navigateToTimestamp(nextChapterIndex, true);
    }
  };

  const handlePrevious = () => {
    if (currentChapterIndex > 0) {
      navigateToTimestamp(currentChapterIndex - 1, false); // Typically don't autoplay on previous
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
      setQuizFeedback(null); // Clear previous feedback
      setQuizAttemptKey(prevKey => prevKey + 1); // Reset quiz form for a fresh attempt
      setQuizAttempts(0); // <<<< MODIFIED: Reset attempts for the new quiz
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
        // If this chapter's video part is now viewed, and it has a quiz not yet passed, trigger it.
        if (chapters[index].quiz && !chapterQuizCompleted.has(index)) {
            // Quiz is triggered, but don't check for overall completion here yet,
            // wait for quiz result or video end.
            showQuizForChapter(index);
        }
      }
    });
    if (changedViewCompletion) {
      setCompletedChapters(newCompletedChapters);
    }
    // Check for completion ONLY if the video is near the end AND the last chapter has no quiz
    // Completion after a quiz is handled in handleProceedAfterQuizAttempt or handleVideoEnded
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
      // Ensure last chapter video view is marked complete
      if (!completedChapters.has(lastChapterIndex)){
        setCompletedChapters(prev => new Set(prev).add(lastChapterIndex));
      }
      // If last chapter has a quiz, trigger it if not done.
      // If no quiz OR quiz already done, check for overall completion.
      if (chapters[lastChapterIndex].quiz && !chapterQuizCompleted.has(lastChapterIndex)) {
        showQuizForChapter(lastChapterIndex);
      } else if (checkOverallCompletion(lastChapterIndex)) {
        // Video ended, last chapter viewed, and quiz (if exists) is done.
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
    setQuizAttempts(newAttempts); // Update attempt count immediately

    if (incorrectQuestionIds.length === 0) {
      // Quiz Passed
      setQuizFeedback({
        success: true,
        message: "Excellent! You got it right."
      });
    } else {
      // Quiz Failed
      if (newAttempts < 3) {
        setQuizFeedback({
          success: false,
          message: `Oops! Not quite. (Attempt ${newAttempts} of 3). Give it another shot!`,
          incorrectIds: incorrectQuestionIds
        });
      } else { // Max attempts (3) reached
        setQuizFeedback({
          success: 'maxedOut', // Special state for max attempts but proceed
          message: `That was the last try for this one. No worries, the main thing is to stay engaged! Let\'s move on.`,
          incorrectIds: incorrectQuestionIds // Still useful to show what was incorrect
        });
      }
    }
    setQuizAttemptKey(prevKey => prevKey + 1); // Force re-render/reset of QuizOverlay with new feedback
  };

  const handleProceedAfterQuizAttempt = () => {
    const lastChapterIndex = chapters.length - 1;
    const justCompletedQuizIndex = currentChapterIndex;

    setChapterQuizCompleted(prev => new Set(prev).add(justCompletedQuizIndex));
    
    setQuizOverlayVisible(false);
    setActiveQuizData(null);
    setQuizFeedback(null);
    // quizAttempts will be reset by showQuizForChapter if another quiz is shown

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
    // This function is now primarily for if the user closes a failed quiz attempt, 
    // or if a future design allows closing a quiz before attempting it.
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
    const elem = videoContainerRef.current; // Target the container
    if (!elem) return;

    if (!document.fullscreenElement && 
        !document.mozFullScreenElement && 
        !document.webkitFullscreenElement && 
        !document.msFullscreenElement ) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.mozRequestFullScreen) { /* Firefox */
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { /* IE/Edge */
        elem.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) { /* Firefox */
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) { /* Chrome, Safari & Opera */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE/Edge */
        document.msExitFullscreen();
      }
    }
  };

  // Effect to set initial chapter or handle external changes if needed
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
      // Initial state sync
      setIsPlaying(!videoElement.paused && !videoElement.ended);

      // Attempt Autoplay on Mount
      videoElement.play().then(() => {
        // Autoplay started successfully
        setIsPlaying(true);
      }).catch(error => {
        // Autoplay was prevented.
        console.warn("Autoplay prevented by browser policy:", error);
        setIsPlaying(false); // Ensure state reflects that it's not playing
      });

      document.addEventListener('fullscreenchange', updateFullscreenStatus);
      document.addEventListener('webkitfullscreenchange', updateFullscreenStatus);
      document.addEventListener('mozfullscreenchange', updateFullscreenStatus);
      document.addEventListener('MSFullscreenChange', updateFullscreenStatus);
      updateFullscreenStatus(); // Initial check

      return () => {
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('pause', handlePause);
        document.removeEventListener('fullscreenchange', updateFullscreenStatus);
        document.removeEventListener('webkitfullscreenchange', updateFullscreenStatus);
        document.removeEventListener('mozfullscreenchange', updateFullscreenStatus);
        document.removeEventListener('MSFullscreenChange', updateFullscreenStatus);
      };
    }
  }, []); // Empty array ensures this runs only on mount

  const handleGoHome = () => {
    navigate('/'); // Navigate to home page
  };

  const isNextButtonDisabled = true; // Always disable the Next Section button

  const progressValue = chapters.length > 0 ? (completedChapters.size / chapters.length) * 100 : 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row', // Stack on mobile, row on desktop
      gap: '20px',
      padding: isMobile ? '10px' : '20px',
      minHeight: 'calc(100vh - 64px)', // Adjust for NavBar height
      boxSizing: 'border-box',
      ...glassStyles, // Apply to main page container
      backgroundColor: 'transparent', // Override bgcolor from glassStyles for the main page container if needed, or use a more transparent one
      border: 'none', // Override border for the main page container
      boxShadow: 'none', // Override boxShadow for the main page container
    }}>
      {/* Left Side (or Top on Mobile): Video Player and Title */}
      <div style={{ 
        flex: isMobile ? '1 1 100%' : 3, // Full width on mobile
        marginRight: isMobile ? '0px' : '20px', // No right margin on mobile
        marginBottom: isMobile ? '20px' : '0px' // Margin below video section on mobile
      }}>
        {/* Progress Bar Section */}
        <Box sx={{ mb: 2, width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" sx={{ color: (isFullscreen || isDarkMode) ? '#ccc' : 'text.secondary', fontWeight: 500 }}>
              Onboarding Progress
            </Typography>
            <Typography variant="caption" sx={{ color: (isFullscreen || isDarkMode) ? '#bbb' : 'text.secondary' }}>
              {completedChapters.size} / {chapters.length} Sections
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progressValue} 
            sx={{ 
              height: 8, 
              borderRadius: 20, 
              backgroundColor: isDarkMode ? '#555' : '#e0e0e0', // Set background color for contrast
              '& .MuiLinearProgress-bar': { 
                backgroundColor: '#3fc380' // Set the bar color
              }
            }} 
          />
        </Box>

        <h1 style={{ 
          marginBottom: '10px', 
          color: (isFullscreen || isDarkMode) ? '#fff' : '#000',
          fontSize: isMobile ? '1.5rem' : (isFullscreen ? '2rem' : '2.2rem') // Responsive title font
        }}>
            {chapters[currentChapterIndex]?.title || 'Welcome to Our Platform!'}
        </h1>
        
        <div 
          ref={videoContainerRef}
          style={{ 
            width: '100%', 
            backgroundColor: '#000',
            borderRadius: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: isFullscreen ? 'hidden' : 'visible',
            position: 'relative', // Keep relative for portal target positioning
            marginBottom: '20px'
          }}
        >
          <video 
            ref={videoRef}
            width="100%" 
            style={{ display: 'block', borderRadius: '20px', cursor: 'pointer' }}
            onLoadedMetadata={() => {
              // Optional: if (currentChapterIndex === 0 && chapters[0]) videoRef.current.currentTime = chapters[0].timestamp;
            }}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            onClick={togglePlayPause}
          >
            <source src={videoSrc} type="video/mp4" />
            Your browser does not support the video tag. Please try a different browser.
          </video>
          <div 
            style={isFullscreen ? {
              position: 'absolute',
              bottom: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100% - 40px)',
              maxWidth: '600px',
              padding: '5px 10px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: '20px',
              display: 'flex', 
              justifyContent: 'space-around',
              alignItems: 'center',
              zIndex: 10, // zIndex for controls
              transition: 'opacity 0.3s ease',
              flexWrap: 'wrap' 
            } : {
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: isMobile ? '8px 0' : '10px 0', 
              flexWrap: 'wrap' 
            }}
          >
            
            <button
              onClick={togglePlayPause}
              style={{...buttonStyle(false, isMobile), minWidth: isMobile ? '40px' : '50px', marginLeft: isMobile ? '5px' : '10px', marginBottom: isMobile ? '5px' : '0'}}
            >
              {isPlaying ? <PauseIcon fontSize={isMobile ? "small" : "medium"} /> : <PlayArrowIcon fontSize={isMobile ? "small" : "medium"} />}
            </button>
            <button 
              onClick={handlePrevious} 
              disabled={currentChapterIndex === 0}
              style={{...buttonStyle(currentChapterIndex === 0, isMobile), marginBottom: isMobile ? '5px' : '0'}}
            >
              Previous Section
            </button>
            <button 
              onClick={handleNext} 
              disabled={isNextButtonDisabled}
              style={{...buttonStyle(isNextButtonDisabled, isMobile), marginBottom: isMobile ? '5px' : '0', marginRight: isMobile ? '10px' : '5px'}}
            >
              Next Section
            </button>
            <button
              onClick={handleToggleFullscreen}
              style={{...buttonStyle(false, isMobile), marginRight: isMobile ? '5px' : '10px', marginBottom: isMobile ? '5px' : '0', marginTop: isMobile ? '5px' : '0', marginLeft: isMobile ? '5px' : '10px'}}
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
          {/* Portal Target for Overlays */}
          <div 
            id="fullscreen-overlay-portal-target" 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              zIndex: 100, // Higher than video controls if they are also absolute positioned within
              pointerEvents: (quizOverlayVisible || showCompletionOverlay) ? 'auto' : 'none' // Allow interaction only when overlay is visible
            }}
          ></div>
        </div>

        <div style={{
          color: (isFullscreen || isDarkMode) ? '#fff' : '#000'
        }}>
          <h2 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem' }}>About Othain Onboarding</h2>
          <p style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
          Welcome to your Othain onboarding! This course is structured to give you a clear understanding of our company, from our team and processes to essential HR policies and employee benefits. Each section is designed to help you get started confidently and quickly. We recommend progressing through all sections to ensure you're fully acquainted with our platform and procedures.
          </p>
        </div>
      </div>

      {/* Right Side (or Bottom on Mobile): Section List */}
      <div style={{
          flex: isMobile ? '1 1 100%' : (isFullscreen ? '0 0 30%' : 1),  // Full width on mobile
          borderLeft: isMobile || isFullscreen ? 'none' : (isDarkMode ? '1px solid #444' : '1px solid #ccc'), 
          paddingLeft: isMobile || isFullscreen ? '0px' : '20px', 
          marginTop: isMobile ? '20px' : '0px', // Add margin top on mobile
          borderRadius: '20px',
          backgroundColor: isFullscreen ? '#333' : (isDarkMode ? '#1e1e1e' : 'transparent'),
          color: isFullscreen ? '#fff' : (isDarkMode ? '#fff' : '#000'),
          height: isFullscreen ? 'calc(100vh - 20px)' : 'auto',
          overflowY: 'auto'
      }}>
        <h2 style={{ 
          marginBottom: '15px', 
          marginTop: isMobile ? '0px' : '15px', // No top margin if already spaced by parent
          fontSize: isMobile ? '1.2rem' : '1.5rem' 
        }}>Sections</h2>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {chapters.map((chapter, index) => {
            const isCompleted = completedChapters.has(index);
            const isActive = index === currentChapterIndex;
            const durationColor = isFullscreen ? '#ccc' : (isDarkMode ? '#bbb' : '#555');

            return (
              <li 
                key={chapter.id} 
                style={{
                  ...chapterItemStyle(isActive, isCompleted, isFullscreen, isDarkMode, isMobile, glassStyles),
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onClick={() => handleChapterClick(index)}
              >
                {/* Text content div (Title + Duration) */}
                <div> 
                  <div style={{ fontWeight: isActive ? 'bold' : 'normal' }}>
                    {chapter.title}
                  </div>
                  <div style={{ fontSize: '0.9em', color: durationColor }}> 
                    {chapter.duration}
                  </div>
                </div>
                
                {/* Conditionally render SVG Icon on the right */}
                {isCompleted && (
                  <img 
                    src={process.env.PUBLIC_URL + '/checkmark-svgrepo-com.svg'}
                    alt="Completed" 
                    style={{ 
                      height: '18px', // Adjust size as needed
                      width: '18px',  // Adjust size as needed
                      marginLeft: '10px' 
                    }} 
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Portaled Overlays - MODIFIED prop name */}
      {quizOverlayVisible && activeQuizData && document.getElementById('fullscreen-overlay-portal-target') && (
        ReactDOM.createPortal(
          <QuizOverlay 
            key={quizAttemptKey}
            quizData={activeQuizData} 
            feedback={quizFeedback}
            onSubmit={handleQuizSubmit} 
            onClose={handleCloseQuiz} 
            onProceed={handleProceedAfterQuizAttempt} // MODIFIED: Renamed from onSuccessContinue
            isFullscreen={isFullscreen} 
          />,
          document.getElementById('fullscreen-overlay-portal-target')
        )
      )}

      {showCompletionOverlay && document.getElementById('fullscreen-overlay-portal-target') && (
        ReactDOM.createPortal(
          <CompletionOverlay 
            message="You have successfully completed the onboarding video."
            onGoHome={handleGoHome}
            isFullscreen={isFullscreen}
          />,
          document.getElementById('fullscreen-overlay-portal-target')
        )
      )}
    </div>
  );
};

// Helper for button styling - added isMobile for responsive font size
const buttonStyle = (disabled, isMobile) => ({
  padding: isMobile ? '4px 8px' : '8px 12px',      // Reduced mobile padding
  fontSize: isMobile ? '0.7em' : '0.9em',     // Reduced mobile font size
  cursor: disabled ? 'not-allowed' : 'pointer',
  backgroundColor: disabled ? '#555' : '#4361ee',
  color: 'white',
  border: 'none',
  borderRadius: '20px',
  opacity: disabled ? 0.6 : 1,
  margin: '0 3px',
  transition: 'background-color 0.2s ease, transform 0.1s ease, opacity 0.2s ease', // Added transition
  '&:hover': {
     backgroundColor: disabled ? '#555' : '#3a56d4', // Darken on hover (if not disabled)
     transform: disabled ? 'none' : 'scale(1.03)' // Slight scale on hover
  }
});

// Updated chapterItemStyle to handle general dark mode for non-fullscreen
const chapterItemStyle = (isActive, isCompleted, isFullscreenMode, isAppDarkMode, isMobile, glassStyles) => ({
  padding: isMobile ? '10px 5px' : '12px 8px',
  borderBottom: isFullscreenMode ? '1px solid #444' : (isAppDarkMode ? '1px solid #383838' : '1px solid #eee'),
  cursor: 'pointer',
  marginBottom: '10px',
  marginRight: '10px',
  ...glassStyles, // Apply glassStyles to chapter items
  backgroundColor: (() => {
    let baseBg = glassStyles.backgroundColor;
    if (isFullscreenMode) return isActive ? 'rgba(85,85,85,0.5)' : (isCompleted ? 'rgba(42,58,42,0.5)' : baseBg);
    if (isAppDarkMode) return isActive ? 'rgba(56,56,56,0.5)' : (isCompleted ? 'rgba(32,48,32,0.5)' : baseBg);
    return isActive ? 'rgba(224,224,224,0.5)' : (isCompleted ? 'rgba(230,255,230,0.5)' : baseBg);
  })(),
  color: (isFullscreenMode || isAppDarkMode) ? '#fff' : '#000',
  transition: 'background-color 0.2s ease, color 0.2s ease, transform 0.15s ease, backdrop-filter 0.2s ease',
  opacity: isCompleted && !isActive && !isFullscreenMode && !isAppDarkMode ? 0.7 : 1,
  '&:hover': {
    transform: 'translateX(3px)',
    backdropFilter: 'blur(12px)', // Enhance blur on hover
    WebkitBackdropFilter: 'blur(12px)',
    backgroundColor: (() => {
      let hoverBg = isAppDarkMode ? 'rgba(30,30,30,0.25)' : 'rgba(255,255,255,0.25)';
      if (isFullscreenMode) return isActive ? 'rgba(102,102,102,0.6)' : (isCompleted ? 'rgba(58,74,58,0.6)' : hoverBg);
      if (isAppDarkMode) return isActive ? 'rgba(72,72,72,0.6)' : (isCompleted ? 'rgba(48,64,48,0.6)' : hoverBg);
      if (isMobile) return isActive ? 'rgba(213,213,213,0.6)' : (isCompleted ? 'rgba(217,242,217,0.6)' : hoverBg);
      return isActive ? 'rgba(213,213,213,0.6)' : (isCompleted ? 'rgba(217,242,217,0.6)' : hoverBg);
    })()
  }
});

export default OnboardingPage;
