const MarketData = require('../models/MarketData');
const MarketHistory = require('../models/MarketHistory');
const { sequelize } = require('../../config/database');

const BURN_RATE = 0.005;

class MarketService {
  async getOrCreateMarketData() {
    let marketData = await MarketData.findOne({ order: [['created_at', 'DESC']] });
    
    if (!marketData) {
      marketData = await MarketData.create({
        totalPoolEur: 100000.00,
        circulatingSupply: 1000000,
        tokenValue: 0.10,
        totalSupply: 1000000
      });
    }
    
    return marketData;
  }

  calculateTokenValue(totalPool, circulatingSupply) {
    if (circulatingSupply === 0) return 0.10;
    return (totalPool / circulatingSupply).toFixed(4);
  }

  async updateMarketData(changes) {
    return await sequelize.transaction(async (t) => {
      const marketData = await this.getOrCreateMarketData();
      
      if (changes.addSupply) {
        const newCirculating = parseFloat(marketData.circulatingSupply) + changes.addSupply;
        const newTotal = parseFloat(marketData.totalSupply) + changes.addSupply;
        
        marketData.circulatingSupply = newCirculating;
        marketData.totalSupply = newTotal;
      }
      
      if (changes.lockSupply) {
        marketData.lockedSupply = parseFloat(marketData.lockedSupply) + changes.lockSupply;
      }
      
      if (changes.burnSupply) {
        const burnAmount = changes.burnSupply;
        marketData.circulatingSupply = parseFloat(marketData.circulatingSupply) - burnAmount;
        marketData.burnedSupply = parseFloat(marketData.burnedSupply) + burnAmount;
      }
      
      if (changes.addToPool) {
        marketData.totalPoolEur = parseFloat(marketData.totalPoolEur) + changes.addToPool;
      }
      
      const newTokenValue = this.calculateTokenValue(
        parseFloat(marketData.totalPoolEur),
        parseFloat(marketData.circulatingSupply)
      );
      
      const oldValue = parseFloat(marketData.tokenValue);
      marketData.tokenValue = newTokenValue;
      
      const priceChange = ((newTokenValue - oldValue) / oldValue * 100).toFixed(4);
      marketData.priceChangePercent24h = priceChange;
      
      marketData.marketCap = (parseFloat(marketData.circulatingSupply) * parseFloat(newTokenValue)).toFixed(2);
      
      await marketData.save({ transaction: t });
      
      return marketData;
    });
  }

  async getCurrentMarketData() {
    const marketData = await this.getOrCreateMarketData();
    
    return {
      tokenValue: parseFloat(marketData.tokenValue),
      circulatingSupply: parseFloat(marketData.circulatingSupply),
      totalSupply: parseFloat(marketData.totalSupply),
      lockedSupply: parseFloat(marketData.lockedSupply),
      burnedSupply: parseFloat(marketData.burnedSupply),
      totalPoolEur: parseFloat(marketData.totalPoolEur),
      marketCap: parseFloat(marketData.marketCap),
      volume24h: parseFloat(marketData.volume24h),
      transactions24h: marketData.transactions24h,
      priceChangePercent24h: parseFloat(marketData.priceChangePercent24h)
    };
  }

  async recordMarketHistory(interval) {
    const marketData = await this.getOrCreateMarketData();
    
    await MarketHistory.create({
      tokenValue: marketData.tokenValue,
      circulatingSupply: marketData.circulatingSupply,
      marketCap: marketData.marketCap,
      volume: marketData.volume24h,
      transactions: marketData.transactions24h,
      interval,
      timestamp: new Date()
    });
  }

  async getMarketHistory(interval, limit = 100) {
    const history = await MarketHistory.findAll({
      where: { interval },
      order: [['timestamp', 'DESC']],
      limit
    });
    
    return history.reverse();
  }

  async getMarketStats() {
    const current = await this.getCurrentMarketData();
    const history24h = await this.getMarketHistory('hour', 24);
    
    let priceChange24h = 0;
    if (history24h.length > 0) {
      const oldPrice = parseFloat(history24h[0].tokenValue);
      const newPrice = parseFloat(current.tokenValue);
      priceChange24h = ((newPrice - oldPrice) / oldPrice * 100).toFixed(2);
    }
    
    return {
      current,
      priceChange24h,
      high24h: history24h.length > 0 ? Math.max(...history24h.map(h => parseFloat(h.tokenValue))) : current.tokenValue,
      low24h: history24h.length > 0 ? Math.min(...history24h.map(h => parseFloat(h.tokenValue))) : current.tokenValue
    };
  }
}

module.exports = new MarketService();
