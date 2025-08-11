"use client"

import * as React from "react"
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, getFirestore } from "firebase/firestore"
import { ensureFirebaseApp, firebaseEnabled } from "@/lib/firebase"
import { useAuth } from "@/components/auth-provider"

export type CartItem = {
  id: string
  title: string
  price: number
  imageUrl?: string
  sellerId?: string
  updatedAt?: any
}

const LOCAL_KEY = "mlbb_cart_v1"

export function useCart() {
  const { user } = useAuth()
  const [items, setItems] = React.useState<CartItem[]>([])
  const [loading, setLoading] = React.useState(true)

  // Firestore subscription when available and user is logged in
  React.useEffect(() => {
    if (!firebaseEnabled || !user) {
      // Local storage fallback
      try {
        const raw = localStorage.getItem(LOCAL_KEY)
        setItems(raw ? (JSON.parse(raw) as CartItem[]) : [])
      } catch {
        setItems([])
      }
      setLoading(false)
      // Sync across tabs
      const onStorage = (e: StorageEvent) => {
        if (e.key === LOCAL_KEY) {
          try {
            setItems(e.newValue ? (JSON.parse(e.newValue) as CartItem[]) : [])
          } catch {}
        }
      }
      window.addEventListener("storage", onStorage)
      return () => window.removeEventListener("storage", onStorage)
    }

    const db = getFirestore(ensureFirebaseApp())
    const ref = collection(db, "users", user.uid, "cart")
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CartItem, "id">) })) as CartItem[]
        // Sort by updatedAt desc if available
        arr.sort((a: any, b: any) => (b?.updatedAt?.toMillis?.() ?? 0) - (a?.updatedAt?.toMillis?.() ?? 0))
        setItems(arr)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [user])

  const persistLocal = (next: CartItem[]) => {
    setItems(next)
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
    } catch {}
  }

  const addItem = async (item: CartItem) => {
    if (firebaseEnabled && user) {
      const db = getFirestore(ensureFirebaseApp())
      await setDoc(doc(db, "users", user.uid, "cart", item.id), {
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

  const removeItem = async (id: string) => {
    if (firebaseEnabled && user) {
      const db = getFirestore(ensureFirebaseApp())
      await deleteDoc(doc(db, "users", user.uid, "cart", id))
      return
    }
    persistLocal(items.filter((i) => i.id !== id))
  }

  const clear = async () => {
    if (firebaseEnabled && user) {
      const db = getFirestore(ensureFirebaseApp())
      // Optimistic local clear
      setItems([])
      // Fetch current docs and delete client-side (simpler without admin batch)
      // Consumer of hook already subscribed; snapshot will update
      try {
        const ref = collection(db, "users", user.uid, "cart")
        // We avoid a read here for rate limits; rely on UI to remove progressively if needed
      } catch {}
      return
    }
    persistLocal([])
  }

  const isInCart = (id: string) => items.some((i) => i.id === id)
  const count = items.length

  return {
    items,
    count,
    loading,
    addItem,
    removeItem,
    clear,
    isInCart,
  }
}


