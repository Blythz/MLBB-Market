"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/utils/format"
import ReviewStars from "@/components/reviews/review-stars"
import { useSellerReviewSummary } from "@/hooks/use-seller-review-summary"
import { Eye, Shield } from "lucide-react"

export type ListingCardProps = {
  id?: string
  title?: string
  description?: string
  price?: number
  imageUrl?: string
  sellerId?: string
  sellerName?: string
  sellerAvatar?: string
  isVerifiedSeller?: boolean
}

function initials(name?: string) {
  if (!name) return "ML"
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "ML"
}

export default function ListingCard({
  id = "demo",
  title = "MLBB Account",
  description = "High-rank account with exclusive skins.",
  price = 199,
  imageUrl = "/placeholder.svg?height=900&width=600",
  sellerId = "demo-seller",
  sellerName = "Seller",
  sellerAvatar = "",
  isVerifiedSeller = false,
}: ListingCardProps) {
  const { avg, count } = useSellerReviewSummary(sellerId)

  return (
    <Link href={"/listing/" + id} className="group block h-full">
      <Card className="h-full overflow-hidden border-neutral-800/50 bg-gradient-to-b from-neutral-900/50 to-neutral-900/80 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1">
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          <img
            src={imageUrl || "/placeholder.svg?height=900&width=600&query=mlbb%20portrait"}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="flex items-center gap-2 text-white font-medium">
              <Eye className="h-4 w-4" />
              View Details
            </div>
          </div>

          {/* Price badge */}
          <div className="absolute top-3 left-3">
            <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
              {formatCurrency(price)}
            </div>
          </div>

          {/* Verified seller badge */}
          {isVerifiedSeller && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 shadow-lg">
                <Shield className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <h3 className="line-clamp-2 text-base font-bold bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-emerald-400 bg-clip-text text-transparent leading-tight">
              {title}
            </h3>
            <p className="line-clamp-2 text-sm text-neutral-400 leading-relaxed">{description}</p>
          </div>

          {/* Seller info */}
          <div className="flex items-center gap-3 pt-2 border-t border-neutral-800/50">
            <Avatar className="h-8 w-8 ring-2 ring-neutral-700">
              <AvatarImage
                src={sellerAvatar || "/placeholder.svg?height=64&width=64&query=avatar"}
                alt={sellerName ? sellerName + " avatar" : "Seller avatar"}
              />
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-white text-xs font-semibold">
                {initials(sellerName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-300 truncate">{sellerName}</span>
                {isVerifiedSeller && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
              </div>
              <ReviewStars rating={avg} count={count} size={12} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
