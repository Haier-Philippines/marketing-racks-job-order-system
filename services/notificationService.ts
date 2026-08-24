// services/notificationService.ts
import {
  collection, doc, addDoc, updateDoc, getDocs, query,
  where, orderBy, limit, onSnapshot, serverTimestamp, writeBatch, Timestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'

const COL = 'notifications'

export interface AppNotification {
  id:        string
  userId:    string
  title:     string
  body:      string
  type:      'approval' | 'rejection' | 'completion' | 'comment' | 'assignment' | 'revision' | 'info'
  refId?:    string   // requestId
  refNo?:    string   // requestNo
  read:      boolean
  createdAt: string
}

function ts(v: any): string {
  if (!v) return new Date().toISOString()
  if (v instanceof Timestamp) return v.toDate().toISOString()
  return String(v)
}

export const notificationService = {
  async create(data: Omit<AppNotification, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, COL), {
      ...data, read: false, createdAt: serverTimestamp(),
    })
    return ref.id
  },

  async getByUser(userId: string): Promise<AppNotification[]> {
    const q    = query(collection(db, COL), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(50))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: ts(d.data().createdAt) } as AppNotification))
  },

  async markRead(id: string): Promise<void> {
    await updateDoc(doc(db, COL, id), { read: true })
  },

  async markAllRead(userId: string): Promise<void> {
    const q    = query(collection(db, COL), where('userId', '==', userId), where('read', '==', false))
    const snap = await getDocs(q)
    const batch = writeBatch(db)
    snap.docs.forEach(d => batch.update(d.ref, { read: true }))
    await batch.commit()
  },

  subscribe(userId: string, cb: (notifs: AppNotification[]) => void) {
    return onSnapshot(
      query(collection(db, COL), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(30)),
      snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: ts(d.data().createdAt) } as AppNotification)))
    )
  },

  // Called when request status changes — creates notification for requester
  async notifyStatusChange(params: {
    userId: string; requestId: string; requestNo: string
    status: string; approverName?: string
  }) {
    const typeMap: Record<string, AppNotification['type']> = {
      'In Progress': 'approval',
      'Approved':    'approval',
      'Completed':   'completion',
      'Rejected':    'rejection',
      'Returned':    'revision',
    }
    const titleMap: Record<string, string> = {
      'In Progress': `Your request ${params.requestNo} is now in progress.`,
      'Approved':    `Your request ${params.requestNo} has been approved.`,
      'Completed':   `Your request ${params.requestNo} has been completed.`,
      'Rejected':    `Your request ${params.requestNo} has been rejected.`,
      'Returned':    `Your request ${params.requestNo} requires revision.`,
      'For Approval':`Your request ${params.requestNo} is now pending approval.`,
    }

    await this.create({
      userId:  params.userId,
      title:   titleMap[params.status] ?? `Request ${params.requestNo} updated`,
      body:    params.approverName ? `Action by: ${params.approverName}` : `Status: ${params.status}`,
      type:    typeMap[params.status] ?? 'info',
      refId:   params.requestId,
      refNo:   params.requestNo,
      read:    false,
    })
  },
}
