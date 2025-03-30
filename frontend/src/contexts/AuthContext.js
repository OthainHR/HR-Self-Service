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
        console.log("Initial session check complete.", currentSession);
    }).catch(err => {
        console.error("Error during initial session check:", err);
        setIsLoading(false);
        setError("Failed to check initial session.");
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: authListener } = auth.onAuthStateChange((event, currentSession) => {
        console.log(`Auth state changed: ${event}`, currentSession);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false); // Ensure loading is false after updates
        setError(null); // Clear errors on auth change
        
        // Example: Handle specific events if needed
        // if (event === 'SIGNED_IN') { ... }
        // if (event === 'SIGNED_OUT') { ... }
    });

    // Cleanup listener on component unmount
    return () => {
      if (authListener?.subscription) {
          authListener.subscription.unsubscribe();
          console.log("Auth listener unsubscribed.");
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
      console.log("Login successful (AuthProvider)");
    } catch (err) {
      console.error('Login failed (AuthProvider):', err);
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

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use the new Supabase logout from api.js
      await auth.logout();
      // No need to manually set state here, listener will handle it
      console.log("Logout successful (AuthProvider)");
    } catch (err) {
      console.error('Logout failed (AuthProvider):', err);
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