"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TriangleAlert } from "lucide-react"
import { ensureFirebaseApp, firebaseEnabled } from "@/lib/firebase"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore"
import { useAuth } from "./auth-provider"

export default function SellerApplyDialog({
  open = false,
  onOpenChange = () => {},
}: {
  open?: boolean
  onOpenChange?: (v: boolean) => void
}) {
  const { user, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = React.useState(profile?.fullName ?? "")
  const [contactNumber, setContactNumber] = React.useState(profile?.contactNumber ?? "")
  const [governmentId, setGovernmentId] = React.useState<File | null>(null)
  const [passportPhoto, setPassportPhoto] = React.useState<File | null>(null)
  const [note, setNote] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!firebaseEnabled) return
    if (!user) {
      setError("Please sign in first.")
      return
    }
    if (!fullName.trim() || !contactNumber.trim() || !governmentId || !passportPhoto) {
      setError("Please complete all fields.")
      return
    }
    setSubmitting(true)
    try {
      const app = ensureFirebaseApp()
      const storage = getStorage(app)
      const db = getFirestore(app)
      const ts = Date.now()
      const basePath = `seller-applications/${user.uid}/${ts}`

      const govRef = ref(storage, `${basePath}/government-id_${governmentId.name}`)
      await uploadBytes(govRef, governmentId, { contentType: governmentId.type })
      const governmentIdUrl = await getDownloadURL(govRef)

      const passRef = ref(storage, `${basePath}/passport_${passportPhoto.name}`)
      await uploadBytes(passRef, passportPhoto, { contentType: passportPhoto.type })
      const passportPhotoUrl = await getDownloadURL(passRef)

      // Create or update user profile
      const userRef = doc(db, "users", user.uid)
      await setDoc(
        userRef,
        {
          uid: user.uid,
          email: user.email || "",
          role: "user",
          sellerStatus: "pending",
          fullName: fullName.trim(),
          contactNumber: contactNumber.trim(),
          governmentIdUrl,
          passportPhotoUrl,
          applicationNote: note.trim() || null,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      )

      await refreshProfile?.()
      setSuccess("Application submitted. You'll be notified once reviewed.")
      // Optionally auto-close after a short delay
      setTimeout(() => onOpenChange(false), 1200)
    } catch (err: any) {
      setError(err?.message || "Failed to submit application.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-800 bg-neutral-950 text-neutral-100">
        <DialogHeader>
          <DialogTitle className="text-center">Become a Seller</DialogTitle>
        </DialogHeader>

        {!firebaseEnabled && (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-cyan-300">
            <TriangleAlert className="h-4 w-4" />
            Add Firebase config to enable submissions.
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="border-neutral-800 bg-neutral-900 placeholder:text-neutral-500"
              disabled={!firebaseEnabled}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contact">Contact Number</Label>
            <Input
              id="contact"
              required
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="border-neutral-800 bg-neutral-900 placeholder:text-neutral-500"
              disabled={!firebaseEnabled}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="governmentId">Government ID (image)</Label>
            <Input
              id="governmentId"
              type="file"
              accept="image/*"
              required
              onChange={(e) => setGovernmentId((e.target.files && e.target.files[0]) || null)}
              className="border-neutral-800 bg-neutral-900"
              disabled={!firebaseEnabled}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="passportPhoto">Passport Photo (image)</Label>
            <Input
              id="passportPhoto"
              type="file"
              accept="image/*"
              required
              onChange={(e) => setPassportPhoto((e.target.files && e.target.files[0]) || null)}
              className="border-neutral-800 bg-neutral-900"
              disabled={!firebaseEnabled}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Anything else the admin should know..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-24 border-neutral-800 bg-neutral-900 placeholder:text-neutral-500"
              disabled={!firebaseEnabled}
            />
          </div>

          {error && <p className="text-sm text-fuchsia-300">{error}</p>}
          {success && <p className="text-sm text-emerald-300">{success}</p>}

          <Button
            type="submit"
            disabled={submitting || !firebaseEnabled || !user}
            className="mt-1 border-cyan-500/40 bg-neutral-900 text-cyan-300 hover:bg-neutral-800 hover:text-cyan-200"
          >
            {submitting ? "Submitting..." : "Submit application"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
