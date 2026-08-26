'use client'
// components/shared/ApproverSidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore, useNotifStore } from '@/stores'
import { authService } from '@/services/authService'
import { cn, getInitials } from '@/lib/utils'
import { ROLE_LABELS } from '@/types'
import {
  LayoutDashboard, CheckSquare, ClipboardList, CheckCircle,
  BarChart3, User, LogOut, Bell, Package,
} from 'lucide-react'
import { toast } from 'sonner'

const BASE_NAV = [
  { href: '/approver/dashboard',     icon: LayoutDashboard, label: 'Dashboard'      },
  { href: '/approver/for-approval',  icon: CheckSquare,     label: 'My Approval'},
  { href: '/approver/all-requests',  icon: ClipboardList,   label: 'All Requests'   },
  // { href: '/approver/my-approvals',  icon: CheckCircle,     label: 'My Approvals'   },
  { href: '/approver/reports',       icon: BarChart3,       label: 'Reports'        },
  { href: '/approver/profile',       icon: User,            label: 'Profile'        },
]

export default function ApproverSidebar() {
  const pathname  = usePathname()
  const { user }  = useAuthStore()
  const { count } = useNotifStore()

  // Only Marketing Manager gets access to Racks Inventory management —
  // inserted right after "All Requests" to keep it near related content.
  const NAV = user?.role === 'marketing_manager'
    ? [
        ...BASE_NAV.slice(0, 3),
        { href: '/inventory', icon: Package, label: 'Racks Inventory' },
        ...BASE_NAV.slice(3),
      ]
    : BASE_NAV

  const handleLogout = async () => {
    await authService.logout()
    toast.success('Signed out')
    window.location.href = '/login'
  }

  return (
    <div className="layout-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
          H
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-none font-display">Haier</p>
          <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,.4)' }}>
            MARKETING RACKS
          </p>
          <p className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,.3)' }}>
            JOB ORDER REQUEST SYSTEM
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}
              className={cn('nav-item relative', active && 'active')}>
              <item.icon size={15} className="flex-shrink-0" />
              <span className="text-[13px] flex-1">{item.label}</span>
              {item.label === 'For My Approval' && count > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {user && (
        <div className="flex-shrink-0 border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5">
            <div className="avatar text-[11px] flex-shrink-0" style={{ background: '#1a56db' }}>
              {getInitials(user.fullName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user.fullName}</p>
              <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,.4)' }}>
                {ROLE_LABELS[user.role]}
              </p>
            </div>
            <button onClick={handleLogout}
              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              title="Sign out">
              <LogOut size={13} style={{ color: 'rgba(255,255,255,.5)' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
