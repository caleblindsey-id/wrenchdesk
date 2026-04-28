import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { ShipToRequestStatus } from '@/types/database'

const STAFF_ROLES = ['manager', 'coordinator', 'super_admin'] as const
const VALID_STATUSES = ['resolved', 'dismissed'] as const
type ResolvedStatus = typeof VALID_STATUSES[number]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const id = Number(rawId)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const body = (await request.json()) as {
      status?: unknown
      resolved_ship_to_id?: unknown
    }
    const rawStatus = typeof body.status === 'string' ? body.status : ''
    if (!VALID_STATUSES.includes(rawStatus as ResolvedStatus)) {
      return NextResponse.json(
        { error: 'status must be resolved or dismissed' },
        { status: 400 }
      )
    }
    const status: ShipToRequestStatus = rawStatus as ResolvedStatus

    const resolvedShipToId =
      body.resolved_ship_to_id != null ? Number(body.resolved_ship_to_id) : null
    if (
      status === 'resolved' &&
      (!Number.isInteger(resolvedShipToId) || (resolvedShipToId ?? 0) <= 0)
    ) {
      return NextResponse.json(
        { error: 'resolved_ship_to_id is required when marking resolved' },
        { status: 400 }
      )
    }

    const user = await getCurrentUser()
    if (!user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!STAFF_ROLES.includes(user.role as typeof STAFF_ROLES[number])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()

    // If we're linking a ship_to_location, sanity-check it belongs to the
    // request's customer so the office can't accidentally close a request
    // against the wrong account.
    if (status === 'resolved' && resolvedShipToId) {
      const { data: req } = await supabase
        .from('ship_to_requests')
        .select('customer_id')
        .eq('id', id)
        .single()
      if (!req) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 })
      }
      const { data: shipTo } = await supabase
        .from('ship_to_locations')
        .select('id, customer_id')
        .eq('id', resolvedShipToId)
        .single()
      if (!shipTo || shipTo.customer_id !== req.customer_id) {
        return NextResponse.json(
          { error: 'Ship-to belongs to a different customer' },
          { status: 422 }
        )
      }
    }

    const { data, error } = await supabase
      .from('ship_to_requests')
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolved_ship_to_id: status === 'resolved' ? resolvedShipToId : null,
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .single()

    if (error) {
      console.error('ship-to-requests PATCH error:', error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json(
        { error: 'Request not found or already resolved' },
        { status: 404 }
      )
    }

    return NextResponse.json({ request: data })
  } catch (err) {
    console.error('ship-to-requests PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
