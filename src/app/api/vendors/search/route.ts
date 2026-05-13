import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, MANAGER_ROLES } from '@/lib/auth'

// PostgREST `.or()` parses commas as clause separators and parens as grouping;
// either character in user input lets the caller inject extra filters.
// Strip them before interpolation. (See feedback memory: postgrest-or-comma-injection.)
function sanitizeForOr(q: string): string {
  return q.replace(/[,()*%]/g, '').trim()
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!MANAGER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const q = sanitizeForOr(request.nextUrl.searchParams.get('q') ?? '').slice(0, 64)
    if (!q) {
      return NextResponse.json({ results: [] })
    }

    const supabase = await createClient()

    // Numeric q: also match exact vendor code (the int PK).
    const numeric = /^\d+$/.test(q)
    const filter = numeric
      ? `name.ilike.%${q}%,code.eq.${Number(q)}`
      : `name.ilike.%${q}%`

    const { data, error } = await supabase
      .from('vendors')
      .select('code, name')
      .or(filter)
      .order('name')
      .limit(10)

    if (error) {
      console.error('vendors/search query error:', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    return NextResponse.json({ results: data ?? [] })
  } catch (err) {
    console.error('vendors/search GET error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
