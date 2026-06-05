import React, { useState } from 'react'
import { Plus, Trash2, Check, Pencil, X, Zap } from 'lucide-react'
import { useAppStore } from '../App.jsx'
import { BUILTIN_SKILLS } from '../store/useStore.js'

export default function SkillsView() {
  const store = useAppStore()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', icon: '⚡', description: '', systemPrompt: '' })

  const allSkills = [...BUILTIN_SKILLS, ...store.customSkills]
  const activeSkill = allSkills.find(s => s.id === store.activeSkillId)

  function resetForm() { setForm({ name: '', icon: '⚡', description: '', systemPrompt: '' }) }

  function handleSave() {
    if (!form.name.trim() || !form.systemPrompt.trim()) return
    if (editingId) {
      store.update(s => ({
        ...s,
        customSkills: s.customSkills.map(sk => sk.id === editingId ? { ...sk, ...form } : sk)
      }))
      setEditingId(null)
    } else {
      store.createSkill(form)
      setCreating(false)
    }
    resetForm()
  }

  function handleEdit(skill) {
    setForm({ name: skill.name, icon: skill.icon, description: skill.description, systemPrompt: skill.systemPrompt })
    setEditingId(skill.id)
    setCreating(false)
  }

  const EMOJI_OPTIONS = ['⚡','🔍','🐍','📊','✍️','🗄️','🐛','📝','🏗️','💡','🌍','🔒','⚙️','📋','🎓','🎯','🤖','🧪','🎨','📱']

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4 }}>Skills</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Activate a skill to give CClaude a specialised persona for your conversation.
              {activeSkill && <span style={{ color: 'var(--accent)', fontWeight: 600 }}> Active: {activeSkill.icon} {activeSkill.name}</span>}
            </p>
          </div>
          <button
            onClick={() => { setCreating(true); setEditingId(null); resetForm() }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600 }}
          >
            <Plus size={14} /> New Skill
          </button>
        </div>

        {/* Active skill banner */}
        {activeSkill && (
          <div style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid rgba(201,138,75,0.3)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>{activeSkill.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{activeSkill.name} is active</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{activeSkill.description}</div>
            </div>
            <button onClick={() => store.setActiveSkill(activeSkill.id)} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
              Deactivate
            </button>
          </div>
        )}

        {/* Create / Edit form */}
        {(creating || editingId) && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--accent)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)' }}>
              {editingId ? 'Edit Skill' : 'New Skill'}
            </div>

            {/* Icon picker */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Icon</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {EMOJI_OPTIONS.map(e => (
                  <button key={e} onClick={() => setForm(f => ({ ...f, icon: e }))}
                    style={{ width: 32, height: 32, fontSize: 16, borderRadius: 7, background: form.icon === e ? 'var(--accent-dim)' : 'var(--bg-surface-2)', border: `1px solid ${form.icon === e ? 'var(--accent)' : 'var(--border)'}` }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Name *</div>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. React Expert" style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Short description</div>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="One-line summary" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>System Prompt *</div>
              <textarea value={form.systemPrompt} onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
                placeholder="You are an expert in... When asked to..."
                rows={5} style={{ ...inputStyle, resize: 'vertical', height: 'auto', lineHeight: 1.6 }} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSave} disabled={!form.name.trim() || !form.systemPrompt.trim()}
                style={{ padding: '7px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                {editingId ? 'Save changes' : 'Create skill'}
              </button>
              <button onClick={() => { setCreating(false); setEditingId(null); resetForm() }}
                style={{ padding: '7px 16px', borderRadius: 8, background: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Built-in skills */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
          Built-in ({BUILTIN_SKILLS.length})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {BUILTIN_SKILLS.map(skill => <SkillCard key={skill.id} skill={skill} store={store} />)}
        </div>

        {/* Custom skills */}
        {store.customSkills.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
              My Skills ({store.customSkills.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {store.customSkills.map(skill => (
                <SkillCard key={skill.id} skill={skill} store={store}
                  onEdit={() => handleEdit(skill)}
                  onDelete={() => store.deleteSkill(skill.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SkillCard({ skill, store, onEdit, onDelete }) {
  const isActive = store.activeSkillId === skill.id
  const [showPrompt, setShowPrompt] = useState(false)
  return (
    <div style={{
      background: 'var(--bg-surface)', border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 12, padding: '14px 16px',
      transition: 'border-color 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: isActive ? 'var(--accent-dim)' : 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {skill.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>{skill.name}</span>
            {isActive && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 700 }}>ACTIVE</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{skill.description}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button
          onClick={() => store.setActiveSkill(skill.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: isActive ? 'var(--accent)' : 'var(--accent-dim)', color: isActive ? '#fff' : 'var(--accent)', flex: 1, justifyContent: 'center' }}
        >
          {isActive ? <><Check size={11} /> Active</> : <><Zap size={11} /> Activate</>}
        </button>
        <button onClick={() => setShowPrompt(p => !p)} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          {showPrompt ? 'Hide' : 'Prompt'}
        </button>
        {onEdit && <button onClick={onEdit} style={{ padding: '5px 8px', borderRadius: 7, color: 'var(--text-muted)', border: '1px solid var(--border)', display: 'flex' }}><Pencil size={11} /></button>}
        {onDelete && <button onClick={onDelete} style={{ padding: '5px 8px', borderRadius: 7, color: 'var(--text-muted)', border: '1px solid var(--border)', display: 'flex' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger)' }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}><Trash2 size={11} /></button>}
      </div>

      {showPrompt && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg-surface-2)', borderRadius: 7, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, maxHeight: 120, overflowY: 'auto', fontFamily: 'monospace' }}>
          {skill.systemPrompt}
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '7px 10px',
  background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
  borderRadius: 7, fontSize: 13, color: 'var(--text-primary)',
}
