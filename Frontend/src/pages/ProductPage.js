import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faStar, 
  faStarHalfAlt, 
  faMinus, 
  faPlus, 
  faCheck, 
  faTruck, 
  faShieldAlt, 
  faUndo
} from '@fortawesome/free-solid-svg-icons';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import { formatPrice } from '../utils/priceUtils';
import './ProductPage.css';

const ProductPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [buttonClicked, setButtonClicked] = useState(false);
  const [buttonText, setButtonText] = useState('Add to Cart');
  const [quantityInCart, setQuantityInCart] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const productPageRef = useRef(null);
  const imageRef = useRef(null);
  
  // Get cart functions from context
  const { addToCart, cart } = useCart();

  // Handle scroll for sticky add to cart
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      if (scrollPosition > 300) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Calculate quantity in cart for this product
  const getProductQuantityInCart = useCallback(() => {
    if (!cart || !cart.items || !id) return 0;
    
    return cart.items
      .filter(item => 
        item.id === id && 
        (selectedSize ? item.size === selectedSize : true) && 
        (selectedColor ? item.color === selectedColor : true)
      )
      .reduce((total, item) => total + item.quantity, 0);
  }, [cart, id, selectedSize, selectedColor]);

  // Update quantity in cart and button text when cart changes
  useEffect(() => {
    if (loading) return;
    
    const qty = getProductQuantityInCart();
    setQuantityInCart(qty);
    
    if (qty > 0) {
      setButtonText(`Add to Cart (${qty} in cart)`);
    } else {
      setButtonText('Add to Cart');
    }
  }, [cart, getProductQuantityInCart, loading]);

  // State for error handling
  const [error, setError] = useState(null);

  // Fetch product data from backend
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        // Import ProductService dynamically to avoid circular dependencies
        const ProductService = (await import('../services/ProductService')).default;
        const productData = await ProductService.getProduct(id);
        
        if (!productData) {
          throw new Error('Product not found');
        }
        
        // Transform backend product model to match frontend expectations
        const transformedProduct = {
          id: productData.product_id,
          name: productData.name,
          price: productData.price,
          description: productData.description,
          rating: productData.ratings || 0,
          reviews: productData.review_count || productData.reviews || 0,
          sizes: productData.sizes || ['S', 'M', 'L', 'XL'],
          colors: productData.colors || ['Black', 'White', 'Blue', 'Red'],
          images: productData.images && productData.images.length > 0 
            ? productData.images 
            : [
                'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1516257984-b1b4d707412e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1554568218-0f1715e72254?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
              ],
          category: productData.main_category,
          stock: productData.stock || 10,
          brand: productData.brand || 'Fashion Brand',
          features: productData.features || [
            '100% premium cotton fabric',
            'Regular comfortable fit',
            'Machine washable',
            'Reinforced stitching at stress points',
            'Sustainable manufacturing process',
          ],
          inStock: productData.stock > 0 || true
        };
        
        setProduct(transformedProduct);
        setSelectedSize(transformedProduct.sizes[0]);
        setSelectedColor(transformedProduct.colors[0]);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching product:', error);
        setError(error.message || 'Failed to load product details');
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [id]);
  
  // Fetch product recommendations
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState(null);
  
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!id) return;
      
      setLoadingRecommendations(true);
      setRecommendationsError(null);
      
      try {
        // Import ProductService dynamically to avoid circular dependencies
        const ProductService = (await import('../services/ProductService')).default;
        const recommendedProductsData = await ProductService.getRecommendations(id);
        
        if (!recommendedProductsData || !Array.isArray(recommendedProductsData) || recommendedProductsData.length === 0) {
          throw new Error('No recommendations available');
        }
        
        // Transform recommended products to match frontend expectations
        const transformedRecommendations = recommendedProductsData.map(item => ({
          id: item.id || item.id,
          name: item.name,
          price: item.price,
          originalPrice: item.original_price || (item.discount > 0 ? item.price / (1 - item.discount / 100) : item.price * 1.2),
          rating: item.ratings || item.rating || 4.5,
          reviews: item.review_count || item.reviews || Math.floor(Math.random() * 100) + 20,
          category: item.category,
          image: item.images && item.images.length > 0 ? item.images[0] : 
                 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
          sale: item.discount > 0 || (item.original_price && item.price < item.original_price)
        }));
        
        setRelatedProducts(transformedRecommendations);
        setLoadingRecommendations(false);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setRecommendationsError(error.message || 'Failed to load recommendations');
        
        // Fallback to default related products if API fails
        setRelatedProducts([
          {
            id: parseInt(id) + 1,
            name: "Slim Fit Denim Jeans",
            price: 59.99,
            originalPrice: 79.99,
            rating: 4.3,
            reviews: 56,
            category: "men",
            image: "https://images.unsplash.com/photo-1542272604-787c3835535d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
            sale: true
          },
          {
            id: parseInt(id) + 2,
            name: "Casual Cotton T-Shirt",
            price: 29.99,
            originalPrice: 29.99,
            rating: 4.5,
            reviews: 87,
            category: "men",
            image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
          },
          {
            id: parseInt(id) + 3,
            name: "Lightweight Spring Jacket",
            price: 89.99,
            originalPrice: 119.99,
            rating: 4.7,
            reviews: 42,
            category: "men",
            image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
            sale: true
          },
          {
            id: parseInt(id) + 4,
            name: "Classic Oxford Shoes",
            price: 119.99,
            originalPrice: 119.99,
            rating: 4.8,
            reviews: 36,
            category: "men",
            image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
          }
        ]);
        setLoadingRecommendations(false);
      }
    };
    
    fetchRecommendations();
  }, [id]);

  const handleQuantityChange = (e) => {
    setQuantity(parseInt(e.target.value));
  };

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
  };

  const handleThumbnailClick = (index) => {
    setSelectedImage(index);
    // Reset zoom when changing images
    setIsZoomed(false);
  };

  const handleImageMouseMove = (e) => {
    if (!imageRef.current) return;
    
    const { left, top, width, height } = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    
    setZoomPosition({ x, y });
  };

  const handleImageMouseEnter = () => {
    setIsZoomed(true);
  };

  const handleImageMouseLeave = () => {
    setIsZoomed(false);
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      alert('Please select a size');
      return;
    }
    
    if (!selectedColor) {
      alert('Please select a color');
      return;
    }
    
    try {
      // Add product to cart using cart context
      addToCart(product, quantity, selectedSize, selectedColor);
      
      // Update local cart count for immediate feedback
      const newQuantity = quantityInCart + quantity;
      
      // Animation and feedback
      setButtonClicked(true);
      setButtonText(`Added! (${newQuantity} in cart)`);
      
      setTimeout(() => {
        setButtonClicked(false);
        setButtonText(`Add to Cart (${newQuantity} in cart)`);
      }, 1200);
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add item to cart. Please try again.');
    }
  };

  // Related products are now fetched from the backend via the recommendations API

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading product details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
        <Link to="/" className="back-to-home">Back to Home</Link>
      </div>
    );
  }

  if (!product || !id) {
    return (
      <div className="container">
        <div className="error">Product not found</div>
        <Link to="/" className="back-to-home">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className={`product-page ${isScrolled ? 'scrolled' : ''}`} ref={productPageRef}>
      <div className="container">
        <div className="product-breadcrumb">
          <Link to="/">Home</Link> / <Link to="/category/clothing">Clothing</Link> / <span>{product.name}</span>
        </div>
        
        <div className="product-details">
          <div className="product-gallery">
            <div 
              className={`main-image-container ${isZoomed ? 'zoomed' : ''}`}
              onMouseMove={handleImageMouseMove}
              onMouseEnter={handleImageMouseEnter}
              onMouseLeave={handleImageMouseLeave}
            >
              <div className="main-image" ref={imageRef}>
                <img 
                  src={product.images[selectedImage]} 
                  alt={product.name} 
                />
              </div>
              {isZoomed && (
                <div 
                  className="zoom-image"
                  style={{
                    backgroundImage: `url(${product.images[selectedImage]})`,
                    backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`
                  }}
                ></div>
              )}
              <div className="zoom-instruction">
                <span>Hover to zoom</span>
              </div>
              
              {quantityInCart > 0 && (
                <div className="cart-quantity-badge product-page-badge">
                  {quantityInCart} in cart
                </div>
              )}
            </div>
            
            <div className="thumbnail-images">
              {product.images.map((image, index) => (
                <div 
                  key={`thumbnail-${index}`}
                  className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                  onClick={() => handleThumbnailClick(index)}
                >
                  <img src={image} alt={`${product.name} view ${index + 1}`} />
                </div>
              ))}
            </div>
          </div>
          
          <div className="product-info">
            <h1 className="product-name">{product.name}</h1>
            
            <div className="product-rating">
              <div className="stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FontAwesomeIcon 
                    key={star} 
                    icon={
                      product.rating >= star
                        ? faStar
                        : product.rating + 0.5 >= star
                        ? faStarHalfAlt
                        : ['far', 'star']
                    }
                    className={product.rating >= star ? '' : 'empty'}
                  />
                ))}
              </div>
              <span className="review-count">{product.reviews} reviews</span>
            </div>
            
            <div className="product-price">{formatPrice(product.price)}</div>
            
            <p className="product-description">{product.description}</p>

            <div className="product-benefits">
              <div className="benefit-item">
                <FontAwesomeIcon icon={faCheck} />
                <span>In stock and ready to ship</span>
              </div>
              <div className="benefit-item">
                <FontAwesomeIcon icon={faTruck} />
                <span>Free shipping on orders over £50</span>
              </div>
              <div className="benefit-item">
                <FontAwesomeIcon icon={faShieldAlt} />
                <span>2-year warranty</span>
              </div>
              <div className="benefit-item">
                <FontAwesomeIcon icon={faUndo} />
                <span>30-day returns</span>
              </div>
            </div>
            
            <div className="product-options">
              <div className="size-selection">
                <div className="option-header">
                  <h3>Select Size</h3>
                  <Link to="/size-guide" className="size-guide">Size Guide</Link>
                </div>
                <div className="size-options">
                  {product.sizes.map(size => (
                    <button
                      key={size}
                      className={`size-option ${selectedSize === size ? 'selected' : ''}`}
                      onClick={() => handleSizeSelect(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="color-selection">
                <h3>Select Color</h3>
                <div className="color-options">
                  {product.colors.map(color => (
                    <button
                      key={color}
                      className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color.toLowerCase() }}
                      onClick={() => handleColorSelect(color)}
                    >
                      <span className="sr-only">{color}</span>
                      {selectedColor === color && <div className="color-checkmark"></div>}
                    </button>
                  ))}
                </div>
                <div className="selected-color">
                  {selectedColor}
                </div>
              </div>
              
              <div className="quantity-selection">
                <h3>Quantity</h3>
                <div className="quantity-selector">
                  <button 
                    className="quantity-btn"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    aria-label="Decrease quantity"
                  >
                    <FontAwesomeIcon icon={faMinus} />
                  </button>
                  <input 
                    type="number" 
                    min="1" 
                    max="99"
                    className="quantity-input"
                    value={quantity}
                    onChange={handleQuantityChange}
                  />
                  <button 
                    className="quantity-btn"
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                </div>
              </div>
            </div>
            
            <button
              className={`add-to-cart-btn ${buttonClicked ? 'clicked' : ''}`}
              onClick={handleAddToCart}
              disabled={!product.inStock}
            >
              <span className="button-text">{product.inStock ? buttonText : 'Out of Stock'}</span>
            </button>
          </div>
        </div>
        
        <div className="product-details-tabs">
          <div className="tab-content">
            <div className="product-features">
              <h3>Product Features</h3>
              <ul>
                {product.features && product.features.map((feature, index) => (
                  <li key={index}><FontAwesomeIcon icon={faCheck} className="feature-icon" /> {feature}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="sticky-add-to-cart" style={{ 
          transform: isScrolled ? 'translateY(0)' : 'translateY(100%)',
          zIndex: 999 
        }}>
          <div className="sticky-product-info">
            <img src={product.images[0]} alt={product.name} />
            <div className="sticky-product-details">
              <h3>{product.name}</h3>
              <div className="sticky-product-price">{formatPrice(product.price)}</div>
            </div>
          </div>
          <button
            className={`sticky-cart-btn ${buttonClicked ? 'clicked' : ''}`}
            onClick={handleAddToCart}
            disabled={!product.inStock}
          >
            <span className="button-text">{product.inStock ? 'Add to Cart' : 'Out of Stock'}</span>
          </button>
        </div>
        
        <div className="related-products-section">
          <h2>You May Also Like</h2>
          <div className="related-products">
            {loadingRecommendations ? (
              <div className="loading-recommendations">Loading recommendations...</div>
            ) : recommendationsError ? (
              <div className="recommendations-error">{recommendationsError}</div>
            ) : relatedProducts && relatedProducts.length > 0 ? (
              relatedProducts.map(product => (
                <ProductCard key={id} product={product} />
              ))
            ) : (
              <div className="no-recommendations">No recommendations available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;