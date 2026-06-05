import React, { useState, useRef } from 'react'
import { FolderOpen, Plus, Trash2, Pencil, MessageSquare, Calendar, BookOpen, FileText, X, Upload } from 'lucide-react'
import { useAppStore } from '../App.jsx'

export default function ProjectsView() {
  const store = useAppStore()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [knowledgeProjectId, setKnowledgeProjectId] = useState(null)

  const handleCreate = () => {
    if (!newName.trim()) return
    store.createProject(newName.trim())
    setNewName(''); setCreating(false)
  }

  const handleRename = (id) => {
    if (!editingName.trim()) { setEditingId(null); return }
    store.renameProject(id, editingName.trim()); setEditingId(null)
  }

  const knowledgeProject = store.projects.find(p => p.id === knowledgeProjectId)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {knowledgeProjectId ? (
          <KnowledgePanel
            project={knowledgeProject}
            store={store}
            onBack={() => setKnowledgeProjectId(null)}
          />
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4 }}>Projects</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Organise conversations and add persistent knowledge per project.</p>
              </div>
              <button onClick={() => setCreating(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                <Plus size={14} /> New project
              </button>
            </div>

            {/* New project form */}
            {creating && (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--accent)', borderRadius: 12, padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <FolderOpen size={16} color="var(--accent)" />
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
                  placeholder="Project name…" style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)', background: 'transparent' }} />
                <button onClick={handleCreate} style={{ color: 'var(--success)', display: 'flex', padding: 4 }}>✓</button>
                <button onClick={() => { setCreating(false); setNewName('') }} style={{ color: 'var(--text-muted)', display: 'flex', padding: 4 }}><X size={16} /></button>
              </div>
            )}

            {/* Project list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {store.projects.map(project => {
                const convs = store.conversations[project.id] ?? []
                const isActive = store.activeProjectId === project.id
                const pk = store.projectKnowledge[project.id] ?? { instructions: '', files: [] }
                const knowledgeCount = (pk.files?.length ?? 0) + (pk.instructions?.trim() ? 1 : 0)

                return (
                  <div key={project.id} style={{
                    background: 'var(--bg-surface)', border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                    onClick={() => store.setActiveProject(project.id)}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-surface)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: isActive ? 'var(--accent-dim)' : 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FolderOpen size={18} color={isActive ? 'var(--accent)' : 'var(--text-muted)'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        {editingId === project.id ? (
                          <input autoFocus value={editingName} onChange={e => setEditingName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRename(project.id); if (e.key === 'Escape') setEditingId(null) }}
                            onClick={e => e.stopPropagation()}
                            style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{project.name}</span>
                            {isActive && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 700 }}>Active</span>}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                            <MessageSquare size={10} /> {convs.length} conv{convs.length !== 1 ? 's' : ''}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: knowledgeCount > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                            <BookOpen size={10} /> {knowledgeCount > 0 ? `${knowledgeCount} knowledge item${knowledgeCount !== 1 ? 's' : ''}` : 'No knowledge'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                            <Calendar size={10} /> {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setKnowledgeProjectId(project.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 7, fontSize: 11, color: knowledgeCount > 0 ? 'var(--success)' : 'var(--text-muted)', border: '1px solid var(--border)' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--success)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                          title="Manage project knowledge">
                          <BookOpen size={12} /> Knowledge
                        </button>
                        <button onClick={() => { setEditingId(project.id); setEditingName(project.name) }}
                          style={{ color: 'var(--text-muted)', padding: 6, borderRadius: 7, display: 'flex' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <Pencil size={13} />
                        </button>
                        {store.projects.length > 1 && (
                          <button onClick={() => store.deleteProject(project.id)}
                            style={{ color: 'var(--text-muted)', padding: 6, borderRadius: 7, display: 'flex' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,92,92,0.12)'; e.currentTarget.style.color = 'var(--danger)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Knowledge Panel ───────────────────────────────────────────────────────────
function KnowledgePanel({ project, store, onBack }) {
  const pk = store.projectKnowledge[project.id] ?? { instructions: '', files: [] }
  const [instructions, setInstructions] = useState(pk.instructions || '')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef(null)

  function handleSaveInstructions() {
    store.updateProjectKnowledge(project.id, { instructions })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  async function handleFiles(files) {
    for (const file of Array.from(files)) {
      try {
        const content = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsText(file)
        })
        store.addKnowledgeFile(project.id, { id: `kf_${Date.now()}`, name: file.name, content, size: file.size })
      } catch { alert(`Failed to read ${file.name}`) }
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 7, fontSize: 13, border: '1px solid var(--border)' }}>← Back</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>
            <FolderOpen size={18} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            {project.name} — Knowledge
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
            This content is injected into every conversation in this project.
          </p>
        </div>
      </div>

      {/* Custom instructions */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Pencil size={13} color="var(--accent)" /> Custom Instructions
        </div>
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="Describe the project context, goals, coding conventions, preferences…&#10;&#10;Example: This is a React TypeScript project using Tailwind CSS. Always use functional components with hooks. Follow the existing file structure."
          rows={6}
          style={{ width: '100%', fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.6, resize: 'vertical' }}
        />
        <button onClick={handleSaveInstructions}
          style={{ marginTop: 10, padding: '7px 16px', borderRadius: 8, background: saved ? 'var(--success)' : 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          {saved ? '✓ Saved' : 'Save instructions'}
        </button>
      </div>

      {/* Knowledge files */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BookOpen size={13} color="var(--accent)" /> Knowledge Files ({pk.files?.length ?? 0})</span>
          <button onClick={() => fileRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
            <Upload size={12} /> Add files
          </button>
          <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        </div>

        {(pk.files?.length ?? 0) === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            No files yet — add code files, docs, or notes to give every conversation in this project extra context.
          </div>
        )}

        {(pk.files ?? []).map(file => (
          <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <FileText size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Math.round((file.content?.length ?? 0) / 1024 * 10) / 10} KB · {(file.content?.split('\n')?.length ?? 0)} lines</div>
            </div>
            <button onClick={() => store.removeKnowledgeFile(project.id, file.id)}
              style={{ color: 'var(--text-muted)', padding: 4, display: 'flex', borderRadius: 5 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
