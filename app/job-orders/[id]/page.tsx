'use client'
// app/job-orders/[id]/page.tsx - Admin view of a job order request
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/shared/AppLayout'
import { StatusBadge, Spinner, Modal } from '@/components/ui/index'
import ReviewModal from '@/components/features/ReviewModal'
import { requestService } from '@/services/requestService'
import { approvalService } from '@/services/approvalService'
import { useAuthStore } from '@/stores'
import type { JobOrderRequest } from '@/types'
import { formatDate, formatDateTime, formatBytes, cn } from '@/lib/utils'
import { generateJobOrderPDF } from '@/lib/pdf'
import {
  ChevronLeft, Pencil, Download, Printer, Send,
  CheckCircle, MessageSquare, User, Phone, MapPin, Clock,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function JobOrderDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const router   = useRouter()

  const [req, setReq]         = useState<JobOrderRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [showReview, setShowReview] = useState(false)

  useEffect(() => {
    if (!id) return
    const unsub = requestService.subscribeOne(id, r => {
      setReq(r); setLoading(false)
    })
    return unsub
  }, [id])

  const handleSendComment = async () => {
    if (!comment.trim() || !user || !req) return
    setSending(true)
    try {
      await requestService.addComment(req.id, {
        userId: user.uid, userName: user.fullName, userRole: user.role,
        comment: comment.trim(),
      })
      setComment('')
      toast.success('Comment added')
    } catch { toast.error('Failed to send comment') }
    finally { setSending(false) }
  }

  const handlePDF = async () => {
    if (!req) return
    try { await generateJobOrderPDF(req, user?.department) }
    catch { toast.error('PDF generation failed') }
  }

  const isAdmin    = user?.role === 'it_admin' || user?.role === 'marketing_manager'
  const canApprove = req?.status === 'For Approval' && (
    user?.role === 'it_admin' || user?.role === 'sales_director' ||
    user?.role === 'pm' || user?.role === 'marketing_manager' || user?.role === 'approver'
  )

  if (loading) return (
    <AppLayout><div className="flex items-center justify-center py-20"><Spinner size={28}/></div></AppLayout>
  )
  if (!req) return (
    <AppLayout><div className="text-center py-20 text-slate-500">Request not found.</div></AppLayout>
  )

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/job-orders')} className="btn-icon">
              <ChevronLeft size={18}/>
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-xl font-mono text-slate-800">{req.jobOrderNo}</span>
                <StatusBadge status={req.status} type="request"/>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Submitted by {req.requestor} · {formatDateTime(req.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePDF} className="btn-secondary btn-sm flex items-center gap-1.5">
              <Download size={13}/> PDF
            </button>
            {isAdmin && (
              <Link href={`/job-orders/${req.id}/edit`} className="btn-secondary btn-sm flex items-center gap-1.5">
                <Pencil size={13}/> Edit
              </Link>
            )}
            {canApprove && (
              <button onClick={() => setShowReview(true)} className="btn-primary flex items-center gap-2">
                <CheckCircle size={14}/> Review & Approve
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Main content */}
          <div className="md:col-span-2 space-y-5">
            {/* Basic Information */}
            <div className="card-pad space-y-4">
              <div className="flex items-center justify-between">
                <p className="sec-title">Basic Information</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['JO Number',       req.jobOrderNo],
                  ['Date',            req.date ? formatDate(req.date) : '—'],
                  ['Requestor',       req.requestor],
                  ['Product Category',req.productCategory || '—'],
                  ['Dealer',          req.dealer || '—'],
                  ['Branch / Store',  req.branchLocation],
                  ['Target Date',     req.targetDate ? formatDate(req.targetDate) : '—'],
                  ['Remarks',         req.remarks || '—'],
                ].map(([l, v]) => (
                  <div key={String(l)}>
                    <p className="field-label">{l}</p>
                    <p className="font-medium text-slate-700">{v as string}</p>
                  </div>
                ))}
              </div>
              {(req.storeStatus?.newBranch || req.storeStatus?.spaceAcquiring || req.storeStatus?.renovation) && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="field-label mb-1.5">Store Status</p>
                  <div className="flex gap-2">
                    {req.storeStatus.newBranch && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">New Branch</span>}
                    {req.storeStatus.spaceAcquiring && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">Space Acquiring</span>}
                    {req.storeStatus.renovation && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Renovation</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Sales Evaluation */}
            {(req.salesEvaluation?.averageMonthlySellOut || req.salesEvaluation?.averageSellIn) && (
              <div className="card-pad space-y-3">
                <p className="sec-title">Sales Evaluation</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  {[
                    ['Ave. Monthly Sell-Out', req.salesEvaluation.averageMonthlySellOut || '—'],
                    ['Ave. Sell-In Data',     req.salesEvaluation.averageSellIn || '—'],
                    ['Forecast Monthly Sell-Out', req.salesEvaluation.forecastMonthlySellOut || '—'],
                  ].map(([l,v]) => (
                    <div key={l}><p className="field-label">{l}</p><p className="font-medium text-slate-700">{v}</p></div>
                  ))}
                </div>
              </div>
            )}

            {/* Request Details rows */}
            {req.requestDetails?.length > 0 && (
              <div className="card-pad">
                <p className="sec-title mb-3">Request Details ({req.requestDetails.length} items)</p>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {['#','Category','Quantity','Type of Racks','Measurement','SKUs','Remarks'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-slate-500 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {req.requestDetails.map((row, i) => (
                        <tr key={row.id || i} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-400">{i+1}</td>
                          <td className="px-3 py-2 font-medium text-slate-700">{row.category}</td>
                          <td className="px-3 py-2 text-slate-600">{row.quantity}</td>
                          <td className="px-3 py-2 text-slate-600">{row.rackType}</td>
                          <td className="px-3 py-2 text-slate-500">{row.measurement||'—'}</td>
                          <td className="px-3 py-2 text-slate-500">{row.skus||'—'}</td>
                          <td className="px-3 py-2 text-slate-500">{row.remarks||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Attachments */}
            {(req.attachments?.actualPhoto || req.attachments?.storePlan || req.attachments?.recommendation) && (
              <div className="card-pad">
                <p className="sec-title mb-3">Attachments</p>
                <div className="grid grid-cols-3 gap-4">
                  {req.attachments.actualPhoto && (
                    <div>
                      <p className="field-label mb-2">Actual Photo of Haier Space</p>
                      <a href={req.attachments.actualPhoto.url} target="_blank" rel="noreferrer"
                        className="block rounded-xl overflow-hidden border border-slate-200 hover:border-brand-400">
                        <img src={req.attachments.actualPhoto.url} alt="Haier Space" className="w-full h-28 object-cover"/>
                      </a>
                    </div>
                  )}
                  {req.attachments.storePlan && (
                    <div>
                      <p className="field-label mb-2">Store Plan</p>
                      <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 leading-relaxed">{req.attachments.storePlan}</div>
                    </div>
                  )}
                  {req.attachments.recommendation && (
                    <div>
                      <p className="field-label mb-2">Recommendation</p>
                      <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 leading-relaxed">{req.attachments.recommendation}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Approver workflow */}
            {req.approvers && req.approvers.length > 0 && (
              <div className="card-pad">
                <p className="sec-title mb-5">Approval Flow</p>
                <div className="flex items-start">
                  {req.approvers.map((a, i) => (
                    <div key={i} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center text-center gap-1.5 min-w-[80px]">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center border-2',
                          a.action === 'Approved' ? 'bg-green-50 border-green-400'
                          : a.action === 'Rejected' ? 'bg-red-50 border-red-400'
                          : 'bg-slate-50 border-slate-200')}>
                          <CheckCircle size={16} className={a.action === 'Approved' ? 'text-green-500' : a.action === 'Rejected' ? 'text-red-500' : 'text-slate-300'}/>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-700 leading-tight">{a.approverName || a.approverRole}</p>
                          <p className={cn('text-[9px] font-medium mt-0.5',
                            a.action === 'Approved' ? 'text-green-600' : a.action === 'Rejected' ? 'text-red-600' : 'text-slate-400')}>{a.action}</p>
                        </div>
                      </div>
                      {i < req.approvers.length - 1 && (
                        <div className={cn('flex-1 h-0.5 mx-1 -mt-5', a.action === 'Approved' ? 'bg-green-300' : 'bg-slate-200')}/>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="card-pad space-y-4">
              <p className="sec-title">Comments ({req.comments?.length ?? 0})</p>
              {!req.comments?.length ? (
                <p className="text-sm text-slate-400 text-center py-4">No comments yet</p>
              ) : (
                <div className="space-y-3">
                  {req.comments.map(c => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                        {c.userName.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-700">{c.userName}</span>
                          <span className="text-[10px] text-slate-400">{formatDateTime(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-2.5 border border-slate-100">{c.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <input value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Add a comment…" className="field flex-1"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment() }}}/>
                <button onClick={handleSendComment} disabled={sending || !comment.trim()}
                  className="btn-primary flex items-center gap-1.5">
                  {sending ? <Spinner size={13}/> : <Send size={13}/>} Send
                </button>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* Status history */}
            <div className="card-pad">
              <p className="sec-title mb-4">Status History</p>
              {!req.activityLog?.length ? (
                <p className="text-xs text-slate-400">No history</p>
              ) : (
                <div className="space-y-0">
                  {req.activityLog.map((log, i) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <CheckCircle size={12} className="text-white"/>
                        </div>
                        {i < req.activityLog.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 mt-0.5 min-h-[20px]"/>}
                      </div>
                      <div className="pb-3 min-w-0">
                        <p className="text-[10px] text-slate-400">{formatDateTime(log.timestamp)}</p>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">{log.action}</p>
                        <p className="text-xs text-slate-500">{log.userName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Requester info */}
            <div className="card-pad space-y-3 text-sm">
              <p className="sec-title">Requestor</p>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {req.requestor.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{req.requestor}</p>
                  <p className="text-xs text-slate-400">{req.department}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MessageSquare size={12}/> {req.requestedBy}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone size={12}/> {req.contactNumber}
                </div>
              </div>
            </div>

            {/* Approval comments */}
            {req.approvers?.some(a => a.comments) && (
              <div className="card-pad space-y-2">
                <p className="sec-title">Approver Comments</p>
                {req.approvers.filter(a => a.comments).map((a, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-700">{a.approverName}</span>
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold',
                        a.action === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>{a.action}</span>
                    </div>
                    <p className="text-slate-600 italic">{a.comments}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ReviewModal
        open={showReview}
        onClose={() => setShowReview(false)}
        request={req}
        onDone={() => { setShowReview(false); toast.success('Action recorded') }}
      />
    </AppLayout>
  )
}
