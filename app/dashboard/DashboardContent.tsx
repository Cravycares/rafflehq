// @ts-nocheck
"use client";

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Logo } from "@/components/Logo"
import { signOut } from "next-auth/react"
import Nav from "@/components/Nav"

// ── Design tokens ──────────────────────────────────────────
const VIOLET = "#7C3AED"
const INDIGO = "#4F46E5"
const GOLD = "#D4A853"
const FG = "#F0EEF6"
const FG45 = "rgba(240,238,246,0.45)"
const FG35 = "rgba(240,238,246,0.35)"
const FG08 = "rgba(240,238,246,0.08)"
const FG06 = "rgba(240,238,246,0.06)"
const GRAD = `linear-gradient(135deg, ${VIOLET}, ${INDIGO})`

// ── Helpers ────────────────────────────────────────────────
function fillColor(rate: number) {
  if (rate >= 80) return "#22C55E"
  if (rate >= 50) return GOLD
  return "#EF4444"
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-[3px] w-full rounded-full" style={{ background: FG08 }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
    </div>
  )
}

function ReputationRing({ score, size = 120 }: { score: number; size?: number }) {
  const sw = 5
  const r = (size - sw * 2) / 2
  const circ = r * 2 * Math.PI
  const offset = circ - (Math.min(score, 100) / 100) * circ
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={FG08} strokeWidth={sw} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={GOLD} strokeWidth={sw} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: FG }}>{score}</span>
        <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: GOLD }}>Ethos</span>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: "rgba(240,238,246,0.018)", border: `1px solid ${FG06}` }}>
      <div className="absolute top-0 left-4 right-4 h-px" style={{ background: `linear-gradient(90deg, transparent, rgba(124,58,237,0.5), transparent)` }} />
      <div className="text-2xl font-bold mb-0.5" style={{ color: color || FG }}>{value}</div>
      <div className="text-xs mb-1" style={{ color: FG35 }}>{label}</div>
      {sub && <div className="text-[11px]" style={{ color: FG45 }}>{sub}</div>}
    </div>
  )
}

