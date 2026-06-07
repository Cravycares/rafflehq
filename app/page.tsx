"use client"
import { useState, useEffect } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import { createPortal } from 'react-dom'
import { Logo } from "@/components/Logo"

const STEPS = [
  { number: "01", role: "Project A", color: "purple", title: "List Your Spots", desc: "Connect your wallet and verify your official X account. Set how many whitelist spots you want to share with partner projects.", icon: "🏛️" },
  { number: "02", role: "Project B", color: "blue", title: "Request Spots", desc: "Verify your X account and send a collaboration request. No DMs, no trust issues — everything is transparent and public.", icon: "📨" },
  { number: "03", role: "Project A", color: "purple", title: "Review & Allocate", desc: "See all incoming requests on your dashboard. Accept the ones you want and set the exact number of spots for each partner.", icon: "✅" },
  { number: "04", role: "Both Projects", color: "green", title: "Raffle Goes Live", desc: "The raffle page goes public instantly. Both verified X accounts are displayed — full transparency for every entrant.", icon: "🚀" },
  { number: "05", role: "Project A", color: "purple", title: "Download Winners", desc: "When the raffle ends, Project A gets the full winners list in one click. Clean wallet CSV, ready for whitelist upload.", icon: "🏆" },
]

function Countdown({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState("")
  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft("Ended"); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${h}h ${m}m ${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endsAt])
  return <span className="font-mono">{timeLeft}</span>
}

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

function NavAuth() {
  const { data: session } = useSession()
  const [showModal, setShowModal] = useState(false)

  if (session) {
    return (
      <>
        {showModal && <ListSpotsModal onClose={() => setShowModal(false)} />}
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
      </>
    )
  }
  return (
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
  )
}

function HeroButtons() {
  const { data: session, status } = useSession()
  const [showModal, setShowModal] = useState(false)

  const handleListSpots = () => {
    if (status === "unauthenticated") { signIn("twitter"); return }
    setShowModal(true)
  }

  const handleRequestSpots = () => {
    if (status === "unauthenticated") { signIn("twitter"); return }
    window.location.href = "/projects"
  }

  return (
    <>
      {showModal && <ListSpotsModal onClose={() => setShowModal(false)} />}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button onClick={handleListSpots}
          className="bg-purple-600 hover:bg-purple-500 transition-colors text-white font-semibold px-8 py-4 rounded-xl text-base">
          List My Spots
        </button>
        <button onClick={handleRequestSpots}
          className="bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-white font-semibold px-8 py-4 rounded-xl text-base">
          Request Spots
        </button>
      </div>
    </>
  )
}

