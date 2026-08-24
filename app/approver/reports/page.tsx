'use client'
// app/approver/reports/page.tsx
import { useEffect, useState } from 'react'
import ApproverLayout from '@/components/shared/ApproverLayout'
import { CardSkeleton } from '@/components/ui/index'
import { approvalService } from '@/services/approvalService'
import { useAuthStore } from '@/stores'
import { formatDate, CHART_COLORS } from '@/lib/utils'
import { DEPARTMENTS } from '@/types'
import { Download, FileDown, RefreshCw, TrendingUp, CheckCircle, Zap, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import dayjs from 'dayjs'

const DATE_RANGES = ['This Month','Last Month','Last 3 Months','Last 6 Months','This Year']

export default function ApproverReportsPage() {
  const { user }           = useAuthStore()
  const [stats, setStats]  = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('This Month')
  const [dept, setDept]    = useState('All')
  const [exporting, setExporting] = useState(false)

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await approvalService.getDashboardStats(user.uid, user.role)
      setStats(data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [user])

  const PIE_COLORS: Record<string, string> = {
    'For Approval': '#f59e0b', 'In Progress': '#3b82f6',
    'Approved': '#10b981', 'Rejected': '#ef4444',
  }

  const completionRate = stats && stats.totalAll > 0
    ? Math.round((stats.completed / stats.totalAll) * 100) : 0

  const exportCSV = () => {
    if (!stats) return
    setExporting(true)
    try {
      const header = 'Month,Requests,Approved\n'
      const rows   = (stats.monthlyTrend || []).map((r: any) => `${r.label},${r.requests},${r.approved}`).join('\n')
      const blob   = new Blob([header + rows], { type: 'text/csv' })
      const url    = URL.createObjectURL(blob)
      const a      = document.createElement('a')
      a.href = url; a.download = `approver-report-${dayjs().format('YYYY-MM-DD')}.csv`; a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported!')
    } finally { setExporting(false) }
  }

  const exportPDF = async () => {
    if (!stats) return
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF()
      const m   = 14

      doc.setFontSize(16); doc.setFont('helvetica','bold')
      doc.text('Approver Report – Marketing Racks System', m, 18)
      doc.setFontSize(10); doc.setFont('helvetica','normal')
      doc.text(`Period: ${dateRange}  |  Generated: ${dayjs().format('MMMM D, YYYY')}`, m, 26)
      doc.text(`Approver: ${user?.fullName} (${user?.role})`, m, 32)
      doc.line(m, 36, 196, 36)

      // Summary
      doc.setFont('helvetica','bold'); doc.setFontSize(11)
      doc.text('Summary', m, 44)
      autoTable(doc, {
        startY: 47,
        head: [['Total Requests','Approved','In Progress','Rejected','Completion Rate']],
        body: [[stats.totalAll, stats.approvedThisMonth, stats.inProgress, stats.byStatus.find((s:any) => s.name==='Rejected')?.value ?? 0, `${completionRate}%`]],
        headStyles: { fillColor: [26,32,53] }, margin: { left:m },
      })

      const y = ((doc as any).lastAutoTable?.finalY ?? 57) + 8
      doc.setFont('helvetica','bold'); doc.setFontSize(11)
      doc.text('Monthly Trend', m, y)
      autoTable(doc, {
        startY: y + 4,
        head: [['Month','Total Requests','Approved']],
        body: (stats.monthlyTrend || []).map((r:any) => [r.label, r.requests, r.approved]),
        headStyles: { fillColor: [26,32,53] }, styles: { fontSize:9 }, margin: { left:m },
      })

      doc.save(`approver-report-${dayjs().format('YYYY-MM-DD')}.pdf`)
      toast.success('PDF exported!')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  return (
    <ApproverLayout>
      <div className="space-y-5 w-full px-6 md:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="text-sm text-slate-500 mt-0.5">Approval statistics and analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="btn-secondary p-2">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={exportCSV} disabled={exporting} className="btn-secondary flex items-center gap-2">
              <FileDown size={14} /> CSV
            </button>
            <button onClick={exportPDF} disabled={exporting} className="btn-primary flex items-center gap-2">
              <Download size={14} /> Export PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card-pad flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="field-label whitespace-nowrap">Date Range</span>
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="field-sm w-36">
              {DATE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="field-label">Department</span>
            <select value={dept} onChange={e => setDept(e.target.value)} className="field-sm w-36">
              <option value="All">All</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* KPIs */}
        {loading ? <CardSkeleton count={4} /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:'Total Requests',  value:stats?.totalAll ?? 0,           icon:TrendingUp,  color:'#3b82f6', sub:'+14% vs last month' },
              { label:'Approved',        value:stats?.approvedThisMonth ?? 0,   icon:CheckCircle, color:'#10b981', sub:'+20% vs last month' },
              { label:'In Progress',     value:stats?.inProgress ?? 0,          icon:Zap,         color:'#f59e0b', sub:'+8% vs last month'  },
              { label:'Rejected',        value:stats?.byStatus?.find((s:any)=>s.name==='Rejected')?.value ?? 0, icon:XCircle, color:'#ef4444', sub:'-50% vs last month' },
            ].map(kpi => (
              <div key={kpi.label} className="stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">{kpi.label}</p>
                    <p className="text-2xl font-bold font-display text-slate-800">{kpi.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: kpi.color + '15', border:`1px solid ${kpi.color}25` }}>
                    <kpi.icon size={17} style={{ color: kpi.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Charts */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Trend */}
          <div className="card-pad md:col-span-2">
            <p className="sec-title mb-4">Requests Trend</p>
            {loading || !stats ? (
              <div className="h-48 skeleton rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={stats.monthlyTrend} margin={{ top:5,right:10,left:-25,bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize:10,fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10,fill:'#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,fontSize:11 }} />
                  <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} dot={false} name="Requests" />
                  <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} strokeDasharray="4 2" dot={false} name="Approved" />
                  <Legend wrapperStyle={{ fontSize:11 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status Pie */}
          <div className="card-pad">
            <p className="sec-title mb-4">Requests by Status</p>
            {loading || !stats ? (
              <div className="h-48 skeleton rounded-xl" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={stats.byStatus.filter((s:any) => s.value > 0)}
                      cx="50%" cy="50%"
                      innerRadius={38} outerRadius={58}
                      dataKey="value" paddingAngle={3}>
                      {stats.byStatus.filter((s:any) => s.value > 0).map((entry:any, i:number) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? CHART_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize:11,borderRadius:8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {stats.byStatus.map((s:any) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[s.name] ?? '#94a3b8' }} />
                        <span className="text-slate-600">{s.name}</span>
                      </div>
                      <span className="font-semibold text-slate-700">{s.value} ({s.pct}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Completion rate */}
        {stats && (
          <div className="card-pad">
            <div className="flex items-center justify-between mb-3">
              <p className="sec-title">Completion Rate</p>
              <span className="text-2xl font-bold font-display" style={{ color: '#10b981' }}>{completionRate}%</span>
            </div>
            <div className="progress h-3 rounded-full">
              <div className="progress-fill rounded-full h-full" style={{ width:`${completionRate}%`, background:'#10b981' }} />
            </div>
            <p className="text-xs text-slate-400 mt-2">{stats.completed} of {stats.totalAll} requests completed</p>
          </div>
        )}
      </div>
    </ApproverLayout>
  )
}
