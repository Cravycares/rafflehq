// @ts-nocheck
"use client";

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

function FillRateBadge({ rate }: { rate: number }) {
  const color =
    rate >= 80 ? "text-green-300 bg-green-500/10 border-green-500/20" :
    rate >= 50 ? "text-yellow-300 bg-yellow-500/10 border-yellow-500/20" :
                 "text-red-300 bg-red-500/10 border-red-500/20"
  const label =
    rate >= 80 ? "High engagement" :
    rate >= 50 ? "Medium engagement" : "Low engagement"
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${color}`}>
      <span className="font-bold">{rate}% fill rate</span>
      <span className="opacity-60">· {label}</span>
    </div>
  )
}

function RaffleCountdown({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState("")
  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft("Ended"); return }
      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`)
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [endsAt])
  return <span className="font-mono text-green-400 text-lg font-bold">{timeLeft}</span>
}

type Allocation = { community: string; team: string }
type Requirements = {
  xFollows: string[]
  xLikes: string[]
  xRetweets: string[]
  startsAt: string
  endsAt: string
}

function getDefaultRequirements(): Requirements {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 16)
  return {
    xFollows: [""],
    xLikes: [""],
    xRetweets: [""],
    startsAt: fmt(new Date(now.getTime() + 60 * 60 * 1000)),
    endsAt: fmt(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
  }
}

