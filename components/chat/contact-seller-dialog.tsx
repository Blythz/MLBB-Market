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
      const unsub = onSnapshot(qy, (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Message[]
        setMessages(arr)
        setLoading(false)
      })
      return () => unsub()
    })()
  }, [open, convoId, listingId, sellerId, user, buyerName])

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[70vh] max-w-2xl flex-col border-neutral-800 bg-neutral-950 text-neutral-100">
        <DialogHeader>
          <DialogTitle>Contact Seller</DialogTitle>
        </DialogHeader>

        {!user ? (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
            Please sign in to message the seller.
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto rounded-md border border-neutral-800 bg-neutral-950 p-3">
              {loading ? (
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
                <div className="text-center text-sm text-neutral-400">No messages yet. Say hi!</div>
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
              />
              <Button
                onClick={send}
                className="border-cyan-500/40 bg-neutral-900 text-cyan-300 hover:bg-neutral-800 hover:text-cyan-200"
              >
                Send
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
