import React, { useState } from 'react'

export default function DBASidebar({
  schemaData,
  queryHistory,
  activeSessions,
  onTableClick,
  onHistoryClick,
  onSessionsClick,
  mode,
  setMode,
  onGrantClick
}) {
  const [expandedTables, setExpandedTables] = useState({})

  const toggleTable = (tableName) => {
    setExpandedTables((prev) => ({ ...prev, [tableName]: !prev[tableName] }))
  }

  const parseSchemaForSidebar = (schemaStr) => {
    if (!schemaStr) return []
    const tables = []
    const tableRegex = /CREATE TABLE (\w+)\s*\(([\s\S]*?)\);/gi
    let match
    while ((match = tableRegex.exec(schemaStr)) !== null) {
      const tableName = match[1]
      const columnsStr = match[2]
      const columns = []
      const lines = columnsStr.split(',\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const parts = trimmed.split(/\s+/)
        if (parts.length >= 2) {
          const typeStr = parts[1].toLowerCase()
          const isPrimary = trimmed.toUpperCase().includes('PRIMARY KEY')
          const isForeign = trimmed.toUpperCase().includes('REFERENCES')
          columns.push({ name: parts[0], type: typeStr, isPrimary, isForeign })
        }
      }
      tables.push({ name: tableName, columns })
    }
    return tables
  }

  const schema = parseSchemaForSidebar(schemaData)

  const loadQuery = (q) => {
    if (onHistoryClick) onHistoryClick(q.generated_query || q.natural_language)
  }

  return (
    <aside className="dba-sidebar">

      {/* Identity header */}
      <div className="dba-sidebar-header">
        <div className="dba-sidebar-icon">⊞</div>
        <div>
          <p className="dba-sidebar-title">DBA Control</p>
          <p className="dba-sidebar-subtitle">Full database access</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="dba-mode-toggle">
        <button
          className={`dba-mode-btn ${mode === 'query' ? 'active' : ''}`}
          onClick={() => setMode && setMode('query')}
        >
          <span>⌨</span> Query Mode
        </button>
        <button
          className={`dba-mode-btn ${mode === 'schema' ? 'active' : ''}`}
          onClick={() => setMode && setMode('schema')}
        >
          <span>⊞</span> Schema Mode
        </button>
      </div>

      {/* Active sessions — expanded info */}
      <div className="dba-sidebar-section">
        <p className="dba-section-label">ACTIVE SESSIONS</p>
        <div className="dba-sessions-card" onClick={onSessionsClick} style={{ cursor: 'pointer' }}>
          <div className="dba-sessions-count">{activeSessions}</div>
          <div className="dba-sessions-info">
            <span className="dba-sessions-dot" />
            <span>concurrent connections</span>
          </div>
        </div>
      </div>

      {/* Schema browser */}
      <div className="dba-sidebar-section dba-schema-section">
        <p className="dba-section-label">
          SCHEMA BROWSER
          <span className="dba-table-count">{schema.length} tables</span>
        </p>
        {schema.map(table => (
          <div key={table.name} className="dba-schema-table">
            <div
              className="dba-schema-table-header"
              onClick={() => toggleTable(table.name)}
            >
              <span className="dba-table-icon">⊞</span>
              <span className="dba-table-name">{table.name}</span>
              <span className="dba-table-arrow">
                {expandedTables[table.name] ? '▾' : '▸'}
              </span>
            </div>
            {expandedTables[table.name] && (
              <div className="dba-schema-columns">
                {table.columns?.map(col => (
                  <div key={col.name} className="dba-schema-column">
                    <span className="dba-col-name">{col.name}</span>
                    <span className="dba-col-type">{col.type}</span>
                    {col.isPrimary && <span className="dba-col-pk">PK</span>}
                    {col.isForeign && <span className="dba-col-fk">FK</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent queries */}
      <div className="dba-sidebar-section">
        <p className="dba-section-label">RECENT QUERIES</p>
        {queryHistory.length === 0
          ? <p className="dba-empty">No queries yet</p>
          : queryHistory.slice(0, 6).map((q, i) => (
              <div key={i} className="dba-history-item" onClick={() => loadQuery(q)}>
                <span className={`dba-op-badge op-${q.query_type?.toLowerCase()}`}>
                  {q.query_type || 'SQL'}
                </span>
                <span className="dba-history-text">
                  {(q.generated_query || q.natural_language || '').slice(0, 35)}...
                </span>
              </div>
            ))
        }
      </div>

      {/* Grant permissions button */}
      <div className="dba-sidebar-footer">
        <button className="btn-grant-permissions" onClick={() => onGrantClick && onGrantClick()}>
          ⊕ Grant User Permissions
        </button>
      </div>

    </aside>
  )
}
