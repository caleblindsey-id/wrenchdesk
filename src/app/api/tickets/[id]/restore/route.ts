import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, RESET_ROLES } from '@/lib/auth'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await getCurrentUser()
    if (!user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!RESET_ROLES.includes(user.role!)) {
      return NextResponse.json({ error: 'Only managers can restore tickets' }, { status: 403 })
    }

    const supabase = await createClient()

    const { data: restored, error } = await supabase
      .from('pm_tickets')
      .update({ deleted_at: null, deleted_by_id: null })
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .select('id')
      .maybeSingle()

    if (error) {
      // 23505 = unique_violation: a replacement ticket exists for the same
      // (pm_schedule_id, month, year) slot — surfaces as a clean 409 instead
      // of an opaque 500.
      if ((error as { code?: string }).code === '23505') {
        return NextResponse.json(
          { error: 'A ticket already exists for this schedule and month — cannot restore.' },
          { status: 409 }
        )
      }
      throw error
    }
    if (!restored) {
      return NextResponse.json({ error: 'Ticket not found or not deleted' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: restored.id })
  } catch (err) {
    console.error('tickets/[id]/restore error:', err)
    return NextResponse.json({ error: 'Failed to restore ticket' }, { status: 500 })
  }
}
