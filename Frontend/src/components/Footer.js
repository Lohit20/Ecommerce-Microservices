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
  faApplePay
} from '@fortawesome/free-brands-svg-icons';
import { 
  faPhone, 
  faEnvelope, 
  faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section about">
              <h3 className="footer-title">TrendVibe</h3>
              <p className="footer-description">Your destination for premium footwear that combines style, comfort, and quality.</p>
              <div className="contact">
                <p><FontAwesomeIcon icon={faPhone} /> (123) 456-7890</p>
                <p><FontAwesomeIcon icon={faEnvelope} /> support@trendvibe.com</p>
                <p><FontAwesomeIcon icon={faMapMarkerAlt} /> 123 Fashion St, Citytown, CT</p>
              </div>
              <div className="socials">
                <a href="https://facebook.com/trendvibe" aria-label="Facebook"><FontAwesomeIcon icon={faFacebook} /></a>
                <a href="https://twitter.com/trendvibe" aria-label="Twitter"><FontAwesomeIcon icon={faTwitter} /></a>
                <a href="https://instagram.com/trendvibe" aria-label="Instagram"><FontAwesomeIcon icon={faInstagram} /></a>
              </div>
            </div>

            <div className="footer-section links">
              <h3 className="footer-title">Shop</h3>
              <ul>
                <li><Link to="/category/men">Men</Link></li>
                <li><Link to="/category/women">Women</Link></li>
                <li><Link to="/category/girls">Girls</Link></li>
                <li><Link to="/category/boys">Boys</Link></li>
                <li><Link to="/category/sale">Sale</Link></li>
                <li><Link to="/category/new-arrivals">New Arrivals</Link></li>
              </ul>
            </div>

            <div className="footer-section links">
              <h3 className="footer-title">Account</h3>
              <ul>
                <li><Link to="/login">Sign In</Link></li>
                <li><Link to="/register">Create Account</Link></li>
                <li><Link to="/account">My Account</Link></li>
                <li><Link to="/wishlist">Wishlist</Link></li>
                <li><Link to="/orders">Track Order</Link></li>
              </ul>
            </div>

            <div className="footer-section links">
              <h3 className="footer-title">Contact & Help</h3>
              <ul>
                <li><Link to="/contact">Contact Us</Link></li>
                <li><Link to="/faq">FAQs</Link></li>
                <li><Link to="/shipping">Shipping & Returns</Link></li>
                <li><Link to="/size-guide">Size Guide</Link></li>
              </ul>
              <div className="payment-methods">
                <FontAwesomeIcon icon={faCcVisa} size="2x" />
                <FontAwesomeIcon icon={faCcMastercard} size="2x" />
                <FontAwesomeIcon icon={faCcPaypal} size="2x" />
                <FontAwesomeIcon icon={faApplePay} size="2x" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p className="copyright">&copy; {new Date().getFullYear()} TrendVibe. All rights reserved.</p>
          <div className="footer-bottom-links">
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-service">Terms of Service</Link>
            <Link to="/sitemap">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;