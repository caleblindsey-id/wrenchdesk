import { getTickets } from '@/lib/db/tickets'
import { requireRole } from '@/lib/auth'
import ServiceRequestList from './ServiceRequestList'

export default async function ServiceRequestsPage() {
  await requireRole('manager', 'coordinator')
  const tickets = await getTickets({ ticketType: 'service_request' })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Service Requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          Additional work requested by technicians on-site — create corresponding tickets in Synergy
        </p>
      </div>
      <ServiceRequestList tickets={tickets} />
    </div>
  )
}