export default function DashboardContent() {
  const { data: session } = useSession()
  const xHandle = (session as any)?.xHandle

  const [project, setProject] = useState(null)
  const [requests, setRequests] = useState([])
  const [activeRaffles, setActiveRaffles] = useState([])
  const [endedRaffles, setEndedRaffles] = useState([])
  const [myCollabs, setMyCollabs] = useState([])
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({})
  const [teamWallets, setTeamWallets] = useState<Record<string, any[]>>({})
  const [newWallets, setNewWallets] = useState<Record<string, string>>({})
  const [submittingWallet, setSubmittingWallet] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [tab, setTab] = useState<"" | "active" | "ended" | "my_collabs">("")
  const [allocations, setAllocations] = useState<Record<number, Allocation>>({})
  const [acceptedIds, setAcceptedIds] = useState<number[]>([])
  const [declinedIds, setDeclinedIds] = useState<number[]>([])
  const [showModal, setShowModal] = useState(false)
  const [pendingAcceptId, setPendingAcceptId] = useState<number | null>(null)
  const [requirements, setRequirements] = useState<Requirements>(() => getDefaultRequirements())

  useEffect(() => {
    if (!xHandle) return
    const load = async () => {
      const { data: proj } = await supabase
        .from("projects")
        .select("*")
        .eq("x_handle", `@${xHandle}`)
        .maybeSingle()
      setProject(proj)
      if (!proj) return

      // Incoming requests (Project A side)
      const { data: reqs } = await supabase
        .from("collab_requests")
        .select("*, project_b:project_b_id(name, x_handle, fill_rate, acceptance_rate, total_collabs)")
        .eq("project_a_id", proj.id)
        .eq("status", "pending")
      setRequests(reqs || [])

      // Raffles (Project A side)
      const { data: raffles } = await supabase
        .from("raffles")
        .select("*")
        .eq("project_a_id", proj.id)
      setActiveRaffles((raffles || []).filter((r: any) => r.status === "live"))
      setEndedRaffles((raffles || []).filter((r: any) => r.status === "ended"))

      // Outgoing requests (Project B side)
      const { data: outgoing } = await supabase
        .from("collab_requests")
        .select("*, project_a:project_a_id(name, x_handle)")
        .eq("project_b_id", proj.id)
      
      if (outgoing && outgoing.length > 0) {
        // Fetch associated raffles
        const { data: collabRaffles } = await supabase
          .from("raffles")
          .select("*")
          .in("collab_request_id", outgoing.map((r: any) => r.id))

        // Attach raffle to each request
        const withRaffles = outgoing.map((req: any) => ({
          ...req,
          raffle: collabRaffles?.find((r: any) => r.collab_request_id === req.id) || null
        }))
        setMyCollabs(withRaffles)

        // Fetch entry counts
        const counts: Record<string, number> = {}
        const wallets: Record<string, any[]> = {}
        for (const req of withRaffles) {
          if (req.raffle) {
            const { count } = await supabase
              .from("raffle_entries")
              .select("*", { count: "exact", head: true })
              .eq("raffle_id", req.raffle.id)
            counts[req.raffle.id] = count || 0

            const { data: tw } = await supabase
              .from("team_wallets")
              .select("*")
              .eq("raffle_id", req.raffle.id)
              .eq("project_b_id", proj.id)
            wallets[req.raffle.id] = tw || []
          }
        }
        setEntryCounts(counts)
        setTeamWallets(wallets)
      }
    }
    load()
  }, [xHandle])

  // Refresh entry counts every 30 seconds
  useEffect(() => {
    if (tab !== "my_collabs") return
    const interval = setInterval(async () => {
      const counts: Record<string, number> = {}
      for (const collab of myCollabs) {
        if (collab.raffle) {
          const { count } = await supabase
            .from("raffle_entries")
            .select("*", { count: "exact", head: true })
            .eq("raffle_id", collab.raffle.id)
          counts[collab.raffle.id] = count || 0
        }
      }
      setEntryCounts(counts)
    }, 30000)
    return () => clearInterval(interval)
  }, [tab, myCollabs])

  const submitTeamWallet = async (raffleId: string, projectId: string) => {
  const wallet = newWallets[raffleId]?.trim()
  if (!wallet || !projectId) return
  setSubmittingWallet(prev => ({ ...prev, [raffleId]: true }))
  
  const { error } = await supabase.from("team_wallets").insert({
    raffle_id: raffleId,
    project_b_id: projectId,
    wallet_address: wallet,
  })
  
  if (error) {
    console.error("Team wallet insert error:", error)
    setSubmittingWallet(prev => ({ ...prev, [raffleId]: false }))
    return
  }

  const { data: tw } = await supabase
    .from("team_wallets")
    .select("*")
    .eq("raffle_id", raffleId)
    .eq("project_b_id", projectId)
  setTeamWallets(prev => ({ ...prev, [raffleId]: tw || [] }))
  setNewWallets(prev => ({ ...prev, [raffleId]: "" }))
  setSubmittingWallet(prev => ({ ...prev, [raffleId]: false }))
}

  const copyRaffleLink = (raffleId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/raffles/${raffleId}`)
    setCopiedId(raffleId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const pendingCount = requests.filter(r => !acceptedIds.includes(r.id) && !declinedIds.includes(r.id)).length
  const totalDecided = acceptedIds.length + declinedIds.length
  const myAcceptanceRate = totalDecided > 0 ? Math.round((acceptedIds.length / totalDecided) * 100) : 34

  const updateAlloc = (id: number, field: keyof Allocation, value: string) =>
    setAllocations(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))

  const openRequirementsModal = (id: number) => {
    const community = parseInt(allocations[id]?.community || "0")
    if (!community || community <= 0) { alert("Please enter at least 1 community spot."); return }
    setPendingAcceptId(id)
    setRequirements(getDefaultRequirements())
    setShowModal(true)
  }

  const updateArrayField = (field: "xFollows" | "xLikes" | "xRetweets", index: number, value: string) => {
    setRequirements(prev => {
      const updated = [...prev[field]]
      updated[index] = value
      return { ...prev, [field]: updated }
    })
  }

  const addArrayField = (field: "xFollows" | "xLikes" | "xRetweets") =>
    setRequirements(prev => ({ ...prev, [field]: [...prev[field], ""] }))

  const removeArrayField = (field: "xFollows" | "xLikes" | "xRetweets", index: number) =>
    setRequirements(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }))

  const handleAccept = async () => {
    const id = pendingAcceptId
    if (!id) return
    const community = parseInt(allocations[id]?.community || "0")
    const req = requests.find((r: any) => r.id === id)
    if (!req) return

    await supabase.from("collab_requests").update({
      status: "accepted",
      community_spots: community,
      team_spots: parseInt(allocations[id]?.team || "0"),
      responded_at: new Date().toISOString()
    }).eq("id", id)

    const { data: raffle } = await supabase.from("raffles").insert({
      collab_request_id: id,
      project_a_id: project?.id,
      project_b_id: req.project_b_id,
      title: `${project?.name} x ${req.project_b?.name}`,
      community_spots: community,
      team_spots: parseInt(allocations[id]?.team || "0"),
      status: "live",
      starts_at: new Date(requirements.startsAt).toISOString(),
      ends_at: new Date(requirements.endsAt).toISOString(),
    }).select().single()

    if (raffle) {
      await supabase.from("raffle_requirements").insert({
        raffle_id: raffle.id,
        discord_server_id: req.discord_server_id || null,
        discord_server_name: req.discord_server_name || null,
        discord_role_id: req.discord_role_id || null,
        discord_role_name: req.discord_role_name || null,
        x_follow_accounts: requirements.xFollows.filter(v => v.trim()),
        x_like_post_urls: requirements.xLikes.filter(v => v.trim()),
        x_retweet_post_urls: requirements.xRetweets.filter(v => v.trim()),
      })
    }

    setAcceptedIds(prev => [...prev, id])
    setShowModal(false)
    setPendingAcceptId(null)
  }

  const handleDrawWinners = async (raffle: any) => {
    if (!confirm(`Draw winners for "${raffle.title}"? This cannot be undone.`)) return

    const { data: entries } = await supabase
      .from("raffle_entries")
      .select("wallet_address, discord_username")
      .eq("raffle_id", raffle.id)
      .eq("is_fully_verified", true)

    const { data: tw } = await supabase
      .from("team_wallets")
      .select("wallet_address")
      .eq("raffle_id", raffle.id)

    await supabase.from("raffles").update({ status: "ended", winners_drawn: true }).eq("id", raffle.id)

    const rows = ["wallet_address,discord_username,type"]
    const shuffled = (entries || []).sort(() => Math.random() - 0.5)
    shuffled.slice(0, raffle.community_spots).forEach((e: any) =>
      rows.push(`${e.wallet_address},${e.discord_username || ""},community`)
    )
    ;(tw || []).forEach((w: any) =>
      rows.push(`${w.wallet_address},,team`)
    )

    const blob = new Blob([rows.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${raffle.title}-winners.csv`
    a.click()
    URL.revokeObjectURL(url)
    setActiveRaffles(prev => prev.filter((r: any) => r.id !== raffle.id))
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-1">Set Raffle Requirements</h2>
            <p className="text-sm text-white/50 mb-6">Set when the raffle runs and what entrants must complete.</p>
            <div className="space-y-5">
              <div>
                <label className="text-xs text-white/50 block mb-1.5">Raffle Start Time</label>
                <input type="datetime-local" value={requirements.startsAt}
                  onChange={e => setRequirements(prev => ({ ...prev, startsAt: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 [color-scheme:dark]" />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1.5">Raffle End Time</label>
                <input type="datetime-local" value={requirements.endsAt}
                  onChange={e => setRequirements(prev => ({ ...prev, endsAt: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 [color-scheme:dark]" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/50">X Accounts to Follow</label>
                  <button onClick={() => addArrayField("xFollows")} className="text-xs text-purple-400 hover:text-purple-300">+ Add</button>
                </div>
                {requirements.xFollows.map((val, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" placeholder="e.g. RaffleHQ" value={val}
                      onChange={e => updateArrayField("xFollows", i, e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500" />
                    {requirements.xFollows.length > 1 && (
                      <button onClick={() => removeArrayField("xFollows", i)} className="text-white/30 hover:text-red-400 px-2">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/50">Post URLs to Like</label>
                  <button onClick={() => addArrayField("xLikes")} className="text-xs text-purple-400 hover:text-purple-300">+ Add</button>
                </div>
                {requirements.xLikes.map((val, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" placeholder="https://x.com/..." value={val}
                      onChange={e => updateArrayField("xLikes", i, e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500" />
                    {requirements.xLikes.length > 1 && (
                      <button onClick={() => removeArrayField("xLikes", i)} className="text-white/30 hover:text-red-400 px-2">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/50">Post URLs to Retweet</label>
                  <button onClick={() => addArrayField("xRetweets")} className="text-xs text-purple-400 hover:text-purple-300">+ Add</button>
                </div>
                {requirements.xRetweets.map((val, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" placeholder="https://x.com/..." value={val}
                      onChange={e => updateArrayField("xRetweets", i, e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500" />
                    {requirements.xRetweets.length > 1 && (
                      <button onClick={() => removeArrayField("xRetweets", i)} className="text-white/30 hover:text-red-400 px-2">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 font-medium py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
              <button onClick={handleAccept} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">Confirm & Go Live</button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-white/5 bg-[#080808]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-sm font-bold">R</div>
            <span className="font-semibold text-lg">RaffleHQ</span>
          </a>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
              <span className="text-sm text-white/70">{project?.x_handle || xHandle}</span>
              <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full">✓ verified</span>
            </div>
            <button onClick={() => window.location.href = "/api/auth/signout"} className="text-sm text-white/40 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg transition-colors">Sign out</button>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-6 max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="mb-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="text-sm text-purple-400 font-medium uppercase tracking-widest mb-2">Dashboard</div>
            <h1 className="text-3xl font-bold mb-1">{project?.name}</h1>
            <p className="text-white/40 text-sm">List spots, request collabs, and manage your raffles.</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 flex items-center gap-4 flex-shrink-0">
            <div>
              <div className="text-xs text-white/40 mb-1">Your acceptance rate</div>
              <div className="text-2xl font-bold text-purple-400">{myAcceptanceRate}%</div>
              <div className="text-xs text-white/30 mt-0.5">Visible to projects browsing you</div>
            </div>
            <div className="w-12 h-12 relative flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#7c3aed" strokeWidth="3"
                  strokeDasharray={`${myAcceptanceRate} ${100 - myAcceptanceRate}`} strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Pending Requests", value: String(pendingCount), color: "text-yellow-400" },
            { label: "Active Raffles", value: String(activeRaffles.length), color: "text-green-400" },
            { label: "My Collabs", value: String(myCollabs.length), color: "text-blue-400" },
            { label: "Ended Raffles", value: String(endedRaffles.length), color: "text-purple-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
              <div className={`text-2xl font-bold mb-1 ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/40">{s.label}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-1 mb-8 w-fit flex-wrap">
          {([
            { key: "", label: `Incoming${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
            { key: "active", label: `Active (${activeRaffles.length})` },
            { key: "ended", label: `Ended (${endedRaffles.length})` },
            { key: "my_collabs", label: `My Collabs (${myCollabs.length})` },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* INCOMING REQUESTS */}
        {tab === "" && (
          <div className="space-y-4">
            {requests.map(req => {
              const isAccepted = acceptedIds.includes(req.id)
              const isDeclined = declinedIds.includes(req.id)
              const alloc = allocations[req.id]
              const community = parseInt(alloc?.community || "0")
              const team = parseInt(alloc?.team || "0")
              const total = community + team
              return (
                <div key={req.id} className={`bg-white/[0.03] border rounded-2xl p-6 transition-all ${
                  isAccepted ? "border-green-500/30 bg-green-500/5" :
                  isDeclined ? "border-red-500/20 opacity-50" : "border-white/[0.08]"
                }`}>
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center font-bold text-blue-300 text-lg">
                          {req.project_b?.name?.[0]}
                        </div>
                        <div>
                          <div className="font-semibold">{req.project_b?.name}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/40">{req.project_b?.x_handle}</span>
                            <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">✓ verified</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <FillRateBadge rate={req.project_b?.fill_rate || 0} />
                        <div className="text-xs text-white/30 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-full">
                          {req.project_b?.total_collabs || 0} past collabs
                        </div>
                      </div>
                      <p className="text-sm text-white/50 leading-relaxed mb-3">{req.message}</p>
                      <span className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-white/60">
                        Requesting <strong className="text-white">{req.requested_spots}</strong> spots
                      </span>
                    </div>

                    {!isAccepted && !isDeclined && (
                      <div className="flex flex-col gap-3 min-w-[210px]">
                        <div className="bg-black/20 border border-white/[0.08] rounded-xl p-4">
                          <div className="text-xs text-white/40 uppercase tracking-widest mb-3">Allocate spots</div>
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs text-white/50 mb-1 flex items-center gap-1.5 block">
                                <span className="w-2 h-2 bg-purple-400 rounded-full inline-block"></span>Community spots
                              </label>
                              <input type="number" min="0" placeholder="e.g. 10"
                                value={alloc?.community || ""}
                                onChange={e => updateAlloc(req.id, "community", e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50" />
                            </div>
                            <div>
                              <label className="text-xs text-white/50 mb-1 flex items-center gap-1.5 block">
                                <span className="w-2 h-2 bg-blue-400 rounded-full inline-block"></span>Team spots
                              </label>
                              <input type="number" min="0" placeholder="e.g. 5"
                                value={alloc?.team || ""}
                                onChange={e => updateAlloc(req.id, "team", e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                            </div>
                          </div>
                          {total > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/[0.08]">
                              <div className="h-1.5 rounded-full overflow-hidden bg-white/10 flex">
                                <div className="h-full bg-purple-500" style={{ width: `${(community / total) * 100}%` }} />
                                <div className="h-full bg-blue-500" style={{ width: `${(team / total) * 100}%` }} />
                              </div>
                              <div className="flex justify-between text-xs mt-1">
                                <span className="text-purple-400">{community} community</span>
                                <span className="text-blue-400">{team} team</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <button onClick={() => openRequirementsModal(req.id)}
                          className="w-full bg-green-600 hover:bg-green-500 transition-colors text-white font-medium py-2.5 rounded-xl text-sm">
                          Accept & Set Requirements
                        </button>
                        <button onClick={() => setDeclinedIds(prev => [...prev, req.id])}
                          className="w-full bg-white/5 hover:bg-red-500/10 hover:text-red-300 transition-colors text-white/40 font-medium py-2 rounded-xl text-sm">
                          Decline
                        </button>
                      </div>
                    )}

                    {isAccepted && (
                      <div className="flex-shrink-0 text-right">
                        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-300 text-sm px-4 py-2 rounded-xl mb-2">✓ Accepted</div>
                        <div className="text-xs text-green-400/60 mt-1">Raffle now live ✓</div>
                      </div>
                    )}
                    {isDeclined && (
                      <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 text-sm px-4 py-2 rounded-xl h-fit">✕ Declined</div>
                    )}
                  </div>
                </div>
              )
            })}
            {pendingCount === 0 && (
              <div className="text-center py-16 text-white/30"><div className="text-4xl mb-3">📭</div><div className="text-sm">No pending requests</div></div>
            )}
          </div>
        )}

        {/* ACTIVE RAFFLES */}
        {tab === "active" && (
          <div className="space-y-4">
            {activeRaffles.map(r => {
              const hasEnded = r.ends_at && new Date(r.ends_at) <= new Date()
              return (
                <div key={r.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="font-semibold">{r.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">{r.community_spots} community</span>
                        <span className="text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full">{r.team_spots} team</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {hasEnded ? (
                        <button onClick={() => handleDrawWinners(r)}
                          className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                          Draw Winners
                        </button>
                      ) : (
                        <div className="text-right">
                          <div className="text-xs text-white/40 mb-1">Time remaining</div>
                          {r.ends_at && <RaffleCountdown endsAt={r.ends_at} />}
                        </div>
                      )}
                      <button
  onClick={() => { window.location.href = `/raffles/${r.id}` }}
  className="text-sm bg-white/5 hover:bg-purple-600/20 border border-white/10 hover:border-purple-500/50 text-white px-4 py-2 rounded-lg transition-colors"
>
  View →
</button>
                    </div>
                  </div>
                </div>
              )
            })}
            {activeRaffles.length === 0 && (
              <div className="text-center py-16 text-white/30"><div className="text-4xl mb-3">🎯</div><div className="text-sm">No active raffles</div></div>
            )}
          </div>
        )}

        {/* ENDED RAFFLES */}
        {tab === "ended" && (
          <div className="space-y-4">
            {endedRaffles.map(r => {
              const total = (r.community_spots || 0) + (r.team_spots || 0)
              return (
                <div key={r.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold mb-2">{r.title}</div>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">{r.community_spots} community</span>
                      <span className="text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full">{r.team_spots} team</span>
                      <span className="text-white/40">• {total} total</span>
                    </div>
                  </div>
                  <button onClick={() => handleDrawWinners(r)}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
                    ⬇ Download {total} wallets (.csv)
                  </button>
                </div>
              )
            })}
            {endedRaffles.length === 0 && (
              <div className="text-center py-16 text-white/30"><div className="text-4xl mb-3">📊</div><div className="text-sm">No ended raffles yet</div></div>
            )}
          </div>
        )}

        {/* MY COLLABS */}
        {tab === "my_collabs" && (
          <div className="space-y-4">
            {myCollabs.map((collab: any) => {
              const raffle = collab.raffle
              const submitted = raffle ? (teamWallets[raffle.id] || []) : []
              const remaining = raffle ? (raffle.team_spots || 0) - submitted.length : 0
              return (
                <div key={collab.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="font-semibold mb-1">{collab.project_a?.name}</div>
                      <div className="text-xs text-white/40">{collab.project_a?.x_handle}</div>
                    </div>
                    <div className={`text-xs px-3 py-1 rounded-full border flex-shrink-0 ${
                      collab.status === "accepted" ? "bg-green-500/10 border-green-500/20 text-green-300" :
                      collab.status === "declined" ? "bg-red-500/10 border-red-500/20 text-red-300" :
                      "bg-yellow-500/10 border-yellow-500/20 text-yellow-300"
                    }`}>
                      {collab.status === "accepted" ? "✓ Accepted" : collab.status === "declined" ? "✕ Declined" : "⏳ Pending"}
                    </div>
                  </div>

                  {collab.status === "accepted" && raffle && (
                    <div className="space-y-4">
                      {/* Raffle info */}
                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div>
                            <div className="text-sm font-semibold mb-1">{raffle.title}</div>
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <span className="text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">{raffle.community_spots} community</span>
                              <span className="text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full">{raffle.team_spots} team spots allocated</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {raffle.ends_at && new Date(raffle.ends_at) > new Date() && (
                              <div className="text-right">
                                <div className="text-xs text-white/40 mb-0.5">Time remaining</div>
                                <RaffleCountdown endsAt={raffle.ends_at} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Live entry count */}
                      <div className="flex items-center gap-4">
                        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <div>
                            <div className="text-xs text-white/40">Live entries</div>
                            <div className="text-xl font-bold text-white">{entryCounts[raffle.id] ?? "—"}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => window.location.href = `/raffles/${raffle.id}`}
                            className="text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-lg transition-colors">
                            View Raffle →
                          </button>
                          <button onClick={() => copyRaffleLink(raffle.id)}
                            className="text-sm bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors">
                            {copiedId === raffle.id ? "Copied! ✓" : "Copy Link"}
                          </button>
                        </div>
                      </div>

                      {/* Team wallet submission */}
                      {raffle.team_spots > 0 && (
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-semibold text-blue-300">Team Wallets</div>
                            <div className="text-xs text-white/40">{submitted.length} / {raffle.team_spots} submitted</div>
                          </div>

                          {submitted.length > 0 && (
                            <div className="space-y-1.5 mb-3">
                              {submitted.map((w: any, i: number) => (
                                <div key={w.id} className="flex items-center gap-2 text-xs">
                                  <span className="text-white/40">#{i + 1}</span>
                                  <span className="font-mono text-white/70 truncate">{w.wallet_address}</span>
                                  <span className="text-green-400 ml-auto flex-shrink-0">✓</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {remaining > 0 && (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder={`Wallet address (${remaining} slot${remaining > 1 ? "s" : ""} remaining)`}
                                value={newWallets[raffle.id] || ""}
                                onChange={e => setNewWallets(prev => ({ ...prev, [raffle.id]: e.target.value }))}
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
                              />
                              <button
                                onClick={() => submitTeamWallet(raffle.id, project?.id)}
                                disabled={!newWallets[raffle.id]?.trim() || submittingWallet[raffle.id]}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors flex-shrink-0"
                              >
                                {submittingWallet[raffle.id] ? "..." : "Submit"}
                              </button>
                            </div>
                          )}

                          {remaining === 0 && (
                            <div className="text-xs text-green-400 mt-1">All team wallets submitted ✓</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {collab.status === "pending" && (
                    <p className="text-sm text-white/40">Waiting for {collab.project_a?.name} to respond to your request.</p>
                  )}
                  {collab.status === "declined" && (
                    <p className="text-sm text-white/40">Your request was declined by {collab.project_a?.name}.</p>
                  )}
                </div>
              )
            })}
            {myCollabs.length === 0 && (
              <div className="text-center py-16 text-white/30">
                <div className="text-4xl mb-3">🤝</div>
                <div className="text-sm">No outgoing requests yet</div>
                <a href="/projects" className="text-purple-400 text-sm hover:text-purple-300 mt-2 inline-block">Browse projects to request spots →</a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}