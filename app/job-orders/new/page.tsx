'use client'

// app/job-orders/new/page.tsx — Admin create Job Order Request wizard

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/shared/AppLayout'
import { Spinner } from '@/components/ui/index'
import { approvalService } from '@/services/approvalService'
import { requestService } from '@/services/requestService'
import { useAuthStore } from '@/stores'
import type { RequestDetailRow, JobOrderPhoto } from '@/types'
import {
  DEPARTMENTS,
  PRODUCT_CATEGORY_OPTIONS,
  ROW_CATEGORIES,
  ROW_RACK_TYPES,
} from '@/types'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Wrench,
  Printer,
  Home,
  Pencil,
  RefreshCw,
  UploadCloud,
  X as XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const STEPS = [
  {
    label: 'Request Details',
    sub: 'Fill in the job order information',
  },
  {
    label: 'Attachments',
    sub: 'Upload required documents',
  },
  {
    label: 'Review & Submit',
    sub: 'Review and submit request',
  },
]

const TYPE_GUIDE = [
  {
    icon: Wrench,
    type: 'Installation',
    desc: 'For new rack installation.',
  },
  {
    icon: Wrench,
    type: 'Repair',
    desc: 'For damaged or defective racks.',
  },
  {
    icon: Wrench,
    type: 'Relocation',
    desc: 'For transferring existing racks.',
  },
  {
    icon: Printer,
    type: 'Graphic Change',
    desc: 'For updating rack graphics or branding.',
  },
  {
    icon: Home,
    type: 'Others',
    desc: 'For other requests not listed above.',
  },
]

const INIT_ROW = (): RequestDetailRow => ({
  id: crypto.randomUUID(),
  category: '',
  quantity: 0,
  rackType: '',
  measurement: '',
  skus: '',
  remarks: '',
})

