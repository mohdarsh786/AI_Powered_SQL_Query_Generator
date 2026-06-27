import React, { useState } from 'react'
import { ShieldCheck, Users, ChevronRight, Columns, Clock } from 'lucide-react'

export default function DBASidebar({
  schemaData,
  queryHistory,
  activeSessions,
  onTableClick,
  onHistoryClick,
}) {
  const [expandedTables, setExpandedTables] = useState({})

  const toggleTable = (tableName) => {
    setExpandedTables((prev) => ({ ...prev, [tableName]: !prev[tableName] }))
  }

  const parsedTables = parseSchemaForSidebar(schemaData)

  return (
    <nav className="h-full w-full bg-surface-container-low flex flex-col py-md overflow-y-auto">
      <div className="px-lg mb-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded bg-warning/20 flex items-center justify-center text-warning">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="font-body-md text-body-md font-semibold text-on-surface">DBA Control</div>
            <div className="font-label-md text-label-md text-on-surface-variant">System Management</div>
          </div>
        </div>
      </div>

      <div className="px-md mb-2 mt-4 font-label-md text-[12px] font-medium text-outline tracking-wider uppercase">Active Sessions</div>
      <div className="px-md py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 font-body-sm text-[14px] text-on-surface-variant">
          <Users size={16} />
          Active Sessions
        </div>
        <span className="bg-warning/20 text-warning px-2 py-0.5 rounded text-[12px] font-mono">{activeSessions ?? 0}</span>
      </div>

      <div className="px-md mb-2 mt-4 font-label-md text-[12px] font-medium text-outline tracking-wider uppercase">Schema Browser</div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {parsedTables.length > 0 ? (
          parsedTables.map((table) => (
            <div key={table.name}>
              <button
                className="w-[calc(100%-16px)] text-left font-label-md text-[12px] font-medium text-on-surface-variant mx-2 px-2 py-2 flex items-center gap-2 hover:bg-surface-variant rounded-lg transition-colors"
                onClick={() => toggleTable(table.name)}
              >
                <ChevronRight
                  size={14}
                  className="transition-transform shrink-0"
                  style={{ transform: expandedTables[table.name] ? 'rotate(90deg)' : 'none' }}
                />
                <span
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTableClick && onTableClick(table.name)
                  }}
                >
                  {table.name}
                </span>
              </button>
              {expandedTables[table.name] && table.columns.length > 0 && (
                <div className="pl-8 pr-4 py-1 flex flex-col gap-1">
                  {table.columns.map((col, i) => (
                    <div key={i} className="flex items-center justify-between font-code-sm text-[11px] text-on-surface-variant/80">
                      <div className="flex items-center gap-1 overflow-hidden">
                        <Columns size={10} className="opacity-60 shrink-0" />
                        <span className="truncate">{col.name}</span>
                      </div>
                      <span className="text-secondary/70 shrink-0 ml-2">{col.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="px-md py-2 font-label-md text-[12px] text-on-surface-variant">Loading schema...</div>
        )}
      </div>

      <div className="px-md mb-2 mt-4 font-label-md text-[12px] font-medium text-outline tracking-wider uppercase shrink-0">Recent Queries</div>
      <div className="shrink-0 mb-4">
        {queryHistory && queryHistory.length > 0 ? (
          queryHistory.slice(0, 5).map((item, i) => (
            <button
              key={item.id || i}
              onClick={() => onHistoryClick && onHistoryClick(item.generated_query || item.natural_language)}
              className="w-[calc(100%-16px)] text-left font-label-md text-[12px] font-medium text-on-surface-variant mx-2 px-4 py-2 flex items-center gap-3 hover:bg-surface-variant rounded-lg transition-colors truncate"
              title={item.generated_query || item.natural_language}
            >
              <Clock size={14} className="shrink-0 opacity-70" />
              <span className="truncate">{item.generated_query || item.natural_language || 'Untitled query'}</span>
            </button>
          ))
        ) : (
          <div className="px-md py-2 font-label-md text-[12px] text-on-surface-variant">No queries yet</div>
        )}
      </div>
    </nav>
  )
}

function parseSchemaForSidebar(schemaStr) {
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
        columns.push({ name: parts[0], type: parts[1].toLowerCase() })
      }
    }

    tables.push({ name: tableName, columns })
  }

  return tables
}
