// services/requestService.ts
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot,
  serverTimestamp, Timestamp, runTransaction, writeBatch,
  type DocumentSnapshot, type QueryConstraint,
} from 'firebase/firestore'
import { auth, db } from '@/firebase/config'
import { COLLECTIONS, SUB } from '@/firebase/collections'
import type {
  JobOrderRequest, RequestStatus, FilterParams, PaginatedResult,
  ActivityLog, RequestComment, RequestDetailRow, StoreStatus,
  SalesEvaluation, JobOrderAttachments, ProjectStatus,
} from '@/types'
import { PROJECT_STATUS_OPTIONS } from '@/types'
import dayjs from 'dayjs'
import { notificationService } from './notificationService'

function ts(v: any): string {
  if (!v) return ''
  if (v instanceof Timestamp) return v.toDate().toISOString()
  return String(v)
}

function parseProjectStatus(value: unknown): ProjectStatus | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  if (!normalized) return undefined
  // Preserve stored value for rule-safe round-tripping during approval updates,
  // even when it is a legacy value outside PROJECT_STATUS_OPTIONS.
  return normalized as ProjectStatus
}

function mapRequest(d: DocumentSnapshot): JobOrderRequest {
  const data = d.data()!
  return {
    id:              d.id,
    jobOrderNo:      data.jobOrderNo ?? data.requestNo ?? '',

    // Step 1 fields
    date:            data.date ?? ts(data.createdAt),
    requestor:       data.requestor ?? data.requesterName ?? '',
    productCategory: Array.isArray(data.productCategories)
      ? data.productCategories.join(', ')
      : (data.productCategory ?? ''),
    productCategories: Array.isArray(data.productCategories)
      ? data.productCategories
      : (typeof data.productCategory === 'string' && data.productCategory ? [data.productCategory] : []),
    dealer:          data.dealer ?? '',
    branchLocation:  data.branchLocation ?? data.locationStore ?? '',
    targetDate:      data.targetDate ?? data.preferredSchedule ?? '',
    remarks:         data.remarks ?? '',

    storeStatus: {
      newBranch:      data.storeStatus?.newBranch      ?? false,
      spaceAcquiring: data.storeStatus?.spaceAcquiring ?? false,
      renovation:     data.storeStatus?.renovation     ?? false,
    },
    salesEvaluation: {
      averageMonthlySellOut:  data.salesEvaluation?.averageMonthlySellOut  ?? '',
      averageSellIn:          data.salesEvaluation?.averageSellIn          ?? '',
      forecastMonthlySellOut: data.salesEvaluation?.forecastMonthlySellOut ?? '',
    },
    requestDetails: Array.isArray(data.requestDetails)
      ? data.requestDetails.map((r: any) => ({
          id:          r.id ?? crypto.randomUUID(),
          category:    r.category    ?? '',
          quantity:    Number(r.quantity) || 0,
          rackType:    r.rackType    ?? '',
          measurement: r.measurement ?? '',
          skus:        r.skus        ?? '',
          remarks:     r.remarks     ?? '',
        }))
      : [],

    // Step 2 fields
    attachments: {
      actualPhoto:    data.attachments?.actualPhoto   ?? undefined,
      storePlan:      data.attachments?.storePlan      ?? '',
      recommendation: data.attachments?.recommendation ?? '',
    },

    // System fields
    status:          data.status       ?? 'For Approval',
    projectStatus:   parseProjectStatus(data.projectStatus),
    requestedBy:     data.requestedBy  ?? '',
    requesterEmail:  data.requesterEmail ?? '',
    department:      data.department   ?? 'Others',
    priority:        data.priority     ?? 'Normal',
    contactPerson:   data.contactPerson,
    contactNumber:   data.contactNumber,
    assignedTechnician: data.assignedTechnician,
    technicianName:     data.technicianName,

    approvalLevel:   data.approvalLevel ?? 0,
    approverIds: Array.isArray(data.approverIds)
      ? data.approverIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
      : (Array.isArray(data.approvers)
        ? data.approvers
          .map((step: any) => (typeof step?.approverId === 'string' ? step.approverId : ''))
          .filter((value: string) => value.trim().length > 0)
        : []),
    actedApproverIds: Array.isArray(data.actedApproverIds)
      ? data.actedApproverIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
      : (Array.isArray(data.approvers)
        ? data.approvers
          .filter((step: any) => typeof step?.action === 'string' && step.action !== 'Pending')
          .map((step: any) => (typeof step?.approverId === 'string' ? step.approverId : ''))
          .filter((value: string) => value.trim().length > 0)
        : []),
    currentApprover: data.currentApprover,
    currentApprovalStage: data.currentApprovalStage,
    currentPMCategory: data.currentPMCategory,
    approvers:       data.approvers    ?? [],
    comments:        data.comments     ?? [],
    activityLog:     data.activityLog  ?? [],

    createdAt:    ts(data.createdAt),
    updatedAt:    ts(data.updatedAt),
    completedAt:  data.completedAt ? ts(data.completedAt) : undefined,
    scheduledDate: data.scheduledDate,
  }
}

