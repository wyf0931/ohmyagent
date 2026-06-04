import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', params.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const body = await request.json()
  const { type, role, content, metadata } = body

  const { data, error } = await supabase
    .from('messages')
    .insert({
      session_id: params.id,
      type: type || 'user_message',
      role: role || 'user',
      content: content || '',
      metadata: metadata || {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase
    .from('sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', params.id)

  return NextResponse.json(data)
}
