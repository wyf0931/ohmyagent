'use client'

import { useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { Message } from '@ohmyagent/shared'

interface ChatAreaProps {
  messages: Message[]
  currentResponse: string
  isLoading: boolean
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  activeTools: Map<string, any>
  turnIndex: number
  isConnected: boolean
}

export default function ChatArea({
  messages,
  currentResponse,
  isLoading,
  input,
  onInputChange,
  onSend,
  activeTools,
  turnIndex,
  isConnected,
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentResponse, activeTools])

  return (
    <div className="content-area">
      {/* Messages Container */}
      <div className="messages-container">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-card flex items-center justify-center mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h2 className="text-xl font-medium text-ink mb-2">Start a conversation</h2>
            <p className="text-body text-sm">Ask Pi Agent anything</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="mb-6 max-w-3xl mx-auto">
            <div className={`mb-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span className="text-xs text-muted uppercase">
                {message.role === 'user' ? 'YOU' : 'PI AGENT'}
              </span>
            </div>

            <div
              className={`inline-block max-w-[85%] p-4 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary text-on-primary ml-auto'
                  : 'bg-surface-card text-ink'
              }`}
            >
              {message.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {message.content}
                </ReactMarkdown>
              ) : (
                <span>{message.content}</span>
              )}
            </div>

            <div className="clear-both" />
          </div>
        ))}

        {/* Current streaming response */}
        {currentResponse && (
          <div className="mb-6 max-w-3xl mx-auto">
            <div className="mb-2 text-left">
              <span className="text-xs text-muted uppercase">PI AGENT</span>
            </div>
            <div className="inline-block max-w-[85%] p-4 rounded-lg bg-surface-card text-ink">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {currentResponse}
              </ReactMarkdown>
            </div>
            <div className="clear-both" />
          </div>
        )}

        {/* Active tool calls */}
        {Array.from(activeTools.values()).map((tool) => (
          <div key={tool.name} className="mb-3 max-w-3xl mx-auto ml-4 pl-3 border-l-2 border-primary">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono bg-surface-card px-2 py-1 rounded text-xs">
                {tool.name}
              </span>
              <span
                className={`text-xs ${
                  tool.status === 'running'
                    ? 'text-warning animate-pulse'
                    : tool.status === 'complete'
                      ? 'text-success'
                      : tool.status === 'error'
                        ? 'text-error'
                        : 'text-muted'
                }`}
              >
                {tool.status}
              </span>
            </div>
            {tool.output && (
              <div className="mt-1 text-xs text-muted-soft">{tool.output}</div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && !currentResponse && (
          <div className="text-center py-4">
            <span className="animate-pulse inline-block text-primary">
              Pi Agent is thinking...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-area">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
              placeholder="Ask Pi Agent something..."
              className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:border-primary bg-canvas text-ink"
              disabled={isLoading}
            />
            <button
              onClick={onSend}
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-primary hover:bg-primary-active text-on-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>

          {/* Status */}
          <div className="mt-2 flex justify-center gap-4 text-xs text-muted-soft">
            <span className="inline-flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`}></span>
              {isConnected ? 'Connected to Pi Agent' : 'Disconnected'}
            </span>
            {turnIndex > 0 && <span>Turn: {turnIndex}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
