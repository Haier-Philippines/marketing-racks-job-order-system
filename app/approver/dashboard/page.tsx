'use client'
// app/approver/dashboard/page.tsx
import { useEffect, useState } from 'react'
import ApproverLayout from '@/components/shared/ApproverLayout'
import { StatusBadge, CardSkeleton } from '@/components/ui/index'
import { approvalService } from '@/services/approvalService'
import { useAuthStore } from '@/stores'
import { formatDate, CHART_COLORS, cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/types'
import type { JobOrderRequest } from '@/types'
import { CheckSquare, CheckCircle, Zap, Trophy, ArrowRight, Bell } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { toast } from 'sonner'

const PIE_COLORS: Record<string, string> = {
  'For Approval': '#f59e0b',
  'In Progress':  '#3b82f6',
  'Approved':     '#10b981',
  'Rejected':     '#ef4444',
}

export default function ApproverDashboard() {
  const { user }           = useAuthStore()
  const [stats, setStats]  = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    console.log('[ApproverDashboard] load diagnostics:', {
      page: '/approver/dashboard',
      uid: user.uid,
      role: user.role,
      department: user.department,
    })

    approvalService.getDashboardStats(user.uid, user.role)
      .then(setStats)
      .catch((error: any) => {
        console.error('[ApproverDashboard] failed to load stats:', {
          code: error?.code,
          message: error?.message,
        })
        toast.error(error?.message ?? 'Failed to load dashboard data')
      })
      .finally(() => setLoading(false))
  }, [user])

  const kpis = stats ? [
    { label: 'For My Approval',     value: stats.forMyApproval,     sub:'Waiting for review',         icon: CheckSquare, color:'#f59e0b', href:'/approver/for-approval'  },
    { label: 'Approved',            value: stats.approvedThisMonth, sub:'This month',                 icon: CheckCircle, color:'#10b981', href:'/approver/my-approvals?tab=Approved' },
    { label: 'In Progress',         value: stats.inProgress,        sub:'Currently being processed',  icon: Zap,         color:'#3b82f6', href:'/approver/all-requests'   },
    { label: 'Completed',           value: stats.completed,         sub:'This month',                 icon: Trophy,      color:'#8b5cf6', href:'/approver/all-requests'   },
  ] : []

  return (
    <ApproverLayout>
      <div className="space-y-6 w-full px-6 md:px-8 lg:px-10">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 font-display">
              Welcome, {user?.fullName?.split(' ')[0]}! 👋
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Here&apos;s an overview of requests that need your action.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: 'var(--brand-light, #eff6ff)', color: '#1a56db' }}>
              {user ? ROLE_LABELS[user.role] : ''}
            </span>
          </div>
        </div>

        {/* KPIs */}
        {loading ? <CardSkeleton count={4} /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.map(kpi => (
              <Link key={kpi.label} href={kpi.href}
                className="stat-card hover:-translate-y-0.5 transition-transform duration-150 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">{kpi.label}</p>
                    <p className="text-2xl font-bold font-display" style={{ color:'var(--text)' }}>{kpi.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: kpi.color + '15', border:`1px solid ${kpi.color}25` }}>
                    <kpi.icon size={17} style={{ color: kpi.color }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Charts row */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Status donut */}
          <div className="card-pad">
            <p className="sec-title mb-4">Requests by Status</p>
            {loading || !stats ? (
              <div className="h-48 skeleton rounded-xl" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={stats.byStatus.filter((s: any) => s.value > 0)}
                      cx="50%" cy="50%"
                      innerRadius={40} outerRadius={62}
                      dataKey="value" paddingAngle={3}
                      label={({ cx, cy, value }) => (
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                          style={{ fontSize:18, fontWeight:700, fill:'#0f172a' }}>{stats.totalAll}</text>
                      )}
                      labelLine={false}>
                      {stats.byStatus.filter((s: any) => s.value > 0).map((entry: any, i: number) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? CHART_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={(v: any, n: any) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {stats.byStatus.map((s: any) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[s.name] ?? '#94a3b8' }} />
                        <span className="text-slate-600">{s.name}</span>
                      </div>
                      <span className="font-semibold text-slate-700 tabular-nums">{s.value} ({s.pct}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Monthly Trend */}
          <div className="card-pad md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <p className="sec-title">Monthly Approval Trend</p>
            </div>
            {loading || !stats ? (
              <div className="h-44 skeleton rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={stats.monthlyTrend} margin={{ top:5,right:10,left:-25,bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,fontSize:11 }} />
                  <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} dot={false} name="Requests" />
                  <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} strokeDasharray="4 2" dot={false} name="Approved" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Requests */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <p className="sec-title text-sm">Recent Requests</p>
            <Link href="/approver/all-requests" className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">{[1,2,3,4,5].map(i=><div key={i} className="skeleton h-10 rounded-lg"/>)}</div>
          ) : !stats?.recentRequests.length ? (
            <div className="py-10 text-center text-sm text-slate-400">No requests yet</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request No.</th><th>Title</th><th>Department</th>
                  <th>Requested By</th><th>Date</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRequests.map((req: JobOrderRequest) => (
                  <tr key={req.id}>
                    <td>
                      <Link href={`/approver/for-approval/${req.id}`}
                        className="font-bold text-xs text-brand-600 hover:underline font-mono">
                        {req.jobOrderNo}
                      </Link>
                    </td>
                    <td>
                      <p className="text-sm font-medium text-slate-700 max-w-[180px] truncate">{req.productCategory || '—'}</p>
                    </td>
                    <td className="text-xs text-slate-500">{req.department}</td>
                    <td className="text-xs text-slate-600">{req.requestor}</td>
                    <td className="text-xs text-slate-500">{formatDate(req.createdAt)}</td>
                    <td><StatusBadge status={req.status} type="request" /></td>
                    <td>
                      {req.status === 'For Approval' ? (
                        <Link href={`/approver/for-approval/${req.id}`}
                          className="btn-primary btn-sm">Review</Link>
                      ) : (
                        <Link href={`/approver/all-requests`}
                          className="btn-secondary btn-sm">View</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ApproverLayout>
  )
}
