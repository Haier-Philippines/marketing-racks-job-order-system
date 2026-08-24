'use client'
// app/reports/page.tsx  – IT Admin Reports
import { useEffect, useState } from 'react'
import AppLayout from '@/components/shared/AppLayout'
import { PageHeader, StatCard, CardSkeleton } from '@/components/ui/index'
import { reportService, type ReportFilters } from '@/services/reportService'
import { DEPARTMENTS } from '@/types'
import { CHART_COLORS, formatDate } from '@/lib/utils'
import { generateJobOrderPDF } from '@/lib/pdf'
import { Download, FileDown, RefreshCw, CheckCircle, Zap, XCircle, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { cn } from '@/lib/utils'
import { CHART_COLOR_MAP } from '@/constants'

const DATE_RANGES = [
  { value:'this_month',  label:'This Month'    },
  { value:'last_month',  label:'Last Month'    },
  { value:'last_3',      label:'Last 3 Months' },
  { value:'last_6',      label:'Last 6 Months' },
  { value:'this_year',   label:'This Year'     },
  { value:'all',         label:'All Time'      },
]

export default function AdminReportsPage() {
  const [summary, setSummary]   = useState<any | null>(null)
  const [loading, setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)
  const [filters, setFilters]   = useState<ReportFilters>({ dateRange: 'this_month' })

  const load = async () => {
    setLoading(true)
    try { setSummary(await reportService.generateSummary(filters)) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [JSON.stringify(filters)])

  const SF = (k: keyof ReportFilters) => (e: any) =>
    setFilters(p => ({ ...p, [k]: e.target.value || undefined }))

  const exportCSV = () => {
    if (!summary) return
    setExporting(true)
    try {
      const header = 'JO Number,Requestor,Product Category,Dealer,Branch/Store,Department,Status,Date Created\n'
      const rows   = summary.reqs.map((r: any) =>
        `${r.jobOrderNo},"${r.requestor}","${r.productCategory ?? ''}","${r.dealer ?? ''}","${r.branchLocation}",${r.department},${r.status},${formatDate(r.createdAt)}`
      ).join('\n')
      const blob = new Blob([header + rows], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `report-${dayjs().format('YYYY-MM-DD')}.csv`; a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported!')
    } finally { setExporting(false) }
  }

  const exportPDF = async () => {
    if (!summary) return
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF()
      const m   = 14

      doc.setFontSize(16); doc.setFont('helvetica','bold')
      doc.text('Marketing Racks – System Report', m, 18)
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
      doc.text(`Period: ${DATE_RANGES.find(d=>d.value===filters.dateRange)?.label ?? 'All Time'}  |  Generated: ${dayjs().format('MMMM D, YYYY h:mm A')}`, m, 25)
      if (filters.department) doc.text(`Department: ${filters.department}`, m, 30)
      doc.line(m, 33, 196, 33)

      // Summary
      doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(0,0,0)
      doc.text('Summary', m, 40)
      autoTable(doc, {
        startY: 43,
        head: [['Total','Completed','In Progress','Rejected','Completion Rate','Avg Approval Days']],
        body: [[
          summary.total,
          summary.byStatus.find((s:any)=>s.status==='Completed')?.count ?? 0,
          summary.byStatus.find((s:any)=>s.status==='In Progress')?.count ?? 0,
          summary.byStatus.find((s:any)=>s.status==='Rejected')?.count ?? 0,
          `${summary.completionRate}%`,
          `${summary.avgApprovalDays} days`,
        ]],
        headStyles: { fillColor:[26,32,53] }, margin: { left:m },
      })

      let y = ((doc as any).lastAutoTable?.finalY ?? 52) + 8

      // Monthly trend
      doc.setFontSize(11); doc.setFont('helvetica','bold')
      doc.text('Monthly Trend', m, y)
      autoTable(doc, {
        startY: y + 4,
        head: [['Month','Total','Completed','In Progress','Rejected']],
        body: summary.monthlyTrend.map((r:any) => [r.month, r.total, r.completed, r.inProgress, r.rejected]),
        headStyles: { fillColor:[26,32,53] }, styles: { fontSize:8 }, margin: { left:m },
      })

      y = ((doc as any).lastAutoTable?.finalY ?? y + 40) + 8

      // By department
      doc.setFontSize(11); doc.setFont('helvetica','bold')
      doc.text('Requests by Department', m, y)
      autoTable(doc, {
        startY: y + 4,
        head: [['Department','Count','% of Total']],
        body: summary.byDepartment.map((d:any) => [d.dept, d.count, `${d.pct}%`]),
        headStyles: { fillColor:[26,32,53] }, styles: { fontSize:8 }, margin: { left:m },
      })

      doc.save(`system-report-${dayjs().format('YYYY-MM-DD')}.pdf`)
      toast.success('PDF exported!')
    } catch { toast.error('PDF export failed') }
    finally { setExporting(false) }
  }

  return (
    <AppLayout>
      <div className="space-y-5 max-w-6xl">
        <PageHeader
          title="Reports & Analytics"
          subtitle="System-wide procurement analytics and exportable reports"
          actions={
            <>
              <button onClick={load} className="btn-secondary p-2"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button>
              <button onClick={exportCSV} disabled={exporting || loading} className="btn-secondary flex items-center gap-2">
                <FileDown size={14} /> Export CSV
              </button>
              <button onClick={exportPDF} disabled={exporting || loading} className="btn-primary flex items-center gap-2">
                <Download size={14} /> Export PDF
              </button>
            </>
          }
        />

        {/* Filters */}
        <div className="card-pad flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="field-label whitespace-nowrap">Date Range</label>
            <select value={filters.dateRange ?? 'this_month'} onChange={SF('dateRange')} className="field-sm w-36">
              {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="field-label">Department</label>
            <select value={filters.department ?? ''} onChange={SF('department')} className="field-sm w-36">
              <option value="">All</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="field-label">Product Category</label>
            <input type="text" value={filters.requestType ?? ''} onChange={SF('requestType')} placeholder="e.g. Rack"
              className="field-sm w-36" />
          </div>
        </div>

        {/* KPIs */}
        {loading ? <CardSkeleton count={4} /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Requests"  value={summary?.total ?? 0}
              icon={<TrendingUp size={18}/>} color="#3b82f6"
              sub={`+14% vs last month`} subPositive={true} />
            <StatCard label="Completed"       value={summary?.byStatus?.find((s:any)=>s.status==='Completed')?.count ?? 0}
              icon={<CheckCircle size={18}/>} color="#10b981"
              sub={`${summary?.completionRate ?? 0}% completion rate`} subPositive={true} />
            <StatCard label="In Progress"     value={summary?.byStatus?.find((s:any)=>s.status==='In Progress')?.count ?? 0}
              icon={<Zap size={18}/>} color="#f59e0b" sub="Being processed" />
            <StatCard label="Rejected"        value={summary?.byStatus?.find((s:any)=>s.status==='Rejected')?.count ?? 0}
              icon={<XCircle size={18}/>} color="#ef4444" subPositive={false}
              sub={`Avg ${summary?.avgApprovalDays ?? 0}d approval time`} />
          </div>
        )}

        {/* Charts Row 1 */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Monthly trend */}
          <div className="card-pad md:col-span-2">
            <p className="sec-title mb-4">Requests Trend</p>
            {loading ? <div className="h-48 skeleton rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={summary?.monthlyTrend ?? []} margin={{ top:5,right:10,left:-25,bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="shortLabel" tick={{ fontSize:10,fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10,fill:'#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,fontSize:11 }} />
                  <Line type="monotone" dataKey="total"     stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Total"     />
                  <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2}   dot={false} name="Completed" />
                  <Line type="monotone" dataKey="rejected"  stroke="#ef4444" strokeWidth={1.5} dot={false} name="Rejected" strokeDasharray="4 2" />
                  <Legend wrapperStyle={{ fontSize:11 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status pie */}
          <div className="card-pad">
            <p className="sec-title mb-4">Requests by Status</p>
            {loading ? <div className="h-48 skeleton rounded-xl" /> : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={(summary?.byStatus ?? []).filter((s:any) => s.count > 0)}
                      cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                      dataKey="count" paddingAngle={3}>
                      {(summary?.byStatus ?? []).filter((s:any) => s.count > 0).map((entry:any, i:number) => (
                        <Cell key={entry.status} fill={(CHART_COLOR_MAP as any)[entry.status] ?? CHART_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize:11,borderRadius:8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {(summary?.byStatus ?? []).filter((s:any)=>s.count>0).map((s:any) => (
                    <div key={s.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background:(CHART_COLOR_MAP as any)[s.status]??'#94a3b8' }} />
                        <span className="text-slate-600">{s.status}</span>
                      </div>
                      <span className="font-semibold tabular-nums text-slate-700">{s.count} ({s.pct}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* By Department */}
          <div className="card-pad">
            <p className="sec-title mb-4">Requests by Department</p>
            {loading ? <div className="h-44 skeleton rounded-xl" /> : (
              <div className="space-y-2.5">
                {(summary?.byDepartment ?? []).slice(0,6).map((d:any, i:number) => {
                  const max = summary?.byDepartment?.[0]?.count ?? 1
                  return (
                    <div key={d.dept}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-600 truncate max-w-[140px]">{d.dept}</span>
                        <span className="text-xs font-bold text-slate-700 tabular-nums">{d.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width:`${Math.round(d.count/max*100)}%`, background: CHART_COLORS[i%CHART_COLORS.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* By Type */}
          <div className="card-pad">
            <p className="sec-title mb-4">Requests by Type</p>
            {loading ? <div className="h-44 skeleton rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={175}>
                <BarChart data={summary?.byType ?? []} margin={{ top:0,right:10,left:-25,bottom:0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize:10,fill:'#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="type" tick={{ fontSize:9,fill:'#94a3b8' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,fontSize:11 }} />
                  <Bar dataKey="count" name="Requests" radius={[0,4,4,0]}>
                    {(summary?.byType ?? []).map((_:any, i:number) => (
                      <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Completion rate */}
        {summary && (
          <div className="card-pad">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="sec-title">Overall Completion Rate</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {summary.byStatus.find((s:any)=>s.status==='Completed')?.count ?? 0} of {summary.total} requests completed ·
                  Average approval time: <span className="font-semibold">{summary.avgApprovalDays} days</span>
                </p>
              </div>
              <span className="text-3xl font-black font-display" style={{ color:'#10b981' }}>{summary.completionRate}%</span>
            </div>
            <div className="h-4 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width:`${summary.completionRate}%`, background:'linear-gradient(90deg,#10b981,#34d399)' }} />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
