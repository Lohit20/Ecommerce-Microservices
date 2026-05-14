import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import './HeroSlider.css';

const SLIDES = [
  {
    id: 1,
    eyebrow: 'New Arrivals',
    title: 'Shop Everything\nin One Place',
    subtitle: 'Electronics, home essentials, fashion, beauty & more — 685+ products at the best prices.',
    buttonText: 'Browse All Products',
    buttonLink: '/shop',
    image: '/Images/aleksandar-andreev-5vRSlHMj5uM-unsplash.jpg',
  },
  {
    id: 2,
    eyebrow: 'Best Sellers',
    title: 'Top Electronics\n& Appliances',
    subtitle: 'TVs, audio gear, cameras and kitchen appliances — premium quality, guaranteed.',
    buttonText: 'Shop Electronics',
    buttonLink: '/category/tv, audio & cameras',
    image: '/Images/baby-natur-aNGHqUAITYc-unsplash.jpg',
  },
  {
    id: 3,
    eyebrow: 'Trending Now',
    title: 'Home, Fashion\n& Much More',
    subtitle: 'From clothing and shoes to home & kitchen — everything delivered to your door.',
    buttonText: 'Explore Categories',
    buttonLink: '/shop',
    image: '/Images/freestocks-_3Q3tsJ01nc-unsplash.jpg',
  },
];

const HeroSlider = () => {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((p) => (p + 1) % SLIDES.length), []);
  const prev = useCallback(() => setCurrent((p) => (p - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  return (
    <div className="hero-slider">
      <div className="slides-container">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            className={`slide ${i === current ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="slide-content">
              <span className="slide-eyebrow">{slide.eyebrow}</span>
              <h2>{slide.title}</h2>
              <p>{slide.subtitle}</p>
              <Link to={slide.buttonLink} className="slide-button">
                {slide.buttonText} <FontAwesomeIcon icon={faArrowRight} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <button className="slider-arrow prev" onClick={prev} aria-label="Previous">
        <FontAwesomeIcon icon={faChevronLeft} />
      </button>
      <button className="slider-arrow next" onClick={next} aria-label="Next">
        <FontAwesomeIcon icon={faChevronRight} />
      </button>

      <div className="slider-dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`dot ${i === current ? 'active' : ''}`}
            onClick={() => setCurrent(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
