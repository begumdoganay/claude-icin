const express = require('express');
const router = express.Router();
const marketService = require('../services/marketService');

router.get('/current', async (req, res) => {
  try {
    const marketData = await marketService.getCurrentMarketData();
    
    res.json({
      success: true,
      data: { market: marketData }
    });
  } catch (error) {
    console.error('Get market data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market data'
    });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await marketService.getMarketStats();
    
    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get market stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market stats'
    });
  }
});

router.get('/history/:interval', async (req, res) => {
  try {
    const { interval } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    if (!['minute', 'hour', 'day', 'week'].includes(interval)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid interval. Use: minute, hour, day, or week'
      });
    }
    
    const history = await marketService.getMarketHistory(interval, limit);
    
    res.json({
      success: true,
      data: {
        history,
        count: history.length,
        interval
      }
    });
  } catch (error) {
    console.error('Get market history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market history'
    });
  }
});

module.exports = router;
