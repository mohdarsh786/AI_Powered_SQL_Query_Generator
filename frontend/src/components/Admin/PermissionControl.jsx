import { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Shield, Check, User, TableProperties, ShieldCheck } from 'lucide-react'

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
    <div className="flex flex-col flex-1 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-lg">
        <Shield size={20} className="text-secondary" />
        <h3 className="font-h3 text-[20px] font-semibold text-on-surface">Permission Control</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-lg">
        <div className="flex flex-col gap-sm">
          <label className="font-label-md text-[12px] font-medium text-on-surface-variant">Select User</label>
          <div className="relative">
            <User size={18} className="absolute left-3 top-3 text-outline" />
            <select
              className="w-full admin-select pl-10 pr-4 py-2.5 appearance-none cursor-pointer"
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

        <div className="flex flex-col gap-sm">
          <label className="font-label-md text-[12px] font-medium text-on-surface-variant">Select Table</label>
          <div className="relative">
            <TableProperties size={18} className="absolute left-3 top-3 text-outline" />
            <select
              className="w-full admin-select pl-10 pr-4 py-2.5 appearance-none cursor-pointer"
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
            >
              <option value="">-- Choose a table --</option>
              {tables.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedUserId && selectedTable && (
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-lg mb-lg animate-in fade-in zoom-in-95 duration-200">
          <h4 className="font-label-md text-[12px] font-medium text-outline uppercase tracking-wider mb-md">Configure Permissions</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-md mb-lg">
            {Object.entries(perms).map(([key, value]) => {
              const label = key.replace('can', '').toUpperCase()
              return (
                <label key={key} className={`flex flex-col items-center justify-center p-md rounded-lg border cursor-pointer transition-all ${value ? 'bg-secondary/10 border-secondary/50 text-secondary' : 'bg-[#0a0e17] border-[#1e2d45] text-on-surface-variant hover:border-outline-variant'}`}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={value}
                    onChange={(e) => setPerms({ ...perms, [key]: e.target.checked })}
                  />
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-2 transition-colors ${value ? 'bg-secondary text-[#0a0e17]' : 'bg-[#1e2d45]'}`}>
                    <Check size={14} className={value ? 'opacity-100' : 'opacity-0'} />
                  </div>
                  <span className="font-code-sm text-[12px] font-bold">{label}</span>
                </label>
              )
            })}
          </div>

          <div className="flex justify-end">
            <button
              className="bg-primary-container text-white font-label-md text-[13px] font-medium px-6 py-2 rounded-lg hover:bg-inverse-primary transition-colors disabled:opacity-50 flex items-center gap-2"
              onClick={handleGrant}
              disabled={granting}
            >
              <ShieldCheck size={18} />
              {granting ? 'Granting...' : 'Grant Permission'}
            </button>
          </div>
        </div>
      )}

      {selectedUserId && (
        <div className="border border-[#1e2d45] rounded-xl overflow-hidden mt-4">
          <div className="bg-[#0f1623] px-lg py-md border-b border-[#1e2d45]">
            <h4 className="font-label-md text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
              Current Permissions for Selected User
            </h4>
          </div>
          <div className="p-lg bg-surface-container-lowest">
            {currentPerms.length > 0 ? (
              <div className="flex flex-col gap-sm">
                {currentPerms.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-md bg-[#0a0e17] border border-[#1e2d45] rounded-lg">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 font-code-md text-[13px] text-on-surface font-semibold w-40">
                        <TableProperties size={14} className="text-outline" />
                        {p.table_name}
                      </div>
                      <div className="flex gap-2">
                        {p.can_select && <span className="badge badge-success"><Check size={12} /> SELECT</span>}
                        {p.can_insert && <span className="badge badge-success"><Check size={12} /> INSERT</span>}
                        {p.can_update && <span className="badge badge-success"><Check size={12} /> UPDATE</span>}
                        {p.can_delete && <span className="badge badge-success"><Check size={12} /> DELETE</span>}
                        {p.can_export && <span className="badge badge-success"><Check size={12} /> EXPORT</span>}
                      </div>
                    </div>
                    <button
                      className="text-error hover:bg-error/10 px-3 py-1 rounded text-[12px] font-medium transition-colors border border-error/30"
                      onClick={() => handleRevoke(p.table_name)}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-xl text-on-surface-variant font-body-sm">
                {loadingPerms ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-secondary/20 border-t-secondary rounded-full animate-spin"></div>
                    Loading...
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 opacity-60">
                    <Shield size={32} className="text-outline" />
                    Grant permissions above — they will be applied immediately.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
