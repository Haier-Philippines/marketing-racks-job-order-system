'use client'
// app/login/page.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores'
import { authService } from '@/services/authService'
import { getPortalRoute } from '@/providers/AuthProvider'
import { Eye, EyeOff, Loader2, User } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const { user, loading, setUser, setFBUser } = useAuthStore()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [pw, setPw]             = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (!loading && user) {
      router.replace(getPortalRoute(user.role))
    }
  }, [user, loading, router])

  const signInWithDoc = (cred: any, userDoc: any) => {
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
  }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)

    try {
      const { cred, user: userDoc } = await authService.login(email, pw)
      signInWithDoc(cred, userDoc)
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
      {/* Left brand panel — background image */}
      <div
        className="hidden lg:block lg:w-[46%] relative overflow-hidden"
        style={{
          backgroundImage: "url('/images/login-hero.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />


      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white">H</div>
            <span className="font-bold text-slate-800 font-display">Marketing Racks System</span>
          </div>

          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(160deg,#2563eb,#1d4ed8)', boxShadow: '0 8px 24px -8px rgba(37,99,235,.5)' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="3" width="16" height="18" rx="2" stroke="white" strokeWidth="1.6" />
                <line x1="7" y1="7.5" x2="17" y2="7.5" stroke="white" strokeWidth="1.4" />
                <line x1="7" y1="11" x2="17" y2="11" stroke="white" strokeWidth="1.4" />
                <line x1="7" y1="14.5" x2="13" y2="14.5" stroke="white" strokeWidth="1.4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 font-display">Welcome Back!</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to continue to your account</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="field-label">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ae@haier.com"
                  className="field pr-10"
                  required
                />
                <User size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  placeholder="••••••••"
                  className="field pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => toast.info('Contact your IT admin to reset your password.')}
                className="text-brand-600 hover:text-brand-700 font-medium"
              >
                Forgot password?
              </button>
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

          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} Haier Philippines Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

