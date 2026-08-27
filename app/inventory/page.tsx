'use client'
// app/inventory/page.tsx
import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/shared/AppLayout'
import ApproverLayout from '@/components/shared/ApproverLayout'
import { PageHeader, StatusBadge, SearchBar, EmptyState, TableSkeleton, Pagination, ConfirmDialog, Modal } from '@/components/ui/index'
import { inventoryService } from '@/services/index'
import { useAuthStore } from '@/stores'
import type { RackInventory, RackStatus, RackCondition } from '@/types'
import { RACK_CATEGORIES } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { Plus, MoreVertical, Eye, Pencil, Trash2, RefreshCw, Package, Filter } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

const STATUS_OPTS: RackStatus[] = ['Available','In Use','Maintenance','Damaged','Retired']
const CONDITION_OPTS: RackCondition[] = ['Good','Fair','Poor']
const LOCATIONS = ['Abenson QC','SM Megamall','Robinsons Manila','SM North EDSA','Abenson Flagg','SM Sucat','Ayala Manila Bay','New Glorietta','Abenson Cloverleaf']

type InventoryForm = Omit<RackInventory, 'id' | 'rackNo' | 'lastUpdated' | 'history' | 'createdAt'>

const EMPTY_FORM: InventoryForm = {
  rackType: 'Wall', locationStore: '', branch: '',
  status: 'Available', condition: 'Good',
  installationStatus: 'Not Installed', notes: '', photoUrl: '', photoPublicId: '',
   vendor: '', priceAmount: undefined,
}

