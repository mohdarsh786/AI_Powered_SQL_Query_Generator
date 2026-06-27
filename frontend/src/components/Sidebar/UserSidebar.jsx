import React from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function UserSidebar({
  tables,
  queryHistory,
  hasExportPermission,
  onTableClick,
  onHistoryClick,
}) {
  const { user } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-scrollable">
        {/* Section 1 */}
        <div className="sidebar-section">
          <p className="sidebar-section-label">GRANTED TABLES</p>
          {tables && tables.length > 0 ? (
            tables.map((table) => (
              <div key={table} className="sidebar-table-item" onClick={() => onTableClick && onTableClick(table)}>
                <span className="sidebar-table-icon">⊞</span>
                {table}
              </div>
            ))
          ) : (
            <p className="sidebar-empty">No tables granted</p>
          )}
        </div>

        {/* Section 2 */}
        <div className="sidebar-section">
          <p className="sidebar-section-label">RECENT QUERIES</p>
          {!queryHistory || queryHistory.length === 0 ? (
            <p className="sidebar-empty">No queries yet</p>
          ) : (
            queryHistory.slice(0, 8).map((q, i) => {
              const text = q.generated_query || q.natural_language || 'Untitled query'
              return (
                <div key={q.id || i} className="sidebar-history-item" onClick={() => onHistoryClick && onHistoryClick(text)} title={text}>
                  {text.length > 40 ? text.slice(0, 40) + '...' : text}
                </div>
              )
            })
          )}
        </div>

        {/* Section 3 — only if export permission */}
        {hasExportPermission && (
          <div className="sidebar-section">
            <p className="sidebar-section-label">DOWNLOADS</p>
            <p className="sidebar-download-note">Export results as CSV or JSON from the results panel</p>
          </div>
        )}
      </div>

      {/* Row limit at bottom */}
      <div className="sidebar-footer">
        <span className="row-limit-label">Row limit</span>
        <span className="row-limit-value">{user?.row_limit || 500}</span>
      </div>
    </aside>
  )
}
