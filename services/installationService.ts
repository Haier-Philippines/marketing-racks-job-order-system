// services/installationService.ts

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  runTransaction,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore'

import { db } from '@/firebase/config'
import { COLLECTIONS } from '@/firebase/collections'

import type {
  Installation,
  FilterParams,
} from '@/types'


function ts(v: any): string {
  return v instanceof Timestamp
    ? v.toDate().toISOString()
    : String(v ?? '')
}


async function nextInstallNo(): Promise<string> {
  const seqRef = doc(
    db,
    COLLECTIONS.SEQUENCES,
    'installations'
  )

  const year = new Date().getFullYear()

  let num = 1

  await runTransaction(db, async tx => {
    const snap = await tx.get(seqRef)

    if (
      snap.exists() &&
      snap.data().year === year
    ) {
      num = snap.data().count + 1
    }

    tx.set(seqRef, {
      year,
      count: num,
    })
  })

  return `INS-${year}-${String(num).padStart(4, '0')}`
}


export const installationService = {

  async create(
    data: Omit<
      Installation,
      'id' | 'installationId' | 'createdAt' | 'updatedAt'
    >
  ): Promise<string> {

    const installationId =
      await nextInstallNo()

    const ref = await addDoc(
      collection(
        db,
        COLLECTIONS.INSTALLATIONS
      ),
      {
        ...data,
        installationId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    )

    return ref.id
  },


  async getAll(
    params?: FilterParams
  ): Promise<Installation[]> {

    const snap = await getDocs(
      query(
        collection(
          db,
          COLLECTIONS.INSTALLATIONS
        ),
        orderBy('createdAt', 'desc')
      )
    )

    let all = snap.docs.map(d => {

      const data = d.data()

      return {
        id: d.id,
        ...data,
        createdAt: ts(data.createdAt),
        updatedAt: ts(data.updatedAt),
        completionPhotos:
          data.completionPhotos ?? [],
      } as Installation
    })


    if (params?.search) {

      const s =
        params.search.toLowerCase()

      all = all.filter(i =>
        i.installationId
          .toLowerCase()
          .includes(s) ||

        i.requestNo
          .toLowerCase()
          .includes(s) ||

        i.technicianName
          .toLowerCase()
          .includes(s)
      )
    }


    if (params?.status) {
      all = all.filter(
        i => i.status === params.status
      )
    }


    return all
  },


  async update(
    id: string,
    data: Partial<Installation>
  ): Promise<void> {

    await updateDoc(
      doc(
        db,
        COLLECTIONS.INSTALLATIONS,
        id
      ),
      {
        ...data,
        updatedAt: serverTimestamp(),
      }
    )
  },


  subscribe(
    cb: (items: Installation[]) => void
  ) {

    return onSnapshot(
      query(
        collection(
          db,
          COLLECTIONS.INSTALLATIONS
        ),
        orderBy('createdAt', 'desc')
      ),
      snap =>
        cb(
          snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            createdAt:
              ts(d.data().createdAt),
            updatedAt:
              ts(d.data().updatedAt),
            completionPhotos:
              d.data().completionPhotos ?? [],
          } as Installation))
        )
    )
  },
}