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

  // Fallback cache for buyer names if conversation is missing buyerName
  const [buyerNameMap, setBuyerNameMap] = React.useState<Record<string, string>>({})

  const scrollRef = React.useRef<HTMLDivElement>(null)

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

  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] max-w-4xl flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/80 to-neutral-950/80 p-0 text-neutral-100 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent px-6 py-4">
          <DialogTitle className="text-base font-semibold tracking-tight">Buyer Messages</DialogTitle>
        </DialogHeader>

        {!user ? (
          <div className="m-6 rounded-xl border border-white/10 bg-neutral-900/60 p-4 text-sm text-neutral-300 shadow-inner">
            Please sign in to view messages.
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-neutral-950/60 p-2 shadow-inner md:col-span-1">
              <div className="mb-2 px-2 text-xs text-neutral-400">Conversations</div>
              <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
                {convos.length ? (
                  convos.map((c: Conversation) => {
                    const active = selected?.id === c.id
                    const name = buyerLabel(c)
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelected(c)}
                        className={
                          "group flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition " +
                          (active
                            ? "border-cyan-500/40 bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-100"
                            : "border-white/10 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-800/60")
                        }
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 text-xs text-white ring-1 ring-white/10">
                          {initials(name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-xs text-neutral-400">Buyer: {name}</div>
                            <div className="shrink-0 text-[10px] text-neutral-500">{formatTime(c.updatedAt)}</div>
                          </div>
                          <div className="truncate text-sm">{c.lastMessage || "No messages yet"}</div>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className="p-3 text-center text-sm text-neutral-400">No conversations yet.</div>
                )}
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-white/10 bg-neutral-950/60 p-2 shadow-inner md:col-span-2">
              <div className="mb-2 px-1 text-xs text-neutral-400">Thread</div>
              <div
                ref={scrollRef}
                className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-neutral-950/40 p-3"
              >
                {loadingMessages ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-4 w-1/2 animate-pulse rounded bg-neutral-900/70" />
                    ))}
                  </div>
                ) : messages.length ? (
                  messages.map((m: Message) => {
                    const mine = m.senderId === user?.uid
                    return (
                      <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                        <div
                          className={
                            "max-w-[75%] rounded-2xl px-3 py-2 text-sm ring-1 transition " +
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
                  <div className="text-center text-sm text-neutral-400">Select a conversation to view messages.</div>
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
                    disabled={!selected}
                  />
                  <Button
                    onClick={send}
                    disabled={!selected || !text.trim()}
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
