import { getEquipmentDetail } from '@/lib/db/equipment'
import { getUsers } from '@/lib/db/users'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import EquipmentForm from './EquipmentForm'
import ScheduleSection from './ScheduleSection'
import StatusBadge from '@/components/StatusBadge'

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [equipment, users] = await Promise.all([
    getEquipmentDetail(id),
    getUsers(true),
  ])

  if (!equipment) notFound()

  const activeSchedule = equipment.pm_schedules.find((s) => s.active)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/equipment"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {[equipment.make, equipment.model].filter(Boolean).join(' ') || 'Equipment'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {equipment.customers?.name ?? 'No customer'} — {equipment.serial_number ?? 'No serial'}
          </p>
        </div>
      </div>

      <EquipmentForm equipment={equipment} users={users} />

      <ScheduleSection
        equipmentId={equipment.id}
        schedule={activeSchedule ?? null}
      />

      {/* Ticket history */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Ticket History
          </h2>
        </div>
        {equipment.pm_tickets.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No ticket history.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Month/Year</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Completed</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Billing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equipment.pm_tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-900">
                      {t.month}/{t.year}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {t.completed_date
                        ? new Date(t.completed_date).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {t.billing_amount != null
                        ? `$${t.billing_amount.toFixed(2)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
