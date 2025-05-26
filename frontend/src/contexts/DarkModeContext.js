import React, { createContext, useContext, useState, useEffect } from 'react';

// Create a context for dark mode
const DarkModeContext = createContext();

// Custom hook to use the dark mode context
export const useDarkMode = () => useContext(DarkModeContext);

// Provider component for dark mode
export const DarkModeProvider = ({ children }) => {
  // Initialize with dark mode from localStorage or true (for dark mode default)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    // Return true by default (dark mode) or the saved preference
    return savedMode === null ? true : savedMode === 'true';
  });

  // Update localStorage when the mode changes
  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode);
    // Optional: Add a class to the body for global styling
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Toggle function
  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  // Provider value
  const value = {
    isDarkMode,
    toggleDarkMode
  };

  return (
    <DarkModeContext.Provider value={value}>
      {children}
    </DarkModeContext.Provider>
  );
}; 