export default function NewJobOrderPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  const [guideType, setGuideType] = useState('Installation')
  const [productCategoryOpen, setProductCategoryOpen] = useState(false)

  // ============================================================
  // STEP 1 — FORM
  // ============================================================

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    requestor: user?.fullName ?? '',
    productCategories: [] as string[],
    dealer: '',
    branchLocation: '',
    targetDate: '',
    remarks: '',
    department: user?.department ?? 'Marketing',
  })

  const [storeStatus, setStoreStatus] = useState({
    newBranch: false,
    spaceAcquiring: false,
    renovation: false,
  })

  const [salesEval, setSalesEval] = useState({
    averageMonthlySellOut: '',
    averageSellIn: '',
    forecastMonthlySellOut: '',
  })

  const [rows, setRows] = useState<RequestDetailRow[]>([
    INIT_ROW(),
    INIT_ROW(),
    INIT_ROW(),
    INIT_ROW(),
    INIT_ROW(),
  ])

  // ============================================================
  // STEP 2 — ATTACHMENTS
  // ============================================================

  const [actualPhoto, setActualPhoto] =
    useState<JobOrderPhoto | null>(null)

  const [photoPreview, setPhotoPreview] =
    useState<string | null>(null)

  const [photoUploading, setPhotoUploading] = useState(false)

  const [storePlan, setStorePlan] = useState('')
  const [recommendation, setRecommendation] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ============================================================
  // FORM HELPERS
  // ============================================================

  const F =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setForm((prev) => ({
        ...prev,
        [k]: e.target.value,
      }))
    }

  const toggleProductCategory = (category: string) => {
    setForm((prev) => {
      const exists = prev.productCategories.includes(category)

      return {
        ...prev,
        productCategories: exists
          ? prev.productCategories.filter((item) => item !== category)
          : [...prev.productCategories, category],
      }
    })
  }

  const updateRow = (
    idx: number,
    key: keyof RequestDetailRow,
    val: string | number,
  ) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === idx
          ? {
              ...row,
              [key]: val,
            }
          : row,
      ),
    )
  }

  const addRow = () => {
    setRows((prev) => [...prev, INIT_ROW()])
  }

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  // ============================================================
  // PHOTO UPLOAD
  // ============================================================

  const handlePhotoSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]

    if (!file) return

    if (!['image/png', 'image/jpg', 'image/jpeg'].includes(file.type)) {
      toast.error('Only PNG/JPG images allowed')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10 MB')
      return
    }

    setPhotoUploading(true)

    try {
      const reader = new FileReader()

      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string)
      }

      reader.readAsDataURL(file)

      const cloudName =
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

      const preset =
        process.env.NEXT_PUBLIC_CLOUDINARY_PRESET

      if (cloudName && preset) {
        const fd = new FormData()

        fd.append('file', file)
        fd.append('upload_preset', preset)
        fd.append('folder', 'marketing-racks/job-orders')

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: 'POST',
            body: fd,
          },
        )

        if (!res.ok) {
          throw new Error('Cloudinary upload failed')
        }

        const json = await res.json()

        setActualPhoto({
          url: json.secure_url,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        })
      } else {
        /*
         * Fallback when Cloudinary environment variables
         * are not configured.
         *
         * The preview will still work locally.
         */
        const localPreview = URL.createObjectURL(file)

        setPhotoPreview(localPreview)

        setActualPhoto({
          url: localPreview,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error('[NewJobOrderPage] Photo upload failed:', error)
      toast.error('Photo upload failed')
    } finally {
      setPhotoUploading(false)
    }
  }

  const removePhoto = () => {
    setActualPhoto(null)
    setPhotoPreview(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // ============================================================
  // VALIDATION
  // ============================================================

  const validateStep1 = () => {
    if (!form.date) {
      toast.error('Date is required')
      return false
    }

    if (!form.requestor.trim()) {
      toast.error('Requestor name is required')
      return false
    }

    if (!form.productCategories.length) {
      toast.error('Product category is required')
      return false
    }

    if (!form.branchLocation.trim()) {
      toast.error('Branch / Store Location is required')
      return false
    }

    if (!form.department) {
      toast.error('Department is required')
      return false
    }

    if (
      !rows.some(
        (row) =>
          row.category &&
          row.rackType &&
          row.quantity > 0,
      )
    ) {
      toast.error(
        'At least one complete Request Detail row is required',
      )

      return false
    }

    return true
  }

  const handleNext = () => {
    if (step === 1 && !validateStep1()) {
      return
    }

    setStep((current) => current + 1)
  }

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async () => {
    if (!user) {
      toast.error('User session not found')
      return
    }

    if (!validateStep1()) {
      setStep(1)
      return
    }

    setSaving(true)

    try {
      const validRows = rows.filter(
        (row) =>
          row.category &&
          row.rackType &&
          row.quantity > 0,
      )

      const id = await requestService.create({
        date: form.date,

        requestor: form.requestor,

        productCategory:
          form.productCategories.join(', '),

        productCategories:
          form.productCategories,

        dealer: form.dealer,

        branchLocation:
          form.branchLocation,

        targetDate:
          form.targetDate,

        remarks:
          form.remarks,

        department:
          form.department as any,

        storeStatus,

        salesEvaluation:
          salesEval,

        requestDetails:
          validRows,

        attachments: {
          actualPhoto:
            actualPhoto ?? undefined,

          storePlan,
          recommendation,
        },

        status: 'For Approval',

        requestedBy:
          user.uid,

        requesterEmail:
          user.email,

        priority:
          'Normal',

        contactPerson:
          user.fullName,

        contactNumber:
          user.phoneNumber,

        approvalLevel:
          0,

        approvers: [],

        comments: [],

        activityLog: [
          {
            id: crypto.randomUUID(),
            action: 'Request Created',
            userId: user.uid,
            userName: user.fullName,
            details:
              'Job order created by admin',
            timestamp:
              new Date().toISOString(),
          },
        ],
      })

      // Initialize approval workflow
      await approvalService.initializeRequestApproval(id)

      toast.success(
        'Job order created successfully!',
      )

      router.push(`/request-details/${id}`)
    } catch (err: any) {
      console.error(
        '[NewJobOrderPage] Submit failed:',
        err,
      )

      toast.error(
        err?.message ??
          'Failed to create job order',
      )
    } finally {
      setSaving(false)
    }
  }

  const validRows = rows.filter(
    (row) =>
      row.category &&
      row.rackType &&
      row.quantity > 0,
  )

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() =>
              step > 1
                ? setStep((current) => current - 1)
                : router.push('/job-orders')
            }
            className="btn-icon"
          >
            <ChevronLeft size={18} />
          </button>

          <h1 className="page-title">
            Create Job Order Request
          </h1>
        </div>

        {/* ======================================================
            STEP INDICATOR
        ====================================================== */}

        <div className="card-pad mb-5">
          <div className="flex items-center">
            {STEPS.map((item, index) => {
              const num = index + 1
              const done = step > num
              const current = step === num

              return (
                <div
                  key={item.label}
                  className="flex items-center flex-1 last:flex-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 transition-all',

                        done
                          ? 'bg-green-500 border-green-500 text-white'
                          : current
                            ? 'bg-brand-600 border-brand-600 text-white'
                            : 'border-slate-300 text-slate-400',
                      )}
                    >
                      {done ? (
                        <Check size={14} />
                      ) : (
                        num
                      )}
                    </div>

                    <div className="hidden sm:block">
                      <p
                        className={cn(
                          'text-sm font-semibold leading-tight',

                          current
                            ? 'text-brand-600'
                            : done
                              ? 'text-green-600'
                              : 'text-slate-400',
                        )}
                      >
                        {item.label}
                      </p>

                      <p className="text-[10px] text-slate-400">
                        {item.sub}
                      </p>
                    </div>
                  </div>

                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-3',
                        done
                          ? 'bg-green-400'
                          : 'bg-slate-200',
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ======================================================
            STEP 1
        ====================================================== */}

        {step === 1 && (
          <div className="grid md:grid-cols-3 gap-5">

            <div className="md:col-span-2 card-pad space-y-5">

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                  Step 1 of 3
                </span>

                <h2 className="sec-title">
                  Request Details
                </h2>
              </div>

              <p className="text-sm text-slate-500 -mt-3">
                Please fill in all the required information for this job order request.
              </p>

              {/* ==================================================
                  BASIC INFORMATION
              ================================================== */}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Pencil
                    size={13}
                    className="text-slate-400"
                  />

                  <p className="text-sm font-semibold text-slate-700">
                    Basic Information
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                  {/* Date */}
                  <div>
                    <label className="field-label">
                      Date *
                    </label>

                    <input
                      type="date"
                      value={form.date}
                      onChange={F('date')}
                      className="field"
                    />
                  </div>

                  {/* Requestor */}
                  <div>
                    <label className="field-label">
                      Requestor *
                    </label>

                    <input
                      type="text"
                      value={form.requestor}
                      onChange={F('requestor')}
                      placeholder="Enter Requestor"
                      className="field"
                    />
                  </div>

                  {/* Dealer */}
                  <div>
                    <label className="field-label">
                      Dealer
                    </label>

                    <input
                      type="text"
                      value={form.dealer}
                      onChange={F('dealer')}
                      placeholder="Enter Dealer"
                      className="field"
                    />
                  </div>

                  {/* Branch */}
                  <div>
                    <label className="field-label">
                      Branch / Store Location *
                    </label>

                    <input
                      type="text"
                      value={form.branchLocation}
                      onChange={F('branchLocation')}
                      placeholder="Enter Branch / Store Location"
                      className="field"
                    />
                  </div>

                  {/* Target Date */}
                  <div>
                    <label className="field-label">
                      Target Date
                    </label>

                    <input
                      type="date"
                      value={form.targetDate}
                      onChange={F('targetDate')}
                      className="field"
                    />
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="field-label">
                      Remarks
                    </label>

                    <input
                      type="text"
                      value={form.remarks}
                      onChange={F('remarks')}
                      placeholder="Enter Remarks"
                      className="field"
                    />
                  </div>

                  {/* Product Category */}
                  <div>
                    <label className="field-label">
                      Product Category *
                    </label>

                    <div className="field relative min-h-[42px] flex flex-wrap items-center gap-1.5 p-1.5">

                      {form.productCategories.length > 0 ? (
                        form.productCategories.map(
                          (category) => (
                            <span
                              key={category}
                              className="inline-flex items-center gap-1 rounded-full bg-brand-100 text-brand-700 px-2 py-1 text-[11px] font-semibold"
                            >
                              {category}

                              <button
                                type="button"
                                onClick={() =>
                                  toggleProductCategory(
                                    category,
                                  )
                                }
                                className="inline-flex items-center justify-center rounded-full hover:bg-brand-200 p-0.5"
                              >
                                <XIcon size={10} />
                              </button>
                            </span>
                          ),
                        )
                      ) : (
                        <span className="text-xs text-slate-400">
                          Select categories
                        </span>
                      )}

                      <div className="relative ml-auto">

                        <button
                          type="button"
                          onClick={() =>
                            setProductCategoryOpen(
                              (value) => !value,
                            )
                          }
                          className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-50"
                        >
                          {productCategoryOpen
                            ? 'Close'
                            : 'Select'}
                        </button>

                        {productCategoryOpen && (
                          <div className="absolute right-0 top-full mt-2 z-20 w-52 rounded-xl border border-slate-200 bg-white shadow-lg p-2">

                            <div className="space-y-1 max-h-52 overflow-y-auto">

                              {PRODUCT_CATEGORY_OPTIONS.map(
                                (category) => (
                                  <label
                                    key={category}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={form.productCategories.includes(
                                        category,
                                      )}
                                      onChange={() =>
                                        toggleProductCategory(
                                          category,
                                        )
                                      }
                                      className="h-4 w-4 accent-brand-600"
                                    />

                                    <span className="text-sm text-slate-700">
                                      {category}
                                    </span>
                                  </label>
                                ),
                              )}

                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* JO Number */}
                  <div>
                    <label className="field-label">
                      JO No.
                    </label>

                    <input
                      value="AUTO-GENERATED"
                      readOnly
                      className="field bg-slate-50 text-slate-400 cursor-not-allowed"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="field-label">
                      Department *
                    </label>

                    <select
                      value={form.department}
                      onChange={F('department')}
                      className="field"
                    >
                      {DEPARTMENTS.map(
                        (department) => (
                          <option
                            key={department}
                            value={department}
                          >
                            {department}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                </div>
              </div>

              {/* ==================================================
                  STORE STATUS
              ================================================== */}

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Store Status
                </p>

                <div className="flex items-center gap-5">

                  {(
                    [
                      ['newBranch', 'New Branch'],
                      [
                        'spaceAcquiring',
                        'Space Acquiring',
                      ],
                      ['renovation', 'Renovation'],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={storeStatus[key]}
                        onChange={(e) =>
                          setStoreStatus((prev) => ({
                            ...prev,
                            [key]: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 accent-blue-600"
                      />

                      <span className="text-sm text-slate-700">
                        {label}
                      </span>
                    </label>
                  ))}

                </div>
              </div>

              {/* ==================================================
                  SALES EVALUATION
              ================================================== */}

              <div>
                <div className="flex items-center gap-2 mb-3">

                  <RefreshCw
                    size={13}
                    className="text-slate-400"
                  />

                  <p className="text-sm font-semibold text-slate-700">
                    Sales Evaluation
                  </p>

                </div>

                <div className="grid grid-cols-3 gap-3">

                  {(
                    [
                      [
                        'averageMonthlySellOut',
                        'Ave. Monthly Sell-Out (Last 3 Months)',
                      ],
                      [
                        'averageSellIn',
                        'Ave. Sell-In Data (Last 3 Months)',
                      ],
                      [
                        'forecastMonthlySellOut',
                        'Forecast Avg Monthly Sell-Out',
                      ],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>

                      <label className="field-label">
                        {label}
                      </label>

                      <input
                        value={salesEval[key]}
                        onChange={(e) =>
                          setSalesEval((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        placeholder={`Enter ${label.toLowerCase()}`}
                        className="field"
                      />

                    </div>
                  ))}

                </div>
              </div>

              {/* ==================================================
                  REQUEST DETAILS TABLE
              ================================================== */}

              <div>

                <div className="flex items-center gap-2 mb-3">

                  <Pencil
                    size={13}
                    className="text-slate-400"
                  />

                  <p className="text-sm font-semibold text-slate-700">
                    Request Details
                  </p>

                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">

                  <table className="w-full text-xs">

                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold text-slate-600 w-[110px]">
                          Category *
                        </th>

                        <th className="px-2 py-2 text-left font-semibold text-slate-600 w-[75px]">
                          Quantity *
                        </th>

                        <th className="px-2 py-2 text-left font-semibold text-slate-600 w-[120px]">
                          Type of Racks *
                        </th>

                        <th className="px-2 py-2 text-left font-semibold text-slate-600">
                          Measurement
                        </th>

                        <th className="px-2 py-2 text-left font-semibold text-slate-600">
                          SKUs
                        </th>

                        <th className="px-2 py-2 text-left font-semibold text-slate-600">
                          Remarks
                        </th>

                        <th className="px-2 py-2 w-7" />
                      </tr>
                    </thead>

                    <tbody>

                      {rows.map((row, index) => (
                        <tr
                          key={row.id}
                          className="border-b border-slate-100 last:border-0"
                        >

                          <td className="px-1.5 py-1">
                            <select
                              value={row.category}
                              onChange={(e) =>
                                updateRow(
                                  index,
                                  'category',
                                  e.target.value,
                                )
                              }
                              className="field-sm w-full"
                            >
                              <option value="">
                                Select
                              </option>

                              {ROW_CATEGORIES.map(
                                (category) => (
                                  <option
                                    key={category}
                                    value={category}
                                  >
                                    {category}
                                  </option>
                                ),
                              )}
                            </select>
                          </td>

                          <td className="px-1.5 py-1">
                            <input
                              type="number"
                              min={0}
                              value={
                                row.quantity || ''
                              }
                              onChange={(e) =>
                                updateRow(
                                  index,
                                  'quantity',
                                  Number(
                                    e.target.value,
                                  ),
                                )
                              }
                              placeholder="0"
                              className="field-sm w-full text-center"
                            />
                          </td>

                          <td className="px-1.5 py-1">
                            <select
                              value={row.rackType}
                              onChange={(e) =>
                                updateRow(
                                  index,
                                  'rackType',
                                  e.target.value,
                                )
                              }
                              className="field-sm w-full"
                            >
                              <option value="">
                                Select
                              </option>

                              {ROW_RACK_TYPES.map(
                                (rackType) => (
                                  <option
                                    key={rackType}
                                    value={rackType}
                                  >
                                    {rackType}
                                  </option>
                                ),
                              )}
                            </select>
                          </td>

                          {(
                            [
                              'measurement',
                              'skus',
                              'remarks',
                            ] as const
                          ).map((key) => (
                            <td
                              key={key}
                              className="px-1.5 py-1"
                            >
                              <input
                                value={row[key]}
                                onChange={(e) =>
                                  updateRow(
                                    index,
                                    key,
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter"
                                className="field-sm w-full"
                              />
                            </td>
                          ))}

                          <td className="px-1.5 py-1 text-center">

                            {rows.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeRow(index)
                                }
                                className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}

                          </td>

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>

                <button
                  type="button"
                  onClick={addRow}
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 px-2 py-1.5 rounded-lg hover:bg-brand-50"
                >
                  <Plus size={13} />
                  Add Row
                </button>

              </div>

              {/* ==================================================
                  FOOTER
              ================================================== */}

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">

                <button
                  type="button"
                  onClick={() =>
                    router.push('/job-orders')
                  }
                  className="btn-secondary"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary flex items-center gap-2"
                >
                  Next
                  <ChevronRight size={14} />
                </button>

              </div>

            </div>

            {/* ====================================================
                GUIDE SIDEBAR
            ==================================================== */}

            <div className="card-pad h-fit sticky top-4">

              <p className="sec-title mb-3">
                Request Type Guide
              </p>

              <div className="space-y-2.5">

                {TYPE_GUIDE.map((guide) => (
                  <div
                    key={guide.type}
                    onClick={() =>
                      setGuideType(guide.type)
                    }
                    className={cn(
                      'flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border',

                      guideType === guide.type
                        ? 'border-brand-400 bg-brand-50'
                        : 'border-transparent hover:bg-slate-50',
                    )}
                  >

                    <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">

                      <guide.icon
                        size={14}
                        className="text-brand-600"
                      />

                    </div>

                    <div>

                      <p className="text-xs font-semibold text-slate-800">
                        {guide.type}
                      </p>

                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {guide.desc}
                      </p>

                    </div>

                  </div>
                ))}

              </div>

            </div>

          </div>
        )}

        {/* ========================================================
            STEP 2 — ATTACHMENTS
        ======================================================== */}

        {step === 2 && (
          <div className="grid md:grid-cols-3 gap-5">

            <div className="md:col-span-2 card-pad space-y-6">

              <div className="flex items-center gap-2">

                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                  Step 2 of 3
                </span>

                <h2 className="sec-title">
                  Attachments
                </h2>

              </div>

              <p className="text-sm text-slate-500 -mt-4">
                Upload the actual photo of the space and provide store plan details and recommendation.
              </p>

              {/* ==================================================
                  ACTUAL PHOTO
              ================================================== */}

              <div>

                <p className="text-sm font-semibold text-slate-700 mb-3">
                  Insert Actual Photo of Haier Space
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpg,image/jpeg"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />

                {actualPhoto && photoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200">

                    <img
                      src={photoPreview}
                      alt="Haier Space"
                      className="w-full h-52 object-cover"
                    />

                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center"
                    >
                      <XIcon size={14} />
                    </button>

                    <div className="px-3 py-2 bg-white border-t border-slate-100">

                      <p className="text-xs font-medium text-slate-700">
                        {actualPhoto.name}
                      </p>

                      <p className="text-[10px] text-slate-400">
                        {(
                          actualPhoto.size /
                          1024 /
                          1024
                        ).toFixed(2)}{' '}
                        MB
                      </p>

                    </div>

                  </div>
                ) : (
                  <div
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className={cn(
                      'flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors',

                      photoUploading
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-slate-200 hover:border-brand-400 hover:bg-brand-50/30',
                    )}
                  >

                    {photoUploading ? (
                      <Spinner size={28} />
                    ) : (
                      <UploadCloud
                        size={32}
                        className="text-brand-400"
                      />
                    )}

                    <div className="text-center">

                      <p className="text-sm font-medium">
                        <span className="text-brand-600 font-semibold">
                          Choose file
                        </span>

                        <span className="text-slate-500">
                          {' '}
                          or drag and drop
                        </span>
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        PNG, JPG up to 10MB
                      </p>

                    </div>

                  </div>
                )}

              </div>

              {/* ==================================================
                  STORE PLAN + RECOMMENDATION
              ================================================== */}

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="field-label uppercase tracking-wider text-[10px]">
                    Store Plan
                  </label>

                  <textarea
                    value={storePlan}
                    onChange={(e) =>
                      setStorePlan(
                        e.target.value.slice(
                          0,
                          500,
                        ),
                      )
                    }
                    rows={6}
                    placeholder="Enter store plan details..."
                    className="field"
                  />

                  <p className="text-right text-[10px] text-slate-400 mt-1">
                    {storePlan.length}/500
                  </p>

                </div>

                <div>

                  <label className="field-label uppercase tracking-wider text-[10px]">
                    Recommendation
                  </label>

                  <textarea
                    value={recommendation}
                    onChange={(e) =>
                      setRecommendation(
                        e.target.value.slice(
                          0,
                          500,
                        ),
                      )
                    }
                    rows={6}
                    placeholder="Enter recommendation..."
                    className="field"
                  />

                  <p className="text-right text-[10px] text-slate-400 mt-1">
                    {recommendation.length}/500
                  </p>

                </div>

              </div>

              {/* ==================================================
                  STEP 2 FOOTER
              ================================================== */}

              <div className="flex justify-between pt-2 border-t border-slate-100">

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ChevronLeft size={14} />
                  Back
                </button>

                <div className="flex gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      router.push('/job-orders')
                    }
                    className="btn-secondary"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn-primary flex items-center gap-2"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>

                </div>

              </div>

            </div>

            {/* GUIDE */}

            <div className="card-pad h-fit sticky top-4">

              <p className="sec-title mb-3">
                Request Type Guide
              </p>

              <div className="space-y-2.5">

                {TYPE_GUIDE.map((guide) => (
                  <div
                    key={guide.type}
                    onClick={() =>
                      setGuideType(guide.type)
                    }
                    className={cn(
                      'flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border',

                      guideType === guide.type
                        ? 'border-brand-400 bg-brand-50'
                        : 'border-transparent hover:bg-slate-50',
                    )}
                  >

                    <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">

                      <guide.icon
                        size={14}
                        className="text-brand-600"
                      />

                    </div>

                    <div>

                      <p className="text-xs font-semibold text-slate-800">
                        {guide.type}
                      </p>

                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {guide.desc}
                      </p>

                    </div>

                  </div>
                ))}

              </div>

            </div>

          </div>
        )}

        {/* ========================================================
            STEP 3 — REVIEW & SUBMIT
        ======================================================== */}

        {step === 3 && (
          <div className="grid md:grid-cols-3 gap-5">

            <div className="md:col-span-2 space-y-5">

              {/* HEADER */}

              <div className="card-pad">

                <div className="flex items-center gap-2 mb-2">

                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                    Step 3 of 3
                  </span>

                  <h2 className="sec-title">
                    Review & Submit
                  </h2>

                </div>

                <p className="text-sm text-slate-500">
                  Please review all information below before submitting your job order request.
                </p>

              </div>

              {/* ==================================================
                  BASIC INFORMATION REVIEW
              ================================================== */}

              <div className="card overflow-hidden">

                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">

                  <p className="text-sm font-semibold text-slate-700">
                    Basic Information
                  </p>

                </div>

                <div className="p-5 grid grid-cols-4 gap-3 text-sm">

                  {[
                    ['Date', form.date],
                    ['Requestor', form.requestor],
                    [
                      'Product Category',
                      form.productCategories.length
                        ? form.productCategories.join(', ')
                        : '—',
                    ],
                    ['JO No.', 'AUTO-GENERATED'],
                    ['Dealer', form.dealer || '—'],
                    [
                      'Branch / Store Location',
                      form.branchLocation,
                    ],
                    ['Target Date', form.targetDate || '—'],
                    ['Remarks', form.remarks || '—'],
                    ['Department', form.department || '—'],
                  ].map(([label, value]) => (
                    <div key={label}>

                      <p className="field-label">
                        {label}
                      </p>

                      <p className="font-medium text-slate-700 text-xs">
                        {value}
                      </p>

                    </div>
                  ))}

                  {(storeStatus.newBranch ||
                    storeStatus.spaceAcquiring ||
                    storeStatus.renovation) && (
                    <div className="col-span-4 pt-2 border-t border-slate-100">

                      <p className="field-label mb-1.5">
                        Store Status
                      </p>

                      <div className="flex gap-2">

                        {storeStatus.newBranch && (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                            New Branch
                          </span>
                        )}

                        {storeStatus.spaceAcquiring && (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                            Space Acquiring
                          </span>
                        )}

                        {storeStatus.renovation && (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                            Renovation
                          </span>
                        )}

                      </div>

                    </div>
                  )}

                </div>

              </div>

              {/* ==================================================
                  SALES EVALUATION
              ================================================== */}

              {(salesEval.averageMonthlySellOut ||
                salesEval.averageSellIn ||
                salesEval.forecastMonthlySellOut) && (
                <div className="card overflow-hidden">

                  <div className="flex items-center px-5 py-3.5 border-b border-slate-100">

                    <p className="text-sm font-semibold text-slate-700">
                      Sales Evaluation
                    </p>

                  </div>

                  <div className="p-5 grid grid-cols-3 gap-3 text-sm">

                    {[
                      [
                        'Ave. Monthly Sell-Out',
                        salesEval.averageMonthlySellOut || '—',
                      ],
                      [
                        'Ave. Sell-In Data',
                        salesEval.averageSellIn || '—',
                      ],
                      [
                        'Forecast Monthly Sell-Out',
                        salesEval.forecastMonthlySellOut || '—',
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>

                        <p className="field-label">
                          {label}
                        </p>

                        <p className="font-medium text-slate-700 text-xs">
                          {value}
                        </p>

                      </div>
                    ))}

                  </div>

                </div>
              )}

              {/* ==================================================
                  REQUEST DETAILS REVIEW
              ================================================== */}

              <div className="card overflow-hidden">

                <div className="px-5 py-3.5 border-b border-slate-100">

                  <p className="text-sm font-semibold text-slate-700">
                    Request Details
                  </p>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full text-xs">

                    <thead className="bg-slate-50">

                      <tr>

                        {[
                          '#',
                          'Category',
                          'Quantity',
                          'Type of Racks',
                          'Measurement',
                          'SKUs',
                          'Remarks',
                        ].map((header) => (
                          <th
                            key={header}
                            className="px-3 py-2.5 text-left text-slate-500 font-semibold"
                          >
                            {header}
                          </th>
                        ))}

                      </tr>

                    </thead>

                    <tbody>

                      {validRows.map(
                        (row, index) => (
                          <tr
                            key={row.id}
                            className="border-t border-slate-100"
                          >

                            <td className="px-3 py-2 text-slate-400">
                              {index + 1}
                            </td>

                            <td className="px-3 py-2 font-medium text-slate-700">
                              {row.category}
                            </td>

                            <td className="px-3 py-2 text-slate-600">
                              {row.quantity}
                            </td>

                            <td className="px-3 py-2 text-slate-600">
                              {row.rackType}
                            </td>

                            <td className="px-3 py-2 text-slate-500">
                              {row.measurement || '—'}
                            </td>

                            <td className="px-3 py-2 text-slate-500">
                              {row.skus || '—'}
                            </td>

                            <td className="px-3 py-2 text-slate-500">
                              {row.remarks || '—'}
                            </td>

                          </tr>
                        ),
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

              {/* ==================================================
                  ATTACHMENTS REVIEW
              ================================================== */}

              <div className="card overflow-hidden">

                <div className="px-5 py-3.5 border-b border-slate-100">

                  <p className="text-sm font-semibold text-slate-700">
                    Attachments
                  </p>

                </div>

                <div className="p-5 grid grid-cols-3 gap-4">

                  {/* PHOTO */}

                  <div>

                    <p className="field-label mb-2">
                      Actual Photo of Haier Space
                    </p>

                    {photoPreview ? (
                      <div className="rounded-xl overflow-hidden border border-slate-200">

                        <img
                          src={photoPreview}
                          alt="Space"
                          className="w-full h-28 object-cover"
                        />

                        <div className="flex items-center gap-1 px-2 py-1 bg-white">

                          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">

                            <Check
                              size={10}
                              className="text-white"
                            />

                          </div>

                          <p className="text-[10px] text-slate-600 truncate">
                            {actualPhoto?.name}
                          </p>

                        </div>

                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        No photo uploaded
                      </p>
                    )}

                  </div>

                  {/* STORE PLAN */}

                  <div>

                    <p className="field-label mb-2">
                      Store Plan
                    </p>

                    {storePlan ? (
                      <div className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50">

                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">

                          <Check
                            size={10}
                            className="text-white"
                          />

                        </div>

                        <p className="text-xs text-slate-600 line-clamp-4">
                          {storePlan}
                        </p>

                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        —
                      </p>
                    )}

                  </div>

                  {/* RECOMMENDATION */}

                  <div>

                    <p className="field-label mb-2">
                      Recommendation
                    </p>

                    {recommendation ? (
                      <div className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50">

                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">

                          <Check
                            size={10}
                            className="text-white"
                          />

                        </div>

                        <p className="text-xs text-slate-600 line-clamp-4">
                          {recommendation}
                        </p>

                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        —
                      </p>
                    )}

                  </div>

                </div>

              </div>

              {/* ==================================================
                  FINAL BUTTONS
              ================================================== */}

              <div className="flex justify-between gap-3">

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ChevronLeft size={14} />
                  Back
                </button>

                <div className="flex gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      router.push('/job-orders')
                    }
                    className="btn-secondary"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2 min-w-[160px] justify-center"
                  >

                    {saving ? (
                      <>
                        <Spinner size={14} />
                        Creating…
                      </>
                    ) : (
                      'Create Job Order'
                    )}

                  </button>

                </div>

              </div>

            </div>

            {/* ====================================================
                GUIDE SIDEBAR
            ==================================================== */}

            <div className="card-pad h-fit sticky top-4">

              <p className="sec-title mb-3">
                Request Type Guide
              </p>

              <div className="space-y-2.5">

                {TYPE_GUIDE.map((guide) => (
                  <div
                    key={guide.type}
                    className={cn(
                      'flex items-start gap-2.5 p-2.5 rounded-xl border',

                      guideType === guide.type
                        ? 'border-brand-400 bg-brand-50'
                        : 'border-transparent bg-slate-50',
                    )}
                  >

                    <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">

                      <guide.icon
                        size={14}
                        className="text-brand-600"
                      />

                    </div>

                    <div>

                      <p className="text-xs font-semibold text-slate-800">
                        {guide.type}
                      </p>

                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {guide.desc}
                      </p>

                    </div>

                  </div>
                ))}

              </div>

            </div>

          </div>
        )}

      </div>
    </AppLayout>
  )
}