function FillRateBadge({ rate }: { rate: number }) {
  const color = rate >= 80 ? "text-green-300 bg-green-500/10 border-green-500/20" :
    rate >= 50 ? "text-yellow-300 bg-yellow-500/10 border-yellow-500/20" :
    "text-red-300 bg-red-500/10 border-red-500/20"
  const label = rate >= 80 ? "High engagement" : rate >= 50 ? "Medium engagement" : "Low engagement"
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
      setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`)
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
  const [activeEntryCounts, setActiveEntryCounts] = useState<Record<string, number>>({})
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
      const { data: proj } = await supabase.from("projects").select("*").eq("x_handle", `@${xHandle}`).maybeSingle()
      setProject(proj)
      if (!proj) return

      const { data: reqs } = await supabase
        .from("collab_requests")
        .select("*, project_b:project_b_id(name, x_handle, fill_rate, acceptance_rate, total_collabs)")
        .eq("project_a_id", proj.id).eq("status", "pending")
      setRequests(reqs || [])

      const { data: raffles } = await supabase.from("raffles").select("*").eq("project_a_id", proj.id)
      const liveRaffles = (raffles || []).filter((r: any) => r.status === "live")
      setActiveRaffles(liveRaffles)
      setEndedRaffles((raffles || []).filter((r: any) => r.status === "ended"))

      const activeCounts: Record<string, number> = {}
      for (const r of liveRaffles) {
        const { count } = await supabase.from("raffle_entries").select("*", { count: "exact", head: true }).eq("raffle_id", r.id)
        activeCounts[r.id] = count || 0
      }
      setActiveEntryCounts(activeCounts)

      const { data: outgoing } = await supabase
        .from("collab_requests")
        .select("*, project_a:project_a_id(name, x_handle)")
        .eq("project_b_id", proj.id)

      if (outgoing && outgoing.length > 0) {
        const { data: collabRaffles } = await supabase.from("raffles").select("*").in("collab_request_id", outgoing.map((r: any) => r.id))
        const withRaffles = outgoing.map((req: any) => ({
          ...req,
          raffle: collabRaffles?.find((r: any) => r.collab_request_id === req.id) || null
        }))
        setMyCollabs(withRaffles)

        const counts: Record<string, number> = {}
        const wallets: Record<string, any[]> = {}
        for (const req of withRaffles) {
          if (req.raffle) {
            const { count } = await supabase.from("raffle_entries").select("*", { count: "exact", head: true }).eq("raffle_id", req.raffle.id)
            counts[req.raffle.id] = count || 0
            const { data: tw } = await supabase.from("team_wallets").select("*").eq("raffle_id", req.raffle.id).eq("project_b_id", proj.id)
            wallets[req.raffle.id] = tw || []
          }
        }
        setEntryCounts(counts)
        setTeamWallets(wallets)
      }
    }
    load()
  }, [xHandle])

  useEffect(() => {
    if (tab !== "my_collabs") return
    const interval = setInterval(async () => {
      const counts: Record<string, number> = {}
      for (const collab of myCollabs) {
        if (collab.raffle) {
          const { count } = await supabase.from("raffle_entries").select("*", { count: "exact", head: true }).eq("raffle_id", collab.raffle.id)
          counts[collab.raffle.id] = count || 0
        }
      }
      setEntryCounts(counts)
    }, 30000)
    return () => clearInterval(interval)
  }, [tab, myCollabs])

  useEffect(() => {
    if (tab !== "active") return
    const interval = setInterval(async () => {
      const counts: Record<string, number> = {}
      for (const r of activeRaffles) {
        const { count } = await supabase.from("raffle_entries").select("*", { count: "exact", head: true }).eq("raffle_id", r.id)
        counts[r.id] = count || 0
      }
      setActiveEntryCounts(counts)
    }, 30000)
    return () => clearInterval(interval)
  }, [tab, activeRaffles])

  const submitTeamWallet = async (raffleId: string, projectId: string) => {
    const wallet = newWallets[raffleId]?.trim()
    if (!wallet || !projectId) return
    setSubmittingWallet(prev => ({ ...prev, [raffleId]: true }))
    const { error } = await supabase.from("team_wallets").insert({ raffle_id: raffleId, project_b_id: projectId, wallet_address: wallet })
    if (error) { setSubmittingWallet(prev => ({ ...prev, [raffleId]: false })); return }
    const { data: tw } = await supabase.from("team_wallets").select("*").eq("raffle_id", raffleId).eq("project_b_id", projectId)
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
  const myAcceptanceRate = project?.acceptance_rate ?? 0

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
    setRequirements(prev => { const updated = [...prev[field]]; updated[index] = value; return { ...prev, [field]: updated } })
  }
  const addArrayField = (field: "xFollows" | "xLikes" | "xRetweets") =>
    setRequirements(prev => ({ ...prev, [field]: [...prev[field], ""] }))
  const removeArrayField = (field: "xFollows" | "xLikes" | "xRetweets", index: number) =>
    setRequirements(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }))

  const handleAccept = async () => {
    const id = pendingAcceptId
    if (!id) return
    const community = parseInt(allocations[id]?.community || "0")
    const team = parseInt(allocations[id]?.team || "0")
    const req = requests.find((r: any) => r.id === id)
    if (!req) return

    await supabase.from("collab_requests").update({ status: "accepted", community_spots: community, team_spots: team, responded_at: new Date().toISOString() }).eq("id", id)

    const { data: raffle } = await supabase.from("raffles").insert({
      collab_request_id: id,
      project_a_id: project?.id,
      project_b_id: req.project_b_id,
      title: `${project?.name} x ${req.project_b?.name}`,
      community_spots: community,
      team_spots: team,
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

    const newReceived = (project?.total_requests_received || 0) + 1
    const newAccepted = (project?.total_requests_accepted || 0) + 1
    const newRate = Math.round((newAccepted / newReceived) * 100)
    await supabase.from("projects").update({ total_requests_received: newReceived, total_requests_accepted: newAccepted, acceptance_rate: newRate }).eq("id", project?.id)

    const newTotal = Math.max(0, (project?.total_spots_listed || 0) - community - team)
    await supabase.from("projects").update({ total_spots_listed: newTotal }).eq("id", project?.id)
    setProject((prev: any) => ({ ...prev, total_requests_received: newReceived, total_requests_accepted: newAccepted, acceptance_rate: newRate, total_spots_listed: newTotal }))
  }

  const handleDrawWinners = async (raffle: any) => {
    if (!confirm(`Draw winners for "${raffle.title}"? This cannot be undone.`)) return
    const { data: entries } = await supabase.from("raffle_entries").select("wallet_address, discord_username").eq("raffle_id", raffle.id).eq("is_fully_verified", true)

    if (raffle.project_b_id && raffle.community_spots > 0) {
      const { data: projectB } = await supabase.from("projects").select("total_community_spots_offered, total_entries_received").eq("id", raffle.project_b_id).maybeSingle()
      const newOffered = (projectB?.total_community_spots_offered || 0) + raffle.community_spots
      const newReceived = (projectB?.total_entries_received || 0) + (entries?.length || 0)
      const newFillRate = newOffered > 0 ? Math.min(100, Math.round((newReceived / newOffered) * 100)) : 0
      await supabase.from("projects").update({ total_community_spots_offered: newOffered, total_entries_received: newReceived, fill_rate: newFillRate }).eq("id", raffle.project_b_id)
    }

    const { data: tw } = await supabase.from("team_wallets").select("wallet_address").eq("raffle_id", raffle.id)
    await supabase.from("raffles").update({ status: "ended", winners_drawn: true }).eq("id", raffle.id)

    const rows = ["wallet_address,discord_username,type"]
    const shuffled = (entries || []).sort(() => Math.random() - 0.5)
    shuffled.slice(0, raffle.community_spots).forEach((e: any) => rows.push(`${e.wallet_address},${e.discord_username || ""},community`))
    ;(tw || []).forEach((w: any) => rows.push(`${w.wallet_address},,team`))

    const blob = new Blob([rows.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `${raffle.title}-winners.csv`; a.click()
    URL.revokeObjectURL(url)
    setActiveRaffles(prev => prev.filter((r: any) => r.id !== raffle.id))
  }

  const TABS = [
    { key: "", label: `Incoming${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { key: "active", label: `Active (${activeRaffles.length})` },
    { key: "ended", label: `Ended (${endedRaffles.length})` },
    { key: "my_collabs", label: `My Collabs (${myCollabs.length})` },
  ] as const

  return (
    <div className="min-h-screen text-white" style={{ background: "#0D0D0F" }}>

      {/* ── Requirements Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6" style={{ background: "#141416", border: `1px solid ${FG06}` }}>
            <h2 className="text-lg font-bold mb-1" style={{ color: FG }}>Set Raffle Requirements</h2>
            <p className="text-sm mb-6" style={{ color: FG35 }}>Set when the raffle runs and what entrants must complete.</p>
            <div className="space-y-5">
              {[
                { label: "Raffle Start Time", field: "startsAt" as const },
                { label: "Raffle End Time", field: "endsAt" as const },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="text-xs block mb-1.5" style={{ color: FG35 }}>{label}</label>
                  <input type="datetime-local" value={requirements[field]}
                    onChange={e => setRequirements(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none [color-scheme:dark]"
                    style={{ background: FG08, border: `1px solid rgba(240,238,246,0.1)`, color: FG }} />
                </div>
              ))}
              {(["xFollows", "xLikes", "xRetweets"] as const).map(field => {
                const labels = { xFollows: "X Accounts to Follow", xLikes: "Post URLs to Like", xRetweets: "Post URLs to Retweet" }
                const placeholders = { xFollows: "e.g. RaffleHQ", xLikes: "https://x.com/...", xRetweets: "https://x.com/..." }
                return (
                  <div key={field}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs" style={{ color: FG35 }}>{labels[field]}</label>
                      <button onClick={() => addArrayField(field)} className="text-xs" style={{ color: VIOLET }}>+ Add</button>
                    </div>
                    {requirements[field].map((val, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input type="text" placeholder={placeholders[field]} value={val}
                          onChange={e => updateArrayField(field, i, e.target.value)}
                          className="flex-1 rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                          style={{ background: FG08, border: `1px solid rgba(240,238,246,0.1)`, color: FG }} />
                        {requirements[field].length > 1 && (
                          <button onClick={() => removeArrayField(field, i)} className="px-2 text-sm" style={{ color: FG35 }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: FG08, color: FG45 }}>
                Cancel
              </button>
              <button onClick={handleAccept}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-85"
                style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}>
                Confirm & Go Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Nav ── */}
<Nav />

      {/* ── Main Layout ── */}
      <div className="pt-24 pb-20 px-6 max-w-6xl mx-auto">
        <div className="grid gap-8" style={{ gridTemplateColumns: "minmax(0,280px) 1fr" }}>

          {/* ── Left: Identity Panel ── */}
          <aside className="space-y-5">
            <div className="rounded-2xl p-6" style={{ background: "rgba(240,238,246,0.018)", border: `1px solid ${FG06}` }}>
              <div className="flex flex-col items-center text-center mb-6">
                {project?.ethos_score != null ? (
                  <ReputationRing score={project.ethos_score} size={120} />
                ) : (
                  <div className="w-[120px] h-[120px] rounded-full flex items-center justify-center text-4xl font-bold"
                    style={{ background: "rgba(124,58,237,0.12)", border: `2px solid rgba(124,58,237,0.2)`, color: "#A78BFA" }}>
                    {project?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="mt-4">
                  <div className="font-semibold text-base" style={{ color: FG }}>{project?.name || xHandle}</div>
                  <div className="text-xs mt-0.5" style={{ color: FG35 }}>@{xHandle}</div>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                  style={{ background: "rgba(124,58,237,0.1)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.2)" }}>
                  ✓ Verified
                </span>
                {project?.ethos_score >= 1600 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                    style={{ background: "rgba(212,168,83,0.1)", color: GOLD, border: "1px solid rgba(212,168,83,0.22)" }}>
                    Reputable
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-3">
                {[
                  ["Acceptance Rate", `${myAcceptanceRate}%`],
                  ["Spots Listed", String(project?.total_spots_listed ?? 0)],
                  ["Requests Received", String(project?.total_requests_received ?? 0)],
                  ["Fill Rate", `${project?.fill_rate ?? 0}%`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span style={{ color: FG35 }}>{label}</span>
                    <span style={{ color: FG }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity feed — collab requests as activity */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(240,238,246,0.018)", border: `1px solid ${FG06}` }}>
              <h4 className="text-[10px] uppercase tracking-[0.14em] mb-4" style={{ color: FG35 }}>Recent Activity</h4>
              {requests.length === 0 && myCollabs.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-2xl mb-2">◌</div>
                  <div className="text-xs" style={{ color: FG35 }}>No activity yet</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {[...requests.slice(0, 2).map((r: any) => ({
                    action: "Incoming request",
                    project: r.project_b?.name || "Unknown",
                    spots: r.requested_spots,
                  })),
                  ...myCollabs.slice(0, 2).map((c: any) => ({
                    action: c.status === "accepted" ? "Collab accepted" : c.status === "declined" ? "Collab declined" : "Request sent",
                    project: c.project_a?.name || "Unknown",
                    spots: null,
                  }))].map((a, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: VIOLET }} />
                      <div>
                        <div className="text-[13px]" style={{ color: FG }}>{a.action}</div>
                        <div className="text-[11px]" style={{ color: FG35 }}>
                          {a.project}{a.spots ? ` · ${a.spots} spots` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* ── Right: Main Content ── */}
          <main className="space-y-6 min-w-0">

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Pending Requests" value={String(pendingCount)} sub={pendingCount > 0 ? "Needs your review" : "All clear"} color={pendingCount > 0 ? GOLD : "#22C55E"} />
              <StatCard label="Active Raffles" value={String(activeRaffles.length)} sub="Currently live" color="#22C55E" />
              <StatCard label="My Collabs" value={String(myCollabs.length)} sub="Outgoing requests" color="#818CF8" />
              <StatCard label="Ended Raffles" value={String(endedRaffles.length)} sub="Completed" color={FG45} />
            </div>

            {/* Pill tab selector */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(240,238,246,0.018)", border: `1px solid ${FG06}` }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${FG06}` }}>
                <h3 className="font-semibold" style={{ color: FG }}>Manage</h3>
                <div className="flex gap-0.5 p-1 rounded-lg" style={{ background: "rgba(240,238,246,0.04)" }}>
                  {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                      className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-200"
                      style={{ background: tab === t.key ? GRAD : "transparent", color: tab === t.key ? "#fff" : FG45 }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">

                {/* INCOMING */}
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
                        <div key={req.id} className="rounded-xl p-5 transition-all" style={{
                          background: isAccepted ? "rgba(34,197,94,0.05)" : "rgba(240,238,246,0.02)",
                          border: `1px solid ${isAccepted ? "rgba(34,197,94,0.2)" : isDeclined ? "rgba(239,68,68,0.15)" : FG06}`,
                          opacity: isDeclined ? 0.5 : 1,
                        }}>
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
                                  style={{ background: "rgba(79,70,229,0.15)", color: "#818CF8" }}>
                                  {req.project_b?.name?.[0]}
                                </div>
                                <div>
                                  <div className="font-semibold text-sm" style={{ color: FG }}>{req.project_b?.name}</div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs" style={{ color: FG35 }}>{req.project_b?.x_handle}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(79,70,229,0.12)", color: "#818CF8" }}>✓ verified</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap mb-3">
                                <FillRateBadge rate={req.project_b?.fill_rate || 0} />
                                <div className="text-xs px-2.5 py-1 rounded-full" style={{ background: FG08, color: FG35 }}>
                                  {req.project_b?.total_collabs || 0} past collabs
                                </div>
                              </div>
                              {req.message && <p className="text-sm mb-3 leading-relaxed" style={{ color: FG45 }}>{req.message}</p>}
                              <span className="text-xs px-3 py-1 rounded-full" style={{ background: FG08, color: FG45 }}>
                                Requesting <strong style={{ color: FG }}>{req.requested_spots}</strong> spots
                              </span>
                            </div>

                            {!isAccepted && !isDeclined && (
                              <div className="flex flex-col gap-3 min-w-[210px]">
                                <div className="rounded-xl p-4" style={{ background: "rgba(240,238,246,0.03)", border: `1px solid ${FG06}` }}>
                                  <div className="text-[10px] uppercase tracking-[0.12em] mb-3" style={{ color: FG35 }}>Allocate spots</div>
                                  <div className="space-y-3">
                                    {[
                                      { label: "Community spots", field: "community" as const, color: VIOLET },
                                      { label: "Team spots", field: "team" as const, color: INDIGO },
                                    ].map(({ label, field, color }) => (
                                      <div key={field}>
                                        <label className="text-xs flex items-center gap-1.5 mb-1 block" style={{ color: FG35 }}>
                                          <span className="w-2 h-2 rounded-full" style={{ background: color }} />{label}
                                        </label>
                                        <input type="number" min="0" placeholder="0"
                                          value={alloc?.[field] || ""}
                                          onChange={e => updateAlloc(req.id, field, e.target.value)}
                                          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                                          style={{ background: "rgba(0,0,0,0.3)", border: `1px solid rgba(240,238,246,0.1)`, color: FG }} />
                                      </div>
                                    ))}
                                  </div>
                                  {total > 0 && (
                                    <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${FG06}` }}>
                                      <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: FG08 }}>
                                        <div className="h-full" style={{ width: `${(community / total) * 100}%`, background: VIOLET }} />
                                        <div className="h-full" style={{ width: `${(team / total) * 100}%`, background: INDIGO }} />
                                      </div>
                                      <div className="flex justify-between text-xs mt-1">
                                        <span style={{ color: "#A78BFA" }}>{community} community</span>
                                        <span style={{ color: "#818CF8" }}>{team} team</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <button onClick={() => openRequirementsModal(req.id)}
                                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-85"
                                  style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}>
                                  Accept & Set Requirements
                                </button>
                                <button onClick={async () => {
                                  setDeclinedIds(prev => [...prev, req.id])
                                  await supabase.from("collab_requests").update({ status: "declined", responded_at: new Date().toISOString() }).eq("id", req.id)
                                  const newReceived = (project?.total_requests_received || 0) + 1
                                  const newAccepted = project?.total_requests_accepted || 0
                                  const newRate = Math.round((newAccepted / newReceived) * 100)
                                  await supabase.from("projects").update({ total_requests_received: newReceived, acceptance_rate: newRate }).eq("id", project?.id)
                                  setProject((prev: any) => ({ ...prev, total_requests_received: newReceived, acceptance_rate: newRate }))
                                }}
                                  className="w-full py-2 rounded-xl text-sm font-medium transition-all"
                                  style={{ background: FG08, color: FG45 }}
                                  onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(239,68,68,0.1)"; (e.target as HTMLElement).style.color = "#FCA5A5" }}
                                  onMouseLeave={e => { (e.target as HTMLElement).style.background = FG08; (e.target as HTMLElement).style.color = FG45 }}>
                                  Decline
                                </button>
                              </div>
                            )}
                            {isAccepted && (
                              <div className="flex-shrink-0 text-right">
                                <div className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl mb-1"
                                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86EFAC" }}>
                                  ✓ Accepted
                                </div>
                                <div className="text-xs mt-1" style={{ color: "rgba(134,239,172,0.6)" }}>Raffle now live ✓</div>
                              </div>
                            )}
                            {isDeclined && (
                              <div className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl h-fit"
                                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5" }}>
                                ✕ Declined
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {pendingCount === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-2xl"
                          style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.14)", color: VIOLET }}>
                          📭
                        </div>
                        <div className="text-sm font-medium mb-1" style={{ color: FG }}>No pending requests</div>
                        <div className="text-xs" style={{ color: FG35 }}>Incoming collaboration requests will appear here</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ACTIVE RAFFLES */}
                {tab === "active" && (
                  <div className="space-y-4">
                    {activeRaffles.map(r => {
                      const hasEnded = r.ends_at && new Date(r.ends_at) <= new Date()
                      return (
                        <div key={r.id} className="rounded-xl p-5" style={{ background: "rgba(240,238,246,0.02)", border: `1px solid ${FG06}` }}>
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22C55E" }} />
                                <span className="font-semibold text-sm" style={{ color: FG }}>{r.title}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs flex-wrap mb-2">
                                <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.1)", color: "#A78BFA" }}>{r.community_spots} community</span>
                                <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(79,70,229,0.1)", color: "#818CF8" }}>{r.team_spots} team</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs" style={{ color: FG35 }}>
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#22C55E" }} />
                                <span style={{ color: FG, fontWeight: 600 }}>{activeEntryCounts[r.id] ?? "—"}</span> live entries
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {hasEnded ? (
                                <button onClick={() => handleDrawWinners(r)}
                                  className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-85"
                                  style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}>
                                  Draw Winners
                                </button>
                              ) : (
                                <div className="text-right">
                                  <div className="text-xs mb-1" style={{ color: FG35 }}>Time remaining</div>
                                  {r.ends_at && <RaffleCountdown endsAt={r.ends_at} />}
                                </div>
                              )}
                              <button onClick={() => window.location.href = `/raffles/${r.id}`}
                                className="text-sm px-4 py-2 rounded-lg transition-all"
                                style={{ background: FG08, color: FG, border: `1px solid rgba(240,238,246,0.1)` }}>
                                View →
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {activeRaffles.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-2xl"
                          style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.14)", color: VIOLET }}>◈</div>
                        <div className="text-sm font-medium mb-1" style={{ color: FG }}>No active raffles</div>
                        <div className="text-xs" style={{ color: FG35 }}>Accept a collab request to launch a raffle</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ENDED RAFFLES */}
                {tab === "ended" && (
                  <div className="space-y-4">
                    {endedRaffles.map(r => {
                      const total = (r.community_spots || 0) + (r.team_spots || 0)
                      return (
                        <div key={r.id} className="rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                          style={{ background: "rgba(240,238,246,0.02)", border: `1px solid ${FG06}` }}>
                          <div>
                            <div className="font-semibold text-sm mb-2" style={{ color: FG }}>{r.title}</div>
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.1)", color: "#A78BFA" }}>{r.community_spots} community</span>
                              <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(79,70,229,0.1)", color: "#818CF8" }}>{r.team_spots} team</span>
                              <span style={{ color: FG35 }}>· {total} total</span>
                            </div>
                          </div>
                          <button onClick={() => handleDrawWinners(r)}
                            className="flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl transition-opacity hover:opacity-85"
                            style={{ background: GRAD }}>
                            ⬇ Download {total} wallets (.csv)
                          </button>
                        </div>
                      )
                    })}
                    {endedRaffles.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-2xl"
                          style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.14)", color: VIOLET }}>◎</div>
                        <div className="text-sm font-medium mb-1" style={{ color: FG }}>No ended raffles yet</div>
                        <div className="text-xs" style={{ color: FG35 }}>Completed raffles will appear here</div>
                      </div>
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
                        <div key={collab.id} className="rounded-xl p-5" style={{ background: "rgba(240,238,246,0.02)", border: `1px solid ${FG06}` }}>
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                              <div className="font-semibold text-sm mb-0.5" style={{ color: FG }}>{collab.project_a?.name}</div>
                              <div className="text-xs" style={{ color: FG35 }}>{collab.project_a?.x_handle}</div>
                            </div>
                            <span className="text-xs px-3 py-1 rounded-full flex-shrink-0" style={{
                              background: collab.status === "accepted" ? "rgba(34,197,94,0.1)" : collab.status === "declined" ? "rgba(239,68,68,0.1)" : "rgba(212,168,83,0.1)",
                              color: collab.status === "accepted" ? "#86EFAC" : collab.status === "declined" ? "#FCA5A5" : GOLD,
                              border: `1px solid ${collab.status === "accepted" ? "rgba(34,197,94,0.2)" : collab.status === "declined" ? "rgba(239,68,68,0.2)" : "rgba(212,168,83,0.2)"}`,
                            }}>
                              {collab.status === "accepted" ? "✓ Accepted" : collab.status === "declined" ? "✕ Declined" : "⏳ Pending"}
                            </span>
                          </div>

                          {collab.status === "accepted" && raffle && (
                            <div className="space-y-4">
                              <div className="rounded-xl p-4" style={{ background: "rgba(240,238,246,0.02)", border: `1px solid ${FG06}` }}>
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                  <div>
                                    <div className="text-sm font-semibold mb-1" style={{ color: FG }}>{raffle.title}</div>
                                    <div className="flex items-center gap-2 text-xs flex-wrap">
                                      <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.1)", color: "#A78BFA" }}>{raffle.community_spots} community</span>
                                      <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(79,70,229,0.1)", color: "#818CF8" }}>{raffle.team_spots} team spots</span>
                                    </div>
                                  </div>
                                  {raffle.ends_at && new Date(raffle.ends_at) > new Date() && (
                                    <div className="text-right">
                                      <div className="text-xs mb-0.5" style={{ color: FG35 }}>Time remaining</div>
                                      <RaffleCountdown endsAt={raffle.ends_at} />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(240,238,246,0.02)", border: `1px solid ${FG06}` }}>
                                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22C55E" }} />
                                  <div>
                                    <div className="text-xs" style={{ color: FG35 }}>Live entries</div>
                                    <div className="text-xl font-bold" style={{ color: FG }}>{entryCounts[raffle.id] ?? "—"}</div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => window.location.href = `/raffles/${raffle.id}`}
                                    className="text-sm px-4 py-2 rounded-lg transition-all"
                                    style={{ background: FG08, color: FG, border: `1px solid rgba(240,238,246,0.1)` }}>
                                    View Raffle →
                                  </button>
                                  <button onClick={() => copyRaffleLink(raffle.id)}
                                    className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-85"
                                    style={{ background: GRAD }}>
                                    {copiedId === raffle.id ? "Copied! ✓" : "Copy Link"}
                                  </button>
                                </div>
                              </div>
                              {raffle.team_spots > 0 && (
                                <div className="rounded-xl p-4" style={{ background: "rgba(79,70,229,0.05)", border: "1px solid rgba(79,70,229,0.18)" }}>
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="text-sm font-semibold" style={{ color: "#818CF8" }}>Team Wallets</div>
                                    <div className="text-xs" style={{ color: FG35 }}>{submitted.length} / {raffle.team_spots} submitted</div>
                                  </div>
                                  {submitted.length > 0 && (
                                    <div className="space-y-1.5 mb-3">
                                      {submitted.map((w: any, i: number) => (
                                        <div key={w.id} className="flex items-center gap-2 text-xs">
                                          <span style={{ color: FG35 }}>#{i + 1}</span>
                                          <span className="font-mono truncate" style={{ color: FG45 }}>{w.wallet_address}</span>
                                          <span className="ml-auto flex-shrink-0" style={{ color: "#22C55E" }}>✓</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {remaining > 0 && (
                                    <div className="flex gap-2">
                                      <input type="text"
                                        placeholder={`Wallet address (${remaining} slot${remaining > 1 ? "s" : ""} remaining)`}
                                        value={newWallets[raffle.id] || ""}
                                        onChange={e => setNewWallets(prev => ({ ...prev, [raffle.id]: e.target.value }))}
                                        className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                                        style={{ background: FG08, border: `1px solid rgba(240,238,246,0.1)`, color: FG }} />
                                      <button onClick={() => submitTeamWallet(raffle.id, project?.id)}
                                        disabled={!newWallets[raffle.id]?.trim() || submittingWallet[raffle.id]}
                                        className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-85 disabled:opacity-40 flex-shrink-0"
                                        style={{ background: GRAD }}>
                                        {submittingWallet[raffle.id] ? "..." : "Submit"}
                                      </button>
                                    </div>
                                  )}
                                  {remaining === 0 && <div className="text-xs mt-1" style={{ color: "#22C55E" }}>All team wallets submitted ✓</div>}
                                </div>
                              )}
                            </div>
                          )}
                          {collab.status === "pending" && <p className="text-sm" style={{ color: FG35 }}>Waiting for {collab.project_a?.name} to respond to your request.</p>}
                          {collab.status === "declined" && <p className="text-sm" style={{ color: FG35 }}>Your request was declined by {collab.project_a?.name}.</p>}
                        </div>
                      )
                    })}
                    {myCollabs.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-2xl"
                          style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.14)", color: VIOLET }}>🤝</div>
                        <div className="text-sm font-medium mb-1" style={{ color: FG }}>No outgoing requests yet</div>
                        <a href="/projects" className="text-xs transition-opacity hover:opacity-70" style={{ color: VIOLET }}>Browse projects to request spots →</a>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}