async function nextJobOrderNo(): Promise<string> {
  const year  = dayjs().format('YYYY')
  const seqRef = doc(db, COLLECTIONS.SEQUENCES, 'requests')
  let num = 1
  await runTransaction(db, async tx => {
    const snap = await tx.get(seqRef)
    if (snap.exists() && snap.data().year === year) num = snap.data().count + 1
    tx.set(seqRef, { year, count: num })
  })
  return `MR-${year}-${String(num).padStart(4, '0')}`
}

function sanitizeFirestoreValue(value: unknown): unknown {
  if (value === undefined) return undefined

  if (Array.isArray(value)) {
    const cleaned = value
      .map(item => sanitizeFirestoreValue(item))
      .filter(item => item !== undefined)
    return cleaned
  }

  if (value !== null && typeof value === 'object') {
    const entry = value as Record<string, unknown>
    const cleaned: Record<string, unknown> = {}

    for (const [key, nestedValue] of Object.entries(entry)) {
      const sanitizedValue = sanitizeFirestoreValue(nestedValue)
      if (sanitizedValue !== undefined) {
        cleaned[key] = sanitizedValue
      }
    }

    return cleaned
  }

  return value
}

function sanitizeFirestoreUpdate<T extends object>(data: T): Record<string, unknown> {
  return sanitizeFirestoreValue(data) as Record<string, unknown>
}

function hasApproverInWorkflow(request: JobOrderRequest, approverId: string): boolean {
  return (request.approvers ?? []).some(step => step.approverId === approverId)
}

function hasApproverAction(request: JobOrderRequest, approverId: string): boolean {
  return (request.approvers ?? []).some(
    step => step.approverId === approverId && step.action !== 'Pending'
  )
}

function getAuthenticatedApproverUid(expectedUid?: string): string {
  const authUid = auth.currentUser?.uid

  if (!authUid) {
    throw new Error('Authenticated Firebase user is not available.')
  }

  if (expectedUid && expectedUid !== authUid) {
    throw new Error('Approver UID mismatch between auth state and query parameter.')
  }

  return authUid
}

