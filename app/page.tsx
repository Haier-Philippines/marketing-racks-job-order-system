'use client'
// app/page.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores'

export default function RootPage() {
  const { user, loading } = useAuthStore()
  const router = useRouter()
  useEffect(() => {
  if (!loading) {
    if (!user) {
      router.replace('/login')
      return
    }

    const adminRoles = ['it_admin']
    const approverRoles = [
      'sales_director',
      'sellout',
      'pm',
      'marketing_manager',
      'marketing_director',
      'approver',
      'technician'
    ]

    if (adminRoles.includes(user.role)) {
      router.replace('/dashboard')
    } else if (approverRoles.includes(user.role)) {
      router.replace('/approver/dashboard')
    } else {
      router.replace('/employee/dashboard')
    }
  }
}, [user, loading, router])
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 rounded-xl bg-brand-600 animate-pulse" />
    </div>
  )
}
