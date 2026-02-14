const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const MarketData = sequelize.define('MarketData', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  totalPoolEur: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 100000.00,
    field: 'total_pool_eur'
  },
  circulatingSupply: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'circulating_supply'
  },
  tokenValue: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false,
    field: 'token_value'
  },
  totalSupply: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'total_supply'
  },
  lockedSupply: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'locked_supply'
  },
  burnedSupply: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'burned_supply'
  },
  volume24h: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'volume_24h'
  },
  transactions24h: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'transactions_24h'
  },
  marketCap: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'market_cap'
  },
  priceChangePercent24h: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0,
    field: 'price_change_percent_24h'
  }
}, {
  tableName: 'market_data',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = MarketData;
