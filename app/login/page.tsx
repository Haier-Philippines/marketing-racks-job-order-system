'use client'
// app/login/page.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores'
import { authService } from '@/services/authService'
import { getPortalRoute } from '@/providers/AuthProvider'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const { user, loading, setUser, setFBUser } = useAuthStore()
  const router = useRouter()
  const [email, setEmail]   = useState('')
  const [pw, setPw]         = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (!loading && user) {
      router.replace(getPortalRoute(user.role))
    }
  }, [user, loading, router])

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)

    try {
      const { cred, user: userDoc } = await authService.login(email, pw)
      const authUser = userDoc ?? {
        uid:         cred.user.uid,
        fullName:    cred.user.displayName ?? cred.user.email?.split('@')[0] ?? 'User',
        email:       cred.user.email ?? '',
        role:        'viewer',
        department:  'IT',
        phoneNumber: cred.user.phoneNumber ?? '',
        status:      'Active',
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      }

      setFBUser(cred.user)
      setUser(authUser)

      const route = getPortalRoute(authUser.role)
      router.replace(route)
      toast.success('Welcome back!')
    } catch (err: any) {
      console.error('LoginPage: sign in failed', err)
      setError(err?.message?.includes('user-not-found') || err?.message?.includes('wrong-password')
        ? 'Invalid email or password.'
        : 'Unable to sign in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg,#0f1e3e 0%,#1a2a5e 50%,#1a56db 100%)' }}>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(26,86,219,.3) 0%, transparent 50%)' }} />
        <div className="relative z-10 text-center space-y-8 max-w-sm px-8">
          <div>
            <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-3xl font-display">H</span>
            </div>
            <h1 className="text-white font-bold text-3xl font-display mb-1">Haier</h1>
            <p className="text-blue-200 text-sm">Marketing Racks</p>
            <p className="text-blue-200 text-sm">Job Order Request System</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              ['📋','Job Orders','Full lifecycle management'],
              ['📦','Inventory','Real-time rack tracking'],
              ['✅','Approvals','Multi-level workflow'],
              ['📊','Reports','Analytics & insights'],
            ].map(([e,t,d]) => (
              <div key={t} className="p-3 rounded-xl border" style={{ background:'rgba(255,255,255,.06)', borderColor:'rgba(255,255,255,.1)' }}>
                <p className="text-base mb-1">{e}</p>
                <p className="text-sm font-semibold text-white">{t}</p>
                <p className="text-[11px] text-blue-300 mt-0.5">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white">H</div>
            <span className="font-bold text-slate-800 font-display">Marketing Racks System</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1 font-display">Sign In</h2>
          <p className="text-sm text-slate-500 mb-7">Access the IT Admin Panel</p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="field-label">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@haier.com" className="field" required />
            </div>
            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" className="field pr-11" required />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full justify-center py-2.5">
              {busy ? <><Loader2 size={14} className="animate-spin" />Signing in…</> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="field-label mb-2">Demo Access</p>
            <div className="space-y-1 text-xs font-mono text-slate-500">
              <p>admin@haier.com / admin123</p>
              <p>manager@haier.com / pass123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
