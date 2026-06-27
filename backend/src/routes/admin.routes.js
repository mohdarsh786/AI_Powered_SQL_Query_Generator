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
} = require('../controllers/admin.controller');
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

module.exports = router;
