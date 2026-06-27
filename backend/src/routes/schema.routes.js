/**
 * Schema Routes. Requires authentication. Schema is scoped by role.
 */

const express = require('express');
const router = express.Router();
const { fetchSchema } = require('../controllers/schema.controller');
const { authenticate } = require('../middleware/auth');

// GET /api/schema/fetch — fetch schema scoped by role
router.get('/fetch', authenticate, fetchSchema);

module.exports = router;
