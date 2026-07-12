import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Check, X, Loader } from 'lucide-react'
import api from '../services/api'
import './Register.css'

export default function Register() {
  const navigate = useNavigate()
  const domainCheckTimer = useRef(null)
  const orgNameCheckTimer = useRef(null)

  const [step, setStep] = useState('form') // 'form' | 'otp'
  const [showOrgModal, setShowOrgModal] = useState(false)

  // Form state
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  // Org state
  const [org, setOrg] = useState({ name: '', domain: '' })
  const [orgCreated, setOrgCreated] = useState(false)

  // Availability state
  const [domainStatus, setDomainStatus] = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const [orgNameStatus, setOrgNameStatus] = useState(null)

  // UI state
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const otpRefs = useRef([])

  // Domain availability check — 1s debounce
  const handleDomainChange = (value) => {
    setOrg(o => ({ ...o, domain: value }))
    setDomainStatus('checking')
    clearTimeout(domainCheckTimer.current)
    if (!value.trim()) { setDomainStatus(null); return }
    domainCheckTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/api/auth/check-domain?domain=${encodeURIComponent(value)}`)
        setDomainStatus(res.data.available ? 'available' : 'taken')
      } catch {
        setDomainStatus('invalid')
      }
    }, 1000)
  }

  // Org name availability check — 1s debounce
  const handleOrgNameChange = (value) => {
    setOrg(o => ({ ...o, name: value }))
    setOrgNameStatus('checking')
    clearTimeout(orgNameCheckTimer.current)
    if (!value.trim()) { setOrgNameStatus(null); return }
    orgNameCheckTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/api/auth/check-org-name?name=${encodeURIComponent(value)}`)
        setOrgNameStatus(res.data.available ? 'available' : 'taken')
      } catch {
        setOrgNameStatus('invalid')
      }
    }, 1000)
  }

  const handleCreateOrg = () => {
    if (orgNameStatus !== 'available' || domainStatus !== 'available') return
    setOrgCreated(true)
    setShowOrgModal(false)
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

  const strength = getStrength(form.password)

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    if (!orgCreated) {
      setError('Please create an organisation first.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/auth/register', {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        orgName: org.name,
        allowedDomain: org.domain
      })
      setStep('otp')
      startResendCooldown()
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (paste.length === 6) {
      setOtp(paste.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  const startResendCooldown = () => {
    setResendCooldown(60)
    const timer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleResend = async () => {
    try {
      await api.post('/api/auth/resend-otp', { email: form.email })
      startResendCooldown()
      setOtpError('')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to resend.')
    }
  }

  const handleVerifyOTP = async () => {
    const code = otp.join('')
    if (code.length !== 6) {
      setOtpError('Please enter all 6 digits.')
      return
    }
    setVerifying(true)
    setOtpError('')
    try {
      const res = await api.post('/api/auth/verify-otp', {
        email: form.email,
        otp: code
      })
      const role = res.data?.user?.role
      if (role === 'admin') navigate('/admin/dashboard')
      else navigate('/login')
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Verification failed.')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setVerifying(false)
    }
  }

  const StatusIcon = ({ status }) => {
    if (status === 'checking') return <Loader size={14} className="spin" />
    if (status === 'available') return <Check size={14} color="var(--accent-emerald)" />
    if (status === 'taken') return <X size={14} color="var(--accent-red)" />
    return null
  }

  return (
    <div className="register-page">
      {step === 'form' ? (
        <div className="register-container">
          <div className="register-header">
            <div className="register-logo">⊞ SQL Intelligence</div>
            <h1>Create your organisation</h1>
            <p>Set up your team's intelligent SQL workspace</p>
          </div>

          <form className="register-form" onSubmit={handleRegister}>
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="John Doe"
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                required
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Work Email</label>
              <input
                className="form-input"
                type="email"
                placeholder={orgCreated ? `you@${org.domain}` : 'you@company.com'}
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
              {orgCreated && (
                <p className="form-hint">
                  Must use @{org.domain} domain
                </p>
              )}
            </div>

            {/* Organisation */}
            <div className="form-group">
              <label className="form-label">Organisation</label>
              <div className="org-input-row">
                <input
                  className="form-input org-input"
                  type="text"
                  placeholder="No organisation created yet"
                  value={orgCreated ? org.name : ''}
                  readOnly
                  disabled={!orgCreated}
                  style={{ opacity: orgCreated ? 1 : 0.5 }}
                />
                {orgCreated ? (
                  <button
                    type="button"
                    className="btn-org-edit"
                    onClick={() => { setOrgCreated(false); setShowOrgModal(true) }}
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-org-create"
                    onClick={() => setShowOrgModal(true)}
                  >
                    ⊕ Create Org
                  </button>
                )}
              </div>
              {orgCreated && (
                <p className="form-hint success">
                  ✓ {org.name} · @{org.domain}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-wrapper">
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button type="button" className="password-toggle"
                  onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              {form.password.length > 0 && (
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

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="password-wrapper">
                <input
                  className="form-input"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  required
                />
                <button type="button" className="password-toggle"
                  onClick={() => setShowConfirm(v => !v)}>
                  {showConfirm ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              {form.confirmPassword.length > 0 && (
                <p style={{
                  fontSize: '11px', marginTop: '4px',
                  color: form.password === form.confirmPassword
                    ? 'var(--accent-emerald)' : 'var(--accent-red)'
                }}>
                  {form.password === form.confirmPassword ? '✓ Passwords match' : '✗ Do not match'}
                </p>
              )}
            </div>

            {error && <div className="register-error">⚠ {error}</div>}

            <button
              className="btn-register"
              type="submit"
              disabled={loading || !orgCreated}
            >
              {loading ? 'Sending verification code...' : 'Create Organisation →'}
            </button>

            <p className="register-login-link">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      ) : (
        /* OTP VERIFICATION */
        <div className="otp-container">
          <div className="otp-card">
            <div className="otp-icon">✉</div>
            <h2>Check your email</h2>
            <p>
              We sent a 6-digit code to <strong>{form.email}</strong>.
              Enter it below to verify your account.
            </p>

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

            {otpError && <div className="otp-error">⚠ {otpError}</div>}

            <button
              className="btn-verify"
              onClick={handleVerifyOTP}
              disabled={verifying || otp.join('').length !== 6}
            >
              {verifying ? 'Verifying...' : 'Verify & Create Organisation →'}
            </button>

            <div className="otp-resend">
              {resendCooldown > 0 ? (
                <span>Resend in {resendCooldown}s</span>
              ) : (
                <button className="btn-resend" onClick={handleResend}>
                  Resend code
                </button>
              )}
            </div>

            <button
              className="btn-back"
              onClick={() => { setStep('form'); setOtp(['','','','','','']) }}
            >
              ← Back to registration
            </button>
          </div>
        </div>
      )}

      {/* ORG CREATION MODAL */}
      {showOrgModal && (
        <div className="modal-overlay" onClick={() => setShowOrgModal(false)}>
          <div className="modal-card org-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Organisation</h3>
              <button className="modal-close" onClick={() => setShowOrgModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Org Name */}
              <div className="form-group">
                <label className="form-label">Organisation Name</label>
                <div className="input-with-status">
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Acme Corp"
                    value={org.name}
                    onChange={e => handleOrgNameChange(e.target.value)}
                  />
                  <span className="input-status"><StatusIcon status={orgNameStatus} /></span>
                </div>
                {orgNameStatus === 'available' && (
                  <p className="form-hint success">✓ Name is available</p>
                )}
                {orgNameStatus === 'taken' && (
                  <p className="form-hint error">✗ Name already taken</p>
                )}
              </div>

              {/* Allowed Domain */}
              <div className="form-group">
                <label className="form-label">Allowed Email Domain</label>
                <div className="input-with-status domain-input-wrapper">
                  <span className="domain-prefix">@</span>
                  <input
                    className="form-input domain-input"
                    type="text"
                    placeholder="acme.com"
                    value={org.domain}
                    onChange={e => handleDomainChange(e.target.value)}
                  />
                  <span className="input-status"><StatusIcon status={domainStatus} /></span>
                </div>
                {domainStatus === 'available' && (
                  <p className="form-hint success">✓ Domain is available</p>
                )}
                {domainStatus === 'taken' && (
                  <p className="form-hint error">✗ Domain already registered</p>
                )}
                <p className="form-hint">
                  Only emails ending in @{org.domain || 'yourdomain.com'} can join this org
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowOrgModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateOrg}
                disabled={orgNameStatus !== 'available' || domainStatus !== 'available'}
              >
                Create Organisation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
