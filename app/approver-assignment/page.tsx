'use client'

import { useEffect, useMemo, useState } from 'react'
import AppLayout from '@/components/shared/AppLayout'
import { PageHeader, TableSkeleton, Modal } from '@/components/ui/index'
import { approverService, userService } from '@/services/index'
import { useAuthStore } from '@/stores'
import type {
  ApproverAssignment,
  ApproverAssignmentStep,
  AppUser,
  ApprovalStage,
  Department,
  PMCategory,
  RackCategory,
  UserRole,
} from '@/types'
import {
  APPROVAL_STAGE_LABELS,
  DEPARTMENTS,
  PM_ASSIGNMENT_CATEGORIES,
  PM_CATEGORY_LABELS,
  PM_DEPARTMENT_BY_CATEGORY,
  RACK_CATEGORIES,
  ROLE_LABELS,
} from '@/types'
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type NonPMStage = Exclude<ApprovalStage, 'pm'>

type StageConfig = {
  stage: NonPMStage
  role: UserRole
  label: string
}

const STAGE_CONFIG: StageConfig[] = [
  { stage: 'sales_director', role: 'sales_director', label: 'Step 1 / Sales Director' },
  { stage: 'sellout', role: 'sellout', label: 'Step 2 / Sellout' },
  { stage: 'marketing_manager', role: 'marketing_manager', label: 'Step 4 / Marketing Manager' },
  { stage: 'marketing_director', role: 'marketing_director', label: 'Step 5 / Marketing Director' },
]

type FormStep = {
  approverId: string
  active: boolean
}

type PMFormState = Record<PMCategory, FormStep>

type FormState = {
  department: Department
  rackCategory: RackCategory | 'All'
  steps: {
    sales_director: FormStep
    sellout: FormStep
    marketing_manager: FormStep
    marketing_director: FormStep
    pm: PMFormState
  }
}

const createPMFormState = (): PMFormState => {
  const result = {} as PMFormState
  for (const category of PM_ASSIGNMENT_CATEGORIES) {
    result[category] = { approverId: '', active: true }
  }
  return result
}

const createInitialSteps = (): FormState['steps'] => ({
  sales_director: { approverId: '', active: true },
  sellout: { approverId: '', active: true },
  marketing_manager: { approverId: '', active: true },
  marketing_director: { approverId: '', active: true },
  pm: createPMFormState(),
})

const createEmptyForm = (): FormState => ({
  department: 'Marketing',
  rackCategory: 'All',
  steps: createInitialSteps(),
})

