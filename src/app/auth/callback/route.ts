import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const nextParam = request.nextUrl.searchParams.get('next') ?? '/'

  // Reject open-redirect attempts: only same-origin relative paths are allowed.
  const safePath = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'link_expired')
      url.search = url.search // ensure rebuilt
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.redirect(new URL(safePath, request.url))
}
