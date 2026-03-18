'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  Building2,
  FileText,
  Settings,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, route: '/' },
  { label: 'Tickets', icon: ClipboardList, route: '/tickets' },
  { label: 'Equipment', icon: Wrench, route: '/equipment' },
  { label: 'Customers', icon: Building2, route: '/customers' },
  { label: 'Billing', icon: FileText, route: '/billing' },
  { label: 'Settings', icon: Settings, route: '/settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-gray-900 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <Wrench className="h-5 w-5 text-gray-300" />
          <span className="text-base font-semibold text-white tracking-tight">
            PM Scheduler
          </span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.route === '/'
              ? pathname === '/'
              : pathname.startsWith(item.route)
          const Icon = item.icon

          return (
            <Link
              key={item.route}
              href={item.route}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
