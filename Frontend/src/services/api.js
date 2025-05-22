import axios from 'axios';

// Create axios instance with default config
const apiProduct = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8001',
  headers: {
    'Content-Type': 'application/json'
  }
});
const apiCart = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8002',
  headers: {
    'Content-Type': 'application/json'
  }
});
const apiRecommendations = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8003/api',
  headers: {
    'Content-Type': 'application/json'
  }
});
const apiAuth = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8004/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for adding auth token
apiAuth.interceptors.request.use(
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
apiAuth.interceptors.response.use(
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

export { apiProduct, apiCart, apiRecommendations, apiAuth };

// Auth Service
export const authService = {
  register: (userData) => apiAuth.post('/auth/register', userData),
  login: (credentials) => apiAuth.post('/auth/login', credentials),
};

// Products Service
export const productsService = {
  getAllProducts: () => apiProduct.get('/products'),
  getProduct: (productId) => apiProduct.get(`/get_product/${productId}`),
  searchProducts: (query) => apiProduct.get(`/products/search?q=${query}`),
  getProductsByCategory: (category) => apiProduct.get(`/products/category/${category}`),
  ///////////////////////////////////////////////////////
  getHotPicks: () => apiProduct.get('/get_hot_picks'),
  getNewArrivals: () => apiProduct.get('/get_new_arrivals'),
  getBestSellers: () => apiProduct.get('/get_best_sellers'),
  getMensColthing: () => apiProduct.get('/get_men_products'),
  getWomensColthing: () => apiProduct.get('/get_women_products'),
  getBoysColthing: () => apiProduct.get('/get_boys_products'),
  getGirlsColthing: () => apiProduct.get('/get_girls_products'),
  getSale: () => apiProduct.get('/get_sale_products'),
};

// Cart Service
export const cartService = {
  getCart: (userId) => apiCart.get(`/cart/${userId}`),
  getTransactions: (userId) => apiCart.get(`/transactions/${userId}`),
  insertTransaction: (orderData) => apiCart.post('/checkout', orderData),
  insertCart: (cart) => apiCart.post('/save_cart', cart)
};

// Recommendation Service
export const recommendationService = {
  getProductRecommendations: (productId) => apiRecommendations.get(`/recommendations/${productId}`),
  searchSemanticProducts: (query) => apiRecommendations.get(`/product_semantic_search?q=${query}`),
};