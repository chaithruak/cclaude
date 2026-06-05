import { useState, useCallback, useRef } from 'react'

function resolveBase(endpoint) {
  if (endpoint) return endpoint
  if (typeof window !== 'undefined' && window.electron) return 'http://localhost:8082'
  return ''
}

export function useChat({ endpoint, authToken, model, systemPrompt }) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const sendMessage = useCallback(async (messages, onDelta, onDone) => {
    setError(null)
    setIsStreaming(true)

    const apiMessages = messages.map(({ role, content }) => ({ role, content }))
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
