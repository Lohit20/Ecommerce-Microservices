import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTruck, faRotateLeft, faShieldHalved, faLock,
  faTv, faHouse, faDumbbell, faBlender, faSpa, faBabyCarriage,
  faBriefcase, faCar, faShirt, faMasksTheater, faChild,
  faCartShopping, faPaw, faGem, faHighlighter, faShoePrints,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons';
import HeroSlider from '../components/HeroSlider';
import ProductCard from '../components/ProductCard';
import { productsService, recommendationService } from '../services/api';
import './HomePage.css';

const CATEGORIES = [
  { key: "tv, audio & cameras",     label: 'TV & Audio',      icon: faTv,           color: '#eff6ff' },
  { key: "home & kitchen",          label: 'Home & Kitchen',  icon: faHouse,        color: '#f0fdf4' },
  { key: "sports & fitness",        label: 'Sports',          icon: faDumbbell,     color: '#fff7ed' },
  { key: "appliances",              label: 'Appliances',      icon: faBlender,      color: '#faf5ff' },
  { key: "beauty & health",         label: 'Beauty & Health', icon: faSpa,          color: '#fdf2f8' },
  { key: "toys & baby products",    label: 'Toys & Baby',     icon: faBabyCarriage, color: '#fffbeb' },
  { key: "bags & luggage",          label: 'Bags & Luggage',  icon: faBriefcase,    color: '#f0f9ff' },
  { key: "car & motorbike",         label: 'Car & Moto',      icon: faCar,          color: '#f1f5f9' },
  { key: "men's clothing",          label: "Men's Fashion",   icon: faShirt,        color: '#eff6ff' },
  { key: "women's clothing",        label: "Women's Fashion", icon: faMasksTheater, color: '#fdf2f8' },
  { key: "kids' fashion",           label: "Kids' Fashion",   icon: faChild,        color: '#fffbeb' },
  { key: "grocery & gourmet foods", label: 'Grocery',         icon: faCartShopping, color: '#f0fdf4' },
  { key: "pet supplies",            label: 'Pet Supplies',    icon: faPaw,          color: '#fff7ed' },
  { key: "accessories",             label: 'Accessories',     icon: faGem,          color: '#faf5ff' },
  { key: "women's shoes",           label: "Women's Shoes",   icon: faHighlighter,  color: '#fdf2f8' },
  { key: "men's shoes",             label: "Men's Shoes",     icon: faShoePrints,   color: '#eff6ff' },
];

const USP_ITEMS = [
  { icon: faTruck,        title: 'Free Delivery',    subtitle: 'On orders over £50' },
  { icon: faRotateLeft,   title: 'Easy Returns',     subtitle: '30-day hassle-free returns' },
  { icon: faShieldHalved, title: '100% Authentic',   subtitle: 'Genuine products only' },
  { icon: faLock,         title: 'Secure Payments',  subtitle: 'Safe & encrypted checkout' },
];

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-img" />
    <div className="skeleton-text long" />
    <div className="skeleton-text medium" />
    <div className="skeleton-text short" />
  </div>
);

const SectionHeader = ({ title, viewAllLink, viewAllLabel = 'View All →' }) => (
  <div className="section-header">
    <h2 className="section-title">{title}</h2>
    {viewAllLink && (
      <Link to={viewAllLink} className="view-all">{viewAllLabel}</Link>
    )}
  </div>
);

