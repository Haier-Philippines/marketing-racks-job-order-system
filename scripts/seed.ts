// scripts/seed.ts
// Run with: npx ts-node scripts/seed.ts
// Creates demo users, requests, inventory, and installations in Firestore

import { initializeApp } from 'firebase/app'
import {
  getFirestore, collection, addDoc, doc, setDoc,
  serverTimestamp, writeBatch,
} from 'firebase/firestore'
import {
  getAuth, createUserWithEmailAndPassword, updateProfile,
} from 'firebase/auth'

// ── Replace with your Firebase config ────────────────────
const firebaseConfig = {
  apiKey:            'your_api_key',
  authDomain:        'your_project.firebaseapp.com',
  projectId:         'your_project_id',
  storageBucket:     'your_project.appspot.com',
  messagingSenderId: 'your_sender_id',
  appId:             'your_app_id',
}
// ─────────────────────────────────────────────────────────

const app  = initializeApp(firebaseConfig)
const db   = getFirestore(app)
const auth = getAuth(app)

const DEMO_USERS = [
  { email:'admin@haier.com',    password:'admin123', fullName:'Juan Dela Cruz',   role:'it_admin',          department:'IT',        phoneNumber:'0917 123 4567' },
  { email:'director@haier.com', password:'pass123',  fullName:'Maria Santos',     role:'sales_director',    department:'Sales',     phoneNumber:'0917 234 5678' },
  { email:'pm@haier.com',       password:'pass123',  fullName:'Mark Dizon',       role:'pm',                department:'Marketing', phoneNumber:'0917 345 6789' },
  { email:'manager@haier.com',  password:'pass123',  fullName:'Pedro Garcia',     role:'marketing_manager', department:'Marketing', phoneNumber:'0917 456 7890' },
  { email:'staff@haier.com',    password:'pass123',  fullName:'Ana Reyes',        role:'marketing_staff',   department:'Marketing', phoneNumber:'0917 567 8901' },
  { email:'tech@haier.com',     password:'pass123',  fullName:'Jose Ramon',       role:'technician',        department:'Operations',phoneNumber:'0917 678 9012' },
  { email:'viewer@haier.com',   password:'pass123',  fullName:'Carla Cruz',       role:'viewer',            department:'Sales',     phoneNumber:'0917 789 0123' },
]

const RACK_INVENTORY = [
  { rackType:'Double Sided Rack', locationStore:'Abenson QC',         branch:'Quezon City',  status:'Available',   condition:'Good', installationStatus:'Not Installed' },
  { rackType:'Single Sided Rack', locationStore:'SM Megamall',        branch:'Mandaluyong',  status:'In Use',      condition:'Good', installationStatus:'Installed'     },
  { rackType:'End Cap Rack',      locationStore:'Robinsons Manila',   branch:'Manila',       status:'Maintenance', condition:'Fair', installationStatus:'Installed'     },
  { rackType:'Double Sided Rack', locationStore:'SM North EDSA',      branch:'Quezon City',  status:'In Use',      condition:'Good', installationStatus:'Installed'     },
  { rackType:'Single Sided Rack', locationStore:'Abenson Flagg',      branch:'Pasig',        status:'Available',   condition:'Good', installationStatus:'Not Installed' },
  { rackType:'Wall Mounted Rack', locationStore:'SM Sucat',           branch:'Parañaque',    status:'Available',   condition:'Good', installationStatus:'Not Installed' },
  { rackType:'Double Sided Rack', locationStore:'Ayala Manila Bay',   branch:'Pasay',        status:'In Use',      condition:'Fair', installationStatus:'Installed'     },
  { rackType:'End Cap Rack',      locationStore:'New Glorietta',      branch:'Makati',       status:'Available',   condition:'Good', installationStatus:'Not Installed' },
]

