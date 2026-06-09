"use client"
import { useEffect } from "react"
import { signOut } from "next-auth/react"

export default function SignOutPage() {
  useEffect(() => {
    signOut({ callbackUrl: "/" })
  }, [])

  return (
    <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center">
      <div className="text-white/40 text-sm">Signing out...</div>
    </div>
  )
}