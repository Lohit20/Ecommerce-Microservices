import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart, faUser, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const CATEGORIES = [
  { label: "TV & Audio",    path: "/category/tv, audio & cameras" },
  { label: "Home & Kitchen",path: "/category/home & kitchen" },
  { label: "Sports",        path: "/category/sports & fitness" },
  { label: "Appliances",    path: "/category/appliances" },
  { label: "Beauty",        path: "/category/beauty & health" },
  { label: "Fashion",       path: "/category/men's clothing" },
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cart } = useCart();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const close = () => setMobileMenuOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <>
      <div className="announcement-bar">
        <span>Free UK delivery on orders over £50</span>
        <span className="ann-dot">·</span>
        <span>Easy 30-day returns</span>
        <span className="ann-dot">·</span>
        <span>Genuine products guaranteed</span>
      </div>

      <header className="site-header">
        <div className="header-inner">
          <div className="logo">
            <Link to="/">
              <span className="logo-text">Ve<span className="logo-dot">lour</span></span>
            </Link>
          </div>

          <nav className={`main-nav ${mobileMenuOpen ? 'active' : ''}`}>
            <button className="close-menu" onClick={close} aria-label="Close menu">
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <ul className="nav-links">
              <li><Link to="/" className={isActive('/')} onClick={close}>Home</Link></li>
              <li><Link to="/shop" className={isActive('/shop')} onClick={close}>Shop All</Link></li>
              {CATEGORIES.map((c) => (
                <li key={c.label}>
                  <Link to={c.path} onClick={close}>{c.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header-actions">
            <Link to="/cart" className="icon-btn" aria-label="Cart">
              <FontAwesomeIcon icon={faShoppingCart} />
              {cart.totalItems > 0 && (
                <span className="cart-badge-count">{cart.totalItems}</span>
              )}
            </Link>

            {isAuthenticated ? (
              <>
                <Link to="/account" className="icon-btn" aria-label="Account">
                  <FontAwesomeIcon icon={faUser} />
                </Link>
                <button className="logout-btn" onClick={handleLogout}>Sign out</button>
              </>
            ) : (
              <Link to="/login" className="sign-in-btn">Sign in</Link>
            )}

            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <FontAwesomeIcon icon={mobileMenuOpen ? faTimes : faBars} />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
