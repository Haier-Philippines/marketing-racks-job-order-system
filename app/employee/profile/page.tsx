'use client'
// app/employee/profile/page.tsx
import { useEffect, useState } from 'react'
import EmployeeLayout from '@/components/shared/EmployeeLayout'
import { Spinner } from '@/components/ui/index'
import { useAuthStore } from '@/stores'
import { userService } from '@/services/index'
import { authService } from '@/services/authService'
import {
  updatePassword, reauthenticateWithCredential,
  EmailAuthProvider, type User as FBUser,
} from 'firebase/auth'
import { auth } from '@/firebase/config'
import { getInitials } from '@/lib/utils'
import { User, Mail, Phone, Building2, Hash, Camera, Eye, EyeOff, Save } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DEPARTMENTS } from '@/types'

export default function EmployeeProfilePage() {
  const { user, setUser } = useAuthStore() as any
  const [saving, setSaving]     = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [showCurr, setShowCurr] = useState(false)
  const [showNew, setShowNew]   = useState(false)
  const [showConf, setShowConf] = useState(false)

  const [form, setForm] = useState({
    fullName:    user?.fullName ?? '',
    email:       user?.email ?? '',
    phoneNumber: user?.phoneNumber ?? '',
    department:  user?.department ?? 'Marketing',
  })

  const [pwForm, setPwForm] = useState({
    current: '', newPw: '', confirm: '',
  })

  const F = (k: keyof typeof form) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))
  const PF = (k: keyof typeof pwForm) => (e: any) => setPwForm(p => ({ ...p, [k]: e.target.value }))

  const handleSaveProfile = async () => {
    if (!user) return
    if (!form.fullName.trim() || !form.phoneNumber.trim()) {
      toast.error('Name and phone are required'); return
    }
    setSaving(true)
    try {
      await userService.update(user.uid, {
        fullName:    form.fullName,
        phoneNumber: form.phoneNumber,
        department:  form.department as any,
      })
      // Update local store
      if (setUser) setUser({ ...user, fullName: form.fullName, phoneNumber: form.phoneNumber, department: form.department })
      toast.success('Profile updated!')
    } catch { toast.error('Update failed') }
    finally { setSaving(false) }
  }

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) {
      toast.error('Fill all password fields'); return
    }
    if (pwForm.newPw.length < 6) { toast.error('New password min 6 characters'); return }
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Passwords do not match'); return }

    setChangingPw(true)
    try {
      const fbUser = auth.currentUser
      if (!fbUser || !fbUser.email) throw new Error('Not authenticated')
      const cred = EmailAuthProvider.credential(fbUser.email, pwForm.current)
      await reauthenticateWithCredential(fbUser, cred)
      await updatePassword(fbUser, pwForm.newPw)
      setPwForm({ current: '', newPw: '', confirm: '' })
      toast.success('Password changed successfully!')
    } catch (err: any) {
      if (err.code === 'auth/wrong-password') toast.error('Current password is incorrect')
      else toast.error(err.message ?? 'Failed to change password')
    } finally { setChangingPw(false) }
  }

  if (!user) return <EmployeeLayout><div className="flex items-center justify-center py-20"><Spinner size={28} /></div></EmployeeLayout>

  const employeeId = `EMP-${new Date(user.createdAt).getFullYear()}-${user.uid.slice(0, 4).toUpperCase()}`

  return (
    <EmployeeLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <h1 className="page-title">Profile</h1>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Avatar + basic info */}
          <div className="card-pad flex flex-col items-center text-center gap-4">
            <div className="relative">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-brand-100" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-brand-600 flex items-center justify-center text-white text-3xl font-bold">
                  {getInitials(user.fullName)}
                </div>
              )}
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm">
                <Camera size={14} className="text-slate-600" />
              </button>
            </div>

            <div>
              <p className="font-bold text-slate-800 text-lg">{user.fullName}</p>
              <p className="text-sm text-slate-500">{user.department}</p>
            </div>

            <div className="w-full space-y-2 text-sm text-left">
              {[
                { icon: Mail,      label:'Email',       value:user.email },
                { icon: Phone,     label:'Phone',       value:user.phoneNumber || '—' },
                { icon: Building2, label:'Department',  value:user.department },
                { icon: Hash,      label:'Employee ID', value:employeeId },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50">
                  <f.icon size={14} className="text-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400">{f.label}</p>
                    <p className="text-sm font-medium text-slate-700 truncate">{f.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit forms */}
          <div className="md:col-span-2 space-y-5">
            {/* Update Profile */}
            <div className="card-pad space-y-4">
              <h2 className="sec-title">Update Profile</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="field-label">Full Name</label>
                  <input value={form.fullName} onChange={F('fullName')} className="field" placeholder="Full name" />
                </div>
                <div className="col-span-2">
                  <label className="field-label">Email Address</label>
                  <input value={form.email} readOnly className="field bg-slate-50 text-slate-400 cursor-not-allowed" />
                  <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed. Contact IT Admin.</p>
                </div>
                <div>
                  <label className="field-label">Phone Number</label>
                  <input value={form.phoneNumber} onChange={F('phoneNumber')} placeholder="09XX-XXX-XXXX" className="field" />
                </div>
                <div>
                  <label className="field-label">Department</label>
                  <select value={form.department} onChange={F('department')} className="field">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <Spinner size={14} /> : <Save size={14} />}
                  Update Profile
                </button>
              </div>
            </div>

            {/* Change Password */}
            <div className="card-pad space-y-4">
              <h2 className="sec-title">Change Password</h2>
              <div className="space-y-3">
                <div>
                  <label className="field-label">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurr ? 'text' : 'password'}
                      value={pwForm.current} onChange={PF('current')}
                      placeholder="Enter current password" className="field pr-10"
                    />
                    <button type="button" onClick={() => setShowCurr(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showCurr ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="field-label">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={pwForm.newPw} onChange={PF('newPw')}
                      placeholder="Enter new password" className="field pr-10"
                    />
                    <button type="button" onClick={() => setShowNew(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="field-label">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConf ? 'text' : 'password'}
                      value={pwForm.confirm} onChange={PF('confirm')}
                      placeholder="Confirm new password" className="field pr-10"
                    />
                    <button type="button" onClick={() => setShowConf(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleChangePassword} disabled={changingPw} className="btn-primary flex items-center gap-2">
                  {changingPw ? <Spinner size={14} /> : <Save size={14} />}
                  Update Password
                </button>
              </div>
            </div>

            {/* Account info */}
            <div className="card-pad space-y-3 text-sm">
              <h2 className="sec-title">Account Information</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Role',        user.role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())],
                  ['Employee ID', employeeId],
                  ['Status',      user.status],
                  ['Member since',new Date(user.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'long' })],
                ].map(([l, v]) => (
                  <div key={String(l)}>
                    <p className="field-label">{l}</p>
                    <p className="font-medium text-slate-700">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </EmployeeLayout>
  )
}
