// firebase/collections.ts
// Central registry of all Firestore collection names

export const COLLECTIONS = {
  USERS:          'users',
  REQUESTS:       'jobOrderRequests',
  INVENTORY:      'rackInventory',
  INSTALLATIONS:  'installations',
  APPROVALS:      'approvals',
  APPROVER_ASSIGN:'approverAssignments',
  SETTINGS:       'systemSettings',
  AUDIT_LOGS:     'auditLogs',
  NOTIFICATIONS:  'notifications',
  SEQUENCES:      '_sequences',
} as const

// Subcollections
export const SUB = {
  COMMENTS:    'comments',
  ACTIVITY:    'activityLogs',
  HISTORY:     'history',
} as const

/*
FIRESTORE SCHEMA:
─────────────────────────────────────────────
users/{uid}
  - AppUser fields

jobOrderRequests/{id}
  - JobOrderRequest fields
  - comments/{id}       → RequestComment
  - activityLogs/{id}   → ActivityLog

rackInventory/{id}
  - RackInventory fields
  - history/{id}        → RackHistoryEntry

installations/{id}
  - Installation fields

approverAssignments/{id}
  - ApproverAssignment fields

systemSettings/main
  - SystemSettings fields

auditLogs/{id}
  - action, userId, userName, details, timestamp

notifications/{id}
  - userId, title, body, read, type, refId, createdAt

_sequences/{col}
  - year, count
─────────────────────────────────────────────
*/
