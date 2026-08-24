// services/inventoryService.ts

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  runTransaction,
  onSnapshot,
} from 'firebase/firestore'

import { db } from '@/firebase/config'
import { COLLECTIONS } from '@/firebase/collections'

import type {
  RackInventory,
  FilterParams,
} from '@/types'


function ts(v: any): string {
  return v instanceof Timestamp
    ? v.toDate().toISOString()
    : String(v ?? '')
}


function mapRack(d: any): RackInventory {
  const data = d.data()

  return {
    id: d.id,
    ...data,
    lastUpdated: ts(data.lastUpdated),
    createdAt: ts(data.createdAt),
    history: data.history ?? [],
  }
}


async function nextRackNo(): Promise<string> {
  const seqRef = doc(
    db,
    COLLECTIONS.SEQUENCES,
    'racks'
  )

  let num = 1

  await runTransaction(db, async tx => {
    const snap = await tx.get(seqRef)

    if (snap.exists()) {
      num = snap.data().count + 1
    }

    tx.set(seqRef, {
      count: num,
    })
  })

  return `RCK-${String(num).padStart(4, '0')}`
}


export const inventoryService = {

  async create(
    data: Omit<
      RackInventory,
      'id' | 'rackNo' | 'createdAt' | 'lastUpdated' | 'history'
    >
  ): Promise<string> {

    const rackNo = await nextRackNo()

    const ref = await addDoc(
      collection(db, COLLECTIONS.INVENTORY),
      {
        ...data,
        rackNo,
        history: [],
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      }
    )

    return ref.id
  },


  async getAll(
    params?: FilterParams
  ): Promise<RackInventory[]> {

    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.INVENTORY),
        orderBy('createdAt', 'desc')
      )
    )

    let all = snap.docs.map(mapRack)

    if (params?.search) {
      const s = params.search.toLowerCase()

      all = all.filter(r =>
        r.rackNo.toLowerCase().includes(s) ||
        r.locationStore.toLowerCase().includes(s) ||
        r.branch.toLowerCase().includes(s)
      )
    }

    if (params?.status) {
      all = all.filter(
        r => r.status === params.status
      )
    }

    if (params?.category) {
      all = all.filter(
        r => r.rackType === params.category
      )
    }

    return all
  },


  async getById(
    id: string
  ): Promise<RackInventory | null> {

    const snap = await getDoc(
      doc(db, COLLECTIONS.INVENTORY, id)
    )

    return snap.exists()
      ? mapRack(snap)
      : null
  },


  async update(
    id: string,
    data: Partial<RackInventory>,
    historyEntry?: {
      action: string
      details: string
      userId: string
      userName: string
    }
  ): Promise<void> {

    const updates: any = {
      ...data,
      lastUpdated: serverTimestamp(),
    }

    if (historyEntry) {

      const snap = await getDoc(
        doc(db, COLLECTIONS.INVENTORY, id)
      )

      const existing =
        snap.data()?.history ?? []

      updates.history = [
        ...existing,
        {
          ...historyEntry,
          timestamp: new Date().toISOString(),
        },
      ]
    }

    await updateDoc(
      doc(db, COLLECTIONS.INVENTORY, id),
      updates
    )
  },


  async delete(
    id: string
  ): Promise<void> {

    await deleteDoc(
      doc(db, COLLECTIONS.INVENTORY, id)
    )
  },


  subscribe(
    cb: (racks: RackInventory[]) => void
  ) {

    return onSnapshot(
      query(
        collection(db, COLLECTIONS.INVENTORY),
        orderBy('createdAt', 'desc')
      ),
      snap => cb(
        snap.docs.map(mapRack)
      )
    )
  },
}