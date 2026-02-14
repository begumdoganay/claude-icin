const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const UserLevel = sequelize.define('UserLevel', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'user_id'
  },
  level: {
    type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond'),
    defaultValue: 'bronze',
    allowNull: false
  },
  currentXP: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    field: 'current_xp'
  },
  totalLuvyEarned: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false,
    field: 'total_luvy_earned'
  },
  receiptsSubmitted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    field: 'receipts_submitted'
  },
  consecutiveDays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    field: 'consecutive_days'
  },
  lastActiveDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_active_date'
  }
}, {
  tableName: 'user_levels',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = UserLevel;