// services/approvalService.ts
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import dayjs from 'dayjs'
import { db } from '@/firebase/config'
import { COLLECTIONS } from '@/firebase/collections'
import {
  APPROVAL_STAGE_ORDER,
  PM_CATEGORY_FROM_REQUEST_CATEGORY,
  type ApprovalStage,
  type ApprovalStep,
  type JobOrderRequest,
  type PMCategory,
  type RequestStatus,
  type UserRole,
} from '@/types'
import { approverService } from './approverService'
import { notificationService } from './notificationService'
import { requestService } from './requestService'

export type ApprovalAction = 'Approved' | 'Rejected' | 'Returned'

export interface ApprovalResult {
  success:   boolean
  newStatus: RequestStatus
  message:   string
}

function roleFromStage(stage: ApprovalStage): UserRole {
  switch (stage) {
    case 'sales_director':
      return 'sales_director'
    case 'sellout':
      return 'sellout'
    case 'pm':
      return 'pm'
    case 'marketing_manager':
      return 'marketing_manager'
    case 'marketing_director':
      return 'marketing_director'
    default:
      return 'approver'
  }
}

function normalizeExistingApprovers(req: JobOrderRequest): ApprovalStep[] {
  return [...(req.approvers ?? [])]
    .sort((a, b) => a.level - b.level)
    .map(step => ({
      ...step,
      approverRole: step.approverRole || roleFromStage(step.stage),
      stage: step.stage,
      action: step.action || 'Pending',
    }))
}

function normalizeProductCategoryToPMCategory(value: string): PMCategory | undefined {
  const clean = value.trim()
  if (!clean) return undefined

  const direct = PM_CATEGORY_FROM_REQUEST_CATEGORY[clean]
  if (direct) return direct

  const normalized = clean.replace(/^pm\s+/i, '').replace(/\s+/g, ' ')
  return PM_CATEGORY_FROM_REQUEST_CATEGORY[normalized]
}

function resolveRequestPMCategories(req: JobOrderRequest): PMCategory[] {
  const rawValues = Array.isArray(req.productCategories)
    ? req.productCategories
    : typeof req.productCategory === 'string' && req.productCategory
      ? req.productCategory.split(',')
      : []

  const mapped = rawValues
    .map(value => normalizeProductCategoryToPMCategory(value))
    .filter((value): value is PMCategory => Boolean(value))

  return [...new Set(mapped)]
}

function resolveRequestAssignmentCategories(req: JobOrderRequest): string[] {
  const productCategories = Array.isArray(req.productCategories)
    ? req.productCategories
    : []

  const legacyCategories = typeof req.productCategory === 'string' && req.productCategory
    ? req.productCategory.split(',')
    : []

  const detailCategories = Array.isArray(req.requestDetails)
    ? req.requestDetails.map(detail => detail.category)
    : []

  return [...new Set(
    [...productCategories, ...legacyCategories, ...detailCategories]
      .map(value => value.trim())
      .filter(Boolean)
  )]
}

async function buildWorkflowFromAssignment(
  req: JobOrderRequest,
): Promise<ApprovalStep[]> {
  const assignment = await approverService.getBestFor(
    req.department,
    resolveRequestAssignmentCategories(req),
  )

  if (!assignment) {
    return []
  }

  const activeSteps = assignment.steps
    .filter(step => step.active && !!step.approverId)
    .sort((a, b) => a.sequence - b.sequence)

  if (activeSteps.length === 0) {
    return []
  }

  const rawWorkflow: ApprovalStep[] = activeSteps.map((step, index) => ({
    level: index + 1,
    approverId: step.approverId,
    approverName: step.approverName,
    approverRole: step.approverRole || roleFromStage(step.stage),
    stage: step.stage,
    action: 'Pending',
    pmCategory: step.pmCategory,
  }))

  const requestPMCategories = resolveRequestPMCategories(req)
  const selectedSteps: ApprovalStep[] = []

  for (const stage of APPROVAL_STAGE_ORDER) {
    if (stage === 'pm') {
      const pmMatches = requestPMCategories
        .map(category => rawWorkflow.find(
          step => step.stage === 'pm' && step.pmCategory === category
        ))
        .filter((step): step is ApprovalStep => Boolean(step))

      selectedSteps.push(...pmMatches)
      continue
    }

    const selected = rawWorkflow.find(step => step.stage === stage)
    if (selected) selectedSteps.push(selected)
  }

  return selectedSteps.map((step, index) => ({
    ...step,
    level: index + 1,
    action: step.action || 'Pending',
  }))
}