export default function InventoryPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'it_admin' || user?.role === 'marketing_manager'

  // Marketing Manager navigates within the approver portal (its own
  // sidebar/topbar), while IT Admin uses the full admin layout — pick the
  // matching shell so each role only sees navigation relevant to them.
  const Layout = user?.role === 'marketing_manager' ? ApproverLayout : AppLayout

  const [racks, setRacks]         = useState<RackInventory[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusF, setStatusF]     = useState('')
  const [catF, setCatF]           = useState('')
  const [page, setPage]           = useState(1)
  const pageSize = 10
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<RackInventory | null>(null)
  const [form, setForm]           = useState<InventoryForm>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [deleting, setDeleting]   = useState(false)
  const [detailRack, setDetail]   = useState<RackInventory | null>(null)
  const [openMenu, setOpenMenu]   = useState<string | null>(null)
  const [savingRackId, setSavingRackId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRacks(await inventoryService.getAll({ search, status: statusF, category: catF })) }
    finally { setLoading(false) }
  }, [search, statusF, catF])

  useEffect(() => { load() }, [load])

  const paged     = racks.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(racks.length / pageSize)

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true) }
  const openEdit = (r: RackInventory) => {
  setEditing(r)
  setForm({ rackType: r.rackType, locationStore: r.locationStore, branch: r.branch,
    status: r.status, condition: r.condition, installationStatus: r.installationStatus,
    notes: r.notes ?? '', photoUrl: r.photoUrl ?? '', photoPublicId: r.photoPublicId ?? '',
    vendor: r.vendor ?? '', priceAmount: r.priceAmount })
  setModalOpen(true)
}

  const handleSave = async () => {
    if (!form.locationStore) { toast.error('Location is required'); return }
    setSaving(true)
    try {
      if (editing) {
        await inventoryService.update(editing.id, form, user ? { action:'Updated', details:`Rack updated`, userId:user.uid, userName:user.fullName } : undefined)
        toast.success('Rack updated!')
      } else {
        await inventoryService.create(form)
        toast.success('Rack added!')
      }
      setModalOpen(false); load()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try { await inventoryService.delete(deleteId); toast.success('Rack deleted'); load() }
    catch { toast.error('Failed') }
    finally { setDeleting(false); setDeleteId(null) }
  }

  const handleRackInfoBlur = async (
  rack: RackInventory,
  patch: { vendor?: string; priceAmount?: number }
) => {
  if (!user) return
  const nextVendor = patch.vendor !== undefined ? patch.vendor : (rack.vendor ?? '')
  const nextPrice  = patch.priceAmount !== undefined ? patch.priceAmount : rack.priceAmount

  if (nextVendor === (rack.vendor ?? '') && nextPrice === rack.priceAmount) return

  setSavingRackId(rack.id)
  try {
    await inventoryService.update(
      rack.id,
      { vendor: nextVendor, priceAmount: nextPrice },
      { action: 'Vendor/Price Updated', details: `Vendor: ${nextVendor || '—'}, Price: ${nextPrice ?? '—'}`, userId: user.uid, userName: user.fullName }
    )
    setRacks(prev => prev.map(r => r.id === rack.id ? { ...r, vendor: nextVendor, priceAmount: nextPrice } : r))
    toast.success('Saved')
  } catch {
    toast.error('Failed to save')
  } finally {
    setSavingRackId(null)
  }
}

  const F = (k: keyof typeof EMPTY_FORM) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))

  const conditionColor = { Good: 'text-green-600', Fair: 'text-amber-600', Poor: 'text-red-600' }

    return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Racks Inventory"
          subtitle={`${racks.length} racks registered`}
          actions={
            <>
              <button onClick={load} className="btn-secondary p-2"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button>
              {isAdmin && (
                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                  <Plus size={14} /> Add Rack
                </button>
              )}
            </>
          }
        />

        {/* Filters */}
        <div className="card-pad flex flex-wrap gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search rack no, location, branch…" className="flex-1 min-w-48" />
          <select value={catF} onChange={e => setCatF(e.target.value)} className="field-sm w-44">
            <option value="">All Rack Types</option>
            {RACK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusF} onChange={e => setStatusF(e.target.value)} className="field-sm w-36">
            <option value="">All Status</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rack ID</th><th>Rack Type</th><th>Location / Store</th>
                  <th>Vendor</th><th>Price / Amount</th>
                  <th>Status</th><th>Condition</th><th>Last Updated</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9}><TableSkeleton rows={8} cols={9} /></td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={7}>
                    <EmptyState icon={Package} title="No racks found"
                      message="Add racks to the inventory to track them."
                      action={isAdmin ? <button onClick={openCreate} className="btn-primary btn-sm">Add Rack</button> : undefined} />
                  </td></tr>
                ) : paged.map(rack => (
                  <tr key={rack.id}>
                    <td>
                      <button onClick={() => setDetail(rack)} className="font-bold text-xs text-brand-600 hover:underline font-mono">
                        {rack.rackNo}
                      </button>
                    </td>
                    <td className="text-sm text-slate-700">{rack.rackType}</td>
                    <td>
                        <p className="text-sm text-slate-700">{rack.locationStore}</p>
                        <p className="text-[11px] text-slate-400">{rack.branch}</p>
                      </td>
                      <td>
                        {isAdmin ? (
                          <input
                            type="text"
                            defaultValue={rack.vendor ?? ''}
                            placeholder="Enter vendor"
                            disabled={savingRackId === rack.id}
                            className="field-sm w-28"
                            onBlur={e => handleRackInfoBlur(rack, { vendor: e.target.value })}
                          />
                        ) : (
                          <span className="text-sm text-slate-600">{rack.vendor || '—'}</span>
                        )}
                      </td>
                      <td>
                        {isAdmin ? (
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            defaultValue={rack.priceAmount ?? ''}
                            placeholder="0.00"
                            disabled={savingRackId === rack.id}
                            className="field-sm w-24"
                            onBlur={e => handleRackInfoBlur(rack, { priceAmount: e.target.value === '' ? undefined : Number(e.target.value) })}
                          />
                        ) : (
                          <span className="text-sm text-slate-600">
                            {typeof rack.priceAmount === 'number' ? `₱${rack.priceAmount.toLocaleString()}` : '—'}
                          </span>
                        )}
                      </td>
                      <td><StatusBadge status={rack.status} type="rack" /></td>
                    <td>
                      <span className={cn('text-xs font-semibold', conditionColor[rack.condition])}>
                        {rack.condition}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">{formatDate(rack.lastUpdated)}</td>
                    <td>
                      <div className="relative">
                        <button onClick={() => setOpenMenu(openMenu === rack.id ? null : rack.id)} className="btn-icon">
                          <MoreVertical size={15} />
                        </button>
                        {openMenu === rack.id && (
                          <div className="absolute right-0 top-8 z-20 card shadow-lg w-36 py-1 animate-fade-in"
                            onMouseLeave={() => setOpenMenu(null)}>
                            <button onClick={() => { setDetail(rack); setOpenMenu(null) }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full">
                              <Eye size={13} /> View
                            </button>
                            {isAdmin && (
                              <>
                                <button onClick={() => { openEdit(rack); setOpenMenu(null) }}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full">
                                  <Pencil size={13} /> Edit
                                </button>
                                <button onClick={() => { setDeleteId(rack.id); setOpenMenu(null) }}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
                                  <Trash2 size={13} /> Delete
                                </button>
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
          {!loading && racks.length > pageSize && (
            <Pagination page={page} totalPages={totalPages} total={racks.length} pageSize={pageSize} onPage={setPage} />
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal open={!!detailRack} onClose={() => setDetail(null)} title={detailRack?.rackNo ?? ''} size="md">
        {detailRack && (
          <div className="space-y-4">
            {detailRack.photoUrl && (
              <div className="relative h-48 rounded-xl overflow-hidden bg-slate-100">
                <img src={detailRack.photoUrl} alt="Rack" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Rack No',         detailRack.rackNo],
                ['Rack Type',       detailRack.rackType],
                ['Location',        detailRack.locationStore],
                ['Branch',          detailRack.branch || '—'],
                ['Status',          detailRack.status],
                ['Condition',       detailRack.condition],
                ['Install Status',  detailRack.installationStatus],
                ['Last Updated',    formatDate(detailRack.lastUpdated)],
              ].map(([l, v]) => (
                <div key={String(l)}>
                  <p className="field-label">{l}</p>
                  <p className="font-medium text-slate-700">{v}</p>
                </div>
              ))}
            </div>
            {detailRack.notes && (
              <div>
                <p className="field-label">Notes</p>
                <p className="text-sm text-slate-600">{detailRack.notes}</p>
              </div>
            )}
            {detailRack.history.length > 0 && (
              <div>
                <p className="field-label mb-2">History ({detailRack.history.length})</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {detailRack.history.slice().reverse().map((h, i) => (
                    <div key={i} className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="font-medium text-slate-700">{h.action}</p>
                      <p className="text-slate-500">{h.details}</p>
                      <p className="text-slate-400 mt-0.5">{h.userName} · {formatDate(h.timestamp)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Rack' : 'Add Rack'} size="md"
        footer={<>
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <RefreshCw size={13} className="animate-spin" />}
            {editing ? 'Save Changes' : 'Add Rack'}
          </button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Rack Type *</label>
              <select value={form.rackType} onChange={F('rackType')} className="field">
                {RACK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Status *</label>
              <select value={form.status} onChange={F('status')} className="field">
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Location / Store *</label>
              <input value={form.locationStore} onChange={F('locationStore')} list="locations" placeholder="e.g. Abenson QC" className="field" />
              <datalist id="locations">{LOCATIONS.map(l => <option key={l} value={l} />)}</datalist>
            </div>
            <div>
              <label className="field-label">Branch</label>
              <input value={form.branch} onChange={F('branch')} placeholder="Branch name" className="field" />
            </div>
            <div>
              <label className="field-label">Vendor</label>
              <input value={form.vendor ?? ''} onChange={F('vendor')} placeholder="Vendor name" className="field" />
            </div>
            <div>
              <label className="field-label">Price / Amount</label>
              <input type="number" min={0} step="0.01" value={form.priceAmount ?? ''}
                onChange={e => setForm(p => ({ ...p, priceAmount: e.target.value === '' ? undefined : Number(e.target.value) }))}
                placeholder="0.00" className="field" />
            </div>
            <div>
              <label className="field-label">Condition *</label>
              <select value={form.condition} onChange={F('condition')} className="field">
                {CONDITION_OPTS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Installation Status</label>
              <select value={form.installationStatus} onChange={F('installationStatus')} className="field">
                {['Installed','Not Installed','In Transit'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Notes</label>
            <textarea value={form.notes} onChange={F('notes')} rows={3} placeholder="Additional notes…" className="field" />
          </div>
          <div>
            <label className="field-label">Photo URL (Cloudinary)</label>
            <input value={form.photoUrl} onChange={F('photoUrl')} placeholder="https://res.cloudinary.com/…" className="field" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Rack" message="This will permanently remove the rack from inventory." danger loading={deleting} />
        </Layout>
  )
}
