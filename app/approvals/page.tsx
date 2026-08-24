'use client'
// app/approvals/page.tsx
import { useEffect, useState } from 'react'
import AppLayout from '@/components/shared/AppLayout'
import { PageHeader, StatusBadge, EmptyState, TableSkeleton, Modal } from '@/components/ui/index'
import { requestService } from '@/services/requestService'
import { useAuthStore } from '@/stores'
import type { JobOrderRequest } from '@/types'
import { formatDate, formatDateTime } from '@/lib/utils'
import { CheckCircle, XCircle, RotateCcw, Eye, Clock } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type TabKey = 'mine' | 'approved' | 'rejected' | 'all'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'mine',     label: 'For My Approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all',      label: 'All' },
]

export default function ApprovalsPage() {
  const { user } = useAuthStore()
  const [allReqs, setAllReqs]   = useState<JobOrderRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<TabKey>('mine')
  const [actionModal, setActionModal] = useState<{ req: JobOrderRequest; action: 'approve'|'reject'|'return' } | null>(null)
  const [comments, setComments] = useState('')
  const [actioning, setActioning] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setAllReqs(await requestService.getAll()) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const mine = allReqs.filter(r => r.status === 'For Approval')
  const approved = allReqs.filter(r => r.status === 'Completed' || r.status === 'In Progress')
  const rejected = allReqs.filter(r => r.status === 'Rejected')

  const displayed: Record<TabKey, JobOrderRequest[]> = {
    mine: mine, approved, rejected, all: allReqs,
  }
  const reqs = displayed[tab]

  const handleAction = async () => {
    if (!actionModal || !user) return
    if ((actionModal.action === 'reject' || actionModal.action === 'return') && !comments.trim()) {
      toast.error('Comments required'); return
    }
    setActioning(true)
    try {
      const newStatus = actionModal.action === 'approve' ? 'In Progress'
        : actionModal.action === 'reject' ? 'Rejected' : 'Returned'
      await requestService.update(actionModal.req.id, {
        status: newStatus as any,
        activityLog: [
          ...(actionModal.req.activityLog ?? []),
          {
            id: crypto.randomUUID(),
            action: `${actionModal.action === 'approve' ? 'Approved' : actionModal.action === 'reject' ? 'Rejected' : 'Returned'} by ${user.fullName}`,
            userId: user.uid, userName: user.fullName,
            details: comments || `Request ${actionModal.action}d`,
            timestamp: new Date().toISOString(),
          }
        ],
      })
      toast.success(`Request ${actionModal.action}d successfully`)
      setActionModal(null); setComments(''); load()
    } catch { toast.error('Action failed') }
    finally { setActioning(false) }
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader title="Approvals" subtitle="Manage request approvals and workflow" />

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-all',
                tab === t.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
              {t.label}
              <span className={cn('ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                tab === t.key ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500')}>
                {displayed[t.key].length}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request No.</th><th>Title</th><th>Requested By</th>
                  <th>Approver Level</th><th>Date Requested</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}><TableSkeleton rows={5} cols={6} /></td></tr>
                ) : reqs.length === 0 ? (
                  <tr><td colSpan={6}>
                    <EmptyState icon={CheckCircle} title="No requests in this queue"
                      message={tab === 'mine' ? 'No requests pending your approval.' : 'Nothing to show here.'} />
                  </td></tr>
                ) : reqs.map(req => (
                  <tr key={req.id}>
                    <td>
                      <Link href={`/request-details/${req.id}`} className="font-bold text-xs text-brand-600 hover:underline font-mono">
                        {req.jobOrderNo}
                      </Link>
                    </td>
                    <td>
                      <p className="text-sm font-medium text-slate-700 max-w-[200px] truncate">{req.productCategory || '—'}</p>
                      <p className="text-[11px] text-slate-400">{req.branchLocation}</p>
                    </td>
                    <td>
                      <p className="text-sm text-slate-700">{req.requestor}</p>
                      <p className="text-[11px] text-slate-400">{req.department}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-700">
                          L{req.approvalLevel + 1}
                        </div>
                        <span className="text-xs text-slate-500">
                          {req.approvers[req.approvalLevel]?.approverName ?? 'Sales Director'}
                        </span>
                      </div>
                    </td>
                    <td className="text-xs text-slate-500">{formatDate(req.createdAt)}</td>
                    <td>
                      {tab === 'mine' ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setActionModal({ req, action: 'approve' })}
                            className="btn-primary btn-sm flex items-center gap-1">
                            <CheckCircle size={12} /> Review
                          </button>
                        </div>
                      ) : (
                        <Link href={`/request-details/${req.id}`} className="btn-secondary btn-sm flex items-center gap-1">
                          <Eye size={12} /> View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approval Flow Info */}
        <div className="card-pad">
          <p className="sec-title mb-4">Approval Flow</p>
          <div className="flex items-center gap-3">
            {[
              { label: 'Sales Director\n(Local/Expert)\nEach Category', active: true },
              { label: 'Marketing\nManager', active: false },
              { label: 'Completed', completed: true },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={cn('flex flex-col items-center text-center px-4 py-3 rounded-xl border text-xs font-medium min-w-[120px]',
                  step.completed ? 'bg-green-50 border-green-200 text-green-700' :
                  step.active ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-slate-50 border-slate-200 text-slate-600')}>
                  {step.label.split('\n').map((l, j) => <span key={j}>{l}</span>)}
                </div>
                {i < 2 && <div className="w-8 h-0.5 bg-slate-200" />}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">* Approver assignment depends on Rack Category</p>
        </div>
      </div>

      {/* Action Modal */}
      <Modal open={!!actionModal} onClose={() => { setActionModal(null); setComments('') }}
        title={`${actionModal?.action === 'approve' ? 'Approve' : actionModal?.action === 'reject' ? 'Reject' : 'Return'} Request`}
        size="sm"
        footer={<>
          <button onClick={() => { setActionModal(null); setComments('') }} className="btn-secondary">Cancel</button>
          <div className="flex gap-2">
            {actionModal?.action === 'approve' ? (
              <>
                <button onClick={() => { setActionModal(prev => prev ? { ...prev, action: 'reject' } : null) }}
                  className="btn-danger btn-sm flex items-center gap-1"><XCircle size={13} /> Reject</button>
                <button onClick={() => { setActionModal(prev => prev ? { ...prev, action: 'return' } : null) }}
                  className="btn-secondary btn-sm flex items-center gap-1"><RotateCcw size={13} /> Return</button>
                <button onClick={handleAction} disabled={actioning} className="btn-primary btn-sm flex items-center gap-1">
                  {actioning && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <CheckCircle size={13} /> Approve
                </button>
              </>
            ) : (
              <button onClick={handleAction} disabled={actioning}
                className={cn(actionModal?.action === 'reject' ? 'btn-danger' : 'btn-secondary', 'btn-sm flex items-center gap-1')}>
                {actioning && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {actionModal?.action === 'reject' ? 'Reject' : 'Return'}
              </button>
            )}
          </div>
        </>}>
        {actionModal && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="font-semibold text-sm text-slate-700">{actionModal.req.jobOrderNo}</p>
              <p className="text-xs text-slate-500 mt-0.5">{actionModal.req.productCategory || actionModal.req.branchLocation}</p>
            </div>
            <div>
              <label className="field-label">
                Comments {(actionModal.action === 'reject' || actionModal.action === 'return') && '*'}
              </label>
              <textarea value={comments} onChange={e => setComments(e.target.value)} rows={4}
                placeholder="Add your comments or reason…" className="field" />
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
