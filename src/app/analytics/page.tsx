import { requireRole, MANAGER_ROLES } from '@/lib/auth'
import { getTeamAnalytics, stripCostFieldsForCoordinator } from '@/lib/db/analytics'
import AnalyticsOverview from './AnalyticsOverview'

export default async function AnalyticsPage() {
  const user = await requireRole(...MANAGER_ROLES)

  const today = new Date().toISOString().split('T')[0]
  const raw = await getTeamAnalytics('monthly', today)
  // Strip compensation-derived fields when the viewer is a coordinator —
  // mirrors the API route shaping so SSR data matches subsequent fetches.
  const data = stripCostFieldsForCoordinator(raw, user.role!)

  return <AnalyticsOverview initialData={data} />
}
