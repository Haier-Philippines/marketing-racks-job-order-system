'use client'
// app/settings/page.tsx
import { useEffect, useState } from 'react'
import AppLayout from '@/components/shared/AppLayout'
import { PageHeader, Spinner } from '@/components/ui/index'
import { settingsService } from '@/services/index'
import type { SystemSettings } from '@/types'
import { Save, RefreshCw, Shield, Mail, Bell, Settings, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Tab = 'general' | 'email' | 'notifications' | 'other'

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'general',       label: 'General Settings',      icon: Settings },
  { key: 'email',         label: 'Email Settings',         icon: Mail     },
  { key: 'notifications', label: 'Notification Settings',  icon: Bell     },
  { key: 'other',         label: 'Other Settings',         icon: Shield   },
]

const TIMEZONES = ['GMT+08:00 Asia/Manila','GMT+00:00 UTC','GMT-05:00 America/New_York','GMT+01:00 Europe/London']
const DATE_FORMATS = ['MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD']
const CURRENCIES = ['PHP - Philippine Peso','USD - US Dollar','EUR - Euro']
const INTERVALS  = ['Every 12 hours','Every 24 hours','Every 48 hours','Weekly']
const FILE_TYPES = ['JPG','PNG','PDF','DOC','DOCX','XLS','XLSX']

