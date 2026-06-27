import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import api from '../services/api'
import './ChangePassword.css'

export default function ChangePassword() {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Password strength checker
  const getStrength = (pwd) => {
    if (pwd.length === 0) return { score: 0, label: '', color: '' }
    let score = 0
    if (pwd.length >= 8) score++
    if (pwd.length >= 12) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    if (score <= 1) return { score, label: 'Weak', color: 'var(--accent-red)' }
    if (score <= 3) return { score, label: 'Moderate', color: 'var(--accent-amber)' }
    return { score, label: 'Strong', color: 'var(--accent-emerald)' }
  }

  const strength = getStrength(newPassword)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword === 'password123') {
      setError('You cannot reuse the default password.')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/api/auth/change-password', {
        newPassword,
        confirmPassword
      })

      // Password changed — now we have real JWT, redirect by role
      const role = res.data?.user?.role || res.data?.role
      if (role === 'admin') navigate('/admin/dashboard')
      else if (role === 'dba') navigate('/dba/dashboard')
      else navigate('/user/dashboard')

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="change-password-page">
      <div className="change-password-card">

        {/* Header */}
        <div className="cp-header">
          <div className="cp-icon">
            <ShieldCheck size={28} color="var(--accent-emerald)" />
          </div>
          <h2>Set Your Password</h2>
          <p>
            This is your first login. For security, you must set a
            new password before accessing the platform.
          </p>
        </div>

        {/* Security notice */}
        <div className="cp-notice">
          <span>🔒</span>
          <span>Default credentials are disabled after this step. Your new password is stored as a secure bcrypt hash.</span>
        </div>

        {/* Form */}
        <form className="cp-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="password-wrapper">
              <input
                className="form-input"
                type={showNew ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                autoFocus
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNew(v => !v)}
              >
                {showNew ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>

            {/* Strength indicator */}
            {newPassword.length > 0 && (
              <div className="cp-strength">
                <div className="cp-strength-bar">
                  {[1,2,3,4,5].map(i => (
                    <div
                      key={i}
                      className="cp-strength-segment"
                      style={{
                        background: i <= strength.score
                          ? strength.color
                          : 'var(--border-default)'
                      }}
                    />
                  ))}
                </div>
                <span style={{ color: strength.color, fontSize: '11px' }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="password-wrapper">
              <input
                className="form-input"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat your new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirm(v => !v)}
              >
                {showConfirm ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
            {/* Match indicator */}
            {confirmPassword.length > 0 && (
              <p style={{
                fontSize: '11px',
                marginTop: '4px',
                color: newPassword === confirmPassword
                  ? 'var(--accent-emerald)'
                  : 'var(--accent-red)'
              }}>
                {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>

          {error && (
            <div className="cp-error">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <button
            className="btn-cp-submit"
            type="submit"
            disabled={loading || strength.score < 2 || newPassword !== confirmPassword}
          >
            {loading ? 'Setting password...' : 'Set Password & Enter Platform →'}
          </button>
        </form>

        {/* Requirements */}
        <div className="cp-requirements">
          <p className="cp-req-title">Password requirements:</p>
          <p className={newPassword.length >= 8 ? 'cp-req met' : 'cp-req'}>
            {newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
          </p>
          <p className={/[A-Z]/.test(newPassword) ? 'cp-req met' : 'cp-req'}>
            {/[A-Z]/.test(newPassword) ? '✓' : '○'} One uppercase letter
          </p>
          <p className={/[0-9]/.test(newPassword) ? 'cp-req met' : 'cp-req'}>
            {/[0-9]/.test(newPassword) ? '✓' : '○'} One number
          </p>
          <p className={newPassword !== 'password123' && newPassword.length > 0 ? 'cp-req met' : 'cp-req'}>
            {newPassword !== 'password123' && newPassword.length > 0 ? '✓' : '○'} Not the default password
          </p>
        </div>

      </div>
    </div>
  )
}
