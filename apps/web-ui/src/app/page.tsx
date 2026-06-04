'use client'

import { useState, useEffect, useRef } from 'react'
import type { Message, ChatState } from '@ohmyagent/shared'
import type { ProgressStep } from '@/components/ChatArea'
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

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

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
            // Mark any prior running steps as done, then add turn step
            setProgressSteps((prev) => {
              const updated = prev.map(s =>
                s.status === 'running' ? { ...s, status: 'complete' as const } : s
              )
              return [
                ...updated,
                {
                  id: `turn-${data.turnIndex}`,
                  type: 'thinking',
                  label: `Turn ${data.turnIndex}`,
                  detail: 'Processing your request...',
                  status: 'running',
                  timestamp: Date.now(),
                },
              ]
            })
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

            // Extract result summary
            let resultDetail = ''
            if (data.result) {
              if (typeof data.result === 'string') {
                resultDetail = data.result.substring(0, 300)
              } else if (data.result.details) {
                resultDetail = `Found ${data.result.details.resultCount || '?'} results from ${data.result.details.provider || 'search'}`
              } else {
                resultDetail = JSON.stringify(data.result).substring(0, 300)
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
                timestamp: Date.now(),
              },
            ])

            // Add thinking step after tool result
            setProgressSteps((prev) => [
              ...prev,
              {
                id: `thinking-after-${data.toolCallId}`,
                type: 'thinking',
                label: 'Thinking',
                detail: 'Analyzing results...',
                status: 'running',
                timestamp: Date.now(),
              },
            ])
            break
          }

          case 'message_start':
            console.log('[Frontend] message_start received')
            currentResponseRef.current = ''
            setCurrentResponse('')
            // Mark thinking steps as complete, add response step
            setProgressSteps((prev) => {
              const updated = prev.map((s) =>
                s.type === 'thinking' && s.status === 'running'
                  ? { ...s, status: 'complete' as const }
                  : s
              )
              return [
                ...updated,
                {
                  id: `response-${Date.now()}`,
                  type: 'response',
                  label: 'Generating response',
                  detail: '',
                  status: 'running',
                  timestamp: Date.now(),
                },
              ]
            })
            break

          case 'message_update': {
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
            console.log('[Frontend] message_end received')
            const messageContent = currentResponseRef.current

            // Mark response step as complete
            setProgressSteps((prev) =>
              prev.map((s) =>
                s.type === 'response' && s.status === 'running'
                  ? { ...s, status: 'complete' as const }
                  : s
              )
            )

            if (messageContent) {
              setChatState((prev) => ({
                ...prev,
                isLoading: false,
                messages: [
                  ...prev.messages,
                  {
                    id: (Date.now() + 1).toString(),
                    sessionId: activeSessionId || 'temp',
                    role: 'assistant',
                    content: messageContent,
                    createdAt: new Date(),
                  },
                ],
              }))
            } else {
              console.log('[Frontend] No message content found')
              setChatState((prev) => ({ ...prev, isLoading: false }))
            }
            setCurrentResponse('')
            currentResponseRef.current = ''
            // Clear inline steps — response is now in the message bubble above
            setProgressSteps([])
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
