import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getCurrentUser, MANAGER_ROLES } from '@/lib/auth'

/**
 * Guard tag for `createAdminClient`.
 *
 * - `ADMIN_ONLY` — caller MUST already have validated that the current user is
 *   a manager/admin. The wrapper re-validates via `getCurrentUser()` + a
 *   manager-role check. Use this for routes that mutate restricted resources
 *   (users, sales reps, customers, equipment, manager-only writes).
 *
 * - `SERVER_ONLY` — caller is responsible for its own authorization (token
 *   gating, per-row ownership checks, anonymous webhook, etc.). The wrapper
 *   only enforces "not in the browser". Use this for token-gated endpoints,
 *   self-serve flows (change-password, feedback, ticket relocate with tech
 *   ownership), and anything that legitimately can't go through the
 *   manager-role gate.
 *
 * Both guards always enforce the server-side runtime check — a stray import
 * of this module from client code throws immediately instead of leaking a
 * service-role key into the bundle. `'server-only'` at the top of the file
 * is the build-time backstop; this is the runtime backstop.
 */
export type AdminClientGuard = 'ADMIN_ONLY' | 'SERVER_ONLY'

/**
 * Construct a Supabase client backed by the service-role key. Bypasses RLS;
 * use sparingly and only in routes that have already authorized the caller.
 *
 * Existing callers that pre-date the guard were migrated as part of the
 * r0-foundation round. New callers MUST pick the correct guard explicitly —
 * the parameter is required.
 *
 * Throws:
 *  - if called from a browser context (defense in depth on top of `server-only`).
 *  - if guard is `ADMIN_ONLY` and the current request has no authenticated
 *    user with a manager-or-above role.
 */
export async function createAdminClient(
  guard: AdminClientGuard
): Promise<SupabaseClient> {
  // Runtime SSR check — `server-only` catches this at build time for client
  // bundles, but a misimport from an isomorphic module would slip past.
  if (typeof window !== 'undefined') {
    throw new Error(
      'createAdminClient: called from a browser context. Service-role keys must never leave the server.'
    )
  }

  if (guard === 'ADMIN_ONLY') {
    const user = await getCurrentUser()
    if (!user?.role || !MANAGER_ROLES.includes(user.role)) {
      throw new Error(
        'createAdminClient(ADMIN_ONLY): caller is not a manager. Pre-validate the role in the route handler, then pass ADMIN_ONLY. If the route is intentionally accessible to non-managers, use SERVER_ONLY and gate authorization yourself.'
      )
    }
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
