import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size';

const QuizOverlay = ({ quizData, onSubmit, onClose, feedback, onSuccessContinue }) => {
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
    if (feedback && feedback.success) {
      setRunConfetti(true);
    } else {
      setRunConfetti(false);
    }
  }, [feedback]);

  if (!quizData || !quizData.questions) {
    // If quizData itself is gone, but we have a success feedback, show success message still
    if (feedback && feedback.success) {
      // Allow success message to render even if quizData is transiently null
    } else {
      return null;
    }
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
      {runConfetti && feedback && feedback.success && (
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
          {/* Show quiz title or default to 'Quiz Results' if in success state without quizData (edge case) */}
          {(feedback && feedback.success) ? 'Quiz Results' : (quizData?.title || 'Quiz')}
        </h2>
        
        {/* Success Message Display */}
        {feedback && feedback.success && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <img 
              src={process.env.PUBLIC_URL + '/checkmark-svgrepo-com.svg'} 
              alt="Success" 
              style={{ 
                height: '60px', width: '60px', marginBottom: '15px', marginTop: '-15px',
                opacity: 0,
                animation: 'scaleInCheckmark 0.4s ease-out forwards'
              }} 
            />
            <p style={{ color: 'green', fontSize: '1.2em', marginBottom: '20px', marginTop: '0' }}>
              {feedback.message}
            </p>
            <button 
              onClick={onSuccessContinue} 
              style={{
                padding: '10px 25px', 
                backgroundColor: '#28a745', // Green color for success continue
                color: 'white', 
                border: 'none', 
                borderRadius: '5px', 
                cursor: 'pointer',
                fontSize: '1em'
              }}
            >
              Continue
            </button>
          </div>
        )}
        
        {/* Quiz Questions - Render only if NOT in success state */}
        {!(feedback && feedback.success) && quizData && quizData.questions && (
          <>
            {/* Display Feedback Message for errors */}
            {feedback && !feedback.success && feedback.message && (
              <p style={{
                color: 'red',
                textAlign: 'center',
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: '#ffebee',
                border: `1px solid #e57373`,
                borderRadius: '4px'
              }}>
                {feedback.message}
              </p>
            )}
            
            {quizData.questions.map((question) => {
              const isIncorrect = feedback && feedback.incorrectIds && feedback.incorrectIds.includes(question.id);
              return (
                <div 
                  key={question.id} 
                  style={{
                    marginBottom: '25px',
                    padding: isIncorrect ? '10px' : '0', // Add padding if incorrect
                    border: isIncorrect ? '2px solid red' : 'none', // Red border for incorrect questions
                    borderRadius: isIncorrect ? '5px' : '0'   // Rounded border for incorrect questions
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
                          borderRadius: '5px',
                          border: userAnswers[question.id] === option ? '2px solid #4361ee' : '1px solid #ddd',
                          backgroundColor: userAnswers[question.id] === option ? '#eef2ff' : (isIncorrect && userAnswers[question.id] === option ? '#ffcdd2' : '#f9f9f9'), // Highlight selected incorrect option
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
            
            <div style={{ marginTop: '30px', textAlign: 'right' }}>
              {onClose && (
                <button 
                  onClick={onClose} 
                  style={{
                    padding: '10px 20px', 
                    marginRight: '10px', 
                    backgroundColor: '#6c757d', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '5px', 
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              )}
              <button 
                onClick={handleSubmit} 
                style={{
                  padding: '10px 20px', 
                  backgroundColor: '#4361ee', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '5px', 
                  cursor: 'pointer'
                }}
              >
                {feedback && feedback.incorrectIds && feedback.incorrectIds.length > 0 ? 'Try Again' : 'Submit Answers'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QuizOverlay; 