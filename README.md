<div align="center">

<img src="https://img.shields.io/badge/SQL-Intelligence-06b6d4?style=for-the-badge&logo=postgresql&logoColor=white" alt="SQL Intelligence" height="60"/>

# SQL Intelligence Platform

### AI-Powered SQL Query Generator with Enterprise-Grade Security

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Visit_Now-238636?style=for-the-badge)](https://ai-powered-sql-query-generator.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-a78bfa?style=for-the-badge)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-F55036?style=for-the-badge)](https://groq.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Render](https://img.shields.io/badge/Render-Deployed-46E3B7?style=for-the-badge&logo=render)](https://render.com)

</div>

---


### Demo Credentials

> All accounts use a **one-time default password**. On first login, the platform forces a mandatory password reset before granting access — an industry-standard security practice.

| Username | Default Password | Role | Access Level |
|---|---|---|---|
| `admin_sarah` | `password123` |  Admin | User management, permissions, audit logs |
| `dba_michael` | `password123` |  DBA   | Full DDL/DML, schema browser, query execution |
| `user_jessica` | `password123`|  User  | SELECT on granted tables, export results |

> 💡 To reset accounts to default: run `backend/seed.sql` in your Supabase SQL Editor.

---

##  Features

<table>
<tr>
<td width="50%">

###  AI-Powered Query Generation
- Natural language → optimized SQL
- Up to 3 query variants per request
- Dialect-aware (PostgreSQL / MySQL)
- 3-second debounce analysis as you type
- One-click Import to editor

</td>
<td width="50%">

###  Schema-Aware Intelligence
- Auto-fetches schema via INFORMATION_SCHEMA
- AI receives DDL only — **zero row data**
- Table relationships and index awareness
- Clause-by-clause explanation
- Estimated row impact analysis

</td>
</tr>
<tr>
<td width="50%">

###  Enterprise Security (10 Layers)
- JWT in httpOnly cookies
- Role-based route guards (frontend + backend)
- Rate limiting — 10 req/min on query routes
- SQL injection prevention via node-sql-parser
- Schema-only AI access
- Row limit injection per user
- Append-only audit logs
- Helmet.js security headers
- CORS whitelist
- Error sanitization

</td>
<td width="50%">

###  Role-Based Access Control
- **Admin** — User management, permissions, audit logs
- **DBA** — Full DDL/DML, schema browser, execution plans
- **User** — Scoped SELECT, export, row-capped results
- Force password change on first login
- Session invalidation by Admin
- Per-table, per-operation permission grants

</td>
</tr>
<tr>
<td width="50%">

###  Monaco SQL Editor
- Syntax highlighting with custom dark theme
- SQL keyword colorization (cyan/purple/amber)
- Ctrl+Enter to execute
- Resizable panels via Split.js
- Query history sidebar

</td>
<td width="50%">

###  Live Query Execution
- Execute against live Supabase database
- Paginated results table (50 rows/page)
- Execution time and row count stats
- Export results as CSV or JSON
- Color-coded query type badges

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Vercel)                       │
│  React 18 + Vite + Monaco Editor + Split.js             │
│  Landing → Login → [User | DBA | Admin] Dashboard       │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS + httpOnly Cookies
┌──────────────────────▼──────────────────────────────────┐
│                   BACKEND (Render)                       │
│  Express.js + Helmet + CORS + Rate Limiter              │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ JWT Auth    │  │ RBAC Middle  │  │ Query         │  │
│  │ Middleware  │  │ -ware        │  │ Validator     │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Groq        │  │ Audit        │  │ Permission    │  │
│  │ Service     │  │ Service      │  │ Service       │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└──────────┬───────────────────────────────┬──────────────┘
           │                               │
┌──────────▼──────────┐      ┌─────────────▼──────────────┐
│   Supabase          │      │   Groq API                  │
│   PostgreSQL        │      │   LLaMA 3.3 70B             │
│   (Schema + Data)   │      │   (SQL Generation)          │
└─────────────────────┘      └────────────────────────────┘
```

---

##  Security Architecture

```
User Request
     │
     ▼
