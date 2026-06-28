/**
 * DBA Routes. All routes require dba role.
 */

const express = require('express');
const router = express.Router();
const { grantPermission, getActiveSessions, streamActiveSessions } = require('../controllers/dba.controller');
const { listUsers } = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Apply auth + dba RBAC to all routes in this router
router.use(authenticate, requireRole('dba'));

// POST /api/dba/permissions — grant user-level permission on specific table
router.post('/permissions', grantPermission);

// GET /api/dba/sessions/live — SSE stream for active sessions
router.get('/sessions/live', streamActiveSessions);

// GET /api/dba/sessions — active sessions list
router.get('/sessions', getActiveSessions);

// GET /api/dba/users — list users for permission granting
router.get('/users', listUsers);

module.exports = router;
