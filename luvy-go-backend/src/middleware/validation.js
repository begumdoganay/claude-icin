const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User registration validation
const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be 2-50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be 2-50 characters'),
  handleValidationErrors
];

// User login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Receipt submission validation
const validateReceiptSubmit = [
  body('merchantId')
    .isUUID()
    .withMessage('Valid merchant ID is required'),
  body('totalAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Total amount must be greater than 0'),
  body('receiptDate')
    .isISO8601()
    .withMessage('Valid receipt date is required'),
  body('isPfand')
    .optional()
    .isBoolean()
    .withMessage('isPfand must be a boolean'),
  handleValidationErrors
];

// Merchant registration validation
const validateMerchantRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('businessName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be 2-100 characters'),
  body('businessType')
    .isIn(['restaurant', 'cafe', 'grocery', 'retail', 'other'])
    .withMessage('Invalid business type'),
  body('taxId')
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('Tax ID must be 5-20 characters'),
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('id')
    .isUUID()
    .withMessage('Valid ID is required'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a positive number'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateReceiptSubmit,
  validateMerchantRegister,
  validateId,
  validatePagination,
  handleValidationErrors
};