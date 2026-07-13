import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { UserPlus, User, Trash2, AlertTriangle, UserCog, ShieldAlert } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import SearchInput from '../ui/SearchInput'
import Badge from '../ui/Badge'
import Table from '../ui/Table'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [rowLimitEditing, setRowLimitEditing] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null)
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

  const getRoleVariant = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'danger' // Crimson
      case 'dba': return 'warning'  // Amber
      default: return 'default'     // Neutral Slate
    }
  }

  const closeCreateModalAndReset = () => {
    if (creating) return
    setShowCreateModal(false)
    setNewUser({ username: '', email: '', role: 'user' })
    setTempPassword(null)
    setCreatedUserId(null)
    setCredentialsSent(false)
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 sm:justify-between items-start sm:items-center mb-[var(--spacing-6)] shrink-0 w-full">
        <SearchInput
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Create User
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <Table
          headers={['User', 'Role', 'Status', 'Row Limit', 'Actions']}
          data={filteredUsers}
          emptyState={
            <div className="text-center p-12 text-text-secondary bg-surface border border-[var(--color-muted)] rounded-[var(--radius-xl)]">
              No users found.
            </div>
          }
          renderRow={(u) => (
            <>
              <td className="px-5 py-3 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-muted)] flex items-center justify-center text-text-secondary">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-text-primary">{u.username}</div>
                    <div className="text-[var(--text-caption)] text-text-secondary">{u.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3 whitespace-nowrap">
                <Badge variant={getRoleVariant(u.role)}>
                  {u.role?.toUpperCase()}
                </Badge>
              </td>
              <td className="px-5 py-3 whitespace-nowrap">
                {u.is_suspended ? (
                  <Badge variant="default" className="text-text-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-text-muted mr-1.5 inline-block"></span> Suspended
                  </Badge>
                ) : (
                  <Badge variant="success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 inline-block"></span> Active
                  </Badge>
                )}
              </td>
              <td className="px-5 py-3 whitespace-nowrap text-[var(--text-caption)] font-mono">
                <div className="flex items-center gap-2">
                  <input
                    id={`limit-${u.id}`}
                    className="w-16 bg-surface border border-[var(--color-muted)] rounded text-[var(--text-caption)] text-text-primary px-2 h-8 text-center focus:border-primary focus:ring-1 focus:ring-primary/40 focus:outline-none"
                    type="number"
                    defaultValue={u.row_limit}
                    onChange={(e) => setRowLimitEditing((prev) => ({ ...prev, [u.id]: e.target.value }))}
                  />
                  {rowLimitEditing[u.id] !== undefined && (
                    <Button size="sm" variant="secondary" onClick={() => handleSetRowLimit(u.id)}>
                      Save
                    </Button>
                  )}
                </div>
              </td>
              <td className="px-5 py-3 whitespace-nowrap">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant={u.is_suspended ? 'outline' : 'ghost'}
                    onClick={() => handleToggleSuspend(u.id)}
                  >
                    {u.is_suspended ? 'Activate' : 'Suspend'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:text-white hover:bg-danger w-8 h-8 p-0 flex items-center justify-center shrink-0"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openDeleteModal(u)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </>
          )}
        />
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={closeDeleteModal}
        title={
          <span className="flex items-center gap-2 text-danger">
            <ShieldAlert className="w-5 h-5" /> Delete User
          </span>
        }
      >
        {deleteTarget && (
          <div className="flex flex-col gap-6">
            <div className="bg-danger/10 border border-danger/20 p-4 rounded-[var(--radius-lg)] flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <span className="text-[var(--text-body)] text-danger leading-relaxed">
                You are about to permanently delete this user. This will immediately terminate all active sessions and revoke all database permissions.
              </span>
            </div>

            <div className="bg-surface border border-[var(--color-muted)] p-4 rounded-[var(--radius-lg)] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--color-muted)] flex items-center justify-center shrink-0">
                <UserCog className="w-6 h-6 text-text-secondary" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-text-primary">{deleteTarget.username}</span>
                <span className="text-[var(--text-caption)] text-text-secondary">{deleteTarget.email}</span>
              </div>
              <div className="ml-auto">
                <Badge variant={getRoleVariant(deleteTarget.role)}>{deleteTarget.role}</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[var(--text-body)] text-text-secondary">
                To confirm, type <span className="font-mono font-bold text-text-primary select-all bg-[var(--color-muted)] px-2 py-0.5 rounded">{deleteTarget.username}</span>
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteTarget.username}
                disabled={deleting}
              />
            </div>

            <div className="flex justify-end gap-3 mt-2 border-t border-[var(--color-muted)] pt-6">
              <Button variant="ghost" onClick={closeDeleteModal} disabled={deleting}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={deleteConfirmText !== deleteTarget.username || deleting}
                onClick={handleDeleteUser}
                isLoading={deleting}
              >
                Delete User
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={closeCreateModalAndReset}
        title={!tempPassword ? "Create New User" : "User Created"}
      >
        {!tempPassword ? (
          <form onSubmit={handleCreateUser} className="flex flex-col gap-6">
            <Input
              label="Username"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-[var(--text-caption)] font-medium text-text-secondary">Role</label>
              <select
                className="w-full bg-surface border border-[var(--color-muted)] rounded-[var(--radius-md)] px-4 py-2.5 text-[var(--text-body)] text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-[var(--motion-fast)]"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="user">User</option>
                <option value="dba">DBA</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="bg-surface border border-[var(--color-muted)] p-4 rounded-[var(--radius-lg)] mt-2 flex items-start gap-3">
              <span className="text-xl leading-none">🔒</span>
              <span className="text-[var(--text-caption)] text-text-secondary leading-relaxed">
                A secure one-time password will be generated automatically.
                The user must change it on first login.
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-[var(--color-muted)] mt-2">
              <Button variant="ghost" onClick={closeCreateModalAndReset} type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={creating}>
                Create User
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="bg-surface border border-[var(--color-muted)] p-6 rounded-[var(--radius-lg)] text-center">
              <p className="text-[var(--text-body)] text-text-secondary mb-4">
                🔑 One-Time Password for <strong className="text-text-primary">{newUser.username}</strong>
              </p>
              <div className="font-mono text-[var(--text-section)] font-bold text-text-primary bg-[var(--color-muted)] py-4 rounded-[var(--radius-md)] mb-6 select-all">
                {tempPassword}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword)
                  toast.success('Copied to clipboard!')
                }}
              >
                📋 Copy Password
              </Button>
            </div>

            <div className="bg-warning/10 border border-warning/20 p-4 rounded-[var(--radius-lg)] flex items-start gap-3">
              <span className="text-xl leading-none text-warning">⚠</span>
              <span className="text-[var(--text-caption)] text-warning leading-relaxed">
                This password is shown <strong>only once</strong> and cannot be recovered.
                Share it securely with the user.
              </span>
            </div>

            <div className="flex gap-4 pt-6 border-t border-[var(--color-muted)] mt-2">
              <Button
                variant={credentialsSent ? 'outline' : 'secondary'}
                className="flex-1"
                onClick={handleSendCredentials}
                disabled={sendingEmail || credentialsSent}
                isLoading={sendingEmail}
              >
                {credentialsSent ? '✔ Credentials Sent' : '✉ Send via Email'}
              </Button>

              <Button
                variant="primary"
                className="flex-1"
                onClick={closeCreateModalAndReset}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
