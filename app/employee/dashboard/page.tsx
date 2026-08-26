'use client'
// app/employee/dashboard/page.tsx
import { useEffect, useState } from 'react'
import EmployeeLayout from '@/components/shared/EmployeeLayout'
import { StatusBadge } from '@/components/ui/index'
import { useAuthStore } from '@/stores'
import { requestService } from '@/services/requestService'
import { notificationService } from '@/services/notificationService'
import type { JobOrderRequest } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import {
  ClipboardList, Clock, Zap, CheckCircle, ArrowRight,
  Bell, Plus, Package, User, FileText,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import dayjs from 'dayjs'

export default function EmployeeDashboard() {
  const { user } = useAuthStore()
  const [myReqs, setMyReqs]       = useState<JobOrderRequest[]>([])
  const [loading, setLoading]     = useState(true)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [reqs, notifs] = await Promise.all([
        requestService.getByUser(user.uid),
        notificationService.getByUser(user.uid),
      ])
      setMyReqs(reqs)
      setNotifCount(notifs.filter(n => !n.read).length)
      setLoading(false)
    }
    load()
  }, [user])

  // const forApproval = myReqs.filter(r => r.status === 'For Approval').length
  // const inProgress  = myReqs.filter(r => r.status === 'In Progress').length
  // const completed   = myReqs.filter(r => r.status === 'Completed').length
  
  // Requests still going through the approval chain
const forApproval = myReqs.filter(r => r.status === 'For Approval').length

// Fully approved by all approvers, and the project itself is now underway
// (projectStatus has been set but hasn't reached "Completed" yet)
const inProgress = myReqs.filter(r =>
  r.status === 'Approved' && r.projectStatus && r.projectStatus !== 'Completed'
).length

// Source of truth for "done" is projectStatus === 'Completed', set by
// Marketing once the project itself is finished — not the approval status.
const completed = myReqs.filter(r => r.projectStatus === 'Completed').length

  const recent      = myReqs.slice(0, 5)

  // Monthly chart data
  const now = dayjs()
  const chartData = Array.from({ length: 10 }, (_, i) => {
    const m = now.subtract(9 - i, 'month')
    return {
      label: m.format('MMM'),
      count: myReqs.filter(r => {
        const d = dayjs(r.createdAt)
        return d.month() === m.month() && d.year() === m.year()
      }).length,
    }
  })

  const QUICK_LINKS = [
    { href: '/employee/create-request', icon: Plus,          label: 'Create Request', color: '#1a56db', bg: '#eff6ff' },
    { href: '/employee/my-requests',    icon: ClipboardList, label: 'My Requests',    color: '#059669', bg: '#f0fdf4' },
    { href: '/employee/inventory',      icon: Package,       label: 'Rack Inventory', color: '#7c3aed', bg: '#f5f3ff' },
    { href: '/employee/profile',        icon: User,          label: 'My Profile',     color: '#b45309', bg: '#fffbeb' },
  ]

  return (
    <EmployeeLayout>
      <div className="space-y-6 w-full px-6 md:px-8 lg:px-10">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 font-display">
              Welcome, {user?.fullName?.split(' ')[0]}! 👋
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Here&apos;s an overview of your job requests.</p>
          </div>
          <Link href="/employee/notifications" className="relative btn-icon w-9 h-9">
            <Bell size={17} />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {notifCount}
              </span>
            )}
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'My Requests',  value: myReqs.length, sub: 'View all requests',        icon: ClipboardList, color: '#3b82f6', href: '/employee/my-requests'                              },
            { label: 'For Approval', value: forApproval,   sub: 'Requests pending approval', icon: Clock,        color: '#f59e0b', href: '/employee/my-requests?status=For+Approval'          },
            { label: 'In Progress',  value: inProgress,    sub: 'Requests being processed',  icon: Zap,          color: '#8b5cf6', href: '/employee/my-requests?status=In+Progress'            },
            { label: 'Completed',    value: completed,     sub: 'Successfully completed',    icon: CheckCircle,  color: '#10b981', href: '/employee/my-requests?status=Completed'              },
          ].map(kpi => (
            <Link key={kpi.label} href={kpi.href} className="stat-card hover:-translate-y-0.5 transition-transform duration-150 group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">{kpi.label}</p>
                  <p className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>
                    {loading ? '—' : kpi.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
                </div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: kpi.color + '15', border: `1px solid ${kpi.color}25` }}>
                  <kpi.icon size={17} style={{ color: kpi.color }} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Chart + Recent */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* My Requests Overview Chart */}
          <div className="card-pad md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="sec-title">My Requests Overview</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {format(new Date(), 'MMMM')}: {myReqs.filter(r => dayjs(r.createdAt).month() === dayjs().month()).length} requests
                </p>
              </div>
            </div>
            {loading ? (
              <div className="h-44 skeleton rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={chartData} margin={{ top:5, right:10, left:-25, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, fontSize:12 }} formatter={(v:any) => [v,'Requests']} />
                  <Line type="monotone" dataKey="count" stroke="#1a56db" strokeWidth={2.5} dot={{ r:3, fill:'#1a56db' }} activeDot={{ r:5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent Requests */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">Recent Requests</p>
              <Link href="/employee/my-requests" className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1">
                View All <ArrowRight size={11} />
              </Link>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-10 rounded-lg"/>)}</div>
            ) : recent.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-slate-400">No requests yet</p>
                <Link href="/employee/create-request" className="btn-primary btn-sm mt-3 inline-flex items-center gap-1">
                  <Plus size={12} /> Create
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recent.map(r => (
                  <Link key={r.id} href={`/employee/my-requests/${r.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-brand-600 font-mono">{r.jobOrderNo}</p>
                      <p className="text-xs text-slate-600 truncate max-w-[130px]">{r.productCategory || r.branchLocation}</p>
                    </div>
                    <StatusBadge status={r.status} type="request" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Navigation */}
        <div>
          <p className="sec-title mb-3">Quick Navigation</p>
          <div className="grid grid-cols-4 gap-3">
            {QUICK_LINKS.map(link => (
              <Link key={link.href} href={link.href}
                className="card p-4 flex flex-col items-center gap-2.5 text-center hover:-translate-y-0.5 transition-all duration-150 hover:shadow-card-hover">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: link.bg }}>
                  <link.icon size={22} style={{ color: link.color }} />
                </div>
                <p className="text-xs font-semibold text-slate-700">{link.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </EmployeeLayout>
  )
}
