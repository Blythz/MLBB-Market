"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { useEffect, useMemo, useState } from "react"
import { Search, SlidersHorizontal } from "lucide-react"

export type SortOption = "price-asc" | "price-desc"

export type SearchFilterProps = {
  minPrice?: number
  maxPrice?: number
  onSearchChange?: (q: string) => void
  onRangeChange?: (range: [number, number]) => void
  onSortChange?: (sort: SortOption) => void
}

export default function SearchFilter({
  minPrice = 0,
  maxPrice = 1000,
  onSearchChange = () => {},
  onRangeChange = () => {},
  onSortChange = () => {},
}: SearchFilterProps) {
  const [q, setQ] = useState("")
  const [range, setRange] = useState<[number, number]>([minPrice, maxPrice])
  const [sort, setSort] = useState<SortOption>("price-asc")

  useEffect(() => {
    setRange([minPrice, maxPrice])
  }, [minPrice, maxPrice])

  useEffect(() => {
    onSearchChange(q)
  }, [q, onSearchChange])

  useEffect(() => {
    onRangeChange(range)
  }, [range, onRangeChange])

  useEffect(() => {
    onSortChange(sort)
  }, [sort, onSortChange])

  const pretty = useMemo(
    () => ({
      min: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
        range[0],
      ),
      max: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
        range[1],
      ),
    }),
    [range],
  )

  return (
    <div className="backdrop-blur-sm bg-neutral-900/80 border border-neutral-800/50 rounded-2xl p-6 shadow-xl">
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="space-y-2">
          <Label htmlFor="search" className="text-sm font-medium text-neutral-300">
            Search Accounts
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              id="search"
              placeholder="Search by title, rank, or description..."
              className="pl-10 bg-neutral-800/50 border-neutral-700 rounded-xl h-12 text-neutral-100 placeholder:text-neutral-500 focus:border-cyan-500/50 focus:ring-cyan-500/20"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Price Range */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Price Range
              </Label>
              <div className="text-sm font-medium text-cyan-300">
                {pretty.min} – {pretty.max}
              </div>
            </div>
            <div className="px-2">
              <Slider
                min={minPrice}
                max={maxPrice}
                step={10}
                value={range}
                onValueChange={(v) => setRange([v[0], v[1]] as [number, number])}
                className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-cyan-500 [&_[role=slider]]:to-fuchsia-500 [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-lg"
              />
              <div className="flex justify-between text-xs text-neutral-500 mt-2">
                <span>₹{minPrice}</span>
                <span>₹{maxPrice}</span>
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-neutral-300">Sort By</Label>
            <div className="flex gap-2">
              <Button
                variant={sort === "price-asc" ? "default" : "outline"}
                size="sm"
                onClick={() => setSort("price-asc")}
                className={
                  sort === "price-asc"
                    ? "bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white border-0"
                    : "border-neutral-700 text-neutral-300 hover:border-cyan-500/50 hover:text-cyan-300"
                }
              >
                Price: Low to High
              </Button>
              <Button
                variant={sort === "price-desc" ? "default" : "outline"}
                size="sm"
                onClick={() => setSort("price-desc")}
                className={
                  sort === "price-desc"
                    ? "bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white border-0"
                    : "border-neutral-700 text-neutral-300 hover:border-cyan-500/50 hover:text-cyan-300"
                }
              >
                Price: High to Low
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
