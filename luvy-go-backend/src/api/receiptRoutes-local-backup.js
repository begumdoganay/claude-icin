const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Receipt upload (WITHOUT auth for now)
router.post('/submit', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Receipt file required' });
    }

    const { merchantId, totalAmount, receiptDate } = req.body;
    const tokensEarned = Math.floor(parseFloat(totalAmount || 0) * 0.1);

    return res.status(200).json({
      success: true,
      message: 'Receipt uploaded successfully',
      data: {
        filename: req.file.filename,
        tokens_earned: tokensEarned,
        amount: totalAmount
      }
    });
  } catch (error) {
    console.error('Receipt error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get receipts (mock data for now)
router.get('/my-receipts', async (req, res) => {
  try {
    return res.json({
      success: true,
      receipts: [
        { id: 1, merchant: 'Migros', amount: 128.90, tokens: 13, date: '2026-01-30' },
        { id: 2, merchant: 'Starbucks', amount: 45.50, tokens: 5, date: '2026-01-29' }
      ]
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
