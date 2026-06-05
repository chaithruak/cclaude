import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function MessageBubble({ message, isLastAssistant }) {
  const { role, content } = message
  const isUser = role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 16,
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--accent-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginRight: 10, marginTop: 2, flexShrink: 0,
          fontSize: 12, color: 'var(--accent)', fontWeight: 700,
        }}>
          C
        </div>
      )}

      <div style={{
        maxWidth: isUser ? '72%' : '88%',
        position: 'relative',
      }}>
        <div style={{
          padding: isUser ? '10px 14px' : '2px 0',
          background: isUser ? 'var(--user-bubble)' : 'transparent',
          borderRadius: isUser ? 12 : 0,
          fontSize: 14,
          lineHeight: 1.7,
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          <RenderedContent content={content} isStreaming={isLastAssistant} />
        </div>

        {!isUser && content && (
          <button
            onClick={handleCopy}
            style={{
              position: 'absolute', bottom: -22, right: 0,
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: 'var(--text-muted)', padding: '2px 6px',
              borderRadius: 4,
              opacity: 0,
            }}
            className="copy-btn"
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  )
}

// Minimal markdown-like renderer: code blocks, inline code, bold, italic
function RenderedContent({ content, isStreaming }) {
  const parts = parseContent(content)
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'code_block') {
          return <CodeBlock key={i} lang={part.lang} code={part.code} />
        }
        if (part.type === 'text') {
          return <span key={i} dangerouslySetInnerHTML={{ __html: formatInline(part.text) }} />
        }
        return null
      })}
      {isStreaming && <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--accent)', marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </>
  )
}

function parseContent(text) {
  const parts = []
  const codeBlockRe = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0, match
  while ((match = codeBlockRe.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', text: text.slice(last, match.index) })
    parts.push({ type: 'code_block', lang: match[1] || 'text', code: match[2] })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) })
  return parts
}

function formatInline(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:var(--bg-surface-2);padding:1px 5px;border-radius:4px;font-size:0.9em;font-family:monospace">$1</code>')
    .replace(/\n/g, '<br/>')
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div style={{ margin: '12px 0', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{lang}</span>
        <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '14px 16px', background: 'var(--bg-surface)', overflowX: 'auto', fontSize: 13, lineHeight: 1.6, fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace", color: 'var(--text-primary)' }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}