const SAMPLE_REQUESTS = [
  {
    date: '2024-06-15', requestor: 'Ana Reyes', productCategory: 'Refrigerator',
    dealer: 'Haier', branchLocation: 'Abenson QC', targetDate: '2024-06-28',
    remarks: 'Install 2 units of double sided rack at home appliance section.',
    department: 'Marketing', priority: 'Medium', status: 'For Approval',
    storeStatus: { newBranch: false, spaceAcquiring: false, renovation: false },
    salesEvaluation: { averageMonthlySellOut: '150', averageSellIn: '200', forecastMonthlySellOut: '180' },
    requestDetails: [{ id: crypto.randomUUID(), category: 'Rack', quantity: 2, rackType: 'Double Sided', measurement: '120x60x200', skus: '', remarks: '' }],
    contactPerson: 'Juan Dela Cruz', contactNumber: '0917 123 4567',
    attachments: { actualPhoto: undefined, storePlan: '', recommendation: '' },
  },
  {
    date: '2024-06-14', requestor: 'Pedro Garcia', productCategory: 'Electronics',
    dealer: 'Haier', branchLocation: 'SM Megamall', targetDate: '2024-06-24',
    remarks: 'Single sided rack at electronics section is damaged. Needs immediate repair.',
    department: 'Marketing', priority: 'High', status: 'In Progress',
    storeStatus: { newBranch: false, spaceAcquiring: false, renovation: false },
    salesEvaluation: { averageMonthlySellOut: '120', averageSellIn: '180', forecastMonthlySellOut: '140' },
    requestDetails: [{ id: crypto.randomUUID(), category: 'Repair', quantity: 1, rackType: 'Single Sided', measurement: '100x50x200', skus: '', remarks: 'Damaged corner' }],
    contactPerson: 'Pedro Garcia', contactNumber: '0917 456 7890',
    attachments: { actualPhoto: undefined, storePlan: '', recommendation: '' },
  },
  {
    date: '2024-06-13', requestor: 'Maria Santos', productCategory: 'Refrigerator',
    dealer: 'Haier', branchLocation: 'Robinsons Manila', targetDate: '2024-06-25',
    remarks: 'Install new double sided rack for the refrigerator display section.',
    department: 'Sales', priority: 'Normal', status: 'Completed',
    storeStatus: { newBranch: false, spaceAcquiring: false, renovation: false },
    salesEvaluation: { averageMonthlySellOut: '200', averageSellIn: '250', forecastMonthlySellOut: '220' },
    requestDetails: [{ id: crypto.randomUUID(), category: 'Rack', quantity: 1, rackType: 'Double Sided', measurement: '120x60x200', skus: 'BCD100', remarks: '' }],
    contactPerson: 'Maria Santos', contactNumber: '0917 234 5678',
    attachments: { actualPhoto: undefined, storePlan: '', recommendation: '' },
  },
  {
    date: '2024-06-12', requestor: 'Ana Reyes', productCategory: 'Kitchen Appliances',
    dealer: 'Haier', branchLocation: 'SM North EDSA', targetDate: '2024-06-30',
    remarks: 'Relocate existing rack from washing machine section to kitchen appliances.',
    department: 'Marketing', priority: 'Normal', status: 'For Approval',
    storeStatus: { newBranch: false, spaceAcquiring: false, renovation: false },
    salesEvaluation: { averageMonthlySellOut: '100', averageSellIn: '150', forecastMonthlySellOut: '120' },
    requestDetails: [{ id: crypto.randomUUID(), category: 'Relocation', quantity: 1, rackType: 'Double Sided', measurement: '120x60x200', skus: '', remarks: 'Existing unit' }],
    contactPerson: 'Ana Reyes', contactNumber: '0917 567 8901',
    attachments: { actualPhoto: undefined, storePlan: '', recommendation: '' },
  },
  {
    date: '2024-06-11', requestor: 'Jose Ramon', productCategory: 'Branding',
    dealer: 'Haier', branchLocation: 'Abenson Flagg', targetDate: '2024-06-18',
    remarks: 'Update rack graphics with new 2024 Haier branding materials.',
    department: 'Marketing', priority: 'Low', status: 'Completed',
    storeStatus: { newBranch: false, spaceAcquiring: false, renovation: false },
    salesEvaluation: { averageMonthlySellOut: '80', averageSellIn: '120', forecastMonthlySellOut: '100' },
    requestDetails: [{ id: crypto.randomUUID(), category: 'Signage', quantity: 1, rackType: 'Single Sided', measurement: '80x40x180', skus: '', remarks: 'Graphic only' }],
    contactPerson: 'Jose Ramon', contactNumber: '0917 678 9012',
    attachments: { actualPhoto: undefined, storePlan: '', recommendation: '' },
  },
  {
    date: '2024-06-10', requestor: 'Carla Cruz', productCategory: 'Appliances',
    dealer: 'Haier', branchLocation: 'Robinsons Galleria', targetDate: '2024-07-01',
    remarks: 'End cap rack at main entrance is severely damaged and unsafe. Requires immediate replacement.',
    department: 'Sales', priority: 'Urgent', status: 'Rejected',
    storeStatus: { newBranch: false, spaceAcquiring: false, renovation: false },
    salesEvaluation: { averageMonthlySellOut: '180', averageSellIn: '220', forecastMonthlySellOut: '200' },
    requestDetails: [{ id: crypto.randomUUID(), category: 'Repair', quantity: 1, rackType: 'End Cap', measurement: '100x60x200', skus: '', remarks: 'Damaged - needs replacement' }],
    contactPerson: 'Carla Cruz', contactNumber: '0917 789 0123',
    attachments: { actualPhoto: undefined, storePlan: '', recommendation: '' },
  },
]

