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
  const bottomRef = React.useRef<HTMLDivElement>(null)

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

  React.useLayoutEffect(() => {
    // robust auto-scroll using sentinel
    bottomRef.current?.scrollIntoView({ block: "end" })
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
      <DialogContent
        className="
          flex flex-col border border-white/10 bg-[#111b21] text-neutral-100 shadow-2xl
          /* Mobile: fullscreen bottom sheet */
          top-auto left-0 right-0 bottom-0 translate-x-0 translate-y-0 h-[100dvh] max-w-full rounded-none p-0
          data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom duration-300
          /* Desktop: centered modal */
          sm:top-[50%] sm:left-[50%] sm:right-auto sm:bottom-auto sm:translate-x-[-50%] sm:translate-y-[-50%]
          sm:h-[70vh] sm:max-w-2xl sm:rounded-2xl sm:p-0
        "
      >
        <DialogHeader className="border-b border-white/10 bg-[#202c33] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a3942] text-xs">S</div>
            <DialogTitle className="text-sm font-medium">Chat with Seller</DialogTitle>
          </div>
        </DialogHeader>

        {!user ? (
          <div className="m-6 rounded-xl border border-white/10 bg-[#202c33] p-4 text-sm text-neutral-300 shadow-inner">
            Please sign in to message the seller.
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div
              ref={scrollRef}
              className="flex-1 space-y-2 overflow-y-auto bg-[radial-gradient(circle_at_0_0,#0b141a_0%,#111b21_55%,#0a1318_100%)] px-3 py-4"
            >
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-4 w-1/2 animate-pulse rounded bg-[#202c33]" />
                  ))}
                </div>
              ) : messages.length ? (
                messages.map((m: Message) => {
                  const mine = m.senderId === user.uid
                  return (
                    <div key={m.id} className={"flex px-1 " + (mine ? "justify-end" : "justify-start")}>
                      <div
                        className={
                          "group max-w-[78%] rounded-2xl px-3 py-2 text-[13px] shadow " +
                          (mine
                            ? "bg-[#005c4b] text-white"
                            : "bg-[#202c33] text-[#e9edef]")
                        }
                      >
                        <div className="whitespace-pre-wrap leading-5">{m.text}</div>
                        <div className={"mt-1 text-[10px] " + (mine ? "text-white/70" : "text-[#aebac1]")}>{formatTime(m.createdAt)}</div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center text-sm text-neutral-400">No messages yet. Say hi!</div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-white/10 bg-[#202c33] px-2 py-2">
              <div className="flex items-center gap-2">
                <button
                  className="grid h-10 w-10 place-items-center rounded-full text-[#8696a0] hover:bg-white/5"
                  title="Emoji"
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-3.5 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 18a5.5 5.5 0 01-5-3h10a5.5 5.5 0 01-5 3z" />
                  </svg>
                </button>
                <button
                  className="grid h-10 w-10 place-items-center rounded-full text-[#8696a0] hover:bg-white/5"
                  title="Attach"
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M16.5 6.5l-6.8 6.8a3 3 0 104.2 4.2l7.4-7.4a5 5 0 10-7.1-7.1L5.8 11.4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className="flex w-full items-center gap-2 rounded-full bg-[#2a3942] px-3">
                  <Input
                    placeholder="Type a message"
                    value={text}
                    onChange={onInputChange}
                    onKeyDown={onInputKeyDown}
                    className="h-10 flex-1 border-none bg-transparent text-sm placeholder:text-[#8696a0] focus-visible:ring-0"
                  />
                  <Button
                    onClick={send}
                    disabled={!text.trim()}
                    className="h-9 w-9 shrink-0 rounded-full bg-[#00a884] text-white hover:bg-[#029270]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M3.4 20.6L21 13.2c1-.4 1-1.9 0-2.3L3.4 3.4c-1-.4-2 .5-1.7 1.5l2.6 7.1c.1.3.1.6 0 .9l-2.6 7.1c-.3 1 .7 1.9 1.7 1.6zM6.7 13.3l11-1.1-11-1.1 1.7-4.7 9.1 5.8-9.1 5.8-1.7-4.7z" />
                    </svg>
                  </Button>
                  <button
                    className="grid h-10 w-10 place-items-center rounded-full text-[#8696a0] hover:bg-white/5"
                    title="Voice"
                    type="button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm-7-3a7 7 0 0014 0h-2a5 5 0 11-10 0H5z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