┌─────────────────────┐
│  Rate Limiter       │ ← 10 req/min per IP (query routes)
│  Helmet.js Headers  │ ← XSS, CSRF, clickjacking protection  
│  CORS Whitelist     │ ← Frontend origin only
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  JWT Verification   │ ← httpOnly cookie, role embedded
│  Session Check      │ ← Suspended users blocked
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  RBAC Middleware    │ ← Role-based route access
│  Permission Check   │ ← Table-level permission lookup
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐   ← Layer 1: AI refuses unauthorized ops
│  Groq AI Layer      │   ← Schema DDL only — zero row data
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐   ← Layer 2: node-sql-parser AST check
│  Query Validator    │   ← Blocks DDL/TCL for users
│  (node-sql-parser)  │   ← Verifies table permissions
│  Row Limit Injector │   ← Appends LIMIT N silently
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Supabase Execute   │ ← Query runs only if all layers pass
│  Audit Logger       │ ← Every execution logged, append-only
└─────────────────────┘
```

---

##  Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 + Vite | UI framework |
| **Editor** | Monaco Editor | SQL editor with syntax highlighting |
| **Layout** | Split.js | Resizable panels |
| **Routing** | React Router v6 | SPA navigation |
| **HTTP Client** | Axios | API calls with cookie support |
| **Icons** | Lucide React | UI icons |
| **Backend** | Node.js + Express | REST API server |
| **Auth** | JWT + bcryptjs | Secure authentication |
| **Database** | Supabase (PostgreSQL) | Data storage |
| **AI** | Groq (LLaMA 3.3 70B) | SQL generation |
| **SQL Parser** | node-sql-parser | Query validation |
| **Security** | Helmet.js + CORS | HTTP hardening |
| **Rate Limiting** | express-rate-limit | Abuse prevention |
| **Deployment** | Vercel + Render | Frontend + Backend hosting |

---

## Project Structure

```
AI_Powered_SQL_Query_Generator/
├── backend/
│   ├── src/
│   │   ├── config/          # DB + env configuration
│   │   ├── middleware/       # Auth, RBAC, rate limiter, validator
│   │   ├── controllers/      # Route handlers
│   │   ├── routes/           # API route definitions
│   │   └── services/         # Groq, audit, permission services
│   ├── seed.sql              # Database schema + demo data
│   └── .env.example          # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── Editor/       # Monaco + Results panel
│   │   │   ├── AIAssistant/  # AI suggestion panel
│   │   │   ├── Sidebar/      # User + DBA sidebars
│   │   │   └── shared/       # Navbar, RouteGuard, Toast
│   │   ├── pages/            # Login, Dashboards, Landing
│   │   ├── hooks/            # useAuth, useDebounce
│   │   ├── services/         # Axios API instance
│   │   └── styles/           # Theme + global CSS
│   └── vercel.json           # SPA routing config
└── README.md
```

---

##  Local Development

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key

### Setup

```bash
# Clone the repository
git clone https://github.com/mohdarsh786/AI_Powered_SQL_Query_Generator.git
cd AI_Powered_SQL_Query_Generator

# Setup backend
cd backend
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev

# Setup frontend (new terminal)
cd frontend
echo "VITE_API_URL=http://localhost:5000" > .env
npm install
npm run dev
```

### Database Setup

1. Go to your Supabase project → SQL Editor
2. Run the entire contents of `backend/seed.sql`
3. Run the first-login migration:

```sql
ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT FALSE;

UPDATE app_users
SET requires_password_change = TRUE
WHERE username IN ('admin_sarah', 'dba_michael', 'user_jessica');
```

### Environment Variables

**Backend `.env`:**

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRES_IN=7d
GROQ_API_KEY=your_groq_api_key
```

**Frontend `.env`:**

```env
VITE_API_URL=http://localhost:5000
```

---

##  First Login Security Flow

```
User logs in with default password (password123)
              │
              ▼
    Backend checks requires_password_change flag
              │
        ┌─────▼─────┐
        │   TRUE    │ → Issues 15-min temp_token (purpose: password_change only)
        └─────┬─────┘   Frontend redirects to /change-password
              │
              ▼
    User sets new password
    (min 8 chars, strength meter, cannot reuse password123)
              │
              ▼
    Backend: bcrypt hash saved, flag set FALSE
    Real JWT issued → User enters platform
              │
        ┌─────▼─────┐
        │   FALSE   │ → Normal login, real JWT issued immediately
        └───────────┘
```

---

## 👥 Role Permissions

| Permission |  Admin | DBA |  User |
|---|---|---|---|
| SELECT queries | ✗ | ✓ | ✓ (granted tables) |
| INSERT / UPDATE | ✗ | ✓ | ✓ (if granted) |
| DELETE | ✗ | ✓ + confirmation | ✓ (if granted) |
| DDL (CREATE/DROP) | ✗ | ✓ + confirmation | ✗ |
| COMMIT / ROLLBACK | ✗ | ✓ | ✗ |
| Grant permissions | ✓ | ✓ (user-level) | ✗ |
| User management | ✓ | ✗ | ✗ |
| Audit log access | ✓ | ✗ | ✗ |
| Row limit enforcement | Sets limits | No limit | Enforced |
| Export results | ✗ | ✓ | ✓ (if granted) |

---

##  Security Roadmap

> Features planned for v2.0:

- **Organisation Multi-tenancy** — Isolated workspaces per organisation with invite-based onboarding
- **Email Invitations** — Admin sends invite links via Brevo, users self-register
- **OTP Email Verification** — TOTP-based account verification on registration
- **Query Scheduling** — Schedule recurring queries with result notifications
- **Real-time Collaboration** — Multiple users editing queries simultaneously
- **OAuth Integration** — Google/GitHub SSO support

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

[![Made with React](https://img.shields.io/badge/Made_with-React-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Powered by Groq](https://img.shields.io/badge/Powered_by-Groq_LLaMA-F55036?style=flat-square)](https://groq.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com)

</div>
