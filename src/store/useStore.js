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
    // Don't persist image data (too large for localStorage)
    const slim = {
      ...state,
      projectKnowledge: Object.fromEntries(
        Object.entries(state.projectKnowledge || {}).map(([pid, pk]) => [
          pid,
          { ...pk, files: (pk.files || []).map(f => ({ ...f, data: undefined })) }
        ])
      )
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
  } catch {}
}

// ── Built-in skills ───────────────────────────────────────────────────────────
export const BUILTIN_SKILLS = [
  { id: 'code-reviewer', name: 'Code Reviewer', icon: '🔍', description: 'Review code for bugs, style, security and best practices', systemPrompt: 'You are an expert code reviewer. When given code, analyze it for: bugs and logic errors, security vulnerabilities, performance issues, code style and readability, and adherence to best practices. Provide clear, actionable feedback with specific line references and suggested fixes.' },
  { id: 'python-expert', name: 'Python Expert', icon: '🐍', description: 'Deep Python expertise — stdlib, async, type hints, performance', systemPrompt: 'You are a senior Python expert with deep knowledge of the language, standard library, async programming, type hints, performance optimization, packaging, and Python best practices. Write idiomatic, Pythonic code and explain concepts clearly.' },
  { id: 'data-analyst', name: 'Data Analyst', icon: '📊', description: 'Analyze data, write SQL/pandas, build visualizations', systemPrompt: 'You are an expert data analyst proficient in SQL, Python (pandas, numpy, matplotlib, seaborn), and data visualization. Help analyze datasets, write efficient queries, identify trends, and communicate insights clearly. Prefer code-based solutions with explanations.' },
  { id: 'writing-assistant', name: 'Writing Assistant', icon: '✍️', description: 'Improve writing, grammar, clarity and tone', systemPrompt: 'You are a skilled writing assistant. Help improve writing by enhancing clarity, fixing grammar, adjusting tone, strengthening structure, and making prose more engaging. Always explain your edits so the user can learn. Match the user\'s intended style and voice.' },
  { id: 'sql-expert', name: 'SQL Expert', icon: '🗄️', description: 'Write, optimize and debug SQL queries', systemPrompt: 'You are a SQL expert proficient in PostgreSQL, MySQL, SQLite, and SQL Server. Write efficient, readable queries, optimize slow queries with proper indexing strategies, design schemas, and explain execution plans. Always consider performance implications.' },
  { id: 'debugger', name: 'Debugger', icon: '🐛', description: 'Systematic bug hunting and root cause analysis', systemPrompt: 'You are an expert debugger. Approach problems systematically: identify the symptoms, form hypotheses, suggest diagnostic steps, and trace root causes. Ask clarifying questions when needed. Provide minimal reproducible examples and explain the fix so the user understands why it works.' },
  { id: 'doc-writer', name: 'Docs Writer', icon: '📝', description: 'Write clear technical documentation, READMEs, API docs', systemPrompt: 'You are a technical documentation specialist. Write clear, concise, and comprehensive documentation including README files, API references, tutorials, and inline code comments. Use proper Markdown formatting, include examples, and structure content for the target audience.' },
  { id: 'architect', name: 'System Architect', icon: '🏗️', description: 'System design, architecture decisions and trade-offs', systemPrompt: 'You are a senior software architect. Help design scalable, maintainable systems. Discuss architecture patterns, trade-offs, technology choices, database design, API design, and infrastructure considerations. Think in terms of reliability, scalability, security, and developer experience.' },
  { id: 'brainstormer', name: 'Brainstormer', icon: '💡', description: 'Creative ideation and lateral thinking', systemPrompt: 'You are a creative thinking partner. Generate diverse, unconventional ideas without self-censorship. Use lateral thinking, analogies, and cross-domain inspiration. Present ideas in structured lists, explore variations, and help refine promising concepts.' },
  { id: 'translator', name: 'Translator', icon: '🌍', description: 'Translate between languages with cultural context', systemPrompt: 'You are an expert translator fluent in all major languages. Provide accurate translations that capture nuance, tone, and cultural context. When relevant, note idiomatic differences, alternative phrasings, and cultural considerations. Specify the source language if ambiguous.' },
  { id: 'security', name: 'Security Auditor', icon: '🔒', description: 'Security review, threat modeling, vulnerability analysis', systemPrompt: 'You are a cybersecurity expert. Review code and systems for security vulnerabilities (OWASP Top 10, injection attacks, authentication flaws, etc.), perform threat modeling, suggest hardening measures, and explain attack vectors clearly. Always recommend defense-in-depth approaches.' },
  { id: 'devops', name: 'DevOps Engineer', icon: '⚙️', description: 'CI/CD, Docker, Kubernetes, infrastructure as code', systemPrompt: 'You are an experienced DevOps/SRE engineer. Help with CI/CD pipelines, containerization (Docker, Kubernetes), infrastructure as code (Terraform, Ansible), monitoring, logging, and cloud services (AWS, GCP, Azure). Focus on automation, reliability, and operational excellence.' },
  { id: 'summarizer', name: 'Summarizer', icon: '📋', description: 'Distill long content into clear, structured summaries', systemPrompt: 'You are an expert at synthesizing information. Create clear, well-structured summaries that capture key points, preserve important nuances, and are appropriately concise. Use bullet points for scannable summaries or prose for narrative content based on context.' },
  { id: 'tutor', name: 'Tutor', icon: '🎓', description: 'Patient teaching with examples and analogies', systemPrompt: 'You are a patient, skilled tutor who adapts explanations to the learner\'s level. Break complex concepts into digestible steps, use relatable analogies, check for understanding, and build on prior knowledge. Celebrate progress and encourage questions.' },
  { id: 'interviewer', name: 'Interview Coach', icon: '🎯', description: 'Mock interviews, feedback and preparation', systemPrompt: 'You are an experienced technical interview coach. Conduct mock interviews, provide constructive feedback on answers, suggest improvements, explain what interviewers look for, and help structure responses using frameworks like STAR. Cover both technical and behavioral aspects.' },
]