export default function ApproverAssignmentPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'it_admin'

  const [assignments, setAssignments] = useState<ApproverAssignment[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<ApproverAssignment | null>(null)
  const [form, setForm] = useState<FormState>(createEmptyForm())
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'dept' | 'user'>('dept')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [aList, uList] = await Promise.all([
        approverService.getAll(),
        userService.getAll(),
      ])
      setAssignments(aList)
      setUsers(uList)
    } catch (error) {
      console.error('Failed to load approver assignments:', error)
      toast.error('Failed to load approver assignments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(createEmptyForm())
    setModal(true)
  }

  const openEdit = (assignment: ApproverAssignment) => {
    setEditing(assignment)

    const nextSteps = createInitialSteps()
    for (const stage of STAGE_CONFIG) {
      const existing = assignment.steps.find(step => step.stage === stage.stage && !step.pmCategory)
      if (existing) {
        nextSteps[stage.stage] = {
          approverId: existing.approverId,
          active: existing.active,
        }
      }
    }

    for (const category of PM_ASSIGNMENT_CATEGORIES) {
      const existing = assignment.steps.find(
        step => step.stage === 'pm' && step.pmCategory === category
      )
      nextSteps.pm[category] = {
        approverId: existing?.approverId ?? '',
        active: existing?.active ?? true,
      }
    }

    setForm({
      department: assignment.department,
      rackCategory: assignment.rackCategory,
      steps: nextSteps,
    })
    setModal(true)
  }

  const getUsersByRole = (role: UserRole) => users.filter(u => u.role === role)

  const setStepApprover = (stage: ApprovalStage, approverId: string) => {
    setForm(previous => ({
      ...previous,
      steps: {
        ...previous.steps,
        [stage]: {
          ...previous.steps[stage],
          approverId,
        },
      },
    }))
  }

  const setStepActive = (stage: ApprovalStage, active: boolean) => {
    setForm(previous => ({
      ...previous,
      steps: {
        ...previous.steps,
        [stage]: {
          ...previous.steps[stage],
          active,
        },
      },
    }))
  }

  const setPMApprover = (pmCategory: PMCategory, approverId: string) => {
    setForm(previous => ({
      ...previous,
      steps: {
        ...previous.steps,
        pm: {
          ...previous.steps.pm,
          [pmCategory]: {
            ...previous.steps.pm[pmCategory],
            approverId,
          },
        },
      },
    }))
  }

  const setPMActive = (pmCategory: PMCategory, active: boolean) => {
    setForm(previous => ({
      ...previous,
      steps: {
        ...previous.steps,
        pm: {
          ...previous.steps.pm,
          [pmCategory]: {
            ...previous.steps.pm[pmCategory],
            active,
          },
        },
      },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const existingPMMap = new Map(
        (editing?.steps ?? []).filter(step => step.stage === 'pm' && step.pmCategory)
          .map(step => [step.pmCategory as PMCategory, step])
      )

      const steps: ApproverAssignmentStep[] = []
      let sequence = 1

      for (const config of STAGE_CONFIG) {
        const stepForm = form.steps[config.stage]
        const selectedUser = users.find(u => u.uid === stepForm.approverId)

        if (stepForm.active && !selectedUser) {
          toast.error(`${config.label}: approver is required when enabled`)
          return
        }

        if (selectedUser && selectedUser.role !== config.role) {
          toast.error(`${config.label}: selected user role is invalid`)
          return
        }

        if (stepForm.active && selectedUser) {
          const existing = editing?.steps.find(step => step.stage === config.stage && !step.pmCategory)
          steps.push({
            id: existing?.id ?? crypto.randomUUID(),
            sequence: sequence++,
            approverId: selectedUser.uid,
            approverName: selectedUser.fullName,
            approverRole: config.role,
            stage: config.stage,
            active: true,
          })
        } else if (!stepForm.active) {
          const existing = editing?.steps.find(step => step.stage === config.stage && !step.pmCategory)
          steps.push({
            id: existing?.id ?? crypto.randomUUID(),
            sequence: sequence++,
            approverId: '',
            approverName: '',
            approverRole: config.role,
            stage: config.stage,
            active: false,
          })
        }
      }

      for (const category of PM_ASSIGNMENT_CATEGORIES) {
        const stepForm = form.steps.pm[category]
        const selectedUser = users.find(u => u.uid === stepForm.approverId)

        if (stepForm.active && !selectedUser) {
          toast.error(`${PM_CATEGORY_LABELS[category]} requires an approver`)
          return
        }

        if (selectedUser && selectedUser.role !== 'pm') {
          toast.error(`${PM_CATEGORY_LABELS[category]} must use a PM user`)
          return
        }

        if (selectedUser && selectedUser.department !== PM_DEPARTMENT_BY_CATEGORY[category]) {
          toast.error(`${PM_CATEGORY_LABELS[category]} can only assign PM users from ${PM_DEPARTMENT_BY_CATEGORY[category]}`)
          return
        }

        const existing = existingPMMap.get(category)
        steps.push({
          id: existing?.id ?? crypto.randomUUID(),
          sequence: sequence++,
          approverId: selectedUser?.uid ?? '',
          approverName: selectedUser?.fullName ?? '',
          approverRole: 'pm',
          stage: 'pm',
          active: stepForm.active,
          pmCategory: category,
        })
      }

      const data: Omit<ApproverAssignment, 'id' | 'createdAt' | 'updatedAt'> = {
        department: form.department,
        rackCategory: form.rackCategory,
        steps,
      }

      if (editing) {
        await approverService.update(editing.id, data)
        toast.success('Approver assignment updated!')
      } else {
        await approverService.create(data)
        toast.success('Approver assigned successfully!')
      }

      setModal(false)
      await load()
    } catch (error) {
      console.error('Failed to save approver assignment:', error)
      toast.error('Failed to save approver assignment')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this approver assignment?')) return
    try {
      await approverService.delete(id)
      toast.success('Assignment removed')
      await load()
    } catch (error) {
      console.error('Failed to delete assignment:', error)
      toast.error('Failed to remove assignment')
    }
  }

  const getStageLabel = (stage: ApprovalStage) => {
    return APPROVAL_STAGE_LABELS[stage] ?? stage
  }

  const renderPMCell = (assignment: ApproverAssignment) => {
    const pmSteps = assignment.steps.filter(step => step.stage === 'pm').sort((a, b) => a.sequence - b.sequence)
    if (!pmSteps.length) return '—'

    return (
      <div className="space-y-1.5 text-left">
        {pmSteps.map(step => {
          if (!step.active) return null
          if (!step.approverId) {
            return (
              <div key={step.id} className="text-[11px] text-amber-600">
                {PM_CATEGORY_LABELS[step.pmCategory ?? 'Ref']} enabled (No approver)
              </div>
            )
          }
          return (
            <div key={step.id} className="text-[11px]">
              <span className="font-semibold text-slate-700">{PM_CATEGORY_LABELS[step.pmCategory ?? 'Ref']}</span>
              <span className="text-slate-500"> → {step.approverName}</span>
            </div>
          )
        })}
      </div>
    )
  }

  const renderStepCell = (step: ApproverAssignmentStep | undefined) => {
    if (!step) return '—'
    if (!step.active) return <span className="text-xs text-slate-400">Disabled</span>
    if (!step.approverId) return <span className="text-xs text-amber-600">Enabled (No Approver)</span>
    return (
      <div>
        <div className="font-medium">{step.approverName}</div>
        <div className="text-[10px] text-slate-400">{getStageLabel(step.stage)}</div>
      </div>
    )
  }

  const filteredAssignments = useMemo(() => assignments.filter(assignment => {
    const deptOk = !departmentFilter || assignment.department === departmentFilter
    const categoryOk = !categoryFilter || assignment.rackCategory === categoryFilter
    return deptOk && categoryOk
  }), [assignments, departmentFilter, categoryFilter])

  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader
          title="Approver Assignment"
          subtitle="Configure approval hierarchy by department and rack category"
          actions={
            <>
              <button onClick={load} className="btn-secondary p-2">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
              {isAdmin && (
                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                  <Plus size={14} />
                  Assign Approver
                </button>
              )}
            </>
          }
        />

        <div className="flex gap-4 border-b border-slate-200">
          {([
            ['dept', 'By Department / Category'],
            ['user', 'By User'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'px-1 pb-3 text-sm font-semibold border-b-2 -mb-px transition-all',
                tab === key ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'dept' && (
          <div className="space-y-4">
            <div className="card-pad flex gap-3">
              <select value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)} className="field-sm w-40">
                <option value="">All Departments</option>
                {DEPARTMENTS.map(department => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>

              <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="field-sm w-44">
                <option value="">All Rack Category</option>
                {RACK_CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="card overflow-hidden">
              {loading ? <TableSkeleton rows={5} cols={5} /> : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Rack Category</th>
                      <th>Step 1 / Sales Director</th>
                      <th>Step 2 / Sellout</th>
                      <th>Step 3 / PM</th>
                      <th>Step 4 / Marketing Manager</th>
                      <th>Step 5 / Marketing Director</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.length > 0 ? filteredAssignments.map(assignment => {
                      const step1 = assignment.steps.find(step => step.stage === 'sales_director' && !step.pmCategory)
                      const step2 = assignment.steps.find(step => step.stage === 'sellout' && !step.pmCategory)
                      const step4 = assignment.steps.find(step => step.stage === 'marketing_manager' && !step.pmCategory)
                      const step5 = assignment.steps.find(step => step.stage === 'marketing_director' && !step.pmCategory)

                      return (
                        <tr key={assignment.id}>
                          <td className="font-medium text-slate-800">{assignment.department}</td>
                          <td><span className="status-badge bg-brand-50 text-brand-700 text-[11px]">{assignment.rackCategory}</span></td>
                          <td className="text-sm text-slate-600">{renderStepCell(step1)}</td>
                          <td className="text-sm text-slate-600">{renderStepCell(step2)}</td>
                          <td className="text-sm text-slate-600">{renderPMCell(assignment)}</td>
                          <td className="text-sm text-slate-600">{renderStepCell(step4)}</td>
                          <td className="text-sm text-slate-600">{renderStepCell(step5)}</td>
                          <td>
                            {isAdmin && (
                              <div className="flex items-center gap-1">
                                <button onClick={() => openEdit(assignment)} className="btn-icon"><Pencil size={13} /></button>
                                <button onClick={() => handleDelete(assignment.id)} className="btn-icon text-red-400"><Trash2 size={13} /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    }) : (
                      <tr>
                        <td colSpan={8} className="text-center text-sm text-slate-500 py-8">No approver assignments found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab === 'user' && (
          <div className="card overflow-hidden">
            {loading ? <TableSkeleton rows={5} cols={4} /> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Assigned Categories</th>
                    <th>Total Assignments</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(user => ['sales_director', 'sellout', 'pm', 'marketing_manager', 'marketing_director'].includes(user.role)).map(user => {
                    const assigned = assignments.filter(assignment => assignment.steps.some(step => step.approverId === user.uid && step.active))
                    return (
                      <tr key={user.uid}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-[10px] font-bold text-white">
                              {user.fullName.split(' ').map(name => name[0]).join('').slice(0, 2)}
                            </div>
                            <p className="font-medium text-sm text-slate-800">{user.fullName}</p>
                          </div>
                        </td>
                        <td><span className="status-badge bg-purple-50 text-purple-700 text-[11px]">{ROLE_LABELS[user.role]}</span></td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {assigned.length > 0 ? assigned.slice(0, 3).map(assignment => (
                              <span key={assignment.id} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">{assignment.rackCategory}</span>
                            )) : <span className="text-xs text-slate-400">Not assigned</span>}
                          </div>
                        </td>
                        <td className="font-semibold text-slate-700">{assigned.length}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Assignment' : 'Assign Approver'}
        size="sm"
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <RefreshCw size={13} className="animate-spin" />}
              {editing ? 'Save' : 'Assign'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="field-label">Department</label>
            <select value={form.department} onChange={(event) => setForm(prev => ({ ...prev, department: event.target.value as Department }))} className="field">
              {DEPARTMENTS.map(department => <option key={department} value={department}>{department}</option>)}
            </select>
          </div>

          <div>
            <label className="field-label">Rack Category</label>
            <select value={form.rackCategory} onChange={(event) => setForm(prev => ({ ...prev, rackCategory: event.target.value as RackCategory | 'All' }))} className="field">
              <option value="All">All Categories</option>
              {RACK_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>

          {STAGE_CONFIG.map(config => {
            const stepForm = form.steps[config.stage]
            const roleUsers = getUsersByRole(config.role)

            return (
              <div key={config.stage} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="field-label">{config.label}</label>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-500">
                    <input type="checkbox" checked={stepForm.active} onChange={event => setStepActive(config.stage, event.target.checked)} />
                    Enabled
                  </label>
                </div>
                <select value={stepForm.approverId} onChange={event => setStepApprover(config.stage, event.target.value)} className="field" disabled={!stepForm.active}>
                  <option value="">— Select {APPROVAL_STAGE_LABELS[config.stage]} —</option>
                  {roleUsers.map(user => <option key={user.uid} value={user.uid}>{user.fullName} ({ROLE_LABELS[user.role]})</option>)}
                </select>
              </div>
            )
          })}

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-700">Step 3 / PM Category Mapping</p>
            {PM_ASSIGNMENT_CATEGORIES.map(category => {
              const pmStep = form.steps.pm[category]
              const pmUsers = users.filter(user => user.role === 'pm' && user.department === PM_DEPARTMENT_BY_CATEGORY[category])
              return (
                <div key={category} className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="flex items-center justify-between">
                    <label className="field-label">{PM_CATEGORY_LABELS[category]}</label>
                    <label className="inline-flex items-center gap-2 text-xs text-slate-500">
                      <input type="checkbox" checked={pmStep.active} onChange={event => setPMActive(category, event.target.checked)} />
                      Enabled
                    </label>
                  </div>
                  <select value={pmStep.approverId} onChange={event => setPMApprover(category, event.target.value)} className="field" disabled={!pmStep.active}>
                    <option value="">— Select {PM_CATEGORY_LABELS[category]} —</option>
                    {pmUsers.map(user => <option key={user.uid} value={user.uid}>{user.fullName} ({user.department})</option>)}
                  </select>
                </div>
              )
            })}
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
