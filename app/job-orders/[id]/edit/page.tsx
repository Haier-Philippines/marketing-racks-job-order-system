'use client'
// app/job-orders/[id]/edit/page.tsx
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/shared/AppLayout'
import { PageHeader, Spinner, StatusBadge } from '@/components/ui/index'
import { requestService } from '@/services/requestService'
import { useAuthStore } from '@/stores'
import type { JobOrderRequest, RequestDetailRow } from '@/types'
import { ROW_CATEGORIES, ROW_RACK_TYPES } from '@/types'
import { ChevronLeft, Save, Eye, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function EditJobOrderPage() {
  const { id }   = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const router   = useRouter()

  const [req, setReq]       = useState<JobOrderRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  const [form, setForm] = useState({
    date: '', requestor: '', productCategory: '', dealer: '',
    branchLocation: '', targetDate: '', remarks: '', status: 'For Approval',
  })
  const [storeStatus, setStoreStatus] = useState({ newBranch: false, spaceAcquiring: false, renovation: false })
  const [salesEval, setSalesEval] = useState({ averageMonthlySellOut: '', averageSellIn: '', forecastMonthlySellOut: '' })
  const [rows, setRows] = useState<RequestDetailRow[]>([])
  const [storePlan, setStorePlan]         = useState('')
  const [recommendation, setRecommendation] = useState('')

  useEffect(() => {
    if (!id) return
    requestService.getById(id).then(r => {
      if (!r) { toast.error('Request not found'); router.push('/job-orders'); return }
      setReq(r)
      setForm({
        date: r.date ?? '', requestor: r.requestor ?? '', productCategory: r.productCategory ?? '',
        dealer: r.dealer ?? '', branchLocation: r.branchLocation ?? '',
        targetDate: r.targetDate ?? '', remarks: r.remarks ?? '', status: r.status,
      })
      setStoreStatus(r.storeStatus ?? { newBranch: false, spaceAcquiring: false, renovation: false })
      setSalesEval(r.salesEvaluation ?? { averageMonthlySellOut: '', averageSellIn: '', forecastMonthlySellOut: '' })
      setRows(r.requestDetails ?? [])
      setStorePlan(r.attachments?.storePlan ?? '')
      setRecommendation(r.attachments?.recommendation ?? '')
    }).finally(() => setLoading(false))
  }, [id, router])

  const F = (k: keyof typeof form) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))
  const updateRow = (idx: number, key: keyof RequestDetailRow, val: string | number) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r))
  const addRow    = () => setRows(p => [...p, { id: crypto.randomUUID(), category: '', quantity: 0, rackType: '', measurement: '', skus: '', remarks: '' }])
  const removeRow = (idx: number) => setRows(p => p.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (!req || !user) return
    if (!form.branchLocation.trim()) { toast.error('Branch / Store Location is required'); return }
    setSaving(true)
    try {
      await requestService.update(req.id, {
        ...form as any,
        storeStatus, salesEvaluation: salesEval, requestDetails: rows,
        attachments: { ...req.attachments, storePlan, recommendation },
        activityLog: [
          ...(req.activityLog ?? []),
          { id: crypto.randomUUID(), action: 'Request Updated', userId: user.uid, userName: user.fullName,
            details: `Updated by ${user.fullName} (${user.role})`, timestamp: new Date().toISOString() },
        ],
      })
      toast.success('Request updated successfully!')
      router.push(`/request-details/${req.id}`)
    } catch (err: any) { toast.error(err.message ?? 'Update failed') }
    finally { setSaving(false) }
  }

  const isAdmin = user?.role === 'it_admin' || user?.role === 'marketing_manager'
  const canEdit = isAdmin || (user?.uid === req?.requestedBy && req?.status === 'For Approval')

  if (loading) return <AppLayout><div className="flex items-center justify-center py-20"><Spinner size={28} /></div></AppLayout>
  if (!req) return <AppLayout><div className="text-center py-20 text-slate-500">Request not found.</div></AppLayout>

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <PageHeader title={`Edit: ${req.jobOrderNo}`} subtitle={`Current status: ${req.status}`}
          actions={<div className="flex gap-2">
            <Link href={`/request-details/${req.id}`} className="btn-secondary flex items-center gap-1.5"><Eye size={14} /> View</Link>
            <Link href="/job-orders" className="btn-secondary flex items-center gap-1.5"><ChevronLeft size={14} /> Back</Link>
          </div>}
        />

        <div className="card-pad flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="field-label">Current Status</p>
            <StatusBadge status={req.status} type="request" />
          </div>
          {isAdmin && (
            <div className="flex items-center gap-3">
              <label className="field-label">Update Status</label>
              <select value={form.status} onChange={F('status')} className="field-sm w-44">
                {['For Approval','In Progress','Completed','Rejected','Cancelled','Returned'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!canEdit ? (
          <div className="card-pad text-center py-10 space-y-3">
            <p className="text-slate-500">You don&apos;t have permission to edit this request.</p>
            <Link href={`/request-details/${req.id}`} className="btn-primary inline-flex items-center gap-2"><Eye size={14} /> View Details</Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="card-pad space-y-4">
              <h2 className="sec-title">Basic Information</h2>
              <div className="grid grid-cols-2 gap-4">
                {([
                  ['date','Date *','date'], ['requestor','Requestor *','text'],
                  ['productCategory','Product Category','text'], ['dealer','Dealer','text'],
                  ['branchLocation','Branch / Store Location *','text'], ['targetDate','Target Date','date'],
                  ['remarks','Remarks','text'],
                ] as const).map(([k,label,type]) => (
                  <div key={k}>
                    <label className="field-label">{label}</label>
                    <input type={type} value={(form as any)[k]} onChange={F(k as any)} className="field" />
                  </div>
                ))}
              </div>
              <div>
                <p className="field-label mb-2">Store Status</p>
                <div className="flex gap-5">
                  {([['newBranch','New Branch'],['spaceAcquiring','Space Acquiring'],['renovation','Renovation']] as const).map(([k,label]) => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={storeStatus[k]}
                        onChange={e => setStoreStatus(p => ({ ...p, [k]: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="sec-title mb-3">Sales Evaluation</p>
                <div className="grid grid-cols-3 gap-3">
                  {([['averageMonthlySellOut','Ave. Monthly Sell-Out'],['averageSellIn','Ave. Sell-In'],['forecastMonthlySellOut','Forecast Sell-Out']] as const).map(([k,label]) => (
                    <div key={k}>
                      <label className="field-label">{label}</label>
                      <input value={salesEval[k]} onChange={e => setSalesEval(p => ({ ...p, [k]: e.target.value }))} className="field" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card-pad space-y-3">
              <h2 className="sec-title">Request Details</h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Category','Qty','Type of Rack','Measurement','SKUs','Remarks',''].map(h => (
                        <th key={h} className="px-2 py-2 text-left text-slate-600 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={row.id || idx} className="border-b border-slate-100 last:border-0">
                        <td className="px-1.5 py-1">
                          <select value={row.category} onChange={e => updateRow(idx,'category',e.target.value)} className="field-sm w-full">
                            <option value="">Select</option>
                            {ROW_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="px-1.5 py-1">
                          <input type="number" min={0} value={row.quantity} onChange={e => updateRow(idx,'quantity',Number(e.target.value))} className="field-sm w-16 text-center" />
                        </td>
                        <td className="px-1.5 py-1">
                          <select value={row.rackType} onChange={e => updateRow(idx,'rackType',e.target.value)} className="field-sm w-full">
                            <option value="">Select</option>
                            {ROW_RACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        {(['measurement','skus','remarks'] as const).map(key => (
                          <td key={key} className="px-1.5 py-1">
                            <input value={row[key]} onChange={e => updateRow(idx,key,e.target.value)} className="field-sm w-full" />
                          </td>
                        ))}
                        <td className="px-1.5 py-1">
                          <button onClick={() => removeRow(idx)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                            <Trash2 size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={addRow} className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 px-2 py-1.5 rounded-lg hover:bg-brand-50">
                <Plus size={13} /> Add Row
              </button>
            </div>

            <div className="card-pad space-y-4">
              <h2 className="sec-title">Attachments</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Store Plan</label>
                  <textarea value={storePlan} onChange={e => setStorePlan(e.target.value)} rows={4} className="field" />
                </div>
                <div>
                  <label className="field-label">Recommendation</label>
                  <textarea value={recommendation} onChange={e => setRecommendation(e.target.value)} rows={4} className="field" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pb-6">
              <Link href={`/request-details/${req.id}`} className="btn-secondary">Cancel</Link>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Spinner size={14} /> : <Save size={14} />} {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

