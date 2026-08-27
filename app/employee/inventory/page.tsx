'use client'
// app/employee/inventory/page.tsx
import { useEffect, useState, useCallback } from 'react'
import EmployeeLayout from '@/components/shared/EmployeeLayout'
import { StatusBadge, SearchBar, EmptyState, TableSkeleton, Pagination } from '@/components/ui/index'
import { inventoryService } from '@/services/index'
import type { RackInventory } from '@/types'
import { RACK_CATEGORIES } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { Package, RefreshCw, Eye } from 'lucide-react'
import { Modal } from '@/components/ui/index'

const STATUS_OPTS = ['Available', 'In Use', 'Maintenance', 'Damaged', 'Retired']

export default function EmployeeInventoryPage() {
  const [racks, setRacks]       = useState<RackInventory[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [statusFilter, setStatus] = useState('')
  const [page, setPage]         = useState(1)
  const [detail, setDetail]     = useState<RackInventory | null>(null)
  const pageSize = 10

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRacks(await inventoryService.getAll({ search, category: catFilter, status: statusFilter }))
    } finally { setLoading(false) }
  }, [search, catFilter, statusFilter])

  useEffect(() => { load() }, [load])

  const paged      = racks.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(racks.length / pageSize)

  const conditionColor = (c: string) =>
    c === 'Good' ? 'text-green-600' : c === 'Fair' ? 'text-amber-600' : 'text-red-600'

  const statusColor: Record<string, string> = {
    Available:   'bg-green-50 text-green-700',
    'In Use':    'bg-blue-50 text-blue-700',
    Maintenance: 'bg-amber-50 text-amber-700',
    Damaged:     'bg-red-50 text-red-600',
    Retired:     'bg-slate-50 text-slate-600',
  }

  return (
    <EmployeeLayout>
      <div className="space-y-6 w-full px-6 md:px-8 lg:px-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Racks Inventory (View Only)</h1>
            <p className="text-sm text-slate-500 mt-0.5">{racks.length} racks registered · read-only access</p>
          </div>
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Info banner */}
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-center gap-2">
          <Eye size={13} className="flex-shrink-0" />
          You have view-only access to the rack inventory. Contact IT Admin to request changes.
        </div>

        {/* Filters */}
        <div className="card-pad flex flex-wrap gap-3">
          <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1) }} className="field-sm w-44">
            <option value="">All Rack Type</option>
            {RACK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1) }} className="field-sm w-36">
            <option value="">All Status</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <SearchBar
            value={search}
            onChange={v => { setSearch(v); setPage(1) }}
            placeholder="Search rack…"
            className="flex-1 min-w-40"
          />
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rack ID</th>
                  <th>Rack Type</th>
                  <th>Location / Store</th>
                  <th>Vendor</th>
                  <th>Price / Amount</th>
                  <th>Status</th>
                  <th>Condition</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8}><TableSkeleton rows={8} cols={8} /></td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={6}>
                    <EmptyState icon={Package} title="No racks found" message="Try adjusting your search filters." />
                  </td></tr>
                ) : paged.map(rack => (
                  <tr key={rack.id} className="cursor-pointer" onClick={() => setDetail(rack)}>
                    <td>
                      <span className="font-bold text-xs text-brand-600 font-mono">{rack.rackNo}</span>
                    </td>
                    <td className="text-sm text-slate-700">{rack.rackType}</td>
                    <td>
                          <p className="text-sm text-slate-700">{rack.locationStore}</p>
                          {rack.branch && <p className="text-[11px] text-slate-400">{rack.branch}</p>}
                        </td>
                        <td className="text-sm text-slate-600">{rack.vendor || '—'}</td>
                        <td className="text-sm text-slate-600">
                          {typeof rack.priceAmount === 'number' ? `₱${rack.priceAmount.toLocaleString()}` : '—'}
                        </td>
                        <td>
                          <span className={cn('status-badge text-[11px]', statusColor[rack.status] ?? 'bg-slate-50 text-slate-600')}>
                        {rack.status}
                      </span>
                    </td>
                    <td>
                      <span className={cn('text-xs font-semibold', conditionColor(rack.condition))}>
                        {rack.condition}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">{formatDate(rack.lastUpdated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && racks.length > pageSize && (
            <Pagination
              page={page} totalPages={totalPages} total={racks.length}
              pageSize={pageSize} onPage={setPage}
            />
          )}
        </div>
      </div>

      {/* Detail modal - read only */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.rackNo ?? ''} size="sm">
        {detail && (
          <div className="space-y-3 text-sm">
            {detail.photoUrl && (
              <img src={detail.photoUrl} alt="Rack" className="w-full h-40 object-cover rounded-xl" />
            )}
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Rack No',        detail.rackNo],
                ['Rack Type',      detail.rackType],
                ['Location',       detail.locationStore],
                ['Branch',         detail.branch || '—'],
                ['Status',         detail.status],
                ['Condition',      detail.condition],
                ['Install Status', detail.installationStatus],
                ['Last Updated',   formatDate(detail.lastUpdated)],
              ].map(([l, v]) => (
                <div key={String(l)}>
                  <p className="field-label">{l}</p>
                  <p className="font-medium text-slate-700">{v}</p>
                </div>
              ))}
            </div>
            {detail.notes && (
              <div>
                <p className="field-label">Notes</p>
                <p className="text-slate-600">{detail.notes}</p>
              </div>
            )}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              You have read-only access. Contact IT Admin to request inventory changes.
            </div>
          </div>
        )}
      </Modal>
    </EmployeeLayout>
  )
}
