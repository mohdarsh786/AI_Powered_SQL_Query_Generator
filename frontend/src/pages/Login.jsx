import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import api from '../services/api'
import '../styles/login.css'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/api/auth/login', { username, password })

      // Check if password change is required
      if (res.data?.requiresPasswordChange) {
        navigate('/change-password')
        return
      }

      // Normal login — redirect by role
      const role = res.data?.user?.role || res.data?.role
      if (role === 'admin') navigate('/admin/dashboard')
      else if (role === 'dba') navigate('/dba/dashboard')
      else navigate('/user/dashboard')
    } catch (err) {
      const apiError = err.response?.data?.error || err.response?.data?.message;
      const finalMsg = apiError || (err.message === 'Network Error' ? 'Cannot connect to backend server' : 'Invalid username or password');
      setError(finalMsg);
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* LEFT */}
      <div className="login-left">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-left-content">
          <h1 className="login-hero-title">
            Intelligence meets <span>SQL</span>
          </h1>
          <div className="login-pills">
            <span className="login-pill"> RBAC</span>
            <span className="login-pill"> AI-Powered</span>
            <span className="login-pill"> Live Execution</span>
            <span className="login-pill"> Audit Logs</span>
          </div>
          <div className="login-roles">
            <span className="login-role-pill">
              <span className="login-role-dot" style={{ background: '#10b981' }} />
              Admin
            </span>
            <span className="login-role-pill">
              <span className="login-role-dot" style={{ background: '#f59e0b' }} />
              DBA
            </span>
            <span className="login-role-pill">
              <span className="login-role-dot" style={{ background: '#2563eb' }} />
              User
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-logo">⊞ SQL Intelligence</div>
            <h2>Welcome back</h2>
            <p>Sign in to your workspace</p>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-wrapper">
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <div className="login-error">{error}</div>}
            <button className="btn-login" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
          <p className="login-footer-note">
            Accounts are managed by your administrator
          </p>
        </div>
      </div>
    </div>
  )
}
