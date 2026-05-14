import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { productsService } from '../services/api';
import { toGBP } from '../utils/priceUtils';
import './CategoryPage.css';

const SORT_OPTIONS = [
  { value: 'rating', label: 'Top Rated' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'discount', label: 'Best Discount' },
];

const CategoryPage = () => {
  const { category } = useParams();
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('rating');
  const [maxPrice, setMaxPrice] = useState(10000);
  const [priceFilter, setPriceFilter] = useState(10000);
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await productsService.getAllProducts();
        const filtered = (res.data || []).filter(
          (p) => p.main_category?.toLowerCase() === category.toLowerCase()
        );
        setAllProducts(filtered);
        if (filtered.length > 0) {
          const top = toGBP(Math.max(...filtered.map((p) => p.discount_price)));
          setMaxPrice(top);
          setPriceFilter(top);
        }
      } catch (err) {
        console.error('Failed to load category products:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [category]);

  const filtered = allProducts
    .filter((p) => toGBP(p.discount_price) <= priceFilter && p.ratings >= minRating)
    .sort((a, b) => {
      if (sortBy === 'rating') return b.ratings - a.ratings;
      if (sortBy === 'price-asc') return a.discount_price - b.discount_price;
      if (sortBy === 'price-desc') return b.discount_price - a.discount_price;
      if (sortBy === 'discount') return (b.actual_price - b.discount_price) - (a.actual_price - a.discount_price);
      return 0;
    });

  return (
    <div className="category-page">
      <div className="category-hero">
        <h1>{category}</h1>
        <p>{loading ? '...' : `${allProducts.length} products`}</p>
      </div>

      <div className="container category-layout">
        {/* Sidebar filters */}
        <aside className="filters-panel">
          <h3>Filters</h3>

          <div className="filter-group">
            <label>Sort By</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Max Price: £{priceFilter.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</label>
            <input
              type="range"
              min={0}
              max={maxPrice}
              value={priceFilter}
              onChange={(e) => setPriceFilter(Number(e.target.value))}
              className="price-slider"
            />
            <div className="price-range-labels">
              <span>£0</span>
              <span>£{maxPrice.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="filter-group">
            <label>Min Rating: {minRating}★</label>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="price-slider"
            />
          </div>

          <button className="reset-btn" onClick={() => { setPriceFilter(maxPrice); setMinRating(0); setSortBy('rating'); }}>
            Reset Filters
          </button>
        </aside>

        {/* Products */}
        <main className="category-products">
          <div className="results-info">
            <span>{filtered.length} products in <strong>{category}</strong></span>
          </div>

          {loading ? (
            <div className="category-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-img" />
                  <div className="skeleton-text long" />
                  <div className="skeleton-text short" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p>No products found for these filters.</p>
              <Link to="/">← Back to Home</Link>
            </div>
          ) : (
            <div className="category-grid">
              {filtered.map((p) => <ProductCard key={p.product_id} product={p} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CategoryPage;
