// lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RequestStatus, RackStatus, InstallStatus, Priority } from '@/types'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

// ── Status configs ────────────────────────────────────────
export const REQUEST_STATUS_CONFIG: Record<RequestStatus, { label: string; bg: string; text: string; dot: string }> = {
  'For Approval': { label:'For Approval', bg:'bg-amber-50',   text:'text-amber-700',  dot:'bg-amber-400'  },
  'In Progress':  { label:'In Progress',  bg:'bg-blue-50',    text:'text-blue-700',   dot:'bg-blue-500'   },
  'Approved':     { label:'Approved',     bg:'bg-emerald-50', text:'text-emerald-700',dot:'bg-emerald-500'},
  'Completed':    { label:'Completed',    bg:'bg-green-50',   text:'text-green-700',  dot:'bg-green-500'  },
  'Rejected':     { label:'Rejected',     bg:'bg-red-50',     text:'text-red-700',    dot:'bg-red-500'    },
  'Cancelled':    { label:'Cancelled',    bg:'bg-slate-50',   text:'text-slate-600',  dot:'bg-slate-400'  },
  'Returned':     { label:'Returned',     bg:'bg-purple-50',  text:'text-purple-700', dot:'bg-purple-500' },
}

export const RACK_STATUS_CONFIG: Record<RackStatus, { label:string; bg:string; text:string }> = {
  Available:   { label:'Available',   bg:'bg-green-50',  text:'text-green-700'  },
  'In Use':    { label:'In Use',      bg:'bg-blue-50',   text:'text-blue-700'   },
  Maintenance: { label:'Maintenance', bg:'bg-amber-50',  text:'text-amber-700'  },
  Damaged:     { label:'Damaged',     bg:'bg-red-50',    text:'text-red-700'    },
  Retired:     { label:'Retired',     bg:'bg-slate-50',  text:'text-slate-600'  },
}

export const INSTALL_STATUS_CONFIG: Record<InstallStatus, { label:string; bg:string; text:string }> = {
  Scheduled:   { label:'Scheduled',   bg:'bg-blue-50',   text:'text-blue-700'   },
  'In Progress':{ label:'In Progress',bg:'bg-amber-50',  text:'text-amber-700'  },
  Completed:   { label:'Completed',   bg:'bg-green-50',  text:'text-green-700'  },
  Cancelled:   { label:'Cancelled',   bg:'bg-red-50',    text:'text-red-700'    },
}

export const PRIORITY_CONFIG: Record<Priority, { bg:string; text:string }> = {
  Low:    { bg:'bg-slate-50',  text:'text-slate-600' },
  Normal: { bg:'bg-blue-50',   text:'text-blue-700'  },
  High:   { bg:'bg-amber-50',  text:'text-amber-700' },
  Urgent: { bg:'bg-red-50',    text:'text-red-700'   },
}

export function formatDate(iso: string, fmt = 'MMM D, YYYY') {
  if (!iso) return '—'
  const d = new Date(iso)
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]
  return `${m} ${d.getDate()}, ${d.getFullYear()}`
}

export function formatDateTime(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${formatDate(iso)} ${d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', hour12:true })}`
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function truncate(str: string, n = 40) {
  return str.length > n ? str.slice(0, n) + '…' : str
}

export function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ── Cloudinary ────────────────────────────────────────────
export async function uploadToCloudinary(
  file: File,
  folder = 'marketing-racks/misc',
  onProgress?: (pct: number) => void
): Promise<{ url: string; publicId: string; name: string; size: number }> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
  const preset    = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!

  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', preset)
  form.append('folder', folder)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress?.(Math.round(e.loaded / e.total * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 200) {
        const r = JSON.parse(xhr.responseText)
        resolve({ url: r.secure_url, publicId: r.public_id, name: file.name, size: file.size })
      } else reject(new Error('Upload failed'))
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/upload`)
    xhr.send(form)
  })
}

export const CHART_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316']
