import { createClient } from '@/lib/supabase/server'
import { ProductRow } from '@/types/database'

export async function getProducts(): Promise<ProductRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('number')
    .limit(2000)
  if (error) throw error
  return data
}
