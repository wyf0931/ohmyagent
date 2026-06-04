import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  const { pathname } = request.nextUrl

  const publicPaths = ['/login', '/auth']
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))
  const isApiPath = pathname.startsWith('/api')
  const isStaticAsset =
    pathname.startsWith('/_next') || pathname.includes('.')

  if (isPublicPath || isApiPath || isStaticAsset) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
