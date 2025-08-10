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
    const unsub = onSnapshot(qy, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Conversation[]
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
      const missing = convos.filter((c) => !c.buyerName && !buyerNameMap[c.buyerId])
      for (const c of missing) {
        try {
          const snap = await getDoc(doc(db, "users", c.buyerId))
          const data = snap.data() as any
          const name = data?.fullName || data?.displayName || data?.email || c.buyerId
          setBuyerNameMap((m) => ({ ...m, [c.buyerId]: name }))
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
    const unsub = onSnapshot(qy, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Message[]
      setMessages(arr)
      setLoadingMessages(false)
    })
    return () => unsub()
  }, [open, selected])

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] max-w-4xl flex-col border-neutral-800 bg-neutral-950 text-neutral-100">
        <DialogHeader>
          <DialogTitle>Buyer Messages</DialogTitle>
        </DialogHeader>

        {!user ? (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
            Please sign in to view messages.
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-md border border-neutral-800 bg-neutral-950 p-2 md:col-span-1">
              <div className="mb-2 text-xs text-neutral-400">Conversations</div>
              <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
                {convos.length ? (
                  convos.map((c) => {
                    const active = selected?.id === c.id
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelected(c)}
                        className={
                          "w-full rounded-md border px-3 py-2 text-left text-sm transition " +
                          (active
                            ? "border-cyan-500/40 bg-neutral-900 text-cyan-200"
                            : "border-neutral-800 bg-neutral-900 hover:bg-neutral-800")
                        }
                      >
                        <div className="truncate text-xs text-neutral-400">Buyer: {buyerLabel(c)}</div>
                        <div className="truncate">{c.lastMessage || "No messages yet"}</div>
                      </button>
                    )
                  })
                ) : (
                  <div className="p-3 text-center text-sm text-neutral-400">No conversations yet.</div>
                )}
              </div>
            </div>

            <div className="flex flex-col rounded-md border border-neutral-800 bg-neutral-950 p-2 md:col-span-2">
              <div className="mb-2 text-xs text-neutral-400">Thread</div>
              <div className="flex-1 space-y-3 overflow-y-auto rounded-md border border-neutral-800 bg-neutral-950 p-3">
                {loadingMessages ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-4 w-1/2 animate-pulse rounded bg-neutral-900" />
                    ))}
                  </div>
                ) : messages.length ? (
                  messages.map((m) => {
                    const mine = m.senderId === user.uid
                    return (
                      <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                        <div
                          className={
                            "max-w-[75%] rounded-lg px-3 py-2 text-sm " +
                            (mine
                              ? "border border-cyan-500/30 bg-neutral-900 text-cyan-200"
                              : "border border-neutral-800 bg-neutral-900 text-neutral-200")
                          }
                        >
                          {m.text}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center text-sm text-neutral-400">Select a conversation to view messages.</div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Input
                  placeholder="Write a message..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      send()
                    }
                  }}
                  className="border-neutral-800 bg-neutral-900"
                  disabled={!selected}
                />
                <Button
                  onClick={send}
                  className="border-cyan-500/40 bg-neutral-900 text-cyan-300 hover:bg-neutral-800 hover:text-cyan-200"
                  disabled={!selected}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
