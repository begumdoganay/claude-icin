const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const UserChallenge = sequelize.define('UserChallenge', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'user_id'
  },
  challengeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'challenges',
      key: 'id'
    },
    field: 'challenge_id'
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  target: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'expired'),
    defaultValue: 'active',
    allowNull: false
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  }
}, {
  tableName: 'user_challenges',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'challenge_id']
    }
  ]
});

module.exports = UserChallenge;