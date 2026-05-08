import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroSlider from '../components/HeroSlider';
import ProductCard from '../components/ProductCard';
import { productsService, recommendationService } from '../services/api';
import './HomePage.css';

const CATEGORIES = [
  { key: "tv, audio & cameras",    label: 'TV & Audio',      emoji: '📺' },
  { key: "home & kitchen",         label: 'Home & Kitchen',  emoji: '🏠' },
  { key: "sports & fitness",       label: 'Sports',          emoji: '🏋️' },
  { key: "appliances",             label: 'Appliances',      emoji: '🔌' },
  { key: "beauty & health",        label: 'Beauty & Health', emoji: '💄' },
  { key: "toys & baby products",   label: 'Toys & Baby',     emoji: '🧸' },
  { key: "bags & luggage",         label: 'Bags & Luggage',  emoji: '👜' },
  { key: "car & motorbike",        label: 'Car & Moto',      emoji: '🚗' },
  { key: "men's clothing",         label: "Men's Fashion",   emoji: '👔' },
  { key: "women's clothing",       label: "Women's Fashion", emoji: '👗' },
  { key: "kids' fashion",          label: "Kids' Fashion",   emoji: '👶' },
  { key: "grocery & gourmet foods",label: 'Grocery',         emoji: '🛒' },
  { key: "pet supplies",           label: 'Pet Supplies',    emoji: '🐾' },
  { key: "accessories",            label: 'Accessories',     emoji: '💍' },
  { key: "women's shoes",          label: "Women's Shoes",   emoji: '👠' },
  { key: "men's shoes",            label: "Men's Shoes",     emoji: '👟' },
  { key: "industrial supplies",    label: 'Industrial',      emoji: '🔧' },
  { key: "home, kitchen, pets",    label: 'Home & Pets',     emoji: '🏡' },
  { key: "stores",                 label: 'Stores',          emoji: '🏪' },
];

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-img" />
    <div className="skeleton-text long" />
    <div className="skeleton-text medium" />
    <div className="skeleton-text short" />
  </div>
);

const SearchSection = ({ onSearch, loading, results, query }) => (
  <section className="search-section">
    <div className="search-box-wrapper">
      <input
        type="text"
        className="search-input"
        placeholder="Search products with AI semantic search…"
        onChange={(e) => onSearch(e.target.value)}
        defaultValue={query}
      />
      <span className="search-icon">🔍</span>
    </div>
    {query && (
      <div className="search-results-area">
        <h3 className="section-title">
          {loading ? 'Searching…' : `Results for "${query}" (${results.length})`}
        </h3>
        {loading ? (
          <div className="products-grid">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : results.length > 0 ? (
          <div className="products-grid">
            {results.map((p) => <ProductCard key={p.product_id} product={p} />)}
          </div>
        ) : (
          <p className="no-results">No products found. Try different keywords.</p>
        )}
      </div>
    )}
  </section>
);

const HomePage = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [recommendations, setRecommendations] = useState({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const prodRes = await productsService.getAllProducts();
        setAllProducts(prodRes.data || []);
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setProductsLoading(false);
      }

      try {
        const recRes = await recommendationService.getRecommendations();
        setRecommendations(recRes.data || {});
      } catch (err) {
        console.error('Failed to load recommendations:', err);
      }
    };
    loadData();
  }, []);

  const handleSearch = (value) => {
    setSearchQuery(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await recommendationService.searchProducts(value);
        setSearchResults(res.data || []);
      } catch {
        // Fallback: client-side filter
        const q = value.toLowerCase();
        setSearchResults(allProducts.filter((p) =>
          p.name.toLowerCase().includes(q) || p.main_category?.toLowerCase().includes(q)
        ).slice(0, 10));
      } finally {
        setSearchLoading(false);
      }
    }, 600);
    setSearchTimeout(t);
  };

  // Pick a few featured products (top rated across all)
  const featuredProducts = [...allProducts]
    .sort((a, b) => b.ratings - a.ratings)
    .slice(0, 8);

  // Best deals (highest discount %)
  const bestDeals = [...allProducts]
    .filter((p) => p.actual_price > p.discount_price)
    .sort((a, b) => (b.actual_price - b.discount_price) / b.actual_price - (a.actual_price - a.discount_price) / a.actual_price)
    .slice(0, 5);

  return (
    <div className="home-page">
      <HeroSlider />

      <div className="container">
        {/* Search */}
        <SearchSection
          onSearch={handleSearch}
          loading={searchLoading}
          results={searchResults}
          query={searchQuery}
        />

        {!searchQuery && (
          <>
            {/* Category cards */}
            <section className="categories-section">
              <h2 className="section-title">Shop By Category</h2>
              <div className="categories-grid">
                {CATEGORIES.map((cat) => (
                  <Link
                    to={`/category/${cat.key}`}
                    key={cat.key}
                    className="category-card"
                  >
                    <span className="category-emoji">{cat.emoji}</span>
                    <span className="category-label">{cat.label}</span>
                    {recommendations[cat.key] && (
                      <span className="category-count">
                        {recommendations[cat.key].length}+ products
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>

            {/* Browse all CTA */}
            <div className="browse-all-cta">
              <Link to="/shop" className="browse-all-btn">Browse All {allProducts.length || 685}+ Products</Link>
            </div>

            {/* Top Rated */}
            <section className="featured-section">
              <div className="section-header">
                <h2 className="section-title">⭐ Top Rated</h2>
                <Link to="/shop" className="view-all">View All Products →</Link>
              </div>
              {productsLoading ? (
                <div className="products-grid">
                  {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
                </div>
              ) : (
                <div className="products-grid">
                  {featuredProducts.map((p) => <ProductCard key={p.product_id} product={p} />)}
                </div>
              )}
            </section>

            {/* Best Deals */}
            {bestDeals.length > 0 && (
              <section className="featured-section deals-section">
                <div className="section-header">
                  <h2 className="section-title">🔥 Best Deals</h2>
                </div>
                <div className="products-grid">
                  {bestDeals.map((p) => <ProductCard key={p.product_id} product={p} />)}
                </div>
              </section>
            )}

            {/* Per-category recommendations */}
            {Object.entries(recommendations).slice(0, 3).map(([category, products]) => (
              <section key={category} className="featured-section">
                <div className="section-header">
                  <h2 className="section-title">{category}</h2>
                  <Link to={`/category/${category}`} className="view-all">View All →</Link>
                </div>
                <div className="products-grid">
                  {products.slice(0, 5).map((p) => <ProductCard key={p.product_id} product={p} />)}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;
