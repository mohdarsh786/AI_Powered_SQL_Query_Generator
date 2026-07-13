import { useNavigate } from 'react-router-dom'
import { Database, LogOut } from 'lucide-react'
import api from '../../services/api'
import Badge from '../ui/Badge'
import Button from '../ui/Button'

export default function Navbar({ user }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch (e) {
      // ignore
    }
    navigate('/login')
  }

  const getRoleVariant = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'danger' // Crimson
      case 'dba': return 'warning'  // Amber
      default: return 'default'     // Neutral
    }
  }

  return (
    <nav className="h-14 shrink-0 w-full bg-base border-b border-[var(--color-muted)] flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-2 w-1/3">
        <div className="w-6 h-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold font-mono text-[10px]">
          SQL
        </div>
        <span className="font-semibold text-[var(--text-body)] text-text-primary tracking-tight">
          SQL Intelligence
        </span>
      </div>

      <div className="flex justify-center w-1/3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-[var(--color-muted)]/50">
          <Database className="w-3.5 h-3.5 text-success" />
          <span className="text-[var(--text-caption)] font-medium text-text-secondary">
            Supabase Connected
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 w-1/3">
        <div className="flex items-center gap-3 pr-4 border-r border-[var(--color-muted)]">
          {user?.role && (
            <Badge variant={getRoleVariant(user.role)}>
              {user.role?.toUpperCase()}
            </Badge>
          )}
          {user?.username && (
            <span className="text-[var(--text-caption)] font-medium text-text-secondary">
              {user.username}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-text-secondary hover:text-text-primary">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </nav>
  )
}
