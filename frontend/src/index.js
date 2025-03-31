import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Import utilities and ensure they're initialized
// REMOVE these imports as they are causing interference
// import './utils/localSessionHandler'; 
// import './utils/cors-fix';

// Import API service to ensure it's available (Optional - can be removed if not needed globally)
// import { chatApi } from './services/api'; 

// Handle manifest.json loading errors
window.addEventListener('error', function(e) {
  // Check if error is related to manifest.json
  if (e.filename && e.filename.includes('manifest.json')) {
    console.warn('Manifest.json loading error handled:', e.message);
    e.preventDefault(); // Prevent the error from appearing in console
  }
});

// REMOVE: Make API available on window for debugging
// window.chatApi = chatApi;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
