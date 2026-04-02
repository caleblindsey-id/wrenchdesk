import { createClient } from '@/lib/supabase/server'
import { CustomerRow, ContactRow } from '@/types/database'

export interface ProspectRow {
  id: number
  name: string
  accountNumber: string | null
  lastServiceDate: string | null
  lastTechnician: string | null
  equipmentCount: number
  totalRevenue: number
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
}

export async function getCustomers(search?: string): Promise<CustomerRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from('customers')
    .select('*')
    .eq('active', true)
    .order('name')
    .limit(50)

  if (search) {
    query = query.or(`name.ilike.%${search}%,account_number.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function getProspects(): Promise<ProspectRow[]> {
  const supabase = await createClient()

  // Get inactive customers with their contacts
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*, contacts(*)')
    .eq('active', false)
    .order('name')

  if (error) throw error
  if (!customers || customers.length === 0) return []

  // For each inactive customer, get equipment count, last service, and revenue
  const customerIds = customers.map(c => c.id)

  // Get equipment counts
  const { data: equipmentData } = await supabase
    .from('equipment')
    .select('customer_id')
    .in('customer_id', customerIds)

  const equipmentCounts = new Map<number, number>()
  for (const e of equipmentData ?? []) {
    if (e.customer_id) {
      equipmentCounts.set(e.customer_id, (equipmentCounts.get(e.customer_id) ?? 0) + 1)
    }
  }

  // Get last service and total revenue from billed tickets
  const { data: ticketData } = await supabase
    .from('pm_tickets')
    .select('customer_id, completed_date, billing_amount, assigned_technician_id')
    .in('customer_id', customerIds)
    .eq('status', 'billed')
    .order('completed_date', { ascending: false })

  const lastService = new Map<number, string>()
  const totalRevenue = new Map<number, number>()
  const lastTechId = new Map<number, string>()

  for (const t of ticketData ?? []) {
    if (t.customer_id) {
      if (!lastService.has(t.customer_id) && t.completed_date) {
        lastService.set(t.customer_id, t.completed_date)
        if (t.assigned_technician_id) {
          lastTechId.set(t.customer_id, t.assigned_technician_id)
        }
      }
      totalRevenue.set(t.customer_id, (totalRevenue.get(t.customer_id) ?? 0) + (t.billing_amount ?? 0))
    }
  }

  // Get technician names
  const techIds = Array.from(new Set(lastTechId.values()))
  const techNames = new Map<string, string>()
  if (techIds.length > 0) {
    const { data: techs } = await supabase
      .from('users')
      .select('id, name')
      .in('id', techIds)
    for (const t of techs ?? []) {
      techNames.set(t.id, t.name)
    }
  }

  return customers.map(c => {
    const contacts = (c.contacts as unknown as any[]) ?? []
    const primaryContact = contacts.find((ct: any) => ct.is_primary) ?? contacts[0] ?? null
    return {
      id: c.id,
      name: c.name,
      accountNumber: c.account_number,
      lastServiceDate: lastService.get(c.id) ?? null,
      lastTechnician: lastTechId.has(c.id) ? (techNames.get(lastTechId.get(c.id)!) ?? null) : null,
      equipmentCount: equipmentCounts.get(c.id) ?? 0,
      totalRevenue: totalRevenue.get(c.id) ?? 0,
      contactName: primaryContact?.name ?? null,
      contactPhone: primaryContact?.phone ?? null,
      contactEmail: primaryContact?.email ?? null,
    }
  })
}

export async function getCustomer(
  id: number
): Promise<(CustomerRow & { contacts: ContactRow[] }) | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .select('*, contacts(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data as unknown as CustomerRow & { contacts: ContactRow[] }
}