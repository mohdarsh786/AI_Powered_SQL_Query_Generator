import { useState, useEffect } from 'react'
import { CheckCircle2, Users, TrendingUp, Monitor, Database, ArrowUp, Gavel, AlertTriangle, UserCog, KeyRound, ScrollText } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/shared/Navbar'
import UserManagement from '../components/Admin/UserManagement'
import PermissionControl from '../components/Admin/PermissionControl'
import AuditLog from '../components/Admin/AuditLog'
import api from '../services/api'
import '../styles/admin.css'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [stats, setStats] = useState({
    users: 0,
    sessions: 0,
    queriesToday: 0,
    flagged: 0
  })

  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const [sessionsList, setSessionsList] = useState([])
  const [fetchingSessions, setFetchingSessions] = useState(false)

  // Basic mock stats fetching logic just to wire things up if real endpoint exists.
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/admin/stats') // Suppose we have this
        setStats(res.data)
      } catch {
        // If endpoint doesn't exist, use fallback stats
        setStats({
          users: 1248,
          sessions: 342,
          queriesToday: '45.2k',
          flagged: 7
        })
      }
    }
    fetchStats()

    // Setup SSE for live active sessions
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    const eventSource = new EventSource(`${baseUrl}/api/admin/sessions/live`, {
      withCredentials: true
    })

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data && typeof data.count === 'number') {
          setStats(prev => ({ ...prev, sessions: data.count }))
        }
      } catch (err) {
        console.error('Failed to parse SSE data', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err)
    }

    return () => {
      eventSource.close()
    }
  }, [])

  const handleSessionsClick = async () => {
    setShowSessionsModal(true)
    setFetchingSessions(true)
    try {
      const res = await api.get('/api/admin/sessions')
      setSessionsList(res.data.sessions || [])
    } catch {
      // ignore
    } finally {
      setFetchingSessions(false)
    }
  }

  return (
    <div className="admin-wrapper">
      <Navbar user={user} />

      <main className="admin-content">
        {/* Header Section */}
        <header className="flex justify-between items-end mb-sm">
          <div>
            <h1 className="font-h1 text-[30px] font-semibold text-on-surface">System Administration</h1>
            <p className="text-on-surface-variant font-body-md text-[14px] mt-sm">Manage user access, configure permissions, and monitor cluster security.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-secondary-fixed-dim font-label-md text-[12px] bg-secondary-fixed-dim/10 px-3 py-1.5 rounded-full border border-secondary-fixed-dim/20">
              <CheckCircle2 size={14} className="animate-pulse" />
              Cluster Healthy
            </div>
          </div>
        </header>

        {/* Stats Row */}
        <div className="admin-stats-grid">
          <div className="stat-card stat-card-gradient-1 flex flex-col gap-sm relative overflow-hidden">
            <div className="flex justify-between items-start z-10">
              <span className="text-on-surface-variant font-label-md text-[12px] uppercase tracking-wider">Total Users</span>
              <Users size={20} className="text-primary-container" />
            </div>
            <div className="font-h2 text-[24px] font-semibold text-on-surface z-10">{stats.users}</div>
            <div className="text-secondary font-label-md text-[12px] z-10 flex items-center gap-1">
              <TrendingUp size={13} /> +12 this week
            </div>
          </div>

          <div 
            className="stat-card stat-card-gradient-2 flex flex-col gap-sm relative overflow-hidden cursor-pointer hover:brightness-110 transition-all"
            onClick={handleSessionsClick}
          >
            <div className="flex justify-between items-start z-10">
              <span className="text-on-surface-variant font-label-md text-[12px] uppercase tracking-wider">Active Sessions</span>
              <Monitor size={20} className="text-secondary" />
            </div>
            <div className="font-h2 text-[24px] font-semibold text-on-surface z-10">{stats.sessions}</div>
            <div className="text-on-surface-variant font-label-md text-[12px] z-10 flex items-center gap-1">
              Click to view active users
            </div>
          </div>

          <div className="stat-card stat-card-gradient-3 flex flex-col gap-sm relative overflow-hidden">
            <div className="flex justify-between items-start z-10">
              <span className="text-on-surface-variant font-label-md text-[12px] uppercase tracking-wider">Queries Today</span>
              <Database size={20} className="text-tertiary-fixed-dim" />
            </div>
            <div className="font-h2 text-[24px] font-semibold text-on-surface z-10">{stats.queriesToday}</div>
            <div className="text-tertiary-fixed-dim font-label-md text-[12px] z-10 flex items-center gap-1">
              <ArrowUp size={13} /> Peak load normal
            </div>
          </div>

          <div className="stat-card stat-card-gradient-4 flex flex-col gap-sm relative overflow-hidden">
            <div className="flex justify-between items-start z-10">
              <span className="text-on-surface-variant font-label-md text-[12px] uppercase tracking-wider">Flagged Ops</span>
              <Gavel size={20} className="text-error" />
            </div>
            <div className="font-h2 text-[24px] font-semibold text-error z-10">{stats.flagged}</div>
            <div className="text-error font-label-md text-[12px] z-10 flex items-center gap-1">
              <AlertTriangle size={13} /> Requires review
            </div>
          </div>
        </div>

        {/* Main Workspace Area */}
        <div className="glass-panel rounded-xl flex flex-col flex-1 min-h-[500px]">
          {/* Tabs */}
          <div className="flex border-b border-outline-variant/30 px-md pt-sm gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-md py-sm font-label-md text-[12px] flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'users' ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
            >
              <UserCog size={16} /> Users
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-md py-sm font-label-md text-[12px] flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'permissions' ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
            >
              <KeyRound size={16} /> Permissions
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-md py-sm font-label-md text-[12px] flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'audit' ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
            >
              <ScrollText size={16} /> Audit Logs
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-md flex flex-col flex-1 relative overflow-hidden">
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'permissions' && <PermissionControl />}
            {activeTab === 'audit' && <AuditLog />}
          </div>
        </div>
      </main>

      {/* Active Sessions Modal */}
      {showSessionsModal && (
        <div className="modal-overlay" onClick={() => setShowSessionsModal(false)}>
          <div className="modal-card" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👥 Active Sessions</h3>
              <button className="modal-close" onClick={() => setShowSessionsModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {fetchingSessions ? (
                <div className="flex justify-center py-8">
                  <div className="spinner spinner-md"></div>
                </div>
              ) : sessionsList.length === 0 ? (
                <div className="text-center text-outline-variant py-8">
                  No active sessions found.
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                  {sessionsList.map(session => (
                    <div key={session.id} className="admin-session-item">
                      <div className="admin-session-left">
                        <div className="admin-session-user">
                          {session.username}
                          <span className={`admin-session-role ${session.role}`}>
                            {session.role}
                          </span>
                        </div>
                        <div className="admin-session-meta">
                          IP: {session.ip_address || 'Unknown'}
                        </div>
                      </div>
                      <div className="admin-session-right">
                        <div className="admin-session-meta">Joined: {new Date(session.created_at).toLocaleTimeString()}</div>
                        <div className="admin-session-meta">Last seen: {new Date(session.last_seen).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer border-t border-outline-variant/20 pt-4 mt-4">
              <button className="btn-ghost w-full" onClick={() => setShowSessionsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-lg px-2xl flex justify-between items-center bg-surface-container-lowest border-t border-outline-variant/10 font-label-md text-[12px] text-on-surface-variant mt-auto shrink-0">
        <div>© 2026 SQL Intelligence Inc.</div>
        <div className="flex gap-4">
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy</a>
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Terms</a>
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">API Status</a>
        </div>
      </footer>
    </div>
  )
}
