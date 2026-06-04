'use client'

import { useState, useEffect, useRef } from 'react'
import type { Message as BaseMessage, ChatState } from '@ohmyagent/shared'
import type { ProgressStep } from '@/components/ChatArea'

// Extended message with optional steps (collected during turn processing)
interface Message extends BaseMessage {
  steps?: ProgressStep[]
}

import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'
import ChatArea from '@/components/ChatArea'

interface Session {
  id: string
  title: string
  createdAt: Date
}

export default function HomePage() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
  })

  const [input, setInput] = useState('')
  const [currentResponse, setCurrentResponse] = useState('')
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  const [turnIndex, setTurnIndex] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  // Session management (placeholder for now)
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const eventSourceRef = useRef<EventSource | null>(null)
  const currentResponseRef = useRef('')
  const progressStepsRef = useRef<ProgressStep[]>([])

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Keep ref in sync with progressSteps state for closure-free access
  useEffect(() => {
    progressStepsRef.current = progressSteps
  }, [progressSteps])

  // Connect to SSE stream
  useEffect(() => {
    console.log('[Frontend] Connecting to SSE stream...')
    const eventSource = new EventSource('http://localhost:4000/api/events')

    eventSource.onopen = () => {
      console.log('[Frontend] SSE connection opened')
      setIsConnected(true)
    }

    eventSource.onerror = (error) => {
      console.log('[Frontend] SSE connection error:', error)
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
            // Mark prior running steps as done — no new step needed
            setProgressSteps((prev) =>
              prev.map(s => s.status === 'running' ? { ...s, status: 'complete' as const } : s)
            )
            break

          case 'tool_execution_start': {
            const stepId = `tool-start-${data.toolCallId}`
            const argsStr = data.args
              ? Object.entries(data.args)
                  .map(([k, v]) => `${k}=${typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}`)
                  .join(', ')
              : ''

            // Mark last thinking step as complete if exists
            setProgressSteps((prev) => {
              const updated = [...prev]
              // Find last thinking step (reverse find to support older JS environments)
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
            // Update tool step with partial result
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

            // Mark tool start as complete
            setProgressSteps((prev) =>
              prev.map((s) => {
                if (s.id === startKey) {
                  return { ...s, status: data.isError ? 'error' as const : 'complete' as const }
                }
                return s
              })
            )

            // Extract full result text (for websearch: includes Search Query, Top Results with URLs)
            let resultDetail = ''
            if (data.result) {
              if (typeof data.result === 'string') {
                resultDetail = data.result
              } else if (data.result.content && Array.isArray(data.result.content)) {
                resultDetail = data.result.content.map((c: any) => c.text || '').join('\n')
              } else if (data.result.details) {
                resultDetail = `Found ${data.result.details.resultCount || '?'} results from ${data.result.details.provider || 'search'}`
              } else {
                resultDetail = JSON.stringify(data.result)
              }
            }

            // Add tool result step
            setProgressSteps((prev) => [
              ...prev,
              {
                id: resultKey,
                type: 'tool_result',
                label: `${data.toolName} completed`,
                detail: data.isError ? `Error: ${resultDetail}` : resultDetail,
                status: data.isError ? 'error' : 'complete',
                toolName: data.toolName,
                timestamp: Date.now(),
              },
            ])
            break
          }

          case 'message_start':
            // Only process assistant message starts
            if (data.message?.role !== 'assistant') break
            console.log('[Frontend] message_start received (assistant)')
            currentResponseRef.current = ''
            setCurrentResponse('')
            // Mark running steps as complete
            setProgressSteps((prev) =>
              prev.map((s) =>
                s.status === 'running' ? { ...s, status: 'complete' as const } : s
              )
            )
            break

          case 'message_update': {
            // Only process assistant text deltas
            if (data.message?.role !== 'assistant') break

            // Extract content from message_update event
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
            // Only process assistant messages — skip user echo
            if (data.message?.role !== 'assistant') break

            const contentBlocks: any[] = data.message?.content || []
            const textContent = contentBlocks
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text)
              .join('')
            const hasToolCalls = contentBlocks.some((c: any) => c.type === 'toolCall')

            // Ignore empty tool-only messages (no text, just toolCall)
            if (!textContent && hasToolCalls) {
              console.log('[Frontend] message_end: tool-only, keeping isLoading=true')
              break
            }

            if (textContent) {
              const isFinal = !hasToolCalls
              const capturedSteps = isFinal
                ? progressStepsRef.current
                    .filter(s => s.type !== 'thinking' || (s.label !== 'Starting'))
                    .map(s => ({ ...s, status: 'complete' as const }))
                : undefined

              console.log('[Frontend] message_end: adding message', { isFinal, textLen: textContent.length, steps: capturedSteps?.length })

              setChatState((prev) => ({
                ...prev,
                isLoading: !isFinal,
                messages: [
                  ...prev.messages,
                  {
                    id: (Date.now() + 1).toString(),
                    sessionId: activeSessionId || 'temp',
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
            console.log('[Frontend] turn_end received')
            break

          case 'agent_end':
            console.log('[Frontend] agent_end received')
            setChatState((prev) => ({ ...prev, isLoading: false }))
            // Keep progressSteps visible — cleared on next agent_start
            break

          default:
            console.log('[Frontend] Unknown event type:', data.type, JSON.stringify(data).slice(0, 200))
            break
        }
      } catch (error) {
        console.error('Failed to parse event:', error)
      }
    }

    eventSourceRef.current = eventSource

    return () => {
      console.log('[Frontend] Closing SSE connection')
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [activeSessionId])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      sessionId: activeSessionId || 'temp',
      role: 'user',
      content: input,
      createdAt: new Date(),
    }

    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
    }))

    // Clear previous streaming response
    setCurrentResponse('')
    currentResponseRef.current = ''

    const messageToSend = input
    setInput('')

    console.log('[handleSend] sending:', messageToSend)

    // AGENT maintains its own conversation state — no need to send history
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          newSession: chatState.messages.length === 0,
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
    const newSessionId = Date.now().toString()
    setActiveSessionId(newSessionId)
    setChatState({
      messages: [],
      isLoading: false,
    })
    setCurrentResponse('')
    currentResponseRef.current = ''
    setProgressSteps([])
    setTurnIndex(0)
  }

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId)
    setChatState({
      messages: [],
      isLoading: false,
    })
    setCurrentResponse('')
  }

  const handleLoadMore = () => {
    console.log('Load more sessions')
  }

  return (
    <div className="app-layout">
      <Navbar darkMode={darkMode} onDarkModeToggle={() => setDarkMode(!darkMode)} />

      <div className="app-main">
        {sidebarOpen && (
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
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
