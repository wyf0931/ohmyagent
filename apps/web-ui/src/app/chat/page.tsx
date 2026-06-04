import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function ChatPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Create a new session and redirect to it
  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      title: 'New Chat',
    })
    .select()
    .single()

  if (error || !session) {
    console.error('Failed to create session:', error)
    redirect('/login')
  }

  redirect(`/chat/${session.id}`)
}
