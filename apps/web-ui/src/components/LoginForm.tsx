'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/utils/supabase/client'

interface LoginFormProps {
  redirectTo?: string
}

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    window.location.href = redirectTo || '/chat'
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-body mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full px-4 py-3 bg-canvas text-ink placeholder:text-muted-soft border border-hairline rounded-lg focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-body mb-1.5">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          minLength={6}
          className="w-full px-4 py-3 bg-canvas text-ink placeholder:text-muted-soft border border-hairline rounded-lg focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {error && (
        <div className="text-sm text-error bg-error/10 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-primary hover:bg-primary-active text-on-primary rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
