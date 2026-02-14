const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/admin');
const { User, Merchant, Receipt, Wallet, Transaction } = require('../config/associations');
const { Op } = require('sequelize');

// Tüm makbuzlarý listele (filtreleme ile)
router.get('/receipts', requireAdmin, async (req, res) => {
  try {
    const { status, userId, merchantId, limit = 50, offset = 0 } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (merchantId) where.merchantId = merchantId;
    
    const receipts = await Receipt.findAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        { model: User, attributes: ['id', 'email', 'firstName', 'lastName'] },
        { model: Merchant, attributes: ['id', 'businessName', 'email'] }
      ]
    });
    
    const total = await Receipt.count({ where });
    
    res.json({
      success: true,
      data: {
        receipts,
        count: receipts.length,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Admin get receipts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipts'
    });
  }
});

// Tüm kullanýcýlarý listele
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const users = await User.findAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['passwordHash'] }
    });
    
    const total = await User.count({ where });
    
    res.json({
      success: true,
      data: {
        users,
        count: users.length,
        total
      }
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Tüm merchant'larý listele
router.get('/merchants', requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { businessName: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const merchants = await Merchant.findAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['passwordHash'] }
    });
    
    const total = await Merchant.count({ where });
    
    res.json({
      success: true,
      data: {
        merchants,
        count: merchants.length,
        total
      }
    });
  } catch (error) {
    console.error('Admin get merchants error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch merchants'
    });
  }
});

// Platform istatistikleri
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalMerchants = await Merchant.count();
    const totalReceipts = await Receipt.count();
    const pendingReceipts = await Receipt.count({ where: { status: 'pending' } });
    const approvedReceipts = await Receipt.count({ where: { status: 'approved' } });
    const rejectedReceipts = await Receipt.count({ where: { status: 'rejected' } });
    
    const totalLuvyEarned = await Receipt.sum('luvyEarned', { 
      where: { status: 'approved' } 
    }) || 0;
    
    const totalSpent = await Receipt.sum('totalAmount', { 
      where: { status: 'approved' } 
    }) || 0;
    
    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers
        },
        merchants: {
          total: totalMerchants
        },
        receipts: {
          total: totalReceipts,
          pending: pendingReceipts,
          approved: approvedReceipts,
          rejected: rejectedReceipts
        },
        economy: {
          totalLuvyEarned: parseFloat(totalLuvyEarned).toFixed(2),
          totalEurSpent: parseFloat(totalSpent).toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error('Admin get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// Makbuzu reddet
router.post('/receipts/:receiptId/reject', requireAdmin, async (req, res) => {
  try {
    const { receiptId } = req.params;
    const { reason } = req.body;
    
    const receipt = await Receipt.findByPk(receiptId);
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }
    
    if (receipt.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Receipt already processed'
      });
    }
    
    receipt.status = 'rejected';
    receipt.notes = reason || 'Rejected by admin';
    await receipt.save();
    
    res.json({
      success: true,
      message: 'Receipt rejected successfully',
      data: { receipt }
    });
  } catch (error) {
    console.error('Admin reject receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject receipt'
    });
  }
});

module.exports = router;
// Makbuzu onayla ve LUVY token'larý wallet'a ekle
router.post('/receipts/:receiptId/approve', requireAdmin, async (req, res) => {
  try {
    const { receiptId } = req.params;
    const { notes } = req.body;

    const receipt = await Receipt.findByPk(receiptId);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }

    if (receipt.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Receipt already processed'
      });
    }

    // Receipt'i onayla
    receipt.status = 'approved';
    receipt.notes = notes || 'Approved by admin';
    await receipt.save();

    // Wallet'ý bul veya oluþtur
    let wallet = await Wallet.findOne({ where: { userId: receipt.userId } });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: receipt.userId,
        balance: 0,
        lockedBalance: 0
      });
    }

    // LUVY token'larý ekle (20% spendable, 80% locked)
    const spendableAmount = receipt.luvyEarned * 0.2;
    const lockedAmount = receipt.luvyEarned * 0.8;

    wallet.balance += spendableAmount;
    wallet.lockedBalance += lockedAmount;
    await wallet.save();

    // Transaction kaydet
    await Transaction.create({
      userId: receipt.userId,
      type: 'earn',
      amount: receipt.luvyEarned,
      spendableAmount,
      lockedAmount,
      description: `Receipt approved - ${receipt.merchantId}`,
      referenceId: receipt.id,
      referenceType: 'receipt'
    });

    res.json({
      success: true,
      message: 'Receipt approved successfully',
      data: {
        receipt,
        wallet: {
          balance: wallet.balance,
          lockedBalance: wallet.lockedBalance,
          totalBalance: wallet.balance + wallet.lockedBalance
        }
      }
    });
  } catch (error) {
    console.error('Admin approve receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve receipt'
    });
  }
});

module.exports = router;

