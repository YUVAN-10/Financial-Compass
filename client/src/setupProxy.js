const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'http://localhost:5001',
      ws: true,
    })
  );
  app.use(
    '/api/stock_news',
    createProxyMiddleware({
      target: 'https://financialmodelingprep.com',
      changeOrigin: true,
      pathRewrite: {
        '^/api/stock_news': '/api/v3/stock_news',
      },
    })
  );
  app.use(
    '/api/stock',
    createProxyMiddleware({
      target: 'https://www.alphavantage.co',
      changeOrigin: true,
      pathRewrite: {
        '^/api/stock': '', // remove /api/stock prefix
      },
    })
  );

  app.use(
    ['/api/auth', '/api/budgets', '/api/categories', '/api/recurring-transactions', '/api/transactions', '/api/reports', '/api/receipts', '/api/sms', '/api/investments', '/api/ai'],
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
    })
  );

  /*
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://financialmodelingprep.com',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api/v3'
      }
    })
  );
  */
};