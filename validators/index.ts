// validators/index.ts
import { z } from 'zod'

// ── Job Order Request ─────────────────────────────────────
export const requestDetailRowSchema = z.object({
  id:          z.string(),
  category:    z.string().min(1, 'Category required'),
  quantity:    z.number().int().min(1, 'Quantity must be at least 1'),
  rackType:    z.string().min(1, 'Rack type required'),
  measurement: z.string().optional().default(''),
  skus:        z.string().optional().default(''),
  remarks:     z.string().optional().default(''),
})

export const createRequestSchema = z.object({
  date:            z.string().min(1, 'Date is required'),
  requestor:       z.string().min(2, 'Requestor name required'),
  productCategory: z.string().optional().default(''),
  productCategories: z.array(z.string()).min(1, 'Product category required'),
  dealer:          z.string().optional().default(''),
  branchLocation:  z.string().min(2, 'Branch / Store location required'),
  targetDate:      z.string().optional().default(''),
  remarks:         z.string().optional().default(''),
  storeStatus: z.object({
    newBranch:      z.boolean(),
    spaceAcquiring: z.boolean(),
    renovation:     z.boolean(),
  }),
  salesEvaluation: z.object({
    averageMonthlySellOut:  z.string().optional().default(''),
    averageSellIn:          z.string().optional().default(''),
    forecastMonthlySellOut: z.string().optional().default(''),
  }),
  requestDetails: z.array(requestDetailRowSchema)
    .min(1, 'At least one request detail row is required'),
  attachments: z.object({
    storePlan:      z.string().optional().default(''),
    recommendation: z.string().optional().default(''),
  }),
  department: z.string().min(1, 'Department is required'),
  priority:   z.enum(['Low','Normal','High','Urgent']).default('Normal'),
})

export type CreateRequestInput = z.infer<typeof createRequestSchema>
export type RequestDetailRowInput = z.infer<typeof requestDetailRowSchema>

// ── User ─────────────────────────────────────────────────
export const createUserSchema = z.object({
  fullName:    z.string().min(2, 'Full name required').max(100),
  email:       z.string().email('Invalid email address'),
  role:        z.enum(['it_admin','marketing_manager','marketing_staff','pm','sales_director','approver','technician','viewer']),
  department:  z.string().min(1, 'Department required'),
  phoneNumber: z.string().min(7, 'Phone number required'),
  status:      z.enum(['Active','Inactive']).default('Active'),
  password:    z.string().min(6, 'Password must be at least 6 characters'),
  confirmPw:   z.string(),
}).refine(data => data.password === data.confirmPw, {
  message: 'Passwords do not match', path: ['confirmPw'],
})

export type CreateUserInput = z.infer<typeof createUserSchema>

// ── Rack Inventory ────────────────────────────────────────
export const createRackSchema = z.object({
  rackType:           z.string().min(1, 'Rack type required'),
  locationStore:      z.string().min(2, 'Location required'),
  branch:             z.string().optional(),
  status:             z.enum(['Available','In Use','Maintenance','Damaged','Retired']),
  condition:          z.enum(['Good','Fair','Poor']),
  installationStatus: z.enum(['Installed','Not Installed','In Transit']),
  notes:              z.string().max(500).optional(),
})

export type CreateRackInput = z.infer<typeof createRackSchema>

// ── Installation ──────────────────────────────────────────
export const createInstallationSchema = z.object({
  requestId:     z.string().min(1, 'Request required'),
  technicianId:  z.string().min(1, 'Technician required'),
  scheduledDate: z.string().min(1, 'Schedule date required'),
  status:        z.enum(['Scheduled','In Progress','Completed','Cancelled']),
  notes:         z.string().max(1000).optional(),
})

export type CreateInstallationInput = z.infer<typeof createInstallationSchema>

// ── Approver Assignment ───────────────────────────────────
export const approverAssignmentSchema = z.object({
  department:   z.string().min(1, 'Department required'),
  rackCategory: z.string().min(1, 'Category required'),
  approver1Id:  z.string().min(1, 'At least one approver required'),
  approver2Id:  z.string().optional(),
})

export type ApproverAssignmentInput = z.infer<typeof approverAssignmentSchema>

// ── Login ─────────────────────────────────────────────────
export const loginSchema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password required'),
})

export type LoginInput = z.infer<typeof loginSchema>
