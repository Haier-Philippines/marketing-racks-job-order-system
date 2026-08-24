'use client'
// components/ui/index.tsx — All reusable UI components

import { cn, REQUEST_STATUS_CONFIG, RACK_STATUS_CONFIG, INSTALL_STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/utils'
import type { RequestStatus, RackStatus, InstallStatus, Priority } from '@/types'
import { X, AlertTriangle, Loader2, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useState, useRef } from 'react'

// ── StatusBadge ───────────────────────────────────────────
export function StatusBadge({ status, type = 'request' }: {
  status: string; type?: 'request'|'rack'|'install'|'priority'|'user'
}) {
  let bg = 'bg-slate-50', text = 'text-slate-600', dot = 'bg-slate-400'

  if (type === 'request') {
    const c = REQUEST_STATUS_CONFIG[status as RequestStatus]
    if (c) { bg = c.bg; text = c.text; dot = c.dot }
  } else if (type === 'rack') {
    const c = RACK_STATUS_CONFIG[status as RackStatus]
    if (c) { bg = c.bg; text = c.text }
  } else if (type === 'install') {
    const c = INSTALL_STATUS_CONFIG[status as InstallStatus]
    if (c) { bg = c.bg; text = c.text }
  } else if (type === 'priority') {
    const c = PRIORITY_CONFIG[status as Priority]
    if (c) { bg = c.bg; text = c.text }
  } else if (type === 'user') {
    bg   = status === 'Active' ? 'bg-green-50' : 'bg-slate-50'
    text = status === 'Active' ? 'text-green-700' : 'text-slate-500'
    dot  = status === 'Active' ? 'bg-green-500' : 'bg-slate-400'
  }

  return (
    <span className={cn('status-badge', bg, text)}>
      {type === 'request' && <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />}
      {status}
    </span>
  )
}

// ── PageHeader ────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: {
  title: string; subtitle?: string; actions?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────
export function StatCard({ label, value, sub, subPositive, icon, color = '#3b82f6' }: {
  label: string; value: number | string; sub?: string; subPositive?: boolean
  icon?: React.ReactNode; color?: string
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}>{value}</p>
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: color + '15', border: `1px solid ${color}25` }}>
            <span style={{ color }}>{icon}</span>
          </div>
        )}
      </div>
      {sub && (
        <p className={cn('text-xs font-medium', subPositive === false ? 'text-red-500' : subPositive === true ? 'text-green-600' : 'text-slate-400')}>
          {sub}
        </p>
      )}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, size = 'md' }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode
  footer?: React.ReactNode; size?: 'sm'|'md'|'lg'|'xl'
}) {
  if (!open) return null
  const widths = { sm:'max-w-sm', md:'max-w-xl', lg:'max-w-2xl', xl:'max-w-4xl' }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={cn('modal-box', widths[size])}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <h2 className="sec-title">{title}</h2>
            <button onClick={onClose} className="btn-icon"><X size={16} /></button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ── ConfirmDialog ─────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = false, loading = false }: {
  open: boolean; onClose: () => void; onConfirm: () => void
  title: string; message: string; danger?: boolean; loading?: boolean
}) {
  if (!open) return null
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-sm">
        <div className="px-6 py-5">
          <div className="flex items-start gap-3 mb-4">
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', danger ? 'bg-red-100' : 'bg-amber-100')}>
              <AlertTriangle size={18} className={danger ? 'text-red-600' : 'text-amber-600'} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
              <p className="text-sm text-slate-500">{message}</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
            <button onClick={onConfirm} disabled={loading}
              className={cn(danger ? 'btn-danger' : 'btn-primary', 'btn-sm flex items-center gap-1.5')}>
              {loading && <Loader2 size={13} className="animate-spin" />}
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, message, action }: {
  icon?: React.ElementType; title: string; message?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      {Icon && <Icon size={36} className="text-slate-300" />}
      <p className="font-semibold text-slate-600">{title}</p>
      {message && <p className="text-sm text-slate-400 max-w-xs">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className={cn('skeleton h-8 rounded', j === 0 ? 'w-24' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5 space-y-3">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-7 w-16 rounded" />
          <div className="skeleton h-3 w-32 rounded" />
        </div>
      ))}
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────
export function Pagination({ page, totalPages, total, pageSize, onPage }: {
  page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void
}) {
  const start = (page - 1) * pageSize + 1
  const end   = Math.min(page * pageSize, total)

  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1
    if (page <= 3) return i + 1
    if (page >= totalPages - 2) return totalPages - 4 + i
    return page - 2 + i
  })

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-500">Showing {start} to {end} of {total} records</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1} className="btn-icon"><ChevronLeft size={14} /></button>
        {pages.map(p => (
          <button key={p} onClick={() => onPage(p)}
            className={cn('w-7 h-7 rounded text-xs font-medium transition-colors',
              p === page ? 'bg-brand-600 text-white' : 'hover:bg-slate-100 text-slate-600')}>
            {p}
          </button>
        ))}
        {totalPages > 5 && page < totalPages - 2 && (
          <>
            <span className="text-slate-400 text-xs px-1">…</span>
            <button onClick={() => onPage(totalPages)}
              className="w-7 h-7 rounded text-xs font-medium hover:bg-slate-100 text-slate-600">{totalPages}</button>
          </>
        )}
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages} className="btn-icon"><ChevronRight size={14} /></button>
      </div>
    </div>
  )
}

