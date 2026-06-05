import { useState, useCallback, useRef } from 'react'

// ── Tool definitions sent to the AI ──────────────────────────────────────────
export const COWORK_TOOLS = [
  { name: 'read_file',     desc: 'Read the contents of a file',                  params: ['path: string'] },
  { name: 'write_file',    desc: 'Write or overwrite a file with new content',   params: ['path: string', 'content: string'] },
  { name: 'list_dir',      desc: 'List files and folders in a directory',        params: ['path: string'] },
  { name: 'delete_file',   desc: 'Delete a file or directory',                   params: ['path: string'] },
  { name: 'make_dir',      desc: 'Create a directory (and parents)',             params: ['path: string'] },
  { name: 'run_command',   desc: 'Run a shell command and return output',        params: ['command: string', 'cwd?: string'] },
  { name: 'search_files',  desc: 'Search for text in files under a directory',  params: ['path: string', 'pattern: string'] },
  { name: 'get_sys_info',  desc: 'Get system info (OS, memory, home dir)',      params: [] },
]

export function buildCoworkSystemPrompt(baseInstructions, workingDir) {
  return `You are CClaude Cowork — an AI agent with full control over the user's computer.

**Working directory:** ${workingDir || '(not set — ask user to set one)'}

**Available tools (use JSON blocks to call them):**
${COWORK_TOOLS.map(t => `- \`${t.name}(${t.params.join(', ')})\` — ${t.desc}`).join('\n')}

**How to call a tool:** Wrap calls in \`<tool>\` tags:
\`\`\`
<tool>{"name":"read_file","args":{"path":"/path/to/file.txt"}}</tool>
\`\`\`

**Rules:**
- You can call multiple tools in sequence across messages
- After each tool result is returned, continue until the task is complete
- Be precise with file paths — always use absolute paths
- For destructive operations (delete, overwrite), summarise what you're about to do before acting
- If no working directory is set, ask the user to pick one first

${baseInstructions ? `**Additional instructions:**\n${baseInstructions}` : ''}`
}

// ── Parse tool calls from AI response text ────────────────────────────────────
export function parseToolCalls(text) {
  const calls = []
  const regex = /<tool>([\s\S]*?)<\/tool>/g
  let match
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim())
      calls.push({ raw: match[0], name: parsed.name, args: parsed.args || {} })
    } catch {}
  }
  return calls
}

// Strip tool call blocks from displayed text
export function stripToolCalls(text) {
  return text.replace(/<tool>[\s\S]*?<\/tool>/g, '').trim()
}

