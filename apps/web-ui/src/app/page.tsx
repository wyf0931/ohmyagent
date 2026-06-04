'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Message, ChatState, ToolCall, Turn } from '@ohmyagent/shared'

export default function HomePage() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
  })

  const [input, setInput] = useState('')

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
      isLoading: true,
      currentToolCall: undefined,
    }))

    setInput('')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: chatState.messages,
        }),
      })

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        sessionId: 'temp',
        role: data.role || 'assistant',
        content: data.content || 'No response',
        createdAt: new Date(),
        toolCalls: data.toolCalls,
        turns: data.turns,
      }

      setChatState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
        currentToolCall: undefined,
      }))
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
          {chatState.messages.length === 0 ? (
            <p className="text-ink-soft text-center">Start a conversation...</p>
          ) : (
            chatState.messages.map((message) => (
              <div key={message.id} className="mb-6">
                {/* Message Header */}
                <div className={`mb-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <span className="text-xs text-ink-soft uppercase">
                    {message.role === 'user' ? 'You' : 'Pi Agent'}
                  </span>
                </div>

                {/* Tool Calls Display */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mb-3 ml-4 pl-3 border-l-2 border-lagoon">
                    <p className="text-xs font-semibold text-lagoon mb-2">Tool Calls:</p>
                    {message.toolCalls.map((tool: ToolCall) => (
                      <div key={tool.id} className="mb-2 text-sm">
                        <span className="font-mono bg-mist px-2 py-1 rounded">
                          {tool.name}
                        </span>
                        <span className={`ml-2 ${
                          tool.status === 'complete' ? 'text-green-600' :
                          tool.status === 'error' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          {tool.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Turns Display */}
                {message.turns && message.turns.length > 0 && (
                  <div className="mb-3 ml-4 pl-3 border-l-2 border-gold">
                    <p className="text-xs font-semibold text-gold mb-2">Agent Turns:</p>
                    {message.turns.map((turn: Turn) => (
                      <div key={turn.id} className="mb-2 text-sm">
                        <span className="text-xs text-ink-soft">{turn.type}:</span>
                        <span className="ml-2">{turn.content.substring(0, 50)}...</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Content */}
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

                {/* Clear fix for floating messages */}
                <div className="clear-both" />
              </div>
            ))
          )}

          {/* Loading State */}
          {chatState.isLoading && (
            <div className="text-center py-4">
              <span className="animate-pulse-glow inline-block text-lagoon">
                Pi Agent is thinking...
              </span>
            </div>
          )}

          {/* Error State */}
          {chatState.error && (
            <div className="text-center py-4">
              <span className="text-red-600">{chatState.error}</span>
            </div>
          )}
        </div>

        {/* Input Area */}
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

        {/* Status Indicator */}
        <div className="mt-3 text-center text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Connected to Pi Agent
          </span>
        </div>
      </div>
    </main>
  )
}