// ── SearchBar ─────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search…', className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="field pl-9 w-full"
      />
    </div>
  )
}

// ── FileUpload ────────────────────────────────────────────
import { uploadToCloudinary, formatBytes } from '@/lib/utils'
import { Upload, File as FileIcon, Trash2 } from 'lucide-react'
import type { JobOrderAttachment } from '@/types'

export function FileUpload({
  files, onAdd, onRemove, folder = 'marketing-racks/attachments', accept, maxMB = 10,
}: {
  files: JobOrderAttachment[]
  onAdd: (f: JobOrderAttachment) => void
  onRemove: (idx: number) => void
  folder?: string; accept?: string; maxMB?: number
}) {
  const [uploading, setUploading] = useState(false)
  const [pct, setPct] = useState(0)
  const ref = useRef<HTMLInputElement>(null)

  const handle = async (file: File) => {
    if (file.size > maxMB * 1024 * 1024) { alert(`Max ${maxMB}MB allowed`); return }
    setUploading(true); setPct(0)
    try {
      const r = await uploadToCloudinary(file, folder, p => setPct(p))
      onAdd({ url: r.url, publicId: r.publicId, name: r.name, size: r.size, type: file.type, uploadedAt: new Date().toISOString() })
    } catch { alert('Upload failed') }
    finally { setUploading(false); setPct(0) }
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => ref.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handle(f) }}
        className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-all">
        {uploading ? (
          <div>
            <p className="text-sm text-slate-500 mb-2">Uploading… {pct}%</p>
            <div className="progress w-48 mx-auto"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          </div>
        ) : (
          <>
            <Upload size={20} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-600">Drop file or click to upload</p>
            <p className="text-xs text-slate-400 mt-0.5">Max {maxMB}MB · JPG PNG PDF DOC</p>
          </>
        )}
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handle(f) }} />
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
              <FileIcon size={15} className="text-brand-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{f.name}</p>
                <p className="text-[10px] text-slate-400">{formatBytes(f.size)}</p>
              </div>
              <a href={f.url} target="_blank" rel="noreferrer" className="text-[11px] text-brand-600 font-medium hover:underline">View</a>
              <button onClick={() => onRemove(i)} className="btn-icon w-6 h-6 text-red-400"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── LoadingSpinner ────────────────────────────────────────
export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-brand-600" />
}

// ── Timeline ──────────────────────────────────────────────
import { formatDateTime } from '@/lib/utils'
import type { ActivityLog } from '@/types'

export function Timeline({ logs }: { logs: ActivityLog[] }) {
  return (
    <div className="space-y-4">
      {logs.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No activity yet</p>}
      {logs.map((log, i) => (
        <div key={log.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full bg-brand-100 border-2 border-brand-200 flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-brand-500" />
            </div>
            {i < logs.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 mt-1" />}
          </div>
          <div className="pb-4 min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-700">{log.action}</p>
            <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-brand-600">{log.userName}</span>
              <span className="text-[10px] text-slate-400">{formatDateTime(log.timestamp)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
