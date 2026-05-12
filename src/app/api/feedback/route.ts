import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_CATEGORIES = new Set(['bug', 'idea', 'question'])
const MAX_BODY = 4000
const MAX_URL = 500
const MAX_UA = 500

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!raw) {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
    }

    const category = typeof raw.category === 'string' ? raw.category : ''
    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    }

    const bodyText = typeof raw.body === 'string' ? raw.body.trim() : ''
    if (!bodyText) {
      return NextResponse.json({ error: 'Body is required.' }, { status: 400 })
    }
    if (bodyText.length > MAX_BODY) {
      return NextResponse.json({ error: `Body too long (max ${MAX_BODY}).` }, { status: 400 })
    }

    const pageUrl =
      typeof raw.page_url === 'string' && raw.page_url.length <= MAX_URL ? raw.page_url : null
    const userAgent =
      typeof raw.user_agent === 'string' && raw.user_agent.length <= MAX_UA ? raw.user_agent : null

    // Validate attachment path ownership: must start with `${user.id}/`
    let attachmentPath: string | null = null
    if (typeof raw.attachment_path === 'string' && raw.attachment_path.length > 0) {
      const path = raw.attachment_path
      if (!path.startsWith(`${user.id}/`) || path.includes('..')) {
        return NextResponse.json({ error: 'Invalid attachment path.' }, { status: 400 })
      }
      attachmentPath = path
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('feedback_submissions')
      .insert({
        submitted_by_id: user.id,
        submitter_role: user.role,
        submitter_label: user.name || user.email || user.id,
        page_url: pageUrl,
        user_agent: userAgent,
        category,
        body: bodyText,
        attachment_path: attachmentPath,
      })
      .select('id')
      .single()

    if (error) {
      console.error('feedback POST insert error:', error)
      return NextResponse.json({ error: 'Failed to save feedback.' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (err) {
    console.error('feedback POST error:', err)
    return NextResponse.json({ error: 'Failed to save feedback.' }, { status: 500 })
  }
}
