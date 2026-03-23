'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CustomerRow, EquipmentRow, UserRow } from '@/types/database'
import { X } from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface CreateTicketModalProps {
  open: boolean
  onClose: () => void
}

export default function CreateTicketModal({ open, onClose }: CreateTicketModalProps) {
  const router = useRouter()
  const now = new Date()

  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [equipment, setEquipment] = useState<EquipmentRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [customerId, setCustomerId] = useState('')
  const [equipmentId, setEquipmentId] = useState('')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [technicianId, setTechnicianId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')

  // Load customers and users when modal opens
  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.from('customers').select('*').order('name').limit(500).then(({ data }) => {
      if (data) setCustomers(data)
    })
    supabase.from('users').select('*').eq('active', true).order('name').then(({ data }) => {
      if (data) setUsers(data)
    })
  }, [open])

  // Reload equipment when customer changes
  useEffect(() => {
    setEquipmentId('')
    if (!customerId) {
      setEquipment([])
      return
    }
    const supabase = createClient()
    supabase
      .from('equipment')
      .select('*')
      .eq('customer_id', parseInt(customerId))
      .eq('active', true)
      .order('make')
      .then(({ data }) => {
        if (data) setEquipment(data)
      })
  }, [customerId])

  function resetForm() {
    setCustomerId('')
    setEquipmentId('')
    setMonth(new Date().getMonth() + 1)
    setYear(new Date().getFullYear())
    setTechnicianId('')
    setScheduledDate('')
    setError(null)
    setEquipment([])
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId || !equipmentId) {
      setError('Customer and equipment are required')
      return
    }
    setLoading(true)
    setError(null)

    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipment_id: equipmentId,
        customer_id: parseInt(customerId),
        month,
        year,
        assigned_technician_id: technicianId || undefined,
        scheduled_date: scheduledDate || undefined,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to create ticket')
      setLoading(false)
      return
    }

    setLoading(false)
    resetForm()
    onClose()
    router.refresh()
  }

  if (!open) return null

  const thisYear = now.getFullYear()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">New Ticket</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipment <span className="text-red-500">*</span>
            </label>
            <select
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              required
              disabled={!customerId}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                {customerId ? 'Select equipment...' : 'Select a customer first'}
              </option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {[eq.make, eq.model].filter(Boolean).join(' ') || eq.id}
                  {eq.serial_number ? ` — SN: ${eq.serial_number}` : ''}
                  {eq.location_on_site ? ` (${eq.location_on_site})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month <span className="text-red-500">*</span>
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year <span className="text-red-500">*</span>
              </label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
