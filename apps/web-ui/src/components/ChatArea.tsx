'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Copy, Check, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

export type StepStatus = 'pending' | 'running' | 'complete' | 'error'
export interface ProgressStep {
  id: string
  type: 'turn' | 'tool_call' | 'tool_result' | 'thinking' | 'response'
  label: string
  detail?: string
  status: StepStatus
  timestamp: number
  toolName?: string
}

interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date
  steps?: ProgressStep[]
}

interface ChatAreaProps {
  messages: ChatMessage[]
  currentResponse: string
  isLoading: boolean
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  progressSteps: ProgressStep[]
  turnIndex: number
  isConnected: boolean
}

// ── Search link parser ──

interface SearchLink {
  index: number
  title: string
  url: string
  summary: string
}

function parseSearchLinks(detail: string): SearchLink[] {
  const links: SearchLink[] = []
  const regex = /^(\d+)\.\s+(.+?)\n\s+URL:\s+(https?:\/\/[^\s]+)/gm
  let match
  while ((match = regex.exec(detail)) !== null) {
    const afterUrl = detail.indexOf('\n', match.index + match[0].length)
    const summaryMatch = detail.substring(afterUrl > 0 ? afterUrl : match.index + match[0].length).match(/^\s*Summary:\s+(.+?)(?=\n\s*\n|\n\d+\.|$)/s)
    links.push({
      index: parseInt(match[1]),
      title: match[2].trim(),
      url: match[3].trim(),
      summary: summaryMatch ? summaryMatch[1].trim().substring(0, 150) : '',
    })
  }
  return links
}

function SearchLinkList({ links }: { links: SearchLink[] }) {
  return (
    <div className="mt-1 space-y-0.5">
      {links.map((link) => (
        <SearchLinkItem key={link.index} link={link} />
      ))}
    </div>
  )
}

function SearchLinkItem({ link }: { link: SearchLink }) {
  const [showFull, setShowFull] = useState(false)
  const maxLen = 55
  const truncated = link.title.length > maxLen

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-1 text-primary hover:text-primary-active hover:underline group/link"
      title={truncated ? link.title : link.summary || undefined}
    >
      <span className="text-muted-soft text-[10px] mt-0.5 flex-shrink-0">{link.index}.</span>
      <span className="break-all">
        {truncated && !showFull ? link.title.substring(0, maxLen) : link.title}
      </span>
      {truncated && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFull(!showFull) }}
          className="text-[10px] text-muted hover:text-ink whitespace-nowrap ml-0.5 flex-shrink-0"
        >
          {showFull ? 'less' : 'full'}
        </button>
      )}
    </a>
  )
}

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const maxChars = 200
  const needsTruncation = text.length > maxChars

  return (
    <div className="mt-1">
      <span className="text-muted-soft break-all">
        {needsTruncation && !expanded ? text.substring(0, maxChars) + '...' : text}
      </span>
      {needsTruncation && (
        <button onClick={() => setExpanded(!expanded)} className="ml-1 text-primary hover:text-primary-active inline-flex items-center text-[10px]">
          {expanded ? <><ChevronDown className="w-3 h-3" />less</> : <><ChevronRight className="w-3 h-3" />more</>}
        </button>
      )}
    </div>
  )
}

// ── Inline step component ──

function InlineStep({ step }: { step: ProgressStep }) {
  const { type, status, toolName } = step

  const searchLinks = useMemo(() => {
    if (type !== 'tool_result' || toolName !== 'websearch' || !step.detail) return null
    return parseSearchLinks(step.detail)
  }, [type, toolName, step.detail])

  const icon = () => {
    if (status === 'running') return <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />
    if (status === 'error') return <span className="text-error text-xs flex-shrink-0">✗</span>
    if (type === 'tool_result' && status === 'complete') return <span className="text-success text-xs flex-shrink-0">✓</span>
    return <Loader2 className="w-3.5 h-3.5 text-muted flex-shrink-0" />
  }

  return (
    <div className={`flex items-start gap-2 text-xs py-1.5 px-2 rounded ${
      status === 'running' ? 'text-ink' : status === 'error' ? 'text-error' : 'text-muted'
    }`}>
      {icon()}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="font-medium">{step.label}</span>
          {!step.detail && !searchLinks && status === 'running' && (
            <span className="text-muted-soft">...</span>
          )}
        </div>
        {/* WebSearch results: render as clickable link list */}
        {searchLinks && <SearchLinkList links={searchLinks} />}
        {/* Other: plain expandable text */}
        {step.detail && !searchLinks && <ExpandableText text={step.detail} />}
      </div>
    </div>
  )
}

// ── Main component ──

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
            <p className="text-body text-sm">Try: &quot;百度今天股价多少&quot;</p>
          </div>
        )}

        {/* Messages + attached steps */}
        {messages.map((message) => (
          <div key={message.id} className="mb-6 max-w-3xl mx-auto group">
            <div className={`mb-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span className="text-xs text-muted uppercase">
                {message.role === 'user' ? 'YOU' : 'AGENT'}
              </span>
            </div>

            {/* Steps BEFORE bubble — they happened first */}
            {message.steps && message.steps.length > 0 && (
              <div className="mb-3 ml-2 pl-3 border-l-2 border-hairline">
                {message.steps.map((step) => (
                  <InlineStep key={step.id} step={step} />
                ))}
              </div>
            )}

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
                  {copiedId === message.id ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Live steps — during streaming, before message finalized */}
        {progressSteps.length > 0 && isLoading && (
          <div className="mb-3 max-w-3xl mx-auto pl-4 border-l-2 border-primary">
            <div className="mb-1 text-xs text-muted-soft flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Processing...
            </div>
            {progressSteps.map((step) => (
              <InlineStep key={step.id} step={step} />
            ))}
          </div>
        )}

        {/* Streaming response */}
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

        {isLoading && !currentResponse && progressSteps.length === 0 && (
          <div className="text-center py-4">
            <span className="animate-pulse inline-block text-primary">AGENT is thinking...</span>
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
