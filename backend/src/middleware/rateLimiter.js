const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/apiResponse');

/**
 * Rate limiter for authentication attempts (login, password changes)
 * Protects against brute-force attacks
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 100, // Reasonable cap
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(
      res,
      429,
      'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    );
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

module.exports = {
  authRateLimiter,
};
