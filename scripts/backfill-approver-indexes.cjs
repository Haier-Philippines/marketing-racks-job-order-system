/*
  One-time backfill for legacy approval index fields.

  Default mode is DRY RUN (no writes).

  Usage:
    node scripts/backfill-approver-indexes.cjs
    node scripts/backfill-approver-indexes.cjs --apply

  Optional env:
    FIREBASE_SERVICE_ACCOUNT_PATH=./job-order-request-40a2a-firebase-adminsdk-fbsvc-68105d6453.json
*/

const path = require('path')
const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

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
  const apply = process.argv.includes('--apply')
  const serviceAccountPath = resolveServiceAccountPath()
  const serviceAccount = require(serviceAccountPath)

  initializeApp({
    credential: cert(serviceAccount),
  })

  const db = getFirestore()
  const snap = await db.collection('jobOrderRequests').get()

  const toUpdate = []

  for (const doc of snap.docs) {
    const data = doc.data() || {}
    const approvers = Array.isArray(data.approvers) ? data.approvers : []
    if (approvers.length === 0) continue

    const existingApproverIds = asStringArray(data.approverIds)
    const existingActedApproverIds = asStringArray(data.actedApproverIds)
    const nextApproverIds = derivedApproverIds(approvers)
    const nextActedApproverIds = derivedActedApproverIds(approvers)

    const approverIdsChanged = !sameSet(existingApproverIds, nextApproverIds)
    const actedApproverIdsChanged = !sameSet(existingActedApproverIds, nextActedApproverIds)

    if (!approverIdsChanged && !actedApproverIdsChanged) continue

    toUpdate.push({
      ref: doc.ref,
      id: doc.id,
      jobOrderNo: data.jobOrderNo || null,
      patch: {
        approverIds: nextApproverIds,
        actedApproverIds: nextActedApproverIds,
        updatedAt: FieldValue.serverTimestamp(),
      },
      previous: {
        approverIds: existingApproverIds,
        actedApproverIds: existingActedApproverIds,
      },
    })
  }

  console.log('=== Backfill Preview ===')
  console.log(JSON.stringify({
    dryRun: !apply,
    candidates: toUpdate.length,
  }, null, 2))

  if (toUpdate.length > 0) {
    console.log('\nSample candidates (max 20):')
    console.log(JSON.stringify(
      toUpdate.slice(0, 20).map(item => ({
        id: item.id,
        jobOrderNo: item.jobOrderNo,
        previous: item.previous,
        next: {
          approverIds: item.patch.approverIds,
          actedApproverIds: item.patch.actedApproverIds,
        },
      })),
      null,
      2
    ))
  }

  if (!apply || toUpdate.length === 0) {
    console.log('\nNo writes executed. Run with --apply to persist changes.')
    return
  }

  const chunkSize = 400
  let committed = 0

  for (let i = 0; i < toUpdate.length; i += chunkSize) {
    const chunk = toUpdate.slice(i, i + chunkSize)
    const batch = db.batch()

    for (const item of chunk) {
      batch.update(item.ref, item.patch)
    }

    await batch.commit()
    committed += chunk.length
    console.log(`Committed ${committed}/${toUpdate.length}`)
  }

  console.log('\nBackfill complete.')
}

main().catch(err => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