export const requestService = {
  async create(data: Omit<JobOrderRequest, 'id' | 'jobOrderNo' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const jobOrderNo = await nextJobOrderNo()
    const rawPayload = {
      ...data,
      jobOrderNo,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    const cleanData = sanitizeFirestoreUpdate(rawPayload)

    console.log('[requestService.create] raw payload:', rawPayload)
    console.log('[requestService.create] sanitized payload:', cleanData)

    const ref = await addDoc(collection(db, COLLECTIONS.REQUESTS), cleanData)
    return ref.id
  },

  async getById(id: string): Promise<JobOrderRequest | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.REQUESTS, id))
    if (!snap.exists()) return null
    return mapRequest(snap)
  },

  async update(id: string, data: Partial<JobOrderRequest>): Promise<void> {
    const rawPayload = {
      ...data,
      updatedAt: serverTimestamp(),
    }
    const cleanData = sanitizeFirestoreUpdate(rawPayload)

    console.log('[requestService.update] raw payload:', rawPayload)
    console.log('[requestService.update] sanitized payload:', cleanData)

    await updateDoc(doc(db, COLLECTIONS.REQUESTS, id), cleanData)
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.REQUESTS, id))
  },

  async getPaginated(params: FilterParams): Promise<PaginatedResult<JobOrderRequest>> {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]
    if (params.status)     constraints.push(where('status', '==', params.status))
    if (params.department) constraints.push(where('department', '==', params.department))
    if (params.priority)   constraints.push(where('priority', '==', params.priority))

    const snap = await getDocs(query(collection(db, COLLECTIONS.REQUESTS), ...constraints))
    let all = snap.docs.map(mapRequest)

    // Client-side search and category filter
    if (params.search) {
      const s = params.search.toLowerCase()
      all = all.filter(r =>
        r.jobOrderNo.toLowerCase().includes(s) ||
        r.productCategory.toLowerCase().includes(s) ||
        r.requestor.toLowerCase().includes(s) ||
        r.branchLocation.toLowerCase().includes(s) ||
        r.dealer.toLowerCase().includes(s)
      )
    }
    if (params.category) {
      all = all.filter(r => r.productCategory === params.category)
    }
    if (params.dateFrom) all = all.filter(r => r.createdAt >= params.dateFrom!)
    if (params.dateTo)   all = all.filter(r => r.createdAt <= params.dateTo! + 'T23:59:59')

    const total      = all.length
    const page       = params.page ?? 1
    const pageSize   = params.pageSize ?? 10
    const totalPages = Math.ceil(total / pageSize)
    const data       = all.slice((page - 1) * pageSize, page * pageSize)
    return { data, total, page, pageSize, totalPages }
  },

  async getAll(): Promise<JobOrderRequest[]> {
    const snap = await getDocs(query(collection(db, COLLECTIONS.REQUESTS), orderBy('createdAt','desc')))
    return snap.docs.map(mapRequest)
  },

  async getForCurrentApprover(params: {
    approverId: string
    status?: RequestStatus
  }): Promise<JobOrderRequest[]> {
    const authUid = getAuthenticatedApproverUid(params.approverId)

    console.log('[requestService.getForCurrentApprover] query diagnostics:', {
      queriedCollection: COLLECTIONS.REQUESTS,
      queryConditions: [
        ['currentApprover', '==', authUid],
      ],
      requestedStatus: params.status ?? null,
      authUid,
      requestedUid: params.approverId,
    })

    const snap = await getDocs(query(
      collection(db, COLLECTIONS.REQUESTS),
      where('currentApprover', '==', authUid),
    ))

    const requests = snap.docs.map(mapRequest)
    const filtered = params.status
      ? requests.filter(request => request.status === params.status)
      : requests

    console.log('[requestService.getForCurrentApprover] result diagnostics:', filtered.map(request => ({
      id: request.id,
      jobOrderNo: request.jobOrderNo,
      currentApprover: request.currentApprover,
      currentApprovalStage: request.currentApprovalStage,
      status: request.status,
    })))

    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async getVisibleForApprover(params: {
    approverId: string
  }): Promise<JobOrderRequest[]> {
    const authUid = getAuthenticatedApproverUid(params.approverId)

    console.log('[requestService.getVisibleForApprover] query diagnostics:', {
      queriedCollection: COLLECTIONS.REQUESTS,
      queryConditions: [
        ['currentApprover', '==', authUid],
      ],
      authUid,
      requestedUid: params.approverId,
    })

    console.log('[requestService.getVisibleForApprover] UID:', authUid)

    const assignedSnap = await getDocs(query(
      collection(db, COLLECTIONS.REQUESTS),
      where('currentApprover', '==', authUid),
    ))

    console.log('[requestService.getVisibleForApprover] assigned count:', assignedSnap.size)

    const byId = new Map<string, JobOrderRequest>()
    assignedSnap.docs.forEach(docSnap => {
      const request = mapRequest(docSnap)
      byId.set(request.id, request)
    })

    const merged = [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    console.log('[requestService.getVisibleForApprover] result diagnostics:', {
      approverId: authUid,
      count: merged.length,
    })

    return merged
  },

  async getMyActionHistoryForApprover(params: {
    approverId: string
  }): Promise<JobOrderRequest[]> {
    const authUid = getAuthenticatedApproverUid(params.approverId)

    console.log('[requestService.getMyActionHistoryForApprover] query diagnostics:', {
      queriedCollection: COLLECTIONS.REQUESTS,
      queryConditions: [
        ['actedApproverIds', 'array-contains', authUid],
      ],
      authUid,
      requestedUid: params.approverId,
    })

    const snap = await getDocs(query(
      collection(db, COLLECTIONS.REQUESTS),
      where('actedApproverIds', 'array-contains', authUid),
    ))

    let requests = snap.docs
      .map(mapRequest)
      .filter(request => hasApproverAction(request, authUid))

    requests = requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    console.log('[requestService.getMyActionHistoryForApprover] result diagnostics:', {
      approverId: authUid,
      count: requests.length,
    })

    return requests
  },

  async getByUser(userId: string): Promise<JobOrderRequest[]> {
    const snap = await getDocs(query(
      collection(db, COLLECTIONS.REQUESTS),
      where('requestedBy', '==', userId),
      orderBy('createdAt', 'desc')
    ))
    return snap.docs.map(mapRequest)
  },

  async updateStatus(id: string, status: RequestStatus, userId: string, userName: string, comment?: string): Promise<void> {
    const logEntry: ActivityLog = {
      id:        crypto.randomUUID(),
      action:    `Status changed to ${status}`,
      userId, userName,
      details:   comment ?? `Status updated to ${status}`,
      timestamp: new Date().toISOString(),
    }
    const rawPayload = {
      status,
      updatedAt: serverTimestamp(),
      activityLog: [],
    }
    const cleanData = sanitizeFirestoreUpdate(rawPayload)

    console.log('[requestService.updateStatus] raw payload:', rawPayload)
    console.log('[requestService.updateStatus] sanitized payload:', cleanData)

    await updateDoc(doc(db, COLLECTIONS.REQUESTS, id), cleanData)
  },

  async updateProjectStatus(params: {
    requestId: string
    projectStatus: ProjectStatus
    updatedById: string
    updatedByName: string
    updatedByRole: string
  }): Promise<void> {
    if (!PROJECT_STATUS_OPTIONS.includes(params.projectStatus)) {
      throw new Error('Invalid project status value')
    }

    const snap = await getDoc(doc(db, COLLECTIONS.REQUESTS, params.requestId))
    if (!snap.exists()) throw new Error('Request not found')

    const data = snap.data()
    const previousProjectStatus =
      typeof data.projectStatus === 'string' && data.projectStatus.trim()
        ? data.projectStatus
        : 'Not Set'

    if (previousProjectStatus === params.projectStatus) return

    const existingActivityLog: ActivityLog[] = Array.isArray(data.activityLog)
      ? data.activityLog
      : []

    const logEntry: ActivityLog = {
      id: crypto.randomUUID(),
      action: 'Project Status Updated',
      userId: params.updatedById,
      userName: params.updatedByName,
      details: `From: ${previousProjectStatus}\nTo: ${params.projectStatus}\nUpdated By: ${params.updatedByRole}`,
      timestamp: new Date().toISOString(),
    }

    const rawPayload = {
      projectStatus: params.projectStatus,
      activityLog: [...existingActivityLog, logEntry],
      updatedAt: serverTimestamp(),
    }

    const cleanData = sanitizeFirestoreUpdate(rawPayload)

    console.log('[requestService.updateProjectStatus] payload:', {
      requestId: params.requestId,
      previousProjectStatus,
      nextProjectStatus: params.projectStatus,
      updatedById: params.updatedById,
      updatedByName: params.updatedByName,
    })

    await updateDoc(doc(db, COLLECTIONS.REQUESTS, params.requestId), cleanData)

    const requesterId = data.requestedBy
    const requestNo = data.jobOrderNo ?? data.requestNo ?? 'Unknown Request'

    if (typeof requesterId === 'string' && requesterId) {
      await notificationService.create({
        userId: requesterId,
        title: `Your Job Order ${requestNo} project status has been updated to '${params.projectStatus}'.`,
        body: `Updated by: ${params.updatedByName}`,
        type: 'info',
        refId: params.requestId,
        refNo: requestNo,
        read: false,
      })
    }
  },

  async addComment(id: string, comment: Omit<RequestComment, 'id' | 'createdAt'>): Promise<void> {
    const snap = await getDoc(doc(db, COLLECTIONS.REQUESTS, id))
    if (!snap.exists()) return
    const existing: RequestComment[] = snap.data().comments ?? []
    const newComment: RequestComment = {
      ...comment, id: crypto.randomUUID(), createdAt: new Date().toISOString(),
    }
    const rawPayload = {
      comments: [...existing, newComment],
      updatedAt: serverTimestamp(),
    }
    const cleanData = sanitizeFirestoreUpdate(rawPayload)

    console.log('[requestService.addComment] raw payload:', rawPayload)
    console.log('[requestService.addComment] sanitized payload:', cleanData)

    await updateDoc(doc(db, COLLECTIONS.REQUESTS, id), cleanData)
  },

  subscribeAll(cb: (reqs: JobOrderRequest[]) => void) {
    return onSnapshot(
      query(collection(db, COLLECTIONS.REQUESTS), orderBy('createdAt','desc'), limit(100)),
      snap => cb(snap.docs.map(mapRequest))
    )
  },

  subscribeOne(id: string, cb: (req: JobOrderRequest | null) => void) {
    return onSnapshot(doc(db, COLLECTIONS.REQUESTS, id), snap => {
      cb(snap.exists() ? mapRequest(snap) : null)
    })
  },

  async getDashboardStats() {
    const all = await this.getAll()
    const now = dayjs()
    const thisMonth = all.filter(r => dayjs(r.createdAt).month() === now.month() && dayjs(r.createdAt).year() === now.year())
    const lastMonth = all.filter(r => {
      const d = dayjs(r.createdAt)
      return d.month() === now.subtract(1,'month').month() && d.year() === now.subtract(1,'month').year()
    })

    const total       = thisMonth.length
    const forApproval = thisMonth.filter(r => r.status === 'For Approval').length
    const inProgress  = thisMonth.filter(r => r.status === 'In Progress').length
    const completed   = thisMonth.filter(r => r.status === 'Completed').length

    // Monthly trend (last 6 months)
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const m = now.subtract(5 - i, 'month')
      return {
        date:  m.format('MMM D'),
        count: all.filter(r => {
          const d = dayjs(r.createdAt)
          return d.month() === m.month() && d.year() === m.year()
        }).length,
      }
    })

    const byStatus = (
      ['For Approval','In Progress','Completed','Rejected','Cancelled'] as const
    ).map(s => ({
      status: s,
      count:  all.filter(r => r.status === s).length,
      pct:    all.length > 0 ? Math.round(all.filter(r => r.status === s).length / all.length * 100) : 0,
    }))

    const deptMap: Record<string,number> = {}
    all.forEach(r => { deptMap[r.department] = (deptMap[r.department] ?? 0) + 1 })
    const byDepartment = Object.entries(deptMap).map(([dept,count]) => ({ dept, count })).sort((a,b) => b.count - a.count)

    return {
      totalRequests: total, forApproval, inProgress, completed,
      totalLastMonth: lastMonth.length,
      approvalLastMonth: lastMonth.filter(r => r.status === 'For Approval').length,
      progressLastMonth: lastMonth.filter(r => r.status === 'In Progress').length,
      completedLastMonth: lastMonth.filter(r => r.status === 'Completed').length,
      monthlyTrend, byStatus, byDepartment,
      recentRequests: all.slice(0, 5),
    }
  },
}

