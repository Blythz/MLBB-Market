"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FcGoogle } from "react-icons/fc"
import { signInWithGooglePopup, firebaseEnabled } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"

export default function LoginDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleGoogle = async () => {
    if (!firebaseEnabled) {
      toast({
        title: "Firebase not configured",
        description: "Add NEXT_PUBLIC_FIREBASE_* env vars.",
        variant: "destructive",
      })
      return
    }
    try {
      setLoading(true)
      await signInWithGooglePopup()
      setOpen(false)
    } catch (e: any) {
      toast({ title: "Sign-in failed", description: e?.message || "Try again", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-neutral-800 bg-neutral-950 text-neutral-200 hover:bg-neutral-900">
          Sign in
        </Button>
      </DialogTrigger>
      <DialogContent className="border-neutral-800 bg-neutral-950 text-neutral-200">
        <DialogHeader>
          <DialogTitle className="text-lg">Sign in to MLBB Market</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleGoogle}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90"
          >
            <FcGoogle className="h-5 w-5" />
            {loading ? "Signing in..." : "Continue with Google"}
          </Button>
          <p className="text-xs text-neutral-400">We only use your name and profile photo to show avatars.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
