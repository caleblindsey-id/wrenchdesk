'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EquipmentWithCustomer } from '@/lib/db/equipment'
import AddEquipmentModal from './AddEquipmentModal'

interface EquipmentListProps {
  equipment: EquipmentWithCustomer[]
}

export default function EquipmentList({ equipment }: EquipmentListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showActive, setShowActive] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = equipment.filter((e) => {
    if (showActive && !e.active) return false
    if (!showActive && e.active) return false
    if (search) {
      const q = search.toLowerCase()
      const name = e.customers?.name?.toLowerCase() ?? ''
      const serial = e.serial_number?.toLowerCase() ?? ''
      return name.includes(q) || serial.includes(q)
    }
    return true
  })

  return (
    <>
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search by customer or serial number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowActive(true)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                showActive
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setShowActive(false)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                !showActive
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Inactive
            </button>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-1.5 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 transition-colors"
          >
            Add Equipment
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No equipment found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Customer</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Make / Model</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Serial Number</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Location</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/equipment/${e.id}`)}
                  >
                    <td className="px-5 py-3 text-gray-900">
                      {e.customers?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {[e.make, e.model].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {e.serial_number ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {e.location_on_site ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          e.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {e.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddEquipmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false)
          router.refresh()
        }}
      />
    </>
  )
}
