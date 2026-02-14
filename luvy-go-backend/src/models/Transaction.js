const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: { model: 'users', key: 'id' }
  },
  type: {
    type: DataTypes.ENUM('earn', 'spend', 'refund', 'bonus', 'penalty'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  balanceBefore: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'balance_before'
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'balance_after'
  },
  description: {
    type: DataTypes.STRING(500)
  },
  referenceType: {
    type: DataTypes.STRING(50),
    field: 'reference_type'
  },
  referenceId: {
    type: DataTypes.UUID,
    field: 'reference_id'
  },
  metadata: {
    type: DataTypes.JSONB
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Transaction;
