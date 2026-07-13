import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Filter, RefreshCw, Activity } from 'lucide-react'
import SectionHeader from '../ui/SectionHeader'
import Card from '../ui/Card'
import Table from '../ui/Table'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'

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

  const getRoleVariant = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'danger' // Crimson
      case 'dba': return 'warning'  // Amber
      default: return 'default'     // Neutral
    }
  }

  const getTypeVariant = (type) => {
    switch (type?.toUpperCase()) {
      case 'SELECT': return 'success'
      case 'INSERT':
      case 'UPDATE': return 'warning'
      case 'DELETE':
      case 'DROP':
      case 'TRUNCATE': return 'danger'
      default: return 'default'
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-col sm:flex-row gap-4 sm:justify-between items-start sm:items-center mb-[var(--spacing-6)] shrink-0 w-full">
        <SectionHeader 
          title="System Audit Logs" 
          description="Monitor database activity, user queries, and system events."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Floating Filter Toolbar */}
      <Card className="mb-[var(--spacing-6)] shrink-0 p-[var(--spacing-4)] flex flex-col gap-[var(--spacing-3)] bg-surface/80 backdrop-blur-sm border-[var(--color-muted)]">
        <div className="flex items-center gap-2 text-text-secondary">
          <Filter className="w-4 h-4" />
          <span className="text-[var(--text-caption)] font-medium uppercase tracking-wider">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-[var(--spacing-4)]">
          <input
            className="w-full bg-surface border border-[var(--color-muted)] rounded-[var(--radius-md)] px-3 py-2 text-[var(--text-body)] text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
            type="text"
            placeholder="User ID"
            value={filterUserId}
            onChange={(e) => { setFilterUserId(e.target.value); setPage(1); }}
          />
          <select
            className="w-full bg-surface border border-[var(--color-muted)] rounded-[var(--radius-md)] px-3 py-2 text-[var(--text-body)] text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 appearance-none"
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
          <div className="col-span-1 sm:col-span-2 flex items-center gap-2">
            <input
              className="w-full bg-surface border border-[var(--color-muted)] rounded-[var(--radius-md)] px-3 py-2 text-[var(--text-body)] text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 [color-scheme:dark]"
              type="date"
              value={filterFromDate}
              onChange={(e) => { setFilterFromDate(e.target.value); setPage(1); }}
              title="From date"
            />
            <span className="text-text-secondary text-[var(--text-caption)]">to</span>
            <input
              className="w-full bg-surface border border-[var(--color-muted)] rounded-[var(--radius-md)] px-3 py-2 text-[var(--text-body)] text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 [color-scheme:dark]"
              type="date"
              value={filterToDate}
              onChange={(e) => { setFilterToDate(e.target.value); setPage(1); }}
              title="To date"
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="flex-1 min-h-0">
        {loading && logs.length === 0 ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <Table
            headers={['Timestamp', 'Username', 'Role', 'Type', 'Tables', 'Rows', 'Time (ms)', 'IP']}
            data={logs}
            emptyState={
              <div className="mt-[var(--spacing-8)]">
                <EmptyState 
                  icon={Activity} 
                  title="No audit logs found" 
                  description="Try adjusting your filters or wait for system activity." 
                />
              </div>
            }
            renderRow={(log) => (
              <>
                <td className="px-5 py-3 whitespace-nowrap text-[var(--text-caption)] text-text-secondary font-mono">
                  {formatDate(log.created_at)}
                </td>
                <td className="px-5 py-3 whitespace-nowrap font-medium text-text-primary">
                  {log.username || '-'}
                </td>
                <td className="px-5 py-3 whitespace-nowrap">
                  <Badge variant={getRoleVariant(log.role)}>
                    {log.role?.toUpperCase() || '-'}
                  </Badge>
                </td>
                <td className="px-5 py-3 whitespace-nowrap">
                  <Badge variant={getTypeVariant(log.query_type)}>
                    {log.query_type || '-'}
                  </Badge>
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-[var(--text-caption)] text-text-secondary font-mono max-w-[150px] truncate" title={Array.isArray(log.tables_used) ? log.tables_used.join(', ') : '-'}>
                  {Array.isArray(log.tables_used) ? log.tables_used.join(', ') : '-'}
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-[var(--text-caption)] text-text-secondary">
                  {log.rows_affected ?? '-'}
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-[var(--text-caption)] text-text-secondary">
                  {log.execution_time_ms ?? '-'}
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-[var(--text-caption)] text-text-secondary/50 font-mono">
                  {log.ip_address || '-'}
                </td>
              </>
            )}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between items-center mt-[var(--spacing-6)] shrink-0 bg-surface border border-[var(--color-muted)] rounded-[var(--radius-md)] p-[var(--spacing-3)] px-[var(--spacing-4)]">
          <span className="text-[var(--text-caption)] text-text-secondary">
            Page <span className="text-text-primary font-medium">{page}</span> of {totalPages} <span className="text-text-secondary/50">({total} records)</span>
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
