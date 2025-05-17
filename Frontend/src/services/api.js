import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for adding auth token
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

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth Service
export const authService = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
};

// Products Service
export const productsService = {
  getAllProducts: () => api.get('/products'),
  getProduct: (productId) => api.get(`/products/${productId}`),
  searchProducts: (query) => api.get(`/products/search?q=${query}`),
  getProductsByCategory: (category) => api.get(`/products/category/${category}`),
};

// Cart Service
export const cartService = {
  getUserTransactions: (userId) => api.get(`/cart/get_user_transactions/${userId}`),
  getAllTransactions: () => api.get('/cart/get_all_transactions'),
  insertTransaction: (orderData) => api.post('/cart/insert_user_transactions', orderData),
};

// Recommendation Service
export const recommendationService = {
  getProductRecommendations: (productId) => api.get(`/recommendations/${productId}`),
  searchSemanticProducts: (query) => api.get(`/product_semantic_search?q=${query}`),
};