'use client'
// app/approver/profile/page.tsx
import { useState } from 'react'
import ApproverLayout from '@/components/shared/ApproverLayout'
import { Spinner } from '@/components/ui/index'
import { useAuthStore } from '@/stores'
import { AppUser } from '@/types'
import { userService } from '@/services/index'
import {
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
} from 'firebase/auth'
import { auth } from '@/firebase/config'
import { getInitials } from '@/lib/utils'
import { ROLE_LABELS } from '@/types'
import { DEPARTMENTS } from '@/types'
import { Save, Eye, EyeOff, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function ApproverProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [saving, setSaving]     = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [showCurr, setShowCurr] = useState(false)
  const [showNew, setShowNew]   = useState(false)
  const [showConf, setShowConf] = useState(false)

  const [form, setForm] = useState({
    fullName:    user?.fullName ?? '',
    phoneNumber: user?.phoneNumber ?? '',
    department:  user?.department ?? 'Marketing',
  })
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })

  const F  = (k: keyof typeof form)   => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))
  const PF = (k: keyof typeof pwForm) => (e: any) => setPwForm(p => ({ ...p, [k]: e.target.value }))

  const handleSave = async () => {
    if (!user) return
    if (!form.fullName.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      await userService.update(user.uid, {
        fullName: form.fullName, phoneNumber: form.phoneNumber, department: form.department as any,
      })
      if (updateUser) updateUser({ fullName: form.fullName, phoneNumber: form.phoneNumber, department: form.department })
      toast.success('Profile updated!')
    } catch { toast.error('Update failed') }
    finally { setSaving(false) }
  }

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) { toast.error('Fill all password fields'); return }
    if (pwForm.newPw.length < 6) { toast.error('New password min 6 characters'); return }
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    setChangingPw(true)
    try {
      const fbUser = auth.currentUser
      if (!fbUser?.email) throw new Error('Not authenticated')
      const cred = EmailAuthProvider.credential(fbUser.email, pwForm.current)
      await reauthenticateWithCredential(fbUser, cred)
      await updatePassword(fbUser, pwForm.newPw)
      setPwForm({ current: '', newPw: '', confirm: '' })
      toast.success('Password changed!')
    } catch (err: any) {
      toast.error(err.code === 'auth/wrong-password' ? 'Current password is incorrect' : err.message ?? 'Failed')
    } finally { setChangingPw(false) }
  }

  if (!user) return <ApproverLayout><div className="flex items-center justify-center py-20"><Spinner size={28} /></div></ApproverLayout>

  const employeeId = `EMP-${new Date(user.createdAt).getFullYear()}-${user.uid.slice(0, 4).toUpperCase()}`

  return (
    <ApproverLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <h1 className="page-title">Profile</h1>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Avatar card */}
          <div className="card-pad flex flex-col items-center text-center gap-4">
            <div className="relative">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-brand-100" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-brand-600 flex items-center justify-center text-white text-3xl font-bold">
                  {getInitials(user.fullName)}
                </div>
              )}
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center hover:bg-slate-50 shadow-sm">
                <Camera size={14} className="text-slate-600" />
              </button>
            </div>
            <div>
              <p className="font-bold text-slate-800 text-lg">{user.fullName}</p>
              <p className="text-sm text-slate-500">{ROLE_LABELS[user.role]}</p>
            </div>
            <div className="w-full space-y-2 text-sm text-left">
              {[
                { label:'Email',       value: user.email },
                { label:'Phone',       value: user.phoneNumber || '—' },
                { label:'Department',  value: user.department },
                { label:'Employee ID', value: employeeId },
              ].map(f => (
                <div key={f.label} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-400">{f.label}</p>
                    <p className="text-sm font-medium text-slate-700 truncate">{f.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Forms */}
          <div className="md:col-span-2 space-y-5">
            {/* Update profile */}
            <div className="card-pad space-y-4">
              <h2 className="sec-title">Update Profile</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="field-label">Full Name</label>
                  <input value={form.fullName} onChange={F('fullName')} placeholder="Full name" className="field" />
                </div>
                <div className="col-span-2">
                  <label className="field-label">Email Address</label>
                  <input value={user.email} readOnly className="field bg-slate-50 text-slate-400 cursor-not-allowed" />
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
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <Spinner size={14} /> : <Save size={14} />}
                  Update Profile
                </button>
              </div>
            </div>

            {/* Change password */}
            <div className="card-pad space-y-4">
              <h2 className="sec-title">Change Password</h2>
              {[
                { label:'Current Password', key:'current' as const, show:showCurr, setShow:setShowCurr },
                { label:'New Password',     key:'newPw'  as const, show:showNew,  setShow:setShowNew  },
                { label:'Confirm New Password', key:'confirm' as const, show:showConf, setShow:setShowConf },
              ].map(f => (
                <div key={f.key}>
                  <label className="field-label">{f.label}</label>
                  <div className="relative">
                    <input
                      type={f.show ? 'text' : 'password'}
                      value={pwForm[f.key]}
                      onChange={PF(f.key)}
                      placeholder={`Enter ${f.label.toLowerCase()}`}
                      className="field pr-10"
                    />
                    <button type="button" onClick={() => f.setShow((p: boolean) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {f.show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <button onClick={handleChangePassword} disabled={changingPw} className="btn-primary flex items-center gap-2">
                  {changingPw ? <Spinner size={14} /> : <Save size={14} />}
                  Update Password
                </button>
              </div>
            </div>

            {/* Account info */}
            <div className="card-pad space-y-3">
              <h2 className="sec-title">Account Information</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Role',        ROLE_LABELS[user.role]],
                  ['Employee ID', employeeId],
                  ['Status',      user.status],
                  ['Member Since',new Date(user.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'long'})],
                ].map(([l,v]) => (
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
    </ApproverLayout>
  )
}
