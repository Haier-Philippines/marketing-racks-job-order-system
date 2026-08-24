// stores/index.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { AppUser, JobOrderRequest, RackInventory, Installation, DashboardStats } from '@/types'

// ── AUTH STORE ────────────────────────────────────────────
interface AuthState {
  user:       AppUser | null
  fbUser:     any | null
  loading:    boolean
  initialized:boolean
  setUser:    (u: AppUser | null) => void
  setFBUser:  (u: any | null) => void
  setLoading: (l: boolean) => void
  setInit:    (i: boolean) => void
  reset:      () => void
  updateUser: (data: Partial<AppUser>) => void
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector(set => ({
    user: null, fbUser: null, loading: true, initialized: false,
    setUser:    user    => set({ user }),
    setFBUser:  fbUser  => set({ fbUser }),
    setLoading: loading => set({ loading }),
    setInit:    initialized => set({ initialized }),
    reset: () => set({ user: null, fbUser: null, loading: false }),
    updateUser: (data: Partial<import('@/types').AppUser>) => set(s => ({ user: s.user ? { ...s.user, ...data } : null })),
  }))
)

// ── DASHBOARD STORE ───────────────────────────────────────
interface DashboardState {
  stats:      DashboardStats | null
  loading:    boolean
  lastFetch:  number | null
  setStats:   (s: DashboardStats) => void
  setLoading: (l: boolean) => void
}

export const useDashboardStore = create<DashboardState>()(
  subscribeWithSelector(set => ({
    stats: null, loading: false, lastFetch: null,
    setStats:   stats   => set({ stats, lastFetch: Date.now() }),
    setLoading: loading => set({ loading }),
  }))
)

// ── REQUEST STORE ─────────────────────────────────────────
interface RequestState {
  requests:    JobOrderRequest[]
  current:     JobOrderRequest | null
  loading:     boolean
  totalCount:  number
  page:        number
  pageSize:    number
  setRequests: (r: JobOrderRequest[]) => void
  setCurrent:  (r: JobOrderRequest | null) => void
  setLoading:  (l: boolean) => void
  setTotal:    (n: number) => void
  setPage:     (p: number) => void
  upsert:      (r: JobOrderRequest) => void
  remove:      (id: string) => void
}

export const useRequestStore = create<RequestState>()(
  subscribeWithSelector(set => ({
    requests: [], current: null, loading: false, totalCount: 0, page: 1, pageSize: 10,
    setRequests: requests => set({ requests }),
    setCurrent:  current  => set({ current }),
    setLoading:  loading  => set({ loading }),
    setTotal:    totalCount => set({ totalCount }),
    setPage:     page    => set({ page }),
    upsert: r => set(state => {
      const idx = state.requests.findIndex(x => x.id === r.id)
      if (idx >= 0) { const updated = [...state.requests]; updated[idx] = r; return { requests: updated } }
      return { requests: [r, ...state.requests] }
    }),
    remove: id => set(state => ({ requests: state.requests.filter(r => r.id !== id) })),
  }))
)

// ── INVENTORY STORE ───────────────────────────────────────
interface InventoryState {
  racks:      RackInventory[]
  loading:    boolean
  setRacks:   (r: RackInventory[]) => void
  setLoading: (l: boolean) => void
  upsert:     (r: RackInventory) => void
  remove:     (id: string) => void
}

export const useInventoryStore = create<InventoryState>()(
  subscribeWithSelector(set => ({
    racks: [], loading: false,
    setRacks:   racks   => set({ racks }),
    setLoading: loading => set({ loading }),
    upsert: r => set(s => {
      const i = s.racks.findIndex(x => x.id === r.id)
      if (i >= 0) { const u = [...s.racks]; u[i] = r; return { racks: u } }
      return { racks: [r, ...s.racks] }
    }),
    remove: id => set(s => ({ racks: s.racks.filter(r => r.id !== id) })),
  }))
)

// ── NOTIFICATION STORE ────────────────────────────────────
interface NotifState {
  count:    number
  items:    { id:string; title:string; body:string; read:boolean; createdAt:string }[]
  setCount: (n:number) => void
  setItems: (items: any[]) => void
  markRead: (id:string) => void
}

export const useNotifStore = create<NotifState>()(set => ({
  count: 0, items: [],
  setCount: count => set({ count }),
  setItems: items => set({ items }),
  markRead: id => set(s => ({
    items: s.items.map(i => i.id === id ? { ...i, read: true } : i),
    count: Math.max(0, s.count - 1),
  })),
}))
