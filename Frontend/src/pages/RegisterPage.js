import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    phone_number: ''
  });
  
  const [errors, setErrors] = useState({});
  const [registrationError, setRegistrationError] = useState('');
  const auth = useAuth();
  const register = auth?.register;
  const navigate = useNavigate();
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: '',
      }));
    }
    
    // Also clear registration error when user makes any changes
    if (registrationError) {
      setRegistrationError('');
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username) {
      newErrors.username = 'Username is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.address) {
      newErrors.address = 'Address is required';
    }
    
    if (!formData.phone_number) {
      newErrors.phone_number = 'Phone number is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear any previous registration errors
    setRegistrationError('');
    
    if (validateForm()) {
      try {
        // Submit form to backend via AuthContext
        const result = await register(formData);
        
        if (result.success) {
          // Redirect to account page after successful registration
          navigate('/account');
        } else {
          // Display the error message
          setRegistrationError(result.message || 'Registration failed. Please try again.');
        }
      } catch (error) {
        setRegistrationError('An unexpected error occurred. Please try again.');
        console.error('Registration error:', error);
      }
    }
  };
  
  return (
    <div className="auth-page">
      <div className="container">
        <div className="auth-container">
          <div className="auth-form-container">
            <h1 className="auth-title">Create an Account</h1>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={errors.username ? 'error' : ''}
                />
                {errors.username && <div className="error-message">{errors.username}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <div className="error-message">{errors.email}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? 'error' : ''}
                />
                {errors.password && <div className="error-message">{errors.password}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? 'error' : ''}
                />
                {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={errors.address ? 'error' : ''}
                  placeholder="123 Main St, London"
                />
                {errors.address && <div className="error-message">{errors.address}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="phone_number">Phone Number</label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className={errors.phone_number ? 'error' : ''}
                  placeholder="+44 7911 123456"
                />
                {errors.phone_number && <div className="error-message">{errors.phone_number}</div>}
              </div>
              

              
              {registrationError && (
                <div className="error-message registration-error">{registrationError}</div>
              )}
              
              <button type="submit" className="auth-btn">
                Create Account
              </button>
            </form>
            
            <div className="auth-footer">
              <p>
                Already have an account? <Link to="/login">Log In</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;