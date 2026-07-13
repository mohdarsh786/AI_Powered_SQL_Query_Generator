import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Database, Shield, Zap, Activity } from 'lucide-react'
import api from '../services/api'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

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

      if (res.data?.requiresPasswordChange) {
        navigate('/change-password')
        return
      }

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
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-base overflow-hidden">
      {/* LEFT: Decorative Panel */}
      <div className="relative hidden md:flex flex-col items-center justify-center p-12 bg-surface border-r border-muted overflow-hidden">
        {/* Background Orbs */}
        <div className="absolute w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] -bottom-20 -left-20 pointer-events-none" />
        <div className="absolute w-[300px] h-[300px] bg-secondary/20 rounded-full blur-[80px] -top-10 -right-10 pointer-events-none" />
        
        <div className="relative z-10 text-center flex flex-col items-center">
          <div className="flex items-center gap-2 text-primary mb-6 font-mono text-lg font-bold">
            <Database className="w-6 h-6" /> SQL Intelligence
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-8 text-text-primary">
            Intelligence meets <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">SQL</span>
          </h1>
          
          <div className="flex flex-wrap gap-3 justify-center mb-10 max-w-md">
            <div className="flex items-center gap-2 px-4 py-2 bg-card border border-muted rounded-full text-[var(--text-caption)] text-text-secondary shadow-sm">
              <Shield className="w-4 h-4 text-primary" /> RBAC
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-card border border-muted rounded-full text-[var(--text-caption)] text-text-secondary shadow-sm">
              <Zap className="w-4 h-4 text-warning" /> AI-Powered
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-card border border-muted rounded-full text-[var(--text-caption)] text-text-secondary shadow-sm">
              <Activity className="w-4 h-4 text-success" /> Live Execution
            </div>
          </div>
          
          <div className="flex gap-6 justify-center">
            <div className="flex items-center gap-2 text-[var(--text-caption)] text-text-muted">
              <span className="w-2 h-2 rounded-full bg-danger" /> Admin
            </div>
            <div className="flex items-center gap-2 text-[var(--text-caption)] text-text-muted">
              <span className="w-2 h-2 rounded-full bg-warning" /> DBA
            </div>
            <div className="flex items-center gap-2 text-[var(--text-caption)] text-text-muted">
              <span className="w-2 h-2 rounded-full bg-success" /> User
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Login Form */}
      <div className="flex items-center justify-center p-8 lg:p-12 bg-base relative z-10">
        <div className="w-full max-w-[420px] flex flex-col">
          <div className="md:hidden flex items-center justify-center gap-2 text-primary mb-8 font-mono text-lg font-bold">
            <Database className="w-6 h-6" /> SQL Intelligence
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-text-primary mb-2">Welcome back</h2>
            <p className="text-text-secondary">Sign in to your workspace</p>
          </div>
          
          <Card className="p-6 md:p-8 border-muted shadow-lg bg-surface relative z-10">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <Input
                label="Username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
              />
              
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-[34px] text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-md text-sm text-danger mt-1">
                  {error}
                </div>
              )}
              
              <Button type="submit" variant="primary" size="lg" className="w-full mt-2" isLoading={loading}>
                Sign In →
              </Button>
              
              <div className="text-center mt-2">
                <Link to="/forgot-password" className="text-sm text-text-secondary hover:text-primary transition-colors">
                  Forgot your password?
                </Link>
              </div>
            </form>
          </Card>
          
          <p className="text-center text-sm text-text-muted mt-8">
            Don't have an account? <Link to="/register" className="text-primary hover:underline ml-1">Create an organisation</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
