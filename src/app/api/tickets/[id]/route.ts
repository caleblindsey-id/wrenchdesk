import { NextRequest, NextResponse } from 'next/server'
import { updateTicket } from '@/lib/db/tickets'
import { PmTicketRow } from '@/types/database'

// Only allow these fields to be updated via PATCH
const ALLOWED_FIELDS = [
  'assigned_technician_id',
  'status',
  'scheduled_date',
  'completion_notes',
  'hours_worked',
  'parts_used',
  'billing_amount',
] as const

type AllowedUpdate = Pick<PmTicketRow, typeof ALLOWED_FIELDS[number]>

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const raw = await request.json()

    const filtered = Object.fromEntries(
      Object.entries(raw).filter(([key]) => (ALLOWED_FIELDS as readonly string[]).includes(key))
    ) as Partial<AllowedUpdate>

    if (Object.keys(filtered).length === 0) {
      return NextResponse.json(
        { error: 'No recognized fields in request body' },
        { status: 400 }
      )
    }

    const updated = await updateTicket(id, filtered)

    return NextResponse.json(updated)
  } catch (err) {
    console.error(`tickets/[id] PATCH error:`, err)
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    )
  }
}
