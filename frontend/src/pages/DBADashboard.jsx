import { useState, useEffect, useRef, useCallback } from 'react'
import Split from 'split.js'
import { Sparkles, Play, AlertTriangle, X, AlertCircle } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useDebounce } from '../hooks/useDebounce'
import Navbar from '../components/shared/Navbar'
import DBASidebar from '../components/Sidebar/DBASidebar'
import MonacoEditor from '../components/Editor/MonacoEditor'
import ResultsPanel from '../components/Editor/ResultsPanel'
import AIAssistantPanel from '../components/AIAssistant/AIAssistantPanel'
import '../styles/dashboard.css'

const DESTRUCTIVE_OPS = ['DELETE', 'DROP', 'TRUNCATE']

export default function DBADashboard() {
  const { user, logout } = useAuth()
  const editorRef = useRef(null)

  // State
  const [naturalLanguage, setNaturalLanguage] = useState('')
  const [editorQuery, setEditorQuery] = useState('')
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analysisStatus, setAnalysisStatus] = useState('idle')
  const [results, setResults] = useState(null)
  const [resultsError, setResultsError] = useState(null)
  const [executionStats, setExecutionStats] = useState(null)
  const [schema, setSchema] = useState('')
  const [tables, setTables] = useState([])
  const [queryHistory, setQueryHistory] = useState([])
  const [activeSessions, setActiveSessions] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [mode, setMode] = useState('query') // 'query' | 'schema'

  // Confirmation modal state
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmReason, setConfirmReason] = useState('')
  const [pendingQuery, setPendingQuery] = useState('')

  // Debounce
  const debouncedQuery = useDebounce(editorQuery, 3000)

  // Split.js refs
  const horizontalSplitRef = useRef(null)
  const verticalSplitRef = useRef(null)

  // Initialize Split.js
  useEffect(() => {
    let hSplit, vSplit;
    
    const initSplit = setTimeout(() => {
      if (mode !== 'query') return;
      
      if (document.querySelector('.split-left') && document.querySelector('.split-right')) {
        hSplit = Split(['.split-left', '.split-right'], {
          sizes: [70, 30],
          minSize: [400, 300],
          gutterSize: 4,
          direction: 'horizontal',
          elementStyle: (dimension, size, gutterSize) => ({
            'flex-basis': `calc(${size}% - ${gutterSize}px)`,
          }),
          gutterStyle: (dimension, gutterSize) => ({
            'flex-basis': `${gutterSize}px`,
          }),
        })
        horizontalSplitRef.current = hSplit
      }

      if (document.querySelector('.split-top') && document.querySelector('.split-bottom')) {
        vSplit = Split(['.split-top', '.split-bottom'], {
          sizes: [60, 40],
          minSize: [150, 100],
          gutterSize: 4,
          direction: 'vertical',
        })
        verticalSplitRef.current = vSplit
      }
    }, 100);

    return () => {
      clearTimeout(initSplit);
      if (hSplit) hSplit.destroy()
      if (vSplit) vSplit.destroy()
    }
  }, [mode])

  useEffect(() => {
    fetchSchema()
    fetchHistory()
    fetchSessions()
  }, [])

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.trim().length > 5 && schema) {
      const isVariant =
        analysisResult?.optimizedQuery === debouncedQuery ||
        analysisResult?.variants?.some((v) => v.query === debouncedQuery)

      if (!isVariant) {
        analyzeQuery(debouncedQuery)
      }
    }
  }, [debouncedQuery, schema])

  const fetchSchema = async () => {
    try {
      const res = await api.get('/api/schema/fetch')
      setSchema(res.data.schema || '')
      setTables(res.data.tables || [])
    } catch {
      toast.error('Failed to load schema')
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await api.get('/api/query/history')
      setQueryHistory(res.data.data || [])
    } catch {
      // non-critical
    }
  }

  const fetchSessions = async () => {
    try {
      const res = await api.get('/api/dba/sessions')
      setActiveSessions(res.data.activeCount || 0)
    } catch {
      // non-critical
    }
  }

  const handleGenerate = async () => {
    if (!naturalLanguage.trim()) {
      toast.error('Enter a natural language query')
      return
    }
    setGenerating(true)
    setAnalysisStatus('analyzing')

    try {
      const res = await api.post('/api/query/generate', {
        naturalLanguage: naturalLanguage.trim(),
        schema,
      })
      const data = res.data.data || res.data

      if (data.error) {
        setAnalysisResult(data)
        setAnalysisStatus('error')
        toast.error(data.error)
        return
      }

      setAnalysisResult(data)
      setAnalysisStatus('result')

      toast.success('Query generated!')
      fetchHistory()
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to generate query'
      setAnalysisStatus('error')
      setAnalysisResult({ error: msg })
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  const analyzeQuery = async (query) => {
    if (!query.trim() || !schema) return
    setAnalysisStatus('analyzing')

    try {
      const res = await api.post('/api/query/analyze', {
        query: query.trim(),
        schema,
      })
      const data = res.data.data || res.data
      if (data.error) {
        setAnalysisResult(data)
        setAnalysisStatus('error')
        return
      }
      setAnalysisResult(data)
      setAnalysisStatus('result')
    } catch (err) {
      setAnalysisStatus('error')
      setAnalysisResult({ error: err.response?.data?.error || 'Analysis failed' })
    }
  }

  const isDestructiveQuery = (query) => {
    const upper = query.trim().toUpperCase()
    return DESTRUCTIVE_OPS.some((op) => upper.startsWith(op))
  }

  const handleRun = useCallback(async () => {
    const query = editorRef.current?.getValue?.() || editorQuery
    if (!query.trim()) {
      toast.error('No query to execute')
      return
    }

    if (isDestructiveQuery(query)) {
      setPendingQuery(query.trim())
      setShowConfirm(true)
      return
    }
    await executeQuery(query.trim())
  }, [editorQuery])

  const executeQuery = async (query, reason) => {
    setExecuting(true)
    setResultsError(null)

    try {
      const payload = { query }
      if (reason) payload.reason = reason

      const res = await api.post('/api/query/execute', payload)
      const data = res.data

      if (data.error) {
        setResultsError(data.error)
        setResults(null)
        return
      }

      setResults(data.data || [])
      setExecutionStats({
        time: data.executionTimeMs,
        rowCount: data.rowCount,
        queryType: data.query?.trim().split(/\s+/)[0]?.toUpperCase() || 'QUERY',
      })
      setResultsError(null)
      fetchHistory()
    } catch (err) {
      const msg = err.response?.data?.error || 'Query execution failed'
      if (err.response?.status === 403) {
        toast.error('You are not authorized to perform this operation')
      }
      setResultsError(msg)
      setResults(null)
    } finally {
      setExecuting(false)
    }
  }

  const handleConfirmExecute = () => {
    if (!confirmReason.trim()) {
      toast.error('Reason is required for destructive operations')
      return
    }
    setShowConfirm(false)
    executeQuery(pendingQuery, confirmReason.trim())
    setConfirmReason('')
    setPendingQuery('')
  }

  const handleTableClick = (tableName) => {
    if (editorRef.current) {
      const current = editorRef.current.getValue() || ''
      editorRef.current.setValue(current + (current ? ' ' : '') + tableName)
    }
  }

  const handleHistoryClick = (query) => {
    if (query && editorRef.current) {
      editorRef.current.setValue(query)
      setEditorQuery(query)
    }
  }

  const handleImport = (query) => {
    if (query) setEditorQuery(query)
  }

  const handleNLKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  return (
    <div className="dashboard-wrapper">
      <Navbar user={user} />
      
      <div className="dashboard-body">
        <aside className="dashboard-sidebar">
          <DBASidebar
            schemaData={schema}
            queryHistory={queryHistory}
            activeSessions={activeSessions}
            onTableClick={handleTableClick}
            onHistoryClick={handleHistoryClick}
          />
        </aside>

        {/* Main Content Area */}
        <div className="dashboard-main">
          
          {/* Mode Toggle (Tabs) */}
          <div className="px-4 py-2 border-b border-outline-variant/30 bg-surface-container-low shrink-0 flex items-center gap-4">
            <button
              onClick={() => setMode('query')}
              className={`font-label-md text-[12px] font-medium pb-1 border-b-2 transition-colors ${mode === 'query' ? 'text-secondary border-secondary' : 'text-on-surface-variant hover:text-on-surface border-transparent'}`}
            >
              Query Mode
            </button>
            <button
              onClick={() => setMode('schema')}
              className={`font-label-md text-[12px] font-medium pb-1 border-b-2 transition-colors ${mode === 'schema' ? 'text-secondary border-secondary' : 'text-on-surface-variant hover:text-on-surface border-transparent'}`}
            >
              Schema Mode
            </button>
          </div>

          {mode === 'schema' ? (
            /* Schema Mode */
            <div className="flex-1 overflow-auto p-lg">
              <h3 className="font-h3 text-[20px] font-semibold text-on-surface mb-md">Database Schema</h3>
              <pre className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md font-code-md text-[13px] text-secondary whitespace-pre-wrap overflow-auto shadow-inner">
                {schema || 'Loading schema...'}
              </pre>
            </div>
          ) : (
            /* Query Mode Split Container */
            <div className="flex-1 overflow-hidden relative flex">
              
                <div className="dashboard-main split-left" style={{ flex: 1 }}>
                  {/* NL Prompt Bar Area */}
                  <div className="nl-prompt-bar">
                    <input 
                      className="nl-input" 
                      placeholder="Describe your query... e.g. 'Show salary breakdown by department'" 
                      type="text"
                      value={naturalLanguage}
                      onChange={(e) => setNaturalLanguage(e.target.value)}
                      onKeyDown={handleNLKeyDown}
                      disabled={generating}
                    />
                    <button 
                      className="btn-generate"
                      onClick={handleGenerate}
                      disabled={generating || !naturalLanguage.trim()}
                    >
                      {generating ? 'Generating...' : 'Generate'}
                    </button>
                    <button 
                      className="btn-run"
                      onClick={handleRun}
                      disabled={executing}
                    >
                      {executing ? 'Running...' : 'Run'}
                    </button>
                  </div>

                  <div id="editor-pane" className="split-top relative">
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                      <div className="bg-surface/80 backdrop-blur border border-outline-variant/30 text-on-surface-variant px-2 py-1.5 rounded flex items-center justify-center font-code-sm text-[11px] gap-2">
                        <span className="text-secondary">DBA Mode</span>
                        <span className="w-px h-3 bg-outline-variant/50"></span>
                        <span>Ctrl+Enter to Run</span>
                      </div>
                    </div>
                    <MonacoEditor
                      value={editorQuery}
                      onChange={setEditorQuery}
                      onRun={handleRun}
                      editorRef={editorRef}
                    />
                  </div>
                <div id="results-pane" className="split-bottom relative">
                  <ResultsPanel
                    results={results}
                    executionTime={executionStats?.time}
                    rowCount={executionStats?.rowCount}
                    queryType={executionStats?.queryType}
                    hasExportPermission={true}
                    error={resultsError}
                  />
                </div>
              </div>

              {/* Right Split: AI Assistant Panel */}
              <div id="ai-pane" className="dashboard-ai split-right">
                <AIAssistantPanel
                  analysisResult={analysisResult}
                  status={analysisStatus}
                  editorRef={editorRef}
                  onImport={handleImport}
                />
              </div>
              
            </div>
          )}
        </div>
      </div>

      {/* Destructive Operation Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-surface-container-high border border-outline-variant/40 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-lg py-md border-b border-outline-variant/20 bg-surface-container-highest">
              <h2 className="font-h2 text-[20px] font-semibold text-error flex items-center gap-2">
                <AlertTriangle size={20} />
                Destructive Operation
              </h2>
              <button 
                onClick={() => setShowConfirm(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors rounded-full p-1 hover:bg-surface-variant"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-lg flex flex-col gap-md">
              <div className="bg-error-container/10 border border-error/30 rounded-lg p-3 flex gap-3 items-start">
                <AlertCircle size={18} className="text-error mt-0.5 shrink-0" />
                <div>
                  <div className="font-label-md text-[12px] font-medium text-error mb-1">Warning</div>
                  <div className="font-body-sm text-[13px] text-error/80 leading-relaxed">
                    This query contains a destructive operation that may permanently modify or delete data. This action cannot be undone.
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-md">
                <div className="font-label-md text-[12px] font-medium text-outline uppercase tracking-wider mb-2">Pending Query</div>
                <pre className="font-code-sm text-[12px] text-error whitespace-pre-wrap font-mono">{pendingQuery}</pre>
              </div>

              <div className="flex flex-col gap-sm">
                <label className="font-label-md text-[12px] font-medium text-on-surface-variant">Reason (required for audit log)</label>
                <textarea
                  className="w-full bg-surface-container border border-outline-variant/40 rounded-lg py-3 px-4 font-body-sm text-[13px] text-on-surface focus:border-error focus:ring-1 focus:ring-error/50 focus:outline-none transition-all placeholder:text-outline resize-y min-h-[80px]"
                  placeholder="Explain why you need to run this destructive query..."
                  value={confirmReason}
                  onChange={(e) => setConfirmReason(e.target.value)}
                />
              </div>
            </div>

            <div className="px-lg py-md border-t border-outline-variant/20 bg-surface-container-highest flex justify-end gap-3">
              <button 
                className="px-4 py-2 font-label-md text-[13px] font-medium text-on-surface hover:bg-surface-variant rounded-lg transition-colors border border-outline-variant/30"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 font-label-md text-[13px] font-medium text-on-error bg-error hover:brightness-110 rounded-lg transition-all shadow-[0_0_15px_-3px_rgba(255,180,171,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleConfirmExecute}
                disabled={!confirmReason.trim()}
              >
                Execute Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
