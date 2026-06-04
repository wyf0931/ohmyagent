import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect(searchParams.redirect || '/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="w-full max-w-md">
        <div className="mx-4 p-8 bg-surface-card rounded-card border border-hairline">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-on-primary font-bold text-lg">Ω</span>
            </div>
            <h1 className="text-xl font-medium text-ink">OhMyAgent</h1>
          </div>

          <LoginForm redirectTo={searchParams.redirect} />
        </div>
      </div>
    </div>
  )
}
