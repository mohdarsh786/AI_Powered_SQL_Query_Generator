/**
 * Rate Limiter Middleware. Different limits for different route groups.
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for /api/query/* routes. (10 reqs/min/IP)
 */
const queryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many query requests. Please try again after a minute.',
  },
  keyGenerator: (req) => req.ip,
});

/**
 * Rate limiter for /api/auth/* routes. (5 reqs/min/IP)
 */
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again after a minute.',
  },
  keyGenerator: (req) => req.ip,
});

/**
 * General rate limiter for all other routes. (100 reqs/min/IP)
 */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down.',
  },
  keyGenerator: (req) => req.ip,
});

module.exports = { queryLimiter, authLimiter, generalLimiter };
