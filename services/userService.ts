// services/userService.ts

import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'

import { db } from '@/firebase/config'
import { COLLECTIONS } from '@/firebase/collections'

import type { AppUser } from '@/types'


function ts(v: any): string {
  return v instanceof Timestamp
    ? v.toDate().toISOString()
    : String(v ?? '')
}


export const userService = {

  async getAll(): Promise<AppUser[]> {

    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.USERS),
        orderBy('fullName')
      )
    )

    return snap.docs.map(d => {

      const data = d.data()

      return {
        uid: d.id,
        ...data,
        createdAt: ts(data.createdAt),
        updatedAt: ts(data.updatedAt),
      } as AppUser
    })
  },


  async getById(
    uid: string
  ): Promise<AppUser | null> {

    const snap = await getDoc(
      doc(db, COLLECTIONS.USERS, uid)
    )

    if (!snap.exists()) {
      return null
    }

    const data = snap.data()

    return {
      uid: snap.id,
      ...data,
      createdAt: ts(data.createdAt),
      updatedAt: ts(data.updatedAt),
    } as AppUser
  },


  async update(
    uid: string,
    data: Partial<AppUser>
  ): Promise<void> {

    await updateDoc(
      doc(db, COLLECTIONS.USERS, uid),
      {
        ...data,
        updatedAt: serverTimestamp(),
      }
    )
  },


  async delete(
    uid: string
  ): Promise<void> {

    await deleteDoc(
      doc(db, COLLECTIONS.USERS, uid)
    )
  },


  async getTechnicians(): Promise<AppUser[]> {

    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.USERS),
        where('role', '==', 'technician'),
        where('status', '==', 'Active')
      )
    )

    return snap.docs.map(d => {

      const data = d.data()

      return {
        uid: d.id,
        ...data,
        createdAt: ts(data.createdAt),
        updatedAt: ts(data.updatedAt),
      } as AppUser
    })
  },
}