import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// Import utilities and ensure they're initialized
import './utils/localSessionHandler';
import './utils/cors-fix';

// Import API service to ensure it's available
import { chatApi } from './services/api';

// Make API available on window for debugging
window.chatApi = chatApi;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
