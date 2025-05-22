import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import './ProductCard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle, faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/priceUtils';

const ProductCard = ({ product }) => {
  const [showNotification, setShowNotification] = useState(false);
  const [itemCount, setItemCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showQuantityControls, setShowQuantityControls] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const imageRef = useRef(null);
  
  // Get cart functions from context
  const { addToCart, cart } = useCart();

  // Calculate quantity in cart for this product
  const getProductQuantityInCart = useCallback(() => {
    if (!cart || !cart.items) return 0;
    
    // Sum up all items matching this product id (across different sizes/colors)
    return cart.items
      .filter(item => item.id === product.id)
      .reduce((total, item) => total + item.quantity, 0);
  }, [cart, product.id]);

  // Get the current quantity in cart
  const [quantityInCart, setQuantityInCart] = useState(0);

  // Update quantity in cart when cart changes
  useEffect(() => {
    const qty = getProductQuantityInCart();
    setQuantityInCart(qty);
  }, [cart, getProductQuantityInCart]);

  const handleAddToCart = useCallback(() => {
    // Add the product to the cart
    addToCart(product, quantity);
    
    // Update local state for animation
    setShowNotification(true);
    setItemCount(quantityInCart + quantity);
    setQuantity(1); // Reset quantity after adding
    
    setTimeout(() => {
      setShowNotification(false);
    }, 2000);
  }, [addToCart, product, quantityInCart, quantity]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setShowQuantityControls(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowQuantityControls(false);
  }, []);

  const handleIncreaseQuantity = (e) => {
    e.stopPropagation();
    if (quantity < 10) {
      setQuantity(prev => prev + 1);
    }
  };

  const handleDecreaseQuantity = (e) => {
    e.stopPropagation();
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Calculate discount percentage
  const getDiscountPercentage = () => {
    if (product.originalPrice && product.price < product.originalPrice) {
      return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    }
    return 0;
  };

  // Check if the product is on sale or has a discount
  const isOnSale = product.sale || (product.originalPrice && product.price < product.originalPrice) || product.discount > 0;
  
  // Get the original price (if available) or calculate it from discount percentage
  const getOriginalPrice = () => {
    if (product.originalPrice) {
      return product.originalPrice;
    }
    if (product.discount > 0) {
      return product.price / (1 - product.discount / 100);
    }
    return null;
  };

  const originalPrice = getOriginalPrice();
  const discountPercentage = product.discount || getDiscountPercentage();

  // Get a truncated description or product detail if available
  const getProductBrief = () => {
    if (product.description) {
      return product.description.length > 80 
        ? `${product.description.substring(0, 80)}...` 
        : product.description;
    }
    return product.category;
  };

  return (
    <div 
      className={`product-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showNotification && !quantityInCart && (
        <div className="notification">
          Added to cart: {itemCount}
        </div>
      )}
      
      {showNotification && quantityInCart > 0 && (
        <div className="notification notification-with-badge">
          Added to cart: {itemCount}
        </div>
      )}
      
      {quantityInCart > 0 && (
        <div className="cart-quantity-badge">
          {quantityInCart}
        </div>
      )}
      
      <Link to={`/product/${product.product_id}`} className="product-link">
        <div 
          className={`product-image-container ${isLoading ? 'loading' : ''} ${hasError ? 'has-error' : ''}`}
        >
          {isLoading && (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          )}
          
          {hasError && (
            <div className="error-message">
              <FontAwesomeIcon icon={faExclamationCircle} />
              <p>Image failed to load</p>
            </div>
          )}
          
          <img 
            ref={imageRef}
            src={product.images?.[0] || '/fallback.jpg'} 
            alt={product.name}
            className="product-image"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          
          {isOnSale && (
            <div className="sale-badge">
              {discountPercentage}% OFF
            </div>
          )}
        </div>

        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <div className="product-price">
            {isOnSale && originalPrice && (
              <span className="original-price">{formatPrice(originalPrice)}</span>
            )}
            <span className="current-price"> {formatPrice(product.price)}</span>
          </div>
          <p className="product-brief">{getProductBrief()}</p>
        </div>
      </Link>
      
      <div className="product-actions">
        {showQuantityControls && (
          <div className="quantity-controls">
            <button 
              className="quantity-btn"
              onClick={handleDecreaseQuantity}
              disabled={quantity <= 1}
            >
              <FontAwesomeIcon icon={faMinus} />
            </button>
            <span className="quantity">{quantity}</span>
            <button 
              className="quantity-btn"
              onClick={handleIncreaseQuantity}
              disabled={quantity >= 10}
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
        )}
        
        <button 
          className="add-to-cart-btn"
          onClick={handleAddToCart}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};

ProductCard.propTypes = {
  product: PropTypes.object.isRequired,
};

export default ProductCard;