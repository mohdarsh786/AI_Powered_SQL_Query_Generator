import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Search, UserPlus, User, X, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [rowLimitEditing, setRowLimitEditing] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null) // user object to delete
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Create form
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    role: 'user',
  })
  const [createdUserId, setCreatedUserId] = useState(null)
  const [tempPassword, setTempPassword] = useState(null)
  const [creating, setCreating] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [credentialsSent, setCredentialsSent] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/users')
      setUsers(res.data.users || [])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (showCreateModal || deleteTarget) {
      document.getElementById('dashboard-main')?.classList.add('dashboard-recess')
    } else {
      document.getElementById('dashboard-main')?.classList.remove('dashboard-recess')
    }
  }, [showCreateModal, deleteTarget])

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await api.post('/api/admin/users', newUser)
      toast.success('User created successfully')
      setCreatedUserId(res.data.user?.id)
      setTempPassword(res.data.tempPassword)
      setCredentialsSent(false)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleSuspend = async (userId) => {
    try {
      const res = await api.patch(`/api/admin/users/${userId}/suspend`)
      toast.success(res.data.message)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user')
    }
  }

  const handleSendCredentials = async () => {
    if (!createdUserId || !tempPassword) return
    setSendingEmail(true)
    try {
      await api.post(`/api/admin/users/${createdUserId}/send-credentials`, { tempPassword })
      toast.success(`Credentials emailed to ${newUser.email}`)
      setCredentialsSent(true)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleSetRowLimit = async (userId) => {
    const value = rowLimitEditing[userId]
    if (!value || isNaN(value)) {
      toast.error('Enter a valid number')
      return
    }
    try {
      await api.patch(`/api/admin/rowlimit/${userId}`, {
        rowLimit: parseInt(value, 10),
      })
      toast.success('Row limit updated')
      setRowLimitEditing((prev) => ({ ...prev, [userId]: undefined }))
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update row limit')
    }
  }

  const openDeleteModal = (user) => {
    setDeleteTarget(user)
    setDeleteConfirmText('')
  }

  const closeDeleteModal = () => {
    setDeleteTarget(null)
    setDeleteConfirmText('')
  }

  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    if (deleteConfirmText !== deleteTarget.username) {
      toast.error('Username does not match')
      return
    }
    setDeleting(true)
    try {
      await api.delete(`/api/admin/users/${deleteTarget.id}`)
      toast.success(`User "${deleteTarget.username}" permanently deleted`)
      closeDeleteModal()
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleBadgeClasses = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'badge badge-admin'
      case 'dba': return 'badge badge-dba'
      default: return 'badge badge-user'
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full px-2">
      {/* Toolbar */}
      <div className="flex justify-between items-center mt-4 mb-6 shrink-0">
        <div className="relative w-64">
          <Search size={18} className="absolute left-3 top-2.5 text-outline" />
          <input
            className="w-full admin-input pl-10 pr-3 py-2 text-[14px]"
            placeholder="Search users..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          className="bg-primary-container text-white font-label-md text-[13px] font-medium px-5 py-2 rounded-full flex items-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-inverse-primary transition-colors active:scale-95"
          onClick={() => setShowCreateModal(true)}
        >
          <UserPlus size={16} /> Create User
        </button>
      </div>

      {/* Table */}
      <div className="border border-[#1e2d45] rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[#1e2d45] bg-[#0f1623]">
                <th className="p-sm px-md font-label-md text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">User</th>
                <th className="p-sm px-md font-label-md text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">Role</th>
                <th className="p-sm px-md font-label-md text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">Status</th>
                <th className="p-sm px-md font-label-md text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">Row Limit</th>
                <th className="p-sm px-md font-label-md text-[12px] font-medium text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-[14px] divide-y divide-[#1e2d45]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center p-xl">
                    <div className="w-6 h-6 border-2 border-secondary/20 border-t-secondary rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-xl text-on-surface-variant">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="modern-grid-row group">
                    <td className="p-sm px-md">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant overflow-hidden flex-shrink-0 flex items-center justify-center text-on-surface-variant">
                          <User size={20} />
                        </div>
                        <div>
                          <div className="text-on-surface font-medium">{u.username}</div>
                          <div className="text-on-surface-variant text-[12px]">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-sm px-md">
                      <span className={getRoleBadgeClasses(u.role)}>
                        {u.role?.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-sm px-md">
                      {u.is_suspended ? (
                        <div className="flex items-center gap-1.5 text-outline">
                          <div className="w-1.5 h-1.5 rounded-full bg-outline"></div> Suspended
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-secondary-fixed-dim">
                          <div className="w-1.5 h-1.5 rounded-full bg-secondary-fixed-dim"></div> Active
                        </div>
                      )}
                    </td>
                    <td className="p-sm px-md font-code-md text-code-md text-on-surface-variant">
                      <div className="flex items-center gap-2">
                        <input
                          id={`limit-${u.id}`}
                          className="admin-input-small"
                          type="number"
                          defaultValue={u.row_limit}
                          onChange={(e) =>
                            setRowLimitEditing((prev) => ({ ...prev, [u.id]: e.target.value }))
                          }
                        />
                        {rowLimitEditing[u.id] !== undefined && (
                          <button
                            className="bg-secondary/20 text-secondary border border-secondary/30 px-2 py-1 rounded text-[11px] font-medium hover:bg-secondary/30 transition-colors"
                            onClick={() => handleSetRowLimit(u.id)}
                          >
                            Set
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-sm px-md">
                      <div className="flex items-center gap-2">
                        <button
                          className={`btn-action ${u.is_suspended ? 'btn-activate' : 'btn-suspend'}`}
                          onClick={() => handleToggleSuspend(u.id)}
                        >
                          {u.is_suspended ? 'Activate' : 'Suspend'}
                        </button>
                        <button
                          className="btn-action btn-edit-limit"
                          onClick={() => document.getElementById(`limit-${u.id}`)?.focus()}
                        >
                          Set Limit
                        </button>
                        <button
                          className="btn-action btn-delete"
                          onClick={() => openDeleteModal(u)}
                          title="Permanently delete user"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Delete Confirmation Modal (Sliding Panel) ── */}
      {deleteTarget && createPortal(
        <div className="sliding-panel-overlay animate-in fade-in duration-300" onClick={closeDeleteModal}>
          <div className="sliding-panel panel-enter" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center px-xl py-lg border-b border-outline-variant/10">
              <h2 className="font-h2 text-[20px] font-semibold text-error flex items-center gap-2">
                <Trash2 size={20} /> Delete User
              </h2>
              <button
                onClick={closeDeleteModal}
                className="text-on-surface-variant hover:text-on-surface transition-colors rounded-full p-1 hover:bg-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-xl flex-1 flex flex-col gap-lg overflow-y-auto">
              {/* Warning banner */}
              <div className="delete-warning-banner bg-error/10 border border-error/20 p-4 rounded-xl text-error flex items-start gap-3">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span className="text-[13px] leading-relaxed">
                  You are about to permanently delete this user. This will immediately terminate all active sessions and revoke all database permissions.
                </span>
              </div>

              <div className="delete-user-card bg-surface-container border border-outline-variant/10 p-4 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center shrink-0">
                  <UserCog size={20} className="text-on-surface-variant" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-[15px] text-on-surface">{deleteTarget.username}</span>
                  <span className="text-[13px] text-on-surface-variant">{deleteTarget.email}</span>
                </div>
                <div className="ml-auto">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                    deleteTarget.role === 'admin' ? 'bg-primary-container text-white' : 
                    deleteTarget.role === 'dba' ? 'bg-secondary-fixed-dim/20 text-secondary-fixed-dim' : 
                    'bg-surface-variant text-on-surface-variant'
                  }`}>
                    {deleteTarget.role}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <label className="block text-[14px] text-on-surface-variant">
                  To confirm, type <span className="font-mono font-bold text-on-surface select-all bg-surface-variant px-1.5 py-0.5 rounded">{deleteTarget.username}</span>
                </label>
                <input
                  type="text"
                  className="panel-input"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={deleteTarget.username}
                  disabled={deleting}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="p-xl border-t border-outline-variant/10 mt-auto flex justify-end gap-4">
              <button
                type="button"
                className="px-6 py-3 font-medium text-on-surface hover:bg-surface-variant rounded-xl transition-colors"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-delete-confirm flex items-center gap-2 px-6 py-3 bg-error/10 text-error hover:bg-error hover:text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:hover:bg-error/10 disabled:hover:text-error"
                disabled={deleteConfirmText !== deleteTarget.username || deleting}
                onClick={handleDeleteUser}
              >
                {deleting ? (
                  <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 size={18} /> Delete User</>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Create User Modal (Sliding Panel) ── */}
      {showCreateModal && createPortal(
        <div className="sliding-panel-overlay animate-in fade-in duration-300" onClick={() => {
          if (creating) return;
          setShowCreateModal(false);
          setNewUser({ username: '', email: '', role: 'user' });
        }}>
          <div className="sliding-panel panel-enter" onClick={e => e.stopPropagation()}>
            {!tempPassword ? (
              <>
                <div className="flex justify-between items-center px-xl py-lg border-b border-outline-variant/10">
                  <h2 className="font-h2 text-[20px] font-semibold text-on-surface flex items-center gap-2">
                    <UserPlus size={20} />
                    Create New User
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setNewUser({ username: '', email: '', role: 'user' })
                    }}
                    className="text-on-surface-variant hover:text-on-surface transition-colors rounded-full p-2 hover:bg-surface-variant"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="flex-1 flex flex-col overflow-y-auto">
                  <div className="p-xl flex flex-col gap-lg flex-1">
                    <div className="flex flex-col gap-sm">
                      <label className="text-[13px] text-on-surface-variant">Username</label>
                      <input
                        className="panel-input"
                        type="text"
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-sm">
                      <label className="text-[13px] text-on-surface-variant">Email</label>
                      <input
                        className="panel-input"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-sm">
                      <label className="text-[13px] text-on-surface-variant">Role</label>
                      <select
                        className="panel-input appearance-none"
                        style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundPosition: 'right 16px center', backgroundRepeat: 'no-repeat' }}
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      >
                        <option value="user">User</option>
                        <option value="dba">DBA</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="create-user-notice bg-surface-variant/50 border border-outline-variant/10 p-4 rounded-xl mt-4 flex items-start gap-3">
                      <span className="text-[16px]">🔒</span>
                      <span className="text-[13px] text-on-surface-variant leading-relaxed">
                        A secure one-time password will be generated automatically.
                        The user must change it on first login.
                      </span>
                    </div>
                  </div>

                  <div className="p-xl border-t border-outline-variant/10 flex justify-end gap-4 mt-auto">
                    <button
                      type="button"
                      className="px-6 py-3 font-medium text-on-surface hover:bg-surface-variant rounded-xl transition-colors"
                      onClick={() => {
                        setShowCreateModal(false)
                        setNewUser({ username: '', email: '', role: 'user' })
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-primary-container text-white px-6 py-3 rounded-xl font-medium hover:bg-inverse-primary transition-all disabled:opacity-50"
                      disabled={creating}
                    >
                      {creating ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center px-xl py-lg border-b border-outline-variant/10">
                  <h2 className="font-h2 text-[20px] font-semibold text-success flex items-center gap-2">
                    <CheckCircle2 size={24} /> User Created
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setTempPassword(null)
                      setCreatedUserId(null)
                      setCredentialsSent(false)
                      setNewUser({ username: '', email: '', role: 'user' })
                    }}
                    className="text-on-surface-variant hover:text-on-surface transition-colors rounded-full p-2 hover:bg-surface-variant"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-xl flex-1 overflow-y-auto flex flex-col gap-lg">
                  <div className="temp-password-box">
                    <p className="temp-password-label">
                      🔑 One-Time Password for <strong className="text-on-surface">{newUser.username}</strong>
                    </p>
                    <div className="temp-password-value">
                      {tempPassword}
                    </div>
                    <button
                      className="btn-copy"
                      onClick={() => {
                        navigator.clipboard.writeText(tempPassword)
                        toast.success('Copied to clipboard!')
                      }}
                    >
                      📋 Copy Password
                    </button>
                  </div>

                  <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex items-start gap-3 mt-4">
                    <span className="text-[16px]">⚠</span>
                    <span className="text-[13px] text-warning leading-relaxed">
                      This password is shown <strong>only once</strong> and cannot be recovered.
                      Share it securely with the user. They will be required to change it on first login.
                    </span>
                  </div>
                </div>

                <div className="p-xl border-t border-outline-variant/10 flex justify-between items-center gap-4 mt-auto">
                  <button
                    type="button"
                    className={`flex items-center justify-center gap-2 flex-1 py-3 font-medium rounded-xl border transition-all ${
                      credentialsSent
                        ? 'border-secondary-fixed-dim/40 text-secondary-fixed-dim bg-secondary-fixed-dim/10 cursor-default'
                        : 'border-secondary/30 text-secondary hover:bg-secondary/10'
                    }`}
                    onClick={handleSendCredentials}
                    disabled={sendingEmail || credentialsSent}
                  >
                    {sendingEmail ? (
                      <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Sending...</>
                    ) : credentialsSent ? (
                      <><CheckCircle2 size={16} /> Credentials Sent!</>
                    ) : (
                      <>✉ Send via Email</>
                    )}
                  </button>

                  <button
                    type="button"
                    className="bg-primary-container text-white px-8 py-3 rounded-xl font-medium hover:bg-inverse-primary transition-colors flex-1"
                    onClick={() => {
                      setShowCreateModal(false)
                      setTempPassword(null)
                      setCreatedUserId(null)
                      setCredentialsSent(false)
                      setNewUser({ username: '', email: '', role: 'user' })
                    }}
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
