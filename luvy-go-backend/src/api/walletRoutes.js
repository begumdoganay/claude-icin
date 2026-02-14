const express = require('express');
const router = express.Router();
const walletService = require('../services/walletService');

router.get('/balance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const balance = await walletService.getWalletBalance(userId);
    
    res.json({
      success: true,
      data: { balance }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance'
    });
  }
});

router.get('/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const transactions = await walletService.getTransactionHistory(userId, limit, offset);
    
    res.json({
      success: true,
      data: {
        transactions,
        count: transactions.length
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { userId, amount, description } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    const result = await walletService.addLuvy(
      userId,
      parseFloat(amount),
      'bonus',
      description || 'Manual LUVY addition',
      'manual',
      null
    );
    
    res.status(201).json({
      success: true,
      message: 'LUVY added successfully',
      data: {
        wallet: result.wallet,
        transaction: result.transaction
      }
    });
  } catch (error) {
    console.error('Add LUVY error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add LUVY'
    });
  }
});


// Auth middleware'i import et
const { authenticateToken } = require('../middleware/auth');

// Güvenli endpoint: Kendi bakiyeni gör
router.get('/my-balance', authenticateToken, async (req, res) => {
  try {
    const balance = await walletService.getWalletBalance(req.user.id);
    
    res.json({
      success: true,
      data: { balance }
    });
  } catch (error) {
    console.error('Get my balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance'
    });
  }
});

// Güvenli endpoint: Kendi iþlemlerini gör
router.get('/my-transactions', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const transactions = await walletService.getTransactionHistory(req.user.id, limit, offset);
    
    res.json({
      success: true,
      data: {
        transactions,
        count: transactions.length
      }
    });
  } catch (error) {
    console.error('Get my transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
});

module.exports = router;
