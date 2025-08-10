import type React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import Header from "@/components/header"
import AuthProvider from "@/components/auth-provider"

export const metadata = {
  title: "MLBB Account Marketplace",
  description: "Buy & sell MLBB accounts. Fast, sleek, and secure.",
}

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className={cn("min-h-dvh bg-neutral-950 text-neutral-100 antialiased")}>
        <Header />
        <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 md:px-6">{children}</main>
        <footer className="border-t border-neutral-800/80">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <p className="opacity-80">{"© Dawnlight store 2024"}</p>
            <nav className="flex flex-wrap items-center gap-4">
              <Link href="/" className="hover:text-neutral-200 transition-colors">
                Browse
              </Link>
              <Link href="/privacy" className="hover:text-neutral-200 transition-colors">
                Privacy and Policy
              </Link>
              <Link href="/terms" className="hover:text-neutral-200 transition-colors">
                Terms and Conditions
              </Link>
              <Link href="/faq" className="hover:text-neutral-200 transition-colors">
                FAQ
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </AuthProvider>
  )
}
