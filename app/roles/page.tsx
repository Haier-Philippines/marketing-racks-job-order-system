'use client'
// app/roles/page.tsx
import { useState } from 'react'
import AppLayout from '@/components/shared/AppLayout'
import { PageHeader, Modal } from '@/components/ui/index'
import { ROLE_LABELS } from '@/types'
import type { UserRole } from '@/types'
import { Shield, Check, X, Pencil, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLES: { key: UserRole; desc: string; users: number }[] = [
  { key: 'it_admin',          desc: 'Full access to the system',                                    users: 2 },
  { key: 'sales_director',    desc: 'Approves requests for local/expat category racks',             users: 3 },
  { key: 'sellout',           desc: 'Approves requests for local/expat category racks',             users: 3 },
  { key: 'pm',                desc: 'Approves requests for WM and KDA categories',                  users: 2 },
  { key: 'marketing_manager', desc: 'Final approval for all requests',                              users: 2 },
  { key: 'marketing_director', desc: 'Final approval for all requests',                              users: 1 },
  { key: 'approver',          desc: 'Can approve/reject requests for assigned categories',          users: 5 },
  { key: 'technician',        desc: 'Handles installations and maintenance',                        users: 4 },
  { key: 'marketing_staff',   desc: 'Can create and view request status',                           users: 8 },
  { key: 'viewer',            desc: 'Read-only access to requests and inventory',                   users: 2 },
]

const PERMISSIONS = [
  { label: 'Dashboard',        desc: 'View dashboard and analytics' },
  { label: 'Job Orders - View', desc: 'View all job orders' },
  { label: 'Job Orders - Create', desc: 'Create new job orders' },
  { label: 'Job Orders - Edit', desc: 'Edit existing job orders' },
  { label: 'Job Orders - Delete', desc: 'Delete job orders' },
  { label: 'Inventory - View', desc: 'View rack inventory' },
  { label: 'Inventory - Manage', desc: 'Add/edit/delete racks' },
  { label: 'Installations',    desc: 'Manage installation schedules' },
  { label: 'Approvals',        desc: 'Approve/reject requests' },
  { label: 'User Management',  desc: 'Manage system users' },
  { label: 'Reports',          desc: 'Generate and export reports' },
  { label: 'Settings',         desc: 'System configuration' },
]

// Permission matrix: role → permission → has access
const MATRIX: Record<UserRole, boolean[]> = {
  it_admin:           [true,true,true,true,true,true,true,true,true,true,true,true],
  sales_director:     [true,true,false,false,false,true,false,false,true,false,true,false],
  pm:                 [true,true,false,false,false,true,false,false,true,false,true,false],
  marketing_manager:  [true,true,false,false,false,true,false,false,true,false,true,false],
  technician:         [/* existing values */],
  marketing_staff:    [/* existing values */],
  approver:            [/* existing values */],

  marketing_director: [true,true,false,false,false,true,false,false,true,false,true,false],
  sellout:            [true,true,false,false,false,true,false,false,true,false,true,false],

  viewer:             [/* existing values */],
}

type PageTab = 'roles' | 'permissions'

export default function RolesPage() {
  const [tab, setTab] = useState<PageTab>('roles')
  const [editRole, setEditRole] = useState<typeof ROLES[0] | null>(null)

  return (
    <AppLayout allowedRoles={['it_admin']}>
      <div className="space-y-4">
        <PageHeader title="User Roles & Permissions" subtitle="Manage system roles and feature access" />

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200">
          {(['roles', 'permissions'] as PageTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-1 pb-3 text-sm font-semibold border-b-2 -mb-px transition-all capitalize',
                tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
              {t}
            </button>
          ))}
        </div>

        {/* Roles Tab */}
        {tab === 'roles' && (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role Name</th><th>Description</th><th>Users</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {ROLES.map(role => (
                  <tr key={role.key}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                          <Shield size={14} className="text-brand-600" />
                        </div>
                        <span className="font-semibold text-sm text-slate-800">{ROLE_LABELS[role.key]}</span>
                      </div>
                    </td>
                    <td className="text-sm text-slate-500 max-w-xs">{role.desc}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Users size={13} className="text-slate-400" />
                        <span className="text-sm text-slate-600">{role.users}</span>
                      </div>
                    </td>
                    <td>
                      <button onClick={() => setEditRole(role)} className="btn-icon">
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Permissions Matrix Tab */}
        {tab === 'permissions' && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th className="min-w-[160px]">Permission</th>
                    {ROLES.map(r => (
                      <th key={r.key} className="text-center min-w-[100px]">{ROLE_LABELS[r.key]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS.map((perm, pi) => (
                    <tr key={perm.label}>
                      <td>
                        <p className="font-medium text-slate-700">{perm.label}</p>
                        <p className="text-[10px] text-slate-400">{perm.desc}</p>
                      </td>
                      {ROLES.map(role => (
                        <td key={role.key} className="text-center">
                          {MATRIX[role.key][pi] ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                              <Check size={11} className="text-green-600" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100">
                              <X size={11} className="text-slate-400" />
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      <Modal open={!!editRole} onClose={() => setEditRole(null)}
        title={`Edit Role: ${editRole ? ROLE_LABELS[editRole.key] : ''}`} size="md"
        footer={<>
          <button onClick={() => setEditRole(null)} className="btn-secondary">Cancel</button>
          <button onClick={() => { setEditRole(null) }} className="btn-primary">Save Changes</button>
        </>}>
        {editRole && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-800">{ROLE_LABELS[editRole.key]}</p>
              <p className="text-sm text-slate-500 mt-1">{editRole.desc}</p>
              <p className="text-xs text-slate-400 mt-1">{editRole.users} users assigned</p>
            </div>
            <div>
              <p className="field-label mb-2">Permissions</p>
              <div className="space-y-2">
                {PERMISSIONS.map((perm, i) => (
                  <label key={perm.label} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" defaultChecked={MATRIX[editRole.key][i]}
                      className="w-4 h-4 accent-brand-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{perm.label}</p>
                      <p className="text-[11px] text-slate-400">{perm.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