// Makbuzu onayla ve LUVY token'larý wallet'a ekle
router.post('/receipts/:receiptId/approve', requireAdmin, async (req, res) => {
  try {
    const { receiptId } = req.params;
    const { notes } = req.body;

    const receipt = await Receipt.findByPk(receiptId);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }

    if (receipt.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Receipt already processed'
      });
    }

    // Receipt'i onayla
    receipt.status = 'approved';
    receipt.notes = notes || 'Approved by admin';
    await receipt.save();

    // Wallet'ý bul veya oluþtur
    let wallet = await Wallet.findOne({ where: { userId: receipt.userId } });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: receipt.userId,
        balance: 0,
        lockedBalance: 0
      });
    }

    // LUVY token'larý ekle (20% spendable, 80% locked)
    const spendableAmount = receipt.luvyEarned * 0.2;
    const lockedAmount = receipt.luvyEarned * 0.8;

    wallet.balance += spendableAmount;
    wallet.lockedBalance += lockedAmount;
    await wallet.save();

    // Transaction kaydet
    await Transaction.create({
      userId: receipt.userId,
      type: 'earn',
      amount: receipt.luvyEarned,
      spendableAmount,
      lockedAmount,
      description: `Receipt approved - ${receipt.merchantId}`,
      referenceId: receipt.id,
      referenceType: 'receipt'
    });

    res.json({
      success: true,
      message: 'Receipt approved successfully',
      data: {
        receipt,
        wallet: {
          balance: wallet.balance,
          lockedBalance: wallet.lockedBalance,
          totalBalance: wallet.balance + wallet.lockedBalance
        }
      }
    });
  } catch (error) {
    console.error('Admin approve receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve receipt'
    });
  }
});


// Makbuz detayý
router.get('/receipts/:receiptId', requireAdmin, async (req, res) => {
  try {
    const { receiptId } = req.params;
    
    const receipt = await Receipt.findByPk(receiptId, {
      include: [
        { model: User, attributes: ['id', 'email', 'firstName', 'lastName'] },
        { model: Merchant, attributes: ['id', 'businessName', 'email'] }
      ]
    });
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }
    
    res.json({
      success: true,
      data: { receipt }
    });
  } catch (error) {
    console.error('Admin get receipt detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt details'
    });
  }
});

// Kullanýcý detayý
router.get('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['passwordHash'] }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const wallet = await Wallet.findOne({ where: { userId } });
    const receipts = await Receipt.findAll({
      where: { userId },
      attributes: ['status', 'luvyEarned', 'totalAmount']
    });
    
    const stats = {
      totalReceipts: receipts.length,
      approvedReceipts: receipts.filter(r => r.status === 'approved').length,
      pendingReceipts: receipts.filter(r => r.status === 'pending').length,
      rejectedReceipts: receipts.filter(r => r.status === 'rejected').length,
      totalSpent: receipts.reduce((sum, r) => sum + parseFloat(r.totalAmount || 0), 0),
      totalEarned: receipts.reduce((sum, r) => sum + parseFloat(r.luvyEarned || 0), 0)
    };
    
    res.json({
      success: true,
      data: { user, wallet, stats }
    });
  } catch (error) {
    console.error('Admin get user detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user details'
    });
  }
});

// Merchant detayý
router.get('/merchants/:merchantId', requireAdmin, async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    const merchant = await Merchant.findByPk(merchantId, {
      attributes: { exclude: ['passwordHash'] }
    });
    
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: 'Merchant not found'
      });
    }
    
    const receipts = await Receipt.findAll({
      where: { merchantId },
      attributes: ['status', 'luvyEarned', 'totalAmount']
    });
    
    const stats = {
      totalReceipts: receipts.length,
      approvedReceipts: receipts.filter(r => r.status === 'approved').length,
      pendingReceipts: receipts.filter(r => r.status === 'pending').length,
      rejectedReceipts: receipts.filter(r => r.status === 'rejected').length,
      totalRevenue: receipts.reduce((sum, r) => sum + parseFloat(r.totalAmount || 0), 0),
      totalLuvyGiven: receipts.reduce((sum, r) => sum + parseFloat(r.luvyEarned || 0), 0)
    };
    
    res.json({
      success: true,
      data: { merchant, stats }
    });
  } catch (error) {
    console.error('Admin get merchant detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch merchant details'
    });
  }
});

// Kullanýcýyý engelle
router.put('/users/:userId/block', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    user.isBlocked = true;
    user.blockReason = reason || 'Blocked by admin';
    await user.save();
    
    res.json({
      success: true,
      message: 'User blocked successfully',
      data: { user: { id: user.id, email: user.email, isBlocked: user.isBlocked } }
    });
  } catch (error) {
    console.error('Admin block user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to block user'
    });
  }
});

// Tüm transaction'larý listele
router.get('/transactions', requireAdmin, async (req, res) => {
  try {
    const { userId, type, limit = 50, offset = 0 } = req.query;
    
    const where = {};
    if (userId) where.userId = userId;
    if (type) where.type = type;
    
    const transactions = await Transaction.findAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        { model: User, attributes: ['id', 'email', 'firstName', 'lastName'] }
      ]
    });
    
    const total = await Transaction.count({ where });
    
    res.json({
      success: true,
      data: {
        transactions,
        count: transactions.length,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Admin get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
});

// Sistem saðlýk kontrolü
router.get('/health', requireAdmin, async (req, res) => {
  try {
    const dbStatus = await User.sequelize.authenticate()
      .then(() => 'healthy')
      .catch(() => 'unhealthy');
    
    res.json({
      success: true,
      data: {
        status: 'running',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        uptime: process.uptime()
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

module.exports = router;
