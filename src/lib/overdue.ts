import { TicketStatus } from '@/types/database'

export const OVERDUE_ELIGIBLE_STATUSES: readonly TicketStatus[] = [
  'unassigned',
  'assigned',
  'in_progress',
  'skip_requested',
] as const

type OverdueInput = { month: number; year: number; status: TicketStatus }

export function isOverdue(ticket: OverdueInput, now: Date = new Date()): boolean {
  if (!OVERDUE_ELIGIBLE_STATUSES.includes(ticket.status)) return false
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  if (ticket.year < currentYear) return true
  if (ticket.year > currentYear) return false
  return ticket.month < currentMonth
}

export function daysOverdue(
  ticket: Pick<OverdueInput, 'month' | 'year'>,
  now: Date = new Date()
): number {
  const startOfNextMonth = new Date(Date.UTC(ticket.year, ticket.month, 1, 0, 0, 0))
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0))
  const diffMs = today.getTime() - startOfNextMonth.getTime()
  if (diffMs <= 0) return 0
  return Math.floor(diffMs / (24 * 60 * 60 * 1000))
}
