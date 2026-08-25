// 'use client'
// // app/employee/my-requests/[id]/page.tsx
// import { useEffect, useState, useRef } from 'react'
// import { useParams, useRouter, useSearchParams } from 'next/navigation'
// import EmployeeLayout from '@/components/shared/EmployeeLayout'
// import { StatusBadge, Spinner } from '@/components/ui/index'
// import { requestService } from '@/services/requestService'
// import { useAuthStore } from '@/stores'
// import type { JobOrderRequest } from '@/types'
// import { formatDate, formatDateTime, formatBytes } from '@/lib/utils'
// import {
//   ChevronLeft, Printer, Download, X, CheckCircle,
//   Clock, AlertCircle, FileText, Phone, User, MapPin
// } from 'lucide-react'
// import Link from 'next/link'
// import { toast } from 'sonner'
// import { cn } from '@/lib/utils'
// import { Suspense } from 'react'

// function RequestDetailContent() {
//   const { id }       = useParams<{ id: string }>()
//   const searchParams = useSearchParams()
//   const showPrint    = searchParams.get('print') === '1'
//   const { user }     = useAuthStore()
//   const router       = useRouter()
//   const printRef     = useRef<HTMLDivElement>(null)

//   const [req, setReq]         = useState<JobOrderRequest | null>(null)
//   const [loading, setLoading] = useState(true)
//   const [cancelling, setCancelling] = useState(false)
//   const [comment, setComment] = useState('')
//   const [printMode, setPrintMode] = useState(showPrint)

//   useEffect(() => {
//     if (!id) return
//     const unsub = requestService.subscribeOne(id, r => {
//       setReq(r); setLoading(false)
//     })
//     return unsub
//   }, [id])

//   const handleCancel = async () => {
//     if (!req || !user) return
//     if (!confirm('Cancel this request? This action cannot be undone.')) return
//     setCancelling(true)
//     try {
//       await requestService.update(req.id, {
//         status: 'Cancelled',
//         activityLog: [
//           ...(req.activityLog ?? []),
//           { id: crypto.randomUUID(), action:'Request Cancelled', userId:user.uid, userName:user.fullName, details:'Cancelled by requester', timestamp: new Date().toISOString() }
//         ]
//       })
//       toast.success('Request cancelled')
//       router.push('/employee/my-requests')
//     } catch { toast.error('Failed') }
//     finally { setCancelling(false) }
//   }

//   const handlePrint = () => {
//     const printContent = printRef.current
//     if (!printContent) return
//     const w = window.open('', '_blank')
//     if (!w) return
//     w.document.write(`
//       <!DOCTYPE html><html><head>
//       <title>Job Order – ${req?.jobOrderNo}</title>
//       <style>
//         * { box-sizing: border-box; margin: 0; padding: 0; }
//         body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; }
//         .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a2035; padding-bottom: 16px; margin-bottom: 20px; }
//         .logo-area { display: flex; align-items: center; gap: 16px; }
//         .logo-text { font-size: 28px; font-weight: 900; color: #1a2035; }
//         .center-title { text-align: center; }
//         .center-title h1 { font-size: 18px; font-weight: 700; }
//         .center-title p { font-size: 11px; color: #666; }
//         .job-box { border: 1px solid #ccc; padding: 12px; text-align: right; min-width: 160px; font-size: 11px; }
//         .job-box strong { display: block; font-size: 16px; font-weight: 700; }
//         .status-badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-weight: 700; font-size: 12px; }
//         .status-approved { background: #dcfce7; color: #16a34a; }
//         .section { margin-bottom: 20px; }
//         .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; color: #374151; }
//         .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
//         .field-row { display: flex; gap: 8px; margin-bottom: 6px; }
//         .field-label { color: #6b7280; min-width: 140px; }
//         .field-value { font-weight: 500; }
//         .attachments { display: flex; flex-wrap: wrap; gap: 12px; }
//         .att-item { text-align: center; width: 100px; }
//         .att-img { width: 100px; height: 70px; object-fit: cover; border: 1px solid #e5e7eb; border-radius: 6px; }
//         .att-name { font-size: 9px; color: #6b7280; margin-top: 3px; word-break: break-all; }
//         .approval-table { width: 100%; border-collapse: collapse; font-size: 11px; }
//         .approval-table th { background: #f3f4f6; text-align: left; padding: 6px 10px; border: 1px solid #e5e7eb; font-size: 10px; text-transform: uppercase; }
//         .approval-table td { padding: 6px 10px; border: 1px solid #e5e7eb; }
//         .sign-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 32px; }
//         .sign-block { text-align: left; }
//         .sign-line { border-bottom: 1px solid #000; margin-bottom: 6px; height: 40px; }
//         .footer-text { text-align: center; font-size: 9px; color: #9ca3af; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
//         @media print { @page { size: A4 portrait; margin: 16mm; } }
//       </style>
//       </head><body>${printContent.innerHTML}</body></html>
//     `)
//     w.document.close()
//     w.focus()
//     setTimeout(() => { w.print(); }, 500)
//   }

//   const handleDownloadPDF = async () => {
//     if (!req) return
//     try {
//       const { default: jsPDF } = await import('jspdf')
//       const autoTable = (await import('jspdf-autotable')).default
//       const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
//       const margin = 16

//       // Header
//       doc.setFontSize(22); doc.setFont('helvetica','bold')
//       doc.text('Haier', margin, 22)
//       doc.setFontSize(16); doc.text('JOB ORDER', 105, 18, { align:'center' })
//       doc.setFontSize(9); doc.setFont('helvetica','normal')
//       doc.text('MARKETING RACKS JOB ORDER REQUEST SYSTEM', 105, 24, { align:'center' })

//       // Job Order box
//       doc.setFontSize(9)
//       doc.rect(148, 12, 46, 28)
//       doc.setFont('helvetica','bold'); doc.text('Job Order No.', 150, 18)
//       doc.setFontSize(12); doc.text(req.jobOrderNo, 150, 24)
//       doc.setFontSize(9); doc.setFont('helvetica','normal')
//       doc.text(`Date: ${formatDate(req.createdAt)}`, 150, 30)
//       doc.text(`Status: ${req.status.toUpperCase()}`, 150, 36)

//       doc.line(margin, 43, 194, 43)

//       // Request Info
//       let y = 50
//       doc.setFont('helvetica','bold'); doc.setFontSize(10)
//       doc.text('REQUEST INFORMATION', margin, y); y += 6
//       doc.line(margin, y, 194, y); y += 5

//       const reqFields = [
//         ['Requestor', req.requestor],
//         ['Product Category', req.productCategory || '—'],
//         ['Dealer', req.dealer || '—'],
//         ['Branch / Store', req.branchLocation],
//         ['Target Date', req.targetDate ? formatDate(req.targetDate) : '—'],
//         ['Priority',     req.priority],
//       ]
//       doc.setFont('helvetica','normal'); doc.setFontSize(9)
//       reqFields.forEach(([l, v]) => {
//         doc.setTextColor(107,114,128); doc.text(l + ':', margin, y)
//         doc.setTextColor(0,0,0); doc.text(String(v), margin + 50, y)
//         y += 6
//       })
//       doc.setTextColor(107,114,128); doc.text('Description:', margin, y)
//       y += 5
//       doc.setTextColor(0,0,0)
//       const descLines = doc.splitTextToSize(req.remarks || '', 90)
//       doc.text(descLines, margin + 5, y); y += descLines.length * 5 + 4

//       doc.setTextColor(107,114,128); doc.text('Contact Person:', margin, y)
//       doc.setTextColor(0,0,0); doc.text(req.contactPerson || '—', margin + 50, y); y += 6
//       doc.setTextColor(107,114,128); doc.text('Contact Number:', margin, y)
//       doc.setTextColor(0,0,0); doc.text(req.contactNumber || '—', margin + 50, y); y += 10

//       // Approver flow
//       if (req.approvers.length > 0) {
//         doc.setFont('helvetica','bold'); doc.setFontSize(10)
//         doc.text('APPROVER FLOW HISTORY', margin, y); y += 5
//         doc.line(margin, y, 194, y); y += 3
//         autoTable(doc, {
//           startY: y,
//           head: [['Step','Approver','Role','Action','Date & Time','Remarks']],
//           body: req.approvers.map((a, i) => [
//             i + 1, a.approverName, a.approverRole, a.action,
//             a.timestamp ? formatDateTime(a.timestamp) : '—', a.comments ?? 'Approved'
//           ]),
//           headStyles: { fillColor:[26,32,53], fontSize:8 },
//           styles: { fontSize:8 },
//           margin: { left:margin },
//         })
//         y = ((doc as any).lastAutoTable?.finalY ?? y + 22) + 8
//       }

//       // Signatures
//       doc.setFont('helvetica','normal'); doc.setFontSize(9)
//       doc.text('Prepared by:', margin, y + 5)
//       doc.text('Noted by:', 105, y + 5)
//       doc.line(margin, y + 20, 80, y + 20)
//       doc.line(105, y + 20, 180, y + 20)
//       doc.setFont('helvetica','bold')
//       doc.text(req.requestor, margin, y + 26)
//       doc.setFont('helvetica','normal')
//       doc.text(user?.department ?? '', margin, y + 31)
//       if (req.approvers.length > 0) {
//         const lastApprover = req.approvers[req.approvers.length - 1]
//         doc.setFont('helvetica','bold')
//         doc.text(lastApprover.approverName, 105, y + 26)
//         doc.setFont('helvetica','normal')
//         doc.text(lastApprover.approverRole, 105, y + 31)
//       }

