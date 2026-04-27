import { requireRole, MANAGER_ROLES } from '@/lib/auth'
import { CreateServiceTicketForm } from './CreateServiceTicketForm'

export default async function NewServiceTicketPage() {
  await requireRole(...MANAGER_ROLES)
  return <CreateServiceTicketForm />
}
