'use client'
// components/shared/EmployeeSidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore, useNotifStore } from '@/stores'
import { authService } from '@/services/authService'
import { cn, getInitials } from '@/lib/utils'
import { LayoutDashboard, ClipboardList, Plus, Package, User, LogOut, Bell } from 'lucide-react'
import { toast } from 'sonner'

const NAV = [
  { href: '/employee/dashboard',   icon: LayoutDashboard, label: 'Dashboard'      },
  { href: '/employee/my-requests', icon: ClipboardList,   label: 'My Requests'    },
  { href: '/employee/create-request', icon: Plus,         label: 'Create Request' },
  { href: '/employee/inventory',   icon: Package,         label: 'Racks Inventory'},
  { href: '/employee/profile',     icon: User,            label: 'Profile'        },
]

export default function EmployeeSidebar() {
  const pathname  = usePathname()
  const { user }  = useAuthStore()
  const { count } = useNotifStore()

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
              {item.label === 'Dashboard' && count > 0 && (
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
                {user.department}
              </p>
            </div>
            <button onClick={handleLogout} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors" title="Sign out">
              <LogOut size={13} style={{ color: 'rgba(255,255,255,.5)' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
