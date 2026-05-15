"use client";

import { useState } from "react";

const MY_requestsS = [
  {
    id: 1,
    projectA: "DeGods",
    xA: "@degodsnft",
    requestsedSpots: 200,
    status: "accepted",
    communitySpots: 150,
    teamSpots: 5,
    teamWalletsSubmitted: 3,
    raffleStatus: "live",
    endsIn: "2D 14H",
    entries: 1847,
  },
  {
    id: 2,
    projectA: "Azuki",
    xA: "@azuki",
    requestsedSpots: 100,
    status: "accepted",
    communitySpots: 80,
    teamSpots: 3,
    teamWalletsSubmitted: 0,
    raffleStatus: "pending_team_wallets",
    endsIn: null,
    entries: 0,
  },
  {
    id: 3,
    projectA: "BAYC",
    xA: "@boredapeyc",
    requestsedSpots: 500,
    status: "pending",
    communitySpots: 0,
    teamSpots: 0,
    teamWalletsSubmitted: 0,
    raffleStatus: null,
    endsIn: null,
    entries: 0,
  },
  {
    id: 4,
    projectA: "Doodles",
    xA: "@doodles",
    requestsedSpots: 75,
    status: "declined",
    communitySpots: 0,
    teamSpots: 0,
    teamWalletsSubmitted: 0,
    raffleStatus: null,
    endsIn: null,
    entries: 0,
  },
];

