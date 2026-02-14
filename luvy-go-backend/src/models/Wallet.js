const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'user_id',
    references: { model: 'users', key: 'id' }
  },
  totalBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'total_balance'
  },
  spendableBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'spendable_balance'
  },
  lockedBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'locked_balance'
  },
  lifetimeEarned: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'lifetime_earned'
  },
  lifetimeSpent: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'lifetime_spent'
  }
}, {
  tableName: 'wallets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Wallet;
