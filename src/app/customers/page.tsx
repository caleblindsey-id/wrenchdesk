import { getCustomers } from '@/lib/db/customers'
import CustomerList from './CustomerList'

export default async function CustomersPage() {
  const customers = await getCustomers()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Synced from SynergyERP — read only
        </p>
      </div>
      <CustomerList customers={customers} />
    </div>
  )
}