//       doc.setFontSize(8); doc.setTextColor(150,150,150)
//       doc.text('This is a system generated document. No signature required.', 105, 285, { align:'center' })

//       doc.save(`JobOrder-${req.jobOrderNo}.pdf`)
//       toast.success('PDF downloaded!')
//     } catch (err) {
//       toast.error('PDF generation failed')
//     }
//   }

//   if (loading) return (
//     <EmployeeLayout>
//       <div className="flex items-center justify-center py-20"><Spinner size={28} /></div>
//     </EmployeeLayout>
//   )
//   if (!req) return (
//     <EmployeeLayout>
//       <div className="text-center py-20 text-slate-500">Request not found.</div>
//     </EmployeeLayout>
//   )

//   const canCancel = req.status === 'For Approval' && req.requestedBy === user?.uid

//   const statusTimeline = [
//     { label:'Submitted',     done:true,  note:req.requestor },
//     { label:'For Approval',  done:req.status !== 'For Approval' || true, note:'Pending' },
//     { label:'For Processing',done:req.status === 'In Progress' || req.status === 'Completed', note:'Pending' },
//     { label:'Completed',     done:req.status === 'Completed', note:'Pending' },
//   ]

//   return (
//     <EmployeeLayout>
//       <div className="max-w-5xl mx-auto space-y-5">
//         {/* Topbar */}
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <button onClick={() => router.push('/employee/my-requests')} className="btn-icon"><ChevronLeft size={18} /></button>
//             <div>
//               <p className="text-xs text-slate-500">Request Details</p>
//               {req.status === 'Completed' && <span className="text-[11px] text-green-600 font-semibold">(Approved)</span>}
//             </div>
//           </div>
//           <div className="flex items-center gap-2">
//             {(req.status === 'Completed' || req.status === 'In Progress') && (
//               <>
//                 <button onClick={handlePrint} className="btn-primary btn-sm flex items-center gap-1.5">
//                   <Printer size={13} /> Print Job Order
//                 </button>
//                 <button onClick={handleDownloadPDF} className="btn-secondary btn-sm flex items-center gap-1.5">
//                   <Download size={13} /> Download PDF
//                 </button>
//               </>
//             )}
//             {canCancel && (
//               <button onClick={handleCancel} disabled={cancelling}
//                 className="btn-danger btn-sm flex items-center gap-1.5">
//                 {cancelling ? <Spinner size={13} /> : <X size={13} />}
//                 Cancel Request
//               </button>
//             )}
//           </div>
//         </div>

//         <div className="grid md:grid-cols-3 gap-5">
//           {/* Main info */}
//           <div className="md:col-span-2 space-y-5">
//             {/* Header card */}
//             <div className="card-pad">
//               <div className="flex items-start justify-between mb-4">
//                 <div>
//                   <div className="flex items-center gap-2.5 mb-1">
//                     <span className="font-bold text-xl font-mono text-slate-800">{req.jobOrderNo}</span>
//                     <StatusBadge status={req.status} type="request" />
//                   </div>
//                   <p className="font-semibold text-slate-700">{req.productCategory || req.jobOrderNo}</p>
//                   <p className="text-xs text-slate-400 mt-1">Requested on {formatDateTime(req.createdAt)}</p>
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-3 text-sm">
//                 {[
//                   { label:'Request No.',        value:req.jobOrderNo },
//                   { label:'Requestor',          value:req.requestor },
//                   { label:'Product Category',   value:req.productCategory || '—' },
//                   { label:'Branch / Store',     value:req.branchLocation },
//                   { label:'Target Date',        value:req.targetDate ? formatDate(req.targetDate) : '—' },
//                   { label:'Status',             value:req.status },
//                 ].map(f => (
//                   <div key={f.label}>
//                     <p className="field-label">{f.label}</p>
//                     <p className="font-medium text-slate-700">{f.value}</p>
//                   </div>
//                 ))}
//                 <div className="col-span-2">
//                   <p className="field-label">Description / Instructions</p>
//                   <p className="text-slate-700 leading-relaxed">{req.remarks || '—'}</p>
//                 </div>
//                 <div>
//                   <p className="field-label">Contact Person</p>
//                   <p className="font-medium text-slate-700">{req.contactPerson}</p>
//                 </div>
//                 <div>
//                   <p className="field-label">Contact Number</p>
//                   <p className="font-medium text-slate-700">{req.contactNumber}</p>
//                 </div>
//               </div>
//             </div>

//             {/* Attachments */}
//             {(req.attachments?.actualPhoto || req.attachments?.storePlan || req.attachments?.recommendation) && (
//               <div className="card-pad">
//                 <p className="sec-title mb-3">Attachments</p>
//                 <div className="space-y-3">
//                   {req.attachments?.actualPhoto && (
//                     <div className="border border-slate-200 rounded-xl p-3">
//                       <p className="text-xs text-slate-500 mb-2">Actual Haier Space Photo</p>
//                       <a href={req.attachments.actualPhoto.url} target="_blank" rel="noreferrer"
//                         className="block rounded-lg overflow-hidden border border-slate-200">
//                         <img src={req.attachments.actualPhoto.url} alt="Actual photo" className="w-full h-40 object-cover" />
//                       </a>
//                       <p className="text-[10px] text-slate-600 mt-1">{req.attachments.actualPhoto.name}</p>
//                     </div>
//                   )}
//                   {req.attachments?.storePlan && (
//                     <div className="border border-slate-200 rounded-xl p-3">
//                       <p className="text-xs text-slate-500 mb-2">Store Plan / Layout</p>
//                       <p className="text-sm text-slate-700 font-mono bg-slate-50 p-2 rounded break-words text-blue-600 underline">
//                         <a href={req.attachments.storePlan} target="_blank" rel="noreferrer">{req.attachments.storePlan}</a>
//                       </p>
//                     </div>
//                   )}
//                   {req.attachments?.recommendation && (
//                     <div className="border border-slate-200 rounded-xl p-3">
//                       <p className="text-xs text-slate-500 mb-2">Recommendation</p>
//                       <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">{req.attachments.recommendation}</p>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Status History */}
//           <div className="card-pad h-fit">
//             <p className="sec-title mb-4">Status History</p>
//             <div className="space-y-4">
//               {req.activityLog.length === 0 ? (
//                 <p className="text-xs text-slate-400">No history yet</p>
//               ) : req.activityLog.map((log, i) => (
//                 <div key={log.id} className="flex gap-3">
//                   <div className="flex flex-col items-center">
//                     <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
//                       <Check size={11} className="text-white" />
//                     </div>
//                     {i < req.activityLog.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 mt-1 min-h-[20px]" />}
//                   </div>
//                   <div className="pb-3 min-w-0">
//                     <p className="text-xs font-semibold text-slate-400">{formatDateTime(log.timestamp)}</p>
//                     <p className="text-sm font-semibold text-slate-800 mt-0.5">{log.action}</p>
//                     <p className="text-xs text-slate-500">{log.userName}</p>
//                   </div>
//                 </div>
//               ))}
//               {/* Pending steps */}
//               {['For Approval','For Processing','Completed'].filter(s => !req.activityLog.some(l => l.action.includes(s))).map(s => (
//                 <div key={s} className="flex gap-3">
//                   <div className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center flex-shrink-0">
//                     <div className="w-2 h-2 rounded-full bg-slate-200" />
//                   </div>
//                   <div className="pb-3">
//                     <p className="text-sm font-semibold text-slate-300">Pending</p>
//                     <p className="text-xs text-slate-300">{s}</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* Hidden Print Template */}
//         <div style={{ display: 'none' }}>
//           <div ref={printRef}>
//             <div className="header">
//               <div className="logo-area">
//                 <div className="logo-text">Haier</div>
//                 <div className="center-title">
//                   <h1>JOB ORDER</h1>
//                   <p>MARKETING RACKS JOB ORDER REQUEST SYSTEM</p>
//                 </div>
//               </div>
//               <div className="job-box">
//                 <div>Job Order No.</div>
//                 <strong>{req.jobOrderNo}</strong>
//                 <div>Date Requested</div>
//                 <div>{formatDate(req.createdAt)}</div>
//                 <div>Status</div>
//                 <div><span className="status-badge status-approved">{req.status.toUpperCase()}</span></div>
//               </div>
//             </div>

