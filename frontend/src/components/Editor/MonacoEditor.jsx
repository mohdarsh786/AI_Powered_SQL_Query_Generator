import { useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'

export default function MonacoEditor({ value, onChange, onRun, editorRef }) {
  const monacoRef = useRef(null)

  const handleEditorWillMount = (monaco) => {
    monaco.editor.defineTheme('obsidian-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '4cd7f6' },      // secondary
        { token: 'string', foreground: 'ffb596' },       // tertiary
        { token: 'number', foreground: 'b4c5ff' },       // primary
        { token: 'operator', foreground: '8d90a0' },     // outline
        { token: 'comment', foreground: '434655', fontStyle: 'italic' }, // outline-variant
        { token: 'identifier', foreground: 'e1e2ed' },   // on-surface
        { token: 'type', foreground: '03b5d3' },         // secondary-container
        { token: 'predefined', foreground: 'b4c5ff' },   // primary
      ],
      colors: {
        'editor.background': '#0a0e17', // Main void background
        'editor.foreground': '#e1e2ed',
        'editor.lineHighlightBackground': '#1e2d45',
        'editorLineNumber.foreground': '#434655',
        'editorIndentGuide.background': '#1e2d45',
        'editorIndentGuide.activeBackground': '#32343d',
        'editor.selectionBackground': '#2563eb66',
        'editor.inactiveSelectionBackground': '#2563eb33',
        'editorCursor.foreground': '#4cd7f6',
        'editorWidget.background': '#11131b',
        'editorWidget.border': '#1e2d45',
      }
    })
  }

  const handleEditorDidMount = (editor, monaco) => {
    monacoRef.current = editor

    if (editorRef) {
      editorRef.current = editor
    }

    // Ctrl+Enter keybinding to run query
    editor.addAction({
      id: 'run-query',
      label: 'Run Query',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => {
        if (onRun) onRun()
      },
    })

    editor.focus()
  }

  const handleChange = (val) => {
    if (onChange) onChange(val || '')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (monacoRef.current) {
        monacoRef.current = null
      }
    }
  }, [])

  return (
    <div className="flex-1 flex bg-[#0a0e17] overflow-hidden relative w-full h-full">
      <Editor
        height="100%"
        language="sql"
        theme="obsidian-dark"
        beforeMount={handleEditorWillMount}
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 16 },
          renderLineHighlight: 'gutter',
          folding: true,
          bracketPairColorization: { enabled: true },
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
        }}
      />
    </div>
  )
}
