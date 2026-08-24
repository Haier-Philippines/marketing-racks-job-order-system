'use client'
// components/shared/ApproverLayout.tsx
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore, useNotifStore } from '@/stores'
import ApproverSidebar from './ApproverSidebar'
import { Bell, ChevronRight } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { ROLE_LABELS } from '@/types'
import Link from 'next/link'

const CRUMBS: Record<string, string> = {
  '/approver/dashboard':    'Dashboard',
  '/approver/for-approval': 'For My Approval',
  '/approver/all-requests': 'All Requests',
  '/approver/my-approvals': 'My Approvals',
  '/approver/reports':      'Reports',
  '/approver/profile':      'Profile',
  '/approver/notifications':'Notifications',
}

const APPROVER_ROLES = [
  'it_admin',
  'sales_director',
  'sellout',
  'pm',
  'marketing_manager',
  'marketing_director',
  'approver',
]

export default function ApproverLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const { count }         = useNotifStore()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (!APPROVER_ROLES.includes(user.role)) {
      router.replace('/employee/dashboard')
    }
  }, [user, loading, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 rounded-xl bg-brand-600 animate-pulse" />
    </div>
  )
  if (!user) return null

  const mainRoute = '/' + pathname.split('/').slice(1, 3).join('/')
  const crumb     = CRUMBS[mainRoute] ?? 'Approver Portal'

  return (
    <div>
      <ApproverSidebar />

      {/* Topbar */}
      <header className="layout-topbar">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400 text-xs">{ROLE_LABELS[user.role]}</span>
          <ChevronRight size={13} className="text-slate-300" />
          <span className="font-semibold text-slate-700">{crumb}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/approver/notifications" className="btn-icon relative">
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
              <p className="text-[10px] text-slate-400">{ROLE_LABELS[user.role]}</p>
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
