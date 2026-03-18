'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EquipmentRow, UserRow } from '@/types/database'

interface EquipmentFormProps {
  equipment: EquipmentRow & { customers: { name: string } | null }
  users: UserRow[]
}

export default function EquipmentForm({ equipment, users }: EquipmentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [make, setMake] = useState(equipment.make ?? '')
  const [model, setModel] = useState(equipment.model ?? '')
  const [serialNumber, setSerialNumber] = useState(equipment.serial_number ?? '')
  const [description, setDescription] = useState(equipment.description ?? '')
  const [locationOnSite, setLocationOnSite] = useState(equipment.location_on_site ?? '')
  const [defaultTechId, setDefaultTechId] = useState(equipment.default_technician_id ?? '')
  const [active, setActive] = useState(equipment.active)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('equipment')
      .update({
        make: make || null,
        model: model || null,
        serial_number: serialNumber || null,
        description: description || null,
        location_on_site: locationOnSite || null,
        default_technician_id: defaultTechId || null,
        active,
      } )
      .eq('id', equipment.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
        Equipment Details
      </h2>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {success && <p className="text-sm text-green-600 mb-3">Saved.</p>}
      <form onSubmit={handleSubmit} className="space-y-3 max-w-xl">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
            <input type="text" value={make} onChange={(e) => setMake(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
          <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location on Site</label>
          <input type="text" value={locationOnSite} onChange={(e) => setLocationOnSite(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Technician</label>
          <select value={defaultTechId} onChange={(e) => setDefaultTechId(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500">
            <option value="">None</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="active" className="text-sm text-gray-700">Active</label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
