const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database pool
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

// Get leaderboard - basit versiyon
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id,
                u.name,
                u.email,
                COALESCE(u.luvy_balance, 0) as luvy_balance,
                COUNT(r.id) as receipt_count,
                COALESCE(SUM(r.total_amount), 0) as total_spent
            FROM users u
            LEFT JOIN receipts r ON u.id = r.user_id
            GROUP BY u.id, u.name, u.email, u.luvy_balance
            ORDER BY u.luvy_balance DESC
            LIMIT 50
        `;
        
        const result = await pool.query(query);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboard',
            details: error.message
        });
    }
});

module.exports = router;
