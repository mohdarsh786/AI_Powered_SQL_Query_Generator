-- ============================================================================
-- AI-Powered SQL Intelligence Platform — Database Seed File
-- ============================================================================
-- Run this file against your Supabase PostgreSQL database to set up all tables,
-- seed data, and the execute_raw_sql RPC function.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. APPLICATION TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Users table for app authentication
CREATE TABLE IF NOT EXISTS app_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'dba', 'user')),
  is_suspended BOOLEAN DEFAULT FALSE,
  row_limit INTEGER DEFAULT 500,
  requires_password_change BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-user per-table permissions
CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
  table_name VARCHAR(100) NOT NULL,
  can_select BOOLEAN DEFAULT FALSE,
  can_insert BOOLEAN DEFAULT FALSE,
  can_update BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_export BOOLEAN DEFAULT FALSE,
  granted_by INTEGER REFERENCES app_users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, table_name)
);

-- Audit logs (append only — no UPDATE or DELETE allowed)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id),
  username VARCHAR(100),
  role VARCHAR(20),
  query_type VARCHAR(20),
  tables_used TEXT[],
  query_text TEXT,
  rows_affected INTEGER,
  execution_time_ms INTEGER,
  ip_address VARCHAR(45),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query history per user
CREATE TABLE IF NOT EXISTS query_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id),
  natural_language TEXT,
  generated_query TEXT,
  executed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DEMO BUSINESS TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  location VARCHAR(200),
  budget DECIMAL(15, 2),
  head_count INTEGER DEFAULT 0,
  established_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  department_id INTEGER REFERENCES departments(id),
  position VARCHAR(100),
  hire_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salaries
