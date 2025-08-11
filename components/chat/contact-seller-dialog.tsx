"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ensureFirebaseApp, firebaseEnabled } from "@/lib/firebase"
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore"
import { useAuth } from "@/components/auth-provider"

type Message = {
  id: string
  senderId: string
  text: string
  createdAt: any
}

export default function ContactSellerDialog({
  open = false,
  onOpenChange = () => {},
  listingId,
  sellerId,
}: {
  open?: boolean
  onOpenChange?: (v: boolean) => void
  listingId: string
  sellerId: string
}) {
  const { user, profile } = useAuth()
  const [text, setText] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [messages, setMessages] = React.useState<Message[]>([])

  const buyerName = React.useMemo(
    () => profile?.fullName || profile?.displayName || user?.displayName || user?.email || "Buyer",
    [profile, user],
  )

  const convoId = React.useMemo(() => {
    if (!user) return null
    return `${listingId}_${user.uid}`
  }, [listingId, user])

  const scrollRef = React.useRef<HTMLDivElement>(null)

  const formatTime = (value: any): string => {
    try {
      const d: Date = value?.toDate?.() || (value?.seconds ? new Date(value.seconds * 1000) : new Date(value))
      const hours = d.getHours()
      const minutes = d.getMinutes().toString().padStart(2, "0")
      const ampm = hours >= 12 ? "PM" : "AM"
      const hr12 = hours % 12 || 12
      return `${hr12}:${minutes} ${ampm}`
    } catch {
      return ""
    }
  }

  React.useEffect(() => {
    if (!open) return
    if (!firebaseEnabled || !user || !convoId) {
      setLoading(false)
      return
    }
    const app = ensureFirebaseApp()
    const db = getFirestore(app)
    ;(async () => {
      // ensure conversation doc exists and has buyerName
      const cRef = doc(db, "conversations", convoId)
      const cSnap = await getDoc(cRef)
      if (!cSnap.exists()) {
        await setDoc(cRef, {
          listingId,
          buyerId: user.uid,
          buyerName,
          sellerId,
          lastMessage: null,
          updatedAt: serverTimestamp(),
        })
      } else if (!cSnap.data()?.buyerName && buyerName) {
        await setDoc(
          cRef,
          {
            buyerName,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
      }
      const mRef = collection(db, "conversations", convoId, "messages")
      const qy = query(mRef, orderBy("createdAt", "asc"))
      const unsub = onSnapshot(qy, (snap: any) => {
        const arr = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })) as Message[]
        setMessages(arr)
        setLoading(false)
      })
      return () => unsub()
    })()
  }, [open, convoId, listingId, sellerId, user, buyerName])

  React.useEffect(() => {
    // auto-scroll to bottom when messages change or dialog opens
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, open])

  const send = async () => {
    if (!firebaseEnabled || !user || !convoId || !text.trim()) return
    const app = ensureFirebaseApp()
    const db = getFirestore(app)
    const mRef = collection(db, "conversations", convoId, "messages")
    await addDoc(mRef, {
      senderId: user.uid,
      text: text.trim(),
      createdAt: serverTimestamp(),
    })
    // update conversation metadata, also ensure buyerName is stored
    await setDoc(
      doc(db, "conversations", convoId),
      {
        buyerName,
        lastMessage: text.trim(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    setText("")
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      send()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[70vh] max-w-2xl flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/80 to-neutral-950/80 p-0 text-neutral-100 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent px-6 py-4">
          <DialogTitle className="text-base font-semibold tracking-tight">Contact Seller</DialogTitle>
        </DialogHeader>

        {!user ? (
          <div className="m-6 rounded-xl border border-white/10 bg-neutral-900/60 p-4 text-sm text-neutral-300 shadow-inner">
            Please sign in to message the seller.
          </div>
        ) : (
          <div className="flex flex-1 flex-col p-4">
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-neutral-950/60 p-3 shadow-inner"
            >
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-4 w-1/2 animate-pulse rounded bg-neutral-900/70" />
                  ))}
                </div>
              ) : messages.length ? (
                messages.map((m: Message) => {
                  const mine = m.senderId === user.uid
                  return (
                    <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                      <div
                        className={
                          "group max-w-[75%] rounded-2xl px-3 py-2 text-sm ring-1 transition " +
                          (mine
                            ? "ring-cyan-400/30 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-cyan-100 shadow-lg"
                            : "ring-white/10 bg-gradient-to-br from-neutral-800/80 to-neutral-900/80 text-neutral-100 shadow")
                        }
                      >
                        <div>{m.text}</div>
                        <div className={"mt-1 text-[10px] " + (mine ? "text-cyan-200/60" : "text-neutral-400/70")}>
                          {formatTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center text-sm text-neutral-400">No messages yet. Say hi!</div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="flex w-full items-center gap-2 rounded-full border border-white/10 bg-neutral-900/60 px-3 py-1.5 shadow-inner backdrop-blur">
                <Input
                  placeholder="Write a message..."
                  value={text}
                  onChange={onInputChange}
                  onKeyDown={onInputKeyDown}
                  className="h-10 flex-1 border-none bg-transparent text-sm focus-visible:ring-0"
                />
                <Button
                  onClick={send}
                  disabled={!text.trim()}
                  className="h-9 w-9 shrink-0 rounded-full border-cyan-500/40 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 hover:text-cyan-100"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M3.4 20.6L21 13.2c1-.4 1-1.9 0-2.3L3.4 3.4c-1-.4-2 .5-1.7 1.5l2.6 7.1c.1.3.1.6 0 .9l-2.6 7.1c-.3 1 .7 1.9 1.7 1.6zM6.7 13.3l11-1.1-11-1.1 1.7-4.7 9.1 5.8-9.1 5.8-1.7-4.7z" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
