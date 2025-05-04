import React from 'react';
import { Link } from 'react-router-dom';
import HeroSlider from '../components/HeroSlider';
import ProductCard from '../components/ProductCard';
import unsplashImages from '../utils/unsplashImages';
import './HomePage.css';

const HomePage = () => {
  // Sample product data with clothing items
  const hotPicksProducts = [
    {
      id: 1,
      name: 'Classic Oxford Shirt',
      category: 'Men',
      price: 59.99,
      image: unsplashImages.men[0]
    },
    {
      id: 2,
      name: 'Slim Fit Chinos',
      category: 'Men',
      price: 49.99,
      image: unsplashImages.men[1]
    },
    {
      id: 3,
      name: 'Casual Denim Jacket',
      category: 'Men',
      price: 89.99,
      image: unsplashImages.men[2]
    },
    {
      id: 4,
      name: 'Merino Wool Sweater',
      category: 'Men',
      price: 79.99,
      image: unsplashImages.men[3]
    },
    {
      id: 13,
      name: 'Tailored Blazer',
      category: 'Men',
      price: 129.99,
      image: unsplashImages.men[4]
    }
  ];

  const newArrivalsProducts = [
    {
      id: 5,
      name: 'Floral Maxi Dress',
      category: 'Women',
      price: 79.99,
      image: unsplashImages.women[0]
    },
    {
      id: 6,
      name: 'High-Waisted Jeans',
      category: 'Women',
      price: 69.99,
      image: unsplashImages.women[1]
    },
    {
      id: 7,
      name: 'Cashmere Cardigan',
      category: 'Women',
      price: 99.99,
      image: unsplashImages.women[2]
    },
    {
      id: 8,
      name: 'Silk Blouse',
      category: 'Women',
      price: 89.99,
      image: unsplashImages.women[3]
    },
    {
      id: 14,
      name: 'Tailored Blazer',
      category: 'Women',
      price: 109.99,
      image: unsplashImages.women[4]
    }
  ];

  const bestOfAllTimeProducts = [
    {
      id: 9,
      name: 'Floral Print Dress',
      category: 'Girls',
      price: 39.99,
      image: unsplashImages.girls[0]
    },
    {
      id: 10,
      name: 'Denim Overalls',
      category: 'Girls',
      price: 44.99,
      image: unsplashImages.girls[1]
    },
    {
      id: 11,
      name: 'Graphic T-Shirt',
      category: 'Boys',
      price: 24.99,
      image: unsplashImages.boys[0]
    },
    {
      id: 12,
      name: 'Cargo Pants',
      category: 'Boys',
      price: 34.99,
      image: unsplashImages.boys[1]
    },
    {
      id: 15,
      name: 'Hooded Sweatshirt',
      category: 'Boys',
      price: 29.99,
      image: unsplashImages.boys[2]
    }
  ];

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
            <Link to="/category/hot-picks" className="view-all">View All</Link>
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