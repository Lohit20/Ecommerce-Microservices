import React, { useState, useEffect, useMemo } from 'react';
import ProductCard from '../components/ProductCard';
import { productsService } from '../services/api';
import './AllProductsPage.css';

const PAGE_SIZE = 24;

const SORT_OPTIONS = [
  { value: 'rating', label: 'Top Rated' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'discount', label: 'Best Discount' },
  { value: 'name', label: 'Name A–Z' },
];

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-img" />
    <div className="skeleton-text long" />
    <div className="skeleton-text medium" />
    <div className="skeleton-text short" />
  </div>
);

const AllProductsPage = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('rating');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState(65000);
  const [priceFilter, setPriceFilter] = useState(65000);
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await productsService.getAllProducts();
        const products = res.data || [];
        setAllProducts(products);
        const top = Math.max(...products.map(p => p.discount_price));
        setMaxPrice(top);
        setPriceFilter(top);
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const categories = useMemo(() => (
    [...new Set(allProducts.map(p => p.main_category))].sort()
  ), [allProducts]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return allProducts
      .filter(p => {
        if (selectedCategory && p.main_category !== selectedCategory) return false;
        if (p.discount_price > priceFilter) return false;
        if (p.ratings < minRating) return false;
        if (q && !p.name.toLowerCase().includes(q) &&
            !p.main_category.toLowerCase().includes(q) &&
            !(p.sub_category || '').toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return b.ratings - a.ratings;
        if (sortBy === 'price-asc') return a.discount_price - b.discount_price;
        if (sortBy === 'price-desc') return b.discount_price - a.discount_price;
        if (sortBy === 'discount') return (b.actual_price - b.discount_price) - (a.actual_price - a.discount_price);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [allProducts, selectedCategory, priceFilter, minRating, searchQuery, sortBy]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [selectedCategory, priceFilter, minRating, searchQuery, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setSelectedCategory('');
    setPriceFilter(maxPrice);
    setMinRating(0);
    setSortBy('rating');
    setSearchQuery('');
  };

  const goToPage = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  }, [page, totalPages]);

  return (
    <div className="all-products-page">
      <div className="shop-hero">
        <h1>All Products</h1>
        <p>{loading ? 'Loading catalogue…' : `${filtered.length.toLocaleString()} of ${allProducts.length.toLocaleString()} products`}</p>
      </div>

      <div className="container shop-layout">
        {/* Mobile filter toggle */}
        <button className="filter-toggle-btn" onClick={() => setSidebarOpen(o => !o)}>
          {sidebarOpen ? 'Hide Filters ✕' : 'Filters ☰'}
        </button>

        {/* Sidebar */}
        <aside className={`shop-filters ${sidebarOpen ? 'open' : ''}`}>
          <div className="filter-header">
            <h3>Filters</h3>
            <button className="reset-link" onClick={resetFilters}>Reset all</button>
          </div>

          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              className="filter-search"
              placeholder="Search products…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="filter-select">
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="filter-select">
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Max Price: ₹{priceFilter.toLocaleString('en-IN')}</label>
            <input
              type="range"
              min={0}
              max={maxPrice}
              value={priceFilter}
              onChange={e => setPriceFilter(Number(e.target.value))}
              className="price-slider"
            />
            <div className="price-range-labels">
              <span>₹0</span>
              <span>₹{maxPrice.toLocaleString('en-IN')}</span>
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
              onChange={e => setMinRating(Number(e.target.value))}
              className="price-slider"
            />
            <div className="price-range-labels">
              <span>0★</span>
              <span>5★</span>
            </div>
          </div>
        </aside>

        {/* Product grid */}
        <main className="shop-products">
          <div className="results-bar">
            <span>
              {loading ? 'Loading…' : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} products`}
            </span>
            <span className="page-info">Page {page} of {totalPages || 1}</span>
          </div>

          {loading ? (
            <div className="shop-grid">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p>No products match your filters.</p>
              <button className="reset-btn" onClick={resetFilters}>Clear Filters</button>
            </div>
          ) : (
            <div className="shop-grid">
              {paginated.map(p => <ProductCard key={p.product_id} product={p} />)}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn nav-btn"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
              >← Prev</button>

              {pageNumbers.map((n, i) =>
                n === '...'
                  ? <span key={`ellipsis-${i}`} className="page-ellipsis">…</span>
                  : <button
                      key={n}
                      className={`page-btn ${page === n ? 'active' : ''}`}
                      onClick={() => goToPage(n)}
                    >{n}</button>
              )}

              <button
                className="page-btn nav-btn"
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
              >Next →</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AllProductsPage;
