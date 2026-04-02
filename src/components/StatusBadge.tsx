import { TicketStatus } from '@/types/database'

const statusConfig: Record<TicketStatus, { label: string; classes: string }> = {
  unassigned: {
    label: 'Unassigned',
    classes: 'bg-yellow-100 text-yellow-800',
  },
  assigned: {
    label: 'Assigned',
    classes: 'bg-blue-100 text-blue-800',
  },
  in_progress: {
    label: 'In Progress',
    classes: 'bg-orange-100 text-orange-800',
  },
  completed: {
    label: 'Completed',
    classes: 'bg-green-100 text-green-800',
  },
  billed: {
    label: 'Billed',
    classes: 'bg-purple-100 text-purple-800',
  },
  skipped: {
    label: 'Skipped',
    classes: 'bg-gray-100 text-gray-800',
  },
}

export default function StatusBadge({ status }: { status: TicketStatus }) {
  const config = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.classes}`}
    >
      {config.label}
    </span>
  )
}
