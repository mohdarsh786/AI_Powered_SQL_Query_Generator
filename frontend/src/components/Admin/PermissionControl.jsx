import { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Shield, Check, User, TableProperties, ShieldCheck } from 'lucide-react'
import Card from '../ui/Card'
import SectionHeader from '../ui/SectionHeader'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'

export default function PermissionControl() {
  const [users, setUsers] = useState([])
  const [tables, setTables] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedTable, setSelectedTable] = useState('')
  const [currentPerms, setCurrentPerms] = useState([])
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [granting, setGranting] = useState(false)

  // Permission checkboxes
  const [perms, setPerms] = useState({
    canSelect: false,
    canInsert: false,
    canUpdate: false,
    canDelete: false,
    canExport: false,
  })

  useEffect(() => {
    fetchUsers()
    fetchTables()
  }, [])

  useEffect(() => {
    if (selectedUserId) {
      fetchCurrentPermissions(selectedUserId)
    } else {
      setCurrentPerms([])
    }
  }, [selectedUserId])

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/admin/users')
      setUsers((res.data.users || []).filter((u) => u.role === 'user'))
    } catch {
      // ignore
    }
  }

  const fetchTables = async () => {
    try {
      const res = await api.get('/api/schema/fetch')
      setTables(res.data.tables || [])
    } catch {
      // ignore
    }
  }

  const fetchCurrentPermissions = async (userId) => {
    setLoadingPerms(true)
    try {
      setCurrentPerms([])
    } catch {
    } finally {
      setLoadingPerms(false)
    }
  }

  const handleGrant = async () => {
    if (!selectedUserId || !selectedTable) {
      toast.error('Select a user and table')
      return
    }

    setGranting(true)
    try {
      await api.post('/api/admin/permissions', {
        userId: parseInt(selectedUserId, 10),
        tableName: selectedTable,
        canSelect: perms.canSelect,
        canInsert: perms.canInsert,
        canUpdate: perms.canUpdate,
        canDelete: perms.canDelete,
        canExport: perms.canExport,
      })
      toast.success(`Permissions granted on "${selectedTable}"`)
      fetchCurrentPermissions(selectedUserId)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to grant permission')
    } finally {
      setGranting(false)
    }
  }

  const handleRevoke = async (tableName) => {
    if (!selectedUserId) return

    try {
      await api.post('/api/admin/permissions', {
        userId: parseInt(selectedUserId, 10),
        tableName,
        action: 'revoke',
      })
      toast.success(`Permission revoked for "${tableName}"`)
      fetchCurrentPermissions(selectedUserId)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to revoke permission')
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      <SectionHeader 
        title="Permission Control" 
        description="Manage granular table permissions for database users."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-6)] mb-[var(--spacing-6)]">
        <div className="flex flex-col gap-2">
          <label className="text-[var(--text-caption)] font-medium text-text-secondary">Select User</label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
            <select
              className="w-full bg-surface border border-[var(--color-muted)] rounded-[var(--radius-md)] pl-10 pr-4 py-2.5 text-[var(--text-body)] text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/40 outline-none appearance-none cursor-pointer"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">-- Choose a user --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="text-[var(--text-caption)] font-medium text-text-secondary">Select Table (Target Matrix)</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {tables.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTable(t)}
                className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border text-[var(--text-body)] font-medium transition-all ${
                  selectedTable === t
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-surface border-[var(--color-muted)] text-text-secondary hover:bg-[var(--color-muted)] hover:text-text-primary'
                }`}
              >
                <TableProperties className="w-4 h-4" />
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedUserId && selectedTable && (
        <Card className="mb-[var(--spacing-6)] bg-surface/50 border-[var(--color-muted)]">
          <h4 className="text-[var(--text-caption)] font-semibold text-text-secondary uppercase tracking-wider mb-[var(--spacing-4)]">
            Configure Permissions
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-[var(--spacing-4)] mb-[var(--spacing-6)]">
            {Object.entries(perms).map(([key, value]) => {
              const label = key.replace('can', '').toUpperCase()
              return (
                <label key={key} className={`flex flex-col items-center justify-center p-[var(--spacing-4)] rounded-[var(--radius-md)] border cursor-pointer transition-all ${value ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-[var(--color-muted)] text-text-secondary hover:border-text-secondary/30 hover:bg-surface'}`}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={value}
                    onChange={(e) => setPerms({ ...perms, [key]: e.target.checked })}
                  />
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-2 transition-colors ${value ? 'bg-primary text-on-primary' : 'bg-[var(--color-muted)] text-transparent'}`}>
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-[var(--text-caption)] font-bold">{label}</span>
                </label>
              )
            })}
          </div>

          <div className="flex justify-end pt-[var(--spacing-4)] border-t border-[var(--color-muted)]">
            <Button
              variant="primary"
              onClick={handleGrant}
              isLoading={granting}
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              {granting ? 'Granting...' : 'Grant Permission'}
            </Button>
          </div>
        </Card>
      )}

      {selectedUserId && (
        <div className="flex flex-col border border-[var(--color-muted)] rounded-[var(--radius-lg)] overflow-hidden bg-card mt-2">
          <div className="bg-surface px-[var(--spacing-6)] py-[var(--spacing-4)] border-b border-[var(--color-muted)]">
            <h4 className="text-[var(--text-caption)] font-semibold text-text-secondary uppercase tracking-wider">
              Current Permissions
            </h4>
          </div>
          <div className="p-[var(--spacing-6)]">
            {currentPerms.length > 0 ? (
              <div className="flex flex-col gap-[var(--spacing-3)]">
                {currentPerms.map((p, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-[var(--spacing-4)] bg-surface border border-[var(--color-muted)] rounded-[var(--radius-md)] gap-4 sm:gap-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-[var(--spacing-6)]">
                      <div className="flex items-center gap-2 font-mono text-[var(--text-body)] text-text-primary font-medium w-auto sm:w-40">
                        <TableProperties className="w-4 h-4 text-text-secondary" />
                        {p.table_name}
                      </div>
                      <div className="flex gap-2">
                        {p.can_select && <Badge variant="success"><Check className="w-3 h-3 mr-1" /> SELECT</Badge>}
                        {p.can_insert && <Badge variant="success"><Check className="w-3 h-3 mr-1" /> INSERT</Badge>}
                        {p.can_update && <Badge variant="success"><Check className="w-3 h-3 mr-1" /> UPDATE</Badge>}
                        {p.can_delete && <Badge variant="success"><Check className="w-3 h-3 mr-1" /> DELETE</Badge>}
                        {p.can_export && <Badge variant="success"><Check className="w-3 h-3 mr-1" /> EXPORT</Badge>}
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRevoke(p.table_name)}
                    >
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex justify-center">
                {loadingPerms ? (
                  <div className="flex flex-col items-center gap-3 text-text-secondary text-[var(--text-body)]">
                    <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    Loading...
                  </div>
                ) : (
                  <EmptyState 
                    icon={Shield} 
                    title="No permissions granted" 
                    description="Select a table and configure permissions above to grant access." 
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
