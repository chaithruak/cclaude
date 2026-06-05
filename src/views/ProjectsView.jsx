import React, { useState } from 'react'
import { FolderOpen, Plus, Trash2, Pencil, Check, X, MessageSquare, Calendar } from 'lucide-react'
import { useAppStore } from '../App.jsx'

export default function ProjectsView() {
  const store = useAppStore()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const handleCreate = () => {
    if (!newName.trim()) return
    store.createProject(newName.trim())
    setNewName('')
    setCreating(false)
  }

  const handleRename = (id) => {
    if (!editingName.trim()) { setEditingId(null); return }
    store.renameProject(id, editingName.trim())
    setEditingId(null)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4 }}>Projects</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Organize your conversations by project</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 9,
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 600,
            }}
          >
            <Plus size={15} /> New project
          </button>
        </div>

        {/* New project form */}
        {creating && (
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--accent)',
            borderRadius: 12, padding: '16px 18px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <FolderOpen size={16} color="var(--accent)" />
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
              placeholder="Project name…"
              style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)', background: 'transparent' }}
            />
            <button onClick={handleCreate} style={{ color: 'var(--success)', display: 'flex', padding: 4 }}><Check size={16} /></button>
            <button onClick={() => { setCreating(false); setNewName('') }} style={{ color: 'var(--text-muted)', display: 'flex', padding: 4 }}><X size={16} /></button>
          </div>
        )}

        {/* Project list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {store.projects.map(project => {
            const convs = store.conversations[project.id] ?? []
            const isActive = store.activeProjectId === project.id
            const isEditing = editingId === project.id

            return (
              <div
                key={project.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '16px 18px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onClick={() => store.setActiveProject(project.id)}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-surface)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: isActive ? 'var(--accent-dim)' : 'var(--bg-surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <FolderOpen size={18} color={isActive ? 'var(--accent)' : 'var(--text-muted)'} />
                  </div>

                  <div style={{ flex: 1 }}>
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(project.id); if (e.key === 'Escape') setEditingId(null) }}
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {project.name}
                        </span>
                        {isActive && (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 600 }}>Active</span>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                        <MessageSquare size={11} /> {convs.length} conversation{convs.length !== 1 ? 's' : ''}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                        <Calendar size={11} /> {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditingId(project.id); setEditingName(project.name) }}
                      style={{ color: 'var(--text-muted)', padding: 6, borderRadius: 7, display: 'flex' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                      title="Rename"
                    >
                      <Pencil size={14} />
                    </button>
                    {store.projects.length > 1 && (
                      <button
                        onClick={() => store.deleteProject(project.id)}
                        style={{ color: 'var(--text-muted)', padding: 6, borderRadius: 7, display: 'flex' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,92,92,0.12)'; e.currentTarget.style.color = 'var(--danger)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
