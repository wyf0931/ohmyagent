import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ChatSessionContent from './ChatSessionContent'

export default async function ChatSessionPage({
  params,
}: {
  params: { sessionId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load session
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', params.sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) {
    redirect('/chat')
  }

  // Load messages for this session
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', params.sessionId)
    .order('created_at', { ascending: true })

  return (
    <ChatSessionContent
      sessionId={session.id}
      sessionTitle={session.title}
      userId={user.id}
      userEmail={user.email}
      initialMessages={messages || []}
    />
  )
}
