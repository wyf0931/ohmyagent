'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Message as BaseMessage, ChatState } from '@ohmyagent/shared'
import type { ProgressStep } from '@/components/ChatArea'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'
import ChatArea from '@/components/ChatArea'
import { useRouter } from 'next/navigation'

interface Message extends BaseMessage {
  steps?: ProgressStep[]
  type?: string
  metadata?: Record<string, any>
}

interface Session {
  id: string
  title: string
  createdAt: Date
}

interface Props {
  sessionId: string
  sessionTitle: string | null
  userId: string
  userEmail?: string
  initialMessages: Array<{
    id: string
    session_id: string
    role: string
    content: string
    type: string
    metadata: Record<string, any>
    created_at: string
  }>
}

export default function ChatSessionContent({
  sessionId,
  sessionTitle: initialTitle,
  userId,
  userEmail,
  initialMessages,
}: Props) {
  const router = useRouter()

  // Convert DB messages to display messages
  const convertDbMessages = useCallback(
    (dbMsgs: typeof initialMessages): Message[] => {
      const result: Message[] = []
      const toolCallSteps: Record<string, ProgressStep> = {}

      // Group messages by turn: find assistant messages with related tool calls/results
      // First pass: collect tool calls/results grouped by toolCallId
      for (const msg of dbMsgs) {
        if (msg.type === 'tool_call' && msg.metadata?.toolCallId) {
          const tcid = msg.metadata.toolCallId
          const argsStr = msg.metadata.args
            ? Object.entries(msg.metadata.args)
                .map(([k, v]) => `${k}=${typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}`)
                .join(', ')
            : ''

          toolCallSteps[`tool-start-${tcid}`] = {
            id: `tool-start-${tcid}`,
            type: 'tool_call',
            label: `Calling ${msg.metadata.toolName || 'tool'}`,
            detail: `${msg.metadata.toolName || ''}(${argsStr})`,
            status: 'complete',
            toolName: msg.metadata.toolName,
            timestamp: new Date(msg.created_at).getTime(),
          } as ProgressStep
        }
        if (msg.type === 'tool_result' && msg.metadata?.toolCallId) {
          const tcid = msg.metadata.toolCallId
          toolCallSteps[`tool-end-${tcid}`] = {
            id: `tool-end-${tcid}`,
            type: 'tool_result',
            label: `${(msg.metadata.toolName || 'tool')} completed`,
            detail: msg.metadata.isError
              ? `Error: ${msg.content}`
              : msg.content,
            status: msg.metadata.isError ? 'error' : 'complete',
            toolName: msg.metadata.toolName,
            timestamp: new Date(msg.created_at).getTime(),
          } as ProgressStep
        }
      }

      // Second pass: emit user messages and build assistant messages with steps
      for (const msg of dbMsgs) {
        if (msg.type === 'user_message') {
          result.push({
            id: msg.id,
            sessionId: msg.session_id,
            role: 'user',
            content: msg.content,
            createdAt: new Date(msg.created_at),
          })
        } else if (msg.type === 'assistant_message') {
          // Collect related tool steps (ordered by timestamp)
          const steps = Object.values(toolCallSteps)
            .filter(s => s.timestamp && s.timestamp > 0)
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

          result.push({
            id: msg.id,
            sessionId: msg.session_id,
            role: 'assistant',
            content: msg.content,
            createdAt: new Date(msg.created_at),
            steps: steps.length > 0 ? steps : undefined,
          })
        }
      }

      return result
    },
    []
  )

  const initialMsgs = convertDbMessages(initialMessages)

  const [chatState, setChatState] = useState<ChatState>({
    messages: initialMsgs,
    isLoading: false,
  })

  const [input, setInput] = useState('')
  const [currentResponse, setCurrentResponse] = useState('')
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  const [turnIndex, setTurnIndex] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [sessionTitle, setSessionTitle] = useState(initialTitle || 'New Chat')
  const [hasRestored, setHasRestored] = useState(initialMessages.length === 0)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [restoringSession, setRestoringSession] = useState(false)

  const eventSourceRef = useRef<EventSource | null>(null)
  const currentResponseRef = useRef('')
  const progressStepsRef = useRef<ProgressStep[]>([])
  const hasRestoredRef = useRef(initialMessages.length === 0)
  const pendingToolCalls = useRef<Set<string>>(new Set())

  // Save a message to DB
  const saveMessage = useCallback(
    async (type: string, role: string, content: string, metadata?: Record<string, any>) => {
      try {
        await fetch(`/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, role, content, metadata: metadata || {} }),
        })
      } catch (err) {
        console.error('Failed to save message:', err)
      }
    },
    [sessionId]
  )

  // Update session title
  const updateSessionTitle = useCallback(
    async (title: string) => {
      try {
        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        })
        setSessionTitle(title)
      } catch (err) {
        console.error('Failed to update title:', err)
      }
    },
    [sessionId]
  )

  // Restore agent state from history
  const restoreAgentState = useCallback(async () => {
    if (hasRestoredRef.current) return
    setRestoringSession(true)

    try {
      const userMessages = chatState.messages
        .filter(m => m.role === 'user')
        .map(m => ({ role: 'user', content: m.content }))

      if (userMessages.length > 0) {
        await fetch('http://localhost:4000/api/chat/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: userMessages, sessionId }),
        })
      }

      hasRestoredRef.current = true
      setHasRestored(true)
    } catch (err) {
      console.error('Failed to restore agent state:', err)
    } finally {
      setRestoringSession(false)
    }
  }, [chatState.messages, sessionId])

  // Fetch sessions for sidebar
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions')
      if (res.ok) {
        const data = await res.json()
        setSessions(
          data.map((s: any) => ({
            id: s.id,
            title: s.title || 'New Chat',
            createdAt: new Date(s.created_at),
          }))
        )
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    progressStepsRef.current = progressSteps
  }, [progressSteps])

  // SSE connection
  useEffect(() => {
    console.log('[Frontend] Connecting to SSE stream...')
    const eventSource = new EventSource('http://localhost:4000/api/events')

    eventSource.onopen = () => {
      console.log('[Frontend] SSE connection opened')
      setIsConnected(true)
    }

    eventSource.onerror = () => {
      setIsConnected(false)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'connected':
            break

          case 'agent_start':
            setChatState((prev) => ({ ...prev, isLoading: true }))
            setProgressSteps([{
              id: `agent-start-${Date.now()}`,
              type: 'thinking',
              label: 'Starting',
              detail: 'Connecting to AGENT...',
              status: 'running',
              timestamp: Date.now(),
            }])
            setCurrentResponse('')
            currentResponseRef.current = ''
            break

          case 'turn_start':
            setTurnIndex(data.turnIndex)
            setProgressSteps((prev) =>
              prev.map(s => s.status === 'running' ? { ...s, status: 'complete' as const } : s)
            )
            break

          case 'tool_execution_start': {
            const stepId = `tool-start-${data.toolCallId}`
            pendingToolCalls.current.add(data.toolCallId)

            const argsStr = data.args
              ? Object.entries(data.args)
                  .map(([k, v]) => `${k}=${typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}`)
                  .join(', ')
              : ''

            // Save tool_call to DB
            saveMessage('tool_call', 'system', '', {
              toolCallId: data.toolCallId,
              toolName: data.toolName,
              args: data.args,
            })

            setProgressSteps((prev) => {
              const updated = [...prev]
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].type === 'thinking' && updated[i].status === 'running') {
                  updated[i] = { ...updated[i], status: 'complete' }
                  break
                }
              }
              return updated
            })

            setProgressSteps((prev) => [
              ...prev,
              {
                id: stepId,
                type: 'tool_call',
                label: `Calling ${data.toolName}`,
                detail: `${data.toolName}(${argsStr})`,
                status: 'running',
                toolName: data.toolName,
                timestamp: Date.now(),
              },
            ])
            break
          }

          case 'tool_execution_update':
            setProgressSteps((prev) =>
              prev.map((s) => {
                if (s.id === `tool-start-${data.toolCallId}`) {
                  let detail = data.partialResult
                  if (detail && typeof detail === 'object') {
                    if (detail.content && Array.isArray(detail.content)) {
                      detail = detail.content.map((c: any) => c.text || '').join('')
                    } else {
                      detail = JSON.stringify(detail).substring(0, 200)
                    }
                  }
                  return { ...s, detail: String(detail || '').substring(0, 500) }
                }
                return s
              })
            )
            break

          case 'tool_execution_end': {
            const resultKey = `tool-end-${data.toolCallId}`
            const startKey = `tool-start-${data.toolCallId}`
            pendingToolCalls.current.delete(data.toolCallId)

            setProgressSteps((prev) =>
              prev.map((s) => {
                if (s.id === startKey) {
                  return { ...s, status: data.isError ? 'error' as const : 'complete' as const }
                }
                return s
              })
            )

            let resultContent = ''
            if (data.result) {
              if (typeof data.result === 'string') {
                resultContent = data.result
              } else if (data.result.content && Array.isArray(data.result.content)) {
                resultContent = data.result.content.map((c: any) => c.text || '').join('\n')
              } else if (data.result.details) {
                resultContent = `Found ${data.result.details.resultCount || '?'} results from ${data.result.details.provider || 'search'}`
              } else {
                resultContent = JSON.stringify(data.result)
              }
            }

            // Save tool_result to DB
            saveMessage('tool_result', 'system', resultContent.substring(0, 5000), {
              toolCallId: data.toolCallId,
              toolName: data.toolName,
              isError: data.isError || false,
            })

            setProgressSteps((prev) => [
              ...prev,
              {
                id: resultKey,
                type: 'tool_result',
                label: `${data.toolName} completed`,
                detail: data.isError ? `Error: ${resultContent.substring(0, 200)}` : resultContent.substring(0, 500),
                status: data.isError ? 'error' : 'complete',
                toolName: data.toolName,
                timestamp: Date.now(),
              },
            ])
            break
          }

          case 'message_start':
            if (data.message?.role !== 'assistant') break
            currentResponseRef.current = ''
            setCurrentResponse('')
            setProgressSteps((prev) =>
              prev.map((s) =>
                s.status === 'running' ? { ...s, status: 'complete' as const } : s
              )
            )
            break

          case 'message_update': {
            if (data.message?.role !== 'assistant') break

            let newText = ''
            if (data.message?.content) {
              if (Array.isArray(data.message.content)) {
                newText = data.message.content
                  .filter((c: any) => c.type === 'text')
                  .map((c: any) => c.text)
                  .join('')
              } else if (typeof data.message.content === 'string') {
                newText = data.message.content
              }
            }

            if (newText) {
              currentResponseRef.current = newText
              setCurrentResponse(newText)
            }
            break
          }

          case 'message_end': {
            if (data.message?.role !== 'assistant') break

            const contentBlocks: any[] = data.message?.content || []
            const textContent = contentBlocks
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text)
              .join('')
            const hasToolCalls = contentBlocks.some((c: any) => c.type === 'toolCall')

            if (!textContent && hasToolCalls) break

            if (textContent) {
              const isFinal = !hasToolCalls && pendingToolCalls.current.size === 0
              const capturedSteps = isFinal
                ? progressStepsRef.current
                    .filter(s => s.type !== 'thinking' || s.label !== 'Starting')
                    .map(s => ({ ...s, status: 'complete' as const }))
                : undefined

              // Save assistant message to DB
              saveMessage('assistant_message', 'assistant', textContent)

              setChatState((prev) => ({
                ...prev,
                isLoading: !isFinal,
                messages: [
                  ...prev.messages,
                  {
                    id: (Date.now() + 1).toString(),
                    sessionId: sessionId,
                    role: 'assistant' as const,
                    content: textContent,
                    createdAt: new Date(),
                    steps: capturedSteps?.length ? capturedSteps : undefined,
                  },
                ],
              }))

              if (isFinal) {
                setProgressSteps([])
                progressStepsRef.current = []
              }
            }

            setCurrentResponse('')
            currentResponseRef.current = ''
            break
          }

          case 'turn_end':
            break

          case 'agent_end':
            setChatState((prev) => ({ ...prev, isLoading: false }))
            break

          default:
            break
        }
      } catch (error) {
        console.error('Failed to parse event:', error)
      }
    }

    eventSourceRef.current = eventSource

    return () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [sessionId, saveMessage])

  const handleSend = async () => {
    if (!input.trim() || restoringSession) return

    // Auto-restore agent state on first message if session has history
    if (!hasRestoredRef.current) {
      await restoreAgentState()
    }

    const messageContent = input

    // Auto-title: use first user message as session title
    const isFirstUserMessage = chatState.messages.filter(m => m.role === 'user').length === 0
    if (isFirstUserMessage) {
      const title = messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : '')
      updateSessionTitle(title)
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      sessionId: sessionId,
      role: 'user',
      content: messageContent,
      createdAt: new Date(),
    }

    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
    }))

    // Save user message to DB
    await saveMessage('user_message', 'user', messageContent)

    setCurrentResponse('')
    currentResponseRef.current = ''
    setInput('')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          sessionId: sessionId,
          newSession: initialMessages.length === 0 && chatState.messages.length === 0,
        }),
      })

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`)
      }

      await response.json()
    } catch (error) {
      console.error('Failed to send message:', error)
      setChatState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to send message',
      }))
    }
  }

  const handleNewChat = () => {
    router.push('/chat')
  }

  const handleSelectSession = (selectedSessionId: string) => {
    router.push(`/chat/${selectedSessionId}`)
  }

  const handleLoadMore = () => {
    console.log('Load more sessions')
  }

  return (
    <div className="app-layout">
      {restoringSession && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-accent-amber/20 text-accent-amber text-center py-1 text-sm">
          Restoring session...
        </div>
      )}
      <Navbar
        darkMode={darkMode}
        onDarkModeToggle={() => setDarkMode(!darkMode)}
        userEmail={userEmail}
      />

      <div className="app-main">
        {sidebarOpen && (
          <Sidebar
            sessions={sessions}
            activeSessionId={sessionId}
            onNewChat={handleNewChat}
            onSelectSession={handleSelectSession}
            onLoadMore={handleLoadMore}
            hasMore={false}
          />
        )}

        <ChatArea
          messages={chatState.messages}
          currentResponse={currentResponse}
          isLoading={chatState.isLoading}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          progressSteps={progressSteps}
          turnIndex={turnIndex}
          isConnected={isConnected}
        />
      </div>
    </div>
  )
}