async function getEffectiveWorkflow(req: JobOrderRequest): Promise<ApprovalStep[]> {
  const existing = normalizeExistingApprovers(req)

  if (existing.length > 0) {
    return existing
  }

  return buildWorkflowFromAssignment(req)
}

function getPendingStep(steps: ApprovalStep[]): ApprovalStep | undefined {
  return steps.find(step => step.action === 'Pending')
}

function buildApprovalStateFromWorkflow(steps: ApprovalStep[]): Partial<JobOrderRequest> {
  const nextPendingStep = getPendingStep(steps)
  const approvedCount = steps.filter(step => step.action === 'Approved').length
  const approverIds = [...new Set(
    steps
      .map(step => step.approverId)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  )]

  const payload: Partial<JobOrderRequest> = {
    approvers: steps,
    approvalLevel: approvedCount,
    approverIds,
  }

  if (nextPendingStep) {
    payload.currentApprover = nextPendingStep.approverId
    payload.currentApprovalStage = nextPendingStep.stage
    payload.currentPMCategory = nextPendingStep.stage === 'pm'
      ? nextPendingStep.pmCategory
      : undefined
  } else {
    // Fully approved (or no pending step remains): clear the "current"
    // pointers instead of leaving them stuck on the last approver.
    // NOTE: make sure requestService.update() strips `undefined` but
    // preserves `null` — otherwise these clears will silently be dropped
    // the same way the projectStatus bug happened.
    payload.currentApprover = null
    payload.currentApprovalStage = null
    payload.currentPMCategory = null
  }

  return payload
}

async function buildApprovalStateForRequest(
  req: Pick<JobOrderRequest, 'department' | 'productCategories' | 'productCategory' | 'requestDetails'>,
): Promise<Partial<JobOrderRequest>> {
  const workflow = await buildWorkflowFromAssignment(req as JobOrderRequest)

  if (workflow.length === 0) {
    throw new Error('No approver assignment workflow configured for this request.')
  }

  return buildApprovalStateFromWorkflow(workflow)
}

