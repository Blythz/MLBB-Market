"use client"

import type React from "react"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { doc, getDoc, onSnapshot, type Unsubscribe } from "firebase/firestore"
import {
  ensureFirebaseApp,
  firebaseEnabled,
  getFirebaseAuth,
  getFirebaseDb,
  seedOrUpdateUserProfile,
  signOutFirebase,
} from "@/lib/firebase"
import type { UserProfile } from "@/types/user"

type AuthContextShape = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextShape>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!firebaseEnabled) {
      setLoading(false)
      return
    }
    ensureFirebaseApp()
    const auth = getFirebaseAuth()
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        // Seed or update profile with displayName/photoURL for avatars
        await seedOrUpdateUserProfile({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
        })
        // Subscribe to user doc for real-time role/status/avatar changes
        const db = getFirebaseDb()
        const ref = doc(db, "users", u.uid)
        let unsubUser: Unsubscribe | null = null
        unsubUser = onSnapshot(ref, (snap) => {
          const data = snap.data() as UserProfile | undefined
          if (data) setProfile({ ...data, uid: u.uid })
          setLoading(false)
        })
        return () => {
          unsubUser?.()
        }
      } else {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => unsub()
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signOut: signOutFirebase,
      refreshProfile: async () => {
        if (!user || !firebaseEnabled) return
        const db = getFirebaseDb()
        const ref = doc(db, "users", user.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) setProfile(snap.data() as UserProfile)
      },
    }),
    [user, profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
