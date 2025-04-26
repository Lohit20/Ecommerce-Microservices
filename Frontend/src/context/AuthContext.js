import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component
export const AuthProvider = ({ children }) => {
  // State to track if user is authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // State to store user data
  const [user, setUser] = useState(null);
  // Loading state for initial auth check
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on initial load
  useEffect(() => {
    // In a real app, you would verify the token with your backend
    const checkAuthStatus = () => {
      const token = localStorage.getItem('authToken');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        setIsAuthenticated(true);
        setUser(JSON.parse(savedUser));
      }
      
      setLoading(false);
    };
    
    checkAuthStatus();
  }, []);

  // Login function
  const login = (userData) => {
    // In a real app, you would send credentials to your backend
    // and receive a token and user data in response
    
    // For demo purposes, we'll simulate a successful login if email contains '@'
    // This allows us to simulate login failures for testing
    if (!userData.email.includes('@')) {
      return { success: false, message: 'Invalid email or password' };
    }
    
    const mockUser = {
      id: '123',
      firstName: 'John',
      lastName: 'Doe',
      email: userData.email,
      phone: '+1 (555) 123-4567',
      address: '123 Main Street, Apt 4B',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'United States'
    };
    
    // Store auth data in localStorage
    localStorage.setItem('authToken', 'mock-jwt-token');
    localStorage.setItem('user', JSON.stringify(mockUser));
    
    // Update state
    setUser(mockUser);
    setIsAuthenticated(true);
    
    return { success: true };
  };

  // Logout function
  const logout = () => {
    // Clear auth data from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Update state
    setUser(null);
    setIsAuthenticated(false);
  };

  // Register function
  const register = (userData) => {
    // In a real app, you would send registration data to your backend
    // For demo purposes, we'll simulate a successful registration
    console.log('Registered user:', userData);
    
    // Simulate validation - check if email is valid
    if (!userData.email.includes('@')) {
      return { success: false, message: 'Invalid email format. Please try again.' };
    }
    
    // Automatically log in after registration
    return login(userData);
  };

  // Context value
  const value = {
    user,
    isAuthenticated,
    loading,
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