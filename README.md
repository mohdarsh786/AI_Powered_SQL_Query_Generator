# SQL Intelligence Platform

AI-powered SQL assistant with role-based access control.

## Live Demo
- Frontend: <vercel_url>
- Backend: <render_url>

> **Note**: The backend is hosted on a free tier service (e.g. Render). If the application hasn't been used in a while, the server may spin down. **The first load or login attempt may take up to 30 seconds** as the server wakes up. Please be patient!

## 🔑 First Login Flow

All demo accounts use `password123` as the **one-time default password**.

On first login, the platform forces a password reset before granting access:
1. Login with default credentials
2. Redirected to "Set Your Password" screen
3. Enter a new password (min 8 chars, must not be `password123`)
4. Password updated as bcrypt hash in database
5. Real session token issued — access granted

| Username | Default Password | Role |
|---|---|---|
| admin_sarah | password123 | Admin |
| dba_michael | password123 | DBA |
| user_jessica | password123 | User |

> Default password is single-use. Once changed it cannot be reused.
> If evaluating, run `seed.sql` fresh in Supabase to reset accounts.

## Features
- Natural language to SQL query generation (Groq LLaMA 3.3)
- Schema-aware AI (DDL only, zero row data sent to AI)
- Role-based access: Admin / DBA / User
- Dual authorization: AI refuses + backend blocks unauthorized operations
- Monaco editor with syntax highlighting
- Real-time query optimization with Import button
- Query execution against live Supabase database
- Append-only audit logging
- Row limit enforcement per user
- Export results as CSV/JSON

## Security Layers
1. JWT in httpOnly cookies
2. Role-based route guards (frontend + backend)
3. Rate limiting (10 req/min on query routes)
4. SQL injection prevention via node-sql-parser
5. Schema-only AI access (no row data)
6. Row limit injection for user role
7. Append-only audit logs
8. Helmet.js security headers
9. CORS whitelist
10. Error sanitization

## Tech Stack
- Frontend: React 18 + Vite + Monaco Editor + Split.js
- Backend: Node.js + Express
- Database: Supabase (PostgreSQL)
- AI: Groq API (LLaMA 3.3 70B)
