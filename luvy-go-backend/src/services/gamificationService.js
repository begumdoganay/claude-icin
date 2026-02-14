const { 
  UserLevel, 
  Achievement, 
  UserAchievement, 
  Challenge, 
  UserChallenge, 
  Referral, 
  Wallet, 
  Transaction 
} = require('../config/associations');
const { Op } = require('sequelize');

// Seviye eþikleri (totalLuvyEarned bazlý)
const LEVEL_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
  diamond: 10000
};

// XP hesaplama (her 1 LUVY = 10 XP)
const calculateXP = (luvyAmount) => {
  return Math.floor(luvyAmount * 10);
};

// Seviye hesaplama
const calculateLevel = (totalLuvyEarned) => {
  if (totalLuvyEarned >= LEVEL_THRESHOLDS.diamond) return 'diamond';
  if (totalLuvyEarned >= LEVEL_THRESHOLDS.platinum) return 'platinum';
  if (totalLuvyEarned >= LEVEL_THRESHOLDS.gold) return 'gold';
  if (totalLuvyEarned >= LEVEL_THRESHOLDS.silver) return 'silver';
  return 'bronze';
};

// Kullanýcý seviyesini güncelle
const updateUserLevel = async (userId, luvyEarned) => {
  try {
    let userLevel = await UserLevel.findOne({ where: { userId } });
    
    if (!userLevel) {
      userLevel = await UserLevel.create({
        userId,
        level: 'bronze',
        currentXP: 0,
        totalLuvyEarned: 0,
        receiptsSubmitted: 0
      });
    }
    
    // Güncellemeler
    const newTotalLuvy = parseFloat(userLevel.totalLuvyEarned) + luvyEarned;
    const newXP = calculateXP(luvyEarned);
    const newLevel = calculateLevel(newTotalLuvy);
    const leveledUp = newLevel !== userLevel.level;
    
    userLevel.totalLuvyEarned = newTotalLuvy;
    userLevel.currentXP += newXP;
    userLevel.receiptsSubmitted += 1;
    userLevel.level = newLevel;
    userLevel.lastActiveDate = new Date();
    
    await userLevel.save();
    
    return {
      leveledUp,
      oldLevel: userLevel.level,
      newLevel,
      currentXP: userLevel.currentXP,
      totalLuvyEarned: newTotalLuvy
    };
  } catch (error) {
    console.error('Update user level error:', error);
    throw error;
  }
};

// Achievement kontrolü ve unlock
const checkAndUnlockAchievements = async (userId) => {
  try {
    const userLevel = await UserLevel.findOne({ where: { userId } });
    if (!userLevel) return [];
    
    const unlockedAchievements = [];
    const allAchievements = await Achievement.findAll({ where: { isActive: true } });
    
    for (const achievement of allAchievements) {
      // Zaten unlock edilmiþ mi?
      const existing = await UserAchievement.findOne({
        where: { userId, achievementId: achievement.id }
      });
      
      if (existing) continue;
      
      // Koþul kontrolü
      const req = achievement.requirement;
      let unlocked = false;
      
      if (req.type === 'receipts' && userLevel.receiptsSubmitted >= req.value) {
        unlocked = true;
      } else if (req.type === 'luvy' && parseFloat(userLevel.totalLuvyEarned) >= req.value) {
        unlocked = true;
      } else if (req.type === 'streak' && userLevel.consecutiveDays >= req.value) {
        unlocked = true;
      }
      
      if (unlocked) {
        await UserAchievement.create({
          userId,
          achievementId: achievement.id,
          progress: 100,
          unlockedAt: new Date()
        });
        
        // Ödül ver
        if (achievement.reward && achievement.reward.luvy) {
          const wallet = await Wallet.findOne({ where: { userId } });
          if (wallet) {
            wallet.balance += parseFloat(achievement.reward.luvy);
            await wallet.save();
            
            await Transaction.create({
              userId,
              type: 'bonus',
              amount: achievement.reward.luvy,
              spendableAmount: achievement.reward.luvy,
              lockedAmount: 0,
              description: `Achievement unlocked: ${achievement.name}`,
              referenceType: 'achievement',
              referenceId: achievement.id
            });
          }
        }
        
        unlockedAchievements.push(achievement);
      }
    }
    
    return unlockedAchievements;
  } catch (error) {
    console.error('Check achievements error:', error);
    throw error;
  }
};

