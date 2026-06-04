'use client'

import { useState } from 'react'

interface NavbarProps {
  darkMode: boolean
  onDarkModeToggle: () => void
}

export default function Navbar({ darkMode, onDarkModeToggle }: NavbarProps) {
  const [language, setLanguage] = useState<'en' | 'zh'>('en')

  return (
    <nav className="h-14 border-b flex items-center justify-between px-4 bg-canvas">
      {/* Logo/Brand */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-on-primary font-bold text-sm">Ω</span>
        </div>
        <h1 className="text-lg font-medium text-ink">OhMyAgent</h1>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Language Selector (placeholder) */}
        <div className="relative">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'zh')}
            className="appearance-none bg-transparent text-sm text-body pr-6 cursor-pointer hover:text-ink transition-colors"
            disabled
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
          <span className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-muted-soft text-xs">▼</span>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={onDarkModeToggle}
          className="w-9 h-9 rounded-lg bg-surface-card hover:bg-surface-soft flex items-center justify-center transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  )
}
