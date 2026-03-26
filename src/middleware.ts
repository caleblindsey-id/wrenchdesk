import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Pages technicians are allowed to access
const TECH_ALLOWED_PAGES = ['/', '/tickets', '/login']
const TECH_ALLOWED_PAGE_PATTERNS = [/^\/tickets\/[^/]+$/] // /tickets/[id]

// API routes technicians are allowed to access
const TECH_ALLOWED_API_PATTERNS = [
  /^\/api\/tickets\/[^/]+/, // PATCH /api/tickets/[id] and POST /api/tickets/[id]/complete
]

function isTechAllowed(pathname: string): boolean {
  if (TECH_ALLOWED_PAGES.includes(pathname)) return true
  if (TECH_ALLOWED_PAGE_PATTERNS.some((p) => p.test(pathname))) return true
  if (TECH_ALLOWED_API_PATTERNS.some((p) => p.test(pathname))) return true
  return false
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Skip auth check for public routes
  if (request.nextUrl.pathname.startsWith('/login')) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Redirect unauthenticated users to login
  if (!session) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Role-based access: read the pm-role cookie (set by layout.tsx on each page load)
  const role = request.cookies.get('pm-role')?.value

  if (role === 'technician') {
    const pathname = request.nextUrl.pathname
    if (!isTechAllowed(pathname)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