export const approvalService = {
  buildApprovalStateForRequest,

  async initializeRequestApproval(requestId: string): Promise<void> {
    const req = await requestService.getById(requestId)
    if (!req) throw new Error('Request not found')

    if ((req.approvers?.length ?? 0) > 0 && req.currentApprover) {
      return
    }

    const workflow = await buildWorkflowFromAssignment(req)

    if (workflow.length === 0) {
      throw new Error('No approver assignment workflow configured for this request.')
    }

    console.log('[approvalService.initializeRequestApproval] workflow diagnostics:', workflow.map(step => ({
      level: step.level,
      approverId: step.approverId,
      approverRole: step.approverRole,
      stage: step.stage,
      pmCategory: step.pmCategory ?? null,
      action: step.action,
    })))

    await requestService.update(requestId, buildApprovalStateFromWorkflow(workflow))
  },

  /**
   * Get all requests that this approver needs to act on.
   * A request is "for this approver" when:
   *  - status is 'For Approval'
   *  - the approver is assigned at the current approvalLevel
   *    OR the approver's role matches the next pending step
   */
  async getForMyApproval(approverId: string, approverRole: UserRole): Promise<JobOrderRequest[]> {
    console.log('[approvalService.getForMyApproval] approver diagnostics:', {
      approverId,
      approverRole,
      queriedCollection: COLLECTIONS.REQUESTS,
      queryConditions: [
        ['currentApprover', '==', approverId],
        ['status', '==', 'For Approval'],
      ],
    })

    try {
      return await requestService.getForCurrentApprover({
        approverId,
        status: 'For Approval',
      })
    } catch (error: any) {
      console.error('[approvalService.getForMyApproval] failed:', {
        approverId,
        approverRole,
        code: error?.code,
        message: error?.message,
      })
      throw error
    }
  },

  /**
   * Get all requests visible to this approver (all statuses)
   */
  // 
 async getAllForApprover(
  approverId: string,
  approverRole: UserRole
): Promise<JobOrderRequest[]> {
  if (
    approverRole === 'it_admin' ||
    approverRole === 'marketing_manager'
  ) {
    return requestService.getAll()
  }

  try {
    const [visible, history] = await Promise.all([
      requestService.getVisibleForApprover({ approverId }),
      requestService.getMyActionHistoryForApprover({ approverId }),
    ])

    const byId = new Map<string, JobOrderRequest>()
    ;[...visible, ...history].forEach(r => byId.set(r.id, r))

    return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch (error: any) {
    console.error('[approvalService.getAllForApprover] failed:', {
      approverId,
      approverRole,
      code: error?.code,
      message: error?.message,
    })
    throw error
  }
},

  /**
 * Get requests this approver has already acted on
 */
async getMyApprovals(
  approverId: string,
  approverRole: UserRole
): Promise<JobOrderRequest[]> {
  try {
    const scoped =
      await requestService.getMyActionHistoryForApprover({ approverId })

    return scoped.filter(r =>
      r.approvers?.some(a =>
        a.approverId === approverId &&
        a.action !== 'Pending'
      )
    )
  } catch (error: any) {
    console.error('[approvalService.getMyApprovals] failed:', {
      approverId,
      approverRole,
      code: error?.code,
      message: error?.message,
    })
    throw error
  }
},
  /**
   * Process an approval action on a request
   */
  async processApproval(params: {
    requestId:    string
    approverId:   string
    approverName: string
    approverRole: UserRole
    action:       ApprovalAction
    comments:     string
  }): Promise<ApprovalResult> {
    const req = await requestService.getById(params.requestId)
    if (!req) throw new Error('Request not found')

    const isAdminOverride = params.approverRole === 'it_admin'

    if (
      !isAdminOverride
      && req.currentApprover
      && req.currentApprover !== params.approverId
    ) {
      throw new Error('This request is no longer assigned to you. Please refresh and try again.')
    }

    const now = new Date().toISOString()
    const logEntry = {
      id:        crypto.randomUUID(),
      action:    `${params.action} by ${params.approverName}`,
      userId:    params.approverId,
      userName:  params.approverName,
      details:   params.comments || `${params.action} by ${params.approverName} (${params.approverRole})`,
      timestamp: now,
    }

    const effectiveWorkflow = await getEffectiveWorkflow(req)

    if (effectiveWorkflow.length === 0) {
      throw new Error(
        'No approver assignment workflow configured for this request.'
      )
    }

    const pendingIndex = effectiveWorkflow.findIndex(
      step => step.action === 'Pending'
    )

    if (pendingIndex === -1) {
      throw new Error('No pending approval step found for this request.')
    }

    const pendingStep = effectiveWorkflow[pendingIndex]
    const roleMatch = pendingStep.approverRole === params.approverRole
    const userMatch = pendingStep.approverId === params.approverId
    const hasExplicitAssignee = typeof pendingStep.approverId === 'string' && pendingStep.approverId.trim().length > 0

    const canAct = isAdminOverride || (hasExplicitAssignee ? userMatch : roleMatch)

    if (!canAct) {
      throw new Error(
        `This request is currently assigned to ${pendingStep.approverName || pendingStep.approverRole}.`
      )
    }

    const updatedApprovers = effectiveWorkflow.map((step, index) => {
      if (index !== pendingIndex) {
        return step
      }

      return {
        ...step,
        approverId: params.approverId,
        approverName: params.approverName,
        approverRole: params.approverRole,
        action: params.action,
        comments: params.comments,
        timestamp: now,
      }
    })

    let newStatus: RequestStatus = req.status

    if (params.action === 'Rejected') {
      newStatus = 'Rejected'
    } else if (params.action === 'Returned') {
      newStatus = 'Returned'
    } else {
      const nextPendingStep = getPendingStep(updatedApprovers)
      newStatus = nextPendingStep ? 'For Approval' : 'Approved'
    }

    const updatePayload: Partial<JobOrderRequest> = {
      status: newStatus,
      projectStatus: req.projectStatus,
      ...buildApprovalStateFromWorkflow(updatedApprovers),
      actedApproverIds: [...new Set([...(req.actedApproverIds ?? []), params.approverId])],
      activityLog: [...(req.activityLog ?? []), logEntry],
    }

    const hasNoPendingApprover = !getPendingStep(updatedApprovers)
    if (
      params.action === 'Approved' &&
      hasNoPendingApprover &&
      (!req.projectStatus || !req.projectStatus.trim())
    ) {
      updatePayload.projectStatus = 'For Design'
    }

    try {
      await requestService.update(params.requestId, updatePayload)
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        throw new Error('Approval could not be submitted due to permission rules. This request may no longer be assigned to you, or a restricted field update was detected. Please refresh and try again.')
      }
      throw error
    }

    const postUpdateFailures: string[] = []

    // Notify requester (non-blocking to avoid masking successful approval update)
    try {
      await notificationService.notifyStatusChange({
        userId:       req.requestedBy,
        requestId:    req.id,
        requestNo:    req.jobOrderNo,
        status:       newStatus,
        approverName: params.approverName,
      })
    } catch (error) {
      console.error('[approvalService.processApproval] notification write failed:', error)
      postUpdateFailures.push('requester notification')
    }

    // Audit log (non-blocking to avoid masking successful approval update)
    try {
      await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS ?? 'auditLogs'), {
        action:    `Request ${params.action}`,
        userId:    params.approverId,
        userName:  params.approverName,
        details:   `${params.action} request ${req.jobOrderNo}: ${params.comments}`,
        refId:     params.requestId,
        timestamp: serverTimestamp(),
      })
    } catch (error) {
      console.error('[approvalService.processApproval] audit log write failed:', error)
      postUpdateFailures.push('audit log')
    }

    const baseMessage = `Request ${params.action.toLowerCase()} successfully`
    const message = postUpdateFailures.length > 0
      ? `${baseMessage}. Note: ${postUpdateFailures.join(' and ')} write failed.`
      : baseMessage

    return {
      success:   true,
      newStatus,
      message,
    }
  },

  /**
   * Dashboard stats for this approver
   */
  async getDashboardStats(approverId: string, approverRole: UserRole) {
  const [pending, all] = await Promise.all([
    this.getForMyApproval(approverId, approverRole),
    this.getAllForApprover(approverId, approverRole),
  ])

  const now       = dayjs()
  const thisMonth = all.filter(r => dayjs(r.createdAt).month() === now.month() && dayjs(r.createdAt).year() === now.year())

  const approved   = all.filter(r => r.approvers?.some(a => a.approverId === approverId && a.action === 'Approved'))
  const rejected   = all.filter(r => r.approvers?.some(a => a.approverId === approverId && a.action === 'Rejected'))

  const inProgress = all.filter(r =>
    r.status === 'Approved' && r.projectStatus && r.projectStatus !== 'Completed'
  )

  const completed = all.filter(r => r.projectStatus === 'Completed')

  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const m = now.subtract(5 - i, 'month')
    return {
      label:    m.format('MMM D'),
      requests: all.filter(r => dayjs(r.createdAt).month() === m.month() && dayjs(r.createdAt).year() === m.year()).length,
      approved: approved.filter(r => dayjs(r.createdAt).month() === m.month()).length,
    }
  })

  const byStatus = [
    { name: 'For Approval', value: pending.length,    pct: 0 },
    { name: 'In Progress',  value: inProgress.length, pct: 0 },
    { name: 'Approved',     value: approved.length,   pct: 0 },
    { name: 'Rejected',     value: rejected.length,   pct: 0 },
  ]
  const total = byStatus.reduce((s, b) => s + b.value, 0)
  byStatus.forEach(b => { b.pct = total > 0 ? Math.round(b.value / total * 100) : 0 })

  return {
    forMyApproval:    pending.length,
    approvedThisMonth:approved.length,
    inProgress:       inProgress.length,
    completed:        completed.length,
    totalAll:         all.length,
    monthlyTrend,
    byStatus,
    recentRequests:   all.slice(0, 6),
  }
},
}
