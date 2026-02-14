const Receipt = require('../models/Receipt');
const walletService = require('./walletService');

class ReceiptService {
  calculateLuvyReward(amount, isPfand = false) {
    const baseMultiplier = 2;
    const pfandBonus = isPfand ? 1.1 : 1;
    return (amount * baseMultiplier * pfandBonus).toFixed(2);
  }

  async createReceipt(data) {
    const { userId, merchantId, totalAmount, receiptDate, isPfand, pfandAmount, imagePath } = data;
    
    const luvyEarned = this.calculateLuvyReward(totalAmount, isPfand);

    const receipt = await Receipt.create({
      userId,
      merchantId,
      totalAmount,
      receiptDate,
      isPfand,
      pfandAmount: pfandAmount || 0,
      luvyEarned,
      imagePath,
      status: 'pending'
    });

    return receipt;
  }

  async approveReceipt(receiptId) {
    const receipt = await Receipt.findByPk(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }
    
    if (receipt.status !== 'pending') {
      throw new Error('Receipt already processed');
    }
    
    receipt.status = 'approved';
    await receipt.save();
    
    await walletService.addLuvy(
      receipt.userId,
      parseFloat(receipt.luvyEarned),
      'earn',
      `Receipt approved: ${receipt.totalAmount} EUR`,
      'receipt',
      receipt.id
    );
    
    return receipt;
  }

  async getReceiptsByUser(userId, limit = 20, offset = 0) {
    const receipts = await Receipt.findAll({
      where: { userId },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
    return receipts;
  }

  async getReceiptById(id) {
    return await Receipt.findByPk(id);
  }

  async updateReceiptStatus(id, status) {
    const receipt = await Receipt.findByPk(id);
    if (!receipt) {
      throw new Error('Receipt not found');
    }
    receipt.status = status;
    await receipt.save();
    return receipt;
  }
}

module.exports = new ReceiptService();
