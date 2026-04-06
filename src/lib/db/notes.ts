import { createClient } from '@/lib/supabase/server'
import { EquipmentNoteRow } from '@/types/database'

export type EquipmentNoteWithAuthor = EquipmentNoteRow & {
  users: { name: string } | null
}

export async function getEquipmentNotes(
  equipmentId: string
): Promise<EquipmentNoteWithAuthor[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('equipment_notes')
    .select('*, users(name)')
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as EquipmentNoteWithAuthor[]
}

export async function createEquipmentNote(
  equipmentId: string,
  userId: string,
  noteText: string
): Promise<EquipmentNoteRow> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('equipment_notes')
    .insert({ equipment_id: equipmentId, user_id: userId, note_text: noteText })
    .select()
    .single()

  if (error) throw error
  return data as EquipmentNoteRow
}
