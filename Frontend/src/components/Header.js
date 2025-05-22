import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faShoppingCart, faUser, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useCart } from '../context/CartContext';
import './Header.css';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cart } = useCart();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="site-header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <Link to="/">
              <h1>TrendVibe</h1>
            </Link>
          </div>
          
          <nav className={`main-nav ${mobileMenuOpen ? 'active' : ''}`}>
            <button className="close-menu" onClick={toggleMobileMenu}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <ul className="nav-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/category/men's clothing">Men</Link></li>
              <li><Link to="/category/women's clothing">Women</Link></li>
              <li><Link to="/category/girls' clothing">Girls</Link></li>
              <li><Link to="/category/boys' clothing">Boys</Link></li>
              <li><Link to="/category/sale">Sale</Link></li>
            </ul>
          </nav>
          
          <div className="header-actions">
            <div className="search-box">
              <input type="text" placeholder="Search..." />
              <button className="search-btn">
                <FontAwesomeIcon icon={faSearch} />
              </button>
            </div>
            
            <div className="header-icons">
              <Link to="/cart" className="cart-icon">
                <FontAwesomeIcon icon={faShoppingCart} />
                {cart.totalItems > 0 && (
                  <span className="cart-count">{cart.totalItems}</span>
                )}
              </Link>
              <Link to="/account" className="user-icon">
                <FontAwesomeIcon icon={faUser} />
              </Link>
            </div>
            
            <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
              <FontAwesomeIcon icon={faBars} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;