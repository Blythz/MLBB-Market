"use client"

import * as React from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/utils/format"
import { useWishlist } from "@/hooks/use-wishlist"
import Link from "next/link"

export default function WishlistSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { items, remove, clear } = useWishlist()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="border-l border-neutral-800 bg-neutral-950 text-neutral-100">
        <SheetHeader>
          <SheetTitle>My Wishlist</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-sm text-neutral-400">Your wishlist is empty.</div>
          ) : (
            items.map((i) => (
              <Link href={`/listing/${i.id}`} key={i.id} className="flex items-center gap-3 rounded-lg border border-neutral-800 p-3 hover:bg-neutral-900">
                <img src={i.imageUrl || "/placeholder.svg?height=80&width=80"} alt="thumb" className="h-14 w-14 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{i.title}</div>
                  <div className="text-xs text-neutral-400">{formatCurrency(i.price)}</div>
                </div>
                <Button variant="outline" onClick={(e) => { e.preventDefault(); remove(i.id) }} className="border-red-500/40 text-red-300">
                  Remove
                </Button>
              </Link>
            ))
          )}
        </div>
        <div className="mt-auto space-y-3 p-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={clear}
              className="flex-1 border-red-500/40 text-red-300 hover:bg-red-500/10"
            >
              Clear
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              className="flex-1 border-cyan-500/40 bg-neutral-900 text-cyan-200 hover:bg-neutral-800 hover:text-cyan-100"
            >
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}


