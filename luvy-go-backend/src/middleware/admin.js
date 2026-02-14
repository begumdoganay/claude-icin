const { authenticateToken } = require('./auth');

// Admin kontrolü middleware
const requireAdmin = (req, res, next) => {
  try {
    // Önce authentication kontrolü
    authenticateToken(req, res, () => {
      // userType kontrolü (eðer User modelinde varsa)
      // Þimdilik basit kontrol: email domain veya özel flag
      
      // TODO: User modelinde isAdmin field'ý eklenebilir
      // Geçici olarak: tüm authenticated user'lar admin sayýlsýn (test için)
      
      if (!req.user) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }
      
      next();
    });
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization failed'
    });
  }
};

module.exports = { requireAdmin };