'use client'

import { useState } from 'react'
import { ProductRow } from '@/types/database'

interface ProductListProps {
  products: ProductRow[]
}

function formatCurrency(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ProductList({ products }: ProductListProps) {
  const [search, setSearch] = useState('')

  const filtered = products.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.number.toLowerCase().includes(q) ||
      (p.description?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <input
          type="text"
          placeholder="Search by product number or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No products found.
          </div>
        ) : (
          <>
            {/* Mobile cards — hidden on desktop */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filtered.map((p) => (
                <div key={p.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-mono text-gray-500 shrink-0">{p.number}</span>
                    <span className="text-sm font-medium text-gray-900 text-right ml-2">{formatCurrency(p.unit_price)}</span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">{p.description ?? '—'}</p>
                </div>
              ))}
            </div>

            {/* Desktop table — hidden on mobile */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-left font-medium text-gray-600">#</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-600">Description</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-600">Unit Price</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-600">Last Synced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-600 font-mono text-xs">{p.number}</td>
                      <td className="px-5 py-3 text-gray-900">{p.description ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{formatCurrency(p.unit_price)}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(p.synced_at)}</td>
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
