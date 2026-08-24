'use client'
// app/users/page.tsx
import { useEffect, useState } from 'react'
import AppLayout from '@/components/shared/AppLayout'
import { PageHeader, StatusBadge, SearchBar, EmptyState, TableSkeleton, Pagination, Modal, ConfirmDialog } from '@/components/ui/index'
import { userService } from '@/services/index'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores'
import type { AppUser, UserRole } from '@/types'
import { DEPARTMENTS, ROLE_LABELS } from '@/types'
import { getInitials, formatDate, cn } from '@/lib/utils'
import { Plus, MoreVertical, Eye, Pencil, Trash2, RefreshCw, Users, Shield } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const ROLE_OPTIONS: UserRole[] = ['it_admin','marketing_manager','marketing_staff','pm','sales_director', 'sellout', 'approver','technician','viewer']

type FilterTab = 'all' | 'byRole' | 'byDept'

export default function UsersPage() {
  const { user: me } = useAuthStore()
  const [users, setUsers]     = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [roleF, setRoleF]     = useState<UserRole | ''>('')
  const [deptF, setDeptF]     = useState('')
  const [tab, setTab]         = useState<FilterTab>('all')
  const [page, setPage]       = useState(1)
  const pageSize = 10
  const [editModal, setEditModal] = useState<AppUser | null>(null)
  const [editForm, setEditForm]   = useState({ role: '' as UserRole, department: '', status: '' })
  const [saving, setSaving]       = useState(false)
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [deleting, setDeleting]   = useState(false)
  const [openMenu, setOpenMenu]   = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try { setUsers(await userService.getAll()) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = users.filter(u => {
    const ms = u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const rs = !roleF || u.role === roleF
    const ds = !deptF || u.department === deptF
    return ms && rs && ds
  })
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filtered.length / pageSize)

  const openEdit = (u: AppUser) => {
    setEditModal(u)
    setEditForm({ role: u.role, department: u.department, status: u.status })
  }

  const handleEdit = async () => {
    if (!editModal) return
    setSaving(true)
    try {
      await userService.update(editModal.uid, { role: editForm.role, department: editForm.department as any, status: editForm.status as any })
      toast.success('User updated!')
      setEditModal(null); load()
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try { await userService.delete(deleteId); toast.success('User deleted'); load() }
    catch { toast.error('Failed') }
    finally { setDeleting(false); setDeleteId(null) }
  }

  const toggleStatus = async (u: AppUser) => {
    await userService.update(u.uid, { status: u.status === 'Active' ? 'Inactive' : 'Active' })
    toast.success('Status updated'); load()
  }

  const roleColors: Record<UserRole, string> = {
  it_admin: 'bg-red-50 text-red-700',
  marketing_manager: 'bg-purple-50 text-purple-700',
  marketing_staff: 'bg-blue-50 text-blue-700',
  pm: 'bg-amber-50 text-amber-700',
  sales_director: 'bg-green-50 text-green-700',
  approver: 'bg-cyan-50 text-cyan-700',
  technician: 'bg-orange-50 text-orange-700',
  viewer: 'bg-slate-50 text-slate-700',

  marketing_director: 'bg-indigo-50 text-indigo-700',
  sellout: 'bg-teal-50 text-teal-700',
}

  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader
          title="Users Management"
          subtitle={`${users.length} users registered`}
          actions={
            <>
              <button onClick={load} className="btn-secondary p-2"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button>
              <Link href="/users/new" className="btn-primary flex items-center gap-2">
                <Plus size={14} /> Add User
              </Link>
            </>
          }
        />

        {/* Filter Tabs */}
        <div className="card-pad flex flex-wrap items-center gap-3">
          <div className="flex gap-1 border border-slate-200 rounded-lg p-0.5">
            {([['all','All Users'],['byRole','By Role'],['byDept','By Department']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  tab === k ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100')}>
                {l}
              </button>
            ))}
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name or email…" className="flex-1 min-w-48" />
          {tab === 'byRole' && (
            <select value={roleF} onChange={e => setRoleF(e.target.value as any)} className="field-sm w-44">
              <option value="">All Roles</option>
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          )}
          {tab === 'byDept' && (
            <select value={deptF} onChange={e => setDeptF(e.target.value)} className="field-sm w-40">
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}><TableSkeleton rows={6} cols={6} /></td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={6}>
                    <EmptyState icon={Users} title="No users found"
                      action={<Link href="/users/new" className="btn-primary btn-sm">Add User</Link>} />
                  </td></tr>
                ) : paged.map(u => (
                  <tr key={u.uid}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="avatar text-[11px]" style={{ background: '#1a56db' }}>
                            {getInitials(u.fullName)}
                          </div>
                        )}
                        <p className="font-medium text-sm text-slate-800">{u.fullName}</p>
                      </div>
                    </td>
                    <td className="text-xs text-slate-500">{u.email}</td>
                    <td>
                      <span className={cn('status-badge text-[11px]', roleColors[u.role])}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="text-sm text-slate-600">{u.department}</td>
                    <td><StatusBadge status={u.status} type="user" /></td>
                    <td>
                      <div className="relative">
                        <button onClick={() => setOpenMenu(openMenu === u.uid ? null : u.uid)} className="btn-icon">
                          <MoreVertical size={15} />
                        </button>
                        {openMenu === u.uid && (
                          <div className="absolute right-0 top-8 z-20 card shadow-lg w-40 py-1 animate-fade-in"
                            onMouseLeave={() => setOpenMenu(null)}>
                            <button onClick={() => { openEdit(u); setOpenMenu(null) }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full">
                              <Pencil size={13} /> Edit Role
                            </button>
                            <button onClick={() => { toggleStatus(u); setOpenMenu(null) }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full">
                              <Shield size={13} /> Toggle Status
                            </button>
                            {me?.uid !== u.uid && (
                              <button onClick={() => { setDeleteId(u.uid); setOpenMenu(null) }}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
                                <Trash2 size={13} /> Delete
                              </button>
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
          {!loading && filtered.length > pageSize && (
            <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPage={setPage} />
          )}
        </div>
      </div>

      {/* Edit Role Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit: ${editModal?.fullName}`} size="sm"
        footer={<>
          <button onClick={() => setEditModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleEdit} disabled={saving} className="btn-primary">Save Changes</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="field-label">Role</label>
            <select value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value as UserRole }))} className="field">
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Department</label>
            <select value={editForm.department} onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))} className="field">
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Status</label>
            <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} className="field">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete User" message="This will permanently remove the user account." danger loading={deleting} />
    </AppLayout>
  )
}
