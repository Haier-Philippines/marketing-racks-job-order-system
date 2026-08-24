// services/approverService.ts

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore'

import { db } from '@/firebase/config'
import { COLLECTIONS } from '@/firebase/collections'
import type { ApproverAssignment } from '@/types'

function normalizeRackCategory(value: string): string {
  const clean = value.trim().toLowerCase()

  switch (clean) {
    case 'ref':
    case 'refrigerator':
    case 'freezer':
      return 'Refrigerator'
    case 'wm':
    case 'washing machine':
      return 'Washing Machine'
    case 'ac':
    case 'air conditioner':
    case 'cac':
    case 'pm cac':
      return 'Air Conditioner'
    case 'tv':
      return 'TV'
    case 'kda':
      return 'KDA'
    case 'water solution':
    case 'water solutions':
      return 'Other'
    default:
      return value.trim()
  }
}

function normalizeRackCategories(values: string[]): string[] {
  return [...new Set(values.map(normalizeRackCategory).filter(Boolean))]
}

function ts(v: unknown): string {
  if (!v) return ''
  if (v instanceof Timestamp) return v.toDate().toISOString()
  return String(v)
}

function mapAssignment(
  docSnap: QueryDocumentSnapshot<DocumentData>,
): ApproverAssignment {
  const data = docSnap.data()

  return {
    id: docSnap.id,
    department: data.department,
    rackCategory: data.rackCategory ?? 'All',
    steps: Array.isArray(data.steps) ? data.steps : [],
    createdAt: ts(data.createdAt),
    updatedAt: ts(data.updatedAt),
  }
}

function byMostRecent(a: ApproverAssignment, b: ApproverAssignment) {
  const aTime = Date.parse(a.updatedAt || a.createdAt || '') || 0
  const bTime = Date.parse(b.updatedAt || b.createdAt || '') || 0
  return bTime - aTime
}

export const approverService = {
  async getAll(): Promise<ApproverAssignment[]> {
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.APPROVER_ASSIGN),
        orderBy('department')
      )
    )

    return snap.docs.map(mapAssignment)
  },

  async getBestFor(
    department: string,
    rackCategory: string | string[],
  ): Promise<ApproverAssignment | null> {
    const all = await this.getAll()
    const requestedCategories = normalizeRackCategories(
      Array.isArray(rackCategory) ? rackCategory : [rackCategory]
    )

    const deptMatches = all.filter(
      assignment => assignment.department === department
    )

    if (deptMatches.length === 0) {
      return null
    }

    const exactMatches = deptMatches
      .filter(assignment => requestedCategories.includes(normalizeRackCategory(assignment.rackCategory)))
      .sort(byMostRecent)

    if (exactMatches.length > 0) {
      return exactMatches[0]
    }

    const fallbackMatches = deptMatches
      .filter(assignment => assignment.rackCategory === 'All')
      .sort(byMostRecent)

    if (fallbackMatches.length > 0) {
      return fallbackMatches[0]
    }

    return deptMatches.sort(byMostRecent)[0] ?? null
  },

  async create(
    data: Omit<ApproverAssignment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const ref = await addDoc(
      collection(db, COLLECTIONS.APPROVER_ASSIGN),
      {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    )

    return ref.id
  },

  async update(
    id: string,
    data: Partial<ApproverAssignment>
  ): Promise<void> {
    await updateDoc(
      doc(db, COLLECTIONS.APPROVER_ASSIGN, id),
      {
        ...data,
        updatedAt: serverTimestamp(),
      }
    )
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(
      doc(db, COLLECTIONS.APPROVER_ASSIGN, id)
    )
  },
}