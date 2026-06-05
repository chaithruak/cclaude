import { useState, useCallback } from 'react'

const STORAGE_KEY = 'cclaude-state'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

const defaults = {
  projects: [{ id: 'default', name: 'Personal', createdAt: Date.now() }],
  activeProjectId: 'default',
  conversations: {},
  activeConversationId: null,
  settings: {
    endpoint: '',
    authToken: 'freecc',
    model: '',
    systemPrompt: 'You are a helpful AI assistant.',
  }
}

let _saved = loadState()
let _initial = _saved ? { ...defaults, ..._saved } : { ...defaults }

export function useStore() {
  const [state, setState] = useState(_initial)

  const update = useCallback((updater) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      saveState(next)
      return next
    })
  }, [])

  const createProject = useCallback((name) => {
    const id = `proj_${Date.now()}`
    update(s => ({
      ...s,
      projects: [...s.projects, { id, name, createdAt: Date.now() }],
      activeProjectId: id,
      activeConversationId: null,
    }))
    return id
  }, [update])

  const deleteProject = useCallback((id) => {
    update(s => {
      const projects = s.projects.filter(p => p.id !== id)
      const activeProjectId = s.activeProjectId === id ? (projects[0]?.id ?? null) : s.activeProjectId
      const conversations = { ...s.conversations }
      delete conversations[id]
      return { ...s, projects, activeProjectId, conversations, activeConversationId: null }
    })
  }, [update])

  const renameProject = useCallback((id, name) => {
    update(s => ({ ...s, projects: s.projects.map(p => p.id === id ? { ...p, name } : p) }))
  }, [update])

  const setActiveProject = useCallback((id) => {
    update(s => ({ ...s, activeProjectId: id, activeConversationId: null }))
  }, [update])

  const createConversation = useCallback((projectId, title = 'New conversation') => {
    const id = `conv_${Date.now()}`
    update(s => {
      const existing = s.conversations[projectId] ?? []
      return {
        ...s,
        conversations: {
          ...s.conversations,
          [projectId]: [{ id, title, messages: [], createdAt: Date.now() }, ...existing]
        },
        activeConversationId: id,
      }
    })
    return id
  }, [update])

  const deleteConversation = useCallback((projectId, convId) => {
    update(s => {
      const list = (s.conversations[projectId] ?? []).filter(c => c.id !== convId)
      const activeConversationId = s.activeConversationId === convId ? (list[0]?.id ?? null) : s.activeConversationId
      return { ...s, conversations: { ...s.conversations, [projectId]: list }, activeConversationId }
    })
  }, [update])

  const setActiveConversation = useCallback((id) => {
    update(s => ({ ...s, activeConversationId: id }))
  }, [update])

  const appendMessage = useCallback((projectId, convId, message) => {
    update(s => {
      const list = (s.conversations[projectId] ?? []).map(c => {
        if (c.id !== convId) return c
        const messages = [...c.messages, message]
        const title = c.title === 'New conversation' && message.role === 'user'
          ? message.content.slice(0, 48) + (message.content.length > 48 ? '…' : '')
          : c.title
        return { ...c, messages, title }
      })
      return { ...s, conversations: { ...s.conversations, [projectId]: list } }
    })
  }, [update])

  const updateLastAssistantMessage = useCallback((projectId, convId, delta) => {
    update(s => {
      const list = (s.conversations[projectId] ?? []).map(c => {
        if (c.id !== convId) return c
        const messages = [...c.messages]
        const last = messages[messages.length - 1]
        if (last && last.role === 'assistant') {
          messages[messages.length - 1] = { ...last, content: last.content + delta }
        } else {
          messages.push({ role: 'assistant', content: delta, id: `msg_${Date.now()}` })
        }
        return { ...c, messages }
      })
      return { ...s, conversations: { ...s.conversations, [projectId]: list } }
    })
  }, [update])

  const updateSettings = useCallback((patch) => {
    update(s => ({ ...s, settings: { ...s.settings, ...patch } }))
  }, [update])

  return {
    ...state,
    createProject, deleteProject, renameProject, setActiveProject,
    createConversation, deleteConversation, setActiveConversation,
    appendMessage, updateLastAssistantMessage,
    updateSettings,
  }
}
