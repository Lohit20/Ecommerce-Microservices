import { productsService, recommendationService } from './api';
import axios from 'axios';

// Maximum number of retries for transient network failures
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // milliseconds

/**
 * Service for handling product-related operations
 * Integrates with the Products microservice
 */
class ProductService {
  /**
   * Fetch all products from the backend
   * @returns {Promise} Promise object with products data
   */
  /**
   * Helper method to handle API errors consistently
   * @param {Error} error - The caught error
   * @param {string} operation - Description of the operation that failed
   * @returns {Error} Formatted error with user-friendly message
   */
  static _handleError(error, operation) {
    console.error(`Error ${operation}:`, error);
    
    // Provide detailed error information based on error type
    const errorMessage = error.response ? 
      `Server error: ${error.response.status} ${error.response.statusText}` : 
      error.request ? 
        `Network error: Unable to reach the service. Please check your connection or try again later.` : 
        `Error: ${error.message}`;
    
    return new Error(errorMessage);
  }

  /**
   * Helper method to retry failed requests
   * @param {Function} apiCall - The API call function to retry
   * @param {number} retries - Number of retries remaining
   * @returns {Promise} Promise with the API response
   */
  static async _retryApiCall(apiCall, retries = MAX_RETRIES) {
    try {
      return await apiCall();
    } catch (error) {
      // Only retry for network errors, not server errors
      if (retries > 0 && (!error.response || axios.isCancel(error))) {
        console.log(`Retrying API call, ${retries} attempts remaining`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this._retryApiCall(apiCall, retries - 1);
      }
      throw error;
    }
  }

  static async getAllProducts() {
    try {
      const response = await this._retryApiCall(() => productsService.getAllProducts());
      return response.data;
    } catch (error) {
      throw this._handleError(error, 'fetching products');
    }
  }

  /**
   * Fetch a single product by ID
   * @param {string} productId - The ID of the product to fetch
   * @returns {Promise} Promise object with product data
   */
  static async getProduct(productId) {
    try {
      const response = await this._retryApiCall(() => productsService.getProduct(productId));
      return response.data;
    } catch (error) {
      throw this._handleError(error, `fetching product ${productId}`);
    }
  }

  /**
   * Fetch products by category
   * @param {string} category - The category to filter by
   * @returns {Promise} Promise object with filtered products data
   */
  static async getProductsByCategory(category) {
    try {
      const response = await this._retryApiCall(() => productsService.getProductsByCategory(category));
      return response.data;
    } catch (error) {
      throw this._handleError(error, `fetching products in category ${category}`);
    }
  }

  /**
   * Search for products using the semantic search endpoint
   * @param {string} query - The search query
   * @returns {Promise} Promise object with search results
   */
  static async searchProducts(query) {
    try {
      const response = await this._retryApiCall(() => productsService.searchProducts(query));
      return response.data;
    } catch (error) {
      throw this._handleError(error, `searching products with query "${query}"`);
    }
  }

  /**
   * Get product recommendations based on a product ID
   * @param {string} productId - The ID of the product to get recommendations for
   * @returns {Promise} Promise object with recommended products
   */
  static async getRecommendations(productId) {
    try {
      // Using the correct recommendationService instead of productsService
      const response = await this._retryApiCall(() => recommendationService.getProductRecommendations(productId));
      return response.data;
    } catch (error) {
      throw this._handleError(error, `fetching recommendations for product ${productId}`);
    }
  }

  //////////////////////////////////////////////////////

  static async getHotPicks() {
    try {
      const response = await this._retryApiCall(() => productsService.getHotPicks());
      return response.data;
    } catch (error) {
      throw this._handleError(error, 'fetching products');
    }
  }

  static async getNewArrivals() {
    try {
      const response = await this._retryApiCall(() => productsService.getNewArrivals());
      return response.data;
    } catch (error) {
      throw this._handleError(error, 'fetching products');
    }
  }

  static async getBestSellers() {
    try {
      const response = await this._retryApiCall(() => productsService.getBestSellers());
      return response.data;
    } catch (error) {
      throw this._handleError(error, 'fetching products');
    }
  }

  static async getMensColthing() {
    try {
      const response = await this._retryApiCall(() => productsService.getMensColthing());
      return response.data;
    } catch (error) {
      throw this._handleError(error, 'fetching products');
    }
  }

  static async getWomensColthing() {
    try {
      const response = await this._retryApiCall(() => productsService.getWomensColthing());
      return response.data;
    } catch (error) {
      throw this._handleError(error, 'fetching products');
    }
  }

  static async getBoysColthing() {
    try {
      const response = await this._retryApiCall(() => productsService.getBoysColthing());
      return response.data;
    } catch (error) {
      throw this._handleError(error, 'fetching products');
    }
  }

  static async getGirlsColthing() {
    try {
      const response = await this._retryApiCall(() => productsService.getGirlsColthing());
      return response.data;
    } catch (error) {
      throw this._handleError(error, 'fetching products');
    }
  }

  static async getSale() {
    try {
      const response = await this._retryApiCall(() => productsService.getSale());
      return response.data;
    } catch (error) {
      throw this._handleError(error, 'fetching products');
    }
  }
}

export default ProductService;