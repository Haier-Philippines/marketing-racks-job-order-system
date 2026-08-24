'use client'
// app/approver/my-approvals/page.tsx
import { useEffect, useState, useCallback } from 'react'
import ApproverLayout from '@/components/shared/ApproverLayout'
import { StatusBadge, SearchBar, EmptyState, TableSkeleton, Pagination } from '@/components/ui/index'
import { approvalService } from '@/services/approvalService'
import { useAuthStore } from '@/stores'
import type { JobOrderRequest } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { CheckCircle, RefreshCw, Eye } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type Tab = 'For My Approval' | 'Approved' | 'Rejected' | 'All'
const TABS: Tab[] = ['For My Approval', 'Approved', 'Rejected', 'All']

export default function MyApprovalsPage() {
  const { user }              = useAuthStore()
  const [reqs, setReqs]       = useState<JobOrderRequest[]>([])
  const [pending, setPending] = useState<JobOrderRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [tab, setTab]         = useState<Tab>('For My Approval')
  const [page, setPage]       = useState(1)
  const pageSize = 10

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      console.log('[MyApprovalsPage] load diagnostics:', {
        page: '/approver/my-approvals',
        uid: user.uid,
        role: user.role,
        department: user.department,
      })

      const [myActions, myPending] = await Promise.all([
        approvalService.getMyApprovals(user.uid, user.role),
        approvalService.getForMyApproval(user.uid, user.role),
      ])
      setReqs(myActions)
      setPending(myPending)
    } catch (error: any) {
      console.error('[MyApprovalsPage] failed to load:', {
        code: error?.code,
        message: error?.message,
      })
      toast.error(error?.message ?? 'Failed to load approvals')
      setReqs([])
      setPending([])
    } finally { setLoading(false) }
  }, [user])

  useEffect(() => { load() }, [load])

  const getMyAction = (req: JobOrderRequest) => {
    const entry = req.approvers?.find(a => a.approverId === user?.uid || a.approverRole === user?.role)
    return entry?.action ?? 'Pending'
  }

  const byTab = () => {
    switch (tab) {
      case 'For My Approval': return pending
      case 'Approved': return reqs.filter(r => getMyAction(r) === 'Approved')
      case 'Rejected': return reqs.filter(r => getMyAction(r) === 'Rejected')
      default: return [...pending, ...reqs]
    }
  }

  const filtered = byTab().filter(r =>
    r.jobOrderNo.toLowerCase().includes(search.toLowerCase()) ||
    r.productCategory.toLowerCase().includes(search.toLowerCase()) ||
    r.requestor.toLowerCase().includes(search.toLowerCase())
  )

  const paged      = filtered.slice((page-1)*pageSize, page*pageSize)
  const totalPages = Math.ceil(filtered.length / pageSize)

  const tabCounts = {
    'For My Approval': pending.length,
    'Approved':        reqs.filter(r => getMyAction(r) === 'Approved').length,
    'Rejected':        reqs.filter(r => getMyAction(r) === 'Rejected').length,
    'All':             [...new Set([...pending.map(r=>r.id), ...reqs.map(r=>r.id)])].length,
  }

  const actionColor = (action: string) => {
    if (action === 'Approved') return 'text-green-600 bg-green-50'
    if (action === 'Rejected') return 'text-red-600 bg-red-50'
    if (action === 'Returned') return 'text-amber-600 bg-amber-50'
    return 'text-amber-600 bg-amber-50'
  }

  return (
    <ApproverLayout>
      <div className="space-y-4 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">My Approvals</h1>
            <p className="text-sm text-slate-500 mt-0.5">Your approval history and pending actions</p>
          </div>
          <button onClick={load} className="btn-secondary p-2">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); setPage(1) }}
              className={cn('px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-all whitespace-nowrap',
                tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
              {t}
              <span className={cn('ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                tab === t ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500')}>
                {tabCounts[t]}
              </span>
            </button>
          ))}
        </div>

        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }}
          placeholder="Search request no., title, requester…" className="w-full" />

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>JO Number</th><th>Product Category</th><th>Requestor</th>
                  <th>Date Requested</th><th>My Action</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7}><TableSkeleton rows={6} cols={7} /></td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={7}>
                    <EmptyState icon={CheckCircle}
                      title={`No ${tab === 'All' ? '' : tab.toLowerCase()} requests`}
                      message="Nothing to display in this category." />
                  </td></tr>
                ) : paged.map(req => {
                  const myAction = getMyAction(req)
                  const myEntry  = req.approvers?.find(a => a.approverId === user?.uid || a.approverRole === user?.role)
                  return (
                    <tr key={req.id}>
                      <td>
                        <Link href={`/approver/for-approval/${req.id}`}
                          className="font-bold text-xs text-brand-600 hover:underline font-mono">
                          {req.jobOrderNo}
                        </Link>
                      </td>
                      <td>
                        <p className="font-medium text-sm text-slate-800 max-w-[180px] truncate">{req.productCategory || '—'}</p>
                        <p className="text-[11px] text-slate-400">{req.branchLocation}</p>
                      </td>
                      <td>
                        <p className="text-sm text-slate-700">{req.requestor}</p>
                        <p className="text-[11px] text-slate-400">{req.department}</p>
                      </td>
                      <td className="text-xs text-slate-500">{formatDate(req.createdAt)}</td>
                      <td>
                        <span className={cn('text-[11px] font-semibold px-2 py-1 rounded-full', actionColor(myAction))}>
                          {myAction}
                        </span>
                      </td>
                      <td><StatusBadge status={req.status} type="request" /></td>
                      <td>
                        <Link href={`/approver/for-approval/${req.id}`}
                          className="btn-secondary btn-sm flex items-center gap-1">
                          <Eye size={12} /> View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length > pageSize && (
            <Pagination page={page} totalPages={totalPages} total={filtered.length}
              pageSize={pageSize} onPage={setPage} />
          )}
          {!loading && filtered.length > 0 && (
            <p className="text-xs text-slate-400 px-4 py-2 border-t border-slate-100">
              Showing {Math.min((page-1)*pageSize+1, filtered.length)} to {Math.min(page*pageSize, filtered.length)} of {filtered.length} requests
            </p>
          )}
        </div>
      </div>
    </ApproverLayout>
  )
}