CREATE TABLE IF NOT EXISTS salaries (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  base_salary DECIMAL(12, 2) NOT NULL,
  bonus DECIMAL(12, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  enrollment_date DATE NOT NULL,
  major VARCHAR(100),
  gpa DECIMAL(3, 2),
  graduation_year INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  department_id INTEGER REFERENCES departments(id),
  start_date DATE,
  end_date DATE,
  status VARCHAR(30) CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  budget DECIMAL(15, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project assignments (junction table)
CREATE TABLE IF NOT EXISTS project_assignments (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  role VARCHAR(50),
  assigned_date DATE DEFAULT CURRENT_DATE,
  hours_allocated INTEGER DEFAULT 40,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, employee_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RPC FUNCTION FOR RAW SQL EXECUTION
-- ─────────────────────────────────────────────────────────────────────────────
-- This function allows the backend to execute arbitrary SQL via Supabase RPC.
-- SECURITY: Only the service_role key should have access to this function.

CREATE OR REPLACE FUNCTION execute_raw_sql(query_text TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  EXECUTE 'SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json) FROM (' || query_text || ') t'
  INTO result;
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. HELPER RPC FOR SCHEMA INTROSPECTION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_schema_tables()
RETURNS TABLE(table_name TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT table_name::TEXT
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  ORDER BY table_name;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SEED DATA — APP USERS
-- ─────────────────────────────────────────────────────────────────────────────
-- All passwords are bcrypt hash of 'password123' (cost factor 12) (for testing purpose only)

INSERT INTO app_users (username, email, password_hash, role, is_suspended, row_limit, requires_password_change) VALUES
  ('admin_sarah', 'sarah.admin@sqlplatform.com', '$2a$12$QK14cPUqxgTl1BTy2/E7YecUHyYZ4X8t1JFHF6B8IW90Dp8575Esi', 'admin', FALSE, 500, TRUE),
  ('dba_michael', 'michael.dba@sqlplatform.com', '$2a$12$QK14cPUqxgTl1BTy2/E7YecUHyYZ4X8t1JFHF6B8IW90Dp8575Esi', 'dba', FALSE, 500, TRUE),
  ('user_jessica', 'jessica.user@sqlplatform.com', '$2a$12$QK14cPUqxgTl1BTy2/E7YecUHyYZ4X8t1JFHF6B8IW90Dp8575Esi', 'user', FALSE, 500, TRUE)
ON CONFLICT (username) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SEED DATA — DEPARTMENTS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO departments (name, location, budget, head_count, established_date) VALUES
  ('Engineering',      'Building A, Floor 3',   2500000.00, 45, '2018-01-15'),
  ('Marketing',        'Building B, Floor 1',    850000.00, 22, '2018-03-01'),
  ('Human Resources',  'Building A, Floor 1',    600000.00, 15, '2018-01-15'),
  ('Finance',          'Building C, Floor 2',    750000.00, 18, '2018-02-01'),
  ('Sales',            'Building B, Floor 2',   1200000.00, 35, '2018-04-01'),
  ('Research & Dev',   'Building D, Floor 1',   3200000.00, 50, '2019-06-15'),
  ('Customer Support', 'Building B, Floor 3',    450000.00, 28, '2019-01-10'),
  ('Legal',            'Building C, Floor 3',    550000.00, 10, '2019-09-01')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SEED DATA — EMPLOYEES (25 rows)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO employees (first_name, last_name, email, phone, department_id, position, hire_date, is_active) VALUES
  ('James',     'Wilson',      'james.wilson@company.com',      '+1-555-0101', 1, 'Senior Software Engineer',   '2019-03-15', TRUE),
  ('Emily',     'Chen',        'emily.chen@company.com',        '+1-555-0102', 1, 'Tech Lead',                  '2018-07-22', TRUE),
  ('Robert',    'Garcia',      'robert.garcia@company.com',     '+1-555-0103', 1, 'DevOps Engineer',            '2020-01-10', TRUE),
  ('Maria',     'Rodriguez',   'maria.rodriguez@company.com',   '+1-555-0104', 1, 'Frontend Developer',         '2021-05-18', TRUE),
  ('David',     'Kim',         'david.kim@company.com',         '+1-555-0105', 1, 'Backend Developer',          '2020-11-02', TRUE),
  ('Sarah',     'Thompson',    'sarah.thompson@company.com',    '+1-555-0106', 2, 'Marketing Director',         '2018-04-01', TRUE),
  ('Michael',   'Brown',       'michael.brown@company.com',     '+1-555-0107', 2, 'Content Strategist',         '2019-08-15', TRUE),
  ('Jennifer',  'Davis',       'jennifer.davis@company.com',    '+1-555-0108', 2, 'SEO Specialist',             '2020-06-20', TRUE),
  ('William',   'Martinez',    'william.martinez@company.com',  '+1-555-0109', 3, 'HR Director',                '2018-02-01', TRUE),
  ('Lisa',      'Anderson',    'lisa.anderson@company.com',     '+1-555-0110', 3, 'Recruiter',                  '2019-11-05', TRUE),
  ('Christopher','Taylor',     'christopher.taylor@company.com','+1-555-0111', 3, 'Benefits Coordinator',       '2021-01-20', TRUE),
  ('Amanda',    'Thomas',      'amanda.thomas@company.com',     '+1-555-0112', 4, 'CFO',                        '2018-01-15', TRUE),
  ('Daniel',    'Jackson',     'daniel.jackson@company.com',    '+1-555-0113', 4, 'Financial Analyst',          '2019-05-10', TRUE),
  ('Jessica',   'White',       'jessica.white@company.com',     '+1-555-0114', 4, 'Accountant',                 '2020-09-01', TRUE),
  ('Matthew',   'Harris',      'matthew.harris@company.com',    '+1-555-0115', 5, 'VP of Sales',                '2018-06-01', TRUE),
  ('Ashley',    'Clark',       'ashley.clark@company.com',      '+1-555-0116', 5, 'Account Executive',          '2019-12-10', TRUE),
  ('Andrew',    'Lewis',       'andrew.lewis@company.com',      '+1-555-0117', 5, 'Sales Representative',       '2021-03-15', TRUE),
  ('Stephanie', 'Robinson',    'stephanie.robinson@company.com','+1-555-0118', 6, 'Research Director',          '2019-07-01', TRUE),
  ('Kevin',     'Walker',      'kevin.walker@company.com',      '+1-555-0119', 6, 'Data Scientist',             '2020-02-20', TRUE),
  ('Nicole',    'Hall',        'nicole.hall@company.com',       '+1-555-0120', 6, 'ML Engineer',                '2020-10-15', TRUE),
  ('Brian',     'Allen',       'brian.allen@company.com',       '+1-555-0121', 7, 'Support Manager',            '2019-03-01', TRUE),
  ('Michelle',  'Young',       'michelle.young@company.com',    '+1-555-0122', 7, 'Support Specialist',         '2020-08-10', TRUE),
  ('Ryan',      'King',        'ryan.king@company.com',         '+1-555-0123', 7, 'Technical Support',          '2021-06-01', TRUE),
  ('Rachel',    'Wright',      'rachel.wright@company.com',     '+1-555-0124', 8, 'General Counsel',            '2019-10-15', TRUE),
  ('Jason',     'Lopez',       'jason.lopez@company.com',       '+1-555-0125', 8, 'Corporate Attorney',         '2020-04-01', FALSE)
ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SEED DATA — SALARIES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO salaries (employee_id, base_salary, bonus, currency, effective_from, effective_to) VALUES
  (1,  125000.00, 15000.00, 'USD', '2023-01-01', NULL),
  (2,  145000.00, 20000.00, 'USD', '2023-01-01', NULL),
  (3,  110000.00, 10000.00, 'USD', '2023-01-01', NULL),
  (4,   95000.00,  8000.00, 'USD', '2023-01-01', NULL),
  (5,  105000.00, 12000.00, 'USD', '2023-01-01', NULL),
  (6,  130000.00, 25000.00, 'USD', '2023-01-01', NULL),
  (7,   82000.00,  6000.00, 'USD', '2023-01-01', NULL),
  (8,   78000.00,  5000.00, 'USD', '2023-01-01', NULL),
  (9,  120000.00, 15000.00, 'USD', '2023-01-01', NULL),
  (10,  72000.00,  4000.00, 'USD', '2023-01-01', NULL),
  (11,  68000.00,  3500.00, 'USD', '2023-01-01', NULL),
  (12, 175000.00, 35000.00, 'USD', '2023-01-01', NULL),
  (13,  88000.00,  7000.00, 'USD', '2023-01-01', NULL),
  (14,  75000.00,  5000.00, 'USD', '2023-01-01', NULL),
  (15, 140000.00, 30000.00, 'USD', '2023-01-01', NULL),
  (16,  85000.00, 12000.00, 'USD', '2023-01-01', NULL),
  (17,  65000.00,  6000.00, 'USD', '2023-01-01', NULL),
  (18, 155000.00, 20000.00, 'USD', '2023-01-01', NULL),
  (19, 115000.00, 15000.00, 'USD', '2023-01-01', NULL),
  (20, 120000.00, 18000.00, 'USD', '2023-01-01', NULL),
  (21,  90000.00,  8000.00, 'USD', '2023-01-01', NULL),
  (22,  62000.00,  3000.00, 'USD', '2023-01-01', NULL),
  (23,  58000.00,  2500.00, 'USD', '2023-01-01', NULL),
  (24, 165000.00, 25000.00, 'USD', '2023-01-01', NULL),
  (25, 135000.00, 18000.00, 'USD', '2023-01-01', NULL)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. SEED DATA — STUDENTS (22 rows)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO students (first_name, last_name, email, enrollment_date, major, gpa, graduation_year, is_active) VALUES
  ('Alex',       'Johnson',    'alex.johnson@university.edu',      '2022-08-20', 'Computer Science',        3.85, 2026, TRUE),
  ('Priya',      'Sharma',     'priya.sharma@university.edu',      '2021-08-18', 'Data Science',            3.92, 2025, TRUE),
  ('Carlos',     'Mendez',     'carlos.mendez@university.edu',     '2023-01-10', 'Mathematics',             3.45, 2027, TRUE),
  ('Yuki',       'Tanaka',     'yuki.tanaka@university.edu',       '2022-08-20', 'Physics',                 3.78, 2026, TRUE),
  ('Fatima',     'Al-Rashid',  'fatima.alrashid@university.edu',   '2021-08-18', 'Computer Science',        3.95, 2025, TRUE),
  ('Liam',       'O''Brien',   'liam.obrien@university.edu',       '2023-08-22', 'Software Engineering',    3.55, 2027, TRUE),
  ('Sophie',     'Dubois',     'sophie.dubois@university.edu',     '2022-01-12', 'Artificial Intelligence', 3.88, 2026, TRUE),
  ('Marcus',     'Washington', 'marcus.washington@university.edu', '2021-01-15', 'Information Systems',     3.62, 2025, TRUE),
  ('Anya',       'Petrova',    'anya.petrova@university.edu',      '2023-08-22', 'Cybersecurity',           3.71, 2027, TRUE),
  ('Raj',        'Patel',      'raj.patel@university.edu',         '2022-08-20', 'Computer Engineering',    3.89, 2026, TRUE),
  ('Emma',       'Johansson',  'emma.johansson@university.edu',    '2021-08-18', 'Statistics',              3.94, 2025, TRUE),
  ('Kofi',       'Asante',     'kofi.asante@university.edu',       '2023-01-10', 'Computer Science',        3.50, 2027, TRUE),
  ('Maria',      'Gonzalez',   'maria.gonzalez@university.edu',    '2022-01-12', 'Data Science',            3.76, 2026, TRUE),
  ('Ahmed',      'Hassan',     'ahmed.hassan@university.edu',      '2021-01-15', 'Mathematics',             3.83, 2025, TRUE),
  ('Chloe',      'Martin',     'chloe.martin@university.edu',     '2023-08-22', 'Computer Science',        3.67, 2027, TRUE),
  ('Tao',        'Zhang',      'tao.zhang@university.edu',         '2022-08-20', 'Machine Learning',        3.91, 2026, TRUE),
  ('Isabella',   'Rossi',      'isabella.rossi@university.edu',    '2021-08-18', 'Software Engineering',    3.58, 2025, TRUE),
  ('Noah',       'Williams',   'noah.williams@university.edu',     '2023-01-10', 'Computer Science',        3.44, 2027, TRUE),
  ('Aisha',      'Mohammed',   'aisha.mohammed@university.edu',    '2022-01-12', 'Artificial Intelligence', 3.87, 2026, TRUE),
  ('Lucas',      'Silva',      'lucas.silva@university.edu',       '2021-01-15', 'Data Engineering',        3.72, 2025, TRUE),
  ('Hannah',     'Mueller',    'hannah.mueller@university.edu',    '2023-08-22', 'Cybersecurity',           3.65, 2027, TRUE),
  ('David',      'Park',       'david.park@university.edu',        '2022-08-20', 'Computer Science',        3.80, 2026, TRUE)
ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. SEED DATA — PROJECTS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO projects (name, description, department_id, start_date, end_date, status, budget) VALUES
  ('Cloud Migration',         'Migrate all on-premise services to AWS cloud infrastructure',                  1, '2024-01-15', '2024-12-31', 'active',    850000.00),
  ('Customer Portal v2',      'Redesign and rebuild the customer-facing portal with React',                   1, '2024-03-01', '2024-09-30', 'active',    420000.00),
  ('Brand Refresh Campaign',  'Complete rebranding including new logo, website, and marketing materials',      2, '2024-02-01', '2024-06-30', 'completed', 250000.00),
  ('Q3 Product Launch',       'Marketing campaign for the new enterprise product launch',                      2, '2024-07-01', '2024-09-30', 'planning',  180000.00),
  ('Employee Wellness Program','Design and implement a comprehensive employee wellness initiative',            3, '2024-04-01', '2024-12-31', 'active',     95000.00),
  ('ERP Integration',         'Integrate SAP ERP system with internal financial tools',                        4, '2024-01-01', '2024-08-31', 'active',    620000.00),
  ('AI Sales Forecasting',    'Build ML-powered sales forecasting model using historical data',                5, '2024-05-01', '2024-11-30', 'active',    340000.00),
  ('Quantum Computing Research','Exploratory research into quantum computing applications for optimization',   6, '2024-06-01', '2025-06-01', 'active',   1200000.00),
  ('Chatbot v3',              'Next-gen customer support chatbot with LLM integration',                        7, '2024-03-15', '2024-10-31', 'active',    275000.00),
  ('GDPR Compliance Audit',   'Full audit and remediation of GDPR compliance across all systems',              8, '2024-02-15', '2024-07-31', 'completed', 150000.00)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. SEED DATA — PROJECT ASSIGNMENTS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO project_assignments (project_id, employee_id, role, assigned_date, hours_allocated) VALUES
  (1, 2,  'Project Lead',        '2024-01-15', 40),
  (1, 3,  'Infrastructure Lead', '2024-01-15', 40),
  (1, 5,  'Backend Developer',   '2024-02-01', 30),
  (2, 1,  'Senior Developer',    '2024-03-01', 35),
  (2, 4,  'Frontend Lead',       '2024-03-01', 40),
  (3, 6,  'Campaign Director',   '2024-02-01', 30),
  (3, 7,  'Content Lead',        '2024-02-01', 25),
  (3, 8,  'SEO Lead',            '2024-02-15', 20),
  (5, 9,  'Program Director',    '2024-04-01', 20),
  (5, 10, 'Coordinator',         '2024-04-01', 15),
  (6, 12, 'Project Sponsor',     '2024-01-01', 10),
  (6, 13, 'Financial Systems',   '2024-01-15', 35),
  (7, 15, 'Sales Lead',          '2024-05-01', 15),
  (7, 19, 'Data Scientist',      '2024-05-01', 40),
  (7, 20, 'ML Engineer',         '2024-05-15', 35),
  (8, 18, 'Research Lead',       '2024-06-01', 40),
  (8, 19, 'Data Analysis',       '2024-06-01', 20),
  (9, 21, 'Support Lead',        '2024-03-15', 30),
  (9, 22, 'QA Tester',           '2024-04-01', 25),
  (10, 24, 'Legal Lead',         '2024-02-15', 35),
  (10, 25, 'Compliance Officer', '2024-02-15', 30)
ON CONFLICT (project_id, employee_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. SEED DATA — USER PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────────────
-- Give the demo 'user' account (user_jessica, id=3) SELECT on employees and departments

INSERT INTO user_permissions (user_id, table_name, can_select, can_insert, can_update, can_delete, can_export, granted_by) VALUES
  (3, 'employees',   TRUE, FALSE, FALSE, FALSE, TRUE, 1),
  (3, 'departments', TRUE, FALSE, FALSE, FALSE, TRUE, 1)
ON CONFLICT (user_id, table_name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. PROTECT AUDIT_LOGS — REVOKE UPDATE/DELETE
-- ─────────────────────────────────────────────────────────────────────────────
-- Ensure no app-level role can UPDATE or DELETE from audit_logs.
-- This is enforced at the database level as an additional safeguard.

-- Revoke DELETE and UPDATE on audit_logs from all roles except superuser
DO $$
BEGIN
  -- Revoke from the anon and authenticated roles (Supabase defaults)
  EXECUTE 'REVOKE UPDATE, DELETE ON audit_logs FROM anon';
  EXECUTE 'REVOKE UPDATE, DELETE ON audit_logs FROM authenticated';
EXCEPTION
  WHEN OTHERS THEN
    -- Roles may not exist in all environments; ignore errors
    NULL;
END;
$$;

-- Create a policy that prevents DELETE on audit_logs (if RLS is enabled)
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY audit_logs_no_delete ON audit_logs FOR DELETE USING (FALSE);
-- CREATE POLICY audit_logs_no_update ON audit_logs FOR UPDATE USING (FALSE);
-- CREATE POLICY audit_logs_insert_only ON audit_logs FOR INSERT WITH CHECK (TRUE);
-- CREATE POLICY audit_logs_select_admin ON audit_logs FOR SELECT USING (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- DONE. Your database is now seeded and ready.
-- ─────────────────────────────────────────────────────────────────────────────

-- SUMMARY:
-- ├── app_users:           3 users (admin_sarah, dba_michael, user_jessica)
-- ├── user_permissions:    2 records (user_jessica: SELECT on employees, departments)
-- ├── departments:         8 departments
-- ├── employees:          25 employees across all departments
-- ├── salaries:           25 salary records
-- ├── students:           22 students with diverse majors
-- ├── projects:           10 projects with realistic descriptions
-- ├── project_assignments: 21 assignments linking employees to projects
-- └── Functions:           execute_raw_sql, get_schema_tables
--
-- Default credentials (all accounts):
--   Password: password123

