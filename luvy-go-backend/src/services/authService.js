const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'luvy_secret_key';

class AuthService {
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
  generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }
}

module.exports = new AuthService();
