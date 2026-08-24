'use client'
// app/approver/page.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores'

export default function ApproverRoot() {
  const router     = useRouter()
  const { user, loading } = useAuthStore()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    router.replace('/approver/dashboard')
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 rounded-xl bg-brand-600 animate-pulse" />
    </div>
  )
}
