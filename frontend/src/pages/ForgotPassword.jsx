import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Key, Mail, Lock, CheckCircle2 } from 'lucide-react'
import api from '../services/api'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-base p-4">
      <Card className="w-full max-w-md p-6 sm:p-8 bg-surface shadow-xl border-muted">
        
        {/* STEP: EMAIL */}
        {step === 'email' && (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Key className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Forgot your password?</h2>
              <p className="text-text-secondary text-sm">Enter your email and we'll send you a reset code.</p>
            </div>
            <form onSubmit={handleRequestReset} className="flex flex-col gap-5">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
              {error && <div className="p-3 bg-danger/10 border border-danger/30 rounded-md text-sm text-danger">{error}</div>}
              <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
                Send Reset Code →
              </Button>
            </form>
            <div className="text-center mt-6">
              <Link to="/login" className="text-sm text-text-secondary hover:text-primary transition-colors">
                ← Back to login
              </Link>
            </div>
          </>
        )}

        {/* STEP: OTP */}
        {step === 'otp' && (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Check your email</h2>
              <p className="text-text-secondary text-sm">
                We sent a 6-digit code to <strong className="text-text-primary">{email}</strong>.
                Enter it below to continue.
              </p>
            </div>
            
            <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  className={`w-12 h-14 text-center text-xl font-semibold bg-surface border rounded-[var(--radius-md)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors ${digit ? 'border-primary text-text-primary' : 'border-muted text-text-primary'}`}
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
            
            {error && <div className="p-3 bg-danger/10 border border-danger/30 rounded-md text-sm text-danger mb-4">{error}</div>}
            
            <Button
              onClick={handleVerifyOTP}
              variant="primary"
              className="w-full mb-4"
              isLoading={loading}
              disabled={otp.join('').length !== 6}
            >
              Verify Code →
            </Button>
            
            <div className="text-center mb-4">
              {resendCooldown > 0
                ? <span className="text-sm text-text-muted">Resend in {resendCooldown}s</span>
                : <button className="text-sm text-primary hover:underline focus:outline-none" onClick={handleResend}>Resend code</button>
              }
            </div>
            
            <div className="text-center">
              <button className="text-sm text-text-secondary hover:text-primary transition-colors focus:outline-none" onClick={() => setStep('email')}>
                ← Use a different email
              </button>
            </div>
          </>
        )}

        {/* STEP: NEW PASSWORD */}
        {step === 'reset' && (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Set new password</h2>
              <p className="text-text-secondary text-sm">Choose a strong password you haven't used before.</p>
            </div>
            <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
              <div className="relative">
                <Input
                  label="New Password"
                  type={showNew ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
                <button type="button" className="absolute right-3 top-[34px] text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                  onClick={() => setShowNew(v => !v)}>
                  {showNew ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
                {newPassword.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 flex gap-1 h-1.5">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="flex-1 rounded-full transition-colors"
                          style={{ background: i <= strength.score ? strength.color : 'var(--border-muted)' }}
                        />
                      ))}
                    </div>
                    <span style={{ color: strength.color, fontSize: '11px' }} className="w-12 text-right">{strength.label}</span>
                  </div>
                )}
              </div>
              
              <div className="relative">
                <Input
                  label="Confirm Password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
                <button type="button" className="absolute right-3 top-[34px] text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                  onClick={() => setShowConfirm(v => !v)}>
                  {showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
                {confirmPassword.length > 0 && (
                  <p className="text-[11px] mt-1" style={{
                    color: newPassword === confirmPassword ? 'var(--semantic-success)' : 'var(--semantic-danger)'
                  }}>
                    {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Do not match'}
                  </p>
                )}
              </div>
              
              {error && <div className="p-3 bg-danger/10 border border-danger/30 rounded-md text-sm text-danger">{error}</div>}
              
              <Button
                variant="primary"
                type="submit"
                className="w-full mt-2"
                isLoading={loading}
                disabled={strength.score < 2 || newPassword !== confirmPassword}
              >
                Reset Password →
              </Button>
            </form>
          </>
        )}

        {/* STEP: DONE */}
        {step === 'done' && (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">Password reset!</h2>
            <p className="text-text-secondary text-sm mb-8">Your password has been updated successfully. You can now sign in with your new password.</p>
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Go to Login →
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
