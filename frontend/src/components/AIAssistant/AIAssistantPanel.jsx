import React, { useState } from 'react'

export default function AIAssistantPanel({ analysisResult, status, editorRef, onImport }) {
  const [selectedVariant, setSelectedVariant] = useState(0)

  const handleImport = () => {
    const q = analysisResult?.variants?.[selectedVariant ?? analysisResult.recommended ?? 0]?.query 
           || analysisResult?.optimizedQuery
    if (q && editorRef?.current) {
      editorRef.current.setValue(q)
    }
    if (onImport && q) {
      onImport(q)
    }
  }

  // Idle state handling inside JSX
  return (
    <div className="ai-panel">
      {/* Header */}
      <div className="ai-panel-header">
        <span className="ai-panel-header-icon">✦</span>
        <span>AI Assistant</span>
        {status === 'analyzing' && <span className="ai-analyzing-dot" />}
      </div>

      {/* Body */}
      <div className="ai-panel-body">

        {/* IDLE STATE */}
        {(status === 'idle' || !status) && (
          <div className="ai-idle">
            <div className="ai-idle-icon">✦</div>
            <p className="ai-idle-title">AI Assistant is ready</p>
            <p className="ai-idle-subtitle">
              Type a natural language query above or write SQL directly — the assistant will analyze and suggest optimizations.
            </p>
          </div>
        )}

        {/* ANALYZING STATE */}
        {status === 'analyzing' && (
          <div className="ai-idle">
            <div className="ai-spinner" />
            <p className="ai-idle-title">Analyzing your query...</p>
          </div>
        )}

        {/* RESULT STATE */}
        {status === 'result' && analysisResult && !analysisResult.error && (
          <>
            {/* IMPACT WARNING — only for destructive ops */}
            {analysisResult.impactWarning && (
              <div className="ai-section">
                <div className="ai-impact-warning">
                  <span>🚨</span>
                  <span>{analysisResult.impactWarning}</span>
                </div>
              </div>
            )}

            {/* ISSUES (Only show for linting, hide for generation) */}
            {((Array.isArray(analysisResult.issues) && analysisResult.issues.length > 0 && !analysisResult.variants) || 
              (Array.isArray(analysisResult.suggestions) && analysisResult.suggestions.length > 0)) && (
              <div className="ai-section">
                <p className="ai-section-label">⚠ ISSUES DETECTED</p>
                {(analysisResult.issues || analysisResult.suggestions).map((issue, i) => (
                  <div key={i} className="ai-issue-card">
                    <span className="ai-issue-icon">⚠</span>
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ESTIMATED ROWS */}
            {analysisResult.estimatedRows && (
              <div className="ai-section">
                <p className="ai-section-label">IMPACT ESTIMATE</p>
                <div className="ai-estimate-card">
                  <span className="ai-estimate-icon">📊</span>
                  <span className="ai-estimate-text">{analysisResult.estimatedRows}</span>
                </div>
              </div>
            )}

            {/* VARIANTS */}
            {Array.isArray(analysisResult.variants) && analysisResult.variants.length > 0 && (
              <div className="ai-section">
                <p className="ai-section-label">QUERY VARIANTS ({analysisResult.variants.length})</p>
                {analysisResult.variants.map((variant, i) => (
                  <div
                    key={i}
                    className={`ai-variant-card ${selectedVariant === i ? 'selected' : ''}`}
                    onClick={() => setSelectedVariant(i)}
                  >
                    <div className="ai-variant-header">
                      <span>Option {i + 1}</span>
                      {analysisResult.recommended === i && (
                        <span className="ai-recommended-badge">★ Recommended</span>
                      )}
                    </div>
                    <pre className="ai-variant-code">{variant.query}</pre>
                    {Array.isArray(variant.clauses) && variant.clauses.length > 0 && (
                      <div className="ai-clauses">
                        {variant.clauses.map((clause, j) => (
                          <p key={j} className="ai-clause-item">• {clause}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <button className="btn-import" onClick={handleImport}>
                  ↓ Import Query to Editor
                </button>
              </div>
            )}

            {/* SINGLE OPTIMIZED QUERY (For Linting) */}
            {(!analysisResult.variants || analysisResult.variants.length === 0) && analysisResult.optimizedQuery && (
              <div className="ai-section">
                <p className="ai-section-label">OPTIMIZED QUERY</p>
                <div className="ai-variant-card selected">
                  <pre className="ai-variant-code">{analysisResult.optimizedQuery}</pre>
                </div>
                <button className="btn-import" onClick={handleImport}>
                  ↓ Import Query to Editor
                </button>
              </div>
            )}

            {/* EXPLANATION */}
            {analysisResult.explanation && (
              <div className="ai-section">
                <p className="ai-section-label">EXPLANATION</p>
                <p className="ai-explanation-text">{analysisResult.explanation}</p>
              </div>
            )}

            {/* META */}
            <div className="ai-meta-row">
              {analysisResult.dialect && (
                <span className="ai-meta-badge dialect">⊞ {analysisResult.dialect}</span>
              )}
              {analysisResult.estimatedRows && (
                <span className="ai-meta-badge rows">
                  ~ {analysisResult.estimatedRows}
                </span>
              )}
            </div>
          </>
        )}

        {/* ERROR STATE */}
        {(status === 'error' || (status === 'result' && analysisResult?.error)) && (
          <div className="ai-error-card">
            <span>⚠</span>
            <p>{analysisResult?.error || 'Analysis failed. Try again.'}</p>
          </div>
        )}

      </div>
    </div>
  )
}