//             <div className="two-col">
//               <div className="section">
//                 <div className="section-title">REQUEST INFORMATION</div>
//                 {[
//                   ['Requestor', req.requestor],
//                   ['Product Category', req.productCategory || '—'],
//                   ['Dealer', req.dealer || '—'],
//                   ['Branch / Store', req.branchLocation],
//                   ['Target Date', req.targetDate ? formatDate(req.targetDate) : '—'],
//                   ['Priority',     req.priority],
//                   ['Remarks', req.remarks || '—'],
//                   ['Contact Person', req.contactPerson],
//                   ['Contact Number', req.contactNumber],
//                 ].map(([l, v]) => (
//                   <div key={String(l)} className="field-row">
//                     <span className="field-label">{l}</span>
//                     <span className="field-value">: {v}</span>
//                   </div>
//                 ))}
//               </div>
//               <div className="section">
//                 <div className="section-title">RACK DETAILS</div>
//                 {[
//                   ['Type of Rack',        req.requestDetails?.[0]?.rackType || '—'],
//                   ['Rack Size/Dim',    '120cm (W) x 60cm (D) x 200cm (H)'],
//                   ['Quantity',         req.requestDetails?.[0]?.quantity || '1'],
//                   ['Color / Finish',   'Black'],
//                   ['Brand / Model',    'Haier Standard Rack'],
//                   ['Category',          req.requestDetails?.[0]?.category || '—'],
//                 ].map(([l, v]) => (
//                   <div key={String(l)} className="field-row">
//                     <span className="field-label">{l}</span>
//                     <span className="field-value">: {v}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {(req.attachments?.actualPhoto || req.attachments?.storePlan || req.attachments?.recommendation) && (
//               <div className="section">
//                 <div className="section-title">ATTACHMENTS</div>
//                 <div style={{ marginTop: 12 }}>
//                   {req.attachments?.actualPhoto && (
//                     <div style={{ marginBottom: 12 }}>
//                       <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>Actual Haier Space Photo</div>
//                       <img src={req.attachments.actualPhoto.url} alt="Actual photo" style={{ width: '100%', maxWidth: '400px', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
//                       <div style={{ fontSize: 9, color: '#6b7280', marginTop: 3 }}>{req.attachments.actualPhoto.name}</div>
//                     </div>
//                   )}
//                   {req.attachments?.storePlan && (
//                     <div style={{ marginBottom: 12 }}>
//                       <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>Store Plan / Layout</div>
//                       <div style={{ fontSize: 10, color: '#0066cc', textDecoration: 'underline', fontFamily: 'monospace' }}>{req.attachments.storePlan}</div>
//                     </div>
//                   )}
//                   {req.attachments?.recommendation && (
//                     <div>
//                       <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>Recommendation</div>
//                       <div style={{ fontSize: 10, color: '#374151', lineHeight: 1.4 }}>{req.attachments.recommendation}</div>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             )}

//             {req.approvers.length > 0 && (
//               <div className="section">
//                 <div className="section-title">APPROVER FLOW HISTORY</div>
//                 <table className="approval-table">
//                   <thead>
//                     <tr>
//                       <th>Step</th><th>Approver</th><th>Role</th><th>Action</th><th>Date & Time</th><th>Remarks</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {req.approvers.map((a, i) => (
//                       <tr key={i}>
//                         <td>{i+1}</td>
//                         <td>{a.approverName}</td>
//                         <td>{a.approverRole}</td>
//                         <td>{a.action}</td>
//                         <td>{a.timestamp ? formatDateTime(a.timestamp) : '—'}</td>
//                         <td>{a.comments ?? 'Approved'}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}

//             <div className="sign-area">
//               <div className="sign-block">
//                 <div>Prepared by:</div>
//                 <div className="sign-line" />
//                 <strong>{req.requestor}</strong>
//                 <div>{user?.department ?? 'Marketing Staff'}</div>
//               </div>
//               <div className="sign-block">
//                 <div>Noted by:</div>
//                 <div className="sign-line" />
//                 <strong>{req.approvers[req.approvers.length - 1]?.approverName ?? 'Marketing Manager'}</strong>
//                 <div>{req.approvers[req.approvers.length - 1]?.approverRole ?? 'Marketing Manager'}</div>
//               </div>
//             </div>
//             <div className="footer-text">This is a system generated document. No signature required.</div>
//           </div>
//         </div>
//       </div>
//     </EmployeeLayout>
//   )
// }

// function Check({ size, className }: { size: number; className?: string }) {
//   return (
//     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
//       <polyline points="20 6 9 17 4 12" />
//     </svg>
//   )
// }

// export default function RequestDetailPage() {
//   return (
//     <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-xl bg-brand-600 animate-pulse"/></div>}>
//       <RequestDetailContent />
//     </Suspense>
//   )
// }

// 'use client'
// // app/employee/my-requests/[id]/page.tsx
// import { useEffect, useState, useRef } from 'react'
// import { useParams, useRouter, useSearchParams } from 'next/navigation'
// import EmployeeLayout from '@/components/shared/EmployeeLayout'
// import { StatusBadge, Spinner } from '@/components/ui/index'
// import { requestService } from '@/services/requestService'
// import { useAuthStore } from '@/stores'
// import type { JobOrderRequest } from '@/types'
// import { formatDate, formatDateTime, formatBytes } from '@/lib/utils'
// import {
//   ChevronLeft, Printer, Download, X, CheckCircle,
//   Clock, AlertCircle, FileText, Phone, User, MapPin
// } from 'lucide-react'
// import Link from 'next/link'
// import { toast } from 'sonner'
// import { cn } from '@/lib/utils'
// import { Suspense } from 'react'

// function RequestDetailContent() {
//   const { id }       = useParams<{ id: string }>()
//   const searchParams = useSearchParams()
//   const showPrint    = searchParams.get('print') === '1'
//   const { user }     = useAuthStore()
//   const router       = useRouter()
//   const printRef     = useRef<HTMLDivElement>(null)

//   const [req, setReq]         = useState<JobOrderRequest | null>(null)
//   const [loading, setLoading] = useState(true)
//   const [cancelling, setCancelling] = useState(false)
//   const [comment, setComment] = useState('')
//   const [printMode, setPrintMode] = useState(showPrint)

//   useEffect(() => {
//     if (!id) return
//     const unsub = requestService.subscribeOne(id, r => {
//       setReq(r); setLoading(false)
//     })
//     return unsub
//   }, [id])

//   const handleCancel = async () => {
//     if (!req || !user) return
//     if (!confirm('Cancel this request? This action cannot be undone.')) return
//     setCancelling(true)
//     try {
//       await requestService.update(req.id, {
//         status: 'Cancelled',
//         activityLog: [
//           ...(req.activityLog ?? []),
//           { id: crypto.randomUUID(), action:'Request Cancelled', userId:user.uid, userName:user.fullName, details:'Cancelled by requester', timestamp: new Date().toISOString() }
//         ]
//       })
//       toast.success('Request cancelled')
//       router.push('/employee/my-requests')
//     } catch { toast.error('Failed') }
//     finally { setCancelling(false) }
//   }

//   const handlePrint = () => {
//     const printContent = printRef.current
//     if (!printContent) return
//     const w = window.open('', '_blank')
//     if (!w) return
//     w.document.write(`
//       <!DOCTYPE html><html><head>
//       <title>Job Order – ${req?.jobOrderNo}</title>
//       <style>
//         * { box-sizing: border-box; margin: 0; padding: 0; }
//         body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; }
//         .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a2035; padding-bottom: 16px; margin-bottom: 20px; }
//         .logo-area { display: flex; align-items: center; gap: 16px; }
//         .logo-text { font-size: 28px; font-weight: 900; color: #1a2035; }
//         .center-title { text-align: center; }
//         .center-title h1 { font-size: 18px; font-weight: 700; }
//         .center-title p { font-size: 11px; color: #666; }
//         .job-box { border: 1px solid #ccc; padding: 12px; text-align: right; min-width: 160px; font-size: 11px; }
//         .job-box strong { display: block; font-size: 16px; font-weight: 700; }
//         .status-badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-weight: 700; font-size: 12px; }
//         .status-approved { background: #dcfce7; color: #16a34a; }
//         .section { margin-bottom: 20px; }
//         .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; color: #374151; }
//         .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
//         .field-row { display: flex; gap: 8px; margin-bottom: 6px; }
//         .field-label { color: #6b7280; min-width: 140px; }
//         .field-value { font-weight: 500; }
//         .attachments { display: flex; flex-wrap: wrap; gap: 12px; }
//         .att-item { text-align: center; width: 100px; }
//         .att-img { width: 100px; height: 70px; object-fit: cover; border: 1px solid #e5e7eb; border-radius: 6px; }
//         .att-name { font-size: 9px; color: #6b7280; margin-top: 3px; word-break: break-all; }
//         .approval-table { width: 100%; border-collapse: collapse; font-size: 11px; }
//         .approval-table th { background: #f3f4f6; text-align: left; padding: 6px 10px; border: 1px solid #e5e7eb; font-size: 10px; text-transform: uppercase; }
//         .approval-table td { padding: 6px 10px; border: 1px solid #e5e7eb; }
//         .sign-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 32px; }
//         .sign-block { text-align: left; }
//         .sign-line { border-bottom: 1px solid #000; margin-bottom: 6px; height: 40px; }
//         .footer-text { text-align: center; font-size: 9px; color: #9ca3af; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
//         @media print { @page { size: A4 portrait; margin: 16mm; } }
//       </style>
//       </head><body>${printContent.innerHTML}</body></html>
//     `)
//     w.document.close()
//     w.focus()
//     setTimeout(() => { w.print(); }, 500)
//   }

//   const handleDownloadPDF = async () => {
//     if (!req) return
//     try {
//       const { default: jsPDF } = await import('jspdf')
//       const autoTable = (await import('jspdf-autotable')).default
//       const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
//       const margin = 16

