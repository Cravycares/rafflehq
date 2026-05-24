// @ts-nocheck
"use client";

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { supabase } from "@/lib/supabase"



function FillRateBadge({ rate }: { rate: number }) {
  const color =
    rate >= 80 ? "text-green-300 bg-green-500/10 border-green-500/20" :
    rate >= 50 ? "text-yellow-300 bg-yellow-500/10 border-yellow-500/20" :
                 "text-red-300 bg-red-500/10 border-red-500/20";
  const label =
    rate >= 80 ? "High engagement" :
    rate >= 50 ? "Medium engagement" :
                 "Low engagement";
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${color}`}>
      <span className="font-bold">{rate}% fill rate</span>
      <span className="opacity-60">· {label}</span>
    </div>
  );
}

function generateWallet() {
  return "0x" + Array.from({ length: 40 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
}

function downloadCSV(raffleName: string, communitySpots: number, teamSpots: number) {
  const rows = ["wallet_address,type"];
  for (let i = 0; i < communitySpots; i++) rows.push(`${generateWallet()},community`);
  for (let i = 0; i < teamSpots; i++) rows.push(`${generateWallet()},team`);
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${raffleName.replace(/\s/g, "_")}_all_spots.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type Allocation = { community: string; team: string };

export default function Dashboard() {
    const { data: session } = useSession()
  const xHandle = (session as any)?.xHandle

  const [project, setProject] = useState(null)
const [requests, setRequests] = useState([])
const [activeRaffles, setActiveRaffles] = useState([])
const [endedRaffles, setEndedRaffles] = useState([])

  useEffect(() => {
    if (!xHandle) return
    const load = async () => {
      // Upsert project
      const { data: proj } = await supabase
  .from("projects")
  .select("*")
  .eq("x_handle", `@${xHandle}`)
  .maybeSingle()
      setProject(proj)
      console.log("proj result:", proj, "xHandle was:", xHandle)

      if (!proj) return

      // Fetch 
      const { data: reqs } = await supabase
  .from("collab_requests")
  .select("*, project_b:project_b_id(name, x_handle, fill_rate, acceptance_rate, total_collabs)")
  .eq("project_a_id", proj.id)
  .eq("status", "pending")
setRequests(reqs || [])

      // Fetch raffles
      const { data: raffles } = await supabase
        .from("raffles")
        .select("*")
        .eq("project_a_id", proj.id)
      setActiveRaffles((raffles || []).filter((r: any) => r.status === "live"))
      setEndedRaffles((raffles || []).filter((r: any) => r.status === "ended"))
    }
    load()
  }, [xHandle])
  const [tab, setTab] = useState<"" | "active" | "ended">("");
  const [allocations, setAllocations] = useState<Record<number, Allocation>>({});
  const [acceptedIds, setAcceptedIds] = useState<number[]>([]);
  const [declinedIds, setDeclinedIds] = useState<number[]>([]);

  const pendingCount = requests.filter(r => !acceptedIds.includes(r.id) && !declinedIds.includes(r.id)).length;

  const handleAccept = async (id: number) => {
  const community = parseInt(allocations[id]?.community || "0")
  if (!community || community <= 0) { alert("Please enter at least 1 community spot."); return }
  
  const req = requests.find((r: any) => r.id === id)
  if (!req) return

  await supabase
    .from("collab_requests")
    .update({
      status: "accepted",
      community_spots: community,
      team_spots: parseInt(allocations[id]?.team || "0"),
      responded_at: new Date().toISOString()
    })
    .eq("id", id)

  await supabase.from("raffles").insert({
    collab_request_id: id,
    project_a_id: project?.id,
    project_b_id: req.project_b_id,
    title: `${project?.name} x ${req.project_b?.name}`,
    community_spots: community,
    team_spots: parseInt(allocations[id]?.team || "0"),
    status: "live",
    ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })

  setAcceptedIds(prev => [...prev, id])
}
const downloadCSV = (title: string, communitySpots: number, teamSpots: number) => {
  const headers = ["wallet_address", "spot_type"]
  const rows = [["0x123...example", "community"]] // placeholder — replace with real entries query
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${title}-winners.csv`
  a.click()
  URL.revokeObjectURL(url)
}
const handleDrawWinners = async (raffle: any) => {
  if (!confirm(`Draw winners for "${raffle.title}"? This cannot be undone.`)) return

  await supabase
    .from("raffles")
    .update({ status: "ended", winners_drawn: true })
    .eq("id", raffle.id)

  downloadCSV(raffle.title, raffle.community_spots, raffle.team_spots)
  setActiveRaffles(prev => prev.filter((r: any) => r.id !== raffle.id))
}
  const updateAlloc = (id: number, field: keyof Allocation, value: string) =>
    setAllocations(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  // Project A's own acceptance rate (accepted / total decided)
  const totalDecided = acceptedIds.length + declinedIds.length;
  const myAcceptanceRate = totalDecided > 0 ? Math.round((acceptedIds.length / totalDecided) * 100) : 34; // default shown

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080808]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-sm font-bold">R</div>
            <span className="font-semibold text-lg">RaffleHQ</span>
          </a>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
              <span className="text-sm text-white/70">@degodsnft</span>
              <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full">✓ verified</span>
            </div>
            <button className="text-sm text-white/40 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg transition-colors">Sign out</button>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-6 max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="mb-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="text-sm text-purple-400 font-medium uppercase tracking-widest mb-2">Project A Dashboard</div>
            <h1 className="text-3xl font-bold mb-1">DeGods</h1>
            <p className="text-white/40 text-sm">Manage spot sharing, review , and download winners.</p>
          </div>
          {/* MY ACCEPTANCE RATE */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 flex items-center gap-4 flex-shrink-0">
            <div>
              <div className="text-xs text-white/40 mb-1">Your acceptance rate</div>
              <div className="text-2xl font-bold text-purple-400">{myAcceptanceRate}%</div>
              <div className="text-xs text-white/30 mt-0.5">Visible to Project B's browsing you</div>
            </div>
            <div className="w-12 h-12 relative flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#7c3aed" strokeWidth="3"
                  strokeDasharray={`${myAcceptanceRate} ${100 - myAcceptanceRate}`}
                  strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total Spots Listed", value: "2,500", color: "text-white" },
            { label: "Pending ", value: String(pendingCount), color: "text-yellow-400" },
            { label: "Active Raffles", value: String(activeRaffles.length), color: "text-green-400" },
            { label: "Winners Drawn", value: "350", color: "text-purple-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
              <div className={`text-2xl font-bold mb-1 ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/40">{s.label}</div>
            </div>
          ))}
        </div>

        {/* HOW SPOTS WORK */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 mb-8">
          <div className="text-sm font-semibold mb-3 text-white/70">How spot allocation works</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {[
              { n: "1", color: "purple", text: <>You set <span className="text-purple-300">community spots</span> — these go into the raffle and are won by Project B's community</> },
              { n: "2", color: "blue", text: <>You set <span className="text-blue-300">team spots</span> — Project B submits their team wallets directly on RaffleHQ</> },
              { n: "3", color: "green", text: <>When raffle ends, download <span className="text-green-300">one CSV</span> with all wallets — raffle winners + team spots together</> },
            ].map(item => (
              <div key={item.n} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${
                  item.color === "purple" ? "bg-purple-500/20 text-purple-300" :
                  item.color === "blue" ? "bg-blue-500/20 text-blue-300" :
                  "bg-green-500/20 text-green-300"
                }`}>{item.n}</div>
                <div className="text-white/50">{item.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/20 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="font-semibold mb-1">List more spots</div>
            <div className="text-sm text-white/50">Share additional whitelist spots and let verified projects requests them.</div>
          </div>
          <button className="flex-shrink-0 bg-purple-600 hover:bg-purple-500 transition-colors text-white font-semibold px-6 py-3 rounded-xl text-sm">+ List Spots</button>
        </div>

        {/* TABS */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-1 mb-8 w-fit">
          {([
            { key: "", label: `${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
            { key: "active", label: `Active (${activeRaffles.length})` },
            { key: "ended", label: `Ended (${endedRaffles.length})` },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/*  */}
        {tab === "" && (
          <div className="space-y-4">
            {requests.map(req => {
              const isAccepted = acceptedIds.includes(req.id);
              const isDeclined = declinedIds.includes(req.id);
              const alloc = allocations[req.id];
              const community = parseInt(alloc?.community || "0");
              const team = parseInt(alloc?.team || "0");
              const total = community + team;

              return (
                <div key={req.id} className={`bg-white/[0.03] border rounded-2xl p-6 transition-all ${
                  isAccepted ? "border-green-500/30 bg-green-500/5" :
                  isDeclined ? "border-red-500/20 opacity-50" :
                  "border-white/[0.08]"
                }`}>
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    <div className="flex-1">

                      {/* PROJECT HEADER */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center font-bold text-blue-300 text-lg">
                          {req.project_b?.name?.[0]}
                        </div>
                        <div>
                          <div className="font-semibold">{req.project_b?.name}</div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-white/40">{req.project_b?.x_handle}</span>
                            <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">✓ verified</span>
                          </div>
                        </div>
                      </div>

                      {/* REPUTATION ROW */}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <FillRateBadge rate={req.project_b?.fill_rate || 0} />
                        <div className="text-xs text-white/30 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-full">
                          {req.project_b?.total_collabs || 0} past collabs
                        </div>
                        {(req.project_b?.fill_rate || 0) < 60 && (
                          <div className="text-xs text-orange-300 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
                            ⚠ Low community engagement
                          </div>
                        )}
                        {(req.project_b?.fill_rate || 0) >= 80 && (
                          <div className="text-xs text-green-300 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                            🔥 Highly engaged community
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-white/50 leading-relaxed mb-3">{req.message}</p>
                      <span className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-white/60">
                        requestsing <strong className="text-white">{req.requested_spots}</strong> spots
                      </span>
                    </div>

                    {/* ALLOCATION PANEL */}
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
                              <p className="text-xs text-white/25 mt-1">Goes into the raffle pool</p>
                            </div>
                            <div>
                              <label className="text-xs text-white/50 mb-1 flex items-center gap-1.5 block">
                                <span className="w-2 h-2 bg-blue-400 rounded-full inline-block"></span>Team spots
                              </label>
                              <input type="number" min="0" placeholder="e.g. 5"
                                value={alloc?.team || ""}
                                onChange={e => updateAlloc(req.id, "team", e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                              <p className="text-xs text-white/25 mt-1">Collected on-platform</p>
                            </div>
                          </div>
                          {total > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/[0.08]">
                              <div className="flex justify-between text-xs mb-2">
                                <span className="text-white/40">Total</span>
                                <span className="font-bold text-white">{total} spots</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden bg-white/10 flex">
                                <div className="h-full bg-purple-500 transition-all" style={{ width: total > 0 ? `${(community / total) * 100}%` : "0%" }} />
                                <div className="h-full bg-blue-500 transition-all" style={{ width: total > 0 ? `${(team / total) * 100}%` : "0%" }} />
                              </div>
                              <div className="flex justify-between text-xs mt-1">
                                <span className="text-purple-400">{community} community</span>
                                <span className="text-blue-400">{team} team</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <button onClick={() => handleAccept(req.id)}
                          className="w-full bg-green-600 hover:bg-green-500 transition-colors text-white font-medium py-2.5 rounded-xl text-sm">
                          Accept & Allocate
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
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 justify-end text-purple-300"><span className="w-2 h-2 bg-purple-400 rounded-full"></span>{alloc?.community || 0} community</div>
                          <div className="flex items-center gap-1.5 justify-end text-blue-300"><span className="w-2 h-2 bg-blue-400 rounded-full"></span>{alloc?.team || 0} team</div>
                          <div className="text-white/60 font-semibold pt-1 border-t border-white/10">{(parseInt(alloc?.community || "0") + parseInt(alloc?.team || "0"))} total</div>
                        </div>
                        <div className="text-xs text-green-400/60 mt-2">Raffle now live ✓</div>
                      </div>
                    )}

                    {isDeclined && (
                      <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 text-sm px-4 py-2 rounded-xl h-fit">✕ Declined</div>
                    )}
                  </div>
                </div>
              );
            })}
            {pendingCount === 0 && (
              <div className="text-center py-16 text-white/30"><div className="text-4xl mb-3">📭</div><div className="text-sm">No pending </div></div>
            )}
          </div>
        )}

        {/* ACTIVE */}
        {tab === "active" && (
          <div className="space-y-4">
            {activeRaffles.map(r => (
              <div key={r.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="font-semibold">{r.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="text-white/40">{r.partnerX} ✓  •</span>
                    <span className="text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">{r.communitySpots} community</span>
                    <span className="text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full">{r.teamSpots} team</span>
                    <span className="text-white/40">• {(r.entries ?? 0).toLocaleString()} entries</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-white/40">Ends in</div>
                    <div className="font-mono font-semibold text-green-400">{r.endsIn}</div>
                  </div>
                  <button
  onClick={() => handleDrawWinners(r)}
  className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
>
  Draw Winners
</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ENDED */}
        {tab === "ended" && (
          <div className="space-y-4">
            {endedRaffles.map(r => {
              const total = r.communitySpots + r.teamSpots;
              return (
                <div key={r.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold mb-2">{r.title}</div>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-white/40">{r.partnerX} ✓</span>
                      <span className="text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">{r.communitySpots} community</span>
                      <span className="text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full">{r.teamSpots} team</span>
                      <span className="text-white/40">• {total} total • {(r.entries ?? 0).toLocaleString()} entries • {r.endedDate}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
                    <button onClick={() => downloadCSV(r.title, r.communitySpots, r.teamSpots)}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
                      ⬇ Download all {total} wallets (.csv)
                    </button>
                    <div className="text-xs text-white/30">{r.communitySpots} raffle winners + {r.teamSpots} team spots</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}