'use client'
// components/shared/AppLayout.tsx
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore, useNotifStore } from '@/stores'
import Sidebar from './Sidebar'
import { Bell, ChevronRight } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import type { UserRole } from '@/types'
import Link from 'next/link'

const BREADCRUMBS: Record<string, string> = {
  '/dashboard':           'Dashboard',
  '/job-orders':          'Job Order Requests',
  '/inventory':           'Racks Inventory',
  '/installations':       'Installations',
  '/approvals':           'Approvals',
  '/approver-assignment': 'Approver Assignment',
  '/users':               'Users Management',
  '/roles':               'User Roles & Permissions',
  '/reports':             'Reports',
  '/settings':            'System Settings',
  '/notifications':       'Notifications',
  '/request-details':     'Request Details',
  '/admin':               'System Administration',
}

interface AppLayoutProps {
  children:      React.ReactNode
  allowedRoles?: UserRole[]
}

export default function AppLayout({ children, allowedRoles }: AppLayoutProps) {
  const { user, loading } = useAuthStore()
  const { count }         = useNotifStore()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (allowedRoles && !allowedRoles.includes(user.role)) router.replace('/dashboard')
  }, [user, loading, allowedRoles, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-600 animate-pulse" />
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    </div>
  )
  if (!user) return null

  const mainRoute  = '/' + pathname.split('/')[1]
  const breadcrumb = BREADCRUMBS[mainRoute] ?? 'IT Admin'

  return (
    <div>
      <Sidebar />

      {/* Topbar */}
      <header className="layout-topbar">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400 text-xs">IT Admin</span>
          <ChevronRight size={13} className="text-slate-300" />
          <span className="font-semibold text-slate-700">{breadcrumb}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/notifications" className="btn-icon relative">
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