//       // Header
//       doc.setFontSize(22); doc.setFont('helvetica','bold')
//       doc.text('Haier', margin, 22)
//       doc.setFontSize(16); doc.text('JOB ORDER', 105, 18, { align:'center' })
//       doc.setFontSize(9); doc.setFont('helvetica','normal')
//       doc.text('MARKETING RACKS JOB ORDER REQUEST SYSTEM', 105, 24, { align:'center' })

//       // Job Order box
//       doc.setFontSize(9)
//       doc.rect(148, 12, 46, 28)
//       doc.setFont('helvetica','bold'); doc.text('Job Order No.', 150, 18)
//       doc.setFontSize(12); doc.text(req.jobOrderNo, 150, 24)
//       doc.setFontSize(9); doc.setFont('helvetica','normal')
//       doc.text(`Date: ${formatDate(req.createdAt)}`, 150, 30)
//       doc.text(`Status: ${req.status.toUpperCase()}`, 150, 36)

//       doc.line(margin, 43, 194, 43)

//       // Request Info
//       let y = 50
//       doc.setFont('helvetica','bold'); doc.setFontSize(10)
//       doc.text('REQUEST INFORMATION', margin, y); y += 6
//       doc.line(margin, y, 194, y); y += 5

//       const reqFields = [
//         ['Requestor', req.requestor],
//         ['Product Category', req.productCategory || '—'],
//         ['Dealer', req.dealer || '—'],
//         ['Branch / Store', req.branchLocation],
//         ['Target Date', req.targetDate ? formatDate(req.targetDate) : '—'],
//         ['Priority',     req.priority],
//       ]
//       doc.setFont('helvetica','normal'); doc.setFontSize(9)
//       reqFields.forEach(([l, v]) => {
//         doc.setTextColor(107,114,128); doc.text(l + ':', margin, y)
//         doc.setTextColor(0,0,0); doc.text(String(v), margin + 50, y)
//         y += 6
//       })
//       doc.setTextColor(107,114,128); doc.text('Description:', margin, y)
//       y += 5
//       doc.setTextColor(0,0,0)
//       const descLines = doc.splitTextToSize(req.remarks || '', 90)
//       doc.text(descLines, margin + 5, y); y += descLines.length * 5 + 4

//       doc.setTextColor(107,114,128); doc.text('Contact Person:', margin, y)
//       doc.setTextColor(0,0,0); doc.text(req.contactPerson || '—', margin + 50, y); y += 6
//       doc.setTextColor(107,114,128); doc.text('Contact Number:', margin, y)
//       doc.setTextColor(0,0,0); doc.text(req.contactNumber || '—', margin + 50, y); y += 10

//       // Approver flow
//       if (req.approvers.length > 0) {
//         doc.setFont('helvetica','bold'); doc.setFontSize(10)
//         doc.text('APPROVER FLOW HISTORY', margin, y); y += 5
//         doc.line(margin, y, 194, y); y += 3
//         autoTable(doc, {
//           startY: y,
//           head: [['Step','Approver','Role','Action','Date & Time','Remarks']],
//           body: req.approvers.map((a, i) => [
//             i + 1, a.approverName, a.approverRole, a.action,
//             a.timestamp ? formatDateTime(a.timestamp) : '—', a.comments ?? 'Approved'
//           ]),
//           headStyles: { fillColor:[26,32,53], fontSize:8 },
//           styles: { fontSize:8 },
//           margin: { left:margin },
//         })
//         y = ((doc as any).lastAutoTable?.finalY ?? y + 22) + 8
//       }

//       // Signatures
//       doc.setFont('helvetica','normal'); doc.setFontSize(9)
//       doc.text('Prepared by:', margin, y + 5)
//       doc.text('Noted by:', 105, y + 5)
//       doc.line(margin, y + 20, 80, y + 20)
//       doc.line(105, y + 20, 180, y + 20)
//       doc.setFont('helvetica','bold')
//       doc.text(req.requestor, margin, y + 26)
//       doc.setFont('helvetica','normal')
//       doc.text(user?.department ?? '', margin, y + 31)
//       if (req.approvers.length > 0) {
//         const lastApprover = req.approvers[req.approvers.length - 1]
//         doc.setFont('helvetica','bold')
//         doc.text(lastApprover.approverName, 105, y + 26)
//         doc.setFont('helvetica','normal')
//         doc.text(lastApprover.approverRole, 105, y + 31)
//       }

//       doc.setFontSize(8); doc.setTextColor(150,150,150)
//       doc.text('This is a system generated document. No signature required.', 105, 285, { align:'center' })

//       doc.save(`JobOrder-${req.jobOrderNo}.pdf`)
//       toast.success('PDF downloaded!')
//     } catch (err) {
//       toast.error('PDF generation failed')
//     }
//   }

//   if (loading) return (
//     <EmployeeLayout>
//       <div className="flex items-center justify-center py-20"><Spinner size={28} /></div>
//     </EmployeeLayout>
//   )
//   if (!req) return (
//     <EmployeeLayout>
//       <div className="text-center py-20 text-slate-500">Request not found.</div>
//     </EmployeeLayout>
//   )

//   const canCancel = req.status === 'For Approval' && req.requestedBy === user?.uid
//   const canPrintOrDownload = ['Approved', 'In Progress', 'Completed'].includes(req.status)

//   // Build the Status History timeline from the actual approval workflow
//   // (req.approvers) instead of a generic fixed step list, so each entry
//   // reflects the real approver role/name and when they acted.
//   const timelineSteps: {
//     key: string
//     label: string
//     meta: string[]
//     done: boolean
//     timestamp?: string
//   }[] = [
//     {
//       key: 'submitted',
//       label: 'Request Submitted',
//       meta: [req.requestor],
//       done: true,
//       timestamp: req.createdAt,
//     },
//     ...(req.approvers ?? []).map((a, i) => ({
//       key: `approver-${i}`,
//       label: a.action === 'Pending' ? 'Pending' : a.action,
//       meta: a.action === 'Pending' ? [a.approverRole] : [a.approverRole, a.approverName],
//       done: a.action !== 'Pending',
//       timestamp: a.action !== 'Pending' ? a.timestamp : undefined,
//     })),
//   ]

//   const finalPill =
//     req.status === 'Completed' ? { label: 'Completed', className: 'bg-green-100 text-green-700' } :
//     req.status === 'Rejected'  ? { label: 'Rejected',  className: 'bg-red-100 text-red-700' } :
//     req.status === 'Returned'  ? { label: 'Returned',  className: 'bg-purple-100 text-purple-700' } :
//     null

//   return (
//     <EmployeeLayout>
//       <div className="max-w-5xl mx-auto space-y-5">
//         {/* Topbar */}
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <button onClick={() => router.push('/employee/my-requests')} className="btn-icon"><ChevronLeft size={18} /></button>
//             <div>
//               <p className="text-xs text-slate-500">
//                 Request Details <span className="text-slate-400 font-normal">({req.status})</span>
//               </p>
//             </div>
//           </div>
//           <div className="flex items-center gap-2">
//             {canPrintOrDownload && (
//               <>
//                 <button onClick={handlePrint} className="btn-primary btn-sm flex items-center gap-1.5">
//                   <Printer size={13} /> Print Job Order
//                 </button>
//                 <button onClick={handleDownloadPDF} className="btn-secondary btn-sm flex items-center gap-1.5">
//                   <Download size={13} /> Download PDF
//                 </button>
//               </>
//             )}
//             {canCancel && (
//               <button onClick={handleCancel} disabled={cancelling}
//                 className="btn-danger btn-sm flex items-center gap-1.5">
//                 {cancelling ? <Spinner size={13} /> : <X size={13} />}
//                 Cancel Request
//               </button>
//             )}
//           </div>
//         </div>

//         <div className="grid md:grid-cols-3 gap-5">
//           {/* Main info */}
//           <div className="md:col-span-2 space-y-5">
//             {/* Header card */}
//             <div className="card-pad">
//               <div className="flex items-start justify-between mb-4">
//                 <div>
//                   <div className="flex items-center gap-2.5 mb-1">
//                     <span className="font-bold text-xl font-mono text-slate-800">{req.jobOrderNo}</span>
//                     <StatusBadge status={req.status} type="request" />
//                   </div>
//                   <p className="font-semibold text-slate-700">
//                     {[req.productCategory || req.jobOrderNo, req.branchLocation].filter(Boolean).join(' — ')}
//                   </p>
//                   <p className="text-xs text-slate-400 mt-1">Requested on {formatDateTime(req.createdAt)}</p>
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-3 text-sm">
//                 {[
//                   { label:'Request No.',        value:req.jobOrderNo },
//                   { label:'Requestor',          value:req.requestor },
//                   { label:'Product Category',   value:req.productCategory || '—' },
//                   { label:'Branch / Store',     value:req.branchLocation },
//                   { label:'Target Date',        value:req.targetDate ? formatDate(req.targetDate) : '—' },
//                   { label:'Status',             value:req.status },
//                 ].map(f => (
//                   <div key={f.label}>
//                     <p className="field-label">{f.label}</p>
//                     <p className="font-medium text-slate-700">{f.value}</p>
//                   </div>
//                 ))}
//                 <div className="col-span-2">
//                   <p className="field-label">Description / Instructions</p>
//                   <p className="text-slate-700 leading-relaxed">{req.remarks || '—'}</p>
//                 </div>
//                 <div>
//                   <p className="field-label">Contact Person</p>
//                   <p className="font-medium text-slate-700">{req.contactPerson}</p>
//                 </div>
//                 <div>
//                   <p className="field-label">Contact Number</p>
//                   <p className="font-medium text-slate-700">{req.contactNumber}</p>
//                 </div>
//               </div>
//             </div>

