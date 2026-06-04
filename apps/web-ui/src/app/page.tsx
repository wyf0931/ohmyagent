'use client'

import { useState, useEffect, useRef } from 'react'
import type { Message, ChatState } from '@ohmyagent/shared'
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
  const [activeTools, setActiveTools] = useState<Map<string, any>>(new Map())
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
            setActiveTools(new Map())
            setCurrentResponse('')
            currentResponseRef.current = ''
            break

          case 'turn_start':
            setTurnIndex(data.turnIndex)
            break

          case 'tool_execution_start':
            setActiveTools((prev) => {
              const next = new Map(prev)
              next.set(data.toolCallId, {
                name: data.toolName,
                args: data.args,
                status: 'running',
                output: '',
              })
              return next
            })
            break

          case 'tool_execution_update':
            setActiveTools((prev) => {
              const next = new Map(prev)
              const tool = next.get(data.toolCallId)
              if (tool) {
                // Format partial result for display
                let displayOutput = ''
                if (data.partialResult) {
                  if (typeof data.partialResult === 'string') {
                    displayOutput = data.partialResult
                  } else if (data.partialResult.content) {
                    // Handle Pi's result format
                    displayOutput = data.partialResult.content
                      .map((c: any) => c.type === 'text' ? c.text : '')
                      .join('')
                  } else {
                    displayOutput = JSON.stringify(data.partialResult)
                  }
                }
                next.set(data.toolCallId, {
                  ...tool,
                  output: displayOutput,
                })
              }
              return next
            })
            break

          case 'tool_execution_end':
            setActiveTools((prev) => {
              const next = new Map(prev)
              const tool = next.get(data.toolCallId)
              if (tool) {
                // On completion, show brief status instead of full result
                next.set(data.toolCallId, {
                  ...tool,
                  status: data.isError ? 'error' : 'complete',
                  output: '', // Clear output on completion to avoid clutter
                  result: data.result,
                })
              }
              return next
            })
            break

          case 'message_update':
            console.log('[Frontend] message_update received:', JSON.stringify(data).slice(0, 300))
            // Try to extract content from various possible formats
            let deltaText = ''
            if (data.assistantMessageEvent?.type === 'text_delta' && data.assistantMessageEvent.delta) {
              deltaText = data.assistantMessageEvent.delta
            } else if (data.message?.content) {
              deltaText = data.message.content
            } else if (typeof data === 'string') {
              deltaText = data
            }

            if (deltaText) {
              const newResponse = currentResponseRef.current + deltaText
              currentResponseRef.current = newResponse
              setCurrentResponse(newResponse)
              console.log('[Frontend] Updated currentResponse, length:', newResponse.length)
            }
            break

          case 'message_end':
            console.log('[Frontend] message_end received:', JSON.stringify(data).slice(0, 300))
            console.log('[Frontend] currentResponse length:', currentResponseRef.current.length)

            // Extract message content from Pi Agent format: content: [{ type: 'text', text: '...' }]
            let messageContent = currentResponseRef.current
            if (data.message?.content) {
              if (typeof data.message.content === 'string') {
                messageContent = data.message.content
              } else if (Array.isArray(data.message.content)) {
                // Pi Agent format: content is an array of content blocks
                messageContent = data.message.content
                  .filter((c: any) => c.type === 'text')
                  .map((c: any) => c.text)
                  .join('')
              }
            }

            // Add message if there's any content
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
            // Clear currentResponse to prevent duplicate display
            setCurrentResponse('')
            currentResponseRef.current = ''
            break

          case 'message_start':
            console.log('[Frontend] message_start received:', JSON.stringify(data).slice(0, 300))
            // Initialize current response for this message
            if (data.message?.content) {
              currentResponseRef.current = data.message.content
              setCurrentResponse(data.message.content)
            }
            break

          case 'turn_end':
            console.log('[Frontend] turn_end received')
            break

          case 'agent_end':
            console.log('[Frontend] agent_end received')
            setChatState((prev) => ({ ...prev, isLoading: false }))
            break

          default:
            // Log any unknown event types for debugging
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          conversationHistory: chatState.messages,
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
    setActiveTools(new Map())
    setTurnIndex(0)
  }

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId)
    // In real implementation, load session messages from API
    // For now, just clear the current state
    setChatState({
      messages: [],
      isLoading: false,
    })
    setCurrentResponse('')
  }

  const handleLoadMore = () => {
    // Placeholder for loading more sessions
    console.log('Load more sessions')
  }

  return (
    <div className="app-layout">
      {/* Navbar */}
      <Navbar darkMode={darkMode} onDarkModeToggle={() => setDarkMode(!darkMode)} />

      {/* Main Content Area */}
      <div className="app-main">
        {/* Sidebar */}
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

        {/* Chat Area */}
        <ChatArea
          messages={chatState.messages}
          currentResponse={currentResponse}
          isLoading={chatState.isLoading}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          activeTools={activeTools}
          turnIndex={turnIndex}
          isConnected={isConnected}
        />
      </div>
    </div>
  )
}
