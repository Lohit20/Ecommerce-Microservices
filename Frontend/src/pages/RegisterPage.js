import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    address: '', phone_number: '',
  });
  const [errors, setErrors] = useState({});
  const [registrationError, setRegistrationError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (registrationError) setRegistrationError('');
  };

  const validate = () => {
    const errs = {};
    if (!formData.username) errs.username = 'Username is required';
    if (!formData.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Enter a valid email';
    if (!formData.password) errs.password = 'Password is required';
    else if (formData.password.length < 8) errs.password = 'Must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!formData.address) errs.address = 'Address is required';
    if (!formData.phone_number) errs.phone_number = 'Phone number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRegistrationError('');
    if (!validate()) return;
    try {
      const result = await register(formData);
      if (result.success) navigate('/account');
      else setRegistrationError(result.message || 'Registration failed. Please try again.');
    } catch {
      setRegistrationError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: 520 }}>
        <div className="auth-form-container">
          <h1 className="auth-title">Create Account</h1>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text" id="username" name="username"
                  value={formData.username} onChange={handleChange}
                  className={errors.username ? 'error' : ''}
                  placeholder="johndoe" autoComplete="username"
                />
                {errors.username && <div className="error-message">{errors.username}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="phone_number">Phone Number</label>
                <input
                  type="tel" id="phone_number" name="phone_number"
                  value={formData.phone_number} onChange={handleChange}
                  className={errors.phone_number ? 'error' : ''}
                  placeholder="+91 98765 43210" autoComplete="tel"
                />
                {errors.phone_number && <div className="error-message">{errors.phone_number}</div>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                type="email" id="email" name="email"
                value={formData.email} onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder="you@example.com" autoComplete="email"
              />
              {errors.email && <div className="error-message">{errors.email}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password" id="password" name="password"
                  value={formData.password} onChange={handleChange}
                  className={errors.password ? 'error' : ''}
                  placeholder="Min. 8 characters" autoComplete="new-password"
                />
                {errors.password && <div className="error-message">{errors.password}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password" id="confirmPassword" name="confirmPassword"
                  value={formData.confirmPassword} onChange={handleChange}
                  className={errors.confirmPassword ? 'error' : ''}
                  placeholder="Repeat password" autoComplete="new-password"
                />
                {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="address">Delivery Address</label>
              <input
                type="text" id="address" name="address"
                value={formData.address} onChange={handleChange}
                className={errors.address ? 'error' : ''}
                placeholder="123 Main Street, Bangalore" autoComplete="street-address"
              />
              {errors.address && <div className="error-message">{errors.address}</div>}
            </div>

            {registrationError && (
              <div className="error-message registration-error">{registrationError}</div>
            )}

            <button type="submit" className="auth-btn">Create Account</button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Log in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