//             {/* Attachments */}
//             {(req.attachments?.actualPhoto || req.attachments?.storePlan || req.attachments?.recommendation) && (
//               <div className="card-pad">
//                 <p className="sec-title mb-3">Attachments</p>
//                 <div className="flex flex-wrap gap-3">
//                   {req.attachments?.actualPhoto && (
//                     <a href={req.attachments.actualPhoto.url} target="_blank" rel="noreferrer"
//                       className="w-28 border border-slate-200 rounded-xl overflow-hidden hover:border-brand-300 transition-colors">
//                       <img src={req.attachments.actualPhoto.url} alt="Actual photo" className="w-full h-20 object-cover" />
//                       <p className="text-[10px] text-slate-600 px-2 py-1.5 truncate">{req.attachments.actualPhoto.name}</p>
//                     </a>
//                   )}
//                   {req.attachments?.storePlan && (
//                     <a href={req.attachments.storePlan} target="_blank" rel="noreferrer"
//                       className="w-28 border border-slate-200 rounded-xl overflow-hidden hover:border-brand-300 transition-colors flex flex-col items-center justify-center py-4">
//                       <FileText size={22} className="text-slate-400" />
//                       <p className="text-[10px] text-slate-600 px-2 pt-1.5 truncate w-full text-center">Store Plan</p>
//                     </a>
//                   )}
//                   {req.attachments?.recommendation && (
//                     <div className="flex-1 min-w-[180px] border border-slate-200 rounded-xl p-3">
//                       <p className="text-xs text-slate-500 mb-1">Recommendation</p>
//                       <p className="text-sm text-slate-700">{req.attachments.recommendation}</p>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Status History */}
//           <div className="card-pad h-fit">
//             <p className="sec-title mb-4">Status History</p>
//             <div className="space-y-4">
//               {timelineSteps.map((step, i) => (
//                 <div key={step.key} className="flex gap-3">
//                   <div className="flex flex-col items-center">
//                     <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
//                       step.done ? 'bg-green-500' : 'border-2 border-slate-200')}>
//                       {step.done
//                         ? <Check size={11} className="text-white" />
//                         : <div className="w-2 h-2 rounded-full bg-slate-200" />}
//                     </div>
//                     {(i < timelineSteps.length - 1 || finalPill) && (
//                       <div className="w-0.5 flex-1 bg-slate-100 mt-1 min-h-[20px]" />
//                     )}
//                   </div>
//                   <div className="pb-3 min-w-0">
//                     {step.done && step.timestamp && (
//                       <p className="text-xs font-semibold text-slate-400">{formatDateTime(step.timestamp)}</p>
//                     )}
//                     <p className={cn('text-sm font-semibold mt-0.5', step.done ? 'text-slate-800' : 'text-slate-300')}>
//                       {step.label}
//                     </p>
//                     {step.meta.map((m, mi) => (
//                       <p key={mi} className={cn('text-xs', step.done ? 'text-slate-500' : 'text-slate-300')}>{m}</p>
//                     ))}
//                   </div>
//                 </div>
//               ))}
//               {finalPill && (
//                 <span className={cn('inline-block text-xs font-semibold px-3 py-1.5 rounded-full', finalPill.className)}>
//                   {finalPill.label}
//                 </span>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Hidden Print Template */}
//         <div style={{ display: 'none' }}>
//           <div ref={printRef}>
//             <div className="header">
//               <div className="logo-area">
//                 <div className="logo-text">Haier</div>
//                 <div className="center-title">
//                   <h1>JOB ORDER</h1>
//                   <p>MARKETING RACKS JOB ORDER REQUEST SYSTEM</p>
//                 </div>
//               </div>
//               <div className="job-box">
//                 <div>Job Order No.</div>
//                 <strong>{req.jobOrderNo}</strong>
//                 <div>Date Requested</div>
//                 <div>{formatDate(req.createdAt)}</div>
//                 <div>Status</div>
//                 <div><span className="status-badge status-approved">{req.status.toUpperCase()}</span></div>
//               </div>
//             </div>

//             <div className="two-col">
//               <div className="section">
//                 <div className="section-title">REQUEST INFORMATION</div>
//                 {[
//                   ['Requestor', req.requestor],
//                   ['Product Category', req.productCategory || '—'],
//                   ['Dealer', req.dealer || '—'],
//                   ['Branch / Store', req.branchLocation],
//                   ['Target Date', req.targetDate ? formatDate(req.targetDate) : '—'],
//                   ['Priority',     req.priority],
//                   ['Remarks', req.remarks || '—'],
//                   ['Contact Person', req.contactPerson],
//                   ['Contact Number', req.contactNumber],
//                 ].map(([l, v]) => (
//                   <div key={String(l)} className="field-row">
//                     <span className="field-label">{l}</span>
//                     <span className="field-value">: {v}</span>
//                   </div>
//                 ))}
//               </div>
//               <div className="section">
//                 <div className="section-title">RACK DETAILS</div>
//                 {[
//                   ['Type of Rack',        req.requestDetails?.[0]?.rackType || '—'],
//                   ['Rack Size/Dim',    '120cm (W) x 60cm (D) x 200cm (H)'],
//                   ['Quantity',         req.requestDetails?.[0]?.quantity || '1'],
//                   ['Color / Finish',   'Black'],
//                   ['Brand / Model',    'Haier Standard Rack'],
//                   ['Category',          req.requestDetails?.[0]?.category || '—'],
//                 ].map(([l, v]) => (
//                   <div key={String(l)} className="field-row">
//                     <span className="field-label">{l}</span>
//                     <span className="field-value">: {v}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {(req.attachments?.actualPhoto || req.attachments?.storePlan || req.attachments?.recommendation) && (
//               <div className="section">
//                 <div className="section-title">ATTACHMENTS</div>
//                 <div style={{ marginTop: 12 }}>
//                   {req.attachments?.actualPhoto && (
//                     <div style={{ marginBottom: 12 }}>
//                       <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>Actual Haier Space Photo</div>
//                       <img src={req.attachments.actualPhoto.url} alt="Actual photo" style={{ width: '100%', maxWidth: '400px', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
//                       <div style={{ fontSize: 9, color: '#6b7280', marginTop: 3 }}>{req.attachments.actualPhoto.name}</div>
//                     </div>
//                   )}
//                   {req.attachments?.storePlan && (
//                     <div style={{ marginBottom: 12 }}>
//                       <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>Store Plan / Layout</div>
//                       <div style={{ fontSize: 10, color: '#0066cc', textDecoration: 'underline', fontFamily: 'monospace' }}>{req.attachments.storePlan}</div>
//                     </div>
//                   )}
//                   {req.attachments?.recommendation && (
//                     <div>
//                       <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>Recommendation</div>
//                       <div style={{ fontSize: 10, color: '#374151', lineHeight: 1.4 }}>{req.attachments.recommendation}</div>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             )}

//             {req.approvers.length > 0 && (
//               <div className="section">
//                 <div className="section-title">APPROVER FLOW HISTORY</div>
//                 <table className="approval-table">
//                   <thead>
//                     <tr>
//                       <th>Step</th><th>Approver</th><th>Role</th><th>Action</th><th>Date & Time</th><th>Remarks</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {req.approvers.map((a, i) => (
//                       <tr key={i}>
//                         <td>{i+1}</td>
//                         <td>{a.approverName}</td>
//                         <td>{a.approverRole}</td>
//                         <td>{a.action}</td>
//                         <td>{a.timestamp ? formatDateTime(a.timestamp) : '—'}</td>
//                         <td>{a.comments ?? 'Approved'}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}

//             <div className="sign-area">
//               <div className="sign-block">
//                 <div>Prepared by:</div>
//                 <div className="sign-line" />
//                 <strong>{req.requestor}</strong>
//                 <div>{user?.department ?? 'Marketing Staff'}</div>
//               </div>
//               <div className="sign-block">
//                 <div>Noted by:</div>
//                 <div className="sign-line" />
//                 <strong>{req.approvers[req.approvers.length - 1]?.approverName ?? 'Marketing Manager'}</strong>
//                 <div>{req.approvers[req.approvers.length - 1]?.approverRole ?? 'Marketing Manager'}</div>
//               </div>
//             </div>
//             <div className="footer-text">This is a system generated document. No signature required.</div>
//           </div>
//         </div>
//       </div>
//     </EmployeeLayout>
//   )
// }

// function Check({ size, className }: { size: number; className?: string }) {
//   return (
//     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
//       <polyline points="20 6 9 17 4 12" />
//     </svg>
//   )
// }

// export default function RequestDetailPage() {
//   return (
//     <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-xl bg-brand-600 animate-pulse"/></div>}>
//       <RequestDetailContent />
//     </Suspense>
//   )
// }


