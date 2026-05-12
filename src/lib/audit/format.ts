/**
 * Shared formatting for audit_events rows.
 * Used by both the global /admin/audit-log page and the per-record
 * AuditHistorySection so labels and diff rendering stay consistent.
 */

export type AuditAction = 'insert' | 'update' | 'delete'
export type AuditActorType = 'user' | 'customer' | 'system' | 'sync'

export type AuditEvent = {
  id: number
  occurred_at: string
  entity_type: string
  entity_id: string
  action: AuditAction
  actor_type: AuditActorType
  changed_by: string | null
  actor_label: string | null
  changes: Record<string, unknown>
  context: Record<string, unknown> | null
}

export type AuditEventWithActor = AuditEvent & {
  actor: { id: string; name: string; role: string | null } | null
}

export const ENTITY_LABELS: Record<string, string> = {
  service_tickets: 'Service Ticket',
  pm_tickets: 'PM Ticket',
  equipment: 'Equipment',
  pm_schedules: 'PM Schedule',
  customers: 'Customer',
  users: 'User',
}

export const ENTITY_TYPES = Object.keys(ENTITY_LABELS)

export const ACTION_LABELS: Record<AuditAction, string> = {
  insert: 'created',
  update: 'updated',
  delete: 'deleted',
}

// Human-readable column names per entity. Default falls back to the raw
// column name. Add entries as needed — coverage doesn't have to be exhaustive
// since the raw name is usually readable enough.
const COLUMN_LABELS: Record<string, Record<string, string>> = {
  service_tickets: {
    status: 'Status',
    assigned_technician_id: 'Assigned tech',
    customer_id: 'Customer',
    equipment_id: 'Equipment',
    problem_description: 'Problem',
    completion_notes: 'Completion notes',
    estimate_amount: 'Estimate',
    estimate_approved_at: 'Approved at',
    billing_amount: 'Billing amount',
    diagnostic_charge: 'Diagnostic charge',
    labor_rate_type: 'Labor rate',
    priority: 'Priority',
    manual_decision_note: 'Decision note',
  },
  pm_tickets: {
    status: 'Status',
    assigned_technician_id: 'Assigned tech',
    scheduled_date: 'Scheduled',
    completed_date: 'Completed',
    completion_notes: 'Completion notes',
    hours_worked: 'Hours worked',
    billing_amount: 'Billing amount',
    ship_to_location_id: 'Ship-to',
    deleted_at: 'Deleted at',
  },
  equipment: {
    make: 'Make',
    model: 'Model',
    serial_number: 'Serial',
    description: 'Description',
    location_on_site: 'Location on site',
    contact_name: 'Contact name',
    contact_email: 'Contact email',
    contact_phone: 'Contact phone',
    active: 'Active',
    default_technician_id: 'Default tech',
  },
  pm_schedules: {
    interval_months: 'Interval (months)',
    anchor_month: 'Anchor month',
    billing_type: 'Billing type',
    flat_rate: 'Flat rate',
    active: 'Active',
  },
  customers: {
    name: 'Name',
    credit_hold: 'Credit hold',
    po_required: 'PO required',
    ar_terms: 'AR terms',
    active: 'Active',
    show_pricing_on_pm_pdf: 'Show pricing on PDF',
    auto_approve_threshold: 'Auto-approve threshold',
  },
  users: {
    name: 'Name',
    email: 'Email',
    role: 'Role',
    active: 'Active',
    hourly_cost: 'Hourly cost',
  },
}

export function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType
}

export function columnLabel(entityType: string, column: string): string {
  return COLUMN_LABELS[entityType]?.[column] ?? column
}

// True when the diff entry is shaped like {old, new} — i.e. it came from an
// UPDATE. INSERT/DELETE rows store full values directly.
function isDiffPair(v: unknown): v is { old: unknown; new: unknown } {
  return (
    typeof v === 'object' &&
    v !== null &&
    'old' in v &&
    'new' in v
  )
}

export function renderValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'string') {
    // Truncate long blobs for the summary view; the full value is still in
    // the JSONB and the expanded view can show it.
    if (v.length > 80) return v.slice(0, 77) + '…'
    return v
  }
  if (typeof v === 'number') return v.toString()
  return JSON.stringify(v)
}

/**
 * Build a 1-2 line summary of the most salient diffs in an UPDATE row, for
 * the global page's table cell. Picks status transitions first, then any
 * other field changes.
 */
export function changeSummary(event: AuditEvent): string {
  if (event.action === 'insert') {
    return 'Created'
  }
  if (event.action === 'delete') {
    return 'Deleted'
  }

  const entries = Object.entries(event.changes ?? {})
  if (entries.length === 0) return '(no changes)'

  // Prefer status transitions for quick scanning.
  entries.sort(([a], [b]) => {
    if (a === 'status') return -1
    if (b === 'status') return 1
    return 0
  })

  const head = entries.slice(0, 2).map(([key, val]) => {
    const label = columnLabel(event.entity_type, key)
    if (isDiffPair(val)) {
      return `${label}: ${renderValue(val.old)} → ${renderValue(val.new)}`
    }
    return `${label}: ${renderValue(val)}`
  })

  const tail = entries.length > 2 ? ` (+${entries.length - 2} more)` : ''
  return head.join(' · ') + tail
}

export type FormattedDiffEntry = {
  key: string
  label: string
  kind: 'pair' | 'value'
  old?: unknown
  new?: unknown
  value?: unknown
}

/**
 * Normalized diff for the expanded / inline detail views. Always returns an
 * array so the consumer renders one row per changed field.
 */
export function formatDiff(event: AuditEvent): FormattedDiffEntry[] {
  return Object.entries(event.changes ?? {}).map(([key, val]) => {
    const label = columnLabel(event.entity_type, key)
    if (isDiffPair(val)) {
      return { key, label, kind: 'pair', old: val.old, new: val.new }
    }
    return { key, label, kind: 'value', value: val }
  })
}

export function actorDisplayName(event: AuditEventWithActor): string {
  if (event.actor) return event.actor.name
  if (event.actor_label) return event.actor_label
  if (event.actor_type === 'system') return 'System'
  if (event.actor_type === 'sync') return 'Sync job'
  if (event.actor_type === 'customer') return 'Customer'
  return 'Unknown'
}

export function formatOccurredAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  // Compact format suitable for table rows. CST is Caleb's timezone; using
  // user-locale Intl so it adapts on other machines without forcing CST.
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
