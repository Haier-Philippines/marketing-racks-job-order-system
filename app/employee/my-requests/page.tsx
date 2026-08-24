'use client'
// app/employee/my-requests/page.tsx
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import EmployeeLayout from '@/components/shared/EmployeeLayout'
import { StatusBadge, SearchBar, EmptyState, TableSkeleton, Pagination } from '@/components/ui/index'
import { requestService } from '@/services/requestService'
import { useAuthStore } from '@/stores'
import type { JobOrderRequest, RequestStatus } from '@/types'
import { formatDate } from '@/lib/utils'
import { ClipboardList, Eye, Plus } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { cn } from '@/lib/utils'

type Tab = 'All' | RequestStatus
const TABS: Tab[] = ['All','For Approval','In Progress','Completed','Cancelled']

function MyRequestsContent() {
  const { user }    = useAuthStore()
  const searchParams = useSearchParams()
  const initStatus  = searchParams.get('status') as Tab | null

  const [reqs, setReqs]       = useState<JobOrderRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [tab, setTab]         = useState<Tab>(initStatus ?? 'All')
  const [page, setPage]       = useState(1)
  const pageSize = 10

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try { setReqs(await requestService.getByUser(user.uid)) }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { load() }, [load])

  const filtered = reqs.filter(r => {
    const ms = r.jobOrderNo.toLowerCase().includes(search.toLowerCase()) ||
      r.productCategory.toLowerCase().includes(search.toLowerCase()) ||
      r.branchLocation.toLowerCase().includes(search.toLowerCase()) ||
      r.requestor.toLowerCase().includes(search.toLowerCase())
    const ts = tab === 'All' || r.status === tab
    return ms && ts
  })

  const paged      = filtered.slice((page-1)*pageSize, page*pageSize)
  const totalPages = Math.ceil(filtered.length / pageSize)

  return (
    <EmployeeLayout>
      <div className="space-y-6 w-full px-6 md:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">My Requests</h1>
            <p className="text-sm text-slate-500 mt-0.5">{reqs.length} total requests</p>
          </div>
          <Link href="/employee/create-request" className="btn-primary flex items-center gap-2">
            <Plus size={14} /> New Request
          </Link>
        </div>

        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }}
          placeholder="Search JO number, product category, branch…" className="w-full" />

        <div className="flex gap-1 border-b border-slate-200">
          {TABS.map(t => {
            const cnt = t === 'All' ? reqs.length : reqs.filter(r => r.status === t).length
            return (
              <button key={t} onClick={() => { setTab(t); setPage(1) }}
                className={cn('px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-all whitespace-nowrap',
                  tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
                {t}
                <span className={cn('ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                  tab === t ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500')}>
                  {cnt}
                </span>
              </button>
            )
          })}
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>JO Number</th>
                  <th>Product Category</th>
                  <th>Dealer</th>
                  <th>Branch / Store</th>
                  <th>Status</th>
                  <th>Project Status</th>
                  <th>Items</th>
                  <th>Date Requested</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9}><TableSkeleton rows={6} cols={9} /></td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={9}>
                    <EmptyState icon={ClipboardList}
                      title={tab === 'All' ? 'No requests yet' : `No ${tab} requests`}
                      message="Create your first job order request."
                      action={<Link href="/employee/create-request" className="btn-primary btn-sm flex items-center gap-1"><Plus size={12} />Create Request</Link>} />
                  </td></tr>
                ) : paged.map(req => (
                  <tr key={req.id}>
                    <td>
                      <Link href={`/employee/my-requests/${req.id}`}
                        className="font-bold text-xs text-brand-600 hover:underline font-mono">
                        {req.jobOrderNo}
                      </Link>
                    </td>
                    <td>
                      <p className="font-medium text-sm text-slate-800">{req.productCategory || '—'}</p>
                    </td>
                    <td className="text-sm text-slate-600">{req.dealer || '—'}</td>
                    <td className="text-sm text-slate-600">{req.branchLocation}</td>
                    <td><StatusBadge status={req.status} type="request" /></td>
                    <td>
                      <span className="status-badge bg-slate-50 text-slate-700 max-w-[320px] whitespace-normal leading-tight">
                        {req.projectStatus ?? 'Not Set'}
                      </span>
                    </td>
                    <td className="text-center text-sm font-semibold text-slate-700">{req.requestDetails?.length ?? 0}</td>
                    <td className="text-xs text-slate-500">{formatDate(req.createdAt)}</td>
                    <td>
                      <Link href={`/employee/my-requests/${req.id}`} className="btn-primary btn-sm flex items-center gap-1">
                        <Eye size={12} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length > pageSize && (
            <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPage={setPage} />
          )}
        </div>
      </div>
    </EmployeeLayout>
  )
}

export default function MyRequestsPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-xl bg-brand-600 animate-pulse"/></div>}><MyRequestsContent /></Suspense>
}

