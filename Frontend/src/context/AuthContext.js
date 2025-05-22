import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

// Create the context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Import debug utilities with safe fallbacks
let logComponentMount, logError, logContextState;
try {
  const debugUtils = require('../utils/debugUtils');
  logComponentMount = debugUtils.logComponentMount;
  logError = debugUtils.logError;
  logContextState = debugUtils.logContextState;
} catch (e) {
  // Provide fallback implementations if debug utils can't be loaded
  logComponentMount = (componentName) => console.log(`Component mounted: ${componentName}`);
  logError = (error, source) => console.error(`Error in ${source}:`, error);
  logContextState = (contextName, state) => console.log(`${contextName} state:`, state);
  console.warn('Debug utilities could not be loaded, using fallbacks');
}

// Provider component
export const AuthProvider = ({ children }) => {
  // State to track if user is authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // State to store user data
  const [user, setUser] = useState(null);
  // Loading state for initial auth check
  const [loading, setLoading] = useState(true);
  // Error state
  const [error, setError] = useState(null);

  // Log component mount
  useEffect(() => {
    try {
      logComponentMount('AuthProvider');
      console.log('AuthProvider mounted - checking authentication status');
    } catch (e) {
      console.log('AuthProvider mounted - checking authentication status');
    }
  }, []);

  // Check if user is logged in on initial load
  useEffect(() => {
    console.log("check")
    const checkAuthStatus = () => {
      try {
        console.log('Checking authentication status...');
        const token = localStorage.getItem('authToken');
        const savedUser = localStorage.getItem('user');
        
        if (token && savedUser) {
          console.log('Found auth token and user data in localStorage');
          setIsAuthenticated(true);
          setUser(JSON.parse(savedUser));
          try {
            logContextState('AuthContext', { isAuthenticated: true, user: JSON.parse(savedUser) });
          } catch (e) {
            console.log('AuthContext state updated: isAuthenticated=true');
          }
        } else {
          console.log('No auth token or user data found in localStorage');
          try {
            logContextState('AuthContext', { isAuthenticated: false, user: null });
          } catch (e) {
            console.log('AuthContext state updated: isAuthenticated=false');
          }
        }
      } catch (error) {
        try {
          logError(error, 'AuthProvider.checkAuthStatus', { localStorage: { authToken: !!localStorage.getItem('authToken'), user: !!localStorage.getItem('user') } });
        } catch (e) {
          console.error('Error checking auth status:', error);
        }
        console.error('Error checking auth status:', error);
        // Reset auth state on error
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  console.log("first", isAuthenticated)

  // Login function
  const login = async (userData) => {
    try {
      setError(null);
      const response = await authService.login(userData);
      
      const { token, user } = response.data;
      
      // Store auth data in localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update state
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      return { 
        success: false, 
        message: err.response?.data?.message || 'Invalid credentials. Please try again.' 
      };
    }
  };

  // Logout function
  const logout = () => {
    // Clear auth data from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Update state
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  };

  // Register function
  const register = async (userData) => {
    try {
      setError(null);
      const response = await authService.register(userData);
      
      const { token, user } = response.data;
      
      // Store auth data in localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update state
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      return { 
        success: false, 
        message: err.response?.data?.message || 'Registration failed. Please try again.' 
      };
    }
  };

  // Context value
  const value = {
    isAuthenticated,
    user,
    loading,
    error,
    login,
    logout,
    register
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};