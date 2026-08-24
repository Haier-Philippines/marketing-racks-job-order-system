'use client'
// app/users/new/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/shared/AppLayout'
import { PageHeader, Spinner } from '@/components/ui/index'
import { authService } from '@/services/authService'
import { DEPARTMENTS, ROLE_LABELS } from '@/types'
import type { UserRole } from '@/types'
import { ChevronLeft, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ROLE_OPTIONS: UserRole[] = [
  'it_admin','marketing_manager', 'marketing_director', 'marketing_staff',
  'pm','sales_director', 'sellout', 'approver','technician','viewer',
]

export default function NewUserPage() {
  const router = useRouter()
  const [saving, setSaving]   = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [showCp, setShowCp]   = useState(false)
  const [errors, setErrors]   = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    fullName:    '',
    email:       '',
    role:        'marketing_staff' as UserRole,
    department:  'Marketing',
    phoneNumber: '',
    status:      'Active' as 'Active' | 'Inactive',
    password:    '',
    confirmPw:   '',
  })

  const F = (k: keyof typeof form) => (e: any) => {
    setForm(p => ({ ...p, [k]: e.target.value }))
    setErrors(p => { const n = { ...p }; delete n[k]; return n })
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.fullName.trim())    e.fullName    = 'Full name is required'
    if (!form.email.trim())       e.email       = 'Email is required'
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.phoneNumber.trim()) e.phoneNumber = 'Phone number is required'
    if (!form.password)           e.password    = 'Password is required'
    if (form.password.length < 6) e.password    = 'Minimum 6 characters'
    if (form.password !== form.confirmPw) e.confirmPw = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await authService.createUser(form.email, form.password, {
        fullName:    form.fullName,
        email:       form.email,
        role:        form.role,
        department:  form.department as any,
        phoneNumber: form.phoneNumber,
        status:      form.status,
      })
      toast.success(`User ${form.fullName} created successfully!`)
      router.push('/users')
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setErrors(p => ({ ...p, email: 'This email is already registered' }))
      } else {
        toast.error(err.message ?? 'Failed to create user')
      }
    } finally { setSaving(false) }
  }

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-red-500 text-xs mt-1">{errors[field]}</p> : null

  return (
    <AppLayout allowedRoles={['it_admin']}>
      <div className="max-w-2xl mx-auto space-y-5">
        <PageHeader
          title="Create New User"
          subtitle="Add a new user to the system"
          actions={
            <Link href="/users" className="btn-secondary flex items-center gap-1.5">
              <ChevronLeft size={14} /> Back to Users
            </Link>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal Info */}
          <div className="card-pad space-y-4">
            <h2 className="sec-title">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Full Name *</label>
                <input value={form.fullName} onChange={F('fullName')} placeholder="Enter full name" className={cn('field', errors.fullName && 'border-red-400')} />
                <FieldError field="fullName" />
              </div>
              <div>
                <label className="field-label">Email *</label>
                <input type="email" value={form.email} onChange={F('email')} placeholder="Enter email" className={cn('field', errors.email && 'border-red-400')} />
                <FieldError field="email" />
              </div>
              <div>
                <label className="field-label">Role *</label>
                <select value={form.role} onChange={F('role')} className="field">
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Department *</label>
                <select value={form.department} onChange={F('department')} className="field">
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Phone Number *</label>
                <input value={form.phoneNumber} onChange={F('phoneNumber')} placeholder="Enter phone number" className={cn('field', errors.phoneNumber && 'border-red-400')} />
                <FieldError field="phoneNumber" />
              </div>
              <div>
                <label className="field-label">Status</label>
                <select value={form.status} onChange={F('status')} className="field">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="card-pad space-y-4">
            <h2 className="sec-title">Security</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Password *</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password} onChange={F('password')} placeholder="Min. 6 characters" className={cn('field pr-10', errors.password && 'border-red-400')} />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <FieldError field="password" />
              </div>
              <div>
                <label className="field-label">Confirm Password *</label>
                <div className="relative">
                  <input type={showCp ? 'text' : 'password'} value={form.confirmPw} onChange={F('confirmPw')} placeholder="Confirm password" className={cn('field pr-10', errors.confirmPw && 'border-red-400')} />
                  <button type="button" onClick={() => setShowCp(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showCp ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <FieldError field="confirmPw" />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
              <p className="font-medium text-slate-700 mb-1">Password Requirements</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li className={form.password.length >= 6 ? 'text-green-600' : ''}>At least 6 characters</li>
                <li className={/[A-Z]/.test(form.password) ? 'text-green-600' : ''}>One uppercase letter (recommended)</li>
                <li className={/[0-9]/.test(form.password) ? 'text-green-600' : ''}>One number (recommended)</li>
              </ul>
            </div>
          </div>

          {/* Preview */}
          {form.fullName && (
            <div className="card-pad">
              <p className="field-label mb-3">Preview</p>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-lg">
                  {form.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{form.fullName}</p>
                  <p className="text-xs text-slate-500">{form.email || 'email@example.com'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">
                      {ROLE_LABELS[form.role]}
                    </span>
                    <span className="text-[11px] text-slate-400">{form.department}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pb-8">
            <Link href="/users" className="btn-secondary">Cancel</Link>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Spinner size={14} /> : null}
              {saving ? 'Creating User…' : 'Save User'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
