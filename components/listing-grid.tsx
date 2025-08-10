"use client"

import { useEffect, useMemo, useState } from "react"
import ListingCard from "@/components/listing-card"
import type { Listing } from "@/types/listing"
import { ensureFirebaseApp, firebaseEnabled } from "@/lib/firebase"
import { doc, getDoc, getFirestore } from "firebase/firestore"

type Props = {
  listings: Listing[]
  loading?: boolean
}

type SellerInfo = {
  fullName?: string
  photoURL?: string
  sellerStatus?: string
}

export default function ListingGrid({ listings, loading = false }: Props) {
  const [sellers, setSellers] = useState<Record<string, SellerInfo>>({})

  const ids = useMemo(() => Array.from(new Set(listings.map((l) => l.userId).filter(Boolean))), [listings])

  useEffect(() => {
    if (!firebaseEnabled || ids.length === 0) {
      // Demo data for non-Firebase mode
      const demoSellers: Record<string, SellerInfo> = {}
      ids.forEach((id) => {
        demoSellers[id] = {
          fullName: "Demo Seller",
          photoURL: "",
          sellerStatus: "approved",
        }
      })
      setSellers(demoSellers)
      return
    }

    let cancelled = false
    const run = async () => {
      const db = getFirestore(ensureFirebaseApp())
      const out: Record<string, SellerInfo> = {}
      for (const id of ids) {
        try {
          const snap = await getDoc(doc(db, "users", id))
          const data = snap.data() as any
          out[id] = {
            fullName: data?.fullName || data?.displayName || data?.email || "Seller",
            photoURL: data?.photoURL || "",
            sellerStatus: data?.sellerStatus || "not_applied",
          }
        } catch {
          // ignore and leave default
        }
      }
      if (!cancelled) setSellers(out)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [ids])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex h-full flex-col overflow-hidden rounded-xl border border-neutral-800/50 bg-neutral-900/50"
          >
            <div className="aspect-[2/3] w-full animate-pulse bg-neutral-800" />
            <div className="p-4 space-y-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-800" />
              <div className="h-3 w-full animate-pulse rounded bg-neutral-800" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-800" />
              <div className="flex items-center gap-2 pt-2">
                <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-800" />
                <div className="h-3 w-16 animate-pulse rounded bg-neutral-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!listings.length) {
    return (
      <div className="grid place-items-center rounded-xl border border-neutral-800 bg-neutral-950/60 p-10 text-sm text-neutral-400">
        No listings yet. Be the first to post.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {listings.map((l) => {
        const seller = sellers[l.userId] || {}
        const primaryImage = Array.isArray(l.imageUrls) && l.imageUrls.length ? l.imageUrls[0] : undefined
        const isVerified = seller.sellerStatus === "approved"

        return (
          <ListingCard
            key={l.id}
            id={l.id}
            title={l.title}
            description={l.description}
            price={l.price}
            imageUrl={primaryImage}
            sellerId={l.userId}
            sellerName={seller.fullName}
            sellerAvatar={seller.photoURL}
            isVerifiedSeller={isVerified}
          />
        )
      })}
    </div>
  )
}
