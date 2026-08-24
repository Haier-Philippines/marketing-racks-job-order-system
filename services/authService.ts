// services/authService.ts
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, updatePassword, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup, type User as FBUser,
} from 'firebase/auth'
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { auth, db } from '@/firebase/config'
import { COLLECTIONS } from '@/firebase/collections'
import type { AppUser, UserRole, Department } from '@/types'

function tsToStr(v: any): string {
  if (!v) return new Date().toISOString()
  if (v instanceof Timestamp) return v.toDate().toISOString()
  return String(v)
}

export const authService = {
  async login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await updateDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), {
      lastLogin: serverTimestamp(),
    }).catch(() => {})
    const user = await authService.getUserDoc(cred.user.uid)
    return { cred, user }
  },

  async logout() {
    return signOut(auth)
  },

  async loginGoogle() {
    const provider = new GoogleAuthProvider()
    return signInWithPopup(auth, provider)
  },

  async createUser(
    email: string, password: string, userData: Omit<AppUser, 'uid' | 'createdAt' | 'updatedAt'>
  ): Promise<AppUser> {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const user: AppUser = {
      ...userData,
      uid:       cred.user.uid,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await setDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), {
      ...user,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return user
  },

  async getUserDoc(uid: string): Promise<AppUser | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid))
    if (!snap.exists()) return null
    const d = snap.data()
    return {
      uid:         d.uid ?? uid,
      fullName:    d.fullName ?? '',
      email:       d.email ?? '',
      role:        d.role ?? 'viewer',
      department:  d.department ?? 'Others',
      phoneNumber: d.phoneNumber ?? '',
      status:      d.status ?? 'Active',
      photoURL:    d.photoURL,
      createdAt:   tsToStr(d.createdAt),
      updatedAt:   tsToStr(d.updatedAt),
      lastLogin:   d.lastLogin ? tsToStr(d.lastLogin) : undefined,
    }
  },

  async sendPasswordReset(email: string) {
    return sendPasswordResetEmail(auth, email)
  },

  onAuthStateChange(cb: (user: FBUser | null) => void) {
    return onAuthStateChanged(auth, cb)
  },
}
