const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  User, 
  UserLevel, 
  Achievement, 
  UserAchievement, 
  Challenge, 
  UserChallenge, 
  Referral 
} = require('../config/associations');
const { createReferral, completeReferral } = require('../services/gamificationService');
const { Op } = require('sequelize');

// Kullanýcýnýn seviye bilgisi
router.get('/level', authenticateToken, async (req, res) => {
  try {
    let userLevel = await UserLevel.findOne({ 
      where: { userId: req.user.id } 
    });
    
    if (!userLevel) {
      userLevel = await UserLevel.create({
        userId: req.user.id,
        level: 'bronze',
        currentXP: 0,
        totalLuvyEarned: 0,
        receiptsSubmitted: 0
      });
    }
    
    res.json({
      success: true,
      data: { userLevel }
    });
  } catch (error) {
    console.error('Get user level error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user level'
    });
  }
});

// Kullanýcýnýn achievement'larý
router.get('/achievements', authenticateToken, async (req, res) => {
  try {
    const userAchievements = await UserAchievement.findAll({
      where: { userId: req.user.id },
      include: [{ 
        model: Achievement,
        attributes: ['id', 'code', 'name', 'description', 'category', 'icon', 'reward']
      }],
      order: [['unlocked_at', 'DESC']]
    });
    
    const allAchievements = await Achievement.findAll({
      where: { isActive: true }
    });
    
    const unlockedIds = userAchievements.map(ua => ua.achievementId);
    const lockedAchievements = allAchievements.filter(a => !unlockedIds.includes(a.id));
    
    res.json({
      success: true,
      data: {
        unlocked: userAchievements,
        locked: lockedAchievements,
        stats: {
          total: allAchievements.length,
          unlocked: userAchievements.length,
          locked: lockedAchievements.length
        }
      }
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievements'
    });
  }
});

// Aktif challenge'lar
router.get('/challenges', authenticateToken, async (req, res) => {
  try {
    const activeChallenges = await Challenge.findAll({
      where: {
        isActive: true,
        startDate: { [Op.lte]: new Date() },
        endDate: { [Op.gte]: new Date() }
      }
    });
    
    const userChallenges = await UserChallenge.findAll({
      where: { userId: req.user.id },
      include: [{ 
        model: Challenge,
        attributes: ['id', 'code', 'name', 'description', 'type', 'category', 'reward', 'endDate']
      }]
    });
    
    res.json({
      success: true,
      data: {
        active: activeChallenges,
        user: userChallenges
      }
    });
  } catch (error) {
    console.error('Get challenges error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch challenges'
    });
  }
});

// Referral kodu oluþtur
router.post('/referral', authenticateToken, async (req, res) => {
  try {
    // Kullanýcýnýn zaten bir referral kodu var mý?
    const existing = await Referral.findOne({
      where: { referrerId: req.user.id }
    });
    
    if (existing) {
      return res.json({
        success: true,
        data: { referral: existing }
      });
    }
    
    const referral = await createReferral(req.user.id);
    
    res.json({
      success: true,
      message: 'Referral code created',
      data: { referral }
    });
  } catch (error) {
    console.error('Create referral error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create referral code'
    });
  }
});

// Kullanýcýnýn referral'larý
router.get('/referrals', authenticateToken, async (req, res) => {
  try {
    const referrals = await Referral.findAll({
      where: { referrerId: req.user.id },
      include: [
        { 
          model: User, 
          as: 'ReferredUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    const stats = {
      total: referrals.length,
      completed: referrals.filter(r => r.status === 'completed').length,
      pending: referrals.filter(r => r.status === 'pending').length,
      totalRewards: referrals.reduce((sum, r) => sum + parseFloat(r.referrerReward || 0), 0)
    };
    
    res.json({
      success: true,
      data: {
        referrals,
        stats
      }
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch referrals'
    });
  }
});

// Referral kodu kontrolü (kayýt sýrasýnda kullanýlýr)
router.get('/referral/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const referral = await Referral.findOne({
      where: { 
        referralCode: code,
        status: 'pending'
      },
      include: [
        { 
          model: User, 
          as: 'Referrer',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!referral) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired referral code'
      });
    }
    
    res.json({
      success: true,
      data: { 
        referral: {
          code: referral.referralCode,
          referrer: referral.Referrer,
          reward: referral.referredReward
        }
      }
    });
  } catch (error) {
    console.error('Check referral error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check referral code'
    });
  }
});

// Leaderboard (top 100)
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const { period = 'all-time', limit = 100 } = req.query;
    
    const leaderboard = await UserLevel.findAll({
      limit: parseInt(limit),
      order: [['total_luvy_earned', 'DESC']],
      include: [
        { 
          model: User, 
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    // Kullanýcýnýn kendi sýralamasý
    const allUsers = await UserLevel.findAll({
      order: [['total_luvy_earned', 'DESC']]
    });
    
    const userRank = allUsers.findIndex(ul => ul.userId === req.user.id) + 1;
    const userLevel = allUsers.find(ul => ul.userId === req.user.id);
    
    res.json({
      success: true,
      data: {
        leaderboard,
        userRank,
        userStats: userLevel
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard'
    });
  }
});

module.exports = router;