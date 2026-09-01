// types/index.ts

// ── ROLES & PERMISSIONS ───────────────────────────────────
export type UserRole =
  | 'it_admin'
  | 'marketing_manager'
  | 'marketing_director'
  | 'marketing_staff'
  | 'sellout'
  | 'pm'
  | 'sales_director'
  | 'approver'
  | 'technician'
  | 'viewer'

export const ROLE_LABELS: Record<UserRole, string> = {
  it_admin:           'IT Admin',
  marketing_manager:  'Marketing Manager',
  marketing_director: 'Marketing Director',
  marketing_staff:    'Marketing Staff',
  sellout:            'Sellout',
  pm:                 'PM',
  sales_director:     'Sales Director',
  approver:            'Approver',
  technician:         'Technician',
  viewer:              'Viewer',
}

// ── PM APPROVAL CATEGORIES ───────────────────────────────

export const PM_CATEGORIES = [
  'Ref',
  'Freezer',
  'WM',
  'AC',
  'CAC',
  'TV',
  'KDA',
  'Water Solutions',
] as const

export const PM_ASSIGNMENT_CATEGORIES = [
  'Ref',
  'WM',
  'AC',
  'CAC',
  'TV',
  'KDA',
  'Water Solutions',
] as const

export const PRODUCT_CATEGORY_OPTIONS = [
  'Ref',
  'Freezer',
  'WM',
  'AC',
  'CAC',
  'TV',
  'KDA',
  'Water Solutions',
] as const

export type PMCategory = typeof PM_CATEGORIES[number]
export type PMAssignmentCategory = typeof PM_ASSIGNMENT_CATEGORIES[number]
export type ProductCategory = typeof PRODUCT_CATEGORY_OPTIONS[number]

export const PM_CATEGORY_LABELS: Record<PMCategory, string> = {
  Ref: 'PM Ref',
  Freezer: 'PM Freezer',
  WM: 'PM WM',
  AC: 'PM AC',
  CAC: 'PM CAC',
  TV: 'PM TV',
  KDA: 'PM KDA',
  'Water Solutions': 'PM Water Solution',
}

export const PM_CATEGORY_FROM_REQUEST_CATEGORY: Record<string, PMCategory | undefined> = {
  Refrigerator: 'Ref',
  Ref: 'Ref',
  'PM Ref': 'Ref',

  Freezer: 'Freezer',
  'PM Freezer': 'Freezer',

  'Washing Machine': 'WM',
  WM: 'WM',
  'PM WM': 'WM',

  AC: 'AC',
  'Air Conditioner': 'AC',
  'PM AC': 'AC',

  CAC: 'CAC',
  'PM CAC': 'CAC',

  TV: 'TV',
  'PM TV': 'TV',

  KDA: 'KDA',
  'PM KDA': 'KDA',

  'Water Solution': 'Water Solutions',
  'Water Solutions': 'Water Solutions',
  'PM Water Solution': 'Water Solutions',
  'PM Water Solutions': 'Water Solutions',
}

export const DEPARTMENTS = [
  'Marketing', 'Sales', 'Sellout', 'IT', 'PM Ref', 'PM Freezer', 'PM WM', 'PM AC', 'PM CAC', 'PM TV', 'PM KDA', 'PM Water Solution'
] as const
export type Department = typeof DEPARTMENTS[number]

export const PM_DEPARTMENT_BY_CATEGORY: Record<PMCategory, Department> = {
  Ref: 'PM Ref',
  Freezer: 'PM Freezer',
  WM: 'PM WM',
  AC: 'PM AC',
  CAC: 'PM CAC',
  TV: 'PM TV',
  KDA: 'PM KDA',
  'Water Solutions': 'PM Water Solution',
}

export const RACK_CATEGORIES = [
  'Wall','Island','Platform','Riser','Column','Other'
] as const
export type RackCategory = typeof RACK_CATEGORIES[number]

export const ROW_CATEGORIES = [
  'Refrigerator', 'Freezer','Washing Machine','AC','CAC','TV', 'KDA', 'Water Solution'
] as const
export type RowCategory = typeof ROW_CATEGORIES[number]

export const ROW_RACK_TYPES = [
  'Wall','Island','Platform','Riser','Column','Other'
] as const
export type RowRackType = typeof ROW_RACK_TYPES[number]

