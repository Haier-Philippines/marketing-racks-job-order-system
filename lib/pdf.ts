// lib/pdf.ts
// Shared PDF generation utilities for all portals

import type { JobOrderRequest } from '@/types'
import { formatDate, formatDateTime } from './utils'

export async function generateJobOrderPDF(req: JobOrderRequest, requesterDept?: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 14
  const pageW  = 210

  // ── Header ───────────────────────────────────────────
  doc.setFontSize(24); doc.setFont('helvetica','bold'); doc.setTextColor(26,32,53)
  doc.text('Haier', margin, 20)
  doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.setTextColor(0,0,0)
  doc.text('JOB ORDER', pageW / 2, 16, { align: 'center' })
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
  doc.text('MARKETING RACKS JOB ORDER REQUEST SYSTEM', pageW / 2, 21, { align: 'center' })

  // Job Order box (top-right)
  doc.setDrawColor(200,200,200); doc.rect(148, 10, 48, 32)
  doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
  doc.text('Job Order No.', 150, 16)
  doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(0,0,0)
  doc.text(req.jobOrderNo, 150, 22)
  doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
  doc.text('Date Requested', 150, 28)
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(0,0,0)
  doc.text(formatDate(req.createdAt), 150, 33)
  doc.setFontSize(7); doc.setTextColor(100,100,100); doc.text('Status', 150, 38)
  doc.setFontSize(8); doc.setFont('helvetica','bold')
  const statusColor = req.status === 'Completed' ? [22,163,74] : req.status === 'Rejected' ? [220,38,38] : [37,99,235]
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
  doc.text(req.status.toUpperCase(), 150, 43)

  doc.setDrawColor(26,32,53); doc.setLineWidth(0.5)
  doc.line(margin, 46, pageW - margin, 46)

  // ── Basic Information ─────────────────────────────────
  let y = 54
  doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(26,32,53)
  doc.text('BASIC INFORMATION', margin, y); y += 3
  doc.setDrawColor(200,200,200); doc.line(margin, y, pageW - margin, y); y += 5

  autoTable(doc, {
    startY: y,
    body: [
      ['Date', req.date ? formatDate(req.date) : '—',                 'Requestor', req.requestor],
      ['Product Category', req.productCategory || '—',                'Dealer', req.dealer || '—'],
      ['Branch / Store', req.branchLocation,                          'Target Date', req.targetDate ? formatDate(req.targetDate) : '—'],
      ['Remarks', req.remarks || '—',                                 'Status', req.status],
    ],
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { textColor: [100,116,139], cellWidth: 35 }, 2: { textColor: [100,116,139], cellWidth: 35 } },
    margin: { left: margin, right: margin },
    theme: 'plain',
  })
  y = ((doc as any).lastAutoTable?.finalY ?? y + 20) + 4

  // Store Status
  const storeStatuses = [
    req.storeStatus?.newBranch ? 'New Branch' : '',
    req.storeStatus?.spaceAcquiring ? 'Space Acquiring' : '',
    req.storeStatus?.renovation ? 'Renovation' : '',
  ].filter(Boolean)
  if (storeStatuses.length > 0) {
    doc.setFontSize(7); doc.setTextColor(100,116,139); doc.text('Store Status:', margin, y)
    doc.setFontSize(8); doc.setTextColor(0,0,0); doc.text(storeStatuses.join(' · '), margin + 30, y)
    y += 6
  }

  // ── Sales Evaluation ──────────────────────────────────
  if (req.salesEvaluation?.averageMonthlySellOut || req.salesEvaluation?.averageSellIn) {
    y += 4
    doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(26,32,53)
    doc.text('SALES EVALUATION', margin, y); y += 3
    doc.setDrawColor(200,200,200); doc.line(margin, y, pageW - margin, y); y += 5
    autoTable(doc, {
      startY: y,
      body: [[
        'Ave. Monthly Sell-Out', req.salesEvaluation.averageMonthlySellOut || '—',
        'Ave. Sell-In Data', req.salesEvaluation.averageSellIn || '—',
        'Forecast Sell-Out', req.salesEvaluation.forecastMonthlySellOut || '—',
      ]],
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { textColor: [100,116,139] }, 2: { textColor: [100,116,139] }, 4: { textColor: [100,116,139] } },
      margin: { left: margin, right: margin },
      theme: 'plain',
    })
    y = ((doc as any).lastAutoTable?.finalY ?? y + 10) + 4
  }

  // ── Request Details ───────────────────────────────────
  if (req.requestDetails?.length > 0) {
    y += 4
    doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(26,32,53)
    doc.text('REQUEST DETAILS', margin, y); y += 3
    doc.setDrawColor(200,200,200); doc.line(margin, y, pageW - margin, y); y += 2
    autoTable(doc, {
      startY: y,
      head: [['#','Category','Quantity','Type of Racks','Measurement','SKUs','Remarks']],
      body: req.requestDetails.map((r, i) => [
        i + 1, r.category, r.quantity, r.rackType,
        r.measurement || '—', r.skus || '—', r.remarks || '—',
      ]),
      headStyles: { fillColor: [26,32,53], fontSize: 7, textColor: [255,255,255] },
      styles:     { fontSize: 7, cellPadding: 2 },
      margin: { left: margin, right: margin },
    })
    y = ((doc as any).lastAutoTable?.finalY ?? y + 30) + 4
  }

  // ── Attachments ───────────────────────────────────────
  if (req.attachments?.storePlan || req.attachments?.recommendation) {
    y += 4
    doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(26,32,53)
    doc.text('ATTACHMENTS', margin, y); y += 3
    doc.setDrawColor(200,200,200); doc.line(margin, y, pageW - margin, y); y += 5
    if (req.attachments.storePlan) {
      doc.setFontSize(7); doc.setTextColor(100,116,139); doc.text('Store Plan:', margin, y); y += 4
      doc.setFontSize(8); doc.setTextColor(0,0,0)
      const planLines = doc.splitTextToSize(req.attachments.storePlan, pageW - margin * 2)
      doc.text(planLines, margin, y); y += planLines.length * 4 + 4
    }
    if (req.attachments.recommendation) {
      doc.setFontSize(7); doc.setTextColor(100,116,139); doc.text('Recommendation:', margin, y); y += 4
      doc.setFontSize(8); doc.setTextColor(0,0,0)
      const recLines = doc.splitTextToSize(req.attachments.recommendation, pageW - margin * 2)
      doc.text(recLines, margin, y); y += recLines.length * 4 + 4
    }
  }

  // ── Approval Flow History ─────────────────────────────
  if (req.approvers && req.approvers.length > 0) {
    y += 4
    doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(26,32,53)
    doc.text('APPROVER FLOW HISTORY', margin, y); y += 3
    doc.setDrawColor(200,200,200); doc.line(margin, y, pageW - margin, y); y += 2
    autoTable(doc, {
      startY: y,
      head: [['Step','Approver','Role','Action','Date & Time','Remarks']],
      body: req.approvers.map((a, i) => [
        i + 1,
        a.approverName || '—',
        a.approverRole || '—',
        a.action || 'Pending',
        a.timestamp ? formatDateTime(a.timestamp) : '—',
        a.comments || (a.action === 'Approved' ? 'Approved' : '—'),
      ]),
      headStyles: { fillColor: [26,32,53], fontSize: 7, textColor: [255,255,255] },
      styles:     { fontSize: 7, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 10 }, 5: { cellWidth: 30 } },
      margin: { left: margin, right: margin },
    })
    y = ((doc as any).lastAutoTable?.finalY ?? y + 40) + 10
  }

  // ── Signatures ────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 20 }

  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(0,0,0)
  doc.text('Prepared by:', margin, y + 5)
  doc.text('Noted by:', 115, y + 5)
  doc.line(margin, y + 20, 90, y + 20)
  doc.line(115, y + 20, pageW - margin, y + 20)
  doc.setFont('helvetica','bold'); doc.setFontSize(9)
  doc.text(req.requestor, margin, y + 26)
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(100,100,100)
  doc.text(requesterDept ?? req.department, margin, y + 31)

  const lastApprover = req.approvers?.at(-1)
  if (lastApprover) {
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(0,0,0)
    doc.text(lastApprover.approverName || 'Marketing Manager', 115, y + 26)
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(100,100,100)
    doc.text(lastApprover.approverRole || 'Marketing Manager', 115, y + 31)
  }

  doc.setFontSize(7); doc.setTextColor(150,150,150)
  doc.text('This is a system generated document. No signature required.', pageW / 2, 287, { align: 'center' })
  doc.text(`Generated: ${formatDateTime(new Date().toISOString())}`, pageW / 2, 291, { align: 'center' })

  doc.save(`JobOrder-${req.jobOrderNo}.pdf`)
}
