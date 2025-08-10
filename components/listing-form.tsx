"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ensureFirebaseApp } from "@/lib/firebase"
import { getFirestore, addDoc, collection, serverTimestamp } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"

export default function ListingForm() {
  const { user } = useAuth()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState<number | "">("")
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = Array.from(e.target.files ?? []).slice(0, 4)
    setFiles(fs)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (!user) throw new Error("You must be signed in")
      if (!title.trim() || !description.trim() || !price) throw new Error("Please fill all fields")
      const app = ensureFirebaseApp()
      const db = getFirestore(app)
      const storage = getStorage(app)

      const uploadUrls = await Promise.all(
        files.map(async (f, idx) => {
          const id = `${Date.now()}_${idx}_${Math.random().toString(36).slice(2)}`
          const r = ref(storage, `listings/${user.uid}/${id}_${f.name}`)
          const snap = await uploadBytes(r, f, { contentType: f.type })
          return await getDownloadURL(snap.ref)
        }),
      )

      const docRef = await addDoc(collection(db, "listings"), {
        title: title.trim(),
        description: description.trim(),
        price: typeof price === "string" ? Number.parseFloat(price) : price,
        imageUrls: uploadUrls,
        userId: user.uid,
        status: "active",
        createdAt: serverTimestamp(),
        soldAt: null,
      })

      router.push(`/listing/${docRef.id}`)
    } catch (err: any) {
      setError(err?.message || "Failed to create listing")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g. Mythic #120 ★ 70 Skins"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border-neutral-800 bg-neutral-900 placeholder:text-neutral-500"
          maxLength={100}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Add relevant details (rank, skins, MMR, transfer info)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-32 border-neutral-800 bg-neutral-900 placeholder:text-neutral-500"
          maxLength={2000}
          required
        />
      </div>

      <div className="grid gap-2 max-w-xs">
        <Label htmlFor="price">Price (USD)</Label>
        <Input
          id="price"
          inputMode="decimal"
          placeholder="199.00"
          value={price}
          onChange={(e) => {
            const v = e.target.value
            setPrice(v === "" ? "" : Number(v))
          }}
          className="border-neutral-800 bg-neutral-900 placeholder:text-neutral-500"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="images">Images (up to 4)</Label>
        <Input
          id="images"
          type="file"
          accept="image/*"
          multiple
          onChange={onFiles}
          className="border-neutral-800 bg-neutral-900"
        />
        {!!files.length && (
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {files.map((f, i) => {
              const url = URL.createObjectURL(f)
              return (
                <div key={i} className="rounded-md border border-neutral-800 p-1">
                  <img
                    src={url || "/placeholder.svg"}
                    alt={"Preview " + (i + 1)}
                    className="h-28 w-full rounded object-cover"
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-fuchsia-300">{error}</p>}

      <div className="pt-2">
        <Button
          type="submit"
          disabled={submitting}
          className="border-emerald-500/40 bg-neutral-900 text-emerald-300 hover:bg-neutral-800 hover:text-emerald-200"
        >
          {submitting ? "Publishing..." : "Publish listing"}
        </Button>
      </div>
    </form>
  )
}