// Challenge ilerleme güncelleme
const updateChallengeProgress = async (userId, challengeType, value = 1) => {
  try {
    const activeChallenges = await Challenge.findAll({
      where: {
        isActive: true,
        type: challengeType,
        startDate: { [Op.lte]: new Date() },
        endDate: { [Op.gte]: new Date() }
      }
    });
    
    const completedChallenges = [];
    
    for (const challenge of activeChallenges) {
      let userChallenge = await UserChallenge.findOne({
        where: { userId, challengeId: challenge.id }
      });
      
      if (!userChallenge) {
        userChallenge = await UserChallenge.create({
          userId,
          challengeId: challenge.id,
          progress: 0,
          target: challenge.requirement.value,
          status: 'active'
        });
      }
      
      if (userChallenge.status === 'active') {
        userChallenge.progress += value;
        
        if (userChallenge.progress >= userChallenge.target) {
          userChallenge.status = 'completed';
          userChallenge.completedAt = new Date();
          
          // Ödül ver
          if (challenge.reward && challenge.reward.luvy) {
            const wallet = await Wallet.findOne({ where: { userId } });
            if (wallet) {
              wallet.balance += parseFloat(challenge.reward.luvy);
              await wallet.save();
              
              await Transaction.create({
                userId,
                type: 'bonus',
                amount: challenge.reward.luvy,
                spendableAmount: challenge.reward.luvy,
                lockedAmount: 0,
                description: `Challenge completed: ${challenge.name}`,
                referenceType: 'challenge',
                referenceId: challenge.id
              });
            }
          }
          
          completedChallenges.push(challenge);
        }
        
        await userChallenge.save();
      }
    }
    
    return completedChallenges;
  } catch (error) {
    console.error('Update challenge progress error:', error);
    throw error;
  }
};

// Referral kodu oluþtur
const generateReferralCode = (userId) => {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `LUVY${randomPart}`;
};

// Referral oluþtur
const createReferral = async (userId) => {
  try {
    const referralCode = generateReferralCode(userId);
    
    const referral = await Referral.create({
      referrerId: userId,
      referralCode,
      status: 'pending',
      referrerReward: 50, // 50 LUVY bonus
      referredReward: 25  // 25 LUVY bonus
    });
    
    return referral;
  } catch (error) {
    console.error('Create referral error:', error);
    throw error;
  }
};

// Referral tamamla (yeni kullanýcý kayýt olduðunda)
const completeReferral = async (referralCode, newUserId) => {
  try {
    const referral = await Referral.findOne({
      where: { referralCode, status: 'pending' }
    });
    
    if (!referral) return null;
    
    referral.referredUserId = newUserId;
    referral.status = 'completed';
    referral.completedAt = new Date();
    await referral.save();
    
    // Referrer'a bonus ver
    const referrerWallet = await Wallet.findOne({ where: { userId: referral.referrerId } });
    if (referrerWallet) {
      referrerWallet.balance += parseFloat(referral.referrerReward);
      await referrerWallet.save();
      
      await Transaction.create({
        userId: referral.referrerId,
        type: 'bonus',
        amount: referral.referrerReward,
        spendableAmount: referral.referrerReward,
        lockedAmount: 0,
        description: 'Referral bonus - Friend joined',
        referenceType: 'referral',
        referenceId: referral.id
      });
    }
    
    // Yeni kullanýcýya bonus ver
    const newUserWallet = await Wallet.findOne({ where: { userId: newUserId } });
    if (!newUserWallet) {
      await Wallet.create({
        userId: newUserId,
        balance: parseFloat(referral.referredReward),
        lockedBalance: 0
      });
    } else {
      newUserWallet.balance += parseFloat(referral.referredReward);
      await newUserWallet.save();
    }
    
    await Transaction.create({
      userId: newUserId,
      type: 'bonus',
      amount: referral.referredReward,
      spendableAmount: referral.referredReward,
      lockedAmount: 0,
      description: 'Welcome bonus - Referral',
      referenceType: 'referral',
      referenceId: referral.id
    });
    
    return referral;
  } catch (error) {
    console.error('Complete referral error:', error);
    throw error;
  }
};

module.exports = {
  LEVEL_THRESHOLDS,
  calculateXP,
  calculateLevel,
  updateUserLevel,
  checkAndUnlockAchievements,
  updateChallengeProgress,
  generateReferralCode,
  createReferral,
  completeReferral
};