'use client'
// providers/AuthProvider.tsx
import { useEffect } from 'react'
import { authService } from '@/services/authService'
import { notificationService } from '@/services/notificationService'
import { useAuthStore, useNotifStore } from '@/stores'
import type { AppUser } from '@/types'

const DEFAULT_USER_ROLE = 'viewer'
const DEFAULT_USER_DEPARTMENT = 'IT'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setFBUser, setLoading, setInit } = useAuthStore()
  const { setCount, setItems }                       = useNotifStore()

  useEffect(() => {
    let notifUnsub: (() => void) | null = null

    const authUnsub = authService.onAuthStateChange(fbUser => {
      ;(async () => {
        try {
          setFBUser(fbUser)

          if (fbUser) {
            let user: AppUser | null = null
            try {
              user = await authService.getUserDoc(fbUser.uid)
            } catch (err) {
              console.error('AuthProvider: failed to load user document', err)
            }

            if (!user) {
              user = {
                uid:         fbUser.uid,
                fullName:    fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'User',
                email:       fbUser.email ?? '',
                role:        DEFAULT_USER_ROLE,
                department:  DEFAULT_USER_DEPARTMENT,
                phoneNumber: fbUser.phoneNumber ?? '',
                status:      'Active',
                createdAt:   new Date().toISOString(),
                updatedAt:   new Date().toISOString(),
              }
              console.warn('AuthProvider: no user document found for uid', fbUser.uid, 'falling back to minimal user object')
            }

            setUser(user)

            if (notifUnsub) {
              notifUnsub()
              notifUnsub = null
            }
            notifUnsub = notificationService.subscribe(fbUser.uid, list => {
              setItems(list as any)
              setCount(list.filter(n => !n.read).length)
            })
          } else {
            setUser(null)
            if (notifUnsub) { notifUnsub(); notifUnsub = null }
            setCount(0)
            setItems([])
          }
        } catch (err) {
          console.error('AuthProvider: unexpected auth state change error', err)
          setUser(null)
          setCount(0)
          setItems([])
        } finally {
          setLoading(false)
          setInit(true)
        }
      })()
    })

    return () => {
      authUnsub()
      if (notifUnsub) notifUnsub()
    }
  }, [setCount, setFBUser, setInit, setItems, setLoading, setUser])

  return <>{children}</>
}

// Role-based portal routing
export function getPortalRoute(role: string): string {
  if (role === 'it_admin') return '/dashboard'

  const approverRoles = [
    'sales_director',
    'sellout',
    'pm',
    'marketing_manager',
    'marketing_director',
    'approver',
    'technician',
  ]

  if (approverRoles.includes(role)) return '/approver/dashboard'
  return '/employee/dashboard'
}