async function seed() {
  console.log('🌱 Starting seed...\n')

  // ── Create users ─────────────────────────────────────
  console.log('👥 Creating users...')
  const userIds: Record<string, string> = {}

  for (const u of DEMO_USERS) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, u.email, u.password)
      await updateProfile(cred.user, { displayName: u.fullName })
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid:         cred.user.uid,
        fullName:    u.fullName,
        email:       u.email,
        role:        u.role,
        department:  u.department,
        phoneNumber: u.phoneNumber,
        status:      'Active',
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
      })
      userIds[u.role] = cred.user.uid
      console.log(`  ✓ ${u.fullName} (${u.role})`)
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        console.log(`  ⚠ ${u.email} already exists, skipping`)
      } else {
        console.error(`  ✗ ${u.email}:`, err.message)
      }
    }
  }

  // ── Sequences ─────────────────────────────────────────
  console.log('\n📊 Setting up sequences...')
  const year = new Date().getFullYear()
  await setDoc(doc(db, '_sequences','requests'),     { year, count: SAMPLE_REQUESTS.length })
  await setDoc(doc(db, '_sequences','racks'),        { count: RACK_INVENTORY.length })
  await setDoc(doc(db, '_sequences','installations'),{ year, count: 3 })
  console.log('  ✓ Sequences initialized')

  // ── Rack Inventory ────────────────────────────────────
  console.log('\n📦 Creating rack inventory...')
  const batch = writeBatch(db)
  RACK_INVENTORY.forEach((rack, i) => {
    const ref = doc(collection(db, 'rackInventory'))
    batch.set(ref, {
      ...rack,
      rackNo:    `RCK-${String(i+1).padStart(4,'0')}`,
      notes:     '',
      history:   [],
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    })
  })
  await batch.commit()
  console.log(`  ✓ ${RACK_INVENTORY.length} racks created`)

  // ── Job Order Requests ────────────────────────────────
  console.log('\n📋 Creating sample requests...')
  const requestIds: string[] = []
  const staffId = userIds['marketing_staff'] ?? Object.values(userIds)[4] ?? 'demo'

  for (let i = 0; i < SAMPLE_REQUESTS.length; i++) {
    const req = SAMPLE_REQUESTS[i]
    const ref = await addDoc(collection(db, 'jobOrderRequests'), {
      ...req,
      jobOrderNo:  `JO-${year}-${String(i+1).padStart(4,'0')}`,
      requestedBy: staffId,
      activityLog: [{
        id:        `log-${i}-1`,
        action:    'Request Submitted',
        userId:    staffId,
        userName:  req.requestor,
        details:   'Job order submitted for approval',
        timestamp: new Date(Date.now() - (6-i) * 24*60*60*1000).toISOString(),
      }],
      approvers: req.status === 'Completed' ? [
        { level:1, approverId: userIds['sales_director'] ?? '', approverName:'Maria Santos',  approverRole:'sales_director',    action:'Approved', timestamp: new Date().toISOString(), comments:'' },
        { level:2, approverId: userIds['pm'] ?? '',            approverName:'Mark Dizon',     approverRole:'pm',                action:'Approved', timestamp: new Date().toISOString(), comments:'' },
        { level:3, approverId: userIds['marketing_manager']?? '',approverName:'Pedro Garcia', approverRole:'marketing_manager',  action:'Approved', timestamp: new Date().toISOString(), comments:'' },
      ] : req.status === 'Rejected' ? [
        { level:1, approverId: userIds['sales_director'] ?? '', approverName:'Maria Santos', approverRole:'sales_director', action:'Rejected', timestamp: new Date().toISOString(), comments:'Budget not available this quarter.' },
      ] : [],
      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
    })
    requestIds.push(ref.id)
    console.log(`  ✓ JO-${year}-${String(i+1).padStart(4,'0')} – ${req.productCategory}`)
  }

  // ── Installations ─────────────────────────────────────
  console.log('\n🔧 Creating installations...')
  const techId = userIds['technician'] ?? ''
  const installs = [
    { requestId: requestIds[0], jobOrderNo:`JO-${year}-0001`, status:'Scheduled',  scheduledDate:'2024-06-28' },
    { requestId: requestIds[1], jobOrderNo:`JO-${year}-0002`, status:'In Progress',scheduledDate:'2024-06-24' },
    { requestId: requestIds[2], jobOrderNo:`JO-${year}-0003`, status:'Completed',  scheduledDate:'2024-06-20', completedDate:'2024-06-21' },
  ]
  for (let i = 0; i < installs.length; i++) {
    await addDoc(collection(db, 'installations'), {
      ...installs[i],
      installationId:  `INS-${year}-${String(i+1).padStart(4,'0')}`,
      technicianId:    techId,
      technicianName:  'Jose Ramon',
      notes:           '',
      completionPhotos:[],
      createdAt:       serverTimestamp(),
      updatedAt:       serverTimestamp(),
    })
  }
  console.log(`  ✓ ${installs.length} installations created`)

  // ── System Settings ───────────────────────────────────
  console.log('\n⚙️  Creating system settings...')
  await setDoc(doc(db, 'systemSettings', 'main'), {
    systemName:          'Marketing Racks Job Order Request System',
    timezone:            'GMT+08:00 Asia/Manila',
    dateFormat:          'MM/DD/YYYY',
    currency:            'PHP - Philippine Peso',
    maxUploadMB:         10,
    allowedFileTypes:    ['JPG','PNG','PDF','DOC','DOCX'],
    retentionYears:      3,
    autoReminders:       true,
    reminderInterval:    'Every 24 hours',
    defaultApprovalFlow: ['Sales Director (Local/Expert)','Marketing Manager'],
    cloudinaryCloudName: '',
    cloudinaryPreset:    '',
    workingDays:         ['Mon','Tue','Wed','Thu','Fri'],
    requestNoPrefix:     'MR',
    requestNoYear:       true,
  })
  console.log('  ✓ System settings saved')

  // ── Approver Assignments ──────────────────────────────
  console.log('\n👔 Creating approver assignments...')
  const assignments = [
    { department:'Marketing', rackCategory:'TV',              approver1Id: userIds['sales_director']??'', approver1Name:'Maria Santos',  approver1Role:'sales_director',    approver2Id: userIds['marketing_manager']??'', approver2Name:'Pedro Garcia', approver2Role:'marketing_manager' },
    { department:'Marketing', rackCategory:'Refrigerator',    approver1Id: userIds['sales_director']??'', approver1Name:'Maria Santos',  approver1Role:'sales_director',    approver2Id: userIds['marketing_manager']??'', approver2Name:'Pedro Garcia', approver2Role:'marketing_manager' },
    { department:'Marketing', rackCategory:'Washing Machine', approver1Id: userIds['pm']??'',             approver1Name:'Mark Dizon',    approver1Role:'pm',                approver2Id: userIds['marketing_manager']??'', approver2Name:'Pedro Garcia', approver2Role:'marketing_manager' },
    { department:'Marketing', rackCategory:'KDA',             approver1Id: userIds['pm']??'',             approver1Name:'Mark Dizon',    approver1Role:'pm',                approver2Id: userIds['marketing_manager']??'', approver2Name:'Pedro Garcia', approver2Role:'marketing_manager' },
    { department:'Sales',     rackCategory:'All',             approver1Id: userIds['sales_director']??'', approver1Name:'Maria Santos',  approver1Role:'sales_director',    approver2Id: '', approver2Name:'', approver2Role:'' },
  ]
  for (const a of assignments) {
    await addDoc(collection(db, 'approverAssignments'), {
      ...a, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
  }
  console.log(`  ✓ ${assignments.length} approver assignments created`)

  console.log('\n✅ Seed completed successfully!')
  console.log('\nDemo accounts:')
  DEMO_USERS.forEach(u => console.log(`  ${u.role.padEnd(20)} ${u.email} / ${u.password}`))
  process.exit(0)
}

seed().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
