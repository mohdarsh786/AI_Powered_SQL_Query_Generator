/**
 * JWT Authentication Middleware. Reads JWT from httpOnly cookie, verifies it, and attaches user to req.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const supabase = require('../config/db');

/**
 * Requires valid JWT in 'token' httpOnly cookie. Attaches user to req.user and verifies account is not suspended.
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        res.clearCookie('token');
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }

    // Verify user still exists and is not suspended
    const { data: user, error } = await supabase
      .from('app_users')
      .select('id, username, email, role, is_suspended, row_limit')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      res.clearCookie('token');
      return res.status(401).json({ error: 'User account not found.' });
    }

    if (user.is_suspended) {
      res.clearCookie('token');
      return res.status(403).json({ error: 'Account suspended. Contact your administrator.' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      row_limit: user.row_limit,
    };

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate };
