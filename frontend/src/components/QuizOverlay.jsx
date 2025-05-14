import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size';

const QuizOverlay = ({ quizData, onSubmit, onClose, feedback, onProceed, isFullscreen }) => {
  // State to store user's answers { questionId: selectedOption }
  const [userAnswers, setUserAnswers] = useState({});
  const [runConfetti, setRunConfetti] = useState(false);
  const [width, height] = useWindowSize();

  // Effect to reset userAnswers when quizData or feedback (indicating a new attempt after failure) changes
  // This is an alternative/enhancement to relying solely on the key from parent if specific conditions are met
  useEffect(() => {
    setUserAnswers({}); // Reset answers when quizData changes (new quiz) or feedback implies retry
  }, [quizData, feedback]); // Listen to feedback as well

  useEffect(() => {
    // Only run confetti if success is strictly true (not 'maxedOut')
    if (feedback && feedback.success === true) { 
      setRunConfetti(true);
    } else {
      setRunConfetti(false);
    }
  }, [feedback]);

  // Determine if the user can proceed (either passed or maxed out attempts)
  const canProceed = feedback && (feedback.success === true || feedback.success === 'maxedOut');
  const showQuizContent = !canProceed && quizData && quizData.questions;
  const showFailureFeedback = feedback && feedback.success === false; // Only for active failures, not maxedOut for this specific display block

  // If there's no quiz data and we're not in a proceed state, don't render anything (or a minimal message)
  if (!quizData && !canProceed) {
      return null; // Or a loading/error placeholder if appropriate
  }

  const handleOptionChange = (questionId, option) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmit = () => {
    // Pass the collected answers to the parent component's onSubmit handler
    onSubmit(userAnswers);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', 
      alignItems: 'center', justifyContent: 'center', zIndex: 1000, 
      fontFamily: 'Arial, sans-serif',
      animation: 'scaleIn 0.3s ease-in-out forwards'
    }}>
      {/* Only show confetti on true success */}
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

      <div style={{
        backgroundColor: 'white', padding: '20px 30px', borderRadius: '8px', 
        width: '90%', maxWidth: '600px', maxHeight: '90vh', 
        overflowY: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', 
        position: 'relative',
        zIndex: 1
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '15px', textAlign: 'center', color: '#333333' }}>
          {/* Title Logic */}
          {canProceed ? 'Quiz Results' : (quizData?.title || 'Quiz')}
        </h2>
        
        {/* Feedback Message Display (for all types of feedback: success, maxedOut, failure) */}
        {feedback && feedback.message && (
            <div style={{
              textAlign: 'center', 
              padding: '15px', 
              marginBottom: '20px',
              border: 'none',
              backgroundColor: 'transparent',
              color: `${feedback.success === true ? '#155724' : (feedback.success === 'maxedOut' ? '#856404' : '#721c24')}`,
              borderRadius: '20px'
            }}>
                {/* Optional: Add an icon based on feedback type */}
                {feedback.success === true && 
                    <img src={process.env.PUBLIC_URL + '/checkmark-svgrepo-com.svg'} alt="Success" style={{ height: '40px', width: '40px', marginBottom: '0px'}} />
                }
                 <p style={{ margin: 0, fontSize: '1.1em' }}>{feedback.message}</p>
            </div>
        )}
        
        {/* Quiz Questions - Render only if quiz content should be shown */}
        {showQuizContent && (
          <>
            {quizData.questions.map((question) => {
              const isIncorrect = feedback && feedback.incorrectIds && feedback.incorrectIds.includes(question.id);
              return (
                <div 
                  key={question.id} 
                  style={{
                    marginBottom: '25px',
                    padding: isIncorrect ? '10px' : '0',
                    border: isIncorrect ? '2px solid red' : 'none',
                    borderRadius: isIncorrect ? '20px' : '0'
                  }}
                >
                  <p style={{ fontWeight: 'bold', marginBottom: '10px', color: '#444444' }}>
                    {question.text}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {question.options.map((option, index) => (
                      <label 
                        key={index} 
                        style={{
                          display: 'block', 
                          padding: '10px',
                          margin: '5px 0',
                          borderRadius: '20px',
                          border: userAnswers[question.id] === option ? '2px solid #4361ee' : '1px solid #ddd',
                          backgroundColor: userAnswers[question.id] === option ? '#eef2ff' : (isIncorrect && userAnswers[question.id] === option ? '#ffcdd2' : '#f9f9f9'),
                          cursor: 'pointer',
                          transition: 'background-color 0.2s, border-color 0.2s',
                          color: '#333333'
                        }}
                      >
                        <input 
                          type="radio" 
                          name={question.id} 
                          value={option} 
                          checked={userAnswers[question.id] === option}
                          onChange={() => handleOptionChange(question.id, option)}
                          style={{ marginRight: '10px' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
        
        {/* Action Buttons Section */}
        <div style={{ marginTop: '30px', textAlign: 'center' }}>
            {/* Show Submit button if quiz content is visible and we are not yet in a proceed state */} 
            {showQuizContent && (
                <button 
                  onClick={handleSubmit} 
                  style={{
                    padding: '10px 25px', 
                    backgroundColor: 'rgba(17, 179, 207, 0.8)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '20px', 
                    cursor: 'pointer',
                    fontSize: '1em',
                  }}
                >
                  Submit Answers
                </button>
            )}

            {/* Show Continue button if canProceed is true */} 
            {canProceed && (
              <button 
                onClick={onProceed}
                style={{
                  padding: '10px 25px', 
                  backgroundColor: feedback.success === true ? '#28a745' : '#ffc107', 
                  color: feedback.success === true ? 'white' : '#333',
                  border: 'none', 
                  borderRadius: '20px', 
                  cursor: 'pointer',
                  fontSize: '1em',
                  
                }}
              >
                Continue
              </button>
            )}
        </div>

      </div>
      <style>
        {`
          @keyframes scaleIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes scaleInCheckmark {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default QuizOverlay; 