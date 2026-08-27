'use client'
// app/approver/all-requests/page.tsx
import { useEffect, useState, useCallback } from 'react'
import ApproverLayout from '@/components/shared/ApproverLayout'
import { StatusBadge, SearchBar, EmptyState, TableSkeleton, Pagination, ConfirmDialog } from '@/components/ui/index'
import ReviewModal from '@/components/features/ReviewModal'
import { approvalService } from '@/services/approvalService'
import { requestService } from '@/services/requestService'
import { useAuthStore } from '@/stores'
import type { JobOrderRequest, ProjectStatus, RequestStatus } from '@/types'
import { DEPARTMENTS, PROJECT_STATUS_OPTIONS } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { ClipboardList, RefreshCw, Filter, Eye } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const STATUS_OPTS: RequestStatus[] = ['For Approval','In Progress','Approved','Completed','Rejected','Cancelled','Returned']
// Vendor/Amount can only be filled in once the project has reached the
// budget-approval stage or later — before that, the numbers aren't final.
const BUDGET_GATE_INDEX = PROJECT_STATUS_OPTIONS.indexOf(
  'Processing Budget Approval (Document, PFF, BRF, & MAF)'
)
function canEditVendorInfo(projectStatus?: string | null): boolean {
  if (!projectStatus) return false
  const idx = PROJECT_STATUS_OPTIONS.indexOf(projectStatus as any)
  return idx !== -1 && idx >= BUDGET_GATE_INDEX
}
export default function AllRequestsPage() {
  const { user }              = useAuthStore()
  const [reqs, setReqs]       = useState<JobOrderRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [statusF, setStatusF] = useState('')
  const [deptF, setDeptF]     = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage]       = useState(1)
  const [reviewReq, setReviewReq] = useState<JobOrderRequest | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [savingVendorId, setSavingVendorId] = useState<string | null>(null)
  const [pendingProjectStatusUpdate, setPendingProjectStatusUpdate] = useState<{
    requestId: string
    requestNo: string
    fromStatus: string
    toStatus: ProjectStatus
  } | null>(null)
  const [savingProjectStatus, setSavingProjectStatus] = useState(false)
  const pageSize = 10
  const isMarketingManager = user?.role === 'marketing_manager'

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      console.log('[AllRequestsPage] load diagnostics:', {
        page: '/approver/all-requests',
        uid: user.uid,
        role: user.role,
        department: user.department,
      })

      const list = await approvalService.getAllForApprover(user.uid, user.role)
      setReqs(list)
    } catch (error: any) {
      console.error('[AllRequestsPage] failed to load requests:', {
        code: error?.code,
        message: error?.message,
      })
      toast.error(error?.message ?? 'Failed to load requests')
      setReqs([])
    } finally { setLoading(false) }
  }, [user])

  useEffect(() => { load() }, [load])

  const openProjectStatusConfirm = (request: JobOrderRequest, nextStatus: ProjectStatus) => {
    const current = request.projectStatus || 'Not Set'
    if (current === nextStatus) return

    setPendingProjectStatusUpdate({
      requestId: request.id,
      requestNo: request.jobOrderNo,
      fromStatus: current,
      toStatus: nextStatus,
    })
    setConfirmOpen(true)
  }

  const handleConfirmProjectStatus = async () => {
    if (!user || !pendingProjectStatusUpdate) return
    setSavingProjectStatus(true)

    try {
      await requestService.updateProjectStatus({
        requestId: pendingProjectStatusUpdate.requestId,
        projectStatus: pendingProjectStatusUpdate.toStatus,
        updatedById: user.uid,
        updatedByName: user.fullName,
        updatedByRole: user.role,
      })

      toast.success('Project status updated')
      setConfirmOpen(false)
      setPendingProjectStatusUpdate(null)
      await load()
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to update project status')
    } finally {
      setSavingProjectStatus(false)
    }
  }

  const handleVendorInfoBlur = async (
  req: JobOrderRequest,
  patch: { vendorName?: string; projectAmount?: number }
) => {
  if (!user) return
  const nextVendor = patch.vendorName !== undefined ? patch.vendorName : (req.vendorName ?? '')
  const nextAmount = patch.projectAmount !== undefined ? patch.projectAmount : req.projectAmount

  if (nextVendor === (req.vendorName ?? '') && nextAmount === req.projectAmount) return

  setSavingVendorId(req.id)
  try {
    await requestService.update(req.id, { vendorName: nextVendor, projectAmount: nextAmount })
    setReqs(prev => prev.map(r => r.id === req.id ? { ...r, vendorName: nextVendor, projectAmount: nextAmount } : r))
    toast.success('Saved')
  } catch (error: any) {
    toast.error(error?.message ?? 'Failed to save')
  } finally {
    setSavingVendorId(null)
  }
}

  const filtered = reqs.filter(r => {
    const ms = r.jobOrderNo.toLowerCase().includes(search.toLowerCase()) ||
      r.productCategory.toLowerCase().includes(search.toLowerCase()) ||
      r.requestor.toLowerCase().includes(search.toLowerCase()) ||
      r.branchLocation.toLowerCase().includes(search.toLowerCase())
    const ss = !statusF  || r.status === statusF
    const dp = !deptF    || r.department === deptF
    return ms && ss && dp
  })

  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filtered.length / pageSize)

  return (
    <ApproverLayout>
      <div className="space-y-4 w-full px-6 md:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">All Requests</h1>
            <p className="text-sm text-slate-500 mt-0.5">{reqs.length} total requests</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(p => !p)}
              className={cn('btn-secondary flex items-center gap-2', showFilters && 'border-brand-400 text-brand-600')}>
              <Filter size={14} /> Filters
            </button>
            <button onClick={load} className="btn-secondary p-2">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="card-pad grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in">
            <select value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1) }} className="field-sm">
              <option value="">All Status</option>
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={deptF} onChange={e => { setDeptF(e.target.value); setPage(1) }} className="field-sm">
              <option value="">All Department</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button onClick={() => { setStatusF(''); setDeptF('') }} className="btn-secondary btn-sm">Clear Filters</button>
          </div>
        )}

        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }}
          placeholder="Search JO number, product category, requestor…" className="w-full" />

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>JO Number</th>
                  <th>Product Category</th>
                  <th>Dealer</th>
                  <th>Branch / Store</th>
                  <th>Vendor</th>
                  <th>Price / Amount</th>
                  <th>Status</th>
                  <th>Project Status</th>
                  <th>Date Requested</th>
                  <th>Requestor</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9}><TableSkeleton rows={7} cols={9} /></td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={9}>
                    <EmptyState icon={ClipboardList} title="No requests found" message="Try adjusting your filters." />
                  </td></tr>
                ) : paged.map(req => (
                  <tr key={req.id}>
                    <td>
                      <Link href={`/approver/for-approval/${req.id}`}
                        className="font-bold text-xs text-brand-600 hover:underline font-mono">
                        {req.jobOrderNo}
                      </Link>
                    </td>
                    <td className="text-sm text-slate-700">{req.productCategory || '—'}</td>
                    <td className="text-sm text-slate-700">{req.dealer || '—'}</td>
                    <td className="text-sm text-slate-600">{req.branchLocation}</td>
                      <td>
                        {isMarketingManager && canEditVendorInfo(req.projectStatus) ? (
                          <input
                            type="text"
                            defaultValue={req.vendorName ?? ''}
                            placeholder="Enter vendor"
                            disabled={savingVendorId === req.id}
                            className="field-sm w-32"
                            onBlur={e => handleVendorInfoBlur(req, { vendorName: e.target.value })}
                          />
                        ) : isMarketingManager ? (
                          <span className="text-xs text-slate-400 italic">Available after Budget Approval</span>
                        ) : (
                          <span className="text-sm text-slate-600">{req.vendorName || '—'}</span>
                        )}
                      </td>
                      <td>
                        {isMarketingManager && canEditVendorInfo(req.projectStatus) ? (
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            defaultValue={req.projectAmount ?? ''}
                            placeholder="0.00"
                            disabled={savingVendorId === req.id}
                            className="field-sm w-28"
                            onBlur={e => handleVendorInfoBlur(req, { projectAmount: e.target.value === '' ? undefined : Number(e.target.value) })}
                          />
                        ) : isMarketingManager ? (
                          <span className="text-xs text-slate-400 italic">—</span>
                        ) : (
                          <span className="text-sm text-slate-600">
                            {typeof req.projectAmount === 'number' ? `₱${req.projectAmount.toLocaleString()}` : '—'}
                          </span>
                        )}
                      </td>
                      <td><StatusBadge status={req.status} type="request" /></td>
                    <td>
                      {isMarketingManager ? (
                        <select
                          className="field-sm min-w-[280px] max-w-[360px] whitespace-normal leading-tight"
                          value={req.projectStatus ?? 'Not Set'}
                          onChange={event => {
                            const selected = event.target.value as ProjectStatus | 'Not Set'
                            if (selected === 'Not Set') return
                            openProjectStatusConfirm(req, selected)
                          }}
                        >
                          <option value="Not Set" disabled>Not Set</option>
                          {PROJECT_STATUS_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="status-badge bg-slate-50 text-slate-700 max-w-[320px] whitespace-normal leading-tight">
                          {req.projectStatus ?? 'Not Set'}
                        </span>
                      )}
                    </td>
                    <td className="text-xs text-slate-500">{formatDate(req.createdAt)}</td>
                    <td className="text-sm text-slate-700">{req.requestor}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {req.status === 'For Approval' ? (
                          <button onClick={() => setReviewReq(req)} className="btn-primary btn-sm">Review</button>
                        ) : (
                          <Link href={`/approver/for-approval/${req.id}`}
                            className="btn-secondary btn-sm flex items-center gap-1">
                            <Eye size={12} /> View
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length > pageSize && (
            <Pagination page={page} totalPages={totalPages} total={filtered.length}
              pageSize={pageSize} onPage={setPage} />
          )}
        </div>
      </div>

      <ReviewModal open={!!reviewReq} onClose={() => setReviewReq(null)} request={reviewReq} onDone={load} />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          if (savingProjectStatus) return
          setConfirmOpen(false)
          setPendingProjectStatusUpdate(null)
        }}
        onConfirm={handleConfirmProjectStatus}
        loading={savingProjectStatus}
        title="Update Project Status"
        message={pendingProjectStatusUpdate
          ? `Update project status from '${pendingProjectStatusUpdate.fromStatus}' to '${pendingProjectStatusUpdate.toStatus}'?`
          : 'Update project status?'}
      />
    </ApproverLayout>
  )
}

