/**
 * Authentication Routes. Rate limited to 5 requests/minute per IP.
 */

const express = require('express');
const router = express.Router();
const {
  login, logout, me, changePassword,
  checkDomain, checkOrgName, register, verifyOTP, resendOTP,
  forgotPassword, verifyResetOTP, resetPassword
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/login — validate credentials, issue JWT cookie
router.post('/login', authLimiter, login);

// POST /api/auth/logout — clear JWT cookie (requires auth)
router.post('/logout', authenticate, logout);

// GET /api/auth/me — return current user info from JWT
router.get('/me', authenticate, me);

// POST /api/auth/change-password — handle forced password reset
router.post('/change-password', authLimiter, changePassword);

// ── Registration routes ──────────────────────────────────────────────
router.get('/check-domain', checkDomain);
router.get('/check-org-name', checkOrgName);
router.post('/register', authLimiter, register);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/resend-otp', authLimiter, resendOTP);

// ── Forgot Password routes ───────────────────────────────────────────
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/verify-reset-otp', authLimiter, verifyResetOTP);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;
