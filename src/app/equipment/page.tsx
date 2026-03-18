import { getEquipment } from '@/lib/db/equipment'
import EquipmentList from './EquipmentList'

export default async function EquipmentPage() {
  const equipment = await getEquipment()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Equipment</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage customer equipment and PM schedules
        </p>
      </div>
      <EquipmentList equipment={equipment} />
    </div>
  )
}
