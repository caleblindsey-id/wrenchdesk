'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ActiveToggleProps {
  customerId: number
  isActive: boolean
}

export default function ActiveToggle({ customerId, isActive }: ActiveToggleProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('customers')
      .update({ active: !isActive })
      .eq('id', customerId)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
        isActive
          ? 'text-red-700 bg-red-50 border border-red-200 hover:bg-red-100'
          : 'text-green-700 bg-green-50 border border-green-200 hover:bg-green-100'
      }`}
    >
      {loading ? 'Updating...' : isActive ? 'Mark Inactive' : 'Mark Active'}
    </button>
  )
}
