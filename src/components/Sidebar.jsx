import React, { useState } from 'react'
import {
  MessageSquare, Layers, Zap, Send, FolderOpen,
  Settings, ChevronRight, Plus, Trash2
} from 'lucide-react'
import { useAppStore } from '../App.jsx'

const NAV_ITEMS = [
  { id: 'chat',     icon: MessageSquare, label: 'Chat' },
  { id: 'cowork',   icon: Layers,        label: 'Cowork' },
  { id: 'skills',   icon: Zap,           label: 'Skills' },
  { id: 'dispatch', icon: Send,          label: 'Dispatch' },
  { id: 'projects', icon: FolderOpen,    label: 'Projects' },
]

export default function Sidebar({ activeNav, onNavChange, onOpenSettings }) {
  const store = useAppStore()
  const [collapsed, setCollapsed] = useState(false)

  const activeProject = store.projects.find(p => p.id === store.activeProjectId)
  const conversations = (store.conversations[store.activeProjectId] ?? [])

  const handleNewChat = () => {
    onNavChange('chat')
    store.createConversation(store.activeProjectId)
  }

  return (
    <aside style={{
      width: collapsed ? 56 : 240,
      minWidth: collapsed ? 56 : 240,
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 12px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClaudeLogo />
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>CClaude</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{ color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex', marginLeft: collapsed ? 'auto' : 0 }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <ChevronRight size={16} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {/* New Chat */}
      <div style={{ padding: '8px 8px 4px' }}>
        <button
          onClick={handleNewChat}
          style={{
            width: '100%', padding: collapsed ? '8px 0' : '8px 10px',
            display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8,
            background: 'var(--accent-dim)', color: 'var(--accent)',
            fontWeight: 500, fontSize: 13,
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,138,75,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-dim)'}
        >
          <Plus size={16} />
          {!collapsed && 'New chat'}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: '4px 8px' }}>
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const isActive = activeNav === id
          return (
            <button
              key={id}
              onClick={() => onNavChange(id)}
              style={{
                width: '100%', padding: collapsed ? '8px 0' : '8px 10px',
                display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8,
                background: isActive ? 'var(--bg-active)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 500 : 400, fontSize: 13,
                justifyContent: collapsed ? 'center' : 'flex-start',
                marginBottom: 2, transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={16} />
              {!collapsed && label}
            </button>
          )
        })}
      </nav>

      {/* Conversation list */}
      {!collapsed && activeNav === 'chat' && conversations.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', padding: '6px 10px 4px', textTransform: 'uppercase' }}>
            {activeProject?.name ?? 'Conversations'}
          </div>
          {conversations.map(conv => {
            const isActive = store.activeConversationId === conv.id
            return (
              <div
                key={conv.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 8px', borderRadius: 7, marginBottom: 1,
                  background: isActive ? 'var(--bg-active)' : 'transparent',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'var(--bg-active)' : 'transparent' }}
                onClick={() => { store.setActiveConversation(conv.id); onNavChange('chat') }}
              >
                <span style={{ flex: 1, fontSize: 12, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.title}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); store.deleteConversation(store.activeProjectId, conv.id) }}
                  style={{ color: 'var(--text-muted)', opacity: 0, padding: 2, borderRadius: 4, display: 'flex' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--danger)' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = 0; e.currentTarget.style.color = 'var(--text-muted)' }}
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Settings + Trademark */}
      <div style={{ padding: '8px 8px 12px', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={onOpenSettings}
          style={{
            width: '100%', padding: collapsed ? '8px 0' : '8px 10px',
            display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8,
            color: 'var(--text-secondary)', fontSize: 13,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Settings size={16} />
          {!collapsed && 'Settings'}
        </button>

        {!collapsed && (
          <div style={{ marginTop: 10, padding: '8px 10px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Created by
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                Chaithrodaya Sukruth
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                {'©'} {new Date().getFullYear()} CClaude{'™'}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

function ClaudeLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="var(--accent)" opacity="0.9"/>
      <path d="M8 12.5l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
