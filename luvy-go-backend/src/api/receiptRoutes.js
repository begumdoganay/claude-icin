const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { Pool } = require('pg');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'luvy_go',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

// Cloudinary storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'luvy-receipts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    transformation: [
      { width: 1200, height: 1600, crop: 'limit' }, // Max dimensions
      { quality: 'auto' }, // Auto quality optimization
      { fetch_format: 'auto' } // Auto format (WebP if supported)
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      return `receipt-${timestamp}-${random}`;
    }
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, PNG, and PDF files are allowed'));
    }
  }
});

// Authentication middleware (simple version)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // For demo: use user ID 1
  // In production: verify JWT and extract real user_id
  req.user = { id: 1 };
  next();
};

// POST /api/receipts/submit - Upload receipt to Cloudinary
router.post('/submit', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    const { merchant, category, amount, date } = req.body;
    const userId = req.user.id;
    
    // Validate inputs
    if (!merchant || !category || !amount || !date) {
      // Delete uploaded file from Cloudinary if validation fails
      if (req.file && req.file.public_id) {
        await cloudinary.uploader.destroy(req.file.public_id);
      }
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['merchant', 'category', 'amount', 'date']
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Receipt file is required' });
    }
    
    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      // Delete uploaded file if amount is invalid
      if (req.file && req.file.public_id) {
        await cloudinary.uploader.destroy(req.file.public_id);
      }
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Calculate LUVY tokens (10% of amount)
    const tokensEarned = Math.floor(amountFloat * 0.1);
    
    // Cloudinary URLs
    const imageUrl = req.file.path; // Full resolution URL
    const publicId = req.file.filename; // Cloudinary public_id
    
    // Generate thumbnail URL (200x200)
    const thumbnailUrl = cloudinary.url(publicId, {
      transformation: [
        { width: 200, height: 200, crop: 'thumb', gravity: 'center' },
        { quality: 'auto' }
      ]
    });
    
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert receipt
      const receiptResult = await client.query(
        `INSERT INTO receipts (user_id, merchant, category, amount, tokens_earned, receipt_date, image_url, cloudinary_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed')
         RETURNING id, created_at`,
        [userId, merchant, category, amountFloat, tokensEarned, date, imageUrl, publicId]
      );
      
      const receiptId = receiptResult.rows[0].id;
      
      // Update wallet balance
      const walletResult = await client.query(
        `UPDATE wallets 
         SET balance = balance + $1,
             total_earned = total_earned + $1,
             updated_at = NOW()
         WHERE user_id = $2
         RETURNING balance`,
        [tokensEarned, userId]
      );
      
      // If wallet doesn't exist, create it
      let newBalance;
      if (walletResult.rows.length === 0) {
        const createWallet = await client.query(
          `INSERT INTO wallets (user_id, balance, total_earned)
           VALUES ($1, $2, $2)
           RETURNING balance`,
          [userId, tokensEarned]
        );
        newBalance = createWallet.rows[0].balance;
      } else {
        newBalance = walletResult.rows[0].balance;
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        message: 'Receipt uploaded successfully to cloud',
        receipt: {
          id: receiptId,
          receipt_id: `TX-2026-${String(receiptId).padStart(3, '0')}`,
          merchant,
          category,
          amount: amountFloat,
          tokens_earned: tokensEarned,
          receipt_date: date,
          image_url: imageUrl,
          image_thumbnail: thumbnailUrl,
          cloudinary_id: publicId,
          created_at: receiptResult.rows[0].created_at
        },
        wallet: {
          new_balance: newBalance,
          tokens_earned: tokensEarned
        }
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      
      // Delete uploaded file from Cloudinary on database error
      if (req.file && req.file.public_id) {
        await cloudinary.uploader.destroy(req.file.public_id);
      }
      
      throw err;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Receipt upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process receipt',
      details: error.message 
    });
  }
});

// GET /api/receipts/my-receipts - Get user's receipts
router.get('/my-receipts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, category, status } = req.query;
    
    let query = `
      SELECT 
        id,
        merchant,
        category,
        amount,
        tokens_earned,
        receipt_date,
        image_url,
        cloudinary_id,
        status,
        created_at
      FROM receipts
      WHERE user_id = $1
    `;
    
    const params = [userId];
    let paramIndex = 2;
    
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    // Add thumbnail URLs
    const receiptsWithThumbnails = result.rows.map(r => {
      const thumbnailUrl = r.cloudinary_id ? cloudinary.url(r.cloudinary_id, {
        transformation: [
          { width: 200, height: 200, crop: 'thumb', gravity: 'center' },
          { quality: 'auto' }
        ]
      }) : null;
      
      return {
        ...r,
        receipt_id: `TX-2026-${String(r.id).padStart(3, '0')}`,
        image_thumbnail: thumbnailUrl
      };
    });
    
    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM receipts WHERE user_id = $1',
      [userId]
    );
    
    res.json({
      success: true,
      receipts: receiptsWithThumbnails,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: (parseInt(offset) + result.rows.length) < parseInt(countResult.rows[0].count)
      }
    });
    
  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch receipts',
      details: error.message 
    });
  }
});

// GET /api/receipts/:id - Get single receipt
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT * FROM receipts WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    const receipt = result.rows[0];
    receipt.receipt_id = `TX-2026-${String(receipt.id).padStart(3, '0')}`;
    
    // Add thumbnail
    if (receipt.cloudinary_id) {
      receipt.image_thumbnail = cloudinary.url(receipt.cloudinary_id, {
        transformation: [
          { width: 200, height: 200, crop: 'thumb', gravity: 'center' },
          { quality: 'auto' }
        ]
      });
    }
    
    res.json({
      success: true,
      receipt
    });
    
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch receipt',
      details: error.message 
    });
  }
});

// DELETE /api/receipts/:id - Delete receipt (also from Cloudinary)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get receipt details
      const receiptResult = await client.query(
        'SELECT tokens_earned, cloudinary_id FROM receipts WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      
      if (receiptResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Receipt not found' });
      }
      
      const { tokens_earned, cloudinary_id } = receiptResult.rows[0];
      
      // Delete from database
      await client.query(
        'DELETE FROM receipts WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      
      // Update wallet (deduct tokens)
      await client.query(
        `UPDATE wallets 
         SET balance = balance - $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [tokens_earned, userId]
      );
      
      await client.query('COMMIT');
      
      // Delete from Cloudinary (after DB commit)
      if (cloudinary_id) {
        await cloudinary.uploader.destroy(cloudinary_id);
      }
      
      res.json({
        success: true,
        message: 'Receipt deleted successfully from database and cloud'
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Delete receipt error:', error);
    res.status(500).json({ 
      error: 'Failed to delete receipt',
      details: error.message 
    });
  }
});

module.exports = router;
