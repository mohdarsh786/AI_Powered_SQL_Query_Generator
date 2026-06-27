import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, Zap, Database, BarChart2, Clock, Link2, CheckCircle } from 'lucide-react'
import '../styles/landing.css'

const fullCode = `/* User Intent: Find top paying customers this month */
SELECT c.id, c.name, SUM(o.total)
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE o.created_at >= '2023-10-01'
GROUP BY c.id, c.name
ORDER BY SUM(o.total) DESC
LIMIT 10;`

export default function LandingPage() {
  const navigate = useNavigate()
  const [typedCode, setTypedCode] = useState('')

  // Typewriter effect
  useEffect(() => {
    let currentIdx = 0
    let isTyping = true
    let timeoutId = null

    const type = () => {
      if (isTyping) {
        if (currentIdx < fullCode.length) {
          setTypedCode(fullCode.substring(0, currentIdx + 1))
          currentIdx++
          timeoutId = setTimeout(type, 28)
        } else {
          isTyping = false
          timeoutId = setTimeout(type, 3500)
        }
      } else {
        setTypedCode('')
        currentIdx = 0
        isTyping = true
        timeoutId = setTimeout(type, 400)
      }
    }

    timeoutId = setTimeout(type, 600)
    return () => clearTimeout(timeoutId)
  }, [])

  const getHighlightedCode = () => {
    let html = typedCode
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    html = html
      .replace(/\b(SELECT|FROM|JOIN|ON|WHERE|GROUP BY|ORDER BY|DESC|LIMIT|BY)\b/g, '<span class="sql-keyword">$&</span>')
      .replace(/\b(SUM|COUNT|AVG|MAX|MIN)\b/g, '<span class="sql-fn">$&</span>')
      .replace(/'[^']*'/g, '<span class="sql-string">$&</span>')
      .replace(/\/\*[\s\S]*?\*\//g, '<span class="sql-comment">$&</span>')
    return { __html: html }
  }

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const features = [
    {
      icon: <Brain size={24} />,
      color: 'var(--accent-blue)',
      borderColor: 'var(--accent-blue)',
      bgHover: 'rgba(37,99,235,0.15)',
      title: 'Context-Aware AI',
      desc: 'Pro-level AI automatically aligns with your existing schemas and optimizes queries to standard SQL.',
    },
    {
      icon: <Zap size={24} />,
      color: '#38bdf8',
      borderColor: '#38bdf8',
      bgHover: 'rgba(56,189,248,0.15)',
      title: 'Instant Optimization',
      desc: 'Generates instant optimization metrics, monitoring runtime complexity to save execution time.',
    },
    {
      icon: <Database size={24} />,
      color: 'var(--accent-emerald)',
      borderColor: 'var(--accent-emerald)',
      bgHover: 'rgba(16,185,129,0.15)',
      title: 'Visual Schema Mapping',
      desc: 'Customizable visual schema mapping to audit your dimensions and preview relationships.',
    },
    {
      icon: <BarChart2 size={24} />,
      color: 'var(--accent-purple)',
      borderColor: 'var(--accent-purple)',
      bgHover: 'rgba(167,139,250,0.15)',
      title: 'Anomaly Detection',
      desc: 'Incorporates smart data anomaly detection and alerts for irregular query patterns.',
    },
    {
      icon: <Clock size={24} />,
      color: 'var(--accent-amber)',
      borderColor: 'var(--accent-amber)',
      bgHover: 'rgba(245,158,11,0.15)',
      title: 'Query Versioning',
      desc: 'Query versioning tracks changes over time and allows instant rollback to previous states.',
    },
    {
      icon: <Link2 size={24} />,
      color: 'var(--accent-red)',
      borderColor: 'var(--accent-red)',
      bgHover: 'rgba(244,63,94,0.15)',
      title: 'API Integration',
      desc: 'Seamlessly integrate generated SQL via API endpoints into your existing enterprise data stack.',
    },
  ]

  return (
    <div className="landing-root">
      {/* Atmospheric Background Blurs */}
      <div className="landing-bg-blur landing-bg-blur--1" />
      <div className="landing-bg-blur landing-bg-blur--2" />

      {/* ── TOP NAV ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">SQL Intel</div>

          <div className="landing-nav-links">
            <button onClick={() => scrollTo('features')}>Features</button>
            <button onClick={() => scrollTo('security')}>Security</button>
            <button onClick={() => scrollTo('roles')}>Roles</button>
          </div>

          <button className="landing-btn-signin" onClick={() => navigate('/login')}>
            Sign In →
          </button>
        </div>
      </nav>

      {/* ── HERO — two-column ── */}
      <section className="landing-hero">
        {/* Left: copy */}
        <div className="landing-hero-copy">
          <div className="landing-hero-badge">
            <CheckCircle size={14} />
            Production-ready SQL at the speed of thought
          </div>

          <h1 className="landing-hero-h1">
            Query at the<br />
            <span className="landing-hero-gradient">Speed of Thought</span>
          </h1>

          <p className="landing-hero-sub">
            Translate plain English into optimized, production-ready SQL with AI guidance
            designed for data engineers and cloud architects.
          </p>

          <div className="landing-hero-ctas">
            <button className="landing-btn-primary" onClick={() => navigate('/login')}>
              Start Querying Now
            </button>
            <button className="landing-btn-ghost" onClick={() => scrollTo('features')}>
              View Features
            </button>
          </div>

          {/* Trust pills */}
          <div className="landing-trust-pills">
            <span className="trust-pill"> RBAC Security</span>
            <span className="trust-pill"> AI-Powered</span>
            <span className="trust-pill"> Live Execution</span>
            <span className="trust-pill"> Audit Logs</span>
          </div>
        </div>

        {/* Right: code window */}
        <div className="landing-hero-visual">
          <div className="code-window">
            <div className="code-window-bar">
              <span className="dot dot--red" />
              <span className="dot dot--amber" />
              <span className="dot dot--green" />
              <span className="code-window-title">query_generator.sql</span>
            </div>
            <div className="code-window-body">
              <pre className="code-content">
                <code dangerouslySetInnerHTML={getHighlightedCode()} />
                <span className="cursor-blink">|</span>
              </pre>
              {typedCode.length === fullCode.length && (
                <div className="code-result-badge">
                  <CheckCircle size={14} />
                  Execution Time: 42ms · Optimized
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="landing-features" id="features">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Engineered for Precision</h2>
          <p className="landing-section-sub">Tools designed to keep you in the flow state</p>
        </div>

        <div className="landing-features-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card" style={{ '--card-accent': f.borderColor }}>
              <div className="feature-icon" style={{ color: f.color, background: f.bgHover }}>
                {f.icon}
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECURITY section anchor ── */}
      <div id="security" />
      {/* ── ROLES section anchor ── */}
      <div id="roles" />

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <div className="landing-footer-logo">SQL Intelligence</div>
            <div className="landing-footer-copy">
              © 2026 SQL Intelligence Systems. All rights reserved.
            </div>
          </div>
          <div className="landing-footer-links">
            <a href="#security">Security</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Changelog</a>
            <a href="#">Status</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
