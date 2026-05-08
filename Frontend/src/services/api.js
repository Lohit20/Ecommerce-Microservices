import axios from 'axios';

const createApiClient = (baseURL, withAuth = false) => {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  });

  if (withAuth) {
    client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) config.headers['Authorization'] = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  return client;
};

const authApi = createApiClient('http://localhost:8004/api');
const productApi = createApiClient('http://localhost:8001/');
const cartApi = createApiClient('http://localhost:8002/', true);
const RSApi = createApiClient('http://localhost:8003/');

export const authService = {
  register: (userData) => authApi.post('/auth/register', userData),
  login: (credentials) => authApi.post('/auth/login', credentials),
};

export const productsService = {
  getAllProducts: () => productApi.get('/get_all_products/'),
  getProduct: (productId) => productApi.get(`/get_product/${productId}`),
};

export const cartService = {
  getCart: (userId) => cartApi.get(`/cart/${userId}`),
  addToCart: (userId, items) => cartApi.post(`/cart/${userId}/add`, items),
  removeFromCart: (userId, productId) => cartApi.post(`/cart/${userId}/remove/${productId}`),
  clearCart: (userId) => cartApi.post(`/cart/${userId}/clear`),
  checkoutCart: (userId, paymentMethod) => cartApi.post(`/checkout/${userId}`, paymentMethod),
  getUserTransactions: (userId) => cartApi.get(`/transactions/${userId}`),
};

export const recommendationService = {
  getRecommendations: () => RSApi.get('/recommendations'),
  searchProducts: (query) => RSApi.get(`/product_semantic_search?query=${encodeURIComponent(query)}`),
};
