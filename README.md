# 📋 Marketing Racks Job Order Request System

> **Production-ready full-stack enterprise ERP** — Next.js 14, Firebase, Cloudinary, Recharts, jsPDF

Three fully integrated portals sharing one auth system, one database, and one approval workflow.

---

## 🚀 Quick Start

```bash
cp .env.example .env.local   # fill in Firebase + Cloudinary + SMTP values
npm install
npm run dev                   # http://localhost:3000
```

---

## 🔑 Demo Accounts

| Role | Email | Password | Portal |
|------|-------|----------|--------|
| IT Admin | admin@haier.com | admin123 | `/dashboard` |
| Sales Director | director@haier.com | pass123 | `/approver` |
| PM | pm@haier.com | pass123 | `/approver` |
| Marketing Manager | manager@haier.com | pass123 | `/approver` |
| Marketing Staff | staff@haier.com | pass123 | `/employee` |
| Technician | tech@haier.com | pass123 | `/approver` |

---

## 📁 36 Pages Across 3 Portals

### 🔧 IT Admin Portal (18 pages)
| Page | Route |
|------|-------|
| Dashboard | `/dashboard` |
| Job Orders List | `/job-orders` |
| New Job Order | `/job-orders/new` |
| Job Order Detail | `/job-orders/[id]` |
| Job Order Edit | `/job-orders/[id]/edit` |
| Request Details | `/request-details/[id]` |
| Rack Inventory | `/inventory` |
| Installations | `/installations` |
| Approvals Queue | `/approvals` |
| Approver Assignment | `/approver-assignment` |
| Users | `/users` |
| New User | `/users/new` |
| Roles & Permissions | `/roles` |
| Reports | `/reports` |
| Notifications | `/notifications` |
| Settings | `/settings` |
| System Admin | `/admin` |

### ✅ Approver Portal (9 pages)
| Page | Route |
|------|-------|
| Dashboard | `/approver/dashboard` |
| For My Approval | `/approver/for-approval` |
| Request Detail | `/approver/for-approval/[id]` |
| All Requests | `/approver/all-requests` |
| My Approvals | `/approver/my-approvals` |
| Reports | `/approver/reports` |
| Notifications | `/approver/notifications` |
| Profile | `/approver/profile` |

### 👤 Employee Portal (8 pages)
| Page | Route |
|------|-------|
| Dashboard | `/employee/dashboard` |
| My Requests | `/employee/my-requests` |
| Request Detail + Print | `/employee/my-requests/[id]` |
| Create Request (3-step) | `/employee/create-request` |
| Rack Inventory (read-only) | `/employee/inventory` |
| Notifications | `/employee/notifications` |
| Profile | `/employee/profile` |

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router + TypeScript |
| Styling | Tailwind CSS + custom CSS design system |
| Auth + DB | Firebase Auth + Firestore |
| File Uploads | Cloudinary (unsigned preset) |
| State | Zustand with subscribeWithSelector |
| Charts | Recharts (Line, Bar, Pie) |
| PDF Export | jsPDF + jsPDF-AutoTable |
| Email | Nodemailer via `/api/notify` |
| Validation | Zod |
| Toasts | Sonner |
| Icons | Lucide React |

---

## 🔐 Role Routing

```
Login → it_admin                              → /dashboard
     → sales_director | pm | marketing_manager
       | approver | technician                → /approver/dashboard
     → marketing_staff | viewer              → /employee/dashboard
```

---

## 🗄 Firestore Collections

```
users                  User profiles, roles, departments
jobOrderRequests       Job orders with inline approvers[], activityLog[], comments[]
rackInventory          Rack assets with condition tracking
installations          Technician schedules and completions
approverAssignments    Per-department/category approval config
notifications          Per-user real-time notification feed
systemSettings/main    System-wide configuration
auditLogs              Immutable action audit trail
_sequences             Auto-increment counters (MR-YYYY-NNNN)
```

---

## 📧 Email API — `/api/notify`

POST with `{ type, to, name, requestNo, title, message, link }`:

- `approval_notification` — New request awaiting approval
- `rejection_notification` — Request rejected with reason
- `completion_notification` — Request marked complete
- `new_assignment` — Technician assigned
- `password_reset` — Reset link
- `welcome` — New account credentials

---

## ☁️ Environment Variables

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=

# Email (SendGrid or any SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=
EMAIL_FROM=noreply@haier.com
EMAIL_FROM_NAME=Marketing Racks System

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🌱 Seed Demo Data

```bash
# Edit scripts/seed.ts with your Firebase config first
npx ts-node scripts/seed.ts
```

---

## 🚢 Deploy to Vercel

```bash
vercel
# Add all env vars in Vercel dashboard
```

Deploy Firestore rules + indexes:
```bash
firebase deploy --only firestore
```
