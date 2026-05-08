import { productsService, recommendationService } from './api';

class ProductService {
  static async getAllProducts() {
    const res = await productsService.getAllProducts();
    return res.data;
  }

  static async getProduct(productId) {
    const res = await productsService.getProduct(productId);
    return res.data;
  }

  static async getProductsByCategory(category) {
    const all = await this.getAllProducts();
    return all.filter((p) => p.main_category?.toLowerCase() === category.toLowerCase());
  }

  static async searchProducts(query) {
    const res = await recommendationService.searchProducts(query);
    return res.data;
  }

  static async getRecommendations() {
    const res = await recommendationService.getRecommendations();
    return res.data;
  }
}

export default ProductService;
