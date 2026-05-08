import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFacebook,
  faTwitter,
  faInstagram,
  faCcVisa,
  faCcMastercard,
  faCcPaypal,
} from '@fortawesome/free-brands-svg-icons';
import { faPhone, faEnvelope, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import './Footer.css';

const SHOP_LINKS = [
  { label: 'TV & Audio',       path: '/category/tv, audio & cameras' },
  { label: 'Home & Kitchen',   path: '/category/home & kitchen' },
  { label: 'Sports & Fitness', path: '/category/sports & fitness' },
  { label: 'Appliances',       path: '/category/appliances' },
  { label: 'Beauty & Health',  path: '/category/beauty & health' },
  { label: "Men's Clothing",   path: "/category/men's clothing" },
  { label: "Women's Clothing", path: "/category/women's clothing" },
  { label: "Kids' Fashion",    path: "/category/kids' fashion" },
  { label: 'All Products',     path: '/shop' },
];

const ACCOUNT_LINKS = [
  { label: 'Sign In',       path: '/login' },
  { label: 'Create Account',path: '/register' },
  { label: 'My Account',    path: '/account' },
  { label: 'My Orders',     path: '/account' },
  { label: 'Cart',          path: '/cart' },
];

const Footer = () => (
  <footer className="site-footer">
    <div className="footer-main">
      <div className="container">
        <div className="footer-content">

          <div className="footer-section about">
            <h3 className="footer-title">TrendVibe</h3>
            <p className="footer-description">
              Your one-stop marketplace for electronics, home essentials, fashion,
              beauty, sports gear and much more — all at the best prices.
            </p>
            <div className="contact">
              <p><FontAwesomeIcon icon={faPhone} /> +91 98765 43210</p>
              <p><FontAwesomeIcon icon={faEnvelope} /> support@trendvibe.in</p>
              <p><FontAwesomeIcon icon={faMapMarkerAlt} /> Bangalore, Karnataka, India</p>
            </div>
            <div className="socials">
              <a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noreferrer">
                <FontAwesomeIcon icon={faFacebook} />
              </a>
              <a href="https://twitter.com" aria-label="Twitter" target="_blank" rel="noreferrer">
                <FontAwesomeIcon icon={faTwitter} />
              </a>
              <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noreferrer">
                <FontAwesomeIcon icon={faInstagram} />
              </a>
            </div>
          </div>

          <div className="footer-section links">
            <h3 className="footer-title">Shop</h3>
            <ul>
              {SHOP_LINKS.map(l => (
                <li key={l.path}><Link to={l.path}>{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div className="footer-section links">
            <h3 className="footer-title">Account</h3>
            <ul>
              {ACCOUNT_LINKS.map(l => (
                <li key={l.label}><Link to={l.path}>{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div className="footer-section links">
            <h3 className="footer-title">We Accept</h3>
            <div className="payment-methods">
              <FontAwesomeIcon icon={faCcVisa} size="2x" />
              <FontAwesomeIcon icon={faCcMastercard} size="2x" />
              <FontAwesomeIcon icon={faCcPaypal} size="2x" />
            </div>
            <div className="delivery-note">
              <p>🚚 Free delivery on orders above ₹999</p>
              <p>↩️ Easy 30-day returns</p>
              <p>🔒 Secure payments</p>
            </div>
          </div>

        </div>
      </div>
    </div>

    <div className="footer-bottom">
      <div className="container">
        <p className="copyright">&copy; {new Date().getFullYear()} TrendVibe. All rights reserved.</p>
        <div className="footer-bottom-links">
          <Link to="/shop">All Products</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
