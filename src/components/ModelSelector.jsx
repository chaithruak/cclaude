import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, Cpu, Search, X } from 'lucide-react'
import { useAppStore } from '../App.jsx'

function resolveBase(endpoint) {
  if (endpoint) return endpoint
  if (typeof window !== 'undefined' && window.electron) return 'http://localhost:8082'
  return ''
}

export default function ModelSelector() {
  const store = useAppStore()
  const [models, setModels] = useState([])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
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
          const ids = (data.data ?? data.models ?? []).map(m => m.id ?? m)
          setModels(ids)
          if (!store.settings.model && ids.length) {
            store.updateSettings({ model: ids[0] })
          }
        }
      } catch {}
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

  const current = store.settings.model
  const filtered = query ? models.filter(id => id.toLowerCase().includes(query.toLowerCase())) : models

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8,
          background: open ? 'var(--bg-surface-2)' : 'var(--bg-surface)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          color: 'var(--text-secondary)', fontSize: 12,
          transition: 'background 0.1s, border-color 0.15s',
        }}
      >
        <Cpu size={13} />
        <span style={{ color: 'var(--text-muted)' }}>Select Model</span>
        {current && (
          <>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span style={{ fontWeight: 600, color: 'var(--accent)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {current}
            </span>
          </>
        )}
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
          zIndex: 100, width: 340,
          display: 'flex', flexDirection: 'column',
          maxHeight: 400, overflow: 'hidden',
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
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
            {filtered.map((id, i) => {
              const isActive = store.settings.model === id
              return (
                <button
                  key={`${id}-${i}`}
                  title={id}
                  onClick={() => { store.updateSettings({ model: id }); setOpen(false); setQuery('') }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 12px', borderRadius: 7, fontSize: 12, marginBottom: 1,
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    background: isActive ? 'var(--accent-dim)' : 'transparent',
                    fontWeight: isActive ? 600 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  {id}
                </button>
              )
            })}
          </div>

          <div style={{ padding: '5px 10px 7px', borderTop: '1px solid var(--border-subtle)', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
            {filtered.length} of {models.length} models · ↵ select · Esc close
          </div>
        </div>
      )}
    </div>
  )
}
