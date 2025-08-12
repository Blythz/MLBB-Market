"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import AuthProvider, { useAuth } from "@/components/auth-provider"
import LoginDialog from "@/components/login-dialog"
import { cn } from "@/lib/utils"
import { Heart, Bell } from "lucide-react"
import WishlistSheet from "./wishlist-sheet"
import { useWishlist } from "@/hooks/use-wishlist"
import ContactSellerDialog from "@/components/chat/contact-seller-dialog"
import SellerInboxDialog from "@/components/chat/seller-inbox-dialog"
import { ensureFirebaseApp, firebaseEnabled } from "@/lib/firebase"
import { collection, getFirestore, onSnapshot, query, where, doc, getDoc } from "firebase/firestore"

function initials(name?: string, email?: string) {
  const base = name || email || "U"
  const parts = base.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U"
}

function HeaderInner() {
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const { user, profile, loading, signOut } = useAuth()
  const { count } = useWishlist()
  const canPost = useMemo(() => {
    const role = profile?.role
    const status = profile?.sellerStatus
    return role === "admin" || status === "approved"
  }, [profile])

  // Notifications (recent conversations for buyer or seller)
  type Conversation = {
    id: string
    listingId: string
    sellerId: string
    buyerId: string
    buyerName?: string | null
    lastMessage?: string | null
    lastSenderId?: string | null
    updatedAt?: any
    buyerLastReadAt?: any
    sellerLastReadAt?: any
  }
  const [convos, setConvos] = useState<Conversation[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [listingTitles, setListingTitles] = useState<Record<string, string>>({})

  // Dialog state
  const [contactOpen, setContactOpen] = useState(false)
  const [contactListingId, setContactListingId] = useState<string | null>(null)
  const [contactSellerId, setContactSellerId] = useState<string | null>(null)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [inboxListingId, setInboxListingId] = useState<string | null>(null)
  const [inboxConversationId, setInboxConversationId] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseEnabled || !user) {
      setConvos([])
      return
    }
    const app = ensureFirebaseApp()
    const db = getFirestore(app)
    const buyerQ = query(collection(db, "conversations"), where("buyerId", "==", user.uid))
    const sellerQ = query(collection(db, "conversations"), where("sellerId", "==", user.uid))

    const unsubBuyer = onSnapshot(buyerQ, (snap: any) => {
      const arr = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })) as Conversation[]
      setConvos((prev) => {
        // merge: replace any with same id from buyer side
        const map = new Map(prev.map((c) => [c.id, c]))
        arr.forEach((c) => map.set(c.id, c))
        return Array.from(map.values()).sort(
          (a: any, b: any) => (b?.updatedAt?.toMillis?.() ?? 0) - (a?.updatedAt?.toMillis?.() ?? 0),
        )
      })
    })
    const unsubSeller = onSnapshot(sellerQ, (snap: any) => {
      const arr = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })) as Conversation[]
      setConvos((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]))
        arr.forEach((c) => map.set(c.id, c))
        return Array.from(map.values()).sort(
          (a: any, b: any) => (b?.updatedAt?.toMillis?.() ?? 0) - (a?.updatedAt?.toMillis?.() ?? 0),
        )
      })
    })
    return () => {
      unsubBuyer()
      unsubSeller()
    }
  }, [user])

  // Fetch listing titles for conversations to display in notifications
  useEffect(() => {
    if (!firebaseEnabled || !convos.length) return
    const db = getFirestore(ensureFirebaseApp())
    const uniqueIds = Array.from(new Set(convos.map((c) => c.listingId)))
    const missing = uniqueIds.filter((id) => !listingTitles[id])
    if (!missing.length) return
    ;(async () => {
      const updates: Record<string, string> = {}
      await Promise.all(
        missing.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, "listings", id))
            const data = snap.data() as any
            if (data?.title) updates[id] = data.title as string
          } catch {}
        }),
      )
      if (Object.keys(updates).length) setListingTitles((prev) => ({ ...prev, ...updates }))
    })()
  }, [convos, listingTitles])

  const onClickConversation = (c: Conversation) => {
    if (!user) return
    if (c.buyerId === user.uid) {
      // Open buyer chat to seller
      setContactListingId(c.listingId)
      setContactSellerId(c.sellerId)
      setContactOpen(true)
      setNotifOpen(false)
    } else if (c.sellerId === user.uid) {
      // Open seller inbox for this listing
      setInboxListingId(c.listingId)
      setInboxConversationId(c.id)
      setInboxOpen(true)
      setNotifOpen(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-4">
        <Link
          href="/"
          className="font-semibold tracking-tight bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-emerald-400 bg-clip-text text-transparent"
        >
          MLBB Market
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/sellers" className="text-xs text-neutral-300 hover:text-white">
            Verified Sellers
          </Link>
          {/* Notifications */}
          {user && (
            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative inline-flex items-center gap-2 rounded-md p-1.5 hover:bg-neutral-900"
                  aria-label="Open notifications"
                >
                  <Bell className="h-5 w-5 text-neutral-300" />
                  {convos.filter((c) => {
                    // unread if last message exists and was not sent by me, and my side hasn't read it since
                    const lastFromOther = c.lastMessage && c.lastSenderId && c.lastSenderId !== user.uid
                    if (!lastFromOther) return false
                    // as buyer -> compare buyerLastReadAt
                    if (c.buyerId === user.uid) {
                      const lastTs = (c as any).updatedAt?.toMillis?.() ?? 0
                      const readTs = (c as any).buyerLastReadAt?.toMillis?.() ?? 0
                      return lastTs > readTs
                    }
                    // as seller -> compare sellerLastReadAt
                    if (c.sellerId === user.uid) {
                      const lastTs = (c as any).updatedAt?.toMillis?.() ?? 0
                      const readTs = (c as any).sellerLastReadAt?.toMillis?.() ?? 0
                      return lastTs > readTs
                    }
                    return false
                  }).length > 0 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-fuchsia-500 px-1.5 text-[10px] font-semibold text-white">
                      {Math.min(
                        convos.filter((c) => {
                          const lastFromOther = c.lastMessage && c.lastSenderId && c.lastSenderId !== user.uid
                          if (!lastFromOther) return false
                          if (c.buyerId === user.uid) {
                            const lastTs = (c as any).updatedAt?.toMillis?.() ?? 0
                            const readTs = (c as any).buyerLastReadAt?.toMillis?.() ?? 0
                            return lastTs > readTs
                          }
                          if (c.sellerId === user.uid) {
                            const lastTs = (c as any).updatedAt?.toMillis?.() ?? 0
                            const readTs = (c as any).sellerLastReadAt?.toMillis?.() ?? 0
                            return lastTs > readTs
                          }
                          return false
                        }).length,
                        9,
                      )}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-w-[85vw] border-neutral-800 bg-neutral-950 text-neutral-200">
                {convos.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-neutral-400">No conversations yet.</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto pr-1">
                    {convos.map((c) => {
                      const lastFromOther = c.lastMessage && c.lastSenderId && c.lastSenderId !== user.uid
                      const lastTs = (c as any).updatedAt?.toMillis?.() ?? 0
                      const readTs = c.buyerId === user.uid
                        ? (c as any).buyerLastReadAt?.toMillis?.() ?? 0
                        : (c as any).sellerLastReadAt?.toMillis?.() ?? 0
                      const unread = !!lastFromOther && lastTs > readTs
                      return (
                        <DropdownMenuItem
                          key={c.id}
                          onSelect={(e) => {
                            e.preventDefault()
                            onClickConversation(c)
                          }}
                          className="flex items-start gap-2 whitespace-normal"
                        >
                          <div className={"mt-1 h-2 w-2 flex-shrink-0 rounded-full " + (unread ? "bg-cyan-500" : "bg-neutral-700")} />
                          <div className="min-w-0">
                            <div className={"truncate text-xs " + (unread ? "font-semibold text-neutral-100" : "text-neutral-300") }>
                              {listingTitles[c.listingId] || `Listing ${c.listingId}`}
                            </div>
                            <div className="truncate text-[11px] text-neutral-400">From: {c.buyerName || "Buyer"}</div>
                            <div className={"truncate text-[11px] " + (unread ? "text-neutral-200" : "text-neutral-500")}>{c.lastMessage || "New message"}</div>
                          </div>
                        </DropdownMenuItem>
                      )
                    })}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <button
            onClick={() => setWishlistOpen(true)}
            className="relative inline-flex items-center gap-2 rounded-md p-1.5 hover:bg-neutral-900"
            aria-label="Open wishlist"
          >
            <Heart className="h-5 w-5 text-neutral-300" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-cyan-500 px-1.5 text-[10px] font-semibold text-white">
                {count}
              </span>
            )}
          </button>
          {!loading && !user && <LoginDialog />}

          {!loading && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("inline-flex items-center gap-2 rounded-md p-1.5 hover:bg-neutral-900")}>
                  <Avatar className="h-7 w-7">
                    <AvatarImage
                      src={profile?.photoURL || user.photoURL || "/placeholder.svg?height=64&width=64&query=avatar"}
                      alt="Profile avatar"
                    />
                    <AvatarFallback>
                      {initials(profile?.displayName || profile?.fullName, user.email || undefined)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-neutral-800 bg-neutral-950 text-neutral-200">
                <DropdownMenuItem asChild>
                  <Link href={`/seller/${user.uid}`}>View Profile</Link>
                </DropdownMenuItem>
                {canPost && (
                  <DropdownMenuItem asChild>
                    <Link href="/new">New Listing</Link>
                  </DropdownMenuItem>
                )}
                {!canPost && (
                  <DropdownMenuItem asChild>
                    <Link href="/sellers">Become a Seller</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
      <WishlistSheet open={wishlistOpen} onOpenChange={setWishlistOpen} />
      {/* Chat dialogs controlled from header notifications */}
      {firebaseEnabled && contactOpen && contactListingId && contactSellerId && (
        <ContactSellerDialog
          open={contactOpen}
          onOpenChange={setContactOpen}
          listingId={contactListingId}
          sellerId={contactSellerId}
        />
      )}
      {firebaseEnabled && inboxOpen && inboxListingId && (
        <SellerInboxDialog
          open={inboxOpen}
          onOpenChange={setInboxOpen}
          listingId={inboxListingId}
          initialConversationId={inboxConversationId || undefined}
        />)
      }
    </header>
  )
}

export default function Header() {
  // Ensure AuthProvider wraps header content so avatar/profile is available
  return (
    <AuthProvider>
      <HeaderInner />
    </AuthProvider>
  )
}
