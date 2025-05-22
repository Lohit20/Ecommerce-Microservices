# Microservices Connection Guide

## Introduction

This guide will help you understand how to connect a frontend application with backend microservices. 


## How Frontend and Backend Connect

In simple terms:
1. The frontend (what users see in their browser) sends requests to the backend
2. The backend microservices process these requests and return data
3. The frontend displays this data to the user

![Frontend-Backend Communication](https://miro.medium.com/max/1400/1*QERgzuzphdQz4e0fNs1CFQ.png)

## Prerequisites

Before connecting the frontend with microservices, you need:

1. **Basic development tools**:
   - Node.js and npm installed
   - A code editor (like Visual Studio Code)
   - Basic knowledge of JavaScript

2. **Running services**:
   - MongoDB database (on port 27017)
   - All microservices running:
     - Products Service (port 8001)
     - Cart Service (port 8002)
     - Recommendation Service (port 8003)
     - Auth Service (port 8004)

3. **Frontend dependencies**:
   - axios (for making HTTP requests)
   - http-proxy-middleware (for routing API requests)

## System Architecture

Our application has these components:

1. **Frontend**: React application (port 3000)
   - What users interact with in their browser

2. **Backend Microservices**:
   - **Products Service** (port 8001): Manages all product data
   - **Cart Service** (port 8002): Handles shopping cart and purchases
   - **Recommendation Service** (port 8003): Suggests products and handles search
   - **Auth Service** (port 8004): Manages user login and registration

## Step-by-Step Connection Process

### Step 1: Set Up Environment Variables

Create a `.env` file in the Frontend directory with these settings:

```
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_BASE_URL=http://localhost:3000
NODE_ENV=development
```

This tells your frontend where to find the API services.

### Step 2: Create API Service File

Create a file called `api.js` in the `src/services` directory. This file will handle all communication with the backend:

```javascript
import axios from 'axios';

// Create main API client
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add authentication to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth Service API calls
export const authService = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
};

// Products Service API calls
export const productsService = {
  getAllProducts: () => api.get('/products'),
  getProduct: (productId) => api.get(`/products/${productId}`),
  searchProducts: (query) => api.get(`/products/search?q=${query}`),
};

// Cart Service API calls
export const cartService = {
  getUserTransactions: (userId) => api.get(`/cart/get_user_transactions/${userId}`),
  insertTransaction: (orderData) => api.post('/cart/insert_user_transactions', orderData),
};

// Recommendation Service API calls
export const recommendationService = {
  getProductRecommendations: (productId) => api.get(`/recommendations/${productId}`),
  searchSemanticProducts: (query) => api.get(`/product_semantic_search?q=${query}`),
};

export default api;
```

### Step 3: Set Up API Routing

Create a file called `setupProxy.js` in the `src` directory. This file tells the frontend where to send different API requests:

```javascript
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Route product requests to Products Service
  app.use(
    '/api/products',
    createProxyMiddleware({
      target: 'http://localhost:8001',
      changeOrigin: true,
      pathRewrite: {
        '^/api/products': '/get_all_products',
      },
    })
  );

  // Route recommendation requests to Recommendation Service
  app.use(
    '/api/recommendations',
    createProxyMiddleware({
      target: 'http://localhost:8003',
      changeOrigin: true,
    })
  );

  // Route cart requests to Cart Service
  app.use(
    '/api/cart',
    createProxyMiddleware({
      target: 'http://localhost:8002',
      changeOrigin: true,
    })
  );

  // Route authentication requests to Auth Service
  app.use(
    '/api/auth',
    createProxyMiddleware({
      target: 'http://localhost:8004',
      changeOrigin: true,
    })
  );
};
```

## How to Use the API in Components

Now you can use the API services in your React components. Here's an example:

```javascript
import React, { useState, useEffect } from 'react';
import { productsService } from '../services/api';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get products when component loads
    async function fetchProducts() {
      try {
        setLoading(true);
        const response = await productsService.getAllProducts();
        setProducts(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load products');
        setLoading(false);
        console.error(err);
      }
    }

    fetchProducts();
  }, []);

  if (loading) return <div>Loading products...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="product-list">
      <h2>Products</h2>
      {products.map(product => (
        <div key={product._id} className="product-card">
          <h3>{product.name}</h3>
          <p>{product.description}</p>
          <p>${product.price}</p>
        </div>
      ))}
    </div>
  );
}

export default ProductList;
```

## Starting Everything

### 1. Start MongoDB

Make sure MongoDB is running on port 27017.

### 2. Start All Microservices

You can start all services at once with Docker Compose:

```bash
docker-compose up
```

Or start each service individually:

```bash
# Products Service
cd products
python main.py

# Cart Service
cd cart
python main.py

# Recommendation Service
cd recommendation_and_search_system
python main.py

# Auth Service
cd ecommerce-auth
python main.py
```

### 3. Start the Frontend

```bash
cd Frontend
npm install  # Only needed first time
npm start
```

## Common Problems and Solutions

### 1. "Cannot connect to API" errors

- Check that all microservices are running
- Verify your `.env` file has the correct URLs
- Make sure the proxy settings in `setupProxy.js` are correct

### 2. Authentication problems

- Check that the Auth Service is running
- Clear your browser's localStorage and try logging in again
- Verify the token is being sent in API requests

### 3. "CORS error" messages

- This is handled by the proxy in development
- If testing in production, make sure the backend services allow requests from your frontend domain

## What's Happening Behind the Scenes

1. When you call `productsService.getAllProducts()`, the frontend makes a request to `/api/products`
2. The proxy redirects this to `http://localhost:8001/get_all_products`
3. The Products Service processes the request and returns data
4. The frontend receives this data and displays it

## Next Steps

Once you understand the basics:

1. Try adding a new API endpoint to one of the microservices
2. Create a new frontend component that uses this endpoint
3. Experiment with passing data between different microservices

## Conclusion

You now understand the basics of connecting a frontend application to backend microservices. This foundation will help you work effectively in projects that use this architecture, even if you're not a specialist in either frontend or backend development.