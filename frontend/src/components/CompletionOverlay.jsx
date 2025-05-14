import React from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size';

const CompletionOverlay = ({ message, onGoHome }) => {
  const [width, height] = useWindowSize();

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.8)', // Slightly darker backdrop maybe?
      display: 'flex', 
      alignItems: 'center', justifyContent: 'center', zIndex: 2000, // Higher z-index
      fontFamily: 'Arial, sans-serif',
      animation: 'scaleIn 0.3s ease-in-out forwards' // Reuse scaleIn animation
    }}>
      <Confetti
        width={width}
        height={height}
        recycle={false}
        numberOfPieces={300} // More confetti?
        gravity={0.18}
        style={{ zIndex: 2001 }} // Ensure confetti is above backdrop
      />
      <div style={{
        backgroundColor: 'white', padding: '30px 40px', borderRadius: '10px', 
        textAlign: 'center',
        boxShadow: '0 5px 20px rgba(0,0,0,0.25)',
        position: 'relative',
        zIndex: 2002 // Ensure content box is above confetti if needed
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#28a745' }}>
          🎉 Amazing Work! 🎉
        </h2>
        <p style={{ fontSize: '1.1em', marginBottom: '30px', color: '#333' }}>
          {message || 'You have successfully completed the onboarding video.'}
        </p>
        <button 
          onClick={onGoHome} 
          style={{
            padding: '12px 30px', 
            backgroundColor: 'rgba(17, 179, 207, 0.8)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '30px', 
            cursor: 'pointer',
            fontSize: '1.1em',
            fontWeight: 'bold'
          }}
        >
          Go to Home Page
        </button>
      </div>
    </div>
  );
};

export default CompletionOverlay; 