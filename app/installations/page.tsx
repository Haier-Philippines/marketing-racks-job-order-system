'use client'
// app/installations/page.tsx
import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/shared/AppLayout'
import { PageHeader, StatusBadge, SearchBar, EmptyState, TableSkeleton, Pagination, Modal, ConfirmDialog } from '@/components/ui/index'
import { installationService, userService, requestService } from '@/services/index'
import { useAuthStore } from '@/stores'
import type { Installation, InstallStatus, AppUser, JobOrderRequest } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { Plus, MoreVertical, Eye, Pencil, RefreshCw, Wrench, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_OPTS: InstallStatus[] = ['Scheduled','In Progress','Completed','Cancelled']

const EMPTY_FORM = {
  requestId: '', requestNo: '', technicianId: '', technicianName: '',
  scheduledDate: '', status: 'Scheduled' as InstallStatus, notes: '',
}

export default function InstallationsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'it_admin' || user?.role === 'marketing_manager'

  const [installs, setInstalls]   = useState<Installation[]>([])
  const [requests, setRequests]   = useState<JobOrderRequest[]>([])
  const [technicians, setTechs]   = useState<AppUser[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusF, setStatusF]     = useState('')
  const [page, setPage]           = useState(1)
  const pageSize = 10
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState<Installation | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [detail, setDetail]       = useState<Installation | null>(null)
  const [openMenu, setOpenMenu]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [installList, techList, reqList] = await Promise.all([
        installationService.getAll({ search, status: statusF }),
        userService.getTechnicians(),
        requestService.getPaginated({ status: 'For Approval', pageSize: 100 }).then(r => r.data),
      ])
      setInstalls(installList); setTechs(techList); setRequests(reqList)
    } finally { setLoading(false) }
  }, [search, statusF])

  useEffect(() => { load() }, [load])

  const paged     = installs.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(installs.length / pageSize)

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true) }
  const openEdit   = (i: Installation) => {
    setEditing(i)
    setForm({ requestId: i.requestId, requestNo: i.requestNo, technicianId: i.technicianId,
      technicianName: i.technicianName, scheduledDate: i.scheduledDate, status: i.status, notes: i.notes ?? '' })
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.requestId || !form.technicianId || !form.scheduledDate) {
      toast.error('Fill all required fields'); return
    }
    setSaving(true)
    try {
      const tech = technicians.find(t => t.uid === form.technicianId)
      const data = { ...form, technicianName: tech?.fullName ?? form.technicianName, completionPhotos: editing?.completionPhotos ?? [] }
      if (editing) { await installationService.update(editing.id, data); toast.success('Updated!') }
      else { await installationService.create(data); toast.success('Installation scheduled!') }
      setModal(false); load()
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  const handleStatusChange = async (id: string, status: InstallStatus) => {
    try {
      await installationService.update(id, { status, ...(status === 'Completed' ? { completedDate: new Date().toISOString() } : {}) })
      toast.success(`Status updated to ${status}`)
      load()
    } catch { toast.error('Failed') }
  }

  const F = (k: keyof typeof EMPTY_FORM) => (e: any) => {
    if (k === 'technicianId') {
      const tech = technicians.find(t => t.uid === e.target.value)
      setForm(p => ({ ...p, technicianId: e.target.value, technicianName: tech?.fullName ?? '' }))
    } else if (k === 'requestId') {
      const req = requests.find(r => r.id === e.target.value)
      setForm(p => ({ ...p, requestId: e.target.value, requestNo: req?.jobOrderNo ?? '' }))
    } else {
      setForm(p => ({ ...p, [k]: e.target.value }))
    }
  }

  const statusColors: Record<InstallStatus, string> = {
    Scheduled:    'bg-blue-50 text-blue-700',
    'In Progress':'bg-amber-50 text-amber-700',
    Completed:    'bg-green-50 text-green-700',
    Cancelled:    'bg-red-50 text-red-700',
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader
          title="Installations"
          subtitle={`${installs.length} installations tracked`}
          actions={
            <>
              <button onClick={load} className="btn-secondary p-2"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button>
              {isAdmin && (
                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                  <Plus size={14} /> Schedule Installation
                </button>
              )}
            </>
          }
        />

        <div className="card-pad flex gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search installation ID, request, technician…" className="flex-1" />
          <select value={statusF} onChange={e => setStatusF(e.target.value)} className="field-sm w-40">
            <option value="">All Status</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Installation ID</th><th>Request No.</th><th>Technician</th>
                  <th>Schedule</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}><TableSkeleton rows={6} cols={6} /></td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={6}>
                    <EmptyState icon={Wrench} title="No installations found"
                      action={isAdmin ? <button onClick={openCreate} className="btn-primary btn-sm">Schedule One</button> : undefined} />
                  </td></tr>
                ) : paged.map(inst => (
                  <tr key={inst.id}>
                    <td>
                      <button onClick={() => setDetail(inst)} className="font-bold text-xs text-brand-600 hover:underline font-mono">
                        {inst.installationId}
                      </button>
                    </td>
                    <td className="font-mono text-xs text-slate-600">{inst.requestNo}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-700">
                          {inst.technicianName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-sm text-slate-700">{inst.technicianName}</span>
                      </div>
                    </td>
                    <td>
                      <p className="text-xs text-slate-600">{formatDate(inst.scheduledDate)}</p>
                      {inst.completedDate && <p className="text-[11px] text-slate-400">Done: {formatDate(inst.completedDate)}</p>}
                    </td>
                    <td>
                      <span className={cn('status-badge text-[11px]', statusColors[inst.status])}>
                        {inst.status}
                      </span>
                    </td>
                    <td>
                      <div className="relative">
                        <button onClick={() => setOpenMenu(openMenu === inst.id ? null : inst.id)} className="btn-icon">
                          <MoreVertical size={15} />
                        </button>
                        {openMenu === inst.id && (
                          <div className="absolute right-0 top-8 z-20 card shadow-lg w-44 py-1 animate-fade-in"
                            onMouseLeave={() => setOpenMenu(null)}>
                            <button onClick={() => { setDetail(inst); setOpenMenu(null) }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full">
                              <Eye size={13} /> View Details
                            </button>
                            {isAdmin && (
                              <>
                                <button onClick={() => { openEdit(inst); setOpenMenu(null) }}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full">
                                  <Pencil size={13} /> Edit
                                </button>
                                {inst.status !== 'Completed' && (
                                  <button onClick={() => { handleStatusChange(inst.id, 'Completed'); setOpenMenu(null) }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-green-700 hover:bg-green-50 w-full">
                                    <CheckCircle size={13} /> Mark Completed
                                  </button>
                                )}
                                {inst.status === 'Scheduled' && (
                                  <button onClick={() => { handleStatusChange(inst.id, 'In Progress'); setOpenMenu(null) }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 w-full">
                                    <Wrench size={13} /> Start
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && installs.length > pageSize && (
            <Pagination page={page} totalPages={totalPages} total={installs.length} pageSize={pageSize} onPage={setPage} />
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.installationId ?? ''} size="md">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Installation ID', detail.installationId],
                ['Request No.',     detail.requestNo],
                ['Technician',      detail.technicianName],
                ['Scheduled Date',  formatDate(detail.scheduledDate)],
                ['Status',          detail.status],
                ['Completed Date',  detail.completedDate ? formatDate(detail.completedDate) : '—'],
              ].map(([l, v]) => (
                <div key={String(l)}>
                  <p className="field-label">{l}</p>
                  <p className="font-medium text-slate-700">{v}</p>
                </div>
              ))}
            </div>
            {detail.notes && (
              <div><p className="field-label">Notes</p><p className="text-slate-600">{detail.notes}</p></div>
            )}
            {detail.completionPhotos.length > 0 && (
              <div>
                <p className="field-label mb-2">Completion Photos ({detail.completionPhotos.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {detail.completionPhotos.map((p, i) => (
                    <a key={i} href={p.url} target="_blank" rel="noreferrer" className="block">
                      <img src={p.url} alt="" className="w-full h-24 object-cover rounded-lg border border-slate-200" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Installation' : 'Schedule Installation'} size="md"
        footer={<>
          <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <RefreshCw size={13} className="animate-spin" />}
            {editing ? 'Save Changes' : 'Schedule'}
          </button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="field-label">Linked Request *</label>
            <select value={form.requestId} onChange={F('requestId')} className="field">
              <option value="">— Select Request —</option>
              {requests.map(r => <option key={r.id} value={r.id}>{r.jobOrderNo} — {r.productCategory}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Assign Technician *</label>
            <select value={form.technicianId} onChange={F('technicianId')} className="field">
              <option value="">— Select Technician —</option>
              {technicians.map(t => <option key={t.uid} value={t.uid}>{t.fullName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Scheduled Date *</label>
              <input type="date" value={form.scheduledDate} onChange={F('scheduledDate')} className="field"
                min={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="field-label">Status</label>
              <select value={form.status} onChange={F('status')} className="field">
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Notes</label>
            <textarea value={form.notes} onChange={F('notes')} rows={3} placeholder="Installation notes…" className="field" />
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
