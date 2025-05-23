import axios from 'axios';

// Utility to create an API client with optional auth interceptors
const createApiClient = (baseURL, withAuth = false) => {
    const client = axios.create({
        baseURL,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (withAuth) {
        // Attach token to request headers
        client.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('authToken');
                if (token) {
                    config.headers['Authorization'] = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Handle 401 Unauthorized globally
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

// Create API clients
const authApi = createApiClient('http://localhost:8004/api');
const productApi = createApiClient('http://localhost:8001/', true);
const cartApi = createApiClient('http://localhost:8002/', true);
const RSApi = createApiClient('http://localhost:8003/', true);

// Auth Service API calls
export const authService = {
    register: (userData) => authApi.post('/auth/register', userData),
    login: (credentials) => authApi.post('/auth/login', credentials),
};

// Products Service API calls
export const productsService = {
    getAllProducts: () => productApi.get('/products'),
    getProduct: (productId) => productApi.get(`/products/${productId}`),
    searchProducts: (query) => productApi.get(`/products/search?q=${query}`),
};

// Cart Service API calls
export const cartService = {
    getUserTransactions: (userId) => cartApi.get(`/cart/get_user_transactions/${userId}`),
    insertTransaction: (orderData) => cartApi.post('/cart/insert_user_transactions', orderData),
};

// Recommendation Service API calls
export const recommendationService = {
    getProductRecommendations: (productId) => RSApi.get(`/recommendations/${productId}`),
    searchSemanticProducts: (query) => RSApi.get(`/product_semantic_search?q=${query}`),
};
