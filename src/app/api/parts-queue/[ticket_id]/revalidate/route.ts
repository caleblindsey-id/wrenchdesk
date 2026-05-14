import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { getCurrentUser, MANAGER_ROLES } from '@/lib/auth'

type Source = 'pm' | 'service'

// Runs the existing validate-synergy-orders.py script in single-ticket mode
// (--ticket-id <id> --source <pm|service> --json). The script holds the
// Synergy ODBC connection; this route is the office's "re-check" button when
// the nightly run hasn't caught a same-day order or a typo correction.
//
// Local-only: the script needs DSN=ERPlinked, which is set up on the office
// workstation that runs the nightly cron. A remote Vercel deployment would
// not have Synergy reachable and this route would always fail with an ODBC
// connect error.
function runValidator(ticketId: string, source: Source): Promise<{
  status: number
  body: Record<string, unknown>
}> {
  return new Promise((resolve) => {
    const pythonExe = process.env.PYTHON_EXE || 'python'
    const scriptPath = path.join(
      process.cwd(),
      'scripts',
      'sync',
      'validate-synergy-orders.py'
    )

    const child = spawn(
      pythonExe,
      [scriptPath, '--ticket-id', ticketId, '--source', source, '--json'],
      {
        env: {
          ...process.env,
          // The script reads bare SUPABASE_URL but Next.js .env.local exposes
          // NEXT_PUBLIC_SUPABASE_URL — pass either through.
          SUPABASE_URL:
            process.env.SUPABASE_URL ||
            process.env.NEXT_PUBLIC_SUPABASE_URL ||
            '',
          SUPABASE_SERVICE_ROLE_KEY:
            process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        },
      }
    )

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    // 30s ceiling — the batch run completes in <10s; a stuck ODBC connection
    // is the only realistic way to exceed that.
    const killer = setTimeout(() => {
      child.kill('SIGKILL')
    }, 30_000)

    child.on('error', (err) => {
      clearTimeout(killer)
      resolve({
        status: 500,
        body: { error: 'Failed to start validator', detail: err.message },
      })
    })

    child.on('close', (code) => {
      clearTimeout(killer)
      if (code !== 0) {
        resolve({
          status: 500,
          body: {
            error: 'Validator exited non-zero',
            exit_code: code,
            stderr: stderr.slice(-2000),
          },
        })
        return
      }
      try {
        const parsed = JSON.parse(stdout.trim())
        resolve({ status: 200, body: parsed })
      } catch {
        resolve({
          status: 500,
          body: {
            error: 'Validator output was not JSON',
            stdout: stdout.slice(-2000),
            stderr: stderr.slice(-2000),
          },
        })
      }
    })
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticket_id: string }> }
) {
  const user = await getCurrentUser()
  if (!user?.role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!MANAGER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { ticket_id } = await params
  if (!ticket_id || !/^[0-9a-f-]{36}$/i.test(ticket_id)) {
    return NextResponse.json({ error: 'Invalid ticket_id' }, { status: 400 })
  }

  let body: { source?: string } = {}
  try {
    body = await request.json()
  } catch {
    // empty body fine — fall through to source check
  }
  const source = body.source as Source | undefined
  if (source !== 'pm' && source !== 'service') {
    return NextResponse.json(
      { error: "Body must include source: 'pm' or 'service'" },
      { status: 400 }
    )
  }

  const { status, body: payload } = await runValidator(ticket_id, source)
  return NextResponse.json(payload, { status })
}
