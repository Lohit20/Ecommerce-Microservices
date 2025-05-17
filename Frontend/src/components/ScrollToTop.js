import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';
import './ScrollToTop.css';

const ScrollToTop = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  useEffect(() => {
    const checkScrollPosition = () => {
      if (!showScrollTop && window.pageYOffset > 400) {
        setShowScrollTop(true);
      } else if (showScrollTop && window.pageYOffset <= 400) {
        setShowScrollTop(false);
      }
    };
    
    window.addEventListener('scroll', checkScrollPosition);
    return () => window.removeEventListener('scroll', checkScrollPosition);
  }, [showScrollTop]);
  
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Check if we're on the product page by looking for the sticky-add-to-cart element
  const isProductPage = () => {
    return document.querySelector('.sticky-add-to-cart') !== null;
  };
  
  return (
    <>
      {showScrollTop && (
        <button 
          className={`scroll-to-top ${isProductPage() ? 'product-page-active' : ''}`}
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <FontAwesomeIcon icon={faArrowUp} />
        </button>
      )}
    </>
  );
};

export default ScrollToTop; 