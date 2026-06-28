import { useEffect, useRef, useState, useCallback } from 'react'
import './SchemaVisualizer.css'

export default function SchemaVisualizer({ schema }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [tables, setTables] = useState([])
  const [dragging, setDragging] = useState(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)

  // Initialize table positions in a grid layout
  useEffect(() => {
    if (!schema || schema.length === 0) return
    const cols = 3
    const cardW = 220
    const cardH = 40 + (8 * 28) // header + max 8 cols
    const gapX = 80
    const gapY = 60

    const positioned = schema.map((table, i) => ({
      ...table,
      x: 60 + (i % cols) * (cardW + gapX),
      y: 60 + Math.floor(i / cols) * (cardH + gapY),
      width: cardW,
      collapsed: false
    }))
    setTables(positioned)
  }, [schema])

  // Detect foreign key relationships from column names
  const getRelationships = useCallback(() => {
    const relationships = []
    tables.forEach(table => {
      table.columns?.forEach(col => {
        if (col.name.endsWith('_id') && col.name !== 'id') {
          const refTableName = col.name.replace('_id', 's')
          const refTable = tables.find(t =>
            t.name === refTableName ||
            t.name === col.name.replace('_id', '')
          )
          if (refTable) {
            relationships.push({
              from: table.name,
              to: refTable.name,
              fromCol: col.name,
              toCol: 'id'
            })
          }
        }
      })
    })
    return relationships
  }, [tables])

  const getColumnOffset = (table, colName) => {
    if (table.collapsed) return 20;
    const colIndex = table.columns?.findIndex(c => c.name === colName) ?? -1;
    if (colIndex === -1 || colIndex >= 12) return 20;
    // Header is approx 38px, rows are approx 24px. Add 12px for vertical center of row.
    return 38 + (colIndex * 24) + 12;
  }

  // Get connection points for relationship lines
  const getTableCenter = (table, colName) => ({
    x: table.x + table.width / 2,
    y: table.y + getColumnOffset(table, colName)
  })

  const getTableRight = (table, colName) => ({
    x: table.x + table.width,
    y: table.y + getColumnOffset(table, colName)
  })

  const getTableLeft = (table, colName) => ({
    x: table.x,
    y: table.y + getColumnOffset(table, colName)
  })

  // Mouse handlers for dragging tables
  const handleTableMouseDown = (e, tableIndex) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const rect = containerRef.current.getBoundingClientRect()
    setDragging(tableIndex)
    setOffset({
      x: (e.clientX - rect.left) / zoom - pan.x - tables[tableIndex].x,
      y: (e.clientY - rect.top) / zoom - pan.y - tables[tableIndex].y
    })
  }

  const handleMouseMove = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    if (dragging !== null) {
      const x = (e.clientX - rect.left) / zoom - pan.x - offset.x
      const y = (e.clientY - rect.top) / zoom - pan.y - offset.y
      setTables(prev => prev.map((t, i) =>
        i === dragging ? { ...t, x: Math.max(0, x), y: Math.max(0, y) } : t
      ))
    }

    if (isPanning) {
      setPan({
        x: panStart.x + (e.clientX - rect.left) / zoom - panStart.mx,
        y: panStart.y + (e.clientY - rect.top) / zoom - panStart.my
      })
    }
  }, [dragging, isPanning, offset, pan, panStart, zoom])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
    setIsPanning(false)
  }, [])

  // Canvas background pan
  const handleCanvasMouseDown = (e) => {
    if (e.button === 0 && dragging === null) {
      const rect = containerRef.current.getBoundingClientRect()
      setIsPanning(true)
      setPanStart({
        x: pan.x,
        y: pan.y,
        mx: (e.clientX - rect.left) / zoom,
        my: (e.clientY - rect.top) / zoom
      })
    }
  }

  // Zoom with scroll
  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.min(2, Math.max(0.3, prev * delta)))
  }

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => container.removeEventListener('wheel', handleWheel)
    }
  }, [])

  const toggleCollapse = (e, i) => {
    e.stopPropagation()
    setTables(prev => prev.map((t, idx) =>
      idx === i ? { ...t, collapsed: !t.collapsed } : t
    ))
  }

  const relationships = getRelationships()

  // Color map for different tables
  const tableColors = {
    app_users: '#2563eb',
    audit_logs: '#f43f5e',
    user_permissions: '#a78bfa',
    employees: '#10b981',
    departments: '#06b6d4',
    salaries: '#f59e0b',
    projects: '#6366f1',
    project_assignments: '#ec4899',
    students: '#14b8a6',
    query_history: '#8b5cf6',
  }

  const getTableColor = (name) =>
    tableColors[name] || '#475569'

  return (
    <div
      ref={containerRef}
      className="schema-visualizer"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Controls */}
      <div className="sv-controls">
        <button className="sv-control-btn" onClick={() => setZoom(z => Math.min(2, z * 1.2))}>+</button>
        <span className="sv-zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="sv-control-btn" onClick={() => setZoom(z => Math.max(0.3, z * 0.8))}>−</button>
        <button className="sv-control-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>⊡ Reset</button>
      </div>

      {/* Legend */}
      <div className="sv-legend">
        <span className="sv-legend-item">
          <span className="sv-legend-dot pk" />PK
        </span>
        <span className="sv-legend-item">
          <span className="sv-legend-dot fk" />FK
        </span>
        <span className="sv-legend-item sv-legend-hint">
          Drag tables • Scroll to zoom • Hold canvas to pan
        </span>
      </div>

      {/* Canvas */}
      <svg
        className="sv-canvas"
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: '0 0'
        }}
      >
        {/* Relationship lines */}
        {relationships.map((rel, i) => {
          const fromTable = tables.find(t => t.name === rel.from)
          const toTable = tables.find(t => t.name === rel.to)
          if (!fromTable || !toTable) return null

          const from = fromTable.x < toTable.x
            ? getTableRight(fromTable, rel.fromCol)
            : getTableLeft(fromTable, rel.fromCol)
          const to = fromTable.x < toTable.x
            ? getTableLeft(toTable, rel.toCol)
            : getTableRight(toTable, rel.toCol)

          const mx = (from.x + to.x) / 2

          return (
            <g key={i}>
              <path
                d={`M ${from.x} ${from.y} C ${mx} ${from.y} ${mx} ${to.y} ${to.x} ${to.y}`}
                fill="none"
                stroke="#2563eb"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                opacity="0.6"
              />
              <circle cx={from.x} cy={from.y} r="3" fill="#2563eb" opacity="0.8" />
              <circle cx={to.x} cy={to.y} r="3" fill="#06b6d4" opacity="0.8" />
            </g>
          )
        })}
      </svg>

      {/* Table cards — rendered as HTML over SVG for easier interaction */}
      <div
        className="sv-tables-layer"
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: '0 0'
        }}
      >
        {tables.map((table, i) => {
          const color = getTableColor(table.name)
          const visibleCols = table.collapsed
            ? []
            : (table.columns || []).slice(0, 12)

          return (
            <div
              key={table.name}
              className={`sv-table-card ${dragging === i ? 'dragging' : ''}`}
              style={{
                left: table.x,
                top: table.y,
                width: table.width,
                '--table-color': color,
                cursor: dragging === i ? 'grabbing' : 'grab',
                userSelect: 'none'
              }}
              onMouseDown={(e) => handleTableMouseDown(e, i)}
            >
              {/* Table header */}
              <div className="sv-table-header" style={{ borderTopColor: color }}>
                <span className="sv-table-icon" style={{ color }}>⊞</span>
                <span className="sv-table-name">{table.name}</span>
                <span className="sv-col-count">{table.columns?.length || 0}</span>
                <button
                  className="sv-collapse-btn"
                  onClick={(e) => toggleCollapse(e, i)}
                >
                  {table.collapsed ? '▸' : '▾'}
                </button>
              </div>

              {/* Columns */}
              {!table.collapsed && (
                <div className="sv-table-columns">
                  {visibleCols.map((col, j) => (
                    <div key={j} className="sv-column-row">
                      <div className="sv-col-badges">
                        {col.isPrimary && <span className="sv-badge pk">PK</span>}
                        {col.isForeign && <span className="sv-badge fk">FK</span>}
                        {!col.isPrimary && !col.isForeign && <span className="sv-badge-empty" />}
                      </div>
                      <span className="sv-col-name">{col.name}</span>
                      <span className="sv-col-type">{col.type?.split('(')[0]}</span>
                    </div>
                  ))}
                  {(table.columns?.length || 0) > 12 && (
                    <div className="sv-more-cols">
                      +{table.columns.length - 12} more columns
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
