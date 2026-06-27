import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import './Navbar.css'

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

  const roleBadgeClass = {
    admin: 'badge-admin',
    dba: 'badge-dba',
    user: 'badge-user',
  }[user?.role] || 'badge-user'

  return (
    <nav className="dashboard-navbar">
      <div className="navbar-left">
        <span className="navbar-logo">
          <span className="logo-icon">⊞</span>
          <span className="logo-text">SQL Intelligence</span>
        </span>
      </div>

      <div className="navbar-center">
        <span className="db-status">
          <span className="status-dot" />
          Connected to Supabase
        </span>
      </div>

      <div className="navbar-right">
        {user?.role && (
          <span className={`role-badge badge-${user.role?.toLowerCase()}`}>
            {user.role?.toUpperCase()}
          </span>
        )}
        {user?.username && (
          <span className="navbar-username">{user.username}</span>
        )}
        <button className="logout-btn" onClick={handleLogout}>
          ↪ Sign Out
        </button>
      </div>
    </nav>
  )
}
