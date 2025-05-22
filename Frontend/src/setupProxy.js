const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy requests to the products service
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

  app.use(
    '/api/products/:id',
    createProxyMiddleware({
      target: 'http://localhost:8001',
      changeOrigin: true,
      pathRewrite: (path) => {
        const id = path.split('/').pop();
        return `/get_product/${id}`;
      },
    })
  );

  // Proxy requests to the recommendation service
  app.use(
    '/api/recommendations',
    createProxyMiddleware({
      target: 'http://localhost:8003',
      changeOrigin: true,
    })
  );

  // Proxy requests to the cart service
  app.use(
    '/api/cart',
    createProxyMiddleware({
      target: 'http://localhost:8002',
      changeOrigin: true,
    })
  );

  // Proxy requests to the auth service
  app.use(
    '/api/auth',
    createProxyMiddleware({
      target: 'http://localhost:8004',
      changeOrigin: true,
    })
  );
};