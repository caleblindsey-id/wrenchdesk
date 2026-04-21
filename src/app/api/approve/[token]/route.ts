import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  if (!body || !body.action) {
    return NextResponse.json({ error: 'Missing action' }, { status: 400 })
  }

  const { action, signature, signature_name, decline_reason } = body

  if (action !== 'approve' && action !== 'decline') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (action === 'approve') {
    if (!signature || !signature_name?.trim()) {
      return NextResponse.json(
        { error: 'Signature and name are required to approve' },
        { status: 400 }
      )
    }
  }

  const supabase = createAdminClient()

  const { data: ticket, error: fetchError } = await supabase
    .from('service_tickets')
    .select('id, status, approval_token_expires_at')
    .eq('approval_token', token)
    .single()

  if (fetchError || !ticket) {
    return NextResponse.json({ error: 'This link is no longer valid.' }, { status: 404 })
  }

  if (ticket.approval_token_expires_at && new Date(ticket.approval_token_expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'This link has expired. Please contact us for a new one.' },
      { status: 410 }
    )
  }

  if (ticket.status !== 'estimated') {
    return NextResponse.json(
      { error: 'This estimate has already been responded to.' },
      { status: 409 }
    )
  }

  const update: Record<string, unknown> = {
    approval_token: null,
    approval_token_expires_at: null,
    updated_at: new Date().toISOString(),
  }

  if (action === 'approve') {
    update.status = 'approved'
    update.estimate_approved = true
    update.estimate_approved_at = new Date().toISOString()
    update.estimate_signature = signature
    update.estimate_signature_name = signature_name.trim()
  } else {
    update.status = 'declined'
    if (decline_reason?.trim()) {
      update.decline_reason = decline_reason.trim()
    }
  }

  const { error: updateError } = await supabase
    .from('service_tickets')
    .update(update)
    .eq('id', ticket.id)

  if (updateError) {
    console.error('Approval update failed:', updateError)
    return NextResponse.json({ error: 'Failed to process response' }, { status: 500 })
  }

  return NextResponse.json({ success: true, action })
}
