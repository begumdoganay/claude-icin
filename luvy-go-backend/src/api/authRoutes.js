
const express = require('express');
const router = express.Router();

const authService = require('../services/authService'); // sende yolu farklıysa düzelt
const { User } = require('../config/associations');     // sende modeli nereden alıyorsan düzelt

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ success: false, error: 'Login failed' });

    // ÖNEMLİ: DB alanın password_hash ise modelde user.passwordHash veya user.password_hash olabilir
    const hash = user.passwordHash || user.password_hash || user.password_hash;
    const ok = await authService.comparePassword(password, hash);

    if (!ok) return res.status(401).json({ success: false, error: 'Login failed' });

    const token = authService.generateToken({ id: user.id, email: user.email });
    return res.json({ success: true, data: { token } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phoneNumber } = req.body;

    const passwordHash = await authService.hashPassword(password);

    const [user, created] = await User.findOrCreate({
  where: { email },
  defaults: {
    phoneNumber,
    passwordHash,
    firstName,
    lastName,
  },
});

if (!created) {
  console.log(`[auth] User already exists: ${email}`);
}

    const token = authService.generateToken({ id: user.id, email: user.email });
    return res.json({ success: true, data: { user: { id: user.id, email: user.email }, token } });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
