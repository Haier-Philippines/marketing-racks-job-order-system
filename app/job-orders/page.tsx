'use client'
// app/job-orders/page.tsx
import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/shared/AppLayout'
import { PageHeader, StatusBadge, SearchBar, Pagination, EmptyState, TableSkeleton, ConfirmDialog } from '@/components/ui/index'
import { requestService } from '@/services/requestService'
import { useAuthStore } from '@/stores'
import type { JobOrderRequest, FilterParams, RequestStatus } from '@/types'
import { DEPARTMENTS } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import {
  Plus, MoreVertical, Eye, Pencil, Trash2,
  Filter, RefreshCw, FileDown,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const STATUS_OPTIONS: RequestStatus[] = ['For Approval','In Progress','Completed','Rejected','Cancelled','Returned']

export default function JobOrdersPage() {
  const { user } = useAuthStore()
  const router   = useRouter()

  const [requests, setRequests]   = useState<JobOrderRequest[]>([])
  const [total, setTotal]         = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading]     = useState(true)
  const [filters, setFilters]     = useState<FilterParams>({ page: 1, pageSize: 10, sortField: 'createdAt', sortDir: 'desc' })
  const [showFilters, setShowFilters] = useState(false)
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [deleting, setDeleting]   = useState(false)
  const [openMenu, setOpenMenu]   = useState<string | null>(null)

  const isAdmin = user?.role === 'it_admin' || user?.role === 'marketing_manager'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await requestService.getPaginated(filters)
      setRequests(res.data); setTotal(res.total); setTotalPages(res.totalPages)
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load() }, [load])

  const setFilter = (key: keyof FilterParams, value: any) =>
    setFilters(p => ({ ...p, [key]: value || undefined, page: 1 }))

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try { await requestService.delete(deleteId); toast.success('Request deleted'); setDeleteId(null); load() }
    catch { toast.error('Delete failed') }
    finally { setDeleting(false) }
  }

  const exportCSV = () => {
    const header = 'JO Number,Requestor,Product Category,Dealer,Branch/Store,Target Date,Store Status,Items,Status,Date Created\n'
    const rows = requests.map(r => {
      const storeStatusLabel = [
        r.storeStatus?.newBranch ? 'New Branch' : '',
        r.storeStatus?.spaceAcquiring ? 'Space Acquiring' : '',
        r.storeStatus?.renovation ? 'Renovation' : '',
      ].filter(Boolean).join(' / ') || 'None'
      return `${r.jobOrderNo},"${r.requestor}","${r.productCategory}","${r.dealer}","${r.branchLocation}",${r.targetDate || '—'},${storeStatusLabel},${r.requestDetails?.length ?? 0},${r.status},${formatDate(r.createdAt)}`
    }).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'job-orders.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader
          title="Job Order Requests"
          subtitle={`${total} total requests`}
          actions={
            <>
              <button onClick={load} className="btn-secondary p-2">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
              <button onClick={() => setShowFilters(p => !p)} className={cn('btn-secondary flex items-center gap-2', showFilters && 'border-brand-400 text-brand-600')}>
                <Filter size={14} /> Filters
              </button>
              <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
                <FileDown size={14} /> Export
              </button>
              {isAdmin && (
                <Link href="/job-orders/new" className="btn-primary flex items-center gap-2">
                  <Plus size={14} /> New Request
                </Link>
              )}
            </>
          }
        />

        {showFilters && (
          <div className="card-pad grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in">
            <select value={filters.status ?? ''} onChange={e => setFilter('status', e.target.value)} className="field-sm">
              <option value="">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.department ?? ''} onChange={e => setFilter('department', e.target.value)} className="field-sm">
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input type="date" value={filters.dateFrom ?? ''} onChange={e => setFilter('dateFrom', e.target.value)} className="field-sm" />
            <button onClick={() => setFilters({ page: 1, pageSize: 10 })} className="btn-secondary btn-sm">Clear Filters</button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <SearchBar value={filters.search ?? ''} onChange={v => setFilter('search', v)}
            placeholder="Search JO number, requestor, product, branch…" className="flex-1" />
          <select value={filters.pageSize} onChange={e => setFilters(p => ({ ...p, pageSize: Number(e.target.value), page: 1 }))} className="field-sm w-28">
            {[10, 25, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>JO Number</th>
                  <th>Requestor</th>
                  <th>Product Category</th>
                  <th>Dealer</th>
                  <th>Branch / Store</th>
                  <th>Vendor</th>
                  <th>Price / Amount</th>
                  <th>Target Date</th>
                  <th>Store Status</th>
                  <th>Items</th>
                  
                  <th>Status</th>
                  <th>Date Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11}><TableSkeleton rows={8} cols={11} /></td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={11}>
                    <EmptyState icon={FileDown} title="No requests found"
                      message="Try adjusting your filters or create a new request."
                      action={isAdmin ? <Link href="/job-orders/new" className="btn-primary btn-sm">Create Request</Link> : undefined} />
                  </td></tr>
                ) : requests.map(req => {
                  const storeStatusLabels = [
                    req.storeStatus?.newBranch ? 'New Branch' : '',
                    req.storeStatus?.spaceAcquiring ? 'Space Acquiring' : '',
                    req.storeStatus?.renovation ? 'Renovation' : '',
                  ].filter(Boolean)
                  return (
                    <tr key={req.id}>
                      <td>
                        <Link href={`/request-details/${req.id}`}
                          className="font-semibold text-xs text-brand-600 hover:underline font-mono">
                          {req.jobOrderNo}
                        </Link>
                      </td>
                      <td className="text-sm text-slate-700">{req.requestor}</td>
                      <td className="text-sm text-slate-700">{req.productCategory || '—'}</td>
                      <td className="text-xs text-slate-500">{req.dealer || '—'}</td>
                      <td className="text-sm text-slate-700">{req.branchLocation}</td>
                      <td className="text-xs text-slate-500">{req.vendorName || '—'}</td>
                      <td className="text-sm text-slate-700">
                        {typeof req.projectAmount === 'number' ? `₱${req.projectAmount.toLocaleString()}` : '—'}
                      </td>
                      <td className="text-xs text-slate-500">{req.targetDate ? formatDate(req.targetDate) : '—'}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {storeStatusLabels.length > 0 ? storeStatusLabels.map(s => (
                            <span key={s} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{s}</span>
                          )) : <span className="text-xs text-slate-400">—</span>}
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="text-sm font-semibold text-slate-700">{req.requestDetails?.length ?? 0}</span>
                      </td>
                      <td><StatusBadge status={req.status} type="request" /></td>
                      <td className="text-xs text-slate-500">{formatDate(req.createdAt)}</td>
                      <td>
                        <div className="relative">
                          <button onClick={() => setOpenMenu(openMenu === req.id ? null : req.id)} className="btn-icon">
                            <MoreVertical size={15} />
                          </button>
                          {openMenu === req.id && (
                            <div className="absolute right-0 top-8 z-20 card shadow-lg w-40 py-1 animate-fade-in"
                              onMouseLeave={() => setOpenMenu(null)}>
                              <Link href={`/request-details/${req.id}`}
                                className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                <Eye size={13} /> View Details
                              </Link>
                              {isAdmin && (
                                <>
                                  <Link href={`/job-orders/${req.id}/edit`}
                                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                    <Pencil size={13} /> Edit
                                  </Link>
                                  <button onClick={() => { setDeleteId(req.id); setOpenMenu(null) }}
                                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                                    <Trash2 size={13} /> Delete
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!loading && total > 0 && (
            <Pagination page={filters.page ?? 1} totalPages={totalPages} total={total}
              pageSize={filters.pageSize ?? 10} onPage={p => setFilters(prev => ({ ...prev, page: p }))} />
          )}
        </div>
      </div>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Request" message="This will permanently delete the job order request." danger loading={deleting} />
    </AppLayout>
  )
}

