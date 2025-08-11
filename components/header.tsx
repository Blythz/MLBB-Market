"use client"

import Link from "next/link"
import { useMemo } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import AuthProvider, { useAuth } from "@/components/auth-provider"
import LoginDialog from "@/components/login-dialog"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Heart } from "lucide-react"
import WishlistSheet from "./wishlist-sheet"
import { useWishlist } from "@/hooks/use-wishlist"

function initials(name?: string, email?: string) {
  const base = name || email || "U"
  const parts = base.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U"
}

function HeaderInner() {
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const { user, profile, loading, signOut } = useAuth()
  const { count } = useWishlist()
  const canPost = useMemo(() => {
    const role = profile?.role
    const status = profile?.sellerStatus
    return role === "admin" || status === "approved"
  }, [profile])

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-4">
        <Link
          href="/"
          className="font-semibold tracking-tight bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-emerald-400 bg-clip-text text-transparent"
        >
          MLBB Market
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/sellers" className="text-xs text-neutral-300 hover:text-white">
            Verified Sellers
          </Link>
          <button
            onClick={() => setWishlistOpen(true)}
            className="relative inline-flex items-center gap-2 rounded-md p-1.5 hover:bg-neutral-900"
            aria-label="Open wishlist"
          >
            <Heart className="h-5 w-5 text-neutral-300" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-cyan-500 px-1.5 text-[10px] font-semibold text-white">
                {count}
              </span>
            )}
          </button>
          {!loading && !user && <LoginDialog />}

          {!loading && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("inline-flex items-center gap-2 rounded-md p-1.5 hover:bg-neutral-900")}>
                  <Avatar className="h-7 w-7">
                    <AvatarImage
                      src={profile?.photoURL || user.photoURL || "/placeholder.svg?height=64&width=64&query=avatar"}
                      alt="Profile avatar"
                    />
                    <AvatarFallback>
                      {initials(profile?.displayName || profile?.fullName, user.email || undefined)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-neutral-800 bg-neutral-950 text-neutral-200">
                <DropdownMenuItem asChild>
                  <Link href={`/seller/${user.uid}`}>View Profile</Link>
                </DropdownMenuItem>
                {canPost && (
                  <DropdownMenuItem asChild>
                    <Link href="/new">New Listing</Link>
                  </DropdownMenuItem>
                )}
                {!canPost && (
                  <DropdownMenuItem asChild>
                    <Link href="/sellers">Become a Seller</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
      <WishlistSheet open={wishlistOpen} onOpenChange={setWishlistOpen} />
    </header>
  )
}

export default function Header() {
  // Ensure AuthProvider wraps header content so avatar/profile is available
  return (
    <AuthProvider>
      <HeaderInner />
    </AuthProvider>
  )
}
