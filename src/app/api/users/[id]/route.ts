import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, ADMIN_ROLES } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { UserRole } from '@/types/database'

const ALLOWED_ROLES: readonly UserRole[] = ['super_admin', 'manager', 'coordinator', 'technician'] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.role || !ADMIN_ROLES.includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json() as {
      role?: UserRole
      active?: boolean
      hourly_cost?: number | null
    }

    const update: Record<string, unknown> = {}

    if (body.role !== undefined) {
      if (!ALLOWED_ROLES.includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
      }
      if (currentUser.id === id) {
        return NextResponse.json(
          { error: 'You cannot change your own role.' },
          { status: 400 }
        )
      }
      update.role = body.role
    }

    if (body.active !== undefined) {
      if (currentUser.id === id && body.active === false) {
        return NextResponse.json(
          { error: 'You cannot deactivate yourself.' },
          { status: 400 }
        )
      }
      update.active = body.active
    }

    if (body.hourly_cost !== undefined) {
      if (body.hourly_cost !== null && (typeof body.hourly_cost !== 'number' || body.hourly_cost < 0)) {
        return NextResponse.json({ error: 'Hourly cost must be a non-negative number.' }, { status: 400 })
      }
      update.hourly_cost = body.hourly_cost
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No updatable fields supplied.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: user, error } = await admin
      .from('users')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(user)
  } catch (err) {
    console.error('PATCH /api/users/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 })
  }
}
