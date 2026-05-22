"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function RafflePage() {
  const params = useParams()
  const [wallet, setWallet] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        return prev
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])
const handleSubmit = async () => {
  if (!wallet) return
  const { id } = params
  await supabase.from("raffle_entries").insert({
    raffle_id: id,
    wallet_address: wallet,
  })
  setSubmitted(true)
}
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-6 py-12">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <span className="text-purple-400 text-sm font-medium">LIVE RAFFLE</span>
          <h1 className="text-3xl font-bold mt-2">Raffle #{params.id}</h1>
          <p className="text-white/60 mt-2">Complete the tasks below and submit your wallet to enter.</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <p className="text-sm text-white/50 mb-1">Time remaining</p>
          <div className="text-3xl font-mono font-bold text-purple-400">
            {String(timeLeft.hours).padStart(2, "0")}:
            {String(timeLeft.minutes).padStart(2, "0")}:
            {String(timeLeft.seconds).padStart(2, "0")}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 space-y-3">
          <h2 className="font-semibold mb-4">Tasks</h2>
          {["Follow @RaffleHQ on X", "Like the pinned post", "Retweet the announcement"].map((task, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-white/70">
              <div className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0" />
              {task}
            </div>
          ))}
        </div>

        {!submitted ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="font-semibold mb-4">Submit Your Wallet</h2>
            <input
              type="text"
              value={wallet}
              onChange={e => setWallet(e.target.value)}
              placeholder="0x... or SOL address"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500 mb-4"
            />
            <button
              onClick={handleSubmit}
              className="w-full bg-purple-600 hover:bg-purple-500 transition-colors text-white font-medium py-3 rounded-lg"
            >
              Enter Raffle
            </button>
          </div>
        ) : (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <h2 className="font-semibold text-green-400">You&apos;re entered!</h2>
            <p className="text-white/60 text-sm mt-1">{wallet}</p>
          </div>
        )}
      </div>
    </div>
  )
}