import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, ADMIN_ROLES } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/types/database'

const ALLOWED_ROLES: readonly UserRole[] = ['super_admin', 'manager', 'coordinator', 'technician'] as const

export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null
  const admin = createAdminClient()

  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.role || !ADMIN_ROLES.includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as { name?: string; email?: string; role?: UserRole }
    const { name, email, role } = body
    if (!name || !email || !role) {
      return NextResponse.json({ error: 'name, email, and role are required' }, { status: 400 })
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: 'ChangeMeNow1!',
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    createdAuthUserId = authData.user.id

    const supabase = await createClient()
    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        role,
        active: true,
        must_change_password: true,
      })
      .select()
      .single()

    if (insertError) {
      await admin.auth.admin.deleteUser(authData.user.id)
      createdAuthUserId = null
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(
      { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active },
      { status: 201 }
    )
  } catch (err) {
    if (createdAuthUserId) {
      try {
        await admin.auth.admin.deleteUser(createdAuthUserId)
      } catch (rollbackErr) {
        console.error('Failed to roll back auth user after error:', rollbackErr)
      }
    }
    console.error('POST /api/users error:', err)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
