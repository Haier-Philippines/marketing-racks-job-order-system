'use client'
// components/shared/EmployeeLayout.tsx
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore, useNotifStore } from '@/stores'
import EmployeeSidebar from './EmployeeSidebar'
import { Bell, ChevronRight, Search } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import Link from 'next/link'

const CRUMBS: Record<string, string> = {
  '/employee/dashboard':      'Dashboard',
  '/employee/my-requests':    'My Requests',
  '/employee/create-request': 'Create Request',
  '/employee/inventory':      'Racks Inventory',
  '/employee/profile':        'Profile',
  '/employee/notifications':  'Notifications',
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const { count }         = useNotifStore()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    // Redirect admins to their own panel
    if (user.role === 'it_admin' || user.role === 'marketing_manager') {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 rounded-xl bg-brand-600 animate-pulse" />
    </div>
  )
  if (!user) return null

  const mainRoute = '/' + pathname.split('/').slice(1, 3).join('/')
  const crumb     = CRUMBS[mainRoute] ?? 'Employee Portal'

  return (
    <div>
      <EmployeeSidebar />

      {/* Topbar */}
      <header className="layout-topbar">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400 text-xs">Employee</span>
          <ChevronRight size={13} className="text-slate-300" />
          <span className="font-semibold text-slate-700">{crumb}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border text-xs text-slate-400"
            style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
            <Search size={13} />
            <span>Search…</span>
          </div>
          <Link href="/employee/notifications" className="btn-icon relative">
            <Bell size={16} />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="avatar text-[11px]" style={{ background: '#1a56db' }}>
              {getInitials(user.fullName)}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-slate-700">{user.fullName}</p>
              <p className="text-[10px] text-slate-400">{user.department}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="layout-main">
        <div className="page-content animate-fade-in">{children}</div>
      </main>
    </div>
  )
}
