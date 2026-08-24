/*
  Read-only audit for legacy approval index fields.

  Usage:
    node scripts/audit-approver-indexes.cjs

  Optional env:
    FIREBASE_SERVICE_ACCOUNT_PATH=./job-order-request-40a2a-firebase-adminsdk-fbsvc-68105d6453.json
*/

const path = require('path')
const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

function resolveServiceAccountPath() {
  const configured = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (configured && configured.trim()) {
    return path.resolve(process.cwd(), configured)
  }
  return path.resolve(
    process.cwd(),
    'job-order-request-40a2a-firebase-adminsdk-fbsvc-68105d6453.json'
  )
}

function asStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.filter(v => typeof v === 'string' && v.trim().length > 0)
}

function unique(values) {
  return [...new Set(values)]
}

function derivedApproverIds(approvers) {
  if (!Array.isArray(approvers)) return []
  return unique(
    approvers
      .map(step => (typeof step?.approverId === 'string' ? step.approverId.trim() : ''))
      .filter(Boolean)
  )
}

function derivedActedApproverIds(approvers) {
  if (!Array.isArray(approvers)) return []
  return unique(
    approvers
      .filter(step => typeof step?.action === 'string' && step.action !== 'Pending')
      .map(step => (typeof step?.approverId === 'string' ? step.approverId.trim() : ''))
      .filter(Boolean)
  )
}

function sameSet(a, b) {
  if (a.length !== b.length) return false
  const left = new Set(a)
  return b.every(v => left.has(v))
}

async function main() {
  const serviceAccountPath = resolveServiceAccountPath()
  const serviceAccount = require(serviceAccountPath)

  initializeApp({
    credential: cert(serviceAccount),
  })

  const db = getFirestore()
  const snap = await db.collection('jobOrderRequests').get()

  let total = 0
  let withApprovers = 0
  let missingOrEmptyApproverIds = 0
  let mismatchedApproverIds = 0
  let mismatchedActedApproverIds = 0

  const samples = []

  for (const doc of snap.docs) {
    total += 1
    const data = doc.data() || {}
    const approvers = Array.isArray(data.approvers) ? data.approvers : []
    const existingApproverIds = asStringArray(data.approverIds)
    const existingActedApproverIds = asStringArray(data.actedApproverIds)
    const derivedIds = derivedApproverIds(approvers)
    const derivedActedIds = derivedActedApproverIds(approvers)

    const hasApprovers = approvers.length > 0
    if (hasApprovers) withApprovers += 1

    const hasEmptyApproverIdsWithApprovers = hasApprovers && existingApproverIds.length === 0
    const hasApproverIdsMismatch = hasApprovers && !sameSet(existingApproverIds, derivedIds)
    const hasActedMismatch = !sameSet(existingActedApproverIds, derivedActedIds)

    if (hasEmptyApproverIdsWithApprovers) missingOrEmptyApproverIds += 1
    if (hasApproverIdsMismatch) mismatchedApproverIds += 1
    if (hasActedMismatch) mismatchedActedApproverIds += 1

    if (hasEmptyApproverIdsWithApprovers || hasApproverIdsMismatch || hasActedMismatch) {
      if (samples.length < 20) {
        samples.push({
          id: doc.id,
          jobOrderNo: data.jobOrderNo || null,
          approversCount: approvers.length,
          existingApproverIds,
          derivedIds,
          existingActedApproverIds,
          derivedActedIds,
        })
      }
    }
  }

  console.log('=== Approver Index Audit ===')
  console.log(JSON.stringify({
    total,
    withApprovers,
    missingOrEmptyApproverIds,
    mismatchedApproverIds,
    mismatchedActedApproverIds,
  }, null, 2))

  if (samples.length > 0) {
    console.log('\nSample mismatches (max 20):')
    console.log(JSON.stringify(samples, null, 2))
  } else {
    console.log('\nNo mismatches found.')
  }
}

main().catch(err => {
  console.error('Audit failed:', err)
  process.exit(1)
})
