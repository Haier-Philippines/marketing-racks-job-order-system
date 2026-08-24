// services/reportService.ts
import { requestService } from './requestService'
import { inventoryService } from './index'
import { userService } from './index'
import type { JobOrderRequest } from '@/types'
import dayjs from 'dayjs'

export interface ReportFilters {
  dateRange?:  'this_month' | 'last_month' | 'last_3' | 'last_6' | 'this_year' | 'all'
  department?: string
  requestType?:string
  status?:     string
}

function filterByDate(reqs: JobOrderRequest[], range: string): JobOrderRequest[] {
  const now = dayjs()
  switch (range) {
    case 'this_month':  return reqs.filter(r => dayjs(r.createdAt).isSame(now, 'month'))
    case 'last_month':  return reqs.filter(r => dayjs(r.createdAt).isSame(now.subtract(1,'month'),'month'))
    case 'last_3':      return reqs.filter(r => dayjs(r.createdAt).isAfter(now.subtract(3,'month')))
    case 'last_6':      return reqs.filter(r => dayjs(r.createdAt).isAfter(now.subtract(6,'month')))
    case 'this_year':   return reqs.filter(r => dayjs(r.createdAt).isSame(now,'year'))
    default:            return reqs
  }
}

export const reportService = {
  async generateSummary(filters: ReportFilters = {}) {
    const allReqs = await requestService.getAll()

    let reqs = allReqs
    if (filters.dateRange)   reqs = filterByDate(reqs, filters.dateRange)
    if (filters.department)  reqs = reqs.filter(r => r.department === filters.department)
    if (filters.requestType) reqs = reqs.filter(r => r.productCategory === filters.requestType)
    if (filters.status)      reqs = reqs.filter(r => r.status === filters.status)

    const now   = dayjs()
    const total = reqs.length
    const statusBreakdown = (['For Approval','In Progress','Completed','Rejected','Cancelled','Returned'] as const)
      .map(s => ({
        status: s,
        count:  reqs.filter(r => r.status === s).length,
        pct:    total > 0 ? Math.round(reqs.filter(r => r.status === s).length / total * 100) : 0,
      }))

    // Monthly trend (6 months)
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const m    = now.subtract(5 - i, 'month')
      const mReqs = allReqs.filter(r => dayjs(r.createdAt).isSame(m, 'month'))
      return {
        month:     m.format('MMM YYYY'),
        shortLabel:m.format('MMM'),
        total:     mReqs.length,
        completed: mReqs.filter(r => r.status === 'Completed').length,
        rejected:  mReqs.filter(r => r.status === 'Rejected').length,
        inProgress:mReqs.filter(r => r.status === 'In Progress').length,
      }
    })

    // By department
    const deptMap: Record<string,number> = {}
    reqs.forEach(r => { deptMap[r.department] = (deptMap[r.department] ?? 0) + 1 })
    const byDepartment = Object.entries(deptMap)
      .map(([dept, count]) => ({ dept, count, pct: total > 0 ? Math.round(count / total * 100) : 0 }))
      .sort((a,b) => b.count - a.count)

    // By product category
    const typeMap: Record<string,number> = {}
    reqs.forEach(r => { typeMap[r.productCategory ?? 'Other'] = (typeMap[r.productCategory ?? 'Other'] ?? 0) + 1 })
    const byType = Object.entries(typeMap)
      .map(([type, count]) => ({ type, count, pct: total > 0 ? Math.round(count / total * 100) : 0 }))
      .sort((a,b) => b.count - a.count)

    // Avg approval time (days)
    const approvedReqs = reqs.filter(r => r.status === 'Completed' && r.activityLog.length >= 2)
    const avgApprovalDays = approvedReqs.length > 0
      ? approvedReqs.reduce((sum, r) => {
          const first = dayjs(r.activityLog[0]?.timestamp)
          const last  = dayjs(r.activityLog[r.activityLog.length - 1]?.timestamp)
          return sum + last.diff(first, 'day')
        }, 0) / approvedReqs.length
      : 0

    const completionRate = total > 0
      ? Math.round(reqs.filter(r => r.status === 'Completed').length / total * 100)
      : 0

    return {
      total,
      byStatus: statusBreakdown,
      monthlyTrend,
      byDepartment,
      byType,
      avgApprovalDays: Math.round(avgApprovalDays * 10) / 10,
      completionRate,
      reqs,
    }
  },

  async getInventorySummary() {
    const racks = await inventoryService.getAll()
    const total = racks.length
    return {
      total,
      available:   racks.filter(r => r.status === 'Available').length,
      inUse:       racks.filter(r => r.status === 'In Use').length,
      maintenance: racks.filter(r => r.status === 'Maintenance').length,
      damaged:     racks.filter(r => r.status === 'Damaged').length,
      good:        racks.filter(r => r.condition === 'Good').length,
      fair:        racks.filter(r => r.condition === 'Fair').length,
      poor:        racks.filter(r => r.condition === 'Poor').length,
    }
  },

  async getUserSummary() {
    const users = await userService.getAll()
    const roleMap: Record<string,number> = {}
    users.forEach(u => { roleMap[u.role] = (roleMap[u.role] ?? 0) + 1 })
    return {
      total:    users.length,
      active:   users.filter(u => u.status === 'Active').length,
      inactive: users.filter(u => u.status === 'Inactive').length,
      byRole:   Object.entries(roleMap).map(([role, count]) => ({ role, count })),
    }
  },
}
