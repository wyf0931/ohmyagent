import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ChatSessionContent from './[sessionId]/ChatSessionContent'

export default async function ChatPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load most recent session — don't create a new one
  const { data: recentSession } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentSession) {
    redirect(`/chat/${recentSession.id}`)
  }

  // No sessions yet — render empty chat, session created on first send
  return (
    <ChatSessionContent
      sessionId=""
      sessionTitle={null}
      userId={user.id}
      userEmail={user.email}
      initialMessages={[]}
    />
  )
}
