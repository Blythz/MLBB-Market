"use client"

import * as React from "react"
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, getFirestore, getDocs } from "firebase/firestore"
import { ensureFirebaseApp, firebaseEnabled } from "@/lib/firebase"
import { useAuth } from "@/components/auth-provider"

export type WishlistItem = {
  id: string
  title: string
  price: number
  imageUrl?: string
  sellerId?: string
  updatedAt?: any
}

const LOCAL_KEY = "mlbb_wishlist_v1"

export function useWishlist() {
  const { user } = useAuth()
  const [items, setItems] = React.useState<WishlistItem[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!firebaseEnabled || !user) {
      try {
        const raw = localStorage.getItem(LOCAL_KEY)
        setItems(raw ? (JSON.parse(raw) as WishlistItem[]) : [])
      } catch {
        setItems([])
      }
      setLoading(false)
      const onStorage = (e: StorageEvent) => {
        if (e.key === LOCAL_KEY) {
          try {
            setItems(e.newValue ? (JSON.parse(e.newValue) as WishlistItem[]) : [])
          } catch {}
        }
      }
      window.addEventListener("storage", onStorage)
      return () => window.removeEventListener("storage", onStorage)
    }

    const db = getFirestore(ensureFirebaseApp())
    const ref = collection(db, "users", user.uid, "wishlist")
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WishlistItem, "id">) })) as WishlistItem[]
        arr.sort((a: any, b: any) => (b?.updatedAt?.toMillis?.() ?? 0) - (a?.updatedAt?.toMillis?.() ?? 0))
        setItems(arr)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [user])

  const persistLocal = (next: WishlistItem[]) => {
    setItems(next)
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
    } catch {}
  }

  const add = async (item: WishlistItem) => {
    if (firebaseEnabled && user) {
      const db = getFirestore(ensureFirebaseApp())
      await setDoc(doc(db, "users", user.uid, "wishlist", item.id), {
        title: item.title,
        price: item.price,
        imageUrl: item.imageUrl || "",
        sellerId: item.sellerId || "",
        updatedAt: serverTimestamp(),
      })
      return
    }
    const exists = items.some((i) => i.id === item.id)
    if (exists) return
    persistLocal([{ ...item, updatedAt: Date.now() }, ...items])
  }

  const remove = async (id: string) => {
    if (firebaseEnabled && user) {
      const db = getFirestore(ensureFirebaseApp())
      await deleteDoc(doc(db, "users", user.uid, "wishlist", id))
      return
    }
    persistLocal(items.filter((i) => i.id !== id))
  }

  const clear = async () => {
    if (firebaseEnabled && user) {
      // Optimistic local clear
      setItems([])
      try {
        const db = getFirestore(ensureFirebaseApp())
        const ref = collection(db, "users", user.uid, "wishlist")
        const snap = await getDocs(ref)
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
      } catch {
        // ignore, snapshot will re-sync
      }
      return
    }
    persistLocal([])
  }

  const has = (id: string) => items.some((i) => i.id === id)
  const count = items.length

  return { items, count, loading, add, remove, clear, has }
}


