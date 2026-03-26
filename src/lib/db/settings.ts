import { createClient } from '@/lib/supabase/server'

export async function getSetting(key: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw error
  }
  return data.value
}

export async function setSetting(key: string, value: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })

  if (error) throw error
}
