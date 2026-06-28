/**
 * Admin Routes. All routes require admin role.
 */

const express = require('express');
const router = express.Router();
const {
  listUsers,
  createUser,
  toggleSuspend,
  managePermissions,
  getAudit,
  setRowLimit,
  getStats,
} = require('../controllers/admin.controller');
const { getActiveSessions, streamActiveSessions } = require('../controllers/dba.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Apply auth + admin RBAC to all routes in this router
router.use(authenticate, requireRole('admin'));

// GET /api/admin/users — list all users
router.get('/users', listUsers);

// POST /api/admin/users — create a new user
router.post('/users', createUser);

// PATCH /api/admin/users/:id/suspend — toggle suspend
router.patch('/users/:id/suspend', toggleSuspend);

// POST /api/admin/permissions — grant or revoke table+operation permission
router.post('/permissions', managePermissions);

// GET /api/admin/audit — paginated audit logs
router.get('/audit', getAudit);

// PATCH /api/admin/rowlimit/:userId — set row cap for user
router.patch('/rowlimit/:userId', setRowLimit);

// GET /api/admin/stats — cluster statistics
router.get('/stats', getStats);

// GET /api/admin/sessions — active sessions list
router.get('/sessions', getActiveSessions);

// GET /api/admin/sessions/live — SSE stream for active sessions count
router.get('/sessions/live', streamActiveSessions);

module.exports = router;
