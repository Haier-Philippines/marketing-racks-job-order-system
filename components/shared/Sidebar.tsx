'use client'
// components/shared/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore, useNotifStore } from '@/stores'
import { authService } from '@/services/authService'
import { cn, getInitials } from '@/lib/utils'
import { ROLE_LABELS } from '@/types'
import {
  LayoutDashboard, ClipboardList, Package, Wrench, CheckSquare,
  UserCog, Users, Shield, BarChart3, Settings, LogOut, Bell,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'

const NAV_ITEMS = [
  { href: '/dashboard',           icon: LayoutDashboard, label: 'Dashboard'                },
  { href: '/job-orders',          icon: ClipboardList,   label: 'Job Order Requests'       },
  { href: '/inventory',           icon: Package,         label: 'Racks Inventory'          },
  { href: '/installations',       icon: Wrench,          label: 'Installations'            },
  { href: '/approvals',           icon: CheckSquare,     label: 'Approvals'                },
  { href: '/approver-assignment', icon: UserCog,         label: 'Approver Assignment'      },
  { href: '/users',               icon: Users,           label: 'Users'                    },
  { href: '/roles',               icon: Shield,          label: 'Roles & Permissions'      },
  { href: '/reports',             icon: BarChart3,       label: 'Reports'                  },
  { href: '/notifications',       icon: Bell,            label: 'Notifications', badge: true },
  { href: '/settings',            icon: Settings,        label: 'Settings'                 },
]

export default function Sidebar() {
  const pathname    = usePathname()
  const { user }   = useAuthStore()
  const { count }  = useNotifStore()

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
          <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color:'rgba(255,255,255,.4)' }}>
            MARKETING RACKS
          </p>
          <p className="text-[9px] uppercase tracking-widest" style={{ color:'rgba(255,255,255,.3)' }}>
            JOB ORDER REQUEST SYSTEM
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className={cn('nav-item relative', active && 'active')}>
              <item.icon size={15} className="flex-shrink-0" />
              <span className="text-[13px] flex-1">{item.label}</span>
              {item.badge && count > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="flex-shrink-0 border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5">
            <div className="avatar flex-shrink-0 text-[11px]" style={{ background:'#1a56db' }}>
              {getInitials(user.fullName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user.fullName}</p>
              <p className="text-[10px] truncate" style={{ color:'rgba(255,255,255,.4)' }}>
                {ROLE_LABELS[user.role]}
              </p>
            </div>
            <button onClick={handleLogout}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
              title="Sign out">
              <LogOut size={13} style={{ color:'rgba(255,255,255,.5)' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
