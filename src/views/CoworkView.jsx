import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Terminal, FolderOpen, Send, Square, Zap, ZapOff,
  Check, X, ChevronRight, ChevronDown, File, Folder,
  Trash2, RefreshCw, Play, AlertCircle, CheckCircle,
  Settings, Info, ToggleLeft, ToggleRight, History
} from 'lucide-react'
import { useAppStore } from '../App.jsx'
import {
  useCowork, buildCoworkSystemPrompt, stripToolCalls,
  COWORK_TOOLS, parseToolCalls
} from '../hooks/useCowork.js'

const isElectron = typeof window !== 'undefined' && !!window.coworkFS

// ── CoworkView ────────────────────────────────────────────────────────────────
export default function CoworkView() {
  const store = useAppStore()
  const [workingDir, setWorkingDir] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [customInstructions, setCustomInstructions] = useState('')
  const [activePanel, setActivePanel] = useState('chat') // chat | explorer | log
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  const systemPrompt = buildCoworkSystemPrompt(customInstructions, workingDir)

  const {
    messages, isRunning, pendingActions, actionLog, autoMode,
    setAutoMode, send, abort, approveAction, clearMessages,
  } = useCowork({
    endpoint: store.settings.endpoint,
    authToken: store.settings.authToken,
    model: store.settings.model,
    systemPrompt,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [input])

  // Pick working directory
  const pickDir = async () => {
    if (!isElectron) return
    const res = await window.coworkFS.pickDir()
    if (res.path) setWorkingDir(res.path)
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text || isRunning) return
    setInput('')
    send(text)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  if (!isElectron) {
    return <NotElectronBanner />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)' }}>

      {/* Top bar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-base)', flexShrink: 0 }}>
        <Terminal size={16} color="var(--accent)" />
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Cowork</span>

        {/* Working dir */}
        <button
          onClick={pickDir}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: 11, color: workingDir ? 'var(--accent)' : 'var(--text-muted)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title="Click to change working directory"
        >
          <FolderOpen size={11} />
          {workingDir || 'Pick working directory…'}
        </button>

        <div style={{ flex: 1 }} />

        {/* Auto / Ask toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <span style={{ color: 'var(--text-muted)' }}>Mode:</span>
          <button
            onClick={() => setAutoMode(m => !m)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: autoMode ? 'rgba(224,92,92,0.15)' : 'var(--accent-dim)', color: autoMode ? '#e05c5c' : 'var(--accent)', border: `1px solid ${autoMode ? '#e05c5c50' : 'rgba(201,138,75,0.3)'}` }}
          >
            {autoMode ? <><Zap size={10} /> Auto</> : <><ZapOff size={10} /> Ask first</>}
          </button>
        </div>

        {/* Panel tabs */}
        {['chat', 'explorer', 'log'].map(p => (
          <button key={p} onClick={() => setActivePanel(p)}
            style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: activePanel === p ? 600 : 400, background: activePanel === p ? 'var(--bg-active)' : 'transparent', color: activePanel === p ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {p === 'chat' ? 'Chat' : p === 'explorer' ? 'Explorer' : 'Log'}
            {p === 'log' && actionLog.length > 0 && <span style={{ marginLeft: 4, padding: '0 4px', borderRadius: 10, background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 9 }}>{actionLog.length}</span>}
          </button>
        ))}

        <button onClick={() => setShowSettings(s => !s)} style={{ color: 'var(--text-muted)', display: 'flex', padding: 4 }} title="Cowork settings">
          <Settings size={14} />
        </button>

        <button onClick={clearMessages} style={{ color: 'var(--text-muted)', display: 'flex', padding: 4 }} title="Clear chat">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Custom instructions for Cowork agent</div>
          <textarea
            value={customInstructions}
            onChange={e => setCustomInstructions(e.target.value)}
            placeholder="e.g. Always use TypeScript. Prefer functional components. Use 2-space indentation."
            rows={3}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 7, background: 'var(--bg-surface-2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-primary)', resize: 'vertical' }}
          />
        </div>
      )}

      {/* Pending approvals banner */}
      {pendingActions.length > 0 && (
        <div style={{ background: 'rgba(201,138,75,0.08)', borderBottom: '1px solid rgba(201,138,75,0.3)', padding: '10px 16px', flexShrink: 0 }}>
          {pendingActions.map((action, i) => (
            <ActionApproval key={i} action={action} onApprove={() => approveAction(action, true)} onReject={() => approveAction(action, false)} />
          ))}
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activePanel === 'chat' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {messages.length === 0 && <CoworkWelcome workingDir={workingDir} onPickDir={pickDir} autoMode={autoMode} />}
            {messages.map((msg, i) => (
              <CoworkMessage key={msg.id || i} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
        {activePanel === 'explorer' && (
          <FileExplorer workingDir={workingDir} onPickDir={pickDir} />
        )}
        {activePanel === 'log' && (
          <ActionLog log={actionLog} />
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-base)', flexShrink: 0 }}>
        <div style={{
          background: 'var(--bg-surface)', border: `1px solid ${isRunning ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 12, padding: '10px 12px',
          boxShadow: isRunning ? '0 0 0 2px rgba(201,138,75,0.1)' : '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'border-color 0.2s',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={workingDir ? `Tell Cowork what to do… (working in ${workingDir.split(/[\\/]/).pop()})` : 'Pick a working directory first, then tell Cowork what to do…'}
            rows={1}
            style={{ width: '100%', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, maxHeight: 160, background: 'transparent', display: 'block' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 'auto' }}>
              {isRunning ? '⚡ Agent running…' : '↵ Send · Shift+↵ newline'}
            </span>
            {isRunning ? (
              <button onClick={abort} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, background: 'rgba(224,92,92,0.15)', color: '#e05c5c', fontSize: 12 }}>
                <Square size={11} /> Stop
              </button>
            ) : (
              <button onClick={handleSend} disabled={!input.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 7, background: input.trim() ? 'var(--accent)' : 'var(--bg-hover)', color: input.trim() ? '#fff' : 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
                <Send size={12} /> Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Message renderer ──────────────────────────────────────────────────────────
function CoworkMessage({ message }) {
  const isUser = message.role === 'user'
  const isTool = message.role === 'tool'

  if (isTool) {
    return (
      <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: message.approved ? 'rgba(76,175,129,0.08)' : 'rgba(224,92,92,0.08)', border: `1px solid ${message.approved ? 'rgba(76,175,129,0.25)' : 'rgba(224,92,92,0.25)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: message.result ? 6 : 0 }}>
          {message.approved ? <CheckCircle size={12} color="#4caf81" /> : <X size={12} color="#e05c5c" />}
          <span style={{ fontSize: 11, fontWeight: 700, color: message.approved ? '#4caf81' : '#e05c5c' }}>
            {message.approved ? '✓' : '✗'} {message.name}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {JSON.stringify(message.args)}
          </span>
        </div>
        {message.result && (
          <pre style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-surface-2)', padding: '6px 8px', borderRadius: 5, overflowX: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {message.result.ok
              ? (message.result.content ?? message.result.stdout ?? JSON.stringify(message.result)).slice(0, 2000)
              : `Error: ${message.result.error}`}
          </pre>
        )}
      </div>
    )
  }

  const displayText = isUser ? message.content : stripToolCalls(message.content)
  const toolCalls = !isUser ? parseToolCalls(message.content) : []

  return (
    <div style={{ marginBottom: 12, display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 8 }}>
      {!isUser && (
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: 'var(--accent)', fontWeight: 700, marginTop: 2 }}>⚡</div>
      )}
      <div style={{ maxWidth: isUser ? '70%' : '90%' }}>
        {displayText && (
          <div style={{ padding: isUser ? '9px 13px' : '2px 0', background: isUser ? 'var(--bg-surface-2)' : 'transparent', borderRadius: isUser ? 10 : 0, fontSize: 13, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {displayText}
            {message.streaming && <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--accent)', marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />}
          </div>
        )}
        {toolCalls.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {toolCalls.map((call, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'rgba(201,138,75,0.1)', border: '1px solid rgba(201,138,75,0.25)', fontSize: 11 }}>
                <Play size={10} color="var(--accent)" />
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{call.name}</span>
                <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{JSON.stringify(call.args)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Action approval card ──────────────────────────────────────────────────────
function ActionApproval({ action, onApprove, onReject }) {
  const isDestructive = ['delete_file', 'run_command'].includes(action.name)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-surface)', border: `1px solid ${isDestructive ? 'rgba(224,92,92,0.4)' : 'rgba(201,138,75,0.4)'}`, marginBottom: 6 }}>
      <AlertCircle size={14} color={isDestructive ? '#e05c5c' : 'var(--accent)'} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{action.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{JSON.stringify(action.args)}</div>
      </div>
      <button onClick={onApprove} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 6, background: 'rgba(76,175,129,0.15)', color: '#4caf81', fontSize: 11, fontWeight: 700 }}>
        <Check size={11} /> Approve
      </button>
      <button onClick={onReject} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 6, background: 'rgba(224,92,92,0.12)', color: '#e05c5c', fontSize: 11, fontWeight: 700 }}>
        <X size={11} /> Reject
      </button>
    </div>
  )
}

// ── File Explorer ─────────────────────────────────────────────────────────────
function FileExplorer({ workingDir, onPickDir }) {
  const [entries, setEntries] = useState([])
  const [currentPath, setCurrentPath] = useState(workingDir)
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState('')

  useEffect(() => {
    if (workingDir) { setCurrentPath(workingDir); loadDir(workingDir) }
  }, [workingDir])

  async function loadDir(p) {
    setLoading(true)
    const res = await window.coworkFS.list(p)
    if (res.ok) {
      setCurrentPath(p)
      setEntries(res.entries.sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name)))
    }
    setLoading(false)
  }

  async function openFile(entry) {
    if (entry.isDir) { loadDir(entry.path); return }
    const res = await window.coworkFS.read(entry.path)
    if (res.ok) { setSelectedFile(entry); setFileContent(res.content) }
  }

  const pathParts = currentPath ? currentPath.replace(/\\/g, '/').split('/').filter(Boolean) : []

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* File tree */}
      <div style={{ width: 260, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Breadcrumb */}
        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {currentPath ? (
            pathParts.map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={10} color="var(--text-muted)" />}
                <button onClick={() => loadDir('/' + pathParts.slice(0, i + 1).join('/'))}
                  style={{ fontSize: 10, color: i === pathParts.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {part}
                </button>
              </React.Fragment>
            ))
          ) : (
            <button onClick={onPickDir} style={{ fontSize: 11, color: 'var(--accent)' }}>Pick directory…</button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {loading && <div style={{ padding: 12, fontSize: 11, color: 'var(--text-muted)' }}>Loading…</div>}
          {!loading && currentPath && (
            <button onClick={() => loadDir(currentPath.replace(/[\\/][^\\/]+$/, '') || '/')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 12px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'left' }}>
              <ChevronDown size={10} style={{ transform: 'rotate(90deg)' }} /> ..
            </button>
          )}
          {entries.map(e => (
            <button key={e.path} onClick={() => openFile(e)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 12px', fontSize: 11, textAlign: 'left', color: selectedFile?.path === e.path ? 'var(--accent)' : 'var(--text-secondary)', background: selectedFile?.path === e.path ? 'var(--bg-active)' : 'transparent' }}
              onMouseEnter={ev => { if (selectedFile?.path !== e.path) ev.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={ev => { if (selectedFile?.path !== e.path) ev.currentTarget.style.background = 'transparent' }}>
              {e.isDir ? <Folder size={12} color="#6b9cf7" /> : <File size={12} color="var(--text-muted)" />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{e.name}</span>
              {e.size != null && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{e.size > 1024 ? (e.size / 1024).toFixed(0) + 'k' : e.size + 'b'}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* File preview */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedFile ? (
          <>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <File size={11} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedFile.name}</span>
              <span>{selectedFile.path}</span>
            </div>
            <pre style={{ flex: 1, overflowY: 'auto', margin: 0, padding: '12px 16px', fontSize: 12, lineHeight: 1.6, fontFamily: 'Consolas, monospace', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {fileContent}
            </pre>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>
            Select a file to preview
          </div>
        )}
      </div>
    </div>
  )
}

// ── Action Log ────────────────────────────────────────────────────────────────
function ActionLog({ log }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
      {log.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>No actions yet</div>
      )}
      {[...log].reverse().map((entry, i) => (
        <div key={i} style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-surface)', border: `1px solid ${entry.approved ? 'rgba(76,175,129,0.2)' : 'rgba(224,92,92,0.2)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {entry.approved ? <CheckCircle size={12} color="#4caf81" /> : <X size={12} color="#e05c5c" />}
            <span style={{ fontSize: 11, fontWeight: 700, color: entry.approved ? '#4caf81' : '#e05c5c' }}>{entry.name}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
          </div>
          <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{JSON.stringify(entry.args)}</div>
        </div>
      ))}
    </div>
  )
}

// ── Welcome screen ────────────────────────────────────────────────────────────
function CoworkWelcome({ workingDir, onPickDir, autoMode }) {
  const examples = [
    'List all Python files in this project',
    'Read package.json and summarize the dependencies',
    'Create a new file called hello.py with a hello world script',
    'Find all TODO comments in the codebase',
    'Run npm test and show me the results',
  ]
  return (
    <div style={{ padding: '20px 0', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Terminal size={20} color="var(--accent)" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>CClaude Cowork</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>AI agent with full system control</div>
        </div>
      </div>

      {!workingDir && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid rgba(201,138,75,0.3)', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>Set a working directory first</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>This tells the agent where to read and write files.</div>
          <button onClick={onPickDir} style={{ padding: '6px 14px', borderRadius: 7, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600 }}>
            Pick directory
          </button>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Mode: {autoMode ? '⚡ Auto — executes immediately' : '🛡️ Ask first — approves each action'}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, marginTop: 14 }}>
          Available tools ({COWORK_TOOLS.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {COWORK_TOOLS.map(t => (
            <span key={t.name} style={{ padding: '3px 8px', borderRadius: 20, background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {t.name}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Try asking</div>
        {examples.map((ex, i) => (
          <div key={i} style={{ padding: '8px 12px', borderRadius: 7, background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5, cursor: 'default' }}>
            "{ex}"
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Not in Electron banner ────────────────────────────────────────────────────
function NotElectronBanner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40, textAlign: 'center' }}>
      <Terminal size={40} color="var(--accent)" style={{ marginBottom: 20 }} />
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Cowork requires the desktop app</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 420, lineHeight: 1.7 }}>
        Cowork needs direct access to your file system and shell. Run <code style={{ background: 'var(--bg-surface)', padding: '1px 6px', borderRadius: 4 }}>npm run electron:dev</code> to use it.
      </p>
    </div>
  )
}
