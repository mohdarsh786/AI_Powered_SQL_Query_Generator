import React, { useState, useMemo } from 'react'
import { Download, AlertCircle, Clock, Rows3, Database, TableProperties } from 'lucide-react'

const ROWS_PER_PAGE = 50

export default function ResultsPanel({
  results,
  executionTime,
  rowCount,
  queryType,
  hasExportPermission,
  error,
}) {
  const [page, setPage] = useState(1)

  // Reset page when results change
  useMemo(() => {
    setPage(1)
  }, [results])

  const totalPages = results ? Math.ceil(results.length / ROWS_PER_PAGE) : 0
  const paginatedResults = results
    ? results.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)
    : []
  const columns = results && results.length > 0 ? Object.keys(results[0]) : []

  const exportCSV = () => {
    if (!results || results.length === 0) return
    const headers = Object.keys(results[0])
    const rows = results.map((row) =>
      headers.map((h) => {
        const val = row[h]
        const str = val === null ? '' : String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    downloadFile(csv, 'query_results.csv', 'text/csv')
  }

  const exportJSON = () => {
    if (!results || results.length === 0) return
    const json = JSON.stringify(results, null, 2)
    downloadFile(json, 'query_results.json', 'application/json')
  }

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const ResultsHeader = () => (
    <div className="results-header">
      <div className="results-tabs">
        <button className="results-tab active">Results</button>
      </div>
      <div className="results-stats">
        {executionTime != null && (
          <span className="results-stat-item">
            <Clock size={13} /> {executionTime}ms
          </span>
        )}
        {(rowCount != null || (results && results.length > 0)) && (
          <span className="results-stat-item">
            <Rows3 size={13} /> {rowCount || results?.length || 0} rows
          </span>
        )}
        {hasExportPermission && results && results.length > 0 && (
          <div className="results-export-btns">
            <button onClick={exportCSV} className="btn-export" title="Export CSV">
              CSV
            </button>
            <button onClick={exportJSON} className="btn-export" title="Export JSON">
              JSON
            </button>
          </div>
        )}
      </div>
    </div>
  )

  if (error) {
    return (
      <div className="results-panel-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <ResultsHeader />
        <div style={{ flex: 1, padding: '20px', overflow: 'auto', backgroundColor: 'var(--bg-base)' }}>
          <div style={{ color: 'var(--error)', backgroundColor: 'rgba(239,68,68,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <AlertCircle size={20} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Execution Error</h3>
            </div>
            <p style={{ margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '13px' }}>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="results-panel-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <ResultsHeader />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)', padding: '20px' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <Database size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>Ready to Execute</h3>
            <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>Write your query above or use the AI Assistant to generate one. Click Run or press Cmd/Ctrl + Enter.</p>
          </div>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="results-panel-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <ResultsHeader />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)', padding: '20px' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <TableProperties size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>No Rows Returned</h3>
            <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>The query executed successfully but returned an empty result set.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="results-panel-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ResultsHeader />
      <div style={{ flex: 1, overflow: 'auto', backgroundColor: 'var(--bg-base)' }}>
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-surface-container-low z-10 border-b border-outline-variant/30">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-2 font-label-md text-[12px] font-medium text-outline uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-code-sm text-[12px] text-on-surface">
            {paginatedResults.map((row, idx) => (
              <tr key={idx} className="border-b border-outline-variant/10 hover:bg-surface-variant/50 transition-colors">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs" title={row[col] != null ? String(row[col]) : ''}>
                    {row[col] != null ? String(row[col]) : <span className="text-on-surface-variant italic">null</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center px-4 py-2 bg-surface-container-low border-t border-outline-variant/20 shrink-0">
          <button
            className="px-3 py-1 font-label-md text-[12px] font-medium text-on-surface bg-surface border border-outline-variant/30 rounded hover:bg-surface-variant disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="font-body-sm text-[12px] text-on-surface-variant">
            Page <span className="text-on-surface font-medium">{page}</span> of <span className="text-on-surface font-medium">{totalPages}</span>
          </span>
          <button
            className="px-3 py-1 font-label-md text-[12px] font-medium text-on-surface bg-surface border border-outline-variant/30 rounded hover:bg-surface-variant disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
