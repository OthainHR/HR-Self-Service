import React, { useRef, useState, useEffect } from 'react';
import { PlayArrow as PlayArrowIcon, Pause as PauseIcon } from '@mui/icons-material'; // Import icons

const OnboardingPage = () => {
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null); // Ref for the video's parent div for fullscreen
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [completedChapters, setCompletedChapters] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false); // New state for fullscreen status

  // Add timestamps (in seconds) to your chapters
  // PLEASE UPDATE THESE TIMESTAMPS TO MATCH YOUR VIDEO
  const chapters = [
    { id: 1, title: '1. Welcome to Othain', duration: '1 Min 48 Sec', timestamp: 0 },
    { id: 2, title: '2. About Our Team', duration: '1 Min 54 Sec', timestamp: 108 }, // e.g., 1 minute
    { id: 3, title: '3. Onboarding Process', duration: '1 Min 10 Sec', timestamp: 222.5 },// e.g., 2.5 minutes
    { id: 4, title: '4. Policies & Procedures: Attendance', duration: '4 Min 23 Sec', timestamp: 292 }, // e.g., 4.5 minutes
    { id: 5, title: '5. Policies & Procedures: Probation & Leave', duration: '2 Min 6 Sec', timestamp: 555.5 },
    { id: 6, title: '6. Policies & Procedures: Overtime & Sandwich Leave', duration: '1 Min 25 Sec', timestamp: 682 },
    { id: 7, title: '7. Policies & Procedures: Continued', duration: '1 Min 49 Sec', timestamp: 766.5 },
    { id: 8, title: '8. PMS Cycle', duration: '1 Min 33 Sec', timestamp: 875.5 }, 
    { id: 9, title: '9. Performance Management (PMP)', duration: '2 Min 49 Sec', timestamp: 968.5 },
    { id: 10, title: '10. Employee Benefits', duration: '55 Sec', timestamp: 1137.5 },
    { id: 11, title: '11. Questions', duration: '17 Sec', timestamp: 1192 },
    { id: 12, title: '12. Thank you!', duration: '9 Sec', timestamp: 1209 },
    
  ];
  const videoSrc = "/Onboarding_Video.mp4"; // User updated video path

  const navigateToTimestamp = (chapterIndex, autoPlay = false) => {
    if (videoRef.current && chapters[chapterIndex]) {
      videoRef.current.currentTime = chapters[chapterIndex].timestamp;
      setCurrentChapterIndex(chapterIndex);
      if (autoPlay) {
        videoRef.current.play().catch(error => console.error("Error attempting to play video:", error));
      }
    }
  };

  const handleNext = () => {
    if (currentChapterIndex < chapters.length - 1) {
      navigateToTimestamp(currentChapterIndex + 1, true);
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
  
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const currentTime = videoRef.current.currentTime;
    const newCompletedChapters = new Set(completedChapters);
    let changed = false;

    chapters.forEach((chapter, index) => {
      if (index < chapters.length - 1) { // For all chapters except the last one
        if (currentTime >= chapters[index + 1].timestamp) {
          if (!newCompletedChapters.has(index)) {
            newCompletedChapters.add(index);
            changed = true;
          }
        }
      } else { // For the last chapter, completion is handled by onEnded or if currentTime exceeds its start
        // We can also consider the last chapter completed if the video plays a bit past its start time
        // This is a fallback in case onEnded doesn't fire or for a different UX definition of "complete"
        if (currentTime >= chapter.timestamp + (parseFloat(chapter.duration.split(' ')[0]) || 1) -1 && videoRef.current.duration - currentTime < 1 ) { // Check if near end
            if (!newCompletedChapters.has(index)) {
                newCompletedChapters.add(index);
                changed = true;
            }
        }
      }
    });

    if (changed) {
      setCompletedChapters(newCompletedChapters);
    }
  };

  const handleVideoEnded = () => {
    if (chapters.length > 0 && !completedChapters.has(chapters.length - 1)) {
      setCompletedChapters(prev => new Set(prev).add(chapters.length - 1));
    }
    // Potentially mark all previous chapters as complete too, as a fallback
    // setCompletedChapters(new Set(chapters.map((_, idx) => idx)));
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
      setIsFullscreen(!!(document.fullscreenElement || 
                        document.mozFullScreenElement || 
                        document.webkitFullscreenElement || 
                        document.msFullscreenElement));
    };

    if (videoElement) {
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('pause', handlePause);
      setIsPlaying(!videoElement.paused && !videoElement.ended);

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
  }, []);

  return (
    <div style={{ display: 'flex', fontFamily: 'Arial, sans-serif', margin: '20px' }}>
      {/* Left Side: Video Player and Title */}
      <div style={{ flex: 3, marginRight: '20px' }}>
        <h1 style={{ marginBottom: '10px' }}>{chapters[currentChapterIndex]?.title || 'Welcome to Our Platform!'}</h1>
        
        <div 
          ref={videoContainerRef}
          style={{ 
            width: '100%', 
            backgroundColor: '#000',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: isFullscreen ? 'hidden' : 'visible',
            position: 'relative',
            marginBottom: '20px'
          }}
        >
          <video 
            ref={videoRef}
            width="100%" 
            style={{ display: 'block', borderRadius: '8px' }}
            onLoadedMetadata={() => {
              // Optional: if you want to ensure the first chapter timestamp is set after metadata loads
              // if(currentChapterIndex === 0 && chapters[0]) videoRef.current.currentTime = chapters[0].timestamp;
            }}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
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
              borderRadius: '5px',
              display: 'flex', 
              justifyContent: 'space-around',
              alignItems: 'center',
              zIndex: 10,
              transition: 'opacity 0.3s ease'
            } : {
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
            }}
          >
            
            <button
              onClick={togglePlayPause}
              style={{...buttonStyle(false), minWidth: '50px', marginLeft: '10px'}}
            >
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </button>
            <button 
              onClick={handlePrevious} 
              disabled={currentChapterIndex === 0}
              style={{...buttonStyle(currentChapterIndex === 0)}}
            >
              Previous Section
            </button>
            <button 
              onClick={handleNext} 
              disabled={ 
                currentChapterIndex === chapters.length - 1 || 
                (!completedChapters.has(currentChapterIndex) && currentChapterIndex < chapters.length - 1)
              }
              style={buttonStyle(
                currentChapterIndex === chapters.length - 1 || 
                (!completedChapters.has(currentChapterIndex) && currentChapterIndex < chapters.length - 1)
              )}
            >
              Next Section
            </button>
            <button
              onClick={handleToggleFullscreen}
              style={{...buttonStyle(false), marginRight: '10px'}}
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>

        <div>
          <h2>About Othain Onboarding</h2>
          <p>
          Welcome to your Othain onboarding! This course is structured to give you a clear understanding of our company, from our team and processes to essential HR policies and employee benefits. Each section is designed to help you get started confidently and quickly. We recommend progressing through all sections to ensure you're fully acquainted with our platform and procedures.
          </p>
        </div>
      </div>

      {/* Right Side: Chapter List */}
      <div style={{ flex: 1, borderLeft: '1px solid #ccc', paddingLeft: '20px' }}>
        <h2 style={{ marginBottom: '15px' }}>Sections</h2>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {chapters.map((chapter, index) => (
            <li 
              key={chapter.id} 
              style={chapterItemStyle(index === currentChapterIndex, completedChapters.has(index))}
              onClick={() => handleChapterClick(index)}
            >
              <div style={{ fontWeight: index === currentChapterIndex ? 'bold' : 'normal' }}>
                {completedChapters.has(index) ? '✓ ' : ''}{chapter.title}
              </div>
              <div style={{ fontSize: '0.9em', color: '#555' }}>{chapter.duration}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Helper for button styling
const buttonStyle = (disabled) => ({
  padding: '8px 12px',
  fontSize: '0.9em',
  cursor: disabled ? 'not-allowed' : 'pointer',
  backgroundColor: disabled ? '#555' : '#4361ee',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  opacity: disabled ? 0.6 : 1,
  margin: '0 3px',
});

// Helper for chapter item styling
const chapterItemStyle = (isActive, isCompleted) => ({
  padding: '12px 8px',
  borderBottom: '1px solid #eee',
  cursor: 'pointer',
  backgroundColor: isActive ? '#e0e0e0' : (isCompleted ? '#e6ffe6' : 'transparent'),
  transition: 'background-color 0.2s ease',
  opacity: isCompleted && !isActive ? 0.7 : 1,
  hover: {
      backgroundColor: isActive ? '#d5d5d5' : (isCompleted ? '#d9f2d9' : '#f0f0f0'),
  }
});

export default OnboardingPage;
