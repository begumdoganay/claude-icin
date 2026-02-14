const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Referral = sequelize.define('Referral', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  referrerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'referrer_id'
  },
  referredUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'referred_user_id'
  },
  referralCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'referral_code'
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'expired'),
    defaultValue: 'pending',
    allowNull: false
  },
  referrerReward: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'referrer_reward'
  },
  referredReward: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'referred_reward'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  }
}, {
  tableName: 'referrals',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['referrer_id']
    },
    {
      fields: ['referral_code']
    }
  ]
});

module.exports = Referral;