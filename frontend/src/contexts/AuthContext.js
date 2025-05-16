import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { auth } from '../services/api'; // Import the new Supabase-based auth service

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null); // Store the Supabase session
  const [user, setUser] = useState(null); // Store the Supabase user object
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial check
  const [error, setError] = useState(null);

  // Check initial session and set up listener
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    // Check current session on initial load
    auth.getSession().then(currentSession => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
        
    }).catch(err => {
        
        setIsLoading(false);
        setError("Failed to check initial session.");
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: authListener } = auth.onAuthStateChange((event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false); // Ensure loading is false after updates
        setError(null); // Clear errors on auth change
        
        if (event === 'SIGNED_IN' && currentSession?.user) {
          localStorage.setItem('pendingDisclaimer', 'true');
          localStorage.removeItem('disclaimerAcknowledgedThisLogin');
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('pendingDisclaimer');
          localStorage.removeItem('disclaimerAcknowledgedThisLogin');
        }
    });

    // Cleanup listener on component unmount
    return () => {
      if (authListener?.subscription) {
          authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Login function
  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      // Use the new Supabase login from api.js
      // It handles setting the session internally via onAuthStateChange
      await auth.login(credentials);
      // No need to manually set state here, listener will handle it
    } catch (err) {
      setError(err.message || "Login failed. Please check credentials.");
      setUser(null); // Ensure user is null on failed login
      setSession(null);
      throw err; // Re-throw for the component to handle
    } finally {
        // Set loading false only *after* the listener has potentially updated state
        // A small delay might be needed if listener update isn't immediate
        setTimeout(() => setIsLoading(false), 100); 
    }
  }, []);

  // Signup function with domain validation
  const signup = useCallback(async (credentials) => {
    setIsLoading(true);
    setError(null);

    const { email, password } = credentials;

    // Validate email domain
    const allowedDomains = ['@othainsoft.com', '@jerseytechpartners.com', '@markenzoworldwide.com'];
    const emailDomain = email.substring(email.lastIndexOf('@'));

    if (!allowedDomains.includes(emailDomain.toLowerCase())) {
      const errorMsg = "Sign up failed: Only @othainsoft.com, @jerseytechpartners.com, and @markenzoworldwide.com emails are allowed.";
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg); // Throw error to stop execution
    }

    try {
      // Use the Supabase signup from api.js
      await auth.signup(credentials);

      // --- Log the user out immediately after successful signup --- 
      await auth.logout(); 
      // --- End immediate logout ---

      // Supabase might automatically sign the user in, or require confirmation.
      // The onAuthStateChange listener should handle the session update.
      // You might want to show a message asking the user to check their email for confirmation.
    } catch (err) {
      setError(err.message || "Sign up failed. Please try again.");
      // Don't set user/session to null here, as the user might be partially signed up (e.g., awaiting confirmation)
      throw err; // Re-throw for the component to handle
    } finally {
      // Set loading false after a short delay to allow listener to potentially update
      setTimeout(() => setIsLoading(false), 100);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use the new Supabase logout from api.js
      await auth.logout();
      // Clear disclaimer flags immediately on logout action
      localStorage.removeItem('pendingDisclaimer');
      localStorage.removeItem('disclaimerAcknowledgedThisLogin');
      // No need to manually set state here, listener will handle it
    } catch (err) {
      setError(err.message || "Logout failed.");
      // Keep user/session state as is, let listener handle the update
      throw err; // Re-throw for the component to handle
    } finally {
       // Set loading false only *after* the listener has potentially updated state
       setTimeout(() => setIsLoading(false), 100);
    }
  }, []);

  // Value provided to consuming components
  const value = {
    session,
    user,
    isAuthenticated: !!user, // Determine auth status based on user object
    isLoading,
    error,
    login,
    logout,
    signup,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Render children only after initial loading is complete? Optional */} 
      {/* {!isLoading ? children : <div>Loading Authentication...</div>} */}
      {children} 
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  return useContext(AuthContext);
}; 