'use client'
// components/features/ReviewModal.tsx
import { useState } from 'react'
import { Modal, Spinner } from '@/components/ui/index'
import { approvalService, type ApprovalAction } from '@/services/approvalService'
import { useAuthStore } from '@/stores'
import type { JobOrderRequest } from '@/types'
import { formatDate } from '@/lib/utils'
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ReviewModalProps {
  open:     boolean
  onClose:  () => void
  request:  JobOrderRequest | null
  onDone:   () => void
}

export default function ReviewModal({ open, onClose, request, onDone }: ReviewModalProps) {
  const { user }          = useAuthStore()
  const [comment, setComment] = useState('')
  const [action, setAction]   = useState<ApprovalAction | null>(null)
  const [saving, setSaving]   = useState(false)
  const MAX = 500

  const handleSubmit = async (selectedAction: ApprovalAction) => {
    if (!request || !user) return
    if (selectedAction === 'Rejected' && !comment.trim()) {
      toast.error('Comment is required when rejecting'); return
    }

    setAction(selectedAction)
    setSaving(true)
    try {
      const result = await approvalService.processApproval({
        requestId:    request.id,
        approverId:   user.uid,
        approverName: user.fullName,
        approverRole: user.role,
        action: selectedAction,
        comments:     comment.trim(),
      })
      toast.success(result.message)
      setComment('')
      setAction(null)
      onClose()
      onDone()
    } catch (err: any) {
      console.error('Approval failed:', err)
      toast.error(err.message ?? 'Action failed')
    } finally { setSaving(false) }
  }

  if (!request) return null

  return (
    <Modal open={open} onClose={onClose} title="Review Request" size="lg"
      footer={
        <div className="flex items-center gap-2 w-full">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <div className="flex-1" />
          <button
            onClick={() => { void handleSubmit('Returned') }}
            disabled={saving}
            className="btn-secondary flex items-center gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50">
            <RotateCcw size={13} /> Return
          </button>
          <button
            onClick={() => { void handleSubmit('Rejected') }}
            disabled={saving}
            className="btn-danger flex items-center gap-1.5">
            {saving && action === 'Rejected' ? <Spinner size={13} /> : <XCircle size={13} />}
            Reject
          </button>
          <button
            onClick={() => { void handleSubmit('Approved') }}
            disabled={saving}
            className="btn-primary flex items-center gap-1.5">
            {saving && action === 'Approved' ? <Spinner size={13} /> : <CheckCircle size={13} />}
            Approve
          </button>
        </div>
      }>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Request Summary */}
        <div className="space-y-4">
          <div>
            <p className="field-label mb-1">Job Order Information</p>
            <div className="space-y-2 text-sm">
              {[
                ['JO Number',      request.jobOrderNo],
                ['Requestor',      request.requestor],
                ['Product Category', request.productCategory || '—'],
                ['Dealer',         request.dealer || '—'],
                ['Branch / Store', request.branchLocation],
                ['Target Date',    request.targetDate ? formatDate(request.targetDate) : '—'],
              ].map(([l, v]) => (
                <div key={String(l)} className="flex gap-3">
                  <span className="text-slate-500 w-36 flex-shrink-0">{l}</span>
                  <span className="font-medium text-slate-800">{v as string}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Store Status */}
          {(request.storeStatus?.newBranch || request.storeStatus?.spaceAcquiring || request.storeStatus?.renovation) && (
            <div>
              <p className="field-label mb-1">Store Status</p>
              <div className="flex gap-2">
                {request.storeStatus.newBranch && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">New Branch</span>}
                {request.storeStatus.spaceAcquiring && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Space Acquiring</span>}
                {request.storeStatus.renovation && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Renovation</span>}
              </div>
            </div>
          )}

          {/* Request Details */}
          {request.requestDetails?.length > 0 && (
            <div>
              <p className="field-label mb-2">Request Details ({request.requestDetails.length} items)</p>
              <div className="space-y-1.5">
                {request.requestDetails.map((row, i) => (
                  <div key={row.id || i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold flex-shrink-0">{i+1}</span>
                    <span className="font-medium text-slate-700">{row.category}</span>
                    <span className="text-slate-500">×{row.quantity}</span>
                    <span className="text-slate-500">{row.rackType}</span>
                    {row.skus && <span className="text-slate-400">{row.skus}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comment */}
          <div>
            <label className="field-label">Comment (Optional)</label>
            <textarea value={comment} onChange={e => setComment(e.target.value.slice(0, MAX))}
              placeholder="Add your comment here..." rows={4} className="field" />
            <div className="flex justify-between mt-1">
              <p className="text-[10px] text-slate-400">* Required when rejecting</p>
              <p className="text-[10px] text-slate-400">{comment.length}/{MAX}</p>
            </div>
          </div>
        </div>

        {/* Actual Photo + Attachments */}
        <div className="space-y-4">
          {request.attachments?.actualPhoto && (
            <div>
              <p className="field-label mb-2">Actual Photo of Haier Space</p>
              <a href={request.attachments.actualPhoto.url} target="_blank" rel="noreferrer"
                className="block rounded-xl overflow-hidden border border-slate-200 hover:border-brand-400">
                <img src={request.attachments.actualPhoto.url} alt="Haier Space" className="w-full h-36 object-cover" />
              </a>
            </div>
          )}
          {request.attachments?.storePlan && (
            <div>
              <p className="field-label mb-1">Store Plan</p>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 max-h-24 overflow-y-auto">
                {request.attachments.storePlan}
              </div>
            </div>
          )}
          {request.attachments?.recommendation && (
            <div>
              <p className="field-label mb-1">Recommendation</p>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 max-h-24 overflow-y-auto">
                {request.attachments.recommendation}
              </div>
            </div>
          )}
          {!request.attachments?.actualPhoto && !request.attachments?.storePlan && !request.attachments?.recommendation && (
            <div className="text-center py-8 text-sm text-slate-400">No attachments</div>
          )}

          <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 space-y-1">
            <p className="font-semibold">Before approving, ensure:</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-600">
              <li>Request details are complete and accurate</li>
              <li>Attachments are valid and relevant</li>
              <li>Budget and resources are available</li>
              <li>Location and schedule are feasible</li>
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  )
}
