const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const marketService = require('./marketService');
const { sequelize } = require('../../config/database');

const SPENDING_LIMIT = 0.2;
const BURN_RATE = 0.005;

class WalletService {
  async createWallet(userId) {
    const wallet = await Wallet.create({ userId });
    return wallet;
  }

  async getOrCreateWallet(userId) {
    let wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
      wallet = await this.createWallet(userId);
    }
    return wallet;
  }

  async addLuvy(userId, amount, type, description, referenceType, referenceId) {
    return await sequelize.transaction(async (t) => {
      const wallet = await this.getOrCreateWallet(userId);
      
      const balanceBefore = parseFloat(wallet.totalBalance);
      const newTotal = balanceBefore + amount;
      
      const spendableAmount = amount * SPENDING_LIMIT;
      const lockedAmount = amount * (1 - SPENDING_LIMIT);
      
      wallet.totalBalance = newTotal;
      wallet.spendableBalance = parseFloat(wallet.spendableBalance) + spendableAmount;
      wallet.lockedBalance = parseFloat(wallet.lockedBalance) + lockedAmount;
      wallet.lifetimeEarned = parseFloat(wallet.lifetimeEarned) + amount;
      
      await wallet.save({ transaction: t });
      
      const transaction = await Transaction.create({
        userId,
        type,
        amount,
        balanceBefore,
        balanceAfter: newTotal,
        description,
        referenceType,
        referenceId,
        metadata: { spendableAmount, lockedAmount }
      }, { transaction: t });
      
      await marketService.updateMarketData({
        addSupply: amount,
        lockSupply: lockedAmount
      });
      
      return { wallet, transaction };
    });
  }

  async spendLuvy(userId, amount, description, referenceType, referenceId) {
    return await sequelize.transaction(async (t) => {
      const wallet = await Wallet.findOne({ where: { userId }, transaction: t });
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      if (parseFloat(wallet.spendableBalance) < amount) {
        throw new Error('Insufficient spendable balance');
      }
      
      const burnAmount = amount * BURN_RATE;
      const netSpend = amount - burnAmount;
      
      const balanceBefore = parseFloat(wallet.totalBalance);
      wallet.totalBalance = balanceBefore - amount;
      wallet.spendableBalance = parseFloat(wallet.spendableBalance) - amount;
      wallet.lifetimeSpent = parseFloat(wallet.lifetimeSpent) + amount;
      
      await wallet.save({ transaction: t });
      
      const transaction = await Transaction.create({
        userId,
        type: 'spend',
        amount: -amount,
        balanceBefore,
        balanceAfter: wallet.totalBalance,
        description,
        referenceType,
        referenceId,
        metadata: { burnAmount, netSpend }
      }, { transaction: t });
      
      await marketService.updateMarketData({
        burnSupply: burnAmount,
        addToPool: netSpend
      });
      
      return { wallet, transaction };
    });
  }

  async getWalletBalance(userId) {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      totalBalance: parseFloat(wallet.totalBalance),
      spendableBalance: parseFloat(wallet.spendableBalance),
      lockedBalance: parseFloat(wallet.lockedBalance),
      lifetimeEarned: parseFloat(wallet.lifetimeEarned),
      lifetimeSpent: parseFloat(wallet.lifetimeSpent)
    };
  }

  async getTransactionHistory(userId, limit = 50, offset = 0) {
    const transactions = await Transaction.findAll({
      where: { userId },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
    return transactions;
  }
}

module.exports = new WalletService();