'use client'
// app/employee/my-requests/[id]/page.tsx
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import EmployeeLayout from '@/components/shared/EmployeeLayout'
import { StatusBadge, Spinner } from '@/components/ui/index'
import { requestService } from '@/services/requestService'
import { useAuthStore } from '@/stores'
import type { JobOrderRequest } from '@/types'
import { formatDate, formatDateTime, formatBytes } from '@/lib/utils'
import {
  ChevronLeft, Printer, Download, X, CheckCircle,
  Clock, AlertCircle, FileText, Phone, User, MapPin
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Suspense } from 'react'

function getStoreStatusLabel(req: JobOrderRequest): string | null {
  if (req.storeStatus?.newBranch)      return 'New Branch'
  if (req.storeStatus?.spaceAcquiring) return 'Space Acquiring'
  if (req.storeStatus?.renovation)     return 'Renovation'
  return null
}

function RequestDetailContent() {
  const { id }       = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const showPrint    = searchParams.get('print') === '1'
  const { user }     = useAuthStore()
  const router       = useRouter()
  const printRef     = useRef<HTMLDivElement>(null)

  const [req, setReq]         = useState<JobOrderRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [comment, setComment] = useState('')
  const [printMode, setPrintMode] = useState(showPrint)

  useEffect(() => {
    if (!id) return
    const unsub = requestService.subscribeOne(id, r => {
      setReq(r); setLoading(false)
    })
    return unsub
  }, [id])

  const handleCancel = async () => {
    if (!req || !user) return
    if (!confirm('Cancel this request? This action cannot be undone.')) return
    setCancelling(true)
    try {
      await requestService.update(req.id, {
        status: 'Cancelled',
        activityLog: [
          ...(req.activityLog ?? []),
          { id: crypto.randomUUID(), action:'Request Cancelled', userId:user.uid, userName:user.fullName, details:'Cancelled by requester', timestamp: new Date().toISOString() }
        ]
      })
      toast.success('Request cancelled')
      router.push('/employee/my-requests')
    } catch { toast.error('Failed') }
    finally { setCancelling(false) }
  }

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <!DOCTYPE html><html><head>
      <title>Job Order – ${req?.jobOrderNo}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a2035; padding-bottom: 16px; margin-bottom: 20px; }
        .logo-area { display: flex; align-items: center; gap: 16px; }
        .logo-text { font-size: 28px; font-weight: 900; color: #1a2035; }
        .center-title { text-align: center; }
        .center-title h1 { font-size: 18px; font-weight: 700; }
        .center-title p { font-size: 11px; color: #666; }
        .job-box { border: 1px solid #ccc; padding: 12px; text-align: right; min-width: 160px; font-size: 11px; }
        .job-box strong { display: block; font-size: 16px; font-weight: 700; }
        .status-badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-weight: 700; font-size: 12px; }
        .status-approved { background: #dcfce7; color: #16a34a; }
        .status-tag { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; background: #dbeafe; color: #1d4ed8; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; color: #374151; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .field-row { display: flex; gap: 8px; margin-bottom: 6px; }
        .field-label { color: #6b7280; min-width: 140px; }
        .field-value { font-weight: 500; }
        .stat-box { }
        .stat-label { font-size: 9px; text-transform: uppercase; color: #9ca3af; letter-spacing: .06em; margin-bottom: 2px; }
        .stat-value { font-size: 13px; font-weight: 700; }
        .details-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px; }
        .details-table th { background: #f3f4f6; text-align: left; padding: 6px 10px; border: 1px solid #e5e7eb; font-size: 10px; text-transform: uppercase; }
        .details-table td { padding: 6px 10px; border: 1px solid #e5e7eb; }
        .attachments { display: flex; flex-wrap: wrap; gap: 12px; }
        .att-item { text-align: center; width: 100px; }
        .att-img { width: 100px; height: 70px; object-fit: cover; border: 1px solid #e5e7eb; border-radius: 6px; }
        .att-name { font-size: 9px; color: #6b7280; margin-top: 3px; word-break: break-all; }
        .approval-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .approval-table th { background: #f3f4f6; text-align: left; padding: 6px 10px; border: 1px solid #e5e7eb; font-size: 10px; text-transform: uppercase; }
        .approval-table td { padding: 6px 10px; border: 1px solid #e5e7eb; }
        .sign-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 32px; }
        .sign-block { text-align: left; }
        .sign-line { border-bottom: 1px solid #000; margin-bottom: 6px; height: 40px; }
        .footer-text { text-align: center; font-size: 9px; color: #9ca3af; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
        @media print { @page { size: A4 portrait; margin: 16mm; } }
      </style>
      </head><body>${printContent.innerHTML}</body></html>
    `)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); }, 500)
  }

  const handleDownloadPDF = async () => {
    if (!req) return
    try {
      const { default: jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const margin = 16

      // Header
      doc.setFontSize(22); doc.setFont('helvetica','bold')
      doc.text('Haier', margin, 22)
      doc.setFontSize(16); doc.text('JOB ORDER', 105, 18, { align:'center' })
      doc.setFontSize(9); doc.setFont('helvetica','normal')
      doc.text('MARKETING RACKS JOB ORDER REQUEST SYSTEM', 105, 24, { align:'center' })

      // Job Order box
      doc.setFontSize(9)
      doc.rect(148, 12, 46, 28)
      doc.setFont('helvetica','bold'); doc.text('Job Order No.', 150, 18)
      doc.setFontSize(12); doc.text(req.jobOrderNo, 150, 24)
      doc.setFontSize(9); doc.setFont('helvetica','normal')
      doc.text(`Date: ${formatDate(req.createdAt)}`, 150, 30)
      doc.text(`Status: ${req.status.toUpperCase()}`, 150, 36)

      doc.line(margin, 43, 194, 43)

      // Request Info
      let y = 50
      doc.setFont('helvetica','bold'); doc.setFontSize(10)
      doc.text('REQUEST INFORMATION', margin, y); y += 6
      doc.line(margin, y, 194, y); y += 5

      const storeStatusLabel = getStoreStatusLabel(req)
      const reqFields: [string, string][] = [
        ['Requestor', req.requestor],
        ['Product Category', req.productCategory || '—'],
        ['Dealer', req.dealer || '—'],
        ['Branch / Store', req.branchLocation],
        ['Target Date', req.targetDate ? formatDate(req.targetDate) : '—'],
        ['Priority',     req.priority],
        ...(storeStatusLabel ? ([['Store Status', storeStatusLabel]] as [string, string][]) : []),
      ]
      doc.setFont('helvetica','normal'); doc.setFontSize(9)
      reqFields.forEach(([l, v]) => {
        doc.setTextColor(107,114,128); doc.text(l + ':', margin, y)
        doc.setTextColor(0,0,0); doc.text(String(v), margin + 50, y)
        y += 6
      })
      doc.setTextColor(107,114,128); doc.text('Description:', margin, y)
      y += 5
      doc.setTextColor(0,0,0)
      const descLines = doc.splitTextToSize(req.remarks || '', 90)
      doc.text(descLines, margin + 5, y); y += descLines.length * 5 + 4

      doc.setTextColor(107,114,128); doc.text('Contact Person:', margin, y)
      doc.setTextColor(0,0,0); doc.text(req.contactPerson || '—', margin + 50, y); y += 6
      doc.setTextColor(107,114,128); doc.text('Contact Number:', margin, y)
      doc.setTextColor(0,0,0); doc.text(req.contactNumber || '—', margin + 50, y); y += 10

      // Sales Evaluation
      const se = req.salesEvaluation
      if (se && (se.averageMonthlySellOut || se.averageSellIn || se.forecastMonthlySellOut)) {
        doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(0,0,0)
        doc.text('SALES EVALUATION', margin, y); y += 6
        doc.line(margin, y, 194, y); y += 5
        doc.setFont('helvetica','normal'); doc.setFontSize(9)
        const seFields: [string, string][] = [
          ['Ave. Monthly Sell-Out', String(se.averageMonthlySellOut || '—')],
          ['Ave. Sell-In Data',     String(se.averageSellIn || '—')],
          ['Forecast Monthly Sell-Out', String(se.forecastMonthlySellOut || '—')],
        ]
        seFields.forEach(([l, v]) => {
          doc.setTextColor(107,114,128); doc.text(l + ':', margin, y)
          doc.setTextColor(0,0,0); doc.text(v, margin + 60, y)
          y += 6
        })
        y += 4
      }

      // Request Details (rack items)
      if (req.requestDetails?.length) {
        doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(0,0,0)
        doc.text('REQUEST DETAILS', margin, y); y += 5
        doc.line(margin, y, 194, y); y += 3
        autoTable(doc, {
          startY: y,
          head: [['#','Category','Qty','Type of Racks','Measurement','SKUs','Remarks']],
          body: req.requestDetails.map((d, i) => [
            i + 1, d.category, d.quantity, d.rackType, d.measurement, d.skus, d.remarks || '—'
          ]),
          headStyles: { fillColor:[26,32,53], fontSize:8 },
          styles: { fontSize:8 },
          margin: { left:margin },
        })
        y = ((doc as any).lastAutoTable?.finalY ?? y + 22) + 8
      }

      // Approver flow
      if (req.approvers.length > 0) {
        doc.setFont('helvetica','bold'); doc.setFontSize(10)
        doc.text('APPROVER FLOW HISTORY', margin, y); y += 5
        doc.line(margin, y, 194, y); y += 3
        autoTable(doc, {
          startY: y,
          head: [['Step','Approver','Role','Action','Date & Time','Remarks']],
          body: req.approvers.map((a, i) => [
            i + 1, a.approverName, a.approverRole, a.action,
            a.timestamp ? formatDateTime(a.timestamp) : '—', a.comments ?? 'Approved'
          ]),
          headStyles: { fillColor:[26,32,53], fontSize:8 },
          styles: { fontSize:8 },
          margin: { left:margin },
        })
        y = ((doc as any).lastAutoTable?.finalY ?? y + 22) + 8
      }

      // Attachments (file names, since embedding images increases file size significantly)
      if (req.attachments?.actualPhoto || req.attachments?.storePlan || req.attachments?.recommendation) {
        if (y > 250) { doc.addPage(); y = 20 }
        doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(0,0,0)
        doc.text('ATTACHMENTS', margin, y); y += 6
        doc.line(margin, y, 194, y); y += 5
        doc.setFont('helvetica','normal'); doc.setFontSize(9)
        if (req.attachments?.actualPhoto) {
          doc.setTextColor(107,114,128); doc.text('Actual Photo of Haier Space:', margin, y)
          doc.setTextColor(0,0,0); doc.text(req.attachments.actualPhoto.name, margin + 65, y)
          y += 6
        }
        doc.setTextColor(107,114,128); doc.text('Store Plan:', margin, y)
        doc.setTextColor(0,0,0); doc.text(req.attachments?.storePlan || '—', margin + 65, y)
        y += 6
        doc.setTextColor(107,114,128); doc.text('Recommendation:', margin, y)
        doc.setTextColor(0,0,0); doc.text(req.attachments?.recommendation || '—', margin + 65, y)
        y += 10
      }

      // Signatures
      if (y > 250) { doc.addPage(); y = 20 }
      doc.setFont('helvetica','normal'); doc.setFontSize(9)
      doc.text('Prepared by:', margin, y + 5)
      doc.text('Noted by:', 105, y + 5)
      doc.line(margin, y + 20, 80, y + 20)
      doc.line(105, y + 20, 180, y + 20)
      doc.setFont('helvetica','bold')
      doc.text(req.requestor, margin, y + 26)
      doc.setFont('helvetica','normal')
      doc.text(user?.department ?? '', margin, y + 31)
      if (req.approvers.length > 0) {
        const lastApprover = req.approvers[req.approvers.length - 1]
        doc.setFont('helvetica','bold')
        doc.text(lastApprover.approverName, 105, y + 26)
        doc.setFont('helvetica','normal')
        doc.text(lastApprover.approverRole, 105, y + 31)
      }

      doc.setFontSize(8); doc.setTextColor(150,150,150)
      doc.text('This is a system generated document. No signature required.', 105, 285, { align:'center' })

      doc.save(`JobOrder-${req.jobOrderNo}.pdf`)
      toast.success('PDF downloaded!')
    } catch (err) {
      toast.error('PDF generation failed')
    }
  }

  if (loading) return (
    <EmployeeLayout>
      <div className="flex items-center justify-center py-20"><Spinner size={28} /></div>
    </EmployeeLayout>
  )
  if (!req) return (
    <EmployeeLayout>
      <div className="text-center py-20 text-slate-500">Request not found.</div>
    </EmployeeLayout>
  )

  const canCancel = req.status === 'For Approval' && req.requestedBy === user?.uid
  const canPrintOrDownload = ['Approved', 'In Progress', 'Completed'].includes(req.status)
  const storeStatusLabel = getStoreStatusLabel(req)
  const hasSalesEval = req.salesEvaluation && (
    req.salesEvaluation.averageMonthlySellOut ||
    req.salesEvaluation.averageSellIn ||
    req.salesEvaluation.forecastMonthlySellOut
  )

  // Build the Status History timeline from the actual approval workflow
  // (req.approvers) instead of a generic fixed step list, so each entry
  // reflects the real approver role/name and when they acted.
  const timelineSteps: {
    key: string
    label: string
    meta: string[]
    done: boolean
    timestamp?: string
  }[] = [
    {
      key: 'submitted',
      label: 'Request Submitted',
      meta: [req.requestor],
      done: true,
      timestamp: req.createdAt,
    },
    ...(req.approvers ?? []).map((a, i) => ({
      key: `approver-${i}`,
      label: a.action === 'Pending' ? 'Pending' : a.action,
      meta: a.action === 'Pending' ? [a.approverRole] : [a.approverRole, a.approverName],
      done: a.action !== 'Pending',
      timestamp: a.action !== 'Pending' ? a.timestamp : undefined,
    })),
  ]

  const finalPill =
    req.status === 'Completed' ? { label: 'Completed', className: 'bg-green-100 text-green-700' } :
    req.status === 'Rejected'  ? { label: 'Rejected',  className: 'bg-red-100 text-red-700' } :
    req.status === 'Returned'  ? { label: 'Returned',  className: 'bg-purple-100 text-purple-700' } :
    null

  return (
    <EmployeeLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Topbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/employee/my-requests')} className="btn-icon"><ChevronLeft size={18} /></button>
            <div>
              <p className="text-xs text-slate-500">
                Request Details <span className="text-slate-400 font-normal">({req.status})</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canPrintOrDownload && (
              <>
                <button onClick={handlePrint} className="btn-primary btn-sm flex items-center gap-1.5">
                  <Printer size={13} /> Print Job Order
                </button>
                <button onClick={handleDownloadPDF} className="btn-secondary btn-sm flex items-center gap-1.5">
                  <Download size={13} /> Download PDF
                </button>
              </>
            )}
            {canCancel && (
              <button onClick={handleCancel} disabled={cancelling}
                className="btn-danger btn-sm flex items-center gap-1.5">
                {cancelling ? <Spinner size={13} /> : <X size={13} />}
                Cancel Request
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Main info */}
          <div className="md:col-span-2 space-y-5">
            {/* Basic Information */}
            <div className="card-pad">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="font-bold text-xl font-mono text-slate-800">{req.jobOrderNo}</span>
                    <StatusBadge status={req.status} type="request" />
                  </div>
                  <p className="font-semibold text-slate-700">
                    {[req.productCategory || req.jobOrderNo, req.branchLocation].filter(Boolean).join(' — ')}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Requested on {formatDateTime(req.createdAt)}</p>
                </div>
              </div>

              <p className="sec-title mb-3">Basic Information</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="field-label">Date</p>
                  <p className="font-medium text-slate-700">{formatDate(req.createdAt)}</p>
                </div>
                <div>
                  <p className="field-label">Requestor</p>
                  <p className="font-medium text-slate-700">{req.requestor}</p>
                </div>
                <div>
                  <p className="field-label">Product Category</p>
                  <p className="font-medium text-slate-700">{req.productCategory || '—'}</p>
                </div>
                <div>
                  <p className="field-label">JO No.</p>
                  <p className="font-medium text-slate-700">{req.jobOrderNo}</p>
                </div>
                <div>
                  <p className="field-label">Dealer</p>
                  <p className="font-medium text-slate-700">{req.dealer || '—'}</p>
                </div>
                <div>
                  <p className="field-label">Branch / Store Location</p>
                  <p className="font-medium text-slate-700">{req.branchLocation || '—'}</p>
                </div>
                <div>
                  <p className="field-label">Target Date</p>
                  <p className="font-medium text-slate-700">{req.targetDate ? formatDate(req.targetDate) : '—'}</p>
                </div>
                <div>
                  <p className="field-label">Remarks</p>
                  <p className="font-medium text-slate-700">{req.remarks || '—'}</p>
                </div>
                <div>
                  <p className="field-label">Contact Person</p>
                  <p className="font-medium text-slate-700">{req.contactPerson || '—'}</p>
                </div>
                <div>
                  <p className="field-label">Contact Number</p>
                  <p className="font-medium text-slate-700">{req.contactNumber || '—'}</p>
                </div>
              </div>

              {storeStatusLabel && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="field-label mb-1.5">Store Status</p>
                  <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700">
                    {storeStatusLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Sales Evaluation */}
            {hasSalesEval && (
              <div className="card-pad">
                <p className="sec-title mb-3">Sales Evaluation</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="field-label">Ave. Monthly Sell-Out</p>
                    <p className="font-medium text-slate-700">{req.salesEvaluation?.averageMonthlySellOut || '—'}</p>
                  </div>
                  <div>
                    <p className="field-label">Ave. Sell-In Data</p>
                    <p className="font-medium text-slate-700">{req.salesEvaluation?.averageSellIn || '—'}</p>
                  </div>
                  <div>
                    <p className="field-label">Forecast Monthly Sell-Out</p>
                    <p className="font-medium text-slate-700">{req.salesEvaluation?.forecastMonthlySellOut || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Request Details (rack items) */}
            {req.requestDetails?.length > 0 && (
              <div className="card-pad">
                <p className="sec-title mb-3">Request Details</p>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Category</th><th>Quantity</th><th>Type of Racks</th>
                        <th>Measurement</th><th>SKUs</th><th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {req.requestDetails.map((d, i) => (
                        <tr key={d.id ?? i}>
                          <td className="text-slate-400">{i + 1}</td>
                          <td className="font-medium text-slate-700">{d.category}</td>
                          <td>{d.quantity}</td>
                          <td>{d.rackType}</td>
                          <td>{d.measurement}</td>
                          <td>{d.skus}</td>
                          <td>{d.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Attachments */}
            <div className="card-pad">
              <p className="sec-title mb-3">Attachments</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="field-label mb-2">Actual Photo of Haier Space</p>
                  {req.attachments?.actualPhoto ? (
                    <a href={req.attachments.actualPhoto.url} target="_blank" rel="noreferrer" className="block">
                      <img src={req.attachments.actualPhoto.url} alt="Actual photo"
                        className="w-full h-24 object-cover rounded-lg border border-slate-200" />
                      <p className="flex items-center gap-1 text-[11px] text-brand-600 mt-1.5 truncate">
                        <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                        {req.attachments.actualPhoto.name}
                      </p>
                    </a>
                  ) : <p className="text-slate-400 text-sm">—</p>}
                </div>
                <div>
                  <p className="field-label mb-2">Store Plan</p>
                  {req.attachments?.storePlan ? (
                    <a href={req.attachments.storePlan} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-brand-600 underline break-all">
                      <FileText size={12} className="flex-shrink-0" /> {req.attachments.storePlan}
                    </a>
                  ) : <p className="text-slate-400 text-sm">—</p>}
                </div>
                <div>
                  <p className="field-label mb-2">Recommendation</p>
                  {req.attachments?.recommendation ? (
                    <p className="text-sm text-slate-700">{req.attachments.recommendation}</p>
                  ) : <p className="text-slate-400 text-sm">—</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="card-pad h-fit">
            <p className="sec-title mb-4">Status History</p>
            <div className="space-y-4">
              {timelineSteps.map((step, i) => (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                      step.done ? 'bg-green-500' : 'border-2 border-slate-200')}>
                      {step.done
                        ? <Check size={11} className="text-white" />
                        : <div className="w-2 h-2 rounded-full bg-slate-200" />}
                    </div>
                    {(i < timelineSteps.length - 1 || finalPill) && (
                      <div className="w-0.5 flex-1 bg-slate-100 mt-1 min-h-[20px]" />
                    )}
                  </div>
                  <div className="pb-3 min-w-0">
                    {step.done && step.timestamp && (
                      <p className="text-xs font-semibold text-slate-400">{formatDateTime(step.timestamp)}</p>
                    )}
                    <p className={cn('text-sm font-semibold mt-0.5', step.done ? 'text-slate-800' : 'text-slate-300')}>
                      {step.label}
                    </p>
                    {step.meta.map((m, mi) => (
                      <p key={mi} className={cn('text-xs', step.done ? 'text-slate-500' : 'text-slate-300')}>{m}</p>
                    ))}
                  </div>
                </div>
              ))}
              {finalPill && (
                <span className={cn('inline-block text-xs font-semibold px-3 py-1.5 rounded-full', finalPill.className)}>
                  {finalPill.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Hidden Print Template */}
        <div style={{ display: 'none' }}>
          <div ref={printRef}>
            <div className="header">
              <div className="logo-area">
                <div className="logo-text">Haier</div>
                <div className="center-title">
                  <h1>JOB ORDER</h1>
                  <p>MARKETING RACKS JOB ORDER REQUEST SYSTEM</p>
                </div>
              </div>
              <div className="job-box">
                <div>Job Order No.</div>
                <strong>{req.jobOrderNo}</strong>
                <div>Date Requested</div>
                <div>{formatDate(req.createdAt)}</div>
                <div>Status</div>
                <div><span className="status-badge status-approved">{req.status.toUpperCase()}</span></div>
              </div>
            </div>

            <div className="two-col">
              <div className="section">
                <div className="section-title">REQUEST INFORMATION</div>
                {[
                  ['Requestor', req.requestor],
                  ['Product Category', req.productCategory || '—'],
                  ['Dealer', req.dealer || '—'],
                  ['Branch / Store', req.branchLocation],
                  ['Target Date', req.targetDate ? formatDate(req.targetDate) : '—'],
                  ['Priority',     req.priority],
                  ['Remarks', req.remarks || '—'],
                  ['Contact Person', req.contactPerson],
                  ['Contact Number', req.contactNumber],
                ].map(([l, v]) => (
                  <div key={String(l)} className="field-row">
                    <span className="field-label">{l}</span>
                    <span className="field-value">: {v}</span>
                  </div>
                ))}
                {storeStatusLabel && (
                  <div className="field-row">
                    <span className="field-label">Store Status</span>
                    <span className="status-tag  font-bold">{storeStatusLabel}</span>
                  </div>
                )}
              </div>
              {/* <div className="section">
                <div className="section-title">RACK DETAILS</div>
                {[
                  ['Type of Rack',        req.requestDetails?.[0]?.rackType || '—'],
                  ['Rack Size/Dim',    '120cm (W) x 60cm (D) x 200cm (H)'],
                  ['Quantity',         req.requestDetails?.[0]?.quantity || '1'],
                  ['Color / Finish',   'Black'],
                  ['Brand / Model',    'Haier Standard Rack'],
                  ['Category',          req.requestDetails?.[0]?.category || '—'],
                ].map(([l, v]) => (
                  <div key={String(l)} className="field-row">
                    <span className="field-label">{l}</span>
                    <span className="field-value">: {v}</span>
                  </div>
                ))}
              </div> */}
            </div>

            {hasSalesEval && (
              <div className="section">
                <div className="section-title">SALES EVALUATION</div>
                <div className="three-col">
                  <div className="stat-box">
                    <div className="stat-label">Ave. Monthly Sell-Out</div>
                    <div className="stat-value">{req.salesEvaluation?.averageMonthlySellOut || '—'}</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Ave. Sell-In Data</div>
                    <div className="stat-value">{req.salesEvaluation?.averageSellIn || '—'}</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Forecast Monthly Sell-Out</div>
                    <div className="stat-value">{req.salesEvaluation?.forecastMonthlySellOut || '—'}</div>
                  </div>
                </div>
              </div>
            )}

            {req.requestDetails?.length > 0 && (
              <div className="section">
                <div className="section-title">REQUEST DETAILS</div>
                <table className="details-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Category</th><th>Qty</th><th>Type of Racks</th>
                      <th>Measurement</th><th>SKUs</th><th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {req.requestDetails.map((d, i) => (
                      <tr key={d.id ?? i}>
                        <td>{i + 1}</td>
                        <td>{d.category}</td>
                        <td>{d.quantity}</td>
                        <td>{d.rackType}</td>
                        <td>{d.measurement}</td>
                        <td>{d.skus}</td>
                        <td>{d.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(req.attachments?.actualPhoto || req.attachments?.storePlan || req.attachments?.recommendation) && (
              <div className="section">
                <div className="section-title">ATTACHMENTS</div>
                <div style={{ marginTop: 12 }}>
                  {req.attachments?.actualPhoto && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>Actual Haier Space Photo</div>
                      <img src={req.attachments.actualPhoto.url} alt="Actual photo" style={{ width: '100%', maxWidth: '400px', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                      <div style={{ fontSize: 9, color: '#6b7280', marginTop: 3 }}>{req.attachments.actualPhoto.name}</div>
                    </div>
                  )}
                  {req.attachments?.storePlan && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>Store Plan / Layout</div>
                      <div style={{ fontSize: 10, color: '#0066cc', textDecoration: 'underline', fontFamily: 'monospace' }}>{req.attachments.storePlan}</div>
                    </div>
                  )}
                  {req.attachments?.recommendation && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>Recommendation</div>
                      <div style={{ fontSize: 10, color: '#374151', lineHeight: 1.4 }}>{req.attachments.recommendation}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {req.approvers.length > 0 && (
              <div className="section">
                <div className="section-title">APPROVER FLOW HISTORY</div>
                <table className="approval-table">
                  <thead>
                    <tr>
                      <th>Step</th><th>Approver</th><th>Role</th><th>Action</th><th>Date & Time</th><th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {req.approvers.map((a, i) => (
                      <tr key={i}>
                        <td>{i+1}</td>
                        <td>{a.approverName}</td>
                        <td>{a.approverRole}</td>
                        <td>{a.action}</td>
                        <td>{a.timestamp ? formatDateTime(a.timestamp) : '—'}</td>
                        <td>{a.comments ?? 'Approved'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="sign-area">
              <div className="sign-block">
                <div>Prepared by:</div>
                <div className="sign-line" />
                <strong>{req.requestor}</strong>
                <div>{user?.department ?? 'Marketing Staff'}</div>
              </div>
              <div className="sign-block">
                <div>Noted by:</div>
                <div className="sign-line" />
                <strong>{req.approvers[req.approvers.length - 1]?.approverName ?? 'Marketing Manager'}</strong>
                <div>{req.approvers[req.approvers.length - 1]?.approverRole ?? 'Marketing Manager'}</div>
              </div>
            </div>
            <div className="footer-text">This is a system generated document. No signature required.</div>
          </div>
        </div>
      </div>
    </EmployeeLayout>
  )
}

function Check({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function RequestDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-xl bg-brand-600 animate-pulse"/></div>}>
      <RequestDetailContent />
    </Suspense>
  )
}
