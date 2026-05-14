import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar, faStarHalfAlt, faMinus, faPlus,
  faCheck, faTruck, faShieldAlt, faUndo
} from '@fortawesome/free-solid-svg-icons';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import { productsService, recommendationService } from '../services/api';
import { toGBP } from '../utils/priceUtils';
import './ProductPage.css';

const ProductPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [buttonClicked, setButtonClicked] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const imageRef = useRef(null);

  const { addToCart, cart } = useCart();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch product by integer product_id
  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await productsService.getProduct(id);
        setProduct(res.data);
      } catch (err) {
        setError('Product not found');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  // Fetch category-based recommendations
  useEffect(() => {
    if (!product) return;
    const fetch = async () => {
      try {
        const res = await recommendationService.getRecommendations();
        const byCategory = res.data[product.main_category] || [];
        setRelatedProducts(byCategory.filter((p) => p.product_id !== product.product_id).slice(0, 4));
      } catch (err) {
        console.error('Recommendations failed:', err);
      }
    };
    fetch();
  }, [product]);

  const quantityInCart = cart?.items?.find((i) => i.product_id === product?.product_id)?.quantity || 0;

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    addToCart(product, quantity);
    setButtonClicked(true);
    setTimeout(() => setButtonClicked(false), 1500);
  }, [addToCart, product, quantity]);

  const handleImageMouseMove = (e) => {
    if (!imageRef.current) return;
    const { left, top, width, height } = imageRef.current.getBoundingClientRect();
    setZoomPosition({
      x: ((e.clientX - left) / width) * 100,
      y: ((e.clientY - top) / height) * 100,
    });
  };

  const renderStars = (rating) =>
    [1, 2, 3, 4, 5].map((star) => (
      <FontAwesomeIcon
        key={star}
        icon={rating >= star ? faStar : rating + 0.5 >= star ? faStarHalfAlt : ['far', 'star']}
        className={rating >= star ? 'star-filled' : 'star-empty'}
      />
    ));

  if (loading) {
    return (
      <div className="container product-page-state">
        <div className="loading-skeleton">
          <div className="skeleton-image" />
          <div className="skeleton-info">
            <div className="skeleton-line long" />
            <div className="skeleton-line medium" />
            <div className="skeleton-line short" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container product-page-state">
        <p className="error-msg">{error || 'Product not found'}</p>
        <Link to="/" className="back-link">← Back to Home</Link>
      </div>
    );
  }

  const discountPct = product.actual_price > product.discount_price
    ? Math.round(((product.actual_price - product.discount_price) / product.actual_price) * 100)
    : 0;

  return (
    <div className={`product-page ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container">
        {/* Breadcrumb */}
        <nav className="product-breadcrumb">
          <Link to="/">Home</Link>
          {' / '}
          <Link to={`/category/${product.main_category}`}>{product.main_category}</Link>
          {' / '}
          <span>{product.name}</span>
        </nav>

        <div className="product-details">
          {/* Gallery */}
          <div className="product-gallery">
            <div
              className={`main-image-container ${isZoomed ? 'zoomed' : ''}`}
              onMouseMove={handleImageMouseMove}
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              ref={imageRef}
            >
              <img src={product.image} alt={product.name} className="main-image" />
              {isZoomed && (
                <div
                  className="zoom-image"
                  style={{
                    backgroundImage: `url(${product.image})`,
                    backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                  }}
                />
              )}
              <div className="zoom-instruction"><span>Hover to zoom</span></div>
              {quantityInCart > 0 && (
                <div className="cart-quantity-badge product-page-badge">{quantityInCart} in cart</div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="product-info">
            <p className="product-sub-category">{product.sub_category}</p>
            <h1 className="product-name">{product.name}</h1>

            <div className="product-rating">
              <div className="stars">{renderStars(product.ratings)}</div>
              <span className="review-count">{product.no_of_ratings?.toLocaleString()} ratings</span>
            </div>

            <div className="product-price-block">
              <span className="price-current">£{toGBP(product.discount_price).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {discountPct > 0 && (
                <>
                  <span className="price-original">£{toGBP(product.actual_price).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="price-discount">{discountPct}% off</span>
                </>
              )}
            </div>

            <div className="product-benefits">
              <div className="benefit-item"><FontAwesomeIcon icon={faCheck} /><span>{product.stock > 0 ? `In stock (${product.stock} left)` : 'Out of stock'}</span></div>
              <div className="benefit-item"><FontAwesomeIcon icon={faTruck} /><span>Free shipping on orders over £50</span></div>
              <div className="benefit-item"><FontAwesomeIcon icon={faShieldAlt} /><span>Authentic product</span></div>
              <div className="benefit-item"><FontAwesomeIcon icon={faUndo} /><span>Easy 30-day returns</span></div>
            </div>

            <div className="quantity-selection">
              <h3>Quantity</h3>
              <div className="quantity-selector">
                <button className="quantity-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <FontAwesomeIcon icon={faMinus} />
                </button>
                <span className="quantity-display">{quantity}</span>
                <button className="quantity-btn" onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}>
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              </div>
            </div>

            <button
              className={`add-to-cart-btn ${buttonClicked ? 'clicked' : ''}`}
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              {product.stock === 0 ? 'Out of Stock' : buttonClicked ? '✓ Added to Cart!' : quantityInCart > 0 ? `Add More (${quantityInCart} in cart)` : 'Add to Cart'}
            </button>

            <div className="product-meta">
              <p><strong>Category:</strong> {product.main_category}</p>
              <p><strong>Sub-category:</strong> {product.sub_category}</p>
            </div>
          </div>
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <div className="related-products-section">
            <h2>More from {product.main_category}</h2>
            <div className="related-products">
              {relatedProducts.map((p) => (
                <ProductCard key={p.product_id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky bar */}
      <div className="sticky-add-to-cart" style={{ transform: isScrolled ? 'translateY(0)' : 'translateY(100%)' }}>
        <div className="sticky-product-info">
          <img src={product.image} alt={product.name} />
          <div>
            <h3>{product.name}</h3>
            <span>£{toGBP(product.discount_price).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        <button
          className={`sticky-cart-btn ${buttonClicked ? 'clicked' : ''}`}
          onClick={handleAddToCart}
          disabled={product.stock === 0}
        >
          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default ProductPage;
