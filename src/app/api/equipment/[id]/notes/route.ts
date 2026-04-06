import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getEquipmentNotes, createEquipmentNote } from '@/lib/db/notes'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user?.role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const notes = await getEquipmentNotes(id)
  return NextResponse.json(notes)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user?.role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const noteText = (body.noteText ?? '').trim()

  if (!noteText) {
    return NextResponse.json({ error: 'Note text is required' }, { status: 400 })
  }
  if (noteText.length > 2000) {
    return NextResponse.json({ error: 'Note text must be 2000 characters or less' }, { status: 400 })
  }

  const note = await createEquipmentNote(id, user.id, noteText)
  return NextResponse.json(note, { status: 201 })
}
