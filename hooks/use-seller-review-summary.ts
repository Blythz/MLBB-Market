"use client"

import { useEffect, useState } from "react"
import { collection, query, where, onSnapshot, getFirestore } from "firebase/firestore"
import { ensureFirebaseApp, firebaseEnabled } from "@/lib/firebase"

type ReviewSummary = {
  avg: number
  count: number
}

const cache = new Map<string, ReviewSummary>()

export function useSellerReviewSummary(sellerId?: string): ReviewSummary {
  const [summary, setSummary] = useState<ReviewSummary>({ avg: 0, count: 0 })

  useEffect(() => {
    if (!sellerId || !firebaseEnabled) {
      // Demo data for non-Firebase mode
      setSummary({ avg: 4.8, count: Math.floor(Math.random() * 50) + 5 })
      return
    }

    if (cache.has(sellerId)) {
      setSummary(cache.get(sellerId)!)
      return
    }

    const app = ensureFirebaseApp()
    const db = getFirestore(app)
    const q = query(collection(db, "reviews"), where("sellerId", "==", sellerId))

    const unsub = onSnapshot(q, (snap) => {
      const reviews = snap.docs.map((d) => d.data())
      const count = reviews.length
      const avg = count > 0 ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / count : 0

      const result = { avg: Math.round(avg * 10) / 10, count }
      cache.set(sellerId, result)
      setSummary(result)
    })

    return () => unsub()
  }, [sellerId])

  return summary
}
