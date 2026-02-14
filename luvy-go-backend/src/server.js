const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Receipt routes
try {
  const receiptRoutes = require('./api/receiptRoutes');
  app.use('/api/receipts', receiptRoutes);
  console.log('✅ Receipt routes loaded');
} catch (err) {
  console.log('❌ Receipt routes failed:', err.message);
}

// Mock wallet endpoint
app.get('/api/wallet/balance', (req, res) => {
  res.json({
    success: true,
    balance: 1247,
    user_id: 1
  });
});

// Mock receipts endpoint
app.get('/api/receipts/my-receipts', (req, res) => {
  res.json({
    success: true,
    receipts: [
      { id: 1, merchant: 'Migros', amount: 128.90, tokens: 13, date: '2026-01-30' },
      { id: 2, merchant: 'Starbucks', amount: 45.50, tokens: 5, date: '2026-01-29' }
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Server running on http://localhost:' + PORT);
  console.log('📊 Health check: http://localhost:' + PORT + '/health');
});

module.exports = app;
