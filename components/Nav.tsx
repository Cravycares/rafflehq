"use client"
import { useState } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import { createPortal } from "react-dom"
import { Logo } from "@/components/Logo"

function ListSpotsModal({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession()
  const [totalSpots, setTotalSpots] = useState("")
  const [communityPct, setCommunityPct] = useState(70)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const handleSave = async () => {
    if (!totalSpots || parseInt(totalSpots) <= 0) return alert("Enter a valid number of spots")
    setSaving(true)
    const xHandle = (session as any)?.xHandle
    await supabase.from("projects").upsert({
      x_handle: `@${xHandle}`,
      name: xHandle,
      x_verified: true,
      total_spots_listed: parseInt(totalSpots),
      community_spots_pct: communityPct,
      team_spots_pct: 100 - communityPct,
    }, { onConflict: "x_handle" }).select()
    setSaving(false)
    setDone(true)
  }

  if (done) return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="flex justify-center pt-24 px-4 pb-8">
        <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-xl font-bold mb-2">Spots Listed!</h2>
          <p className="text-white/50 text-sm mb-6">Your project is now live on the marketplace.</p>
          <a href="/projects" className="block w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-xl transition-colors text-center">
            View on Marketplace
          </a>
        </div>
      </div>
    </div>, document.body)

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="flex justify-center pt-24 px-4 pb-8">
        <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">List Your Spots</h2>
            <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
          </div>
          <div className="space-y-6">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Total whitelist spots to share</label>
              <input type="number" value={totalSpots} onChange={e => setTotalSpots(e.target.value)}
                placeholder="e.g. 500"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none" />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-2 block">
                Community spots: <span className="text-purple-400 font-medium">{communityPct}%</span>
                <span className="text-white/30 ml-2">· Team spots: {100 - communityPct}%</span>
              </label>
              <input type="range" min={50} max={100} value={communityPct}
                onChange={e => setCommunityPct(parseInt(e.target.value))}
                className="w-full accent-purple-600" />
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-sm">
              <div className="flex justify-between text-white/60 mb-1">
                <span>Community raffle spots</span>
                <span className="text-white">{totalSpots ? Math.floor(parseInt(totalSpots) * communityPct / 100) : "–"}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Team wallet spots</span>
                <span className="text-white">{totalSpots ? Math.ceil(parseInt(totalSpots) * (100 - communityPct) / 100) : "–"}</span>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors">
              {saving ? "Saving..." : "List My Spots"}
            </button>
          </div>
        </div>
      </div>
    </div>, document.body)
}

export default function Nav() {
  const { data: session } = useSession()
  const [showModal, setShowModal] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080808]/80 backdrop-blur-md">
      {showModal && <ListSpotsModal onClose={() => setShowModal(false)} />}
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/"><Logo size={36} /></a>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="/#how" className="hover:text-white transition-colors">How it works</a>
          <a href="/#raffles" className="hover:text-white transition-colors">Live Raffles</a>
          <a href="/projects" className="hover:text-white transition-colors">Projects</a>
        </div>
        {session ? (
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">Dashboard</a>
            <span className="text-white/60 text-sm">@{(session as any).xHandle}</span>
            <button onClick={() => setShowModal(true)}
              className="bg-purple-600 hover:bg-purple-500 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
              List My Spots
            </button>
            <button onClick={() => signOut({ callbackUrl: "/" })}
              className="bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-white text-sm font-medium px-4 py-2 rounded-lg">
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => signIn("twitter")}
              className="bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-white text-sm font-medium px-4 py-2 rounded-lg">
              Request Spots
            </button>
            <button onClick={() => signIn("twitter")}
              className="bg-purple-600 hover:bg-purple-500 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
              List My Spots
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}