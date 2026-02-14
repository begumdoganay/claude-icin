const User = require('../models/User');
const Merchant = require('../models/Merchant');
const Receipt = require('../models/Receipt');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const UserLevel = require('../models/UserLevel');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const Challenge = require('../models/Challenge');
const UserChallenge = require('../models/UserChallenge');
const Referral = require('../models/Referral');

// Receipt iliþkileri
Receipt.belongsTo(User, { foreignKey: 'userId' });
Receipt.belongsTo(Merchant, { foreignKey: 'merchantId' });

User.hasMany(Receipt, { foreignKey: 'userId' });
Merchant.hasMany(Receipt, { foreignKey: 'merchantId' });

// Wallet iliþkileri
Wallet.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(Wallet, { foreignKey: 'userId' });

// Transaction iliþkileri
Transaction.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Transaction, { foreignKey: 'userId' });

console.log('Model associations initialized');

module.exports = {
  User,
  Merchant,
  Receipt,
  Wallet,
  Transaction,
  UserLevel,
  Achievement,
  UserAchievement,
  Challenge,
  UserChallenge,
  Referral
};
  // Gamification associations
  User.hasOne(UserLevel, { foreignKey: 'userId' });
  UserLevel.belongsTo(User, { foreignKey: 'userId' });

  User.belongsToMany(Achievement, { 
    through: UserAchievement, 
    foreignKey: 'userId',
    otherKey: 'achievementId'
  });
  Achievement.belongsToMany(User, { 
    through: UserAchievement, 
    foreignKey: 'achievementId',
    otherKey: 'userId'
  });
  UserAchievement.belongsTo(User, { foreignKey: 'userId' });
  UserAchievement.belongsTo(Achievement, { foreignKey: 'achievementId' });

  User.belongsToMany(Challenge, { 
    through: UserChallenge, 
    foreignKey: 'userId',
    otherKey: 'challengeId'
  });
  Challenge.belongsToMany(User, { 
    through: UserChallenge, 
    foreignKey: 'challengeId',
    otherKey: 'userId'
  });
  UserChallenge.belongsTo(User, { foreignKey: 'userId' });
  UserChallenge.belongsTo(Challenge, { foreignKey: 'challengeId' });

  User.hasMany(Referral, { foreignKey: 'referrerId', as: 'SentReferrals' });
  User.hasMany(Referral, { foreignKey: 'referredUserId', as: 'ReceivedReferrals' });
  Referral.belongsTo(User, { foreignKey: 'referrerId', as: 'Referrer' });
  Referral.belongsTo(User, { foreignKey: 'referredUserId', as: 'ReferredUser' });
