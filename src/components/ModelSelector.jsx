import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, Cpu, Search, X, Cloud, Monitor } from 'lucide-react'
import { useAppStore } from '../App.jsx'

function resolveBase(endpoint) {
  if (endpoint) return endpoint
  if (typeof window !== 'undefined' && window.electron) return 'http://localhost:8082'
  return ''
}

const LOCAL_PROVIDERS = ['ollama', 'lmstudio', 'lm_studio', 'llamacpp', 'llama.cpp', 'llama_cpp']

// Strip fcc-server routing prefix for DISPLAY only — never for API calls
function displayName(rawId) {
  return rawId.replace(/^claude-[^/]+\//, '').replace(/^anthropic\//, '')
}

function isLocal(rawId) {
  const first = displayName(rawId).split('/')[0].toLowerCase()
  return LOCAL_PROVIDERS.includes(first)
}

export default function ModelSelector() {
  const store = useAppStore()
  const [models, setModels] = useState([])   // stores RAW IDs from API (for API calls)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [connected, setConnected] = useState(false)
  const ref = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    async function fetchModels() {
      try {
        const base = resolveBase(store.settings.endpoint)
        const res = await fetch(`${base}/v1/models`, {
          headers: { 'x-api-key': store.settings.authToken, 'anthropic-version': '2023-06-01' }
        })
        if (res.ok) {
          const data = await res.json()
          // Keep RAW IDs — sort by display name
          const ids = (data.data ?? data.models ?? [])
            .map(m => m.id ?? m)
            .sort((a, b) => displayName(a).localeCompare(displayName(b)))
          setModels(ids)
          setConnected(true)
          if (!store.settings.model && ids.length) {
            store.updateSettings({ model: ids[0] })
          }
        } else {
          setConnected(false)
        }
      } catch {
        setConnected(false)
      }
    }
    fetchModels()
  }, [store.settings.endpoint, store.settings.authToken])

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
    else setQuery('')
  }, [open])

  const current = store.settings.model  // RAW ID used for API calls
  const filtered = query
    ? models.filter(id => displayName(id).toLowerCase().includes(query.toLowerCase()))
    : models

  const CLOUD_COLOR = '#6b9cf7'
  const LOCAL_COLOR = '#c98a4b'
  const ACTIVE_COLOR = '#4caf81'

  return (
    <div ref={ref} style={{ position: 'relative' }}>

      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 12px', borderRadius: 8,
          background: open ? 'var(--bg-surface-2)' : 'var(--bg-surface)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          color: 'var(--text-secondary)', fontSize: 12,
          transition: 'background 0.1s, border-color 0.15s',
        }}
      >
        {/* Server status dot */}
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: connected ? '#4caf81' : '#e05c5c',
          boxShadow: connected ? '0 0 5px #4caf81' : '0 0 5px #e05c5c',
        }} title={connected ? 'Server connected' : 'Server not reachable'} />

        <Cpu size={13} style={{ flexShrink: 0 }} />
        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>Select Model</span>

        {current && (
          <>
            <span style={{ color: 'var(--border)', flexShrink: 0 }}>·</span>
            <span style={{ color: isLocal(current) ? LOCAL_COLOR : CLOUD_COLOR, display: 'flex', flexShrink: 0 }}>
              {isLocal(current) ? <Monitor size={12} /> : <Cloud size={12} />}
            </span>
            <span style={{ fontWeight: 600, color: ACTIVE_COLOR, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName(current)}
            </span>
          </>
        )}

        <ChevronDown size={12} style={{ flexShrink: 0, marginLeft: 2, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
          zIndex: 100, width: 480,
          display: 'flex', flexDirection: 'column',
          maxHeight: 480, overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>
                {filtered.length} of {models.length} models
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: CLOUD_COLOR }}>
                <Cloud size={10} /> Cloud
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: LOCAL_COLOR }}>
                <Monitor size={10} /> Local
              </span>
              <span style={{ fontSize: 10, color: ACTIVE_COLOR }}>● Active</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
              borderRadius: 7, padding: '6px 10px',
            }}>
              <Search size={13} color="var(--text-muted)" />
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setOpen(false); setQuery('') }
                  if (e.key === 'Enter' && filtered.length === 1) {
                    store.updateSettings({ model: filtered[0] }); setOpen(false); setQuery('')
                  }
                }}
                placeholder={`Search ${models.length} models…`}
                style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', background: 'transparent' }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ color: 'var(--text-muted)', display: 'flex' }}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List — shows display names, stores raw IDs */}
          <div style={{ overflowY: 'auto', padding: 6, flex: 1, minHeight: 0 }}>
            {models.length === 0 && (
              <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                No models found — is <code>fcc-server</code> running?
              </div>
            )}
            {filtered.length === 0 && models.length > 0 && (
              <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                No models match "<strong>{query}</strong>"
              </div>
            )}
            {filtered.map((rawId, i) => {
              const isActive = store.settings.model === rawId
              const local = isLocal(rawId)
              const typeColor = local ? LOCAL_COLOR : CLOUD_COLOR
              return (
                <button
                  key={`${rawId}-${i}`}
                  title={rawId}  // hover shows raw ID
                  onClick={() => { store.updateSettings({ model: rawId }); setOpen(false); setQuery('') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', textAlign: 'left',
                    padding: '8px 12px', borderRadius: 7, fontSize: 12, marginBottom: 1,
                    color: isActive ? ACTIVE_COLOR : 'var(--text-secondary)',
                    background: isActive ? 'rgba(76,175,129,0.1)' : 'transparent',
                    border: `1px solid ${isActive ? 'rgba(76,175,129,0.3)' : 'transparent'}`,
                    fontWeight: isActive ? 600 : 400,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ color: typeColor, display: 'flex', flexShrink: 0 }}>
                    {local ? <Monitor size={13} /> : <Cloud size={13} />}
                  </span>
                  <span style={{ flex: 1, wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {displayName(rawId)}
                  </span>
                  {isActive && (
                    <span style={{ fontSize: 9, color: ACTIVE_COLOR, fontWeight: 800, flexShrink: 0, letterSpacing: '0.05em' }}>
                      ACTIVE
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div style={{ padding: '5px 10px 7px', borderTop: '1px solid var(--border-subtle)', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
            ↵ select · Esc close · hover for full ID
          </div>
        </div>
      )}
    </div>
  )
}
