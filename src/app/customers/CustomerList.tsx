'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { CustomerRow } from '@/types/database'
import CreditHoldBadge from '@/components/CreditHoldBadge'

interface CustomerListProps {
  customers: CustomerRow[]
}

export default function CustomerList({ customers }: CustomerListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = customers.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.account_number?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <input
          type="text"
          placeholder="Search by customer name or account number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No customers found.
          </div>
        ) : (
          <>
            {/* Mobile cards — hidden on desktop */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className="px-4 py-3 cursor-pointer active:bg-gray-50"
                  onClick={() => router.push(`/customers/${c.id}`)}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {c.account_number && (
                        <span className="text-xs font-mono text-gray-500 shrink-0">
                          {c.account_number}
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {c.name}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">
                      AR Terms: {c.ar_terms ?? '—'}
                    </span>
                    {c.credit_hold && <CreditHoldBadge />}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table — hidden on mobile */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-left font-medium text-gray-600">Account #</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-600">Customer Name</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-600">AR Terms</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                        {c.account_number ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-900 font-medium">
                        {c.name}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {c.ar_terms ?? '—'}
                      </td>
                      <td className="px-5 py-3">
                        {c.credit_hold && <CreditHoldBadge />}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => router.push(`/customers/${c.id}`)}
                          className="text-sm font-medium text-slate-700 hover:text-slate-900"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  )
}