const ENDED_RAFFLES = [
  {
    id: 1,
    projectA: "CloneX",
    xA: "@clonex",
    communitySpots: 120,
    teamSpots: 5,
    entries: 2341,
    endedDate: "May 10, 2026",
  },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    pending: { label: "⏳ Pending review", class: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20" },
    accepted: { label: "✓ Accepted", class: "bg-green-500/10 text-green-300 border-green-500/20" },
    declined: { label: "✕ Declined", class: "bg-red-500/10 text-red-300 border-red-500/20" },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${s.class}`}>
      {s.label}
    </span>
  );
}

export default function PartnerDashboard() {
  const [tab, setTab] = useState<"requestss" | "wallets" | "ended">("requestss");
  const [requestss, setrequestss] = useState(MY_requestsS);

  // Team wallet submission state: { requestsId: string[] }
  const [teamWallets, setTeamWallets] = useState<Record<number, string[]>>({
    1: ["0xAb4C...8F21", "0x9Dc1...3E44", "0x7Fb2...1A09"],
    2: [],
  });
  const [newWallet, setNewWallet] = useState<Record<number, string>>({});
  const [walletErrors, setWalletErrors] = useState<Record<number, string>>({});

  const acceptedWithTeamSpots = requestss.filter(
    r => r.status === "accepted" && r.teamSpots > 0
  );

  const pendingTeamWallets = acceptedWithTeamSpots.filter(
    r => (teamWallets[r.id]?.length || 0) < r.teamSpots
  );

  const handleAddWallet = (requestsId: number, maxSpots: number) => {
    const wallet = newWallet[requestsId]?.trim();
    if (!wallet || wallet.length < 10) {
      setWalletErrors(prev => ({ ...prev, [requestsId]: "Please enter a valid wallet address" }));
      return;
    }
    const existing = teamWallets[requestsId] || [];
    if (existing.length >= maxSpots) {
      setWalletErrors(prev => ({ ...prev, [requestsId]: `Maximum ${maxSpots} team wallets reached` }));
      return;
    }
    if (existing.includes(wallet)) {
      setWalletErrors(prev => ({ ...prev, [requestsId]: "This wallet has already been added" }));
      return;
    }
    setTeamWallets(prev => ({ ...prev, [requestsId]: [...existing, wallet] }));
    setNewWallet(prev => ({ ...prev, [requestsId]: "" }));
    setWalletErrors(prev => ({ ...prev, [requestsId]: "" }));

    // Update submitted count
    setrequestss(prev => prev.map(r =>
      r.id === requestsId
        ? { ...r, teamWalletsSubmitted: existing.length + 1 }
        : r
    ));
  };

  const handleRemoveWallet = (requestsId: number, index: number) => {
    setTeamWallets(prev => ({
      ...prev,
      [requestsId]: prev[requestsId].filter((_, i) => i !== index),
    }));
    setrequestss(prev => prev.map(r =>
      r.id === requestsId
        ? { ...r, teamWalletsSubmitted: Math.max(0, r.teamWalletsSubmitted - 1) }
        : r
    ));
  };

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
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span className="text-sm text-white/70">@okaybears</span>
              <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">✓ verified</span>
            </div>
            <button className="text-sm text-white/40 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-6 max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="mb-10">
          <div className="text-sm text-blue-400 font-medium uppercase tracking-widest mb-2">Project B Dashboard</div>
          <h1 className="text-3xl font-bold mb-1">Okay Bears</h1>
          <p className="text-white/40 text-sm">Track your spot requestss, submit team wallets, and monitor your live raffles.</p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total requestss", value: String(requestss.length), color: "text-white" },
            { label: "Accepted", value: String(requestss.filter(r => r.status === "accepted").length), color: "text-green-400" },
            { label: "Team Wallets Needed", value: String(pendingTeamWallets.length), color: "text-yellow-400" },
            { label: "Live Raffles", value: String(requestss.filter(r => r.raffleStatus === "live").length), color: "text-purple-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
              <div className={`text-2xl font-bold mb-1 ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/40">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ALERT — team wallets pending */}
        {pendingTeamWallets.length > 0 && (
          <div
            className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-8 flex items-start gap-3 cursor-pointer hover:bg-yellow-500/15 transition-colors"
            onClick={() => setTab("wallets")}
          >
            <div className="text-yellow-400 text-xl mt-0.5">⚠️</div>
            <div>
              <div className="font-semibold text-yellow-300 text-sm mb-0.5">
                Team wallets required for {pendingTeamWallets.length} collab{pendingTeamWallets.length > 1 ? "s" : ""}
              </div>
              <div className="text-xs text-yellow-300/60">
                Submit your team wallets so the raffle can go live. Click to go to Team Wallets tab.
              </div>
            </div>
          </div>
        )}

        {/* requests NEW COLLAB CTA */}
        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/20 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="font-semibold mb-1">requests a new collaboration</div>
            <div className="text-sm text-white/50">Browse projects sharing spots and send a verified requests.</div>
          </div>
          <button className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 transition-colors text-white font-semibold px-6 py-3 rounded-xl text-sm">
            Browse Projects →
          </button>
        </div>

        {/* TABS */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-1 mb-8 w-fit">
          {([
            { key: "requestss", label: `My requestss (${requestss.length})` },
            { key: "wallets", label: `Team Wallets${pendingTeamWallets.length > 0 ? ` (${pendingTeamWallets.length} needed)` : ""}` },
            { key: "ended", label: `Ended (${ENDED_RAFFLES.length})` },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* requestsS TAB */}
        {tab === "requestss" && (
          <div className="space-y-4">
            {requestss.map(req => (
              <div key={req.id} className={`bg-white/[0.03] border rounded-2xl p-6 transition-all ${
                req.status === "accepted" ? "border-green-500/20" :
                req.status === "declined" ? "border-red-500/10 opacity-60" :
                "border-white/[0.08]"
              }`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/20 flex items-center justify-center font-bold text-purple-300 text-lg">
                        {req.projectA[0]}
                      </div>
                      <div>
                        <div className="font-semibold">{req.projectA}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/40">{req.xA}</span>
                          <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full">✓ verified</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <StatusBadge status={req.status} />
                      {req.status === "accepted" && (
                        <>
                          <span className="text-xs text-purple-300 bg-purple-500/10 px-2 py-1 rounded-full">{req.communitySpots} community spots</span>
                          <span className="text-xs text-blue-300 bg-blue-500/10 px-2 py-1 rounded-full">{req.teamSpots} team spots</span>
                        </>
                      )}
                      {req.status === "pending" && (
                        <span className="text-xs text-white/30">requestsed {req.requestsedSpots} spots</span>
                      )}
                    </div>

                    {/* RAFFLE STATUS */}
                    {req.status === "accepted" && (
                      <div className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${
                        req.raffleStatus === "live"
                          ? "bg-green-500/10 border-green-500/20 text-green-300"
                          : "bg-yellow-500/10 border-yellow-500/20 text-yellow-300"
                      }`}>
                        {req.raffleStatus === "live" ? (
                          <>
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                            Raffle live · {req.entries.toLocaleString()} entries · ends in {req.endsIn}
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                            Waiting for team wallets — submit them to go live
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {req.status === "accepted" && req.raffleStatus === "live" && (
                      <a href="/raffles/test"
                        className="bg-purple-600 hover:bg-purple-500 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
                        View raffle →
                      </a>
                    )}
                    {req.status === "accepted" && req.raffleStatus === "pending_team_wallets" && (
                      <button onClick={() => setTab("wallets")}
                        className="bg-yellow-600 hover:bg-yellow-500 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
                        Submit wallets →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TEAM WALLETS TAB */}
        {tab === "wallets" && (
          <div className="space-y-6">
            {acceptedWithTeamSpots.length === 0 && (
              <div className="text-center py-16 text-white/30">
                <div className="text-4xl mb-3">👛</div>
                <div className="text-sm">No team spots allocated yet</div>
              </div>
            )}

            {acceptedWithTeamSpots.map(req => {
              const submitted = teamWallets[req.id] || [];
              const remaining = req.teamSpots - submitted.length;
              const isFull = submitted.length >= req.teamSpots;

              return (
                <div key={req.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{req.projectA}</span>
                        <span className="text-xs text-white/40">×</span>
                        <span className="text-white/60">Okay Bears</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full">{req.teamSpots} team spots allocated</span>
                        <span className={`px-2 py-0.5 rounded-full ${isFull ? "bg-green-500/10 text-green-300" : "bg-yellow-500/10 text-yellow-300"}`}>
                          {submitted.length}/{req.teamSpots} submitted
                        </span>
                      </div>
                    </div>
                    {isFull && (
                      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-300 text-sm px-4 py-2 rounded-xl">
                        ✓ All team wallets submitted
                      </div>
                    )}
                    {!isFull && req.raffleStatus === "pending_team_wallets" && (
                      <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm px-4 py-2 rounded-xl">
                        ⚠ {remaining} more wallet{remaining > 1 ? "s" : ""} needed to go live
                      </div>
                    )}
                  </div>

                  {/* PROGRESS */}
                  <div className="mb-5">
                    <div className="flex justify-between text-xs text-white/40 mb-2">
                      <span>Team wallet submissions</span>
                      <span>{submitted.length} of {req.teamSpots}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isFull ? "bg-green-500" : "bg-blue-500"}`}
                        style={{ width: `${(submitted.length / req.teamSpots) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* SUBMITTED WALLETS */}
                  {submitted.length > 0 && (
                    <div className="space-y-2 mb-5">
                      {submitted.map((wallet, i) => (
                        <div key={i} className="flex items-center justify-between bg-black/20 border border-white/[0.06] rounded-xl px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-white/30 font-mono w-4">{i + 1}</span>
                            <span className="font-mono text-sm text-white/70">{wallet}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveWallet(req.id, i)}
                            className="text-white/20 hover:text-red-400 transition-colors text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ADD WALLET INPUT */}
                  {!isFull && (
                    <div>
                      <label className="text-xs text-white/40 mb-2 block">Add team wallet address</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="0x... or Solana address"
                          value={newWallet[req.id] || ""}
                          onChange={e => setNewWallet(prev => ({ ...prev, [req.id]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && handleAddWallet(req.id, req.teamSpots)}
                          className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                        />
                        <button
                          onClick={() => handleAddWallet(req.id, req.teamSpots)}
                          className="bg-blue-600 hover:bg-blue-500 transition-colors text-white font-medium px-5 py-2.5 rounded-xl text-sm"
                        >
                          Add
                        </button>
                      </div>
                      {walletErrors[req.id] && (
                        <p className="text-xs text-red-400 mt-1.5">{walletErrors[req.id]}</p>
                      )}
                      <p className="text-xs text-white/25 mt-1.5">
                        {remaining} slot{remaining > 1 ? "s" : ""} remaining · Press Enter or click Add
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ENDED TAB */}
        {tab === "ended" && (
          <div className="space-y-4">
            {ENDED_RAFFLES.map(r => (
              <div key={r.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold mb-2">{r.projectA} × Okay Bears</div>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-white/40">{r.xA} ✓</span>
                      <span className="text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">{r.communitySpots} community</span>
                      <span className="text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full">{r.teamSpots} team</span>
                      <span className="text-white/40">• {r.entries.toLocaleString()} entries • {r.endedDate}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-sm text-white/40 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5">
                    Winners downloaded by {r.projectA} ✓
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}