'use client'
// app/admin/page.tsx
import { useEffect, useState } from 'react'
import AppLayout from '@/components/shared/AppLayout'
import { reportService } from '@/services/reportService'
import { userService } from '@/services/index'
import { StatCard, CardSkeleton } from '@/components/ui/index'
import { ROLE_LABELS } from '@/types'
import type { AppUser } from '@/types'
import { Users, Package, ClipboardList, CheckCircle, Shield, RefreshCw, Pencil, Trash2, Plus } from 'lucide-react'
import { formatDate, getInitials, cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

export default function AdminPage() {
  const [stats, setStats]     = useState<any | null>(null)
  const [invStats, setInvStats] = useState<any | null>(null)
  const [userStats, setUserStats] = useState<any | null>(null)
  const [recentUsers, setRecentUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [summary, inv, usrSummary, allUsers] = await Promise.all([
        reportService.generateSummary({ dateRange: 'this_month' }),
        reportService.getInventorySummary(),
        reportService.getUserSummary(),
        userService.getAll(),
      ])
      setStats(summary)
      setInvStats(inv)
      setUserStats(usrSummary)
      setRecentUsers(allUsers.slice(0, 8))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const roleColors: Record<string, string> = {
    it_admin:          'bg-red-50 text-red-700',
    marketing_manager: 'bg-purple-50 text-purple-700',
    marketing_staff:   'bg-blue-50 text-blue-700',
    pm:                'bg-amber-50 text-amber-700',
    sales_director:    'bg-green-50 text-green-700',
    approver:          'bg-cyan-50 text-cyan-700',
    technician:        'bg-orange-50 text-orange-700',
    viewer:            'bg-slate-50 text-slate-600',
  }

  return (
    <AppLayout allowedRoles={['it_admin']}>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">System Administration</h1>
            <p className="text-sm text-slate-500 mt-0.5">System health, users, and platform overview</p>
          </div>
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Top KPIs */}
        {loading ? <CardSkeleton count={4} /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Requests (Month)" value={stats?.total ?? 0}       icon={<ClipboardList size={18}/>} color="#3b82f6"
              sub={`${stats?.byStatus?.find((s:any)=>s.status==='Completed')?.count??0} completed`} subPositive={true} />
            <StatCard label="Total Users"             value={userStats?.total ?? 0}   icon={<Users size={18}/>}        color="#8b5cf6"
              sub={`${userStats?.active??0} active`} subPositive={true} />
            <StatCard label="Rack Inventory"          value={invStats?.total ?? 0}    icon={<Package size={18}/>}      color="#10b981"
              sub={`${invStats?.available??0} available`} subPositive={true} />
            <StatCard label="Completion Rate"         value={`${stats?.completionRate??0}%`} icon={<CheckCircle size={18}/>} color="#f59e0b"
              sub={`Avg ${stats?.avgApprovalDays??0} days approval`} subPositive={true} />
          </div>
        )}

        {/* System modules quick access */}
        <div>
          <h2 className="sec-title mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href:'/job-orders',         icon:ClipboardList, label:'Job Orders',      desc:'Manage all requests',          color:'#3b82f6', bg:'#eff6ff' },
              { href:'/users',              icon:Users,         label:'User Management', desc:'Add, edit, manage users',      color:'#8b5cf6', bg:'#f5f3ff' },
              { href:'/inventory',          icon:Package,       label:'Rack Inventory',  desc:'Track all rack assets',        color:'#10b981', bg:'#f0fdf4' },
              { href:'/approver-assignment',icon:Shield,        label:'Approver Config', desc:'Set approval hierarchy',       color:'#f59e0b', bg:'#fffbeb' },
              { href:'/installations',      icon:CheckCircle,   label:'Installations',   desc:'Manage technician schedules',  color:'#0891b2', bg:'#ecfeff' },
              { href:'/reports',            icon:ClipboardList, label:'Reports',         desc:'Export analytics & PDF',       color:'#6366f1', bg:'#eef2ff' },
              { href:'/settings',           icon:RefreshCw,     label:'System Settings', desc:'Configure system behaviour',   color:'#64748b', bg:'#f8fafc' },
              { href:'/users/new',          icon:Plus,          label:'Add User',        desc:'Create a new system user',     color:'#22c55e', bg:'#f0fdf4' },
            ].map(m => (
              <Link key={m.href} href={m.href}
                className="card p-4 flex flex-col gap-2 hover:-translate-y-0.5 transition-all duration-150 hover:shadow-card-hover">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: m.bg }}>
                  <m.icon size={18} style={{ color: m.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{m.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{m.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Request breakdown + User breakdown */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Status breakdown */}
          <div className="card-pad space-y-3">
            <div className="flex items-center justify-between">
              <p className="sec-title">Request Status (This Month)</p>
              <Link href="/reports" className="text-xs font-semibold text-brand-600 hover:underline">Full Report →</Link>
            </div>
            {loading ? <div className="space-y-2">{[1,2,3,4].map(i=><div key={i} className="skeleton h-8 rounded-lg"/>)}</div> : (
              <div className="space-y-2.5">
                {(stats?.byStatus ?? []).filter((s:any)=>s.count>0).map((s:any) => {
                  const colors: Record<string,string> = { 'For Approval':'#f59e0b','In Progress':'#3b82f6','Completed':'#10b981','Rejected':'#ef4444','Cancelled':'#94a3b8','Returned':'#f97316' }
                  const max = Math.max(...(stats?.byStatus??[]).map((x:any)=>x.count), 1)
                  return (
                    <div key={s.status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-600">{s.status}</span>
                        <span className="text-xs font-bold text-slate-700">{s.count} ({s.pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width:`${Math.round(s.count/max*100)}%`, background: colors[s.status]??'#94a3b8' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Inventory summary */}
          <div className="card-pad space-y-3">
            <div className="flex items-center justify-between">
              <p className="sec-title">Inventory Summary</p>
              <Link href="/inventory" className="text-xs font-semibold text-brand-600 hover:underline">View All →</Link>
            </div>
            {loading ? <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="skeleton h-8 rounded-lg"/>)}</div> : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:'Total Racks',  value:invStats?.total??0,       color:'text-slate-700' },
                  { label:'Available',    value:invStats?.available??0,    color:'text-green-600' },
                  { label:'In Use',       value:invStats?.inUse??0,        color:'text-blue-600'  },
                  { label:'Maintenance',  value:invStats?.maintenance??0,  color:'text-amber-600' },
                  { label:'Damaged',      value:invStats?.damaged??0,      color:'text-red-600'   },
                  { label:'Condition Good',value:invStats?.good??0,        color:'text-green-600' },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
                    <p className={cn('text-xl font-bold font-display mt-0.5', s.color)}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <p className="sec-title text-sm">Recent Users</p>
            <div className="flex items-center gap-2">
              <Link href="/users/new" className="btn-primary btn-sm flex items-center gap-1">
                <Plus size={12} /> Add User
              </Link>
              <Link href="/users" className="text-xs font-semibold text-brand-600 hover:underline">View All →</Link>
            </div>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-10 rounded"/>)}</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {recentUsers.map(u => (
                  <tr key={u.uid}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                          {getInitials(u.fullName)}
                        </div>
                        <p className="font-medium text-sm text-slate-800">{u.fullName}</p>
                      </div>
                    </td>
                    <td className="text-xs text-slate-500">{u.email}</td>
                    <td>
                      <span className={cn('status-badge text-[10px]', roleColors[u.role] ?? 'bg-slate-50 text-slate-600')}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="text-sm text-slate-600">{u.department}</td>
                    <td>
                      <span className={cn('status-badge text-[10px]', u.status==='Active' ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-500')}>
                        {u.status}
                      </span>
                    </td>
                    <td className="text-xs text-slate-400">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
