/**
 * Global Error Handler Middleware. Catches errors and returns safe, generic messages in production. Never exposes stack traces to clients.
 */

const env = require('../config/env');

const errorHandler = (err, req, res, _next) => {
  // Log full error details server-side
  console.error('❌ Error:', {
    message: err.message,
    stack: env.nodeEnv === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Build response — never send stack traces or internal details to client
  const response = {
    error:
      env.nodeEnv === 'development' && statusCode !== 500
        ? err.message
        : 'An unexpected error occurred. Please try again later.',
  };

  // In development, include more details for non-500 errors
  if (env.nodeEnv === 'development') {
    response.error = err.message || 'Internal server error';
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = { errorHandler };
