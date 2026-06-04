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
  onLoadMore: () => void
  hasMore: boolean
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onLoadMore,
  hasMore,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Header - New Chat Button */}
      <div className="sidebar-header">
        <button
          onClick={onNewChat}
          className="w-full px-4 py-3 rounded-lg bg-primary hover:bg-primary-active text-on-primary font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-lg">+</span>
          <span>New Chat</span>
        </button>
      </div>

      {/* Session History */}
      <div className="sidebar-content">
        {sessions.length === 0 ? (
          <div className="text-center text-muted-soft text-sm py-8">
            No chat history yet
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeSessionId === session.id
                    ? 'bg-primary text-on-primary'
                    : 'hover:bg-surface-soft text-body'
                }`}
              >
                <div className="truncate text-sm font-medium">{session.title}</div>
                <div className="text-xs opacity-70 mt-0.5">
                  {session.createdAt.toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Load More */}
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
