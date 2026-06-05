import React, { useState } from 'react'
import { X, Server, Key, Cpu, MessageSquare, CheckCircle } from 'lucide-react'
import { useAppStore } from '../App.jsx'

export default function SettingsModal({ onClose }) {
  const store = useAppStore()
  const [form, setForm] = useState({ ...store.settings })
  const [saved, setSaved] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    store.updateSettings(form)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 16, width: 480, maxWidth: '90vw',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        padding: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Settings</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <Field icon={<Server size={14} />} label="Local endpoint" hint="Your free-claude-code server URL">
          <input
            value={form.endpoint}
            onChange={e => set('endpoint', e.target.value)}
            style={inputStyle}
            placeholder="leave blank to use built-in proxy (recommended)"
          />
        </Field>

        <Field icon={<Key size={14} />} label="Auth token" hint="Default is 'freecc'">
          <input
            value={form.authToken}
            onChange={e => set('authToken', e.target.value)}
            style={inputStyle}
            placeholder="freecc"
          />
        </Field>

        <Field icon={<Cpu size={14} />} label="Default model" hint="Leave blank to use model selector">
          <input
            value={form.model}
            onChange={e => set('model', e.target.value)}
            style={inputStyle}
            placeholder="e.g. nvidia_nim/nvidia/..."
          />
        </Field>

        <Field icon={<MessageSquare size={14} />} label="System prompt" hint="Sent with every message">
          <textarea
            value={form.systemPrompt}
            onChange={e => set('systemPrompt', e.target.value)}
            rows={4}
            style={{ ...inputStyle, height: 'auto', resize: 'vertical' }}
          />
        </Field>

        <button
          onClick={handleSave}
          style={{
            width: '100%', padding: '10px', borderRadius: 10,
            background: saved ? 'var(--success)' : 'var(--accent)',
            color: '#fff', fontWeight: 600, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.2s',
          }}
        >
          {saved ? <><CheckCircle size={16} /> Saved</> : 'Save settings'}
        </button>
      </div>
    </div>
  )
}

function Field({ icon, label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>
        {icon} {label}
        {hint && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— {hint}</span>}
      </div>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 12px',
  background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 13, color: 'var(--text-primary)',
}
