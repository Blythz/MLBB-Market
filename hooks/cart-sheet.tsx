"use client"

import * as React from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/utils/format"
import { useCart } from "@/hooks/use-cart"

export default function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { items, removeItem, clear } = useCart()

  const total = items.reduce((acc, i) => acc + (i.price || 0), 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="border-l border-neutral-800 bg-neutral-950 text-neutral-100">
        <SheetHeader>
          <SheetTitle>My Cart</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-sm text-neutral-400">Your cart is empty.</div>
          ) : (
            items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 rounded-lg border border-neutral-800 p-3">
                <img src={i.imageUrl || "/placeholder.svg?height=80&width=80"} alt="thumb" className="h-14 w-14 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{i.title}</div>
                  <div className="text-xs text-neutral-400">{formatCurrency(i.price)}</div>
                </div>
                <Button variant="outline" onClick={() => removeItem(i.id)} className="border-red-500/40 text-red-300">
                  Remove
                </Button>
              </div>
            ))
          )}
        </div>
        <div className="mt-auto space-y-3 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-400">Total</span>
            <span className="font-semibold">{formatCurrency(total)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={clear} className="flex-1 border-neutral-800">
              Clear
            </Button>
            <Button className="flex-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500">Checkout</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}


