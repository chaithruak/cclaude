import { useState, useCallback, useRef } from 'react'

function resolveBase(endpoint) {
  if (endpoint) return endpoint
  if (typeof window !== 'undefined' && window.electron) return 'http://localhost:8082'
  return ''
}

// Build Anthropic content array from text + attachments
function buildContent(text, attachments = []) {
  const parts = []

  // Add images first (vision models expect images before text)
  for (const att of attachments) {
    if (att.type === 'image') {
      parts.push({
        type: 'image',
        source: { type: 'base64', media_type: att.mime || 'image/png', data: att.data }
      })
    }
  }

  // Build text block — inject file contents inline
  let fullText = ''
  const textFiles = attachments.filter(a => a.type === 'text')
  if (textFiles.length > 0) {
    for (const f of textFiles) {
      const ext = f.name.split('.').pop()
      fullText += `\n\n**File: ${f.name}**\n\`\`\`${ext}\n${f.content}\n\`\`\``
    }
    fullText += '\n\n'
  }
  fullText += text

  parts.push({ type: 'text', text: fullText.trim() })

  // If no images, return plain string for compatibility
  return parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts
}

export function useChat({ endpoint, authToken, model, systemPrompt }) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const sendMessage = useCallback(async (messages, onDelta, onDone) => {
    setError(null)
    setIsStreaming(true)

    // Build API messages — handle attachments in last user message
    const apiMessages = messages.map(({ role, content, attachments }) => ({
      role,
      content: (role === 'user' && attachments?.length)
        ? buildContent(content, attachments)
        : content
    }))

    const body = {
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      stream: true,
      system: systemPrompt,
      messages: apiMessages,
    }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const base = resolveBase(endpoint)
      const res = await fetch(`${base}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': authToken,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`API error ${res.status}: ${errText}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const evt = JSON.parse(data)
              if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                onDelta(evt.delta.text)
              }
            } catch {}
          }
        }
      }

      onDone()
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message)
        onDone(err.message)
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [endpoint, authToken, model, systemPrompt])

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { sendMessage, isStreaming, error, abort }
}