function SideButtons() {
  const { data: session, status } = useSession()
  const [showModal, setShowModal] = useState(false)

  const handleListSpots = () => {
    if (status === "unauthenticated") { signIn("twitter"); return }
    setShowModal(true)
  }

  const handleRequestSpots = () => {
    if (status === "unauthenticated") { signIn("twitter"); return }
    window.location.href = "/projects"
  }

  return (
    <>
      {showModal && <ListSpotsModal onClose={() => setShowModal(false)} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-purple-900/20 border border-purple-500/20 rounded-2xl p-8">
          <div className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-4">Project A — Spot Owner</div>
          <h3 className="text-xl font-bold mb-4">Share spots on your terms</h3>
          <ul className="space-y-3 text-sm text-white/60">
            {["List available spots publicly", "Review partner requests before accepting", "Decide exactly how many spots each partner gets", "Full dashboard to track all collaborations", "One-click winner wallet download (CSV)", "Both projects verified on X for trust"].map(item => (
              <li key={item} className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✓</span> {item}</li>
            ))}
          </ul>
          <button onClick={handleListSpots}
            className="mt-8 w-full bg-purple-600 hover:bg-purple-500 transition-colors text-white font-semibold py-3 rounded-xl text-sm">
            List My Spots
          </button>
        </div>
        <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-8">
          <div className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4">Project B — Spot Requester</div>
          <h3 className="text-xl font-bold mb-4">Get spots for your community</h3>
          <ul className="space-y-3 text-sm text-white/60">
            {["Browse projects sharing spots", "Send a verified collaboration request", "See request status in real time", "Raffle goes live automatically on approval", "Your community enters on the public raffle page", "Full transparency — both X accounts shown"].map(item => (
              <li key={item} className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> {item}</li>
            ))}
          </ul>
          <button onClick={handleRequestSpots}
            className="mt-8 w-full bg-blue-600 hover:bg-blue-500 transition-colors text-white font-semibold py-3 rounded-xl text-sm">
            Request Spots
          </button>
        </div>
      </div>
    </>
  )
}

function LiveRafflesSection() {
  const [raffles, setRaffles] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("raffles")
        .select("*, project_a:project_a_id(name, x_handle), project_b:project_b_id(name, x_handle)")
        .eq("status", "live")
        .order("created_at", { ascending: false })
        .limit(3)
      setRaffles(data || [])
    }
    load()
  }, [])

  const gradients = [
    "from-purple-900 via-purple-700 to-indigo-800",
    "from-pink-900 via-rose-700 to-orange-800",
    "from-yellow-900 via-amber-700 to-orange-700",
  ]

  return (
    <section id="raffles" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <div className="text-sm text-purple-400 font-medium mb-2 uppercase tracking-widest">Live now</div>
            <h2 className="text-3xl md:text-4xl font-bold">Active Collaborations</h2>
          </div>
          <a href="/projects" className="text-sm text-white/50 hover:text-white border border-white/10 px-4 py-2 rounded-lg transition-colors">
            View all
          </a>
        </div>

        {raffles.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <div className="text-4xl mb-3">🎯</div>
            <div className="text-sm">No live raffles right now</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {raffles.map((r, i) => (
              <div key={r.id} onClick={() => window.location.href = `/raffles/${r.id}`}
                className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/20 transition-all hover:-translate-y-1 cursor-pointer">
                <div className={`h-28 bg-gradient-to-br ${gradients[i % gradients.length]} relative`}>
                  <div className="absolute inset-0 flex items-center justify-center gap-3">
                    <div className="bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">{r.project_a?.x_handle}</div>
                    <div className="text-white/60 text-lg">×</div>
                    <div className="bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">{r.project_b?.x_handle}</div>
                  </div>
                  <div className="absolute top-3 right-3 bg-green-500/20 border border-green-500/30 text-green-300 text-xs px-2 py-1 rounded-full">
                    Live
                  </div>
                </div>
                <div className="p-5">
                  <div className="font-semibold mb-1">{r.title}</div>
                  <div className="text-xs text-white/40 mb-4">Whitelist Collaboration</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/40">
                      {r.ends_at && <>Ends in <span className="text-white/70"><Countdown endsAt={r.ends_at} /></span></>}
                    </div>
                    <button className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                      Enter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080808]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size={36} />
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#raffles" className="hover:text-white transition-colors">Live Raffles</a>
            <a href="/projects" className="hover:text-white transition-colors">Projects</a>
          </div>
          <NavAuth />
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-40 pb-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-white/70 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            The first verified whitelist collaboration platform
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Share Whitelist Spots
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
              With Verified Projects
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            No DMs. No trust issues. Projects list their spots, partners request them,
            both verify on X — and the raffle runs transparently on-chain.
          </p>
          <HeroButtons />
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: "Spots Shared", value: "2.4M+" },
            { label: "Verified Projects", value: "1,200+" },
            { label: "Raffles Completed", value: "8,500+" },
            { label: "Wallets Collected", value: "500K+" },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-sm text-white/40">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-sm text-purple-400 font-medium mb-3 uppercase tracking-widest">How it works</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">From listing to winners list</h2>
            <p className="text-white/50 max-w-xl mx-auto">Every step is transparent, every project is verified, every raffle is fair.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {STEPS.map((step, i) => (
              <div key={i} className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 hover:border-white/20 transition-colors">
                <div className={`text-xs font-semibold mb-3 px-2 py-1 rounded-full inline-block ${
                  step.color === "purple" ? "bg-purple-500/20 text-purple-300" :
                  step.color === "blue" ? "bg-blue-500/20 text-blue-300" :
                  "bg-green-500/20 text-green-300"
                }`}>{step.role}</div>
                <div className="text-2xl mb-3">{step.icon}</div>
                <div className="text-xs text-white/30 font-mono mb-2">{step.number}</div>
                <div className="font-semibold text-sm mb-2">{step.title}</div>
                <div className="text-xs text-white/40 leading-relaxed">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* X VERIFICATION BANNER */}
      <section className="px-6 py-12">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/20 rounded-2xl p-8 md:p-12 text-center">
          <div className="text-3xl mb-4">𝕏</div>
          <h3 className="text-2xl md:text-3xl font-bold mb-3">Both Projects Must Verify on X</h3>
          <p className="text-white/50 max-w-xl mx-auto text-sm leading-relaxed">
            Before any raffle goes live, both Project A and Project B must verify their official X accounts.
            This prevents fake projects, protects communities, and makes every collaboration 100% transparent.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 items-center">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm">
              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
              <span className="text-white/70">Project A verified</span>
            </div>
            <div className="text-white/30 text-sm">+</div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span className="text-white/70">Project B verified</span>
            </div>
            <div className="text-white/30 text-sm">=</div>
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-green-300">Raffle goes live</span>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE RAFFLES — real data */}
      <LiveRafflesSection />

      {/* FOR BOTH SIDES */}
      <section className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for both sides</h2>
            <p className="text-white/50">Whether you have spots to give or spots to get</p>
          </div>
          <SideButtons />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-xs font-bold">R</div>
            <span className="font-semibold">RaffleHQ</span>
            <span className="text-white/30 text-sm ml-2">The verified whitelist collaboration platform</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="/projects" className="hover:text-white transition-colors">Projects</a>
            <a href="/dashboard" className="hover:text-white transition-colors">Dashboard</a>
          </div>
        </div>
      </footer>

    </div>
  )
}