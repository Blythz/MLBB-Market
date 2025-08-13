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

const MAX_IMAGE_BYTES = 200 * 1024 // 200 KB

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = (e) => reject(e)
      img.src = objectUrl
    })
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("Failed to create image blob"))
      },
      type,
      quality,
    )
  })
}

async function compressImageToMaxBytes(img: HTMLImageElement, maxBytes: number = MAX_IMAGE_BYTES): Promise<Blob> {
  const targetType = "image/jpeg"
  let scale = Math.min(1, 1920 / (img.width || 1))
  if (!Number.isFinite(scale) || scale <= 0) scale = 1

  for (let s = scale; s > 0.3; s *= 0.85) {
    for (let q = 0.8; q >= 0.4; q -= 0.1) {
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round((img.width || 1) * s))
      canvas.height = Math.max(1, Math.round((img.height || 1) * s))
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas is not supported in this environment")
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const blob = await canvasToBlob(canvas, targetType, q)
      if (blob.size <= maxBytes) return blob
    }
  }

  const finalCanvas = document.createElement("canvas")
  const finalScale = 0.3
  finalCanvas.width = Math.max(1, Math.round((img.width || 1) * finalScale))
  finalCanvas.height = Math.max(1, Math.round((img.height || 1) * finalScale))
  const finalCtx = finalCanvas.getContext("2d")
  if (!finalCtx) throw new Error("Canvas is not supported in this environment")
  finalCtx.drawImage(img, 0, 0, finalCanvas.width, finalCanvas.height)
  const finalBlob = await canvasToBlob(finalCanvas, targetType, 0.4)
  if (finalBlob.size <= maxBytes) return finalBlob
  throw new Error(`Image is too large even after compression (> ${Math.round(maxBytes / 1024)} KB).`)
}

async function processFileForUpload(file: File): Promise<Blob> {
  const img = await loadImageFromFile(file)
  const main = await compressImageToMaxBytes(img, MAX_IMAGE_BYTES)
  return main
}

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
          const compressed = await processFileForUpload(f)
          const r = ref(
            storage,
            `listings/${user.uid}/${id}_${f.name.replace(/\.[^.]+$/, '')}.jpg`,
          )
          const snap = await uploadBytes(r, compressed, {
            contentType: "image/jpeg",
            customMetadata: { originalName: f.name },
          })
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
