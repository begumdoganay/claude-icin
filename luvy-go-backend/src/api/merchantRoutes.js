const express = require('express');
const { validateMerchantRegister, validateLogin } = require('../middleware/validation');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { User, Merchant, Receipt } = require('../config/associations');
const { Op } = require('sequelize');

// Merchant middleware - sadece merchant'larýn eriþmesi için
const requireMerchant = async (req, res, next) => {
  try {
    // Token'dan gelen user ID ile merchant'ý bul
    const merchant = await Merchant.findOne({ where: { email: req.user.email } });
    
    if (!merchant) {
      return res.status(403).json({
        success: false,
        error: 'Merchant access required'
      });
    }
    
    req.merchant = merchant;
    next();
  } catch (error) {
    console.error('Merchant middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization failed'
    });
  }
};

// Merchant'ýn kendi makbuzlarýný listele
router.get('/my-receipts', authenticateToken, requireMerchant, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    const where = { merchantId: req.merchant.id };
    if (status) where.status = status;
    
    const receipts = await Receipt.findAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        { model: User, attributes: ['id', 'email', 'firstName', 'lastName'] }
      ]
    });
    
    const total = await Receipt.count({ where });
    
    res.json({
      success: true,
      data: {
        receipts,
        count: receipts.length,
        total
      }
    });
  } catch (error) {
    console.error('Merchant get receipts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipts'
    });
  }
});

// Merchant istatistikleri
router.get('/my-stats', authenticateToken, requireMerchant, async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    
    const totalReceipts = await Receipt.count({ 
      where: { merchantId } 
    });
    
    const pendingReceipts = await Receipt.count({ 
      where: { merchantId, status: 'pending' } 
    });
    
    const approvedReceipts = await Receipt.count({ 
      where: { merchantId, status: 'approved' } 
    });
    
    const totalRevenue = await Receipt.sum('totalAmount', { 
      where: { merchantId, status: 'approved' } 
    }) || 0;
    
    const totalLuvyDistributed = await Receipt.sum('luvyEarned', { 
      where: { merchantId, status: 'approved' } 
    }) || 0;
    
    // Unique müþteri sayýsý
    const uniqueCustomers = await Receipt.count({
      where: { merchantId, status: 'approved' },
      distinct: true,
      col: 'userId'
    });
    
    res.json({
      success: true,
      data: {
        receipts: {
          total: totalReceipts,
          pending: pendingReceipts,
          approved: approvedReceipts
        },
        revenue: {
          total: parseFloat(totalRevenue).toFixed(2),
          currency: 'EUR'
        },
        luvy: {
          totalDistributed: parseFloat(totalLuvyDistributed).toFixed(2)
        },
        customers: {
          unique: uniqueCustomers
        }
      }
    });
  } catch (error) {
    console.error('Merchant get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// Merchant'ýn müþteri listesi (en çok harcama yapanlar)
router.get('/top-customers', authenticateToken, requireMerchant, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const merchantId = req.merchant.id;
    
    const topCustomers = await Receipt.findAll({
      where: { merchantId, status: 'approved' },
      attributes: [
        'userId',
        [sequelize.fn('COUNT', sequelize.col('Receipt.id')), 'receiptCount'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalSpent'],
        [sequelize.fn('SUM', sequelize.col('luvyEarned')), 'totalLuvyEarned']
      ],
      include: [
        { model: User, attributes: ['email', 'firstName', 'lastName'] }
      ],
      group: ['userId', 'User.id'],
      order: [[sequelize.fn('SUM', sequelize.col('totalAmount')), 'DESC']],
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: {
        customers: topCustomers
      }
    });
  } catch (error) {
    console.error('Merchant get top customers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top customers'
    });
  }
});

// Merchant profil bilgisi
router.get('/profile', authenticateToken, requireMerchant, async (req, res) => {
  try {
    const merchant = await Merchant.findByPk(req.merchant.id, {
      attributes: { exclude: ['passwordHash'] }
    });
    
    res.json({
      success: true,
      data: { merchant }
    });
  } catch (error) {
    console.error('Merchant get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

module.exports = router;