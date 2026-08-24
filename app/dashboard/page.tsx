'use client'
// app/dashboard/page.tsx
import { useEffect, useState } from 'react'
import AppLayout from '@/components/shared/AppLayout'
import { StatCard, CardSkeleton, StatusBadge } from '@/components/ui/index'
import { requestService } from '@/services/requestService'
import { useDashboardStore, useAuthStore } from '@/stores'
import type { DashboardStats, JobOrderRequest } from '@/types'
import { cn, formatDate, truncate, CHART_COLORS } from '@/lib/utils'
import { RefreshCw, FileText, Clock, Zap, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { format } from 'date-fns'

const PIE_COLORS: Record<string, string> = {
  'For Approval': '#f59e0b',
  'In Progress':  '#3b82f6',
  'Completed':    '#10b981',
  'Rejected':     '#ef4444',
  'Cancelled':    '#94a3b8',
}

export default function DashboardPage() {
  const { stats, setStats, loading, setLoading } = useDashboardStore()
  const { user } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await requestService.getDashboardStats()
      setStats(data as any)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const kpis = stats ? [
    { label: 'Total Requests',  value: stats.totalRequests, sub: `+${stats.totalLastMonth ?? 0}% vs last month`,   subPositive: true,  icon: <FileText size={18} />,   color: '#3b82f6' },
    { label: 'For Approval',    value: stats.forApproval,  sub: `+${stats.approvalLastMonth ?? 0}% vs last month`, subPositive: false, icon: <Clock size={18} />,       color: '#f59e0b' },
    { label: 'In Progress',     value: stats.inProgress,   sub: `+${stats.progressLastMonth ?? 0}% vs last month`, subPositive: true,  icon: <Zap size={18} />,         color: '#8b5cf6' },
    { label: 'Completed',       value: stats.completed,    sub: `+${stats.completedLastMonth ?? 0}% vs last month`,subPositive: true,  icon: <CheckCircle size={18} />, color: '#10b981' },
  ] : []

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {format(new Date(), 'MMMM d, yyyy')} · Welcome back, {user?.fullName}
            </p>
          </div>
          <button onClick={refresh} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* KPI Cards */}
        {loading && !stats ? (
          <CardSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.map(kpi => (
              <StatCard key={kpi.label} {...kpi} />
            ))}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Monthly Trend */}
          <div className="card-pad md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <p className="sec-title">Requests Overview (This Month)</p>
            </div>
            {!stats ? (
              <div className="h-48 skeleton rounded-xl" />
            ) : stats.monthlyTrend.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-slate-400">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={stats.monthlyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any) => [v, 'Requests']} />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status Pie */}
          <div className="card-pad">
            <p className="sec-title mb-4">Requests by Status</p>
            {!stats ? (
              <div className="h-48 skeleton rounded-xl" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={stats.byStatus.filter(s => s.count > 0)}
                      cx="50%" cy="50%"
                      innerRadius={38} outerRadius={58}
                      dataKey="count" paddingAngle={3}
                    >
                      {stats.byStatus.filter(s => s.count > 0).map((entry, i) => (
                        <Cell key={entry.status} fill={PIE_COLORS[entry.status] ?? CHART_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="space-y-1.5 mt-2">
                  {stats.byStatus.filter(s => s.count > 0).map(s => (
                    <div key={s.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[s.status] ?? '#94a3b8' }} />
                        <span className="text-slate-600">{s.status}</span>
                      </div>
                      <span className="font-semibold text-slate-700 tabular-nums">{s.count} ({s.pct}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Recent Requests */}
          <div className="card md:col-span-2 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <p className="sec-title text-sm">Recent Requests</p>
              <Link href="/job-orders" className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {!stats ? (
              <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded" />)}</div>
            ) : stats.recentRequests.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">No requests yet</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>JO Number</th><th>Product Category</th><th>Requestor</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentRequests.map(req => (
                    <tr key={req.id}>
                      <td>
                        <Link href={`/request-details/${req.id}`} className="font-semibold text-xs text-brand-600 hover:underline">
                          {req.jobOrderNo}
                        </Link>
                      </td>
                      <td>
                        <p className="text-sm font-medium text-slate-700 max-w-[200px] truncate">{req.productCategory || '—'}</p>
                        <p className="text-[11px] text-slate-400">{req.branchLocation}</p>
                      </td>
                      <td className="text-xs text-slate-500">{req.requestor}</td>
                      <td><StatusBadge status={req.status} type="request" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Requests by Department */}
          <div className="card-pad">
            <p className="sec-title mb-4">Requests by Department</p>
            {!stats ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-8 rounded" />)}</div>
            ) : stats.byDepartment.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No data</p>
            ) : (
              <div className="space-y-3">
                {stats.byDepartment.slice(0, 6).map((dept, i) => {
                  const max = stats.byDepartment[0]?.count ?? 1
                  const pct = Math.round((dept.count / max) * 100)
                  const colors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f97316']
                  return (
                    <div key={dept.dept}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-600">{dept.dept}</span>
                        <span className="text-xs font-bold text-slate-700">{dept.count}</span>
                      </div>
                      <div className="progress">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
