import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faTimes, faChevronDown, faChevronUp, faCheck } from '@fortawesome/free-solid-svg-icons';
import unsplashImages from '../utils/unsplashImages';
import './CategoryPage.css';

const CategoryPage = () => {
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    size: [],
    color: [],
    price: 'all',
    sortBy: 'newest'
  });
  const [expandedSections, setExpandedSections] = useState({
    size: true,
    color: true,
    price: true
  });

  // Mock data - in a real app, you would fetch this from your MongoDB backend
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      // Map backend category names to frontend display names
      const categoryMapping = {
        "men's clothing": "men",
        "women's clothing": "women",
        "boys' clothing": "boys",
        "girls' clothing": "girls"
      };
      
      // Get the appropriate image array for the category
      const displayCategory = categoryMapping[category] || category;
      const imageArray = unsplashImages[displayCategory] || unsplashImages.seasonal;
      
      // Generate product names based on category
      const getProductName = (index, category) => {
        // Map backend category names to frontend display names for product naming
        const categoryMapping = {
          "men's clothing": "men",
          "women's clothing": "women",
          "boys' clothing": "boys",
          "girls' clothing": "girls"
        };
        
        const displayCategory = categoryMapping[category] || category;
        const categoryPrefix = displayCategory.charAt(0).toUpperCase() + displayCategory.slice(1);
        
        // Different clothing items based on category
        const menItems = [
          'Oxford Shirt', 'Slim Fit Chinos', 'Denim Jacket', 
          'Wool Sweater', 'Tailored Blazer', 'Cotton T-Shirt',
          'Linen Pants', 'Casual Polo', 'Button-Down Shirt',
          'Formal Trousers', 'Classic Suit', 'Knit Cardigan'
        ];
        
        const womenItems = [
          'Floral Dress', 'High-Waisted Jeans', 'Cashmere Cardigan', 
          'Silk Blouse', 'A-Line Skirt', 'Tailored Blazer',
          'Maxi Dress', 'Fitted Pants', 'Off-Shoulder Top',
          'Wrap Dress', 'Midi Skirt', 'Slim Fit Trousers'
        ];
        
        const boysItems = [
          'Graphic T-Shirt', 'Cargo Pants', 'Hooded Sweatshirt',
          'Denim Jeans', 'School Uniform Shirt', 'Cotton Shorts',
          'Sport Jersey', 'Bomber Jacket', 'Polo Shirt',
          'Corduroy Pants', 'Button-Up Shirt', 'Casual Sweater'
        ];
        
        const girlsItems = [
          'Floral Dress', 'Denim Overalls', 'Ruffled Blouse',
          'Pleated Skirt', 'Knit Cardigan', 'Cotton Leggings',
          'Embroidered Top', 'Tulle Skirt', 'Denim Shorts',
          'Summer Dress', 'School Uniform', 'Casual Jumpsuit'
        ];
        
        let itemList;
        
        // Use the mapped display category for the switch statement
        const switchCategory = categoryMapping[category] || category;
        
        switch(switchCategory) {
          case 'men':
            itemList = menItems;
            break;
          case 'women':
            itemList = womenItems;
            break;
          case 'boys':
            itemList = boysItems;
            break;
          case 'girls':
            itemList = girlsItems;
            break;
          default:
            // Combined list for other categories
            itemList = [...menItems, ...womenItems, ...boysItems, ...girlsItems];
        }
        
        return `${categoryPrefix} ${itemList[index % itemList.length]}`;
      };
      
      const mockProducts = Array(12).fill().map((_, index) => ({
        id: 100 + index,
        name: getProductName(index, category),
        category: category,
        price: Math.floor(Math.random() * 100) + 30,
        image: imageArray[index % imageArray.length],
        sale: index % 3 === 0,
        colors: ['Black', 'White', 'Red', 'Blue', 'Green', 'Beige'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        discount: index % 3 === 0 ? Math.floor(Math.random() * 30) + 10 : 0
      }));
      
      setProducts(mockProducts);
      setLoading(false);
    }, 500);
  }, [category]);

  const toggleFilterSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

  const toggleFilter = (type, value) => {
    if (type === 'price' || type === 'sortBy') {
      setSelectedFilters({
        ...selectedFilters,
        [type]: value
      });
    } else {
      if (selectedFilters[type].includes(value)) {
        setSelectedFilters({
          ...selectedFilters,
          [type]: selectedFilters[type].filter(item => item !== value)
        });
      } else {
        setSelectedFilters({
          ...selectedFilters,
          [type]: [...selectedFilters[type], value]
        });
      }
    }
  };

  const resetFilters = () => {
    setSelectedFilters({
      size: [],
      color: [],
      price: 'all',
      sortBy: 'newest'
    });
  };

  const applyFilters = () => {
    // In a real app, you would send these filters to your backend
    // For this mock, we'll just close the filter panel on mobile
    setShowFilters(false);
  };

  // Filter and sort products
  const filteredProducts = products.filter(product => {
    // Apply size filter if any selected
    if (selectedFilters.size.length > 0) {
      const hasMatchingSize = product.sizes.some(size => 
        selectedFilters.size.includes(size)
      );
      if (!hasMatchingSize) return false;
    }
    
    // Apply color filter if any selected
    if (selectedFilters.color.length > 0) {
      const hasMatchingColor = product.colors.some(color => 
        selectedFilters.color.includes(color)
      );
      if (!hasMatchingColor) return false;
    }
    
    // Apply price filter
    if (selectedFilters.price !== 'all') {
      const [min, max] = selectedFilters.price.split('-').map(Number);
      if (max) {
        if (product.price < min || product.price > max) return false;
      } else {
        if (product.price < min) return false;
      }
    }
    
    return true;
  }).sort((a, b) => {
    switch (selectedFilters.sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'newest':
      default:
        return b.id - a.id;
    }
  }).slice(0, 12); // Limit to 12 products (3 rows of 4)

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="category-page">
      <div className="container">
        <div className="category-header">
          <div className="breadcrumb">
            <Link to="/">Home</Link> / <span>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
          </div>
          <h1 className="category-title">{category.charAt(0).toUpperCase() + category.slice(1)}</h1>
          <p className="category-description">
            Discover our selection of {category} shoes, designed for comfort, style, and performance.
          </p>
        </div>
        
        <div className="mobile-filter-controls">
          <button 
            className="filter-toggle-btn"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FontAwesomeIcon icon={faFilter} /> Filters
          </button>
          
          <select 
            className="mobile-sort-select"
            value={selectedFilters.sortBy}
            onChange={(e) => toggleFilter('sortBy', e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name-asc">Name: A to Z</option>
            <option value="name-desc">Name: Z to A</option>
          </select>
        </div>
        
        <div className="category-content">
          <aside className={`category-filters ${showFilters ? 'show' : ''}`}>
            <div className="filter-header">
              <h2>Filters</h2>
              <button className="close-filters" onClick={() => setShowFilters(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <div className="filter-section">
              <div 
                className="filter-title" 
                onClick={() => toggleFilterSection('size')}
              >
                <h3>Size</h3>
                <FontAwesomeIcon 
                  icon={expandedSections.size ? faChevronUp : faChevronDown} 
                />
              </div>
              
              {expandedSections.size && (
                <div className="filter-options size-options">
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                    <label key={`size-option-${size}`} className="filter-option">
                      <input
                        type="checkbox"
                        checked={selectedFilters.size.includes(size)}
                        onChange={() => toggleFilter('size', size)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="option-label">{size}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div className="filter-section">
              <div 
                className="filter-title" 
                onClick={() => toggleFilterSection('color')}
              >
                <h3>Color</h3>
                <FontAwesomeIcon 
                  icon={expandedSections.color ? faChevronUp : faChevronDown} 
                />
              </div>
              
              {expandedSections.color && (
                <div className="filter-options color-options">
                  {['Black', 'White', 'Red', 'Blue', 'Green', 'Beige'].map(color => (
                    <label key={`color-option-${color}`} className="filter-option">
                      <input
                        type="checkbox"
                        checked={selectedFilters.color.includes(color)}
                        onChange={() => toggleFilter('color', color)}
                      />
                      <span className="checkbox-custom" style={{ 
                        backgroundColor: color.toLowerCase() === 'white' ? '#f8f8f8' : color.toLowerCase() 
                      }}></span>
                      <span className="option-label">{color}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div className="filter-section">
              <div 
                className="filter-title" 
                onClick={() => toggleFilterSection('price')}
              >
                <h3>Price</h3>
                <FontAwesomeIcon 
                  icon={expandedSections.price ? faChevronUp : faChevronDown} 
                />
              </div>
              
              {expandedSections.price && (
                <div className="filter-options price-options">
                  <label className="filter-option">
                    <input
                      type="radio"
                      checked={selectedFilters.price === 'all'}
                      onChange={() => toggleFilter('price', 'all')}
                    />
                    <span className="radio-custom"></span>
                    <span className="option-label">All Prices</span>
                  </label>
                  <label className="filter-option">
                    <input
                      type="radio"
                      checked={selectedFilters.price === '0-50'}
                      onChange={() => toggleFilter('price', '0-50')}
                    />
                    <span className="radio-custom"></span>
                    <span className="option-label">Under $50</span>
                  </label>
                  <label className="filter-option">
                    <input
                      type="radio"
                      checked={selectedFilters.price === '50-100'}
                      onChange={() => toggleFilter('price', '50-100')}
                    />
                    <span className="radio-custom"></span>
                    <span className="option-label">$50 - $100</span>
                  </label>
                  <label className="filter-option">
                    <input
                      type="radio"
                      checked={selectedFilters.price === '100-150'}
                      onChange={() => toggleFilter('price', '100-150')}
                    />
                    <span className="radio-custom"></span>
                    <span className="option-label">$100 - $150</span>
                  </label>
                  <label className="filter-option">
                    <input
                      type="radio"
                      checked={selectedFilters.price === '150-'}
                      onChange={() => toggleFilter('price', '150-')}
                    />
                    <span className="radio-custom"></span>
                    <span className="option-label">$150 & Above</span>
                  </label>
                </div>
              )}
            </div>
            
            <div className="filter-actions">
              <button className="reset-filter" onClick={resetFilters}>
                Reset All
              </button>
              <button className="apply-filter" onClick={applyFilters}>
                Apply Filters
              </button>
            </div>
          </aside>
          
          <div className="category-products">
            <div className="products-header">
              <div className="results-count">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
              </div>
              
              <div className="sort-options">
                <label>Sort by:</label>
                <select 
                  value={selectedFilters.sortBy}
                  onChange={(e) => toggleFilter('sortBy', e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                  <option value="name-desc">Name: Z to A</option>
                </select>
              </div>
            </div>
            
            <div className="products-grid">
              {filteredProducts.map((product, index) => (
                <div 
                  key={`product-${product.id}`} 
                  className="product-item fade-in"
                  style={{ '--order': index % 12 }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
            
            {filteredProducts.length === 0 && (
              <div className="no-results">
                <p>No products match your selected filters.</p>
                <button onClick={resetFilters}>Clear Filters</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;