'use client'

import { useState } from 'react'
import type { Message, ChatState } from '@ohmyagent/shared'

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
    }))

    setInput('')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
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
      }

      setChatState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }))
    } catch (error) {
      console.error('Failed to send message:', error)
      setChatState((prev) => ({
        ...prev,
        isLoading: false,
      }))
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 text-center">OhMyAgent</h1>

        <div className="bg-paper rounded-card shadow-lg p-6 mb-4 min-h-[400px] max-h-[600px] overflow-y-auto">
          {chatState.messages.length === 0 ? (
            <p className="text-ink-soft text-center">Start a conversation...</p>
          ) : (
            chatState.messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${
                  message.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block max-w-[80%] p-3 rounded-card ${
                    message.role === 'user'
                      ? 'bg-lagoon text-white'
                      : 'bg-mist text-ink'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
          {chatState.isLoading && (
            <div className="text-center">
              <span className="animate-pulse-glow inline-block">Thinking...</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-mist rounded-card focus:outline-none focus:border-lagoon"
            disabled={chatState.isLoading}
          />
          <button
            onClick={handleSend}
            disabled={chatState.isLoading || !input.trim()}
            className="px-6 py-2 bg-lagoon text-white rounded-card hover:bg-lagoon-deep disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  )
}
