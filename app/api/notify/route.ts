// app/api/notify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST ?? 'smtp.sendgrid.net',
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER ?? 'apikey',
    pass: process.env.SMTP_PASS ?? '',
  },
})

type EmailType =
  | 'approval_notification'
  | 'rejection_notification'
  | 'completion_notification'
  | 'new_assignment'
  | 'password_reset'
  | 'welcome'

interface EmailPayload {
  type:      EmailType
  to:        string
  name:      string
  requestNo?: string
  title?:    string
  message?:  string
  link?:     string
}

function buildEmailHTML(payload: EmailPayload): { subject: string; html: string } {
  const { type, name, requestNo, title, message, link } = payload
  const systemName = 'Marketing Racks Job Order Request System'
  const logo       = '🏢'
  const btnStyle   = 'display:inline-block;background:#1a56db;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:16px;'
  const baseStyle  = 'font-family:Inter,Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;'

  const templates: Record<EmailType, { subject: string; heading: string; body: string; btnLabel?: string }> = {
    approval_notification: {
      subject: `[${requestNo}] Action Required: Request Pending Your Approval`,
      heading: '📋 Approval Required',
      body: `<p>Hello <strong>${name}</strong>,</p><p>A new job order request is pending your approval:</p><div style="background:#f8fafc;border-left:4px solid #1a56db;padding:16px;border-radius:0 8px 8px 0;margin:16px 0"><strong>${requestNo}</strong><br/><span style="color:#64748b">${title}</span></div><p>Please review and take action at your earliest convenience.</p>`,
      btnLabel: 'Review Request',
    },
    rejection_notification: {
      subject: `[${requestNo}] Your Request Has Been Rejected`,
      heading: '❌ Request Rejected',
      body: `<p>Hello <strong>${name}</strong>,</p><p>Unfortunately, your job order request <strong>${requestNo}</strong> — <em>${title}</em> has been rejected.</p>${message ? `<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:0 8px 8px 0;margin:16px 0"><strong>Reason:</strong> ${message}</div>` : ''}<p>You may revise and resubmit the request if needed.</p>`,
      btnLabel: 'View Request',
    },
    completion_notification: {
      subject: `[${requestNo}] Your Request Has Been Completed ✅`,
      heading: '✅ Request Completed',
      body: `<p>Hello <strong>${name}</strong>,</p><p>Great news! Your job order request has been completed:</p><div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;border-radius:0 8px 8px 0;margin:16px 0"><strong>${requestNo}</strong><br/><span style="color:#64748b">${title}</span></div><p>Please check the request details for completion notes and photos.</p>`,
      btnLabel: 'View Completion Details',
    },
    new_assignment: {
      subject: `New Installation Assignment: ${requestNo}`,
      heading: '🔧 New Assignment',
      body: `<p>Hello <strong>${name}</strong>,</p><p>You have been assigned a new installation job:</p><div style="background:#f8fafc;border-left:4px solid #f59e0b;padding:16px;border-radius:0 8px 8px 0;margin:16px 0"><strong>${requestNo}</strong><br/><span style="color:#64748b">${title}</span></div>${message ? `<p><strong>Schedule:</strong> ${message}</p>` : ''}<p>Please review the details and prepare accordingly.</p>`,
      btnLabel: 'View Assignment',
    },
    password_reset: {
      subject: 'Password Reset Request',
      heading: '🔒 Reset Your Password',
      body: `<p>Hello <strong>${name}</strong>,</p><p>We received a request to reset your password for your Marketing Racks System account.</p><p>Click the button below to reset your password. This link expires in 1 hour.</p>${message ? `<p style="word-break:break-all;background:#f8fafc;padding:12px;border-radius:8px;font-size:13px">${message}</p>` : ''}`,
      btnLabel: 'Reset Password',
    },
    welcome: {
      subject: `Welcome to ${systemName}`,
      heading: '👋 Welcome Aboard!',
      body: `<p>Hello <strong>${name}</strong>,</p><p>Your account has been created for the <strong>${systemName}</strong>.</p>${message ? `<div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;font-family:monospace;font-size:13px">${message}</div>` : ''}<p>Please log in and change your password on first login.</p>`,
      btnLabel: 'Login to System',
    },
  }

  const t = templates[type]

  return {
    subject: t.subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:24px;background:#f1f5f9">
  <div style="${baseStyle}border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:#1a2035;padding:20px 28px;display:flex;align-items:center;gap:12px">
      <span style="font-size:24px">${logo}</span>
      <div>
        <p style="color:#fff;font-weight:700;font-size:15px;margin:0">${systemName}</p>
        <p style="color:rgba(255,255,255,.5);font-size:11px;margin:2px 0 0">IT Admin Notification</p>
      </div>
    </div>
    <div style="padding:28px">
      <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 20px">${t.heading}</h2>
      <div style="color:#334155;font-size:14px;line-height:1.7">${t.body}</div>
      ${link && t.btnLabel ? `<a href="${link}" style="${btnStyle}">${t.btnLabel} →</a>` : ''}
    </div>
    <div style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:12px;margin:0">This is an automated message from ${systemName}. Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as EmailPayload
    const { subject, html } = buildEmailHTML(body)

    await transporter.sendMail({
      from:    `"${process.env.EMAIL_FROM_NAME ?? 'Marketing Racks System'}" <${process.env.EMAIL_FROM ?? 'noreply@haier.com'}>`,
      to:      body.to,
      subject,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Email API]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// Helper to call from client
// NOTE: This helper is not exported from the API route itself.
async function sendEmail(payload: EmailPayload) {
  const res = await fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
}