const HomePage = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [recommendations, setRecommendations] = useState({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await productsService.getAllProducts();
        setAllProducts(res.data || []);
      } catch (e) {
        // products unavailable
      } finally {
        setProductsLoading(false);
      }
      try {
        const rec = await recommendationService.getRecommendations();
        setRecommendations(rec.data || {});
      } catch (e) {
        // recommendations unavailable
      }
    };
    load();
  }, []);

  const handleSearch = (value) => {
    setSearchQuery(value);
    clearTimeout(searchTimeout.current);
    if (!value.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await recommendationService.searchProducts(value);
        setSearchResults(res.data || []);
      } catch {
        const q = value.toLowerCase();
        setSearchResults(
          allProducts.filter((p) =>
            p.name.toLowerCase().includes(q) ||
            p.main_category?.toLowerCase().includes(q) ||
            p.sub_category?.toLowerCase().includes(q)
          ).slice(0, 24)
        );
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const featuredProducts = [...allProducts].sort((a, b) => b.ratings - a.ratings).slice(0, 8);
  const bestDeals = [...allProducts]
    .filter((p) => p.actual_price > p.discount_price)
    .sort((a, b) =>
      (b.actual_price - b.discount_price) / b.actual_price -
      (a.actual_price - a.discount_price) / a.actual_price
    )
    .slice(0, 5);

  return (
    <div className="home-page">
      <HeroSlider />

      {/* USP strip */}
      <div className="usp-strip">
        <div className="usp-inner">
          {USP_ITEMS.map((item) => (
            <div className="usp-item" key={item.title}>
              <span className="usp-icon"><FontAwesomeIcon icon={item.icon} /></span>
              <div>
                <div className="usp-title">{item.title}</div>
                <div className="usp-sub">{item.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container">
        {/* Search */}
        <div className="search-section">
          <div className="search-box-wrapper">
            <span className="search-icon-left"><FontAwesomeIcon icon={faMagnifyingGlass} /></span>
            <input
              type="text"
              className="search-input"
              placeholder="Search products — try 'wireless headphones under £100'…"
              onChange={(e) => handleSearch(e.target.value)}
              defaultValue={searchQuery}
            />
          </div>
          {searchQuery && (
            <div className="search-results-area">
              <SectionHeader
                title={searchLoading ? 'Searching…' : `"${searchQuery}" — ${searchResults.length} results`}
              />
              {searchLoading ? (
                <div className="products-grid">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
              ) : searchResults.length > 0 ? (
                <div className="products-grid">
                  {searchResults.map((p) => <ProductCard key={p.product_id} product={p} />)}
                </div>
              ) : (
                <p className="no-results">No results found. Try different keywords.</p>
              )}
            </div>
          )}
        </div>

        {!searchQuery && (
          <>
            {/* Categories */}
            <section className="home-section">
              <SectionHeader title="Shop By Category" />
              <div className="categories-grid">
                {CATEGORIES.map((cat) => (
                  <Link to={`/category/${cat.key}`} key={cat.key} className="category-card" style={{ '--cat-bg': cat.color }}>
                    <span className="category-icon"><FontAwesomeIcon icon={cat.icon} /></span>
                    <span className="category-label">{cat.label}</span>
                  </Link>
                ))}
              </div>
              <div className="browse-all-row">
                <Link to="/shop" className="browse-all-btn">
                  Browse All {allProducts.length || 685}+ Products →
                </Link>
              </div>
            </section>

            {/* Top Rated */}
            <section className="home-section">
              <SectionHeader title="Top Rated" viewAllLink="/shop" />
              <div className="products-grid">
                {productsLoading
                  ? [1,2,3,4,5].map(i => <SkeletonCard key={i} />)
                  : featuredProducts.map((p) => <ProductCard key={p.product_id} product={p} />)
                }
              </div>
            </section>

            {/* Best Deals */}
            {bestDeals.length > 0 && (
              <section className="home-section deals-section">
                <SectionHeader title="Best Deals" viewAllLink="/shop" />
                <div className="products-grid">
                  {bestDeals.map((p) => <ProductCard key={p.product_id} product={p} />)}
                </div>
              </section>
            )}

            {/* Per-category recommendations */}
            {Object.entries(recommendations).slice(0, 3).map(([category, products]) => (
              <section key={category} className="home-section">
                <SectionHeader
                  title={category.replace(/\b\w/g, (c) => c.toUpperCase())}
                  viewAllLink={`/category/${category}`}
                />
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
