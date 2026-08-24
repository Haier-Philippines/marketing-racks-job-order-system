'use client'
// app/employee/page.tsx - redirect to dashboard
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EmployeeRoot() {
  const router = useRouter()
  useEffect(() => { router.replace('/employee/dashboard') }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 rounded-xl bg-brand-600 animate-pulse" />
    </div>
  )
}
