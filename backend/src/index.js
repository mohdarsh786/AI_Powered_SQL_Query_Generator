/**
 * Backend Entry Point. Implements security layers including helmet, CORS, rate limiting, httpOnly JWT, body limits, and queryValidator.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { queryLimiter, generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { startSessionCleanupJob } = require('./jobs/sessionCleanup');

// Route imports
const authRoutes = require('./routes/auth.routes');
const schemaRoutes = require('./routes/schema.routes');
const queryRoutes = require('./routes/query.routes');
const adminRoutes = require('./routes/admin.routes');
const dbaRoutes = require('./routes/dba.routes');

const app = express();

// ── Security Middleware ──────────────────────────────────────────────

// 1. Helmet: sets various HTTP headers for security
app.use(helmet());

// 2. CORS: whitelist only the frontend URL
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 4. Cookie parser for httpOnly JWT cookies
app.use(cookieParser());

// 5. Body size limit: 1mb
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Trust proxy for accurate IP in rate limiter (if behind reverse proxy)
app.set('trust proxy', 1);

// ── Health Check ─────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

// ── API Routes with Rate Limiters ────────────────────────────────────

// 3a. Auth routes: general rate limit (login/password endpoints have custom strict limiters)
app.use('/api/auth', generalLimiter, authRoutes);

// 3b. Query routes: 10 requests/minute per IP
app.use('/api/query', queryLimiter, queryRoutes);

// Schema routes: general rate limit
app.use('/api/schema', generalLimiter, schemaRoutes);

// Admin routes: general rate limit
app.use('/api/admin', generalLimiter, adminRoutes);

// DBA routes: general rate limit
app.use('/api/dba', generalLimiter, dbaRoutes);

// ── 404 Handler ──────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Global Error Handler ─────────────────────────────────────────────

// 8. Never send stack traces in production
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────────

const PORT = env.port;

// Start background jobs
startSessionCleanupJob();

app.listen(PORT, () => {
  console.log(`\n🚀 SQL Intelligence Platform API running on port ${PORT}`);
  console.log(`   Environment: ${env.nodeEnv}`);
  console.log(`   Frontend URL: ${env.frontendUrl}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
