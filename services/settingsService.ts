// services/settingsService.ts

import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore'

import { db } from '@/firebase/config'
import { COLLECTIONS } from '@/firebase/collections'

import type { SystemSettings } from '@/types'


const SETTINGS_DOC = 'main'


const DEFAULT_SETTINGS: SystemSettings = {
  systemName:
    'Marketing Racks Job Order Request System',

  timezone:
    'GMT+08:00 Asia/Manila',

  dateFormat:
    'MM/DD/YYYY',

  currency:
    'PHP - Philippine Peso',

  maxUploadMB:
    10,

  allowedFileTypes: [
    'JPG',
    'PNG',
    'PDF',
    'DOC',
    'DOCX',
  ],

  retentionYears:
    3,

  autoReminders:
    true,

  reminderInterval:
    'Every 24 hours',

  defaultApprovalFlow: [
    'Sales Director (Local/Expert)',
    'Marketing Manager',
  ],

  cloudinaryCloudName:
    '',

  cloudinaryPreset:
    '',

  workingDays: [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
  ],

  requestNoPrefix:
    'MR',

  requestNoYear:
    true,
}


export const settingsService = {

  async get(): Promise<SystemSettings> {

    const snap = await getDoc(
      doc(
        db,
        COLLECTIONS.SETTINGS,
        SETTINGS_DOC
      )
    )

    if (!snap.exists()) {
      return DEFAULT_SETTINGS
    }

    return {
      ...DEFAULT_SETTINGS,
      ...snap.data(),
    } as SystemSettings
  },


  async save(
    data: Partial<SystemSettings>
  ): Promise<void> {

    await setDoc(
      doc(
        db,
        COLLECTIONS.SETTINGS,
        SETTINGS_DOC
      ),
      {
        ...DEFAULT_SETTINGS,
        ...data,
      },
      {
        merge: true,
      }
    )
  },
}