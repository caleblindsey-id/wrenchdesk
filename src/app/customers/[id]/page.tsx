import { getCustomer } from '@/lib/db/customers'
import { getEquipment } from '@/lib/db/equipment'
import { requireRole } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CreditHoldBadge from '@/components/CreditHoldBadge'
import ActiveToggle from './ActiveToggle'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole('manager', 'coordinator')
  const { id } = await params
  const customerId = parseInt(id)
  if (isNaN(customerId)) notFound()

  const [customer, equipment] = await Promise.all([
    getCustomer(customerId),
    getEquipment({ customerId }),
  ])

  if (!customer) notFound()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/customers"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {customer.name}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Account: {customer.account_number ?? '—'}
          </p>
        </div>
        <ActiveToggle customerId={customer.id} isActive={customer.active} />
      </div>

      {customer.credit_hold && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <CreditHoldBadge />
          <span className="text-sm text-red-800 font-medium">
            This customer is on credit hold.
          </span>
        </div>
      )}

      {/* Customer info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
          Customer Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <span className="text-gray-500">Name</span>
            <p className="text-gray-900 font-medium">{customer.name}</p>
          </div>
          <div>
            <span className="text-gray-500">Account Number</span>
            <p className="text-gray-900 font-medium">
              {customer.account_number ?? '—'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">AR Terms</span>
            <p className="text-gray-900 font-medium">
              {customer.ar_terms ?? '—'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Billing Address</span>
            <p className="text-gray-900 font-medium">
              {customer.billing_address ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Contacts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Contacts
          </h2>
        </div>
        {customer.contacts.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No contacts on file.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Name</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Email</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Phone</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customer.contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td className="px-5 py-3 text-gray-900">{contact.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{contact.email ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{contact.phone ?? '—'}</td>
                    <td className="px-5 py-3">
                      {contact.is_primary && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          Primary
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Equipment */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Equipment
          </h2>
        </div>
        {equipment.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No equipment on file.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Make / Model</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Serial Number</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Location</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equipment.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-900">
                      <Link
                        href={`/equipment/${e.id}`}
                        className="text-slate-700 hover:text-slate-900 font-medium"
                      >
                        {[e.make, e.model].filter(Boolean).join(' ') || '—'}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{e.serial_number ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{e.location_on_site ?? '—'}</td>
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
    </div>
  )
}
