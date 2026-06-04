import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://localhost:4000'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, sessionId, newSession } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const response = await fetch(`${AGENT_SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId, newSession }),
    })

    if (!response.ok) {
      throw new Error(`Agent server responded with ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to get response from agent' },
      { status: 500 }
    )
  }
}
