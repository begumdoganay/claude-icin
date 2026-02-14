const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Receipt = sequelize.define('Receipt', {
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
  merchantId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'merchant_id',
    references: { model: 'merchants', key: 'id' }
  },
  receiptNumber: {
    type: DataTypes.STRING(100),
    field: 'receipt_number'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_amount'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },
  receiptDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'receipt_date'
  },
  imagePath: {
    type: DataTypes.STRING(500),
    field: 'image_path'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  luvyEarned: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'luvy_earned'
  },
  isPfand: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_pfand'
  },
  pfandAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'pfand_amount'
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'receipts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Receipt;
