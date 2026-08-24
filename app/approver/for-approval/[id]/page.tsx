'use client'
// app/approver/for-approval/[id]/page.tsx
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ApproverLayout from '@/components/shared/ApproverLayout'
import { StatusBadge, Spinner } from '@/components/ui/index'
import ReviewModal from '@/components/features/ReviewModal'
import { requestService } from '@/services/requestService'
import { useAuthStore } from '@/stores'
import type { JobOrderRequest } from '@/types'
import { formatDate, formatDateTime, formatBytes, cn } from '@/lib/utils'
import {
  ChevronLeft, CheckCircle, XCircle, Clock, Printer,
  Download, Paperclip, MessageSquare, User, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// Approval workflow step component
function WorkflowStep({
  label, name, role, status, date, isLast,
}: {
  label: string; name?: string; role: string; status: 'done' | 'current' | 'pending'; date?: string; isLast?: boolean
}) {
  const icons = {
    done:    <CheckCircle size={16} className="text-green-600" />,
    current: <Clock size={16} className="text-amber-500" />,
    pending: <Clock size={16} className="text-slate-300" />,
  }
  const borders = {
    done:    'border-green-200 bg-green-50',
    current: 'border-amber-200 bg-amber-50',
    pending: 'border-slate-200 bg-slate-50',
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={cn('w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0', borders[status])}>
          {icons[status]}
        </div>
        {!isLast && <div className="w-0.5 h-8 bg-slate-200 mt-1" />}
      </div>
      <div className="pb-6">
        <p className="text-xs font-semibold text-slate-800">{role}</p>
        {name && <p className="text-xs text-slate-500 mt-0.5">{name}</p>}
        {date && <p className="text-[10px] text-slate-400 mt-1">{date}</p>}
        {status === 'current' && (
          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            Current Approver
          </span>
        )}
        {status === 'pending' && (
          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 font-medium">
            Pending
          </span>
        )}
      </div>
    </div>
  )
}

export default function ApproverRequestDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const router   = useRouter()

  const [req, setReq]           = useState<JobOrderRequest | null>(null)
  const [loading, setLoading]   = useState(true)
  const [showReview, setShowReview] = useState(false)

  useEffect(() => {
    if (!id) return
    const unsub = requestService.subscribeOne(id, r => {
      setReq(r); setLoading(false)
    })
    return unsub
  }, [id])

  const handlePrint = () => {
    window.print()
    toast.success('Opening print dialog…')
  }

  const handleDownloadPDF = async () => {
    if (!req) return
    try {
      const { default: jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const m   = 16

      doc.setFontSize(16); doc.setFont('helvetica','bold')
      doc.text('Marketing Racks Job Order Request System', m, 18)
      doc.setFontSize(10); doc.setFont('helvetica','normal')
      doc.text(`Job Order: ${req.jobOrderNo}  |  Status: ${req.status}`, m, 26)
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}`, m, 32)
      doc.line(m, 36, 194, 36)

      let y = 42
      doc.setFont('helvetica','bold'); doc.setFontSize(10)
      doc.text('REQUEST DETAILS', m, y); y += 5
      doc.line(m, y, 194, y); y += 5

      const fields = [
        ['JO Number', req.jobOrderNo], ['Requestor', req.requestor],
        ['Product Category', req.productCategory || '—'], ['Dealer', req.dealer || '—'],
        ['Branch / Store', req.branchLocation], ['Target Date', req.targetDate ? formatDate(req.targetDate) : '—'],
      ]
      doc.setFont('helvetica','normal'); doc.setFontSize(9)
      fields.forEach(([l, v]) => {
        doc.setTextColor(100,116,139); doc.text(l + ':', m, y)
        doc.setTextColor(0,0,0); doc.text(String(v ?? '—'), m + 50, y)
        y += 6
      })

      if (req.approvers.length > 0) {
        doc.setFont('helvetica','bold'); doc.setFontSize(10)
        doc.text('APPROVAL HISTORY', m, y); y += 5
        doc.line(m, y, 194, y); y += 3
        autoTable(doc, {
          startY: y,
          head: [['Approver','Role','Action','Date','Comments']],
          body: req.approvers.map(a => [
            a.approverName, a.approverRole, a.action,
            a.timestamp ? formatDate(a.timestamp) : '—', a.comments ?? '—',
          ]),
          headStyles: { fillColor: [26,32,53] }, styles: { fontSize: 8 }, margin: { left: m },
        })
      }

      doc.save(`JobOrder-${req.jobOrderNo}.pdf`)
      toast.success('PDF downloaded!')
    } catch { toast.error('PDF generation failed') }
  }

  if (loading) return (
    <ApproverLayout>
      <div className="flex items-center justify-center py-20"><Spinner size={28} /></div>
    </ApproverLayout>
  )

  if (!req) return (
    <ApproverLayout>
      <div className="text-center py-20 text-slate-500">Request not found.</div>
    </ApproverLayout>
  )

  const canApprove = req.status === 'For Approval'

  // Build workflow steps
  const WORKFLOW_ROLES = [
    { role: 'Sales Director (Local/Expert)', key: 'sales_director' },
     { role: 'Sellout', key: 'sellout' },
    { role: 'PM (Expat)',                    key: 'pm'             },
    { role: 'Marketing Manager',             key: 'marketing_manager' },
    { role: 'Marketing Director',             key: 'marketing_director' },
  ]

  return (
    <ApproverLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="btn-icon"><ChevronLeft size={18} /></button>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Request Details</p>
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-xl font-mono text-slate-800">{req.jobOrderNo}</span>
                <StatusBadge status={req.status} type="request" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadPDF} className="btn-secondary btn-sm flex items-center gap-1.5">
              <Download size={13} /> PDF
            </button>
            {canApprove && (
              <button onClick={() => setShowReview(true)}
                className="btn-primary flex items-center gap-2">
                <CheckCircle size={14} /> Review & Approve
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Left: Request Info */}
          <div className="md:col-span-2 space-y-5">
            {/* Main card */}
            <div className="card-pad space-y-4">
              <div>
                <p className="font-semibold text-slate-800 text-base">{req.productCategory || req.jobOrderNo}</p>
                <p className="text-xs text-slate-400 mt-0.5">Requested on {formatDateTime(req.createdAt)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'JO Number',        value: req.jobOrderNo           },
                  { label: 'Requestor',         value: req.requestor            },
                  { label: 'Product Category',  value: req.productCategory || '—' },
                  { label: 'Dealer',            value: req.dealer || '—'        },
                  { label: 'Branch / Store',    value: req.branchLocation       },
                  { label: 'Target Date',       value: req.targetDate ? formatDate(req.targetDate) : '—' },
                  { label: 'Priority',          value: req.priority             },
                  { label: 'Department',        value: req.department           },
                ].map(f => (
                  <div key={f.label}>
                    <p className="field-label">{f.label}</p>
                    <p className="font-medium text-slate-700">{f.value}</p>
                  </div>
                ))}
                <div className="col-span-2">
                  <p className="field-label">Remarks</p>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {req.remarks || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Request Details Table */}
            {req.requestDetails?.length > 0 && (
              <div className="card-pad">
                <p className="sec-title mb-3">Request Details</p>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>{['#','Category','Qty','Type of Rack','Measurement','SKUs','Remarks'].map(h=><th key={h} className="px-3 py-2.5 text-left text-slate-500 font-semibold">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {req.requestDetails.map((row,i)=>(
                        <tr key={row.id||i} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-400">{i+1}</td>
                          <td className="px-3 py-2 font-medium text-slate-700">{row.category}</td>
                          <td className="px-3 py-2">{row.quantity}</td>
                          <td className="px-3 py-2">{row.rackType}</td>
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
            {req.attachments?.actualPhoto && (
              <div className="card-pad">
                <p className="sec-title mb-3">Attachments</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="field-label mb-2">Actual Photo of Haier Space</p>
                    <a href={req.attachments.actualPhoto.url} target="_blank" rel="noreferrer"
                      className="block rounded-xl overflow-hidden border border-slate-200">
                      <img src={req.attachments.actualPhoto.url} alt="Haier Space" className="w-full h-28 object-cover" />
                    </a>
                  </div>
                  {req.attachments.storePlan && (
                    <div>
                      <p className="field-label mb-2">Store Plan</p>
                      <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">{req.attachments.storePlan}</div>
                    </div>
                  )}
                  {req.attachments.recommendation && (
                    <div>
                      <p className="field-label mb-2">Recommendation</p>
                      <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">{req.attachments.recommendation}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Approver Workflow Visual */}
            <div className="card-pad">
              <p className="sec-title mb-5">Approver Workflow</p>
              <div className="flex items-start gap-0">
                {WORKFLOW_ROLES.map((step, i) => {
                  const approverEntry = req.approvers.find(a => a.approverRole === step.key as any)
                  const status = approverEntry?.action === 'Approved' ? 'done'
                    : approverEntry?.action === 'Pending' || (req.status === 'For Approval' && !approverEntry) ? 'current'
                    : 'pending'
                  return (
                    <div key={step.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center text-center gap-1.5">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center border-2',
                          status === 'done'    ? 'bg-green-50 border-green-400' :
                          status === 'current' ? 'bg-amber-50 border-amber-400' : 'bg-slate-50 border-slate-200'
                        )}>
                          {status === 'done' ? (
                            <CheckCircle size={18} className="text-green-500" />
                          ) : (
                            <Clock size={18} className={status === 'current' ? 'text-amber-500' : 'text-slate-300'} />
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-700">{step.role}</p>
                          {approverEntry?.approverName && (
                            <p className="text-[10px] text-slate-400">{approverEntry.approverName}</p>
                          )}
                          <p className={cn('text-[10px] font-medium mt-0.5',
                            status === 'done' ? 'text-green-600' : status === 'current' ? 'text-amber-600' : 'text-slate-400')}>
                            {status === 'done' ? 'Approved' : status === 'current' ? 'Current Approver' : 'Pending'}
                          </p>
                        </div>
                      </div>
                      {i < WORKFLOW_ROLES.length - 1 && (
                        <div className={cn('flex-1 h-0.5 mx-2 -mt-6',
                          status === 'done' ? 'bg-green-300' : 'bg-slate-200')} />
                      )}
                    </div>
                  )
                })}
                {/* Completed */}
                <div className="flex items-center flex-none">
                  <div className={cn('h-0.5 w-8 mx-2 -mt-6',
                    req.status === 'Completed' ? 'bg-green-300' : 'bg-slate-200')} />
                  <div className="flex flex-col items-center text-center gap-1.5">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center border-2',
                      req.status === 'Completed' ? 'bg-green-50 border-green-400' : 'bg-slate-50 border-slate-200')}>
                      <CheckCircle size={18} className={req.status === 'Completed' ? 'text-green-500' : 'text-slate-300'} />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-700">Completed</p>
                  </div>
                </div>
              </div>

              {/* Reject / Approve buttons */}
              {canApprove && (
                <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
                  <button onClick={() => setShowReview(true)}
                    className="btn-secondary border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-1.5">
                    <XCircle size={14} /> Reject
                  </button>
                  <button onClick={() => setShowReview(true)}
                    className="btn-primary flex items-center gap-1.5">
                    <CheckCircle size={14} /> Approve
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Status History */}
          <div className="space-y-5">
            <div className="card-pad">
              <p className="sec-title mb-4">Status History</p>
              <div className="space-y-0">
                {req.activityLog.length === 0 ? (
                  <p className="text-xs text-slate-400">No history yet</p>
                ) : req.activityLog.map((log, i) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={11} className="text-white" />
                      </div>
                      {i < req.activityLog.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 mt-0.5 min-h-[20px]" />}
                    </div>
                    <div className="pb-4 min-w-0">
                      <p className="text-[10px] text-slate-400">{formatDateTime(log.timestamp)}</p>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">{log.action}</p>
                      <p className="text-xs text-slate-500">{log.userName}</p>
                      {log.details && log.details !== log.action && (
                        <p className="text-[10px] text-slate-400 mt-0.5 italic">{log.details}</p>
                      )}
                    </div>
                  </div>
                ))}
                {/* Pending states */}
                {['For Approval','For Processing','Completed']
                  .filter(s => !req.activityLog.some(l => l.action.toLowerCase().includes(s.toLowerCase())))
                  .map(s => (
                    <div key={s} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-slate-200" />
                      </div>
                      <div className="pb-4">
                        <p className="text-xs text-slate-300 font-medium">Pending</p>
                        <p className="text-xs text-slate-300">{s}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Requester info */}
            <div className="card-pad space-y-3">
              <p className="sec-title">Request Info</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User size={13} className="text-slate-400" />
                  <span className="text-slate-700">{req.requestor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare size={13} className="text-slate-400" />
                  <span className="text-xs text-slate-500">{req.requesterEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Dept:</span>
                  <span className="text-xs font-medium text-slate-700">{req.department}</span>
                </div>
              </div>
            </div>

            {/* Approval comments */}
            {req.approvers.filter(a => a.comments).length > 0 && (
              <div className="card-pad space-y-3">
                <p className="sec-title">Approval Comments</p>
                <div className="space-y-2">
                  {req.approvers.filter(a => a.comments).map((a, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-700">{a.approverName}</span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold',
                          a.action === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                          {a.action}
                        </span>
                      </div>
                      <p className="text-slate-600 italic">{a.comments}</p>
                      {a.timestamp && <p className="text-slate-400 mt-1">{formatDate(a.timestamp)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReviewModal
        open={showReview}
        onClose={() => setShowReview(false)}
        request={req}
        onDone={() => {
          setShowReview(false)
          router.push('/approver/for-approval')
        }}
      />
    </ApproverLayout>
  )
}
