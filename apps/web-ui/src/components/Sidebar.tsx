'use client'

import { useState } from 'react'

interface Session {
  id: string
  title: string
  createdAt: Date
}

interface SidebarProps {
  sessions: Session[]
  activeSessionId: string | null
  onNewChat: () => void
  onSelectSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onLoadMore: () => void
  hasMore: boolean
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onLoadMore,
  hasMore,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button
          onClick={onNewChat}
          className="w-full px-4 py-3 rounded-lg bg-primary hover:bg-primary-active text-on-primary font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-lg">+</span>
          <span>New Chat</span>
        </button>
      </div>

      <div className="sidebar-content">
        {sessions.length === 0 ? (
          <div className="text-center text-muted-soft text-sm py-8">
            No chat history yet
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="relative group"
                onMouseEnter={() => setHoveredId(session.id)}
                onMouseLeave={() => { setHoveredId(null); setConfirmId(null) }}
              >
                <button
                  onClick={() => onSelectSession(session.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeSessionId === session.id
                      ? 'bg-primary text-on-primary'
                      : 'hover:bg-surface-soft text-body'
                  }`}
                >
                  <div className="truncate text-sm font-medium pr-6">{session.title}</div>
                  <div className="text-xs opacity-70 mt-0.5">
                    {session.createdAt.toLocaleDateString()}
                  </div>
                </button>

                {hoveredId === session.id && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {confirmId === session.id ? (
                      <div className="flex items-center gap-1 bg-surface-card rounded-md p-0.5 shadow-md">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteSession(session.id)
                            setConfirmId(null)
                          }}
                          className="px-2 py-0.5 text-xs text-error hover:bg-error/10 rounded transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmId(null)
                          }}
                          className="px-2 py-0.5 text-xs text-muted hover:text-ink rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmId(session.id)
                        }}
                        className="p-1 text-muted hover:text-error rounded transition-colors"
                        title="Delete session"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {hasMore && (
        <div className="sidebar-footer">
          <button
            onClick={onLoadMore}
            className="w-full px-3 py-2 text-sm text-muted hover:text-ink transition-colors"
          >
            Load More...
          </button>
        </div>
      )}
    </aside>
  )
}
