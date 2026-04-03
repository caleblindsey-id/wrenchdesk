'use client'

import { useRouter } from 'next/navigation'
import { TicketWithJoins } from '@/lib/db/tickets'
import StatusBadge from '@/components/StatusBadge'

interface ServiceRequestListProps {
  tickets: TicketWithJoins[]
}

export default function ServiceRequestList({ tickets }: ServiceRequestListProps) {
  const router = useRouter()

  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-sm text-gray-500">
        No service requests found.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Mobile cards */}
      <div className="lg:hidden divide-y divide-gray-100">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="px-4 py-3 cursor-pointer active:bg-gray-50"
            onClick={() => router.push(`/tickets/${ticket.id}`)}
          >
            <div className="flex items-center justify-between mb-1">
              <StatusBadge status={ticket.status} />
              <span className="text-sm font-medium text-gray-900 truncate">
                {ticket.customers?.name ?? '—'}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {[ticket.equipment?.make, ticket.equipment?.model]
                .filter(Boolean)
                .join(' ') || '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Tech: {ticket.users?.name ?? '—'} · {new Date(ticket.created_at).toLocaleDateString()}
            </p>
            {ticket.completion_notes && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ticket.completion_notes}</p>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-5 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Customer</th>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Equipment</th>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Description</th>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Technician</th>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Date Created</th>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Parent Ticket</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/tickets/${ticket.id}`)}
              >
                <td className="px-5 py-3">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-5 py-3 text-gray-900 font-medium">
                  {ticket.customers?.name ?? '—'}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {[ticket.equipment?.make, ticket.equipment?.model]
                    .filter(Boolean)
                    .join(' ') || '—'}
                </td>
                <td className="px-5 py-3 text-gray-600 max-w-xs truncate">
                  {ticket.completion_notes ?? '—'}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {ticket.users?.name ?? '—'}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                  {ticket.parent_ticket_id ? (
                    <button
                      onClick={() => router.push(`/tickets/${ticket.parent_ticket_id}`)}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View PM
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