// ── Execute a single tool call ────────────────────────────────────────────────
export async function executeTool(name, args) {
  const fs = window.coworkFS
  const sh = window.coworkShell

  if (!fs || !sh) {
    return { ok: false, error: 'Cowork tools only available in Electron desktop app' }
  }

  try {
    switch (name) {
      case 'read_file':
        return await fs.read(args.path)

      case 'write_file':
        return await fs.write(args.path, args.content)

      case 'list_dir': {
        const res = await fs.list(args.path)
        if (!res.ok) return res
        const lines = res.entries.map(e =>
          `${e.isDir ? 'd' : 'f'}  ${e.name}${e.isDir ? '/' : ''}${e.size != null ? `  (${formatBytes(e.size)})` : ''}`
        ).join('\n')
        return { ok: true, content: lines || '(empty directory)' }
      }

      case 'delete_file':
        return await fs.delete(args.path)

      case 'make_dir':
        return await fs.mkdir(args.path)

      case 'run_command':
        return await sh.exec(args.command, { cwd: args.cwd })

      case 'search_files': {
        // Simple grep via shell
        const cmd = process.platform === 'win32'
          ? `findstr /r /s /i "${args.pattern}" "${args.path}"`
          : `grep -rl "${args.pattern}" "${args.path}" 2>/dev/null | head -50`
        return await sh.exec(cmd)
      }

      case 'get_sys_info':
        return await sh.sysInfo()

      default:
        return { ok: false, error: `Unknown tool: ${name}` }
    }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

function formatBytes(b) {
  if (b < 1024) return b + 'B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + 'KB'
  return (b / 1024 / 1024).toFixed(1) + 'MB'
}

// ── Format tool result for feeding back to AI ─────────────────────────────────
export function formatToolResult(name, args, result) {
  if (!result.ok) {
    return `<tool_result name="${name}" status="error">\nError: ${result.error}\n</tool_result>`
  }
  const content = result.content ?? result.stdout ?? JSON.stringify(result, null, 2)
  return `<tool_result name="${name}" status="ok">\n${content}\n</tool_result>`
}

// ── useCowork hook ────────────────────────────────────────────────────────────
export function useCowork({ endpoint, authToken, model, systemPrompt }) {
  const [messages, setMessages] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [pendingActions, setPendingActions] = useState([])  // actions awaiting approval
  const [actionLog, setActionLog] = useState([])            // completed actions
  const [autoMode, setAutoMode] = useState(false)
  const abortRef = useRef(null)

  function resolveBase(ep) {
    if (ep) return ep
    if (typeof window !== 'undefined' && window.electron) return 'http://localhost:8082'
    return ''
  }

  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, msg])
    return msg
  }, [])

  const logAction = useCallback((entry) => {
    setActionLog(prev => [...prev, { ...entry, timestamp: new Date().toISOString() }])
  }, [])

  // Stream a response from the AI
  const streamResponse = useCallback(async (msgs, onDelta) => {
    const controller = new AbortController()
    abortRef.current = controller

    const res = await fetch(`${resolveBase(endpoint)}/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': authToken, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: model || 'claude-3-5-sonnet-20241022', max_tokens: 8192, stream: true, system: systemPrompt, messages: msgs }),
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`API error ${res.status}`)

    let full = ''
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
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              full += evt.delta.text
              onDelta(evt.delta.text)
            }
          } catch {}
        }
      }
    }
    return full
  }, [endpoint, authToken, model, systemPrompt])

  // Main send function — runs the agentic loop
  const send = useCallback(async (userText) => {
    if (isRunning) return
    setIsRunning(true)

    const userMsg = { role: 'user', content: userText, id: `msg_${Date.now()}` }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)

    try {
      let apiMessages = newMessages.map(({ role, content }) => ({ role, content }))
      let iterCount = 0
      const MAX_ITER = 20

      while (iterCount < MAX_ITER) {
        iterCount++

        // Stream AI response
        let assistantText = ''
        const assistantId = `msg_${Date.now()}`
        setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantId, streaming: true }])

        try {
          assistantText = await streamResponse(apiMessages, (delta) => {
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, content: m.content + delta } : m
            ))
          })
        } catch (e) {
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, content: m.content + `\n\n⚠️ ${e.message}`, streaming: false } : m
          ))
          break
        }

        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m))

        // Parse tool calls from response
        const toolCalls = parseToolCalls(assistantText)

        if (toolCalls.length === 0) break  // No tools — done

        // Add assistant message to API context
        apiMessages = [...apiMessages, { role: 'assistant', content: assistantText }]

        // Execute tools (auto or ask)
        let toolResultsText = ''

        for (const call of toolCalls) {
          if (autoMode) {
            // Execute immediately
            const result = await executeTool(call.name, call.args)
            const resultText = formatToolResult(call.name, call.args, result)
            toolResultsText += resultText + '\n'
            logAction({ name: call.name, args: call.args, result, approved: 'auto' })
            setMessages(prev => [...prev, {
              role: 'tool', id: `tool_${Date.now()}`,
              name: call.name, args: call.args, result, approved: true,
            }])
          } else {
            // Ask for approval
            const approved = await new Promise((resolve) => {
              setPendingActions(prev => [...prev, { ...call, resolve }])
            })
            setPendingActions(prev => prev.filter(a => a !== call))

            if (approved) {
              const result = await executeTool(call.name, call.args)
              const resultText = formatToolResult(call.name, call.args, result)
              toolResultsText += resultText + '\n'
              logAction({ name: call.name, args: call.args, result, approved: true })
              setMessages(prev => [...prev, { role: 'tool', id: `tool_${Date.now()}`, name: call.name, args: call.args, result, approved: true }])
            } else {
              toolResultsText += formatToolResult(call.name, call.args, { ok: false, error: 'User rejected this action' }) + '\n'
              logAction({ name: call.name, args: call.args, result: null, approved: false })
              setMessages(prev => [...prev, { role: 'tool', id: `tool_${Date.now()}`, name: call.name, args: call.args, result: null, approved: false }])
            }
          }
        }

        // Feed tool results back
        apiMessages = [...apiMessages, { role: 'user', content: toolResultsText }]
      }

    } finally {
      setIsRunning(false)
      setPendingActions([])
    }
  }, [messages, isRunning, autoMode, streamResponse, logAction])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setIsRunning(false)
    setPendingActions([])
  }, [])

  const approveAction = useCallback((action, approved) => {
    action.resolve(approved)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setActionLog([])
  }, [])

  return {
    messages, isRunning, pendingActions, actionLog, autoMode,
    setAutoMode, send, abort, approveAction, clearMessages,
  }
}
