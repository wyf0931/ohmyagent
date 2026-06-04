'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Message, ChatState } from '@ohmyagent/shared'

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

  const eventSourceRef = useRef<EventSource | null>(null)
  const currentResponseRef = useRef('')

  // Connect to SSE stream
  useEffect(() => {
    const eventSource = new EventSource('http://localhost:4000/api/events')

    eventSource.onopen = () => {
      console.log('Connected to Pi Agent events')
      setIsConnected(true)
    }

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      setIsConnected(false)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'connected':
            console.log('Client connected:', data.clientId)
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

          case 'turn_end':
            // Turn ended
            break

          case 'message_start':
            // Message started
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
                next.set(data.toolCallId, {
                  ...tool,
                  output: JSON.stringify(data.partialResult),
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
                next.set(data.toolCallId, {
                  ...tool,
                  status: data.isError ? 'error' : 'complete',
                  result: data.result,
                })
              }
              return next
            })
            break

          case 'message_update':
            if (data.assistantMessageEvent?.type === 'text_delta') {
              const newResponse = currentResponseRef.current + data.assistantMessageEvent.delta
              currentResponseRef.current = newResponse
              setCurrentResponse(newResponse)
            }
            break

          case 'message_end':
            setChatState((prev) => ({
              ...prev,
              isLoading: false,
              messages: [
                ...prev.messages,
                {
                  id: (Date.now() + 1).toString(),
                  sessionId: 'temp',
                  role: 'assistant',
                  content: currentResponseRef.current,
                  createdAt: new Date(),
                },
              ],
            }))
            setCurrentResponse('')
            currentResponseRef.current = ''
            break

          case 'agent_end':
            setChatState((prev) => ({ ...prev, isLoading: false }))
            break

          default:
            console.log('Unknown event:', data.type, data)
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
  }, [])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      sessionId: 'temp',
      role: 'user',
      content: input,
      createdAt: new Date(),
    }

    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
    }))

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

      await response.json() // Response comes via SSE events
    } catch (error) {
      console.error('Failed to send message:', error)
      setChatState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to send message',
      }))
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-center">OhMyAgent - Pi Agent</h1>

        <div className="bg-paper rounded-card shadow-lg p-6 mb-4 min-h-[500px] max-h-[700px] overflow-y-auto">
          {chatState.messages.length === 0 && !chatState.isLoading ? (
            <p className="text-ink-soft text-center">Start a conversation...</p>
          ) : (
            chatState.messages.map((message) => (
              <div key={message.id} className="mb-6">
                <div className={`mb-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <span className="text-xs text-ink-soft uppercase">
                    {message.role === 'user' ? 'YOU' : 'PI AGENT'}
                  </span>
                </div>

                <div
                  className={`inline-block max-w-[85%] p-4 rounded-card ${
                    message.role === 'user'
                      ? 'bg-lagoon text-white float-right clear-both'
                      : 'bg-mist text-ink float-left clear-both'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  ) : (
                    <span>{message.content}</span>
                  )}
                </div>

                <div className="clear-both" />
              </div>
            ))
          )}

          {/* Current streaming response */}
          {currentResponse && (
            <div className="mb-6">
              <div className="mb-2 text-left">
                <span className="text-xs text-ink-soft uppercase">PI AGENT</span>
              </div>
              <div className="inline-block max-w-[85%] p-4 rounded-card bg-mist text-ink float-left clear-both">
                <ReactMarkdown>{currentResponse}</ReactMarkdown>
              </div>
              <div className="clear-both" />
            </div>
          )}

          {/* Active tool calls */}
          {Array.from(activeTools.values()).map((tool) => (
            <div key={tool.name} className="mb-3 ml-4 pl-3 border-l-2 border-lagoon">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono bg-mist px-2 py-1 rounded">
                  {tool.name}
                </span>
                <span
                  className={`text-xs ${
                    tool.status === 'running'
                      ? 'text-yellow-600 animate-pulse'
                      : tool.status === 'complete'
                        ? 'text-green-600'
                        : tool.status === 'error'
                          ? 'text-red-600'
                          : 'text-gray-600'
                  }`}
                >
                  {tool.status}
                </span>
              </div>
              {tool.output && (
                <div className="mt-1 text-xs text-ink-soft">{tool.output}</div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {chatState.isLoading && !currentResponse && (
            <div className="text-center py-4">
              <span className="animate-pulse-glow inline-block text-lagoon">
                Pi Agent is thinking...
              </span>
            </div>
          )}

          {/* Error state */}
          {chatState.error && (
            <div className="text-center py-4">
              <span className="text-red-600">{chatState.error}</span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Pi Agent something..."
            className="flex-1 px-4 py-3 border border-mist rounded-card focus:outline-none focus:border-lagoon"
            disabled={chatState.isLoading}
          />
          <button
            onClick={handleSend}
            disabled={chatState.isLoading || !input.trim()}
            className="px-6 py-3 bg-lagoon text-white rounded-card hover:bg-lagoon-deep disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {chatState.isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>

        {/* Status */}
        <div className="mt-3 flex justify-center gap-4 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {isConnected ? 'Connected to Pi Agent' : 'Disconnected'}
          </span>
          {turnIndex > 0 && (
            <span>Turn: {turnIndex}</span>
          )}
        </div>
      </div>
    </main>
  )
}
