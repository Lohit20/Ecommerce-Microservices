import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faTwitter, faInstagram, faCcVisa, faCcMastercard, faCcPaypal } from '@fortawesome/free-brands-svg-icons';
import { faPhone, faEnvelope, faMapMarkerAlt, faTruck, faRotateLeft, faLock, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import './Footer.css';

const SHOP_LINKS = [
  { label: 'TV & Audio',       path: '/category/tv, audio & cameras' },
  { label: 'Home & Kitchen',   path: '/category/home & kitchen' },
  { label: 'Sports & Fitness', path: '/category/sports & fitness' },
  { label: 'Appliances',       path: '/category/appliances' },
  { label: 'Beauty & Health',  path: '/category/beauty & health' },
  { label: "Men's Clothing",   path: "/category/men's clothing" },
  { label: "Women's Clothing", path: "/category/women's clothing" },
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
      {/* Brand */}
      <div className="footer-brand">
        <div className="brand-name">Ve<span>lour</span></div>
        <p>Your one-stop marketplace for electronics, home essentials, fashion, beauty, sports gear and much more.</p>
        <div className="footer-contact">
          <p><FontAwesomeIcon icon={faPhone} /> +44 20 7946 0321</p>
          <p><FontAwesomeIcon icon={faEnvelope} /> support@velour.co.uk</p>
          <p><FontAwesomeIcon icon={faMapMarkerAlt} /> London, United Kingdom</p>
        </div>
        <div className="footer-socials">
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

      {/* Shop links */}
      <div className="footer-col">
        <h4>Shop</h4>
        <ul>
          {SHOP_LINKS.map(l => <li key={l.path}><Link to={l.path}>{l.label}</Link></li>)}
        </ul>
      </div>

      {/* Account links */}
      <div className="footer-col">
        <h4>Account</h4>
        <ul>
          {ACCOUNT_LINKS.map(l => <li key={l.label}><Link to={l.path}>{l.label}</Link></li>)}
        </ul>
      </div>

      {/* Payments & perks */}
      <div className="footer-col">
        <h4>We Accept</h4>
        <div className="footer-payment-icons">
          <FontAwesomeIcon icon={faCcVisa} size="2x" />
          <FontAwesomeIcon icon={faCcMastercard} size="2x" />
          <FontAwesomeIcon icon={faCcPaypal} size="2x" />
        </div>
        <div className="footer-perks">
          <p><FontAwesomeIcon icon={faTruck} /> Free delivery on orders over £50</p>
          <p><FontAwesomeIcon icon={faRotateLeft} /> Easy 30-day returns</p>
          <p><FontAwesomeIcon icon={faLock} /> 100% secure payments</p>
          <p><FontAwesomeIcon icon={faCircleCheck} /> Genuine products guaranteed</p>
        </div>
      </div>
    </div>

    <div className="footer-bottom">
      <div className="footer-bottom-inner">
        <p>&copy; {new Date().getFullYear()} Velour. All rights reserved.</p>
        <div className="footer-bottom-links">
          <Link to="/shop">Products</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
