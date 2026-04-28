import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, MANAGER_ROLES } from '@/lib/auth'
import { getTechnicianTargets, setTechnicianTarget } from '@/lib/db/analytics'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_METRICS = ['tickets_completed', 'revenue', 'avg_completion_days', 'revenue_per_hour']
const VALID_PERIODS = ['weekly', 'monthly']

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.role || !MANAGER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const techId = request.nextUrl.searchParams.get('technicianId') ?? undefined
    // technicianId is interpolated into a PostgREST .or() filter inside
    // getTechnicianTargets — validate as a real UUID before forwarding.
    if (techId && !UUID_RE.test(techId)) {
      return NextResponse.json({ error: 'Invalid technicianId' }, { status: 400 })
    }
    const data = await getTechnicianTargets(techId)
    return NextResponse.json(data)
  } catch (err) {
    console.error('analytics targets GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch targets' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.role || !MANAGER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { technicianId, metric, value, periodType } = await request.json() as {
      technicianId: string | null
      metric: string
      value: unknown
      periodType: string
    }

    if (!VALID_METRICS.includes(metric)) {
      return NextResponse.json({ error: 'Invalid metric' }, { status: 400 })
    }
    if (!VALID_PERIODS.includes(periodType)) {
      return NextResponse.json({ error: 'Invalid period type' }, { status: 400 })
    }
    if (technicianId !== null && (typeof technicianId !== 'string' || !UUID_RE.test(technicianId))) {
      return NextResponse.json({ error: 'Invalid technicianId' }, { status: 400 })
    }
    // Numeric guard — TS cast is runtime-noop, so NaN/Infinity/string can
    // otherwise reach setTechnicianTarget and corrupt downstream % calcs.
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000) {
      return NextResponse.json(
        { error: 'value must be a finite non-negative number ≤ 1,000,000' },
        { status: 400 }
      )
    }

    await setTechnicianTarget(technicianId, metric, value, periodType)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('analytics targets PUT error:', err)
    return NextResponse.json({ error: 'Failed to set target' }, { status: 500 })
  }
}
