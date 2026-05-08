import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart, faUser, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const CATEGORIES = [
  { label: "TV & Audio", path: "/category/tv, audio & cameras" },
  { label: "Home & Kitchen", path: "/category/home & kitchen" },
  { label: "Sports", path: "/category/sports & fitness" },
  { label: "Appliances", path: "/category/appliances" },
  { label: "Beauty", path: "/category/beauty & health" },
  { label: "Fashion", path: "/category/men's clothing" },
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cart } = useCart();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <Link to="/"><h1>TrendVibe</h1></Link>
          </div>

          <nav className={`main-nav ${mobileMenuOpen ? 'active' : ''}`}>
            <button className="close-menu" onClick={() => setMobileMenuOpen(false)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <ul className="nav-links">
              <li><Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link></li>
              <li><Link to="/shop" onClick={() => setMobileMenuOpen(false)}>Shop All</Link></li>
              {CATEGORIES.map((c) => (
                <li key={c.label}>
                  <Link to={c.path} onClick={() => setMobileMenuOpen(false)}>{c.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header-actions">
            <div className="header-icons">
              <Link to="/cart" className="cart-icon">
                <FontAwesomeIcon icon={faShoppingCart} />
                {cart.totalItems > 0 && (
                  <span className="cart-count">{cart.totalItems}</span>
                )}
              </Link>

              {isAuthenticated ? (
                <div className="user-menu">
                  <Link to="/account" className="user-icon">
                    <FontAwesomeIcon icon={faUser} />
                  </Link>
                  <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
              ) : (
                <Link to="/login" className="user-icon">
                  <FontAwesomeIcon icon={faUser} />
                </Link>
              )}
            </div>

            <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <FontAwesomeIcon icon={mobileMenuOpen ? faTimes : faBars} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
