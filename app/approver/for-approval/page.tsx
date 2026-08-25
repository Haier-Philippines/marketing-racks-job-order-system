'use client'
// app/approver/for-approval/page.tsx
import { useEffect, useState, useCallback } from 'react'
import ApproverLayout from '@/components/shared/ApproverLayout'
import { StatusBadge, SearchBar, EmptyState, TableSkeleton, Pagination } from '@/components/ui/index'
import ReviewModal from '@/components/features/ReviewModal'
import { approvalService } from '@/services/approvalService'
import { useAuthStore } from '@/stores'
import type { JobOrderRequest } from '@/types'
import { DEPARTMENTS, PRIORITIES } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { CheckSquare, RefreshCw, Filter, Eye } from 'lucide-react'
import Link from 'next/link'

export default function ForApprovalPage() {
  const { user }              = useAuthStore()
  const [reqs, setReqs]       = useState<JobOrderRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [deptF, setDeptF]     = useState('')
  const [priorityF, setPriorityF] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage]       = useState(1)
  const [reviewReq, setReviewReq] = useState<JobOrderRequest | null>(null)
  const pageSize = 10

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      console.log('[ForApprovalPage] approver diagnostics:', {
        uid: user.uid,
        role: user.role,
        department: user.department,
        queriedCollection: 'jobOrderRequests',
        queryConditions: [
          ['currentApprover', '==', user.uid],
          ['status', '==', 'For Approval'],
        ],
      })
      const list = await approvalService.getForMyApproval(user.uid, user.role)
      setReqs(list)
    } catch (error) {
      console.error('[ForApprovalPage] failed to load pending approvals:', error)
      setReqs([])
    } finally { setLoading(false) }
  }, [user])

  useEffect(() => { load() }, [load])

  const filtered = reqs.filter(r => {
    const ms = r.jobOrderNo.toLowerCase().includes(search.toLowerCase()) ||
      r.productCategory.toLowerCase().includes(search.toLowerCase()) ||
      r.requestor.toLowerCase().includes(search.toLowerCase())
    const dp = !deptF    || r.department === deptF
    const pr = !priorityF|| r.priority   === priorityF
    return ms && dp && pr
  })

  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filtered.length / pageSize)

  return (
    <ApproverLayout>
      <div className="space-y-6 w-full px-6 md:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">My Approval</h1>
             <p className="text-sm text-slate-500 mt-0.5">Your approval history and pending actions</p>
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
            <select value={deptF} onChange={e => setDeptF(e.target.value)} className="field-sm">
              <option value="">All Department</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={priorityF} onChange={e => setPriorityF(e.target.value)} className="field-sm">
              <option value="">All Priority</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={() => { setDeptF(''); setPriorityF('') }} className="btn-secondary btn-sm">Clear</button>
          </div>
        )}

        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }}
          placeholder="Search JO number, product category, requestor…" className="w-full" />

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>JO Number</th><th>Product Category</th><th>Branch / Store</th>
                  <th>Date Requested</th><th>Requestor</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}><TableSkeleton rows={6} cols={6} /></td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={6}>
                    <EmptyState icon={CheckSquare}
                      title="No pending approvals"
                      message="All caught up! No requests are waiting for your review." />
                  </td></tr>
                ) : paged.map(req => (
                  <tr key={req.id}>
                    <td>
                      <Link href={`/approver/for-approval/${req.id}`}
                        className="font-bold text-xs text-brand-600 hover:underline font-mono">
                        {req.jobOrderNo}
                      </Link>
                    </td>
                    <td className="text-sm text-slate-800">{req.productCategory || '—'}</td>
                    <td className="text-sm text-slate-600">{req.branchLocation}</td>
                    <td className="text-xs text-slate-500">{formatDate(req.createdAt)}</td>
                    <td className="text-sm text-slate-700">{req.requestor}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setReviewReq(req)} className="btn-primary btn-sm flex items-center gap-1.5">
                          Review
                        </button>
                        <Link href={`/approver/for-approval/${req.id}`} className="btn-secondary btn-sm p-1.5">
                          <Eye size={13} />
                        </Link>
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

      <ReviewModal
        open={!!reviewReq}
        onClose={() => setReviewReq(null)}
        request={reviewReq}
        onDone={load}
      />
    </ApproverLayout>
  )
}

