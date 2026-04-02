'use client'

import { useRouter } from 'next/navigation'
import { ProspectRow } from '@/lib/db/customers'

interface ProspectListProps {
  prospects: ProspectRow[]
}

export default function ProspectList({ prospects }: ProspectListProps) {
  const router = useRouter()

  if (prospects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-sm text-gray-500">
        No inactive customers found.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-5 py-3 text-left font-medium text-gray-600">Customer</th>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Account #</th>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Last Service</th>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Last Tech</th>
              <th className="px-5 py-3 text-right font-medium text-gray-600">Equipment</th>
              <th className="px-5 py-3 text-right font-medium text-gray-600">Total Revenue</th>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Contact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {prospects.map((p) => (
              <tr
                key={p.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/customers/${p.id}`)}
              >
                <td className="px-5 py-3 text-gray-900 font-medium">{p.name}</td>
                <td className="px-5 py-3 text-gray-600 font-mono text-xs">{p.accountNumber ?? '—'}</td>
                <td className="px-5 py-3 text-gray-600">
                  {p.lastServiceDate
                    ? new Date(p.lastServiceDate).toLocaleDateString()
                    : '—'}
                </td>
                <td className="px-5 py-3 text-gray-600">{p.lastTechnician ?? '—'}</td>
                <td className="px-5 py-3 text-gray-600 text-right">{p.equipmentCount}</td>
                <td className="px-5 py-3 text-gray-900 text-right font-medium">
                  {p.totalRevenue > 0 ? `$${p.totalRevenue.toFixed(2)}` : '—'}
                </td>
                <td className="px-5 py-3 text-gray-600 text-xs">
                  {p.contactName && <div>{p.contactName}</div>}
                  {p.contactEmail && <div className="text-gray-400">{p.contactEmail}</div>}
                  {p.contactPhone && <div className="text-gray-400">{p.contactPhone}</div>}
                  {!p.contactName && !p.contactEmail && !p.contactPhone && '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