const defaults = {
  projects: [{ id: 'default', name: 'Personal', createdAt: Date.now() }],
  activeProjectId: 'default',
  conversations: {},
  activeConversationId: null,
  // Skills
  customSkills: [],
  activeSkillId: null,       // global active skill
  // Project knowledge: { [projectId]: { instructions: '', files: [] } }
  projectKnowledge: {},
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

  // ── Projects ──────────────────────────────────────────────────────────────
  const createProject = useCallback((name) => {
    const id = `proj_${Date.now()}`
    update(s => ({ ...s, projects: [...s.projects, { id, name, createdAt: Date.now() }], activeProjectId: id, activeConversationId: null }))
    return id
  }, [update])

  const deleteProject = useCallback((id) => {
    update(s => {
      const projects = s.projects.filter(p => p.id !== id)
      const activeProjectId = s.activeProjectId === id ? (projects[0]?.id ?? null) : s.activeProjectId
      const conversations = { ...s.conversations }
      const projectKnowledge = { ...s.projectKnowledge }
      delete conversations[id]
      delete projectKnowledge[id]
      return { ...s, projects, activeProjectId, conversations, projectKnowledge, activeConversationId: null }
    })
  }, [update])

  const renameProject = useCallback((id, name) => {
    update(s => ({ ...s, projects: s.projects.map(p => p.id === id ? { ...p, name } : p) }))
  }, [update])

  const setActiveProject = useCallback((id) => {
    update(s => ({ ...s, activeProjectId: id, activeConversationId: null }))
  }, [update])

  // ── Conversations ─────────────────────────────────────────────────────────
  const createConversation = useCallback((projectId, title = 'New conversation') => {
    const id = `conv_${Date.now()}`
    update(s => {
      const existing = s.conversations[projectId] ?? []
      return { ...s, conversations: { ...s.conversations, [projectId]: [{ id, title, messages: [], createdAt: Date.now() }, ...existing] }, activeConversationId: id }
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
          ? message.content.slice(0, 48) + (message.content.length > 48 ? '…' : '') : c.title
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

  // ── Skills ────────────────────────────────────────────────────────────────
  const createSkill = useCallback((skill) => {
    const id = `skill_${Date.now()}`
    update(s => ({ ...s, customSkills: [...s.customSkills, { ...skill, id, isBuiltIn: false }] }))
    return id
  }, [update])

  const deleteSkill = useCallback((id) => {
    update(s => ({
      ...s,
      customSkills: s.customSkills.filter(sk => sk.id !== id),
      activeSkillId: s.activeSkillId === id ? null : s.activeSkillId,
    }))
  }, [update])

  const setActiveSkill = useCallback((id) => {
    update(s => ({ ...s, activeSkillId: s.activeSkillId === id ? null : id }))
  }, [update])

  // ── Project Knowledge ─────────────────────────────────────────────────────
  const updateProjectKnowledge = useCallback((projectId, patch) => {
    update(s => ({
      ...s,
      projectKnowledge: {
        ...s.projectKnowledge,
        [projectId]: { ...(s.projectKnowledge[projectId] ?? { instructions: '', files: [] }), ...patch }
      }
    }))
  }, [update])

  const addKnowledgeFile = useCallback((projectId, file) => {
    update(s => {
      const pk = s.projectKnowledge[projectId] ?? { instructions: '', files: [] }
      return { ...s, projectKnowledge: { ...s.projectKnowledge, [projectId]: { ...pk, files: [...pk.files, file] } } }
    })
  }, [update])

  const removeKnowledgeFile = useCallback((projectId, fileId) => {
    update(s => {
      const pk = s.projectKnowledge[projectId] ?? { instructions: '', files: [] }
      return { ...s, projectKnowledge: { ...s.projectKnowledge, [projectId]: { ...pk, files: pk.files.filter(f => f.id !== fileId) } } }
    })
  }, [update])

  // ── Settings ──────────────────────────────────────────────────────────────
  const updateSettings = useCallback((patch) => {
    update(s => ({ ...s, settings: { ...s.settings, ...patch } }))
  }, [update])

  return {
    ...state,
    update,
    createProject, deleteProject, renameProject, setActiveProject,
    createConversation, deleteConversation, setActiveConversation,
    appendMessage, updateLastAssistantMessage,
    createSkill, deleteSkill, setActiveSkill,
    updateProjectKnowledge, addKnowledgeFile, removeKnowledgeFile,
    updateSettings,
  }
}
