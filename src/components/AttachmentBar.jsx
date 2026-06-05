import React, { useRef, useState } from 'react'
import { Paperclip, Image, Github, X, FileText, FileCode, File } from 'lucide-react'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase()
  if (['js','jsx','ts','tsx','py','java','c','cpp','cs','go','rs','rb','php','swift'].includes(ext)) return <FileCode size={12} />
  if (['txt','md','csv','json','yaml','yml','toml','xml','html','css'].includes(ext)) return <FileText size={12} />
  return <File size={12} />
}

function isImage(name) {
  return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name)
}

async function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

async function fetchGitHubFile(url) {
  // Convert github.com/user/repo/blob/branch/path → raw.githubusercontent.com
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/)
  if (match) {
    const rawUrl = `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}/${match[4]}`
    const res = await fetch(rawUrl)
    if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`)
    const text = await res.text()
    const filename = match[4].split('/').pop()
    return { name: filename, content: text, type: 'text', url: rawUrl }
  }
  // Try raw URL directly
  if (url.includes('raw.githubusercontent.com')) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
    const text = await res.text()
    const filename = url.split('/').pop()
    return { name: filename, content: text, type: 'text', url }
  }
  throw new Error('Please paste a GitHub file URL (github.com/.../blob/...)')
}

export default function AttachmentBar({ attachments, onAdd, onRemove }) {
  const fileRef = useRef(null)
  const imageRef = useRef(null)
  const [ghUrl, setGhUrl] = useState('')
  const [showGh, setShowGh] = useState(false)
  const [ghLoading, setGhLoading] = useState(false)
  const [ghError, setGhError] = useState('')

  async function handleFiles(files) {
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) { alert(`${file.name} is too large (max 10MB)`); continue }
      try {
        if (isImage(file.name)) {
          const b64 = await readFileAsBase64(file)
          const mime = file.type || 'image/png'
          onAdd({ id: Date.now() + Math.random(), name: file.name, type: 'image', mime, data: b64, preview: URL.createObjectURL(file) })
        } else {
          const text = await readFileAsText(file)
          onAdd({ id: Date.now() + Math.random(), name: file.name, type: 'text', content: text })
        }
      } catch { alert(`Failed to read ${file.name}`) }
    }
  }

  async function handleGitHub() {
    if (!ghUrl.trim()) return
    setGhLoading(true)
    setGhError('')
    try {
      const result = await fetchGitHubFile(ghUrl.trim())
      onAdd({ id: Date.now(), ...result })
      setGhUrl('')
      setShowGh(false)
    } catch (e) {
      setGhError(e.message)
    }
    setGhLoading(false)
  }

  return (
    <div>
      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {attachments.map(att => (
            <div key={att.id} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 8px 3px 6px', borderRadius: 20,
              background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
              fontSize: 11, color: 'var(--text-secondary)', maxWidth: 200,
            }}>
              {att.type === 'image'
                ? <img src={att.preview} alt={att.name} style={{ width: 16, height: 16, borderRadius: 2, objectFit: 'cover' }} />
                : <span style={{ color: 'var(--accent)' }}>{fileIcon(att.name)}</span>
              }
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{att.name}</span>
              <button onClick={() => onRemove(att.id)} style={{ color: 'var(--text-muted)', display: 'flex', marginLeft: 2 }}>
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* GitHub URL input */}
      {showGh && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            autoFocus
            value={ghUrl}
            onChange={e => { setGhUrl(e.target.value); setGhError('') }}
            onKeyDown={e => { if (e.key === 'Enter') handleGitHub(); if (e.key === 'Escape') setShowGh(false) }}
            placeholder="Paste GitHub file URL…"
            style={{
              flex: 1, fontSize: 12, padding: '5px 10px', borderRadius: 7,
              background: 'var(--bg-surface-2)', border: `1px solid ${ghError ? 'var(--danger)' : 'var(--border)'}`,
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={handleGitHub}
            disabled={ghLoading}
            style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600 }}
          >
            {ghLoading ? '…' : 'Fetch'}
          </button>
          <button onClick={() => { setShowGh(false); setGhError('') }} style={{ color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
            <X size={14} />
          </button>
        </div>
      )}
      {ghError && <div style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 6 }}>{ghError}</div>}

      {/* Toolbar buttons */}
      <div style={{ display: 'flex', gap: 2 }}>
        <input ref={fileRef} type="file" multiple accept=".txt,.md,.py,.js,.jsx,.ts,.tsx,.json,.csv,.yaml,.yml,.html,.css,.java,.c,.cpp,.cs,.go,.rs,.rb,.php,.swift,.toml,.xml,.pdf" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        <input ref={imageRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />

        <AttachBtn icon={<Paperclip size={13} />} label="Attach file" onClick={() => fileRef.current?.click()} />
        <AttachBtn icon={<Image size={13} />} label="Attach image" onClick={() => imageRef.current?.click()} />
        <AttachBtn icon={<Github size={13} />} label="GitHub file" onClick={() => setShowGh(s => !s)} active={showGh} />
      </div>
    </div>
  )
}

function AttachBtn({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 8px', borderRadius: 6, fontSize: 11,
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        background: active ? 'var(--accent-dim)' : 'transparent',
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
    >
      {icon} {label}
    </button>
  )
}
