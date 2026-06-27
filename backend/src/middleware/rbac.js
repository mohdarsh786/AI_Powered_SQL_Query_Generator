/**
 * RBAC Middleware. Restricts route access to specified roles.
 */

/** Creates middleware restricting access to specified roles. @returns {Function} */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this action.' });
    }

    next();
  };
};

module.exports = { requireRole };
