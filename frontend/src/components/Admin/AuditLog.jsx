import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Filter, RefreshCw } from 'lucide-react'

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [loading, setLoading] = useState(false)

  // Filters
  const [filterUserId, setFilterUserId] = useState('')
  const [filterQueryType, setFilterQueryType] = useState('')
  const [filterFromDate, setFilterFromDate] = useState('')
  const [filterToDate, setFilterToDate] = useState('')

  const intervalRef = useRef(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page)
      params.set('limit', limit)
      if (filterUserId) params.set('userId', filterUserId)
      if (filterQueryType) params.set('queryType', filterQueryType)
      if (filterFromDate) params.set('fromDate', filterFromDate)
      if (filterToDate) params.set('toDate', filterToDate)

      const res = await api.get(`/api/admin/audit?${params.toString()}`)
      setLogs(res.data.data || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, filterUserId, filterQueryType, filterFromDate, filterToDate])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchLogs()
    }, 30000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [page, filterUserId, filterQueryType, filterFromDate, filterToDate])

  const totalPages = Math.ceil(total / limit)

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  const getRoleBadgeClasses = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'bg-error/20 text-error border-error/30'
      case 'dba': return 'bg-warning/20 text-warning border-warning/30'
      default: return 'bg-primary-container/20 text-primary-fixed-dim border-primary-container/30'
    }
  }

  const getTypeBadgeClasses = (type) => {
    switch (type?.toUpperCase()) {
      case 'SELECT': return 'bg-success/20 text-success border-success/30'
      case 'INSERT':
      case 'UPDATE': return 'bg-warning/20 text-warning border-warning/30'
      case 'DELETE':
      case 'DROP':
      case 'TRUNCATE': return 'bg-error/20 text-error border-error/30'
      default: return 'bg-surface-variant text-on-surface-variant border-outline-variant/30'
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex justify-between items-center mb-md shrink-0">
        <h3 className="font-h3 text-[20px] font-semibold text-on-surface">System Audit Logs</h3>
        <button
          className="bg-surface-container-high border border-outline-variant/50 hover:bg-surface-variant text-on-surface px-4 py-2 rounded-lg transition-all active:scale-95 font-label-md text-[13px] font-medium flex items-center gap-2"
          onClick={fetchLogs}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-md mb-md flex flex-wrap gap-4 items-center shrink-0">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Filter size={16} />
          <span className="font-label-md text-[12px] font-medium uppercase tracking-wider">Filters</span>
        </div>
        <div className="w-px h-4 bg-outline-variant/30 hidden md:block"></div>
        <input
          className="bg-[#0a0e17] border border-[#1e2d45] rounded-lg px-3 py-1.5 text-body-sm font-body-sm text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container/50 outline-none transition-all placeholder:text-outline-variant w-32"
          type="text"
          placeholder="User ID"
          value={filterUserId}
          onChange={(e) => { setFilterUserId(e.target.value); setPage(1); }}
        />
        <select
          className="bg-[#0a0e17] border border-[#1e2d45] rounded-lg px-3 py-1.5 text-body-sm font-body-sm text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container/50 outline-none transition-all"
          value={filterQueryType}
          onChange={(e) => { setFilterQueryType(e.target.value); setPage(1); }}
        >
          <option value="">All Types</option>
          <option value="SELECT">SELECT</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="CREATE">CREATE</option>
          <option value="DROP">DROP</option>
        </select>
        <div className="flex items-center gap-2">
          <input
            className="bg-[#0a0e17] border border-[#1e2d45] rounded-lg px-3 py-1.5 text-body-sm font-body-sm text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container/50 outline-none transition-all [color-scheme:dark]"
            type="date"
            value={filterFromDate}
            onChange={(e) => { setFilterFromDate(e.target.value); setPage(1); }}
            title="From date"
          />
          <span className="text-on-surface-variant font-label-md text-[12px]">to</span>
          <input
            className="bg-[#0a0e17] border border-[#1e2d45] rounded-lg px-3 py-1.5 text-body-sm font-body-sm text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container/50 outline-none transition-all [color-scheme:dark]"
            type="date"
            value={filterToDate}
            onChange={(e) => { setFilterToDate(e.target.value); setPage(1); }}
            title="To date"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#1e2d45] rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[#1e2d45] bg-[#0f1623]">
                <th className="p-sm px-md font-label-md text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">Timestamp</th>
                <th className="p-sm px-md font-label-md text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">Username</th>
                <th className="p-sm px-md font-label-md text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">Role</th>
                <th className="p-sm px-md font-label-md text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">Type</th>
                <th className="p-sm px-md font-label-md text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">Tables</th>
                <th className="p-sm px-md font-label-md text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">Rows</th>
                <th className="p-sm px-md font-label-md text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">Time (ms)</th>
                <th className="p-sm px-md font-label-md text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">IP</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-[13px] divide-y divide-[#1e2d45]">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-xl">
                    <div className="w-6 h-6 border-2 border-secondary/20 border-t-secondary rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-xl text-on-surface-variant">No audit logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1a2436] transition-colors">
                    <td className="p-sm px-md font-code-sm text-[11px] text-on-surface-variant">{formatDate(log.created_at)}</td>
                    <td className="p-sm px-md font-medium text-on-surface">{log.username || '-'}</td>
                    <td className="p-sm px-md">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-label-md border uppercase ${getRoleBadgeClasses(log.role)}`}>
                        {log.role || '-'}
                      </span>
                    </td>
                    <td className="p-sm px-md">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-label-md border font-code-sm ${getTypeBadgeClasses(log.query_type)}`}>
                        {log.query_type || '-'}
                      </span>
                    </td>
                    <td className="p-sm px-md text-on-surface-variant font-code-sm text-[11px] max-w-[150px] truncate" title={Array.isArray(log.tables_used) ? log.tables_used.join(', ') : '-'}>
                      {Array.isArray(log.tables_used) ? log.tables_used.join(', ') : '-'}
                    </td>
                    <td className="p-sm px-md text-on-surface-variant">{log.rows_affected ?? '-'}</td>
                    <td className="p-sm px-md text-on-surface-variant">{log.execution_time_ms ?? '-'}</td>
                    <td className="p-sm px-md font-code-sm text-[11px] text-outline">{log.ip_address || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-md shrink-0 bg-surface-container border border-outline-variant/30 rounded-lg p-sm px-md">
          <span className="font-label-md text-[12px] text-on-surface-variant">
            Page {page} of {totalPages} <span className="text-outline">({total} total records)</span>
          </span>
          <div className="flex gap-2">
            <button
              className="bg-[#0a0e17] border border-[#1e2d45] hover:bg-surface-variant text-on-surface px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-label-md text-[12px]"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              className="bg-[#0a0e17] border border-[#1e2d45] hover:bg-surface-variant text-on-surface px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-label-md text-[12px]"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
