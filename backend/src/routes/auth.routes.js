/**
 * Authentication Routes. Rate limited to 5 requests/minute per IP.
 */

const express = require('express');
const router = express.Router();
const { login, logout, me, changePassword } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/login — validate credentials, issue JWT cookie
router.post('/login', login);

// POST /api/auth/logout — clear JWT cookie (requires auth)
router.post('/logout', authenticate, logout);

// GET /api/auth/me — return current user info from JWT
// GET /api/auth/me — return current user info from JWT
router.get('/me', authenticate, me);

// POST /api/auth/change-password — handle forced password reset
router.post('/change-password', changePassword);

module.exports = router;
