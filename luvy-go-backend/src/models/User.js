const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  phoneNumber: { type: DataTypes.STRING(20), unique: true, allowNull: false, field: 'phone_number' },
  email: { type: DataTypes.STRING(255), unique: true },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  firstName: { type: DataTypes.STRING(100), field: 'first_name' },
  lastName: { type: DataTypes.STRING(100), field: 'last_name' }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = User;
