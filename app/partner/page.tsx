"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default function PartnerDashboard() {
  const { data: session } = useSession()
  const [project, setProject] = useState<any>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [endedRaffles, setEndedRaffles] = useState<any[]>([])
  const [tab, setTab] = useState<"requests" | "wallets" | "ended">("requests")
  const [teamWallets, setTeamWallets] = useState<Record<number, string[]>>({})
  const [walletInputs, setWalletInputs] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
  console.log("Session:", session)
  if (!session?.user?.name) {
    console.log("No session name, returning")
    return
  }
  const xHandle = session.user.name.startsWith("@") ? session.user.name : `@${session.user.name}`
  console.log("xHandle:", xHandle)

  const { data: proj, error: projError } = await supabase
    .from("projects")
    .select("*")
    .eq("x_handle", xHandle)
    .maybeSingle()

  console.log("Project:", proj, "Error:", projError)

  if (!proj) {
    setLoading(false)
    return
  }
  setProject(proj)
  setLoading(false)
}
    load()
  }, [session])

  const acceptedRequests = requests.filter(r => r.status === "accepted")
  const liveRaffles = acceptedRequests.filter(r => r.raffle?.status === "live")
  const teamWalletsNeeded = acceptedRequests.filter(r => (r.team_spots || 0) > 0).length
  const pendingCount = requests.filter(r => r.status === "pending").length

  const handleAddWallet = (reqId: number) => {
    const wallet = walletInputs[reqId]?.trim()
    if (!wallet) return
    setTeamWallets(prev => ({
      ...prev,
      [reqId]: [...(prev[reqId] || []), wallet]
    }))
    setWalletInputs(prev => ({ ...prev, [reqId]: "" }))
  }

  const handleSubmitWallets = async (req: any) => {
    const wallets = teamWallets[req.id] || []
    if (wallets.length === 0) return
    for (const wallet of wallets) {
      await supabase.from("team_wallets").insert({
        raffle_id: req.raffle?.id,
        wallet_address: wallet,
        project_id: project.id,
      })
    }
    alert("Team wallets submitted!")
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="text-white/40">Loading...</div>
    </div>
  )

  if (!project) return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/60 mb-4">No project found for your account.</p>
        <Link href="/projects" className="text-purple-400 hover:underline">Browse Projects →</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-6 py-12">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <p className="text-purple-400 text-sm font-medium mb-1">PROJECT B DASHBOARD</p>
            <h1 className="text-4xl font-bold">{project.name}</h1>
            <p className="text-white/40 mt-1">Track your spot requests, submit team wallets, and monitor your live raffles.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
            <div className="text-3xl font-bold">{requests.length}</div>
            <div className="text-white/40 text-sm mt-1">Total requests</div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
            <div className="text-3xl font-bold text-yellow-400">{pendingCount}</div>
            <div className="text-white/40 text-sm mt-1">Pending</div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
            <div className="text-3xl font-bold text-green-400">{acceptedRequests.length}</div>
            <div className="text-white/40 text-sm mt-1">Accepted</div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
            <div className="text-3xl font-bold text-purple-400">{liveRaffles.length}</div>
            <div className="text-white/40 text-sm mt-1">Live Raffles</div>
          </div>
        </div>

        {/* Team wallets alert */}
        {teamWalletsNeeded > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6 flex items-start gap-3 cursor-pointer" onClick={() => setTab("wallets")}>
            <span className="text-yellow-400 mt-0.5">⚠</span>
            <div>
              <p className="font-semibold text-yellow-400">Team wallets required for {teamWalletsNeeded} collab{teamWalletsNeeded > 1 ? "s" : ""}</p>
              <p className="text-white/50 text-sm">Submit your team wallets so the raffle can go live. Click to go to Team Wallets tab.</p>
            </div>
          </div>
        )}

        {/* Browse CTA */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6 mb-8 flex items-center justify-between">
          <div>
            <p className="font-semibold">Request a new collaboration</p>
            <p className="text-white/40 text-sm mt-1">Browse projects sharing spots and send a verified request.</p>
          </div>
          <Link href="/projects" className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Browse Projects →
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("requests")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "requests" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>
            My requests ({requests.length})
          </button>
          <button onClick={() => setTab("wallets")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "wallets" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>
            Team Wallets {teamWalletsNeeded > 0 ? `(${teamWalletsNeeded} needed)` : ""}
          </button>
          <button onClick={() => setTab("ended")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "ended" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>
            Ended ({endedRaffles.length})
          </button>
        </div>

        {/* Requests tab */}
        {tab === "requests" && (
          <div className="space-y-4">
            {requests.length === 0 && (
              <div className="text-center py-16 text-white/30">No requests yet. Browse projects to get started.</div>
            )}
            {requests.map(req => (
              <div key={req.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
                    {req.project_a?.name?.[0] || "?"}
                  </div>
                  <div>
                    <div className="font-semibold">{req.project_a?.name}</div>
                    <div className="text-white/40 text-sm">@{req.project_a?.x_handle} · {req.community_spots} community + {req.team_spots} team spots</div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${req.status === "accepted" ? "bg-green-500/10 text-green-400" : req.status === "declined" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                        {req.status}
                      </span>
                      {req.raffle?.status === "live" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse inline-block"></span>
                          Raffle live
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {req.status === "accepted" && req.raffle?.status === "live" && (
                    <Link href={`/raffles/${req.raffle.id}`} className="bg-purple-600 hover:bg-purple-500 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
                      View raffle →
                    </Link>
                  )}
                  {req.status === "accepted" && !req.raffle && (
                    <span className="text-white/30 text-sm">Waiting for raffle creation</span>
                  )}
                  {req.status === "pending" && (
                    <span className="text-yellow-400/60 text-sm">Awaiting response</span>
                  )}
                  {req.status === "declined" && (
                    <span className="text-red-400/60 text-sm">Declined</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Team Wallets tab */}
        {tab === "wallets" && (
          <div className="space-y-4">
            {acceptedRequests.filter(r => (r.team_spots || 0) > 0).length === 0 && (
              <div className="text-center py-16 text-white/30">No team wallets needed right now.</div>
            )}
            {acceptedRequests.filter(r => (r.team_spots || 0) > 0).map(req => {
              const submitted = teamWallets[req.id] || []
              const remaining = req.team_spots - submitted.length
              return (
                <div key={req.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-semibold">{req.project_a?.name}</div>
                      <div className="text-white/40 text-sm">{req.team_spots} team spots allocated</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${remaining === 0 ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                      {remaining === 0 ? "Complete" : `${remaining} remaining`}
                    </span>
                  </div>
                  {submitted.map((w, i) => (
                    <div key={i} className="text-sm text-white/50 font-mono mb-1">{w}</div>
                  ))}
                  {remaining > 0 && (
                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        placeholder="0x... wallet address"
                        value={walletInputs[req.id] || ""}
                        onChange={e => setWalletInputs(prev => ({ ...prev, [req.id]: e.target.value }))}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
                      />
                      <button onClick={() => handleAddWallet(req.id)} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors">Add</button>
                    </div>
                  )}
                  {submitted.length > 0 && remaining === 0 && (
                    <button onClick={() => handleSubmitWallets(req)} className="mt-3 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                      Submit wallets →
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Ended tab */}
        {tab === "ended" && (
          <div className="space-y-4">
            {endedRaffles.length === 0 && (
              <div className="text-center py-16 text-white/30">No ended raffles yet.</div>
            )}
            {endedRaffles.map(r => (
              <div key={r.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
                <div className="font-semibold">{r.title}</div>
                <div className="text-white/40 text-sm mt-1">{r.community_spots} community + {r.team_spots} team spots</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}