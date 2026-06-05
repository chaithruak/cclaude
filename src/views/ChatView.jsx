import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Square, Sparkles, AlertCircle, Mic, MicOff, Copy, Check, RefreshCw, Pencil } from 'lucide-react'
import { useAppStore } from '../App.jsx'
import { useChat } from '../hooks/useChat.js'
import MessageBubble from '../components/MessageBubble.jsx'
import ModelSelector from '../components/ModelSelector.jsx'
import AttachmentBar from '../components/AttachmentBar.jsx'

// ── Voice hook ────────────────────────────────────────────────────────────────
function useVoice(onTranscript) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    setSupported(!!SR)
    if (!SR) return
    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = 'en-US'
    r.onresult = (e) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      onTranscript(final, interim)
    }
    r.onerror = () => setListening(false)
    r.onend = () => setListening(false)
    recognitionRef.current = r
  }, [])

  const toggle = useCallback(() => {
    const r = recognitionRef.current
    if (!r) return
    if (listening) { r.stop(); setListening(false) }
    else { r.start(); setListening(true) }
  }, [listening])

  return { listening, supported, toggle }
}

// ── ChatView ──────────────────────────────────────────────────────────────────
export default function ChatView() {
  const store = useAppStore()
  const [input, setInput] = useState('')
  const [interimText, setInterimText] = useState('')
  const [attachments, setAttachments] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [editingMsgId, setEditingMsgId] = useState(null)
  const [editText, setEditText] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const finalAccumRef = useRef('')

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

  // Voice
  const { listening, supported: voiceSupported, toggle: toggleVoice } = useVoice(
    useCallback((final, interim) => {
      if (final) { finalAccumRef.current += final + ' '; setInput(finalAccumRef.current); setInterimText('') }
      else setInterimText(interim)
    }, [])
  )
  useEffect(() => { if (!listening) { finalAccumRef.current = input; setInterimText('') } }, [listening])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [input])

  // Drag & drop
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = () => setIsDragOver(false)
  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length) {
      // Trigger AttachmentBar file handler via a custom event workaround
      window._ccAttachFiles?.(e.dataTransfer.files)
    }
  }

  const ensureConversation = useCallback(() => {
    if (activeConversationId) return activeConversationId
    return store.createConversation(activeProjectId)
  }, [activeConversationId, activeProjectId, store])

  const handleSend = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text || isStreaming) return
    if (listening) toggleVoice()
    finalAccumRef.current = ''
    const convId = ensureConversation()
    setInput('')
    setInterimText('')
    const atts = [...attachments]
    setAttachments([])

    const userMsg = { role: 'user', content: text, attachments: atts, id: `msg_${Date.now()}` }
    store.appendMessage(activeProjectId, convId, userMsg)
    store.appendMessage(activeProjectId, convId, { role: 'assistant', content: '', id: `msg_${Date.now() + 1}` })
    const convMessages = [...(store.conversations[activeProjectId]?.find(c => c.id === convId)?.messages ?? []), userMsg]
    await sendMessage(
      convMessages,
      (delta) => store.updateLastAssistantMessage(activeProjectId, convId, delta),
      (errMsg) => { if (errMsg) store.updateLastAssistantMessage(activeProjectId, convId, `\n\n⚠️ ${errMsg}`) }
    )
  }, [input, attachments, isStreaming, ensureConversation, activeProjectId, store, sendMessage, listening, toggleVoice])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Regenerate last assistant response
  const handleRegenerate = useCallback(async () => {
    if (!activeConv || isStreaming) return
    const msgs = activeConv.messages
    const lastUserIdx = [...msgs].reverse().findIndex(m => m.role === 'user')
    if (lastUserIdx === -1) return
    const userMsgIdx = msgs.length - 1 - lastUserIdx
    const userMsg = msgs[userMsgIdx]

    // Remove everything after user message
    const trimmed = msgs.slice(0, userMsgIdx + 1)
    store.update(s => ({
      ...s,
      conversations: {
        ...s.conversations,
        [activeProjectId]: s.conversations[activeProjectId].map(c =>
          c.id === activeConv.id ? { ...c, messages: trimmed } : c
        )
      }
    }))
    store.appendMessage(activeProjectId, activeConv.id, { role: 'assistant', content: '', id: `msg_${Date.now()}` })
    await sendMessage(
      [...trimmed],
      (delta) => store.updateLastAssistantMessage(activeProjectId, activeConv.id, delta),
      (errMsg) => { if (errMsg) store.updateLastAssistantMessage(activeProjectId, activeConv.id, `\n\n⚠️ ${errMsg}`) }
    )
  }, [activeConv, isStreaming, activeProjectId, store, sendMessage])

  const isNewChat = !activeConv || messages.length === 0
  const displayInput = input + (listening && interimText ? interimText : '')

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: isDragOver ? 'rgba(201,138,75,0.04)' : 'var(--bg-base)', transition: 'background 0.2s' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Top bar */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-base)' }}>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>
          {activeConv?.title || 'New conversation'}
        </span>
      </div>

      {/* Drag overlay hint */}
      {isDragOver && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, pointerEvents: 'none' }}>
          <div style={{ padding: '20px 40px', borderRadius: 16, background: 'var(--accent-dim)', border: '2px dashed var(--accent)', color: 'var(--accent)', fontSize: 16, fontWeight: 600 }}>
            Drop files here
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
        {isNewChat ? <WelcomeScreen /> : (
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
            {messages.map((msg, i) => (
              <MessageWithActions
                key={msg.id || i}
                message={msg}
                isLastAssistant={i === messages.length - 1 && msg.role === 'assistant' && isStreaming}
                isLast={i === messages.length - 1}
                canRegenerate={i === messages.length - 1 && msg.role === 'assistant' && !isStreaming}
                onRegenerate={handleRegenerate}
                editingId={editingMsgId}
                editText={editText}
                onEditStart={(id, text) => { setEditingMsgId(id); setEditText(text) }}
                onEditSave={(id, text) => {
                  setEditingMsgId(null)
                  setInput(text)
                  handleSend(text)
                }}
                onEditCancel={() => setEditingMsgId(null)}
                onEditChange={setEditText}
              />
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

      {/* Input area */}
      <div style={{ padding: '12px 24px 20px', background: 'var(--bg-base)' }}>
        <div style={{
          maxWidth: 720, margin: '0 auto',
          background: 'var(--bg-surface)',
          border: `1px solid ${listening ? '#e05c5c' : isDragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 14, padding: '12px 14px 10px',
          boxShadow: listening ? '0 0 0 2px rgba(224,92,92,0.15)' : '0 2px 12px rgba(0,0,0,0.3)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}>

          {/* Attachment bar */}
          <AttachmentBar
            attachments={attachments}
            onAdd={att => setAttachments(p => [...p, att])}
            onRemove={id => setAttachments(p => p.filter(a => a.id !== id))}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); finalAccumRef.current = e.target.value }}
            onKeyDown={handleKeyDown}
            placeholder={listening ? '🎤 Listening…' : 'Message CClaude…'}
            rows={1}
            style={{ width: '100%', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, maxHeight: 200, background: 'transparent', display: 'block', marginTop: 8 }}
          />
          {listening && interimText && (
            <div style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.6, pointerEvents: 'none' }}>
              {interimText}
            </div>
          )}

          {/* Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 'auto' }}>
              {listening ? '🔴 Recording' : '↵ Send · Shift+↵ newline'}
            </span>

            {voiceSupported && (
              <button
                onClick={toggleVoice}
                title={listening ? 'Stop recording' : 'Voice input'}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: '50%',
                  background: listening ? '#e05c5c' : 'var(--bg-hover)',
                  color: listening ? '#fff' : 'var(--text-secondary)',
                  animation: listening ? 'pulse 1.5s ease-in-out infinite' : 'none',
                  transition: 'background 0.2s',
                }}
              >
                {listening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
            )}

            {isStreaming ? (
              <button onClick={abort} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: 12 }}>
                <Square size={12} /> Stop
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!displayInput.trim() && attachments.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: (displayInput.trim() || attachments.length) ? 'var(--accent)' : 'var(--bg-hover)', color: (displayInput.trim() || attachments.length) ? '#fff' : 'var(--text-muted)', fontSize: 13, fontWeight: 500, transition: 'background 0.15s' }}
              >
                <Send size={13} /> Send
              </button>
            )}
          </div>
        </div>

        <div style={{ maxWidth: 720, margin: '8px auto 0', display: 'flex', alignItems: 'center' }}>
          <ModelSelector />
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(224,92,92,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(224,92,92,0); }
        }
      `}</style>
    </div>
  )
}

// ── Message with hover actions ────────────────────────────────────────────────
function MessageWithActions({ message, isLastAssistant, canRegenerate, onRegenerate, editingId, editText, onEditStart, onEditSave, onEditCancel, onEditChange }) {
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isEditing = editingId === message.id

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      style={{ position: 'relative', marginBottom: 4 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isEditing ? (
        <div style={{ marginBottom: 16 }}>
          <textarea
            autoFocus
            value={editText}
            onChange={e => onEditChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditSave(message.id, editText) }
              if (e.key === 'Escape') onEditCancel()
            }}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 14,
              background: 'var(--bg-surface)', border: '1px solid var(--accent)',
              color: 'var(--text-primary)', lineHeight: 1.6, resize: 'none', minHeight: 80,
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={() => onEditSave(message.id, editText)} style={{ padding: '5px 14px', borderRadius: 7, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600 }}>Send</button>
            <button onClick={onEditCancel} style={{ padding: '5px 14px', borderRadius: 7, background: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: 12 }}>Cancel</button>
          </div>
        </div>
      ) : (
        <MessageBubble message={message} isLastAssistant={isLastAssistant} />
      )}

      {/* Hover actions */}
      {hovered && !isEditing && (
        <div style={{
          position: 'absolute', bottom: -4, right: isUser ? 0 : 'auto', left: isUser ? 'auto' : 40,
          display: 'flex', gap: 4, background: 'var(--bg-surface)',
          border: '1px solid var(--border)', borderRadius: 8, padding: '2px 4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 10,
        }}>
          <ActionBtn icon={copied ? <Check size={11} /> : <Copy size={11} />} label="Copy" onClick={handleCopy} />
          {isUser && <ActionBtn icon={<Pencil size={11} />} label="Edit" onClick={() => onEditStart(message.id, message.content)} />}
          {canRegenerate && <ActionBtn icon={<RefreshCw size={11} />} label="Regenerate" onClick={onRegenerate} />}
        </div>
      )}
    </div>
  )
}

function ActionBtn({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px', borderRadius: 5, fontSize: 10, color: 'var(--text-muted)', background: 'transparent' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      {icon} {label}
    </button>
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
        Ask anything — attach files, images, or GitHub files. Connected to your local model.
      </p>
    </div>
  )
}
