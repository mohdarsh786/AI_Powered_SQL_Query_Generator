import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import api from '../services/api'
import '../styles/ForgotPassword.css'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const otpRefs = useRef([])

  const [step, setStep] = useState('email') // 'email' | 'otp' | 'reset' | 'done'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const startCooldown = () => {
    setResendCooldown(60)
    const t = setInterval(() => {
      setResendCooldown(p => { if (p <= 1) { clearInterval(t); return 0 } return p - 1 })
    }, 1000)
  }

  // Step 1 — Request OTP
  const handleRequestReset = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setStep('otp')
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // OTP handlers
  const handleOtpChange = (i, value) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[i] = value.slice(-1)
    setOtp(next)
    if (value && i < 5) otpRefs.current[i + 1]?.focus()
  }

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus()
  }

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (paste.length === 6) {
      setOtp(paste.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  // Step 2 — Verify OTP
  const handleVerifyOTP = async () => {
    const code = otp.join('')
    if (code.length !== 6) { setError('Enter all 6 digits.'); return }
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/verify-reset-otp', { email, otp: code })
      setStep('reset')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code.')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResend = async () => {
    try {
      await api.post('/api/auth/forgot-password', { email })
      setOtp(['', '', '', '', '', ''])
      setError('')
      startCooldown()
      otpRefs.current[0]?.focus()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend.')
    }
  }

  // Password strength
  const getStrength = (pwd) => {
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

  // Step 3 — Reset password
  const handleResetPassword = async (e) => {
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
    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', { newPassword, confirmPassword })
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fp-page">
      <div className="fp-card">

        {/* STEP: EMAIL */}
        {step === 'email' && (
          <>
            <div className="fp-header">
              <div className="fp-icon">🔑</div>
              <h2>Forgot your password?</h2>
              <p>Enter your email and we'll send you a reset code.</p>
            </div>
            <form onSubmit={handleRequestReset} className="fp-form">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && <div className="fp-error">⚠ {error}</div>}
              <button className="btn-fp-primary" type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Code →'}
              </button>
            </form>
            <Link to="/login" className="fp-back-link">← Back to login</Link>
          </>
        )}

        {/* STEP: OTP */}
        {step === 'otp' && (
          <>
            <div className="fp-header">
              <div className="fp-icon">✉</div>
              <h2>Check your email</h2>
              <p>
                We sent a 6-digit code to <strong>{email}</strong>.
                Enter it below to continue.
              </p>
            </div>
            <div className="otp-inputs" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  className={`otp-input ${digit ? 'filled' : ''}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            {error && <div className="fp-error">⚠ {error}</div>}
            <button
              className="btn-fp-primary"
              onClick={handleVerifyOTP}
              disabled={loading || otp.join('').length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify Code →'}
            </button>
            <div className="fp-resend">
              {resendCooldown > 0
                ? <span>Resend in {resendCooldown}s</span>
                : <button className="btn-resend" onClick={handleResend}>Resend code</button>
              }
            </div>
            <button className="btn-fp-ghost" onClick={() => setStep('email')}>
              ← Use a different email
            </button>
          </>
        )}

        {/* STEP: NEW PASSWORD */}
        {step === 'reset' && (
          <>
            <div className="fp-header">
              <div className="fp-icon">🔒</div>
              <h2>Set new password</h2>
              <p>Choose a strong password you haven't used before.</p>
            </div>
            <form onSubmit={handleResetPassword} className="fp-form">
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
                  <button type="button" className="password-toggle"
                    onClick={() => setShowNew(v => !v)}>
                    {showNew ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div className="strength-row">
                    <div className="strength-bar">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="strength-seg"
                          style={{ background: i <= strength.score ? strength.color : 'var(--border-default)' }}
                        />
                      ))}
                    </div>
                    <span style={{ color: strength.color, fontSize: '11px' }}>{strength.label}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="password-wrapper">
                  <input
                    className="form-input"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="password-toggle"
                    onClick={() => setShowConfirm(v => !v)}>
                    {showConfirm ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p style={{
                    fontSize: '11px', marginTop: '4px',
                    color: newPassword === confirmPassword
                      ? 'var(--accent-emerald)' : 'var(--accent-red)'
                  }}>
                    {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Do not match'}
                  </p>
                )}
              </div>
              {error && <div className="fp-error">⚠ {error}</div>}
              <button
                className="btn-fp-primary"
                type="submit"
                disabled={loading || strength.score < 2 || newPassword !== confirmPassword}
              >
                {loading ? 'Resetting...' : 'Reset Password →'}
              </button>
            </form>
          </>
        )}

        {/* STEP: DONE */}
        {step === 'done' && (
          <div className="fp-done">
            <div className="fp-done-icon">✓</div>
            <h2>Password reset!</h2>
            <p>Your password has been updated successfully. You can now sign in with your new password.</p>
            <button
              className="btn-fp-primary"
              onClick={() => navigate('/login')}
            >
              Go to Login →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