// Keep for backward compat (used in Installation)
export const PRIORITIES = ['Low','Normal','High','Urgent'] as const
export type Priority = typeof PRIORITIES[number]

// ── USER ─────────────────────────────────────────────────
export interface AppUser {
  uid:         string
  fullName:    string
  email:       string
  role:        UserRole
  department:  Department
  phoneNumber: string
  status:      'Active' | 'Inactive'
  photoURL?:   string
  createdAt:   string
  updatedAt:   string
  lastLogin?:  string
}

// ── JOB ORDER REQUEST ─────────────────────────────────────
export type RequestStatus =
  | 'For Approval' | 'In Progress' | 'Approved' | 'Completed' | 'Rejected' | 'Cancelled' | 'Returned'

export const PROJECT_STATUS_OPTIONS = [
  'For Design',
  'For Occular',
  'For Dealer Approval',
  'Processing Budget Approval (Document, PFF, BRF, & MAF)',
  'For Fabrication',
  'Installation Schedule',
  'Installed',
  'Completed',
] as const

export type ProjectStatus = typeof PROJECT_STATUS_OPTIONS[number]

/** Single row in the Request Details dynamic table */
export interface RequestDetailRow {
  id:          string
  category:    string
  quantity:    number
  rackType:    string
  measurement: string
  skus:        string
  remarks:     string
}

/** Photo uploaded as actual Haier space photo */
export interface JobOrderPhoto {
  url:       string
  name:      string
  size:      number
  type:      string
  uploadedAt:string
}

export interface StoreStatus {
  newBranch:       boolean
  spaceAcquiring:  boolean
  renovation:      boolean
}

export interface SalesEvaluation {
  averageMonthlySellOut:  string
  averageSellIn:          string
  forecastMonthlySellOut: string
}

export interface JobOrderAttachments {
  actualPhoto?:   JobOrderPhoto
  storePlan:      string
  recommendation: string
}

/** Legacy type — still used by Installation.completionPhotos */
export interface JobOrderAttachment {
  url:       string
  publicId:  string
  name:      string
  size:      number
  type:      string
  uploadedAt:string
}

export interface RequestComment {
  id:         string
  userId:     string
  userName:   string
  userRole:   UserRole
  comment:    string
  createdAt:  string
}

export interface ActivityLog {
  id:        string
  action:    string
  userId:    string
  userName:  string
  details:   string
  timestamp: string
}

export interface JobOrderRequest {
  id:          string
  jobOrderNo:  string           // e.g. MR-2025-0001

  // ── Step 1: Request Details ──
  date:            string        // dd/mm/yyyy or ISO
  requestor:       string        // full name
  productCategory: string
  productCategories: string[]
  dealer:          string
  branchLocation:  string
  targetDate:      string
  remarks:         string

  storeStatus:     StoreStatus
  salesEvaluation: SalesEvaluation
  requestDetails:  RequestDetailRow[]

  // ── Step 2: Attachments ──
  attachments:     JobOrderAttachments

  // ── System / Approval fields ──
  status:          RequestStatus
  projectStatus?:  ProjectStatus
  vendorName?:     string
  projectAmount?:  number
  requestedBy:     string        // uid
  requesterEmail:  string
  department:      Department
  priority:        Priority       // defaults to 'Normal'
  contactPerson?:  string
  contactNumber?:  string

  assignedTechnician?: string
  technicianName?:     string

  approvalLevel: number

// All assigned approver user IDs for this request (for secure query-based visibility)
approverIds?: string[]

// Approver user IDs that have already taken an action (for My Approvals history)
actedApproverIds?: string[]

// UID of the person currently expected to approve
currentApprover?: string | null

// Current approval stage
currentApprovalStage?: ApprovalStage | null

// PM category currently awaiting approval
currentPMCategory?: PMCategory | null

approvers: ApprovalStep[]
  comments:         RequestComment[]
  activityLog:      ActivityLog[]

  createdAt:    string
  updatedAt:    string
  completedAt?: string
  scheduledDate?:string
}

// ── APPROVAL ─────────────────────────────────────────────
export type ApprovalAction = 'Approved' | 'Rejected' | 'Returned' | 'Pending'

export type ApprovalStage =
  | 'sales_director'
  | 'sellout'
  | 'pm'
  | 'marketing_manager'
  | 'marketing_director'

export interface ApprovalStep {
  level: number