export default function SettingsPage() {
  const [tab, setTab]         = useState<Tab>('general')
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  const load = async () => {
    setLoading(true)
    try { setSettings(await settingsService.get()) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try { await settingsService.save(settings); toast.success('Settings saved!') }
    catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const S = (k: keyof SystemSettings) => (e: any) =>
    setSettings(p => p ? { ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } : p)

  const toggleFileType = (type: string) =>
    setSettings(p => p ? {
      ...p,
      allowedFileTypes: p.allowedFileTypes.includes(type)
        ? p.allowedFileTypes.filter(t => t !== type)
        : [...p.allowedFileTypes, type]
    } : p)

  if (loading) return (
    <AppLayout allowedRoles={['it_admin']}>
      <div className="flex items-center justify-center py-20"><Spinner size={28} /></div>
    </AppLayout>
  )

  return (
    <AppLayout allowedRoles={['it_admin']}>
      <div className="max-w-4xl mx-auto space-y-5">
        <PageHeader
          title="System Settings"
          subtitle="Configure system-wide settings and preferences"
          actions={
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Spinner size={14} /> : <Save size={14} />}
              Save Changes
            </button>
          }
        />

        {/* Tab Nav */}
        <div className="flex gap-1 border-b border-slate-200">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-all',
                tab === t.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        {settings && (
          <>
            {/* General Settings */}
            {tab === 'general' && (
              <div className="grid md:grid-cols-2 gap-5">
                {/* General Info */}
                <div className="card-pad space-y-4">
                  <h2 className="sec-title">General Information</h2>
                  <div>
                    <label className="field-label">System Name</label>
                    <input value={settings.systemName} onChange={S('systemName')} className="field" />
                  </div>
                  <div>
                    <label className="field-label">Time Zone</label>
                    <select value={settings.timezone} onChange={S('timezone')} className="field">
                      {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Date Format</label>
                    <select value={settings.dateFormat} onChange={S('dateFormat')} className="field">
                      {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Currency</label>
                    <select value={settings.currency} onChange={S('currency')} className="field">
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Approval + Documents */}
                <div className="space-y-5">
                  <div className="card-pad space-y-4">
                    <h2 className="sec-title">Approval Workflow</h2>
                    <p className="text-xs text-slate-500">Default Approval Flow</p>
                    <div className="flex items-center gap-2">
                      {settings.defaultApprovalFlow.map((step, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="px-3 py-2 rounded-lg bg-brand-50 border border-brand-200 text-xs text-brand-700 font-medium text-center leading-tight">
                            {step}
                          </div>
                          {i < settings.defaultApprovalFlow.length - 1 && (
                            <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="field-label flex items-center justify-between">
                        Auto Reminders
                        <input type="checkbox" checked={settings.autoReminders} onChange={S('autoReminders')} className="w-4 h-4 accent-brand-600" />
                      </label>
                    </div>
                    {settings.autoReminders && (
                      <div>
                        <label className="field-label">Reminder Interval</label>
                        <select value={settings.reminderInterval} onChange={S('reminderInterval')} className="field">
                          {INTERVALS.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="card-pad space-y-4">
                    <h2 className="sec-title">Document Settings</h2>
                    <div>
                      <label className="field-label">Max File Upload Size (MB)</label>
                      <input type="number" value={settings.maxUploadMB} onChange={S('maxUploadMB')} min={1} max={100} className="field" />
                    </div>
                    <div>
                      <label className="field-label">Allowed File Types</label>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {FILE_TYPES.map(type => (
                          <button key={type} type="button" onClick={() => toggleFileType(type)}
                            className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                              settings.allowedFileTypes.includes(type)
                                ? 'bg-brand-600 text-white border-brand-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-400')}>
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="field-label">Retention Period (years)</label>
                      <input type="number" value={settings.retentionYears} onChange={S('retentionYears')} min={1} max={10} className="field" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Email Settings */}
            {tab === 'email' && (
              <div className="card-pad space-y-5 max-w-xl">
                <h2 className="sec-title">Email Configuration</h2>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
                  Email notifications are sent via SendGrid-compatible Nodemailer. Configure your SMTP settings in environment variables.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['SMTP Host',     'SMTP_HOST',     'smtp.sendgrid.net'],
                    ['SMTP Port',     'SMTP_PORT',     '587'],
                    ['From Name',     'EMAIL_FROM_NAME','Marketing Racks System'],
                    ['From Email',    'EMAIL_FROM',    'noreply@haier.com'],
                  ].map(([l, k, p]) => (
                    <div key={k}>
                      <label className="field-label">{l}</label>
                      <input placeholder={p} className="field" defaultValue="" />
                      <p className="text-[10px] text-slate-400 mt-0.5">Set via: {k}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="field-label">Email Triggers</p>
                  {['Approval Notification','Rejection Notification','Completion Notification','New Assignment','Password Reset','Welcome Email'].map(t => (
                    <label key={t} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 accent-brand-600" />
                      <span className="text-sm text-slate-700">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Notifications */}
            {tab === 'notifications' && (
              <div className="card-pad space-y-5 max-w-xl">
                <h2 className="sec-title">Notification Settings</h2>
                <div className="space-y-3">
                  {[
                    ['In-App Notifications',   true],
                    ['Email Notifications',    true],
                    ['Browser Push Notifications', false],
                    ['Approval Reminders',     settings.autoReminders],
                    ['Daily Summary Digest',   false],
                    ['Overdue Alert Notifications', true],
                  ].map(([label, def]) => (
                    <label key={String(label)} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <span className="text-sm font-medium text-slate-700">{label as string}</span>
                      <div className={cn('w-10 h-5 rounded-full transition-colors relative cursor-pointer', def ? 'bg-brand-600' : 'bg-slate-300')}>
                        <div className={cn('w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow', def ? 'left-5' : 'left-0.5')} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Other */}
            {tab === 'other' && (
              <div className="card-pad space-y-5 max-w-xl">
                <h2 className="sec-title">Other Settings</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Request No. Prefix</label>
                    <input value={settings.requestNoPrefix} onChange={S('requestNoPrefix')} className="field" maxLength={5} />
                    <p className="text-[10px] text-slate-400 mt-1">e.g. MR → MR-2024-0001</p>
                  </div>
                  <div>
                    <label className="field-label flex items-center justify-between">
                      Include Year in Number
                      <input type="checkbox" checked={settings.requestNoYear} onChange={S('requestNoYear')} className="w-4 h-4 accent-brand-600" />
                    </label>
                  </div>
                </div>
                <div>
                  <p className="field-label mb-2">Working Days</p>
                  <div className="flex gap-2 flex-wrap">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
                      <button key={day} type="button"
                        onClick={() => setSettings(p => p ? {
                          ...p,
                          workingDays: p.workingDays.includes(day)
                            ? p.workingDays.filter(d => d !== day)
                            : [...p.workingDays, day]
                        } : p)}
                        className={cn('w-12 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                          settings.workingDays.includes(day) ? 'bg-brand-600 text-white border-brand-600' : 'bg-slate-50 text-slate-600 border-slate-200')}>
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="field-label">Cloudinary Cloud Name</label>
                  <input value={settings.cloudinaryCloudName} onChange={S('cloudinaryCloudName')} placeholder="your-cloud-name" className="field" />
                </div>
                <div>
                  <label className="field-label">Cloudinary Upload Preset</label>
                  <input value={settings.cloudinaryPreset} onChange={S('cloudinaryPreset')} placeholder="unsigned-preset-name" className="field" />
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer Save */}
        <div className="flex justify-end pb-8">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Spinner size={14} /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
