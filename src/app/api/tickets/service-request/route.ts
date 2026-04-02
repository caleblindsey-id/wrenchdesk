import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, isTechnician } from '@/lib/auth'

interface ServiceRequestBody {
  parentTicketId: string
  description: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as ServiceRequestBody
    const { parentTicketId, description } = body

    if (!parentTicketId || !description?.trim()) {
      return NextResponse.json(
        { error: 'parentTicketId and description are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch the parent ticket to copy customer/equipment info
    const { data: parent, error: fetchError } = await supabase
      .from('pm_tickets')
      .select('customer_id, equipment_id, month, year, assigned_technician_id')
      .eq('id', parentTicketId)
      .single()

    if (fetchError || !parent) {
      return NextResponse.json({ error: 'Parent ticket not found' }, { status: 404 })
    }

    // Techs can only create service requests for their own assigned tickets
    if (isTechnician(user.role) && parent.assigned_technician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create the service request ticket
    const { data: ticket, error: insertError } = await supabase
      .from('pm_tickets')
      .insert({
        parent_ticket_id: parentTicketId,
        ticket_type: 'service_request',
        customer_id: parent.customer_id,
        equipment_id: parent.equipment_id,
        month: parent.month,
        year: parent.year,
        assigned_technician_id: user.id, // Auto-assign to requesting tech
        status: 'assigned',
        parts_used: [],
        completion_notes: description,
        created_by_id: user.id,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (err) {
    console.error('tickets/service-request error:', err)
    return NextResponse.json(
      { error: 'Failed to create service request' },
      { status: 500 }
    )
  }
}
