import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import './ProductCard.css';
import { useCart } from '../context/CartContext';
import { toGBP } from '../utils/priceUtils';

const StarRating = ({ rating }) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`star ${i <= full ? 'filled' : i === full + 1 && half ? 'half' : ''}`}
        >
          ★
        </span>
      ))}
      <span className="rating-value">{rating.toFixed(1)}</span>
    </div>
  );
};

const ProductCard = ({ product }) => {
  const [imageError, setImageError] = useState(false);
  const [addedEffect, setAddedEffect] = useState(false);
  const { addToCart, cart } = useCart();

  const productId = product.product_id;
  const discountPct = product.actual_price > product.discount_price
    ? Math.round(((product.actual_price - product.discount_price) / product.actual_price) * 100)
    : 0;

  const quantityInCart = cart?.items?.find((i) => i.product_id === productId)?.quantity || 0;

  const handleAddToCart = useCallback(
    (e) => {
      e.preventDefault();
      addToCart(product, 1);
      setAddedEffect(true);
      setTimeout(() => setAddedEffect(false), 1500);
    },
    [addToCart, product]
  );

  return (
    <div className="product-card">
      {discountPct > 0 && <span className="discount-badge">{discountPct}% OFF</span>}
      {quantityInCart > 0 && <span className="cart-badge">{quantityInCart}</span>}

      <Link to={`/product/${productId}`} className="product-link">
        <div className="product-image-container">
          {!imageError ? (
            <img
              src={product.image}
              alt={product.name}
              className="product-image"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="image-placeholder">
              <span>No Image</span>
            </div>
          )}
          <div className="cart-hover-overlay">
            <button
              className={`add-to-cart-btn ${addedEffect ? 'added' : ''}`}
              onClick={handleAddToCart}
            >
              {addedEffect ? 'Added!' : quantityInCart > 0 ? `In Cart (${quantityInCart})` : 'Add to Cart'}
            </button>
          </div>
        </div>

        <div className="product-info">
          <p className="product-category">{product.sub_category}</p>
          <h3 className="product-name">{product.name}</h3>
          <StarRating rating={product.ratings || 0} />
          <p className="rating-count">{product.no_of_ratings?.toLocaleString()} ratings</p>
          <div className="product-price">
            <span className="current-price">£{toGBP(product.discount_price).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            {discountPct > 0 && (
              <span className="original-price">£{toGBP(product.actual_price).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

ProductCard.propTypes = { product: PropTypes.object.isRequired };

export default ProductCard;
