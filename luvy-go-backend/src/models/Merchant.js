const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Merchant = sequelize.define('Merchant', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessName: { type: DataTypes.STRING(255), allowNull: false, field: 'business_name' },
  email: { type: DataTypes.STRING(255), unique: true, allowNull: false },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' }
}, {
  tableName: 'merchants',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Merchant;
