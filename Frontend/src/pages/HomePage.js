import React from 'react';
import { Link } from 'react-router-dom';
import HeroSlider from '../components/HeroSlider';
import ProductCard from '../components/ProductCard';
import unsplashImages from '../utils/unsplashImages';
import './HomePage.css';
import { useEffect, useState } from 'react';



const HomePage = () => {

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [hotPicksProducts, setHotPicksProducts] = useState([]);
  const [newArrivalsProducts, setNewArrivalsProducts] = useState([]);
  const [bestOfAllTimeProducts, setBestOfAllTimeProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const ProductService = (await import('../services/ProductService')).default;
        const [hotPicksRes, newArrivalsRes, bestSellersRes] 
          = await Promise.all([
          ProductService.getHotPicks(),
          ProductService.getNewArrivals(),
          ProductService.getBestSellers(),
        ]);

        setHotPicksProducts(hotPicksRes.hot_picks || []);
        setNewArrivalsProducts(newArrivalsRes.new_arrivals || []);
        setBestOfAllTimeProducts(bestSellersRes.best_sellers || []);
      } catch (err) {
        console.error('Error fetching homepage data:', err);
      }
    };

    fetchProducts();
  }, []);

  // Category data with images from unsplashImages
  const categories = [
    {
      id: 'men',
      name: 'Men',
      image: unsplashImages.men[0],
      link: '/category/men\'s clothing'
    },
    {
      id: 'women',
      name: 'Women',
      image: unsplashImages.women[0],
      link: '/category/women\'s clothing'
    },
    {
      id: 'girls',
      name: 'Girls',
      image: unsplashImages.girls[0],
      link: '/category/girls\' clothing'
    },
    {
      id: 'boys',
      name: 'Boys',
      image: unsplashImages.boys[0],
      link: '/category/boys\' clothing'
    },
    {
      id: 'sale',
      name: 'Sale',
      image: unsplashImages.hero[1],
      link: '/category/sale'
    }
  ];

  // No scrolling functionality needed for grid layout

  return (
    <div className="home-page">
      <HeroSlider />
      
      <div className="container">
        <section className="categories-section">
          <div className="section-header">
            <h2 className="section-title">Shop By Category</h2>
          </div>
          <div className="categories-grid">
            {categories.map(category => (
              <Link to={category.link} key={category.id} className="category-card">
                <div className="category-image-container">
                  <img src={category.image} alt={category.name} className="category-image" />
                </div>
                <div className="category-name">{category.name}</div>
              </Link>
            ))}
          </div>
        </section>
        
        <section className="featured-section">
          <div className="section-header">
            <h2 className="section-title">Hot Picks</h2>
            <Link to={"/category/hot-picks"} className="view-all">View All</Link>
          </div>
          <div className="products-grid">
            {hotPicksProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
        
        <section className="featured-section">
          <div className="section-header">
            <h2 className="section-title">New Arrivals</h2>
            <Link to="/category/new-arrivals" className="view-all">View All</Link>
          </div>
          <div className="products-grid">
            {newArrivalsProducts.slice(0, 5).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="featured-section">
          <div className="section-header">
            <h2 className="section-title">Best Sellers</h2>
            <Link to="/category/best-sellers" className="view-all">View All</Link>
          </div>
          <div className="products-grid">
            {bestOfAllTimeProducts.slice(0, 5).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;