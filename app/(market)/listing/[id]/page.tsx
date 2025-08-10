"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getFirestore, doc, getDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { TriangleAlert, Trash2, MessagesSquare, MessageCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { formatCurrency } from "@/utils/format"
import type { Listing } from "@/types/listing"
import { firebaseEnabled, ensureFirebaseApp } from "@/lib/firebase"
import { useAuth } from "@/components/auth-provider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getStorage, ref, deleteObject } from "firebase/storage"
import ContactSellerDialog from "@/components/chat/contact-seller-dialog"
import SellerInboxDialog from "@/components/chat/seller-inbox-dialog"

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)

  useEffect(() => {
    if (!params?.id) return
    if (!firebaseEnabled) {
      setListing({
        id: params.id,
        title: "Demo Listing",
        description: "This is a demo detail page. Connect Firebase to see real listings and controls.",
        price: 199,
        imageUrls: ["/placeholder.svg?height=700&width=1200"],
        userId: "demo",
        createdAt: null as any,
        status: "active",
      })
      setLoading(false)
      return
    }
    const app = ensureFirebaseApp()
    const db = getFirestore(app)
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, "listings", params.id))
        if (snap.exists()) {
          setListing({ id: snap.id, ...(snap.data() as Omit<Listing, "id">) })
        } else {
          setListing(null)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [params?.id])

  const isOwner = useMemo(() => !!user && !!listing && user.uid === listing.userId, [user, listing])
  const isSold = listing?.status === "sold"

  const handleDelete = async () => {
    if (!firebaseEnabled || !listing) return
    const app = ensureFirebaseApp()
    const db = getFirestore(app)
    const storage = getStorage(app)
    try {
      // try to delete images (best-effort)
      await Promise.allSettled(
        (listing.imageUrls ?? []).map(async (url) => {
          if (!url.startsWith("http")) return
          const r = ref(storage, url)
          await deleteObject(r)
        }),
      )
      await deleteDoc(doc(db, "listings", listing.id))
      router.push("/")
    } catch {
      // no-op
    }
  }

  const markSold = async () => {
    if (!firebaseEnabled || !listing) return
    const app = ensureFirebaseApp()
    const db = getFirestore(app)
    await updateDoc(doc(db, "listings", listing.id), {
      status: "sold",
      soldAt: serverTimestamp(),
    })
    setListing({ ...(listing as any), status: "sold" })
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <div className="aspect-[16/10] animate-pulse rounded-xl bg-neutral-900/70" />
        <div className="space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-neutral-900/70" />
          <div className="h-4 w-full animate-pulse rounded bg-neutral-900/70" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-900/70" />
          <div className="h-10 w-40 animate-pulse rounded bg-neutral-900/70" />
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <Alert className="border-fuchsia-500/20 bg-fuchsia-500/5">
        <TriangleAlert className="h-4 w-4 text-fuchsia-400" />
        <AlertTitle className="text-fuchsia-300">Listing not found</AlertTitle>
        <AlertDescription className="text-fuchsia-200/80">
          The listing you are looking for does not exist.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <div className="grid items-start gap-6 md:grid-cols-2">
        <Card className="border-neutral-800 bg-neutral-950/60">
          <CardContent className="p-2 sm:p-4">
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div className="overflow-hidden rounded-lg border border-neutral-800">
                <img
                  src={listing.imageUrls?.[0] ?? "/placeholder.svg?height=700&width=1200&query=mlbb%20splash%20art"}
                  alt="Listing cover"
                  className="h-full w-full max-h-[520px] object-cover"
                />
              </div>
              {listing.imageUrls && listing.imageUrls.length > 1 && (
                <div className="grid grid-cols-3 gap-3">
                  {listing.imageUrls.slice(1, 4).map((url, idx) => (
                    <img
                      key={idx}
                      src={url || "/placeholder.svg"}
                      alt={"Preview " + (idx + 2)}
                      className="h-28 w-full rounded-md border border-neutral-800 object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <h1 className="text-balance text-3xl font-semibold sm:text-4xl">
            <span className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">
              {listing.title}
            </span>
          </h1>
          <div className="text-3xl font-bold text-emerald-400">{formatCurrency(listing.price)}</div>
          <p className="max-w-prose text-base leading-relaxed text-neutral-200">{listing.description}</p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {isSold && (
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                Sold
              </span>
            )}

            {/* Buyer: Contact seller */}
            {!isOwner && firebaseEnabled && !isSold && (
              <Button
                className="border-cyan-500/40 bg-neutral-900 text-cyan-300 hover:bg-neutral-800 hover:text-cyan-200"
                onClick={() => setContactOpen(true)}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Contact seller
              </Button>
            )}

            {/* Seller: manage */}
            {isOwner && firebaseEnabled && (
              <>
                {!isSold && (
                  <Button onClick={markSold} className="bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30">
                    <Check className="mr-2 h-4 w-4" />
                    Mark as sold
                  </Button>
                )}
                <Button
                  className="border-cyan-500/40 bg-neutral-900 text-cyan-300 hover:bg-neutral-800 hover:text-cyan-200"
                  onClick={() => setInboxOpen(true)}
                >
                  <MessagesSquare className="mr-2 h-4 w-4" />
                  Messages
                </Button>
                <Button
                  variant="destructive"
                  className="bg-fuchsia-600/20 text-fuchsia-300 hover:bg-fuchsia-600/30"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete listing
                </Button>
              </>
            )}
          </div>

          {!firebaseEnabled && (
            <Alert className="border-cyan-500/20 bg-cyan-500/5">
              <TriangleAlert className="h-4 w-4 text-cyan-400" />
              <AlertTitle className="text-cyan-300">Demo mode</AlertTitle>
              <AlertDescription className="text-cyan-200/80">
                Connect Firebase to enable chat, deletion and authentication.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-neutral-800 bg-neutral-950">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neutral-100">Delete this listing?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-neutral-400">This will permanently remove the listing and its images.</p>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neutral-900 text-neutral-200 hover:bg-neutral-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-fuchsia-600/20 text-fuchsia-300 hover:bg-fuchsia-600/30"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Chat dialogs */}
      {firebaseEnabled && listing && !isOwner && (
        <ContactSellerDialog
          open={contactOpen}
          onOpenChange={setContactOpen}
          listingId={listing.id}
          sellerId={listing.userId}
        />
      )}
      {firebaseEnabled && listing && isOwner && (
        <SellerInboxDialog open={inboxOpen} onOpenChange={setInboxOpen} listingId={listing.id} />
      )}
    </>
  )
}
