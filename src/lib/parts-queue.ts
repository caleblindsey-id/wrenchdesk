import type {
  PartRequest,
  PartsQueueSource,
  PartsValidationStatus,
  SynergyValidationStatus,
} from '@/types/database'

export type RevalidateResult = {
  synergy_validation_status: SynergyValidationStatus
  parts_validation_status: PartsValidationStatus
  synergy_validated_at: string | null
}

type UpdateArgs = {
  source: PartsQueueSource
  ticket_id: string
  part_index: number
  fields?: Partial<PartRequest>
  action?: 'patch' | 'mark_ordered' | 'mark_received' | 'cancel' | 'reopen'
  reason?: string
}

async function postUpdate(args: UpdateArgs): Promise<PartRequest> {
  const res = await fetch('/api/parts-queue/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update part')
  }
  return data.part as PartRequest
}

export function updatePartFields(
  source: PartsQueueSource,
  ticket_id: string,
  part_index: number,
  fields: Partial<PartRequest>,
): Promise<PartRequest> {
  return postUpdate({ source, ticket_id, part_index, action: 'patch', fields })
}

export function markPartOrdered(
  source: PartsQueueSource,
  ticket_id: string,
  part_index: number,
  fields?: Partial<PartRequest>,
): Promise<PartRequest> {
  return postUpdate({ source, ticket_id, part_index, action: 'mark_ordered', fields })
}

export function markPartReceived(
  source: PartsQueueSource,
  ticket_id: string,
  part_index: number,
): Promise<PartRequest> {
  return postUpdate({ source, ticket_id, part_index, action: 'mark_received' })
}

export function cancelPart(
  source: PartsQueueSource,
  ticket_id: string,
  part_index: number,
  reason: string,
): Promise<PartRequest> {
  return postUpdate({ source, ticket_id, part_index, action: 'cancel', reason })
}

// Writes synergy_order_number on the parent service/PM ticket (not the
// parts_requested JSONB). Returns the persisted value so the client can sync
// every sibling row sharing this (source, ticket_id).
export async function setSynergyOrderNumber(
  source: PartsQueueSource,
  ticket_id: string,
  value: string | null,
): Promise<string | null> {
  const res = await fetch('/api/parts-queue/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source,
      ticket_id,
      // The route ignores part_index for this action, but the body shape
      // expects something present — send -1 to signal "not a part-level write".
      part_index: -1,
      action: 'set_synergy_order',
      synergy_order_number: value,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update Synergy order #')
  }
  return (data.synergy_order_number ?? null) as string | null
}

// Reserved for a future "Cancelled" tab UI surface — the server route handles
// the action end-to-end already; only the trigger UI hasn't shipped.
export function reopenPart(
  source: PartsQueueSource,
  ticket_id: string,
  part_index: number,
): Promise<PartRequest> {
  return postUpdate({ source, ticket_id, part_index, action: 'reopen' })
}

export function ticketDeepLink(source: PartsQueueSource, ticket_id: string): string {
  return source === 'pm' ? `/tickets/${ticket_id}` : `/service/${ticket_id}`
}

export async function revalidateTicket(
  source: PartsQueueSource,
  ticket_id: string,
): Promise<RevalidateResult> {
  const res = await fetch(`/api/parts-queue/${ticket_id}/revalidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to re-validate')
  }
  return data as RevalidateResult
}
