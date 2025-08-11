"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  where,
} from "firebase/firestore"
import { ensureFirebaseApp, firebaseEnabled } from "@/lib/firebase"
import { useAuth } from "@/components/auth-provider"

type Conversation = {
  id: string
  listingId: string
  sellerId: string
  buyerId: string
  buyerName?: string | null
  lastMessage?: string | null
  updatedAt?: any
}

type Message = {
  id: string
  senderId: string
  text: string
  createdAt: any
}

export default function SellerInboxDialog({
  open = false,
  onOpenChange = () => {},
  listingId,
}: {
  open?: boolean
  onOpenChange?: (v: boolean) => void
  listingId: string
}) {
  const { user } = useAuth()
  const [convos, setConvos] = React.useState<Conversation[]>([])
  const [selected, setSelected] = React.useState<Conversation | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [text, setText] = React.useState("")
  const [loadingMessages, setLoadingMessages] = React.useState(false)
  const [mobileThread, setMobileThread] = React.useState(false)

  // Fallback cache for buyer names if conversation is missing buyerName
  const [buyerNameMap, setBuyerNameMap] = React.useState<Record<string, string>>({})

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const isSmallScreen = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 767px)").matches

  const initials = (name?: string | null) => {
    if (!name) return "?"
    const parts = name.trim().split(/\s+/)
    const first = parts[0]?.[0] || ""
    const second = parts[1]?.[0] || ""
    return (first + second).toUpperCase() || name[0]?.toUpperCase() || "?"
  }

  const formatTime = (value: any): string => {
    try {
      const d: Date = value?.toDate?.() || (value?.seconds ? new Date(value.seconds * 1000) : new Date(value))
      const now = new Date()
      const sameDay = d.toDateString() === now.toDateString()
      if (!sameDay) return d.toLocaleDateString()
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
    if (!firebaseEnabled || !user) return
    const app = ensureFirebaseApp()
    const db = getFirestore(app)
    const qy = query(
      collection(db, "conversations"),
      where("listingId", "==", listingId),
      where("sellerId", "==", user.uid),
    )
    const unsub = onSnapshot(qy, (snap: any) => {
      const arr = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })) as Conversation[]
      arr.sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0))
      setConvos(arr)
      if (!selected && arr.length) {
        setSelected(arr[0])
      }
    })
    return () => unsub()
  }, [open, listingId, user, selected])

  // Fetch missing buyer names as a fallback
  React.useEffect(() => {
    if (!firebaseEnabled || !open) return
    const fetchMissing = async () => {
      const app = ensureFirebaseApp()
      const db = getFirestore(app)
      const missing = convos.filter((c: Conversation) => !c.buyerName && !buyerNameMap[c.buyerId])
      for (const c of missing) {
        try {
          const snap = await getDoc(doc(db, "users", c.buyerId))
          const data = snap.data() as any
          const name = data?.fullName || data?.displayName || data?.email || c.buyerId
          setBuyerNameMap((m: Record<string, string>) => ({ ...m, [c.buyerId]: name }))
          // Optionally backfill into conversation doc
          await setDoc(
            doc(db, "conversations", c.id),
            { buyerName: name, updatedAt: serverTimestamp() },
            { merge: true },
          )
        } catch {
          // ignore
        }
      }
    }
    fetchMissing()
  }, [convos, buyerNameMap, open])

  React.useEffect(() => {
    if (!open) return
    if (!firebaseEnabled || !selected) {
      setMessages([])
      return
    }
    const app = ensureFirebaseApp()
    const db = getFirestore(app)
    const qy = query(collection(db, "conversations", selected.id, "messages"), orderBy("createdAt", "asc"))
    setLoadingMessages(true)
    const unsub = onSnapshot(qy, (snap: any) => {
      const arr = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })) as Message[]
      setMessages(arr)
      setLoadingMessages(false)
    })
    return () => unsub()
  }, [open, selected])

  React.useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages, open, selected])

  const send = async () => {
    if (!firebaseEnabled || !user || !selected || !text.trim()) return
    const app = ensureFirebaseApp()
    const db = getFirestore(app)
    await addDoc(collection(db, "conversations", selected.id, "messages"), {
      senderId: user.uid,
      text: text.trim(),
      createdAt: serverTimestamp(),
    })
    await setDoc(
      doc(db, "conversations", selected.id),
      {
        lastMessage: text.trim(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    setText("")
  }

  const buyerLabel = (c: Conversation) => c.buyerName || buyerNameMap[c.buyerId] || c.buyerId

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      send()
    }
  }

  const onSelectConversation = (c: Conversation) => {
    setSelected(c)
    if (isSmallScreen()) setMobileThread(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          flex flex-col border border-white/10 bg-[#111b21] text-neutral-100 shadow-2xl
          /* Mobile fullscreen bottom sheet */
          top-auto left-0 right-0 bottom-0 translate-x-0 translate-y-0 h-[100dvh] max-w-full rounded-none p-0
          data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom duration-300
          /* Desktop centered */
          sm:top-[50%] sm:left-[50%] sm:right-auto sm:bottom-auto sm:translate-x-[-50%] sm:translate-y-[-50%]
          sm:h-[80vh] sm:max-w-4xl sm:rounded-2xl sm:p-0
          md:h-[85vh] md:max-w-5xl
          lg:max-w-6xl
        "
      >
        <DialogHeader className="border-b border-white/10 bg-[#202c33] px-4 py-3">
          <div className="flex items-center gap-3">
            {mobileThread && (
              <button
                type="button"
                onClick={() => setMobileThread(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-[#e9edef] hover:bg-white/5 md:hidden"
                aria-label="Back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a3942] text-xs">B</div>
            <DialogTitle className="text-sm font-medium">Buyer Messages</DialogTitle>
          </div>
        </DialogHeader>

        {!user ? (
          <div className="m-6 rounded-xl border border-white/10 bg-[#202c33] p-4 text-sm text-neutral-300 shadow-inner">
            Please sign in to view messages.
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 md:grid-cols-3">
            <div className={"border-r border-white/10 bg-[#111b21] md:col-span-1 " + (mobileThread ? "hidden md:flex" : "flex") + " min-h-0 flex-col"}>
              <div className="px-3 py-2 text-xs text-[#8696a0]">Conversations</div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {convos.length ? (
                  convos.map((c: Conversation) => {
                    const active = selected?.id === c.id
                    const name = buyerLabel(c)
                    return (
                      <button
                        key={c.id}
                        onClick={() => onSelectConversation(c)}
                        className={
                          "group flex w-full items-center gap-3 rounded-none border-b border-white/10 px-3 py-3 text-left transition " +
                          (active
                            ? "bg-[#2a3942] text-white"
                            : "bg-transparent text-[#e9edef] hover:bg-[#202c33]")
                        }
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2a3942] text-sm text-white">
                          {initials(name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-[15px] font-medium text-[#e9edef]">{name}</div>
                            <div className="shrink-0 text-[11px] text-[#8696a0]">{formatTime(c.updatedAt)}</div>
                          </div>
                          <div className="truncate text-[13px] text-[#8696a0]">{c.lastMessage || "No messages yet"}</div>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className="p-3 text-center text-sm text-neutral-400">No conversations yet.</div>
                )}
              </div>
            </div>

            <div className={"min-h-0 md:col-span-2 " + (mobileThread ? "flex" : "hidden md:flex") + " flex-col"}>
              <div
                ref={scrollRef}
                className="flex-1 space-y-2 overflow-y-auto bg-[radial-gradient(circle_at_0_0,#0b141a_0%,#111b21_55%,#0a1318_100%)] px-3 py-4"
              >
                {loadingMessages ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-4 w-1/2 animate-pulse rounded bg-[#202c33]" />
                    ))}
                  </div>
                ) : messages.length ? (
                  messages.map((m: Message) => {
                    const mine = m.senderId === user?.uid
                    return (
                      <div key={m.id} className={"flex px-1 " + (mine ? "justify-end" : "justify-start")}>
                        <div
                          className={
                            "max-w-[78%] rounded-2xl px-3 py-2 text-[13px] shadow " +
                            (mine ? "bg-[#005c4b] text-white" : "bg-[#202c33] text-[#e9edef]")
                          }
                        >
                          <div className="whitespace-pre-wrap leading-5">{m.text}</div>
                          <div className={"mt-1 text-[10px] " + (mine ? "text-white/70" : "text-[#aebac1]")}>{formatTime(m.createdAt)}</div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center text-sm text-neutral-400">Select a conversation to view messages.</div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-white/10 bg-[#202c33] px-2 py-2">
                <div className="flex items-center gap-2">
                  <button className="grid h-10 w-10 place-items-center rounded-full text-[#8696a0] hover:bg-white/5" title="Emoji" type="button">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-3.5 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 18a5.5 5.5 0 01-5-3h10a5.5 5.5 0 01-5 3z" />
                    </svg>
                  </button>
                  <button className="grid h-10 w-10 place-items-center rounded-full text-[#8696a0] hover:bg-white/5" title="Attach" type="button">
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
                      disabled={!selected}
                    />
                    <Button onClick={send} disabled={!selected || !text.trim()} className="h-9 w-9 shrink-0 rounded-full bg-[#00a884] text-white hover:bg-[#029270]">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M3.4 20.6L21 13.2c1-.4 1-1.9 0-2.3L3.4 3.4c-1-.4-2 .5-1.7 1.5l2.6 7.1c.1.3.1.6 0 .9l-2.6 7.1c-.3 1 .7 1.9 1.7 1.6zM6.7 13.3l11-1.1-11-1.1 1.7-4.7 9.1 5.8-9.1 5.8-1.7-4.7z" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
