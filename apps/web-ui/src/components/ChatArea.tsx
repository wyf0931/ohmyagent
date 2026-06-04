'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Copy, Check, Loader2, Wrench, ChevronDown, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { Message } from '@ohmyagent/shared'

// Inline progress step type (was in ProgressTimeline.tsx)
export type StepStatus = 'pending' | 'running' | 'complete' | 'error'
export interface ProgressStep {
  id: string
  type: 'turn' | 'tool_call' | 'tool_result' | 'thinking' | 'response'
  label: string
  detail?: string
  status: StepStatus
  timestamp: number
}

interface ChatAreaProps {
  messages: Message[]
  currentResponse: string
  isLoading: boolean
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  progressSteps: ProgressStep[]
  turnIndex: number
  isConnected: boolean
}

// Filter: keep only meaningful steps
function meaningfulSteps(steps: ProgressStep[]): ProgressStep[] {
  return steps.filter(s => {
    if (s.type === 'turn') return false
    if (s.type === 'thinking' && (s.label === 'Starting' || s.label.startsWith('Turn'))) return false
    return true
  })
}

function InlineStep({ step }: { step: ProgressStep }) {
  const [expanded, setExpanded] = useState(false)
  const { type, status } = step

  const icon = () => {
    if (status === 'running') return <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />
    if (status === 'error') return <span className="text-error text-xs flex-shrink-0">✗</span>
    if (type === 'tool_result') return <span className="text-success text-xs flex-shrink-0">✓</span>
    if (type === 'response') return <span className="text-accent-teal text-xs flex-shrink-0">⬤</span>
    return <Wrench className="w-3.5 h-3.5 text-muted flex-shrink-0" />
  }

  const needsTruncation = step.detail && step.detail.length > 150

  return (
    <div className={`flex items-start gap-2 text-xs py-1.5 px-2 rounded transition-opacity ${
      status === 'running' ? 'text-ink' : status === 'error' ? 'text-error' : 'text-muted'
    }`}>
      {icon()}
      <div className="min-w-0 flex-1">
        <span className="font-medium">{step.label}</span>
        {step.detail && (
          <span className="ml-1 text-muted-soft">
            {needsTruncation && !expanded
              ? step.detail.substring(0, 150) + '...'
              : step.detail
            }
          </span>
        )}
        {needsTruncation && (
          <button onClick={() => setExpanded(!expanded)} className="ml-1 text-primary hover:text-primary-active inline-flex items-center">
            {expanded ? <><ChevronDown className="w-3 h-3" />less</> : <><ChevronRight className="w-3 h-3" />more</>}
          </button>
        )}
      </div>
    </div>
  )
}

export default function ChatArea({
  messages,
  currentResponse,
  isLoading,
  input,
  onInputChange,
  onSend,
  progressSteps,
  turnIndex,
  isConnected,
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)

  const handleCopy = useCallback((content: string, messageId: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(messageId)
      setShowToast(true)
      setTimeout(() => { setCopiedId(null); setShowToast(false) }, 2000)
    }).catch(err => { console.error('[Copy] Copy failed:', err) })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentResponse, progressSteps])

  const steps = meaningfulSteps(progressSteps)

  return (
    <div className="content-area">
      {showToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in-down">
          <div className="flex items-center gap-2 px-4 py-2 bg-surface-card text-ink rounded-lg shadow-lg border border-hairline">
            <Check className="w-4 h-4 text-success" />
            <span className="text-sm font-medium">Copied to clipboard</span>
          </div>
        </div>
      )}

      <div className="messages-container">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-card flex items-center justify-center mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h2 className="text-xl font-medium text-ink mb-2">Start a conversation</h2>
            <p className="text-body text-sm">
              Try: &quot;百度今天股价多少&quot;
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <div key={message.id} className="mb-6 max-w-3xl mx-auto group">
            <div className={`mb-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span className="text-xs text-muted uppercase">
                {message.role === 'user' ? 'YOU' : 'AGENT'}
              </span>
            </div>

            <div
              className={`w-full p-4 rounded-lg relative ${
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

              {message.role === 'assistant' && (
                <button
                  onClick={() => handleCopy(message.content, message.id)}
                  className={`absolute p-2 rounded-lg bg-surface-card text-ink transition-opacity hover:bg-surface-soft shadow-sm border border-hairline cursor-pointer ${
                    copiedId === message.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  style={{ bottom: '4px', right: '-60px' }}
                  title="Copy message"
                >
                  {copiedId === message.id ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Inline progress steps — appear in real-time between messages and response */}
        {steps.length > 0 && (
          <div className="mb-3 max-w-3xl mx-auto pl-4 border-l-2 border-hairline">
            {steps.map((step) => (
              <InlineStep key={step.id} step={step} />
            ))}
          </div>
        )}

        {/* Current streaming response */}
        {currentResponse && (
          <div className="mb-6 max-w-3xl mx-auto">
            <div className="mb-2 text-left">
              <span className="text-xs text-muted uppercase">AGENT</span>
            </div>
            <div className="w-full p-4 rounded-lg bg-surface-card text-ink">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {currentResponse}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Loading indicator — only when nothing else is happening */}
        {isLoading && !currentResponse && steps.length === 0 && (
          <div className="text-center py-4">
            <span className="animate-pulse inline-block text-primary">
              AGENT is thinking...
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
              placeholder="Ask AGENT something..."
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

          <div className="mt-2 flex justify-center gap-4 text-xs text-muted-soft">
            <span className="inline-flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`}></span>
              {isConnected ? 'Connected to AGENT' : 'Disconnected'}
            </span>
            {turnIndex > 0 && <span>Turn: {turnIndex}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
