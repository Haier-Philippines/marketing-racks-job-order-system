'use client'
// app/approver/notifications/page.tsx
import { useEffect, useState } from 'react'
import ApproverLayout from '@/components/shared/ApproverLayout'
import { useAuthStore, useNotifStore } from '@/stores'
import { notificationService, type AppNotification } from '@/services/notificationService'
import { formatDateTime } from '@/lib/utils'
import { Bell, CheckCheck, CheckCircle, XCircle, RotateCcw, MessageSquare, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const TYPE_CONFIG: Record<AppNotification['type'], { icon: React.ElementType; color: string; bg: string }> = {
  approval:   { icon: CheckCircle,  color: 'text-blue-600',   bg: 'bg-blue-50'   },
  rejection:  { icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-50'    },
  completion: { icon: CheckCircle,  color: 'text-green-600',  bg: 'bg-green-50'  },
  comment:    { icon: MessageSquare,color: 'text-purple-600', bg: 'bg-purple-50' },
  assignment: { icon: Bell,         color: 'text-amber-600',  bg: 'bg-amber-50'  },
  revision:   { icon: RotateCcw,    color: 'text-orange-600', bg: 'bg-orange-50' },
  info:       { icon: Bell,         color: 'text-slate-600',  bg: 'bg-slate-50'  },
}

export default function ApproverNotificationsPage() {
  const { user }               = useAuthStore()
  const { setCount, setItems } = useNotifStore()
  const [notifs, setNotifs]    = useState<AppNotification[]>([])
  const [loading, setLoading]  = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    if (!user) return
    const unsub = notificationService.subscribe(user.uid, list => {
      setNotifs(list)
      setItems(list as any)
      setCount(list.filter(n => !n.read).length)
      setLoading(false)
    })
    return unsub
  }, [user])

  const handleMarkRead = async (id: string) => {
    await notificationService.markRead(id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setCount(notifs.filter(n => !n.read && n.id !== id).length)
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    setMarkingAll(true)
    try {
      await notificationService.markAllRead(user.uid)
      setNotifs(prev => prev.map(n => ({ ...n, read: true })))
      setCount(0)
      toast.success('All marked as read')
    } catch { toast.error('Failed') }
    finally { setMarkingAll(false) }
  }

  const unread = notifs.filter(n => !n.read).length

  return (
    <ApproverLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="page-title">Notifications</h1>
            {unread > 0 && (
              <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          {unread > 0 && (
            <button onClick={handleMarkAllRead} disabled={markingAll}
              className="btn-secondary btn-sm flex items-center gap-1.5">
              {markingAll ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
              Mark all as read
            </button>
          )}
        </div>

        <div className="card overflow-hidden divide-y divide-slate-50">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-brand-500" />
            </div>
          ) : notifs.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                <Bell size={24} className="text-slate-300" />
              </div>
              <p className="font-semibold text-slate-600">No notifications</p>
              <p className="text-sm text-slate-400">You&apos;ll be notified about new approval requests here.</p>
            </div>
          ) : notifs.map(notif => {
            const cfg  = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info
            const Icon = cfg.icon
            return (
              <div key={notif.id}
                className={cn('flex items-start gap-3 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer',
                  !notif.read && 'bg-blue-50/40')}
                onClick={() => !notif.read && handleMarkRead(notif.id)}>
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
                  <Icon size={16} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', !notif.read ? 'font-semibold text-slate-800' : 'font-medium text-slate-700')}>
                    {notif.title}
                  </p>
                  {notif.body && <p className="text-xs text-slate-500 mt-0.5">{notif.body}</p>}
                  <p className="text-[11px] text-slate-400 mt-1">{formatDateTime(notif.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!notif.read && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  {notif.refId && (
                    <Link href={`/approver/for-approval/${notif.refId}`}
                      onClick={e => e.stopPropagation()}
                      className="text-brand-600 hover:text-brand-700">
                      <ChevronRight size={16} />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {notifs.length > 0 && (
          <p className="text-center text-xs text-slate-400">
            Showing last {notifs.length} notifications ·{' '}
            <Link href="/approver/notifications" className="text-brand-600 hover:underline">View all</Link>
          </p>
        )}
      </div>
    </ApproverLayout>
  )
}
