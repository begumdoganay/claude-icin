const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const MarketHistory = sequelize.define('MarketHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tokenValue: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false,
    field: 'token_value'
  },
  circulatingSupply: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'circulating_supply'
  },
  marketCap: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'market_cap'
  },
  volume: {
    type: DataTypes.DECIMAL(15, 2)
  },
  transactions: {
    type: DataTypes.INTEGER
  },
  interval: {
    type: DataTypes.ENUM('minute', 'hour', 'day', 'week'),
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'market_history',
  timestamps: false,
  indexes: [
    { fields: ['timestamp'] },
    { fields: ['interval'] }
  ]
});

module.exports = MarketHistory;
