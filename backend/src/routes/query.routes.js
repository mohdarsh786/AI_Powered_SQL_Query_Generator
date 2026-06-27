/**
 * Query Routes. Rate limited (10/min), requires auth. Execute route additionally uses queryValidator middleware (Layer 2).
 */

const express = require('express');
const router = express.Router();
const { generate, execute, analyze, history } = require('../controllers/query.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { queryValidator } = require('../middleware/queryValidator');

// POST /api/query/generate — NL → SQL via Groq (Layer 1 auth in Groq prompt)
router.post('/generate', authenticate, requireRole('dba', 'user'), generate);

// POST /api/query/execute — execute validated SQL (Layer 2 queryValidator)
router.post('/execute', authenticate, requireRole('dba', 'user'), queryValidator, execute);

// POST /api/query/analyze — analyze/optimize existing SQL via Groq
router.post('/analyze', authenticate, requireRole('dba', 'user'), analyze);

// GET /api/query/history — user's own query history
router.get('/history', authenticate, history);

module.exports = router;
