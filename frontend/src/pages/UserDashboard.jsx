import { useState, useEffect, useRef, useCallback } from 'react'
import Split from 'split.js'
import { Sparkles, Play } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useDebounce } from '../hooks/useDebounce'
import Navbar from '../components/shared/Navbar'
import UserSidebar from '../components/Sidebar/UserSidebar'
import MonacoEditor from '../components/Editor/MonacoEditor'
import ResultsPanel from '../components/Editor/ResultsPanel'
import AIAssistantPanel from '../components/AIAssistant/AIAssistantPanel'
import '../styles/dashboard.css'

export default function UserDashboard() {
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
  const [generating, setGenerating] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [hasExportPermission, setHasExportPermission] = useState(false)

  // Debounce editor content for auto-analysis
  const debouncedQuery = useDebounce(editorQuery, 3000)

  // Split.js refs
  const horizontalSplitRef = useRef(null)
  const verticalSplitRef = useRef(null)

  // Initialize Split.js
  useEffect(() => {
    let hSplit, vSplit;
    
    const initSplit = setTimeout(() => {
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
  }, [])

  useEffect(() => {
    fetchSchema()
    fetchHistory()
  }, [])

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.trim().length > 5 && schema) {
      // Prevent linter from wiping out the panel if we just imported a variant
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
      setHasExportPermission(true)
    } catch (err) {
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

  const handleRun = useCallback(async () => {
    const query = editorRef.current?.getValue?.() || editorQuery
    if (!query.trim()) {
      toast.error('No query to execute')
      return
    }

    setExecuting(true)
    setResultsError(null)

    try {
      const res = await api.post('/api/query/execute', { query: query.trim() })
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
  }, [editorQuery])

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
    if (query) {
      setEditorQuery(query)
    }
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
          <UserSidebar
            tables={tables}
            queryHistory={queryHistory}
            hasExportPermission={hasExportPermission}
            onTableClick={handleTableClick}
            onHistoryClick={handleHistoryClick}
          />
        </aside>

        <div id="main-pane" className="dashboard-main split-left">
          <div className="nl-prompt-bar">
            <input 
              className="nl-input" 
              placeholder="Describe your query in plain English (e.g., 'Find top 5 users by revenue this month')..." 
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
                  {user?.row_limit && <span className="text-warning">Limit: {user.row_limit}</span>}
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
              hasExportPermission={hasExportPermission}
              error={resultsError}
            />
          </div>
        </div>

        <div id="ai-pane" className="dashboard-ai split-right">
          <AIAssistantPanel
            analysisResult={analysisResult}
            status={analysisStatus}
            editorRef={editorRef}
            onImport={handleImport}
          />
        </div>
      </div>
    </div>
  )
}
