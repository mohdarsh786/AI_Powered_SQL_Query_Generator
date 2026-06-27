import { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Search, UserPlus, User, PlayCircle, Ban, X, CheckCircle2 } from 'lucide-react'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [rowLimitEditing, setRowLimitEditing] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  // Create form
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    role: 'user',
  })
  const [tempPassword, setTempPassword] = useState(null)
  const [creating, setCreating] = useState(false)

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

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await api.post('/api/admin/users', newUser)
      toast.success('User created successfully')
      setTempPassword(res.data.tempPassword)
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
                  <tr key={u.id} className="hover:bg-[#1a2436] transition-colors group">
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
                    <td className="actions-cell">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in">
            {!tempPassword ? (
              <>
                <div className="flex justify-between items-center px-lg py-md border-b border-outline-variant/20 bg-surface-container-low">
                  <h2 className="font-h2 text-[20px] font-semibold text-on-surface flex items-center gap-2">
                    <UserPlus size={20} />
                    Create New User
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setNewUser({ username: '', email: '', role: 'user' })
                    }}
                    className="text-on-surface-variant hover:text-on-surface transition-colors rounded-full p-1 hover:bg-surface-variant"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCreateUser}>
                  <div className="p-lg flex flex-col gap-md">
                    <div className="flex flex-col gap-sm">
                      <label className="font-label-md text-[12px] font-medium text-on-surface-variant">Username</label>
                      <input
                        className="w-full admin-input px-4 py-2.5"
                        type="text"
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-sm">
                      <label className="font-label-md text-[12px] font-medium text-on-surface-variant">Email</label>
                      <input
                        className="w-full admin-input px-4 py-2.5"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-sm">
                      <label className="font-label-md text-[12px] font-medium text-on-surface-variant">Role</label>
                      <select
                        className="w-full admin-select px-4 py-2.5"
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      >
                        <option value="user">User</option>
                        <option value="dba">DBA</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="create-user-notice">
                      <span>🔒</span>
                      <span>
                        A secure one-time password will be generated automatically.
                        The user must change it on first login.
                      </span>
                    </div>
                  </div>

                  <div className="px-lg py-md border-t border-outline-variant/20 bg-surface-container-low flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 font-label-md text-[13px] font-medium text-on-surface hover:bg-surface-variant rounded-lg transition-colors border border-outline-variant/30"
                      onClick={() => {
                        setShowCreateModal(false)
                        setNewUser({ username: '', email: '', role: 'user' })
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-primary-container text-white font-label-md text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-inverse-primary transition-colors disabled:opacity-50"
                      disabled={creating}
                    >
                      {creating ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center px-lg py-md border-b border-outline-variant/20 bg-surface-container-low">
                  <h2 className="font-h2 text-[20px] font-semibold text-success flex items-center gap-2">
                    <CheckCircle2 size={20} /> User Created
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setTempPassword(null)
                      setNewUser({ username: '', email: '', role: 'user' })
                    }}
                    className="text-on-surface-variant hover:text-on-surface transition-colors rounded-full p-1 hover:bg-surface-variant"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-lg">
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

                  <div className="temp-password-warning">
                    <span>⚠</span>
                    <span>
                      This password is shown <strong>only once</strong> and cannot be recovered.
                      Share it securely with the user. They will be required to change it on first login.
                    </span>
                  </div>
                </div>

                <div className="px-lg py-md border-t border-outline-variant/20 bg-surface-container-low flex justify-end gap-3">
                  <button
                    type="button"
                    className="bg-primary-container text-white font-label-md text-[13px] font-medium px-6 py-2 rounded-lg hover:bg-inverse-primary transition-colors"
                    onClick={() => {
                      setShowCreateModal(false)
                      setTempPassword(null)
                      setNewUser({ username: '', email: '', role: 'user' })
                    }}
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
