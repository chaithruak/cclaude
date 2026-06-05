import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Square, Sparkles, AlertCircle } from 'lucide-react'
import { useAppStore } from '../App.jsx'
import { useChat } from '../hooks/useChat.js'
import MessageBubble from '../components/MessageBubble.jsx'
import ModelSelector from '../components/ModelSelector.jsx'

export default function ChatView() {
  const store = useAppStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  const { settings, activeProjectId, activeConversationId } = store
  const conversations = store.conversations[activeProjectId] ?? []
  const activeConv = conversations.find(c => c.id === activeConversationId)
  const messages = activeConv?.messages ?? []

  const { sendMessage, isStreaming, error, abort } = useChat({
    endpoint: settings.endpoint,
    authToken: settings.authToken,
    model: settings.model,
    systemPrompt: settings.systemPrompt,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [input])

  const ensureConversation = useCallback(() => {
    if (activeConversationId) return activeConversationId
    return store.createConversation(activeProjectId)
  }, [activeConversationId, activeProjectId, store])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    const convId = ensureConversation()
    setInput('')
    const userMsg = { role: 'user', content: text, id: `msg_${Date.now()}` }
    store.appendMessage(activeProjectId, convId, userMsg)
    store.appendMessage(activeProjectId, convId, { role: 'assistant', content: '', id: `msg_${Date.now() + 1}` })
    const convMessages = [...(store.conversations[activeProjectId]?.find(c => c.id === convId)?.messages ?? []), userMsg]
    await sendMessage(
      convMessages,
      (delta) => { store.updateLastAssistantMessage(activeProjectId, convId, delta) },
      (errMsg) => { if (errMsg) store.updateLastAssistantMessage(activeProjectId, convId, `\n\n⚠️ ${errMsg}`) }
    )
  }, [input, isStreaming, ensureConversation, activeProjectId, store, sendMessage])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const isNewChat = !activeConv || messages.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-base)' }}>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>
          {activeConv?.title || 'New conversation'}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
        {isNewChat ? <WelcomeScreen /> : (
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
            {messages.map((msg, i) => (
              <MessageBubble key={msg.id || i} message={msg} isLastAssistant={i === messages.length - 1 && msg.role === 'assistant' && isStreaming} />
            ))}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', fontSize: 13, padding: '8px 0' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 24px 20px', background: 'var(--bg-base)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px 10px', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message CClaude…"
            rows={1}
            style={{ width: '100%', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, maxHeight: 200, background: 'transparent', display: 'block' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 'auto' }}>↵ Send · Shift+↵ newline</span>
            {isStreaming ? (
              <button onClick={abort} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: 12 }}>
                <Square size={12} /> Stop
              </button>
            ) : (
              <button onClick={handleSend} disabled={!input.trim()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: input.trim() ? 'var(--accent)' : 'var(--bg-hover)', color: input.trim() ? '#fff' : 'var(--text-muted)', fontSize: 13, fontWeight: 500, transition: 'background 0.15s' }}>
                <Send size={13} /> Send
              </button>
            )}
          </div>
        </div>
        <div style={{ maxWidth: 720, margin: '8px auto 0', display: 'flex', alignItems: 'center' }}>
          <ModelSelector />
        </div>
      </div>
    </div>
  )
}

function WelcomeScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40, textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Sparkles size={24} color="var(--accent)" />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.4px' }}>Welcome to CClaude</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 400, lineHeight: 1.7 }}>
        Ask anything — code, writing, analysis, math. Connected to your local model.
      </p>
    </div>
  )
}
