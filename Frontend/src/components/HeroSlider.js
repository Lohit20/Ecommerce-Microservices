import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import './HeroSlider.css';

const HeroSlider = () => {
  // Default fallback image in case all others fail
  const fallbackImage = '/Images/aleksandar-andreev-5vRSlHMj5uM-unsplash.jpg';
  
  // Local images from public/Images folder
  const imagesList = [
    '/Images/aleksandar-andreev-5vRSlHMj5uM-unsplash.jpg',
    '/Images/baby-natur-aNGHqUAITYc-unsplash.jpg',
    '/Images/freestocks-_3Q3tsJ01nc-unsplash.jpg'
  ];
  
  // Error handling for image loading
  const [imagesLoaded, setImagesLoaded] = useState(true);
  const [imageErrors, setImageErrors] = useState([]);
  
  // Preload images to check if they exist
  useEffect(() => {
    const preloadImages = async () => {
      try {
        const promises = imagesList.map((src) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(src);
            img.onerror = () => reject(src);
          });
        });
        
        await Promise.all(promises);
        setImagesLoaded(true);
      } catch (errorSrc) {
        console.error(`Failed to load image: ${errorSrc}`);
        setImageErrors(prev => [...prev, errorSrc]);
        // Continue showing the slider even if some images fail to load
        setImagesLoaded(true);
      }
    };
    
    preloadImages();
  }, []);
  
  // Shuffle the images array to display in random order
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  
  // Get shuffled images on component mount
  const [randomImages] = useState(shuffleArray(imagesList));
  
  // Create slides with random images
  const slides = [
    {
      id: 1,
      title: 'Colorful Textile Collection',
      subtitle: 'Explore our vibrant selection of fabrics and textiles',
      buttonText: 'Shop Now',
      buttonLink: '/category/textiles',
      image: randomImages[0]
    },
    {
      id: 2,
      title: 'Fashion Variety',
      subtitle: 'Discover our diverse range of clothing options',
      buttonText: 'Explore',
      buttonLink: '/category/clothing',
      image: randomImages[1]
    },
    {
      id: 3,
      title: 'Premium Shirts',
      subtitle: 'Quality shirts for every occasion',
      buttonText: 'View Collection',
      buttonLink: '/category/shirts',
      image: randomImages[2]
    }
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, [slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [nextSlide]);

  // Function to ensure image URL is valid
  const getValidImageUrl = (imageUrl) => {
    // Check if the URL is valid
    if (!imageUrl || typeof imageUrl !== 'string') {
      return fallbackImage;
    }
    return imageUrl;
  };

  return (
    <div className="hero-slider">
      <div className="slides-container">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`slide ${index === currentSlide ? 'active' : ''}`}
            style={{ 
              backgroundImage: `url(${getValidImageUrl(slide.image)})`,
              opacity: index === currentSlide ? 1 : 0,
              zIndex: index === currentSlide ? 2 : 1
            }}
          >
            <div className="slide-content">
              <h2>{slide.title}</h2>
              <p>{slide.subtitle}</p>
              <Link to={slide.buttonLink} className="slide-button">
                {slide.buttonText}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <button className="slider-arrow prev" onClick={prevSlide}>
        <FontAwesomeIcon icon={faChevronLeft} />
      </button>
      <button className="slider-arrow next" onClick={nextSlide}>
        <FontAwesomeIcon icon={faChevronRight} />
      </button>

      <div className="slider-dots">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentSlide ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
          ></button>
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;