"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { doc, getDoc, collection, query, where, onSnapshot, getFirestore } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ensureFirebaseApp, firebaseEnabled } from "@/lib/firebase"
import { useAuth } from "@/components/auth-provider"
import type { UserProfile } from "@/types/user"
import type { Listing } from "@/types/listing"
import ListingGrid from "@/components/listing-grid"
import ReviewStars from "@/components/reviews/review-stars"
import ReviewDialog from "@/components/reviews/review-dialog"
import { useSellerReviewSummary } from "@/hooks/use-seller-review-summary"
import { Star, MessageCircle, Shield } from "lucide-react"

function initials(name?: string) {
  if (!name) return "ML"
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "ML"
}

export default function SellerPage() {
  const params = useParams()
  const uid = params.uid as string
  const { user } = useAuth()

  const [seller, setSeller] = useState<UserProfile | null>(null)
  const [activeListings, setActiveListings] = useState<Listing[]>([])
  const [soldListings, setSoldListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [canReview, setCanReview] = useState(false)

  const { avg, count } = useSellerReviewSummary(uid)

  useEffect(() => {
    if (!firebaseEnabled) {
      // Demo data
      setSeller({
        uid: "demo-seller",
        fullName: "Demo Seller",
        email: "demo@example.com",
        role: "seller",
        sellerStatus: "approved",
        photoURL: "",
      } as UserProfile)
      setActiveListings([])
      setSoldListings([])
      setLoading(false)
      return
    }

    const app = ensureFirebaseApp()
    const db = getFirestore(app)

    // Fetch seller profile
    const fetchSeller = async () => {
      try {
        const snap = await getDoc(doc(db, "users", uid))
        if (snap.exists()) {
          setSeller(snap.data() as UserProfile)
        }
      } catch (error) {
        console.error("Failed to fetch seller:", error)
      }
    }

    // Listen to seller's listings
    const listingsQuery = query(collection(db, "listings"), where("userId", "==", uid))
    const unsubListings = onSnapshot(listingsQuery, (snap) => {
      const listings = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Listing)
      setActiveListings(listings.filter((l) => l.status !== "sold"))
      setSoldListings(listings.filter((l) => l.status === "sold"))
      setLoading(false)
    })

    // Check if current user can review this seller
    const checkCanReview = async () => {
      if (!user) return
      try {
        const conversationsQuery = query(
          collection(db, "conversations"),
          where("sellerId", "==", uid),
          where("buyerId", "==", user.uid),
        )
        const snap = await getDoc(doc(db, "conversations", `${uid}_${user.uid}`))
        setCanReview(snap.exists())
      } catch (error) {
        console.error("Failed to check review eligibility:", error)
      }
    }

    fetchSeller()
    checkCanReview()

    return () => {
      unsubListings()
    }
  }, [uid, user])

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 animate-pulse rounded-full bg-neutral-800" />
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-neutral-800" />
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-800" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-neutral-800" />
          ))}
        </div>
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-neutral-300">Seller not found</h1>
      </div>
    )
  }

  const isVerified = seller.sellerStatus === "approved"

  return (
    <div className="space-y-8">
      {/* Seller Profile Header */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-4 ring-neutral-700">
                <AvatarImage
                  src={seller.photoURL || "/placeholder.svg?height=96&width=96&query=avatar"}
                  alt={seller.fullName + " avatar"}
                />
                <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-white text-2xl font-bold">
                  {initials(seller.fullName)}
                </AvatarFallback>
              </Avatar>
              {isVerified && (
                <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-emerald-500 border-4 border-neutral-900 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
                    {seller.fullName || seller.email}
                  </h1>
                  {isVerified && (
                    <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified Seller
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <ReviewStars rating={avg} count={count} size={16} />
                  <span className="text-neutral-400">•</span>
                  <span className="text-neutral-400">
                    {activeListings.length} active listing{activeListings.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {user && user.uid !== uid && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 bg-transparent"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Seller
                  </Button>
                  {canReview && (
                    <Button
                      onClick={() => setReviewDialogOpen(true)}
                      className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Write Review
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Listings */}
      {activeListings.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-neutral-200">Active Listings ({activeListings.length})</h2>
          </div>
          <ListingGrid listings={activeListings} />
        </section>
      )}

      {/* Sold Listings */}
      {soldListings.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-neutral-200">Sold Listings ({soldListings.length})</h2>
          </div>
          <ListingGrid listings={soldListings} />
        </section>
      )}

      {activeListings.length === 0 && soldListings.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <div className="text-6xl opacity-20">🎮</div>
          <h3 className="text-xl font-semibold text-neutral-300">No listings yet</h3>
          <p className="text-neutral-400">This seller hasn't posted any accounts yet.</p>
        </div>
      )}

      <ReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        sellerId={uid}
        sellerName={seller.fullName || seller.email || "Seller"}
      />
    </div>
  )
}
