import { getUsers } from '@/lib/db/users'
import { createClient } from '@/lib/supabase/server'
import { SyncLogRow } from '@/types/database'
import SettingsContent from './SettingsContent'

export default async function SettingsPage() {
  const [users, syncLog] = await Promise.all([
    getUsers(),
    getSyncLog(),
  ])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage users and view sync history
        </p>
      </div>
      <SettingsContent users={users} syncLog={syncLog} />
    </div>
  )
}

async function getSyncLog(): Promise<SyncLogRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20)

  if (error) return []
  return data
}
