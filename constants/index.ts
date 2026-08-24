// constants/index.ts

export const APP_NAME    = 'Marketing Racks Job Order Request System'
export const APP_VERSION = '1.0.0'

export const REQUEST_NUMBER_PREFIX = 'MR'
export const RACK_NUMBER_PREFIX    = 'RCK'
export const INSTALL_NUMBER_PREFIX = 'INS'

export const MAX_UPLOAD_MB = 10
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

export const ALLOWED_FILE_TYPES = ['image/jpeg','image/png','image/gif','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
export const ALLOWED_EXTENSIONS = ['JPG','JPEG','PNG','GIF','PDF','DOC','DOCX']

export const CLOUDINARY_FOLDERS = {
  REQUESTS:      'marketing-racks/requests',
  INVENTORY:     'marketing-racks/inventory',
  INSTALLATIONS: 'marketing-racks/installations',
  PROFILES:      'marketing-racks/profiles',
  MISC:          'marketing-racks/misc',
} as const

export const PAGINATION_SIZES = [10, 25, 50, 100]

export const APPROVAL_ROLE_ORDER = [
  'sales_director',
  'pm',
  'marketing_manager',
] as const

export const STATUS_FLOW = {
  DRAFT:        'For Approval',
  FOR_APPROVAL: 'In Progress',
  IN_PROGRESS:  'Completed',
} as const

export const DEMO_ACCOUNTS = [
  { email: 'admin@haier.com',     password: 'admin123', role: 'IT Admin',         note: 'Full system access' },
  { email: 'director@haier.com',  password: 'pass123',  role: 'Sales Director',   note: 'Level 1 approver' },
  { email: 'pm@haier.com',        password: 'pass123',  role: 'PM',               note: 'Level 2 approver' },
  { email: 'manager@haier.com',   password: 'pass123',  role: 'Marketing Manager',note: 'Level 3 approver' },
  { email: 'employee@haier.com',  password: 'pass123',  role: 'Marketing Staff',  note: 'Request submitter' },
  { email: 'tech@haier.com',      password: 'pass123',  role: 'Technician',       note: 'Installation handler' },
] as const

export const CHART_COLOR_MAP = {
  'For Approval': '#f59e0b',
  'In Progress':  '#3b82f6',
  'Completed':    '#10b981',
  'Rejected':     '#ef4444',
  'Cancelled':    '#94a3b8',
  'Returned':     '#f97316',
} as const