  approverId: string
  approverName: string
  approverRole: UserRole

  // Used when approverRole === 'pm'
  pmCategory?: PMCategory

  // Identifies the approval stage
  stage: ApprovalStage

  action: ApprovalAction

  comments?: string
  timestamp?: string
}

// ── RACK INVENTORY ────────────────────────────────────────
export type RackStatus    = 'Available' | 'In Use' | 'Maintenance' | 'Damaged' | 'Retired'
export type RackCondition = 'Good' | 'Fair' | 'Poor'

export interface RackInventory {
  id:                 string
  rackNo:             string       // RCK-0001
  productCategory?:   string       // e.g. "Refrigerator" — the appliance type
  rackType:           RackCategory // e.g. "Wall" — the mounting/structure type
  locationStore:      string
  branch:             string
  status:             RackStatus
  condition:          RackCondition
  installationStatus: 'Installed' | 'Not Installed' | 'In Transit'
  vendor?:            string
  priceAmount?:       number
  photoUrl?:          string
  photoPublicId?:     string
  notes?:             string
  lastUpdated:        string
  createdAt:          string
  history:            RackHistoryEntry[]
}

export interface RackHistoryEntry {
  action:    string
  details:   string
  userId:    string
  userName:  string
  timestamp: string
}

// ── INSTALLATION ──────────────────────────────────────────
export type InstallStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled'

export interface Installation {
  id:               string
  installationId:   string        // INS-2024-0000
  requestNo:        string
  requestId:        string
  technicianId:     string
  technicianName:   string
  scheduledDate:    string
  completedDate?:   string
  status:           InstallStatus
  notes?:           string
  completionPhotos: JobOrderAttachment[]
  createdAt:        string
  updatedAt:        string
}

/// ── APPROVER ASSIGNMENT ───────────────────────────────────

export interface ApproverAssignmentStep {
  id: string

  sequence: number

  approverId: string
  approverName: string
  approverRole: UserRole

  // Required only for PM assignments
  pmCategory?: PMCategory

  stage: ApprovalStage

  active: boolean
}

export interface ApproverAssignment {
  id: string

  department: Department

  // Optional category filter for the assignment
  rackCategory: RackCategory | 'All'

  // Sequential approval configuration
  steps: ApproverAssignmentStep[]

  createdAt: string
  updatedAt: string
}

export const APPROVAL_STAGE_ORDER: ApprovalStage[] = [
  'sales_director',
  'sellout',
  'pm',
  'marketing_manager',
  'marketing_director',
]

export const APPROVAL_STAGE_LABELS: Record<ApprovalStage, string> = {
  sales_director: 'Sales Director',
  sellout: 'Sellout',
  pm: 'PM',
  marketing_manager: 'Marketing Manager',
  marketing_director: 'Marketing Director',
}


// ── DASHBOARD STATS ───────────────────────────────────────
export interface DashboardStats {
  totalRequests:    number
  forApproval:      number
  inProgress:       number
  completed:        number
  totalLastMonth:   number
  approvalLastMonth:number
  progressLastMonth:number
  completedLastMonth:number
  monthlyTrend:     { date: string; count: number }[]
  byStatus:         { status: RequestStatus; count: number; pct: number }[]
  byDepartment:     { dept: string; count: number }[]
  recentRequests:   JobOrderRequest[]
}

// ── SYSTEM SETTINGS ───────────────────────────────────────
export interface SystemSettings {
  systemName:        string
  timezone:          string
  dateFormat:        string
  currency:          string
  maxUploadMB:       number
  allowedFileTypes:  string[]
  retentionYears:    number
  autoReminders:     boolean
  reminderInterval:  string
  defaultApprovalFlow: string[]
  cloudinaryCloudName: string
  cloudinaryPreset:  string
  workingDays:       string[]
  requestNoPrefix:   string
  requestNoYear:     boolean
}

// ── TABLE TYPES ───────────────────────────────────────────
export interface PaginatedResult<T> {
  data:       T[]
  total:      number
  page:       number
  pageSize:   number
  totalPages: number
}

export interface FilterParams {
  search?:     string
  status?:     string
  department?: string
  category?:   string
  priority?:   string
  dateFrom?:   string
  dateTo?:     string
  page?:       number
  pageSize?:   number
  sortField?:  string
  sortDir?:    'asc' | 'desc'
}
