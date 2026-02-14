const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Genel API rate limit (100 requests per 15 minutes) // suanlik makul buldugum kisim
const generalLimiter = createRateLimiter(
  15 * 60 * 1000,
  100,
  'Too many requests from this IP, please try again later.'
);

// Auth endpointleri icin strict limit (5 requests per 15 minutes)
const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  'Too many login attempts, please try again later.'
);

// Receipt upload icin limit (20 uploads per hour)
const uploadLimiter = createRateLimiter(
  60 * 60 * 1000,
  20,
  'Too many upload attempts, please try again later.'
);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allowed origins (productionda gercek domaininizi ekleyerek ona gore ayarladim)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite default
      'http://localhost:8080',
      // Production domain'inizi buraya ekleyin
      // 'https://luvygo.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Helmet security headers configuration
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Security middlewareleri export ederek ilerledim
module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  corsOptions,
  helmetConfig,
  cors: cors(corsOptions),
  helmet: helmetConfig,
  mongoSanitize: mongoSanitize(),
  xssClean: xss(),
};