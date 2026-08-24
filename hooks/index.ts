// hooks/useRequests.ts
import { useEffect, useCallback, useState } from 'react'
import { requestService } from '@/services/requestService'
import { useRequestStore, useAuthStore } from '@/stores'
import type { FilterParams, JobOrderRequest } from '@/types'

export function useRequests(params?: FilterParams) {
  const store  = useRequestStore()
  const { user } = useAuthStore()
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError]           = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!user) return
    store.setLoading(true)
    setError(null)
    try {
      const employeeRoles: import('@/types').UserRole[] = ['marketing_staff', 'viewer']
      const effectiveParams = employeeRoles.includes(user.role)
        ? { ...params, userId: user.uid }
        : params

      const result = await requestService.getPaginated(effectiveParams ?? {})
      store.setRequests(result.data)
      store.setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load requests')
    } finally {
      store.setLoading(false)
    }
  }, [user, params])

  useEffect(() => { fetch() }, [fetch])

  return {
    requests:   store.requests,
    loading:    store.loading,
    total:      store.totalCount,
    totalPages,
    error,
    refetch:    fetch,
  }
}

// hooks/useDashboard.ts
export function useDashboard() {
  const [stats, setStats]     = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await requestService.getDashboardStats()
      setStats(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { stats, loading, error, refetch: fetch }
}

// hooks/useRealtimeRequests.ts
export function useRealtimeRequests(cb: (reqs: JobOrderRequest[]) => void) {
  useEffect(() => {
    const unsub = requestService.subscribeAll(cb)
    return unsub
  }, [cb])
}

// hooks/useRequest.ts
export function useRequest(id: string) {
  const [req, setReq]         = useState<JobOrderRequest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const unsub = requestService.subscribeOne(id, r => {
      setReq(r)
      setLoading(false)
    })
    return unsub
  }, [id])

  return { req, loading }
}
