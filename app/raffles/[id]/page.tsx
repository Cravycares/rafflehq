"use client";

import { useState, useEffect } from "react";

function Countdown({ ms }: { ms: number }) {
  const [remaining, setRemaining] = useState(ms);
  useEffect(() => {
    const end = Date.now() + ms;
    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [ms]);
  const d = Math.floor(remaining / 86400000);
  const h = Math.floor((remaining % 86400000) / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return (
    <div className="flex gap-2">
      {[{ v: d, l: "Days" }, { v: h, l: "Hours" }, { v: m, l: "Mins" }, { v: s, l: "Secs" }].map(({ v, l }) => (
        <div key={l} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center min-w-[52px]">
          <div className="text-xl font-bold font-mono">{String(v).padStart(2, "0")}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-widest">{l}</div>
        </div>
      ))}
    </div>
  );
}

const RAFFLE = {
  projectA: { name: "DeGods", x: "@degodsnft", verified: true, color: "purple" },
  projectB: { name: "Okay Bears", x: "@okaybears", verified: true, color: "blue" },
  title: "DeGods × Okay Bears Whitelist",
  description: "DeGods is sharing 500 exclusive whitelist spots with the Okay Bears community. Enter for a chance to secure your spot in the DeGods ecosystem. One wallet per entrant — winners drawn fairly at random from all verified entries.",
  spots: 500,
  entries: 1243,
  endsIn: 1000 * 60 * 60 * 42,
  chain: "Ethereum",
  requirements: ["Join DeGods Discord", "Follow @degodsnft on X", "Follow @okaybears on X", "Paste your wallet address"],
};

export default function RafflePage() {
  const [tasks, setTasks] = useState({
    discord: false,
    followA: false,
    followB: false,
  });
  const [wallet, setWallet] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [walletError, setWalletError] = useState("");

  const allTasksDone = tasks.discord && tasks.followA && tasks.followB;
  const isValidWallet = wallet.startsWith("0x") && wallet.length === 42 || 
                        wallet.length >= 32 && wallet.length <= 44;
  const canEnter = allTasksDone && wallet.length > 10;

  const handleEnter = () => {
    if (!wallet || wallet.length < 10) {
      setWalletError("Please paste a valid wallet address");
      return;
    }
    setWalletError("");
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold mb-3">You're entered!</h2>
          <p className="text-white/50 mb-2">Your wallet has been registered for the</p>
          <p className="text-white font-semibold mb-6">{RAFFLE.title}</p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left">
            <div className="text-xs text-white/40 mb-1">Wallet registered</div>
            <div className="font-mono text-sm text-white/80 break-all">{wallet}</div>
          </div>
          <p className="text-sm text-white/40 mb-8">
            Keep following both accounts until the draw. Winners are notified via X.
          </p>
          <a href="/" className="inline-block bg-purple-600 hover:bg-purple-500 transition-colors text-white font-semibold px-8 py-3 rounded-xl text-sm">
            Browse more raffles
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">

     {/* NAV */}
<nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080808]/80 backdrop-blur-md">
  <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-sm font-bold">R</div>
      <span className="font-semibold text-lg">RaffleHQ</span>
    </div>
    <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
      <a href="#how" className="hover:text-white transition-colors">How it works</a>
      <a href="#raffles" className="hover:text-white transition-colors">Live Raffles</a>
      <a href="#calendar" className="hover:text-white transition-colors">NFT Calendar</a>
      <a href="#" className="hover:text-white transition-colors">Projects</a>
    </div>
    <div className="flex items-center gap-2">
      <button className="bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-white text-sm font-medium px-4 py-2 rounded-lg">
        Request Spots
      </button>
      <button className="bg-purple-600 hover:bg-purple-500 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
        List My Spots
      </button>
    </div>
  </div>
</nav>

      {/* BANNER */}
      <div className="pt-16">
        <div className="h-52 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.3),transparent_70%)]" />
          <div className="absolute inset-0 flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center text-2xl font-bold mb-2 mx-auto">D</div>
              <div className="text-sm font-semibold">{RAFFLE.projectA.name}</div>
              <div className="text-xs text-white/50">{RAFFLE.projectA.x} ✓</div>
            </div>
            <div className="text-3xl text-white/30 font-light">×</div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-2xl font-bold mb-2 mx-auto">O</div>
              <div className="text-sm font-semibold">{RAFFLE.projectB.name}</div>
              <div className="text-xs text-white/50">{RAFFLE.projectB.x} ✓</div>
            </div>
          </div>
          <div className="absolute top-4 right-4 bg-green-500/20 border border-green-500/30 text-green-300 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            Live
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        
        {/* TITLE ROW */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{RAFFLE.title}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full border border-purple-500/20">
                ✓ {RAFFLE.projectA.x} verified
              </span>
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full border border-blue-500/20">
                ✓ {RAFFLE.projectB.x} verified
              </span>
              <span className="text-xs text-white/40">{RAFFLE.chain}</span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Countdown ms={RAFFLE.endsIn} />
          </div>
        </div>

        {/* STATS BAR */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Spots Available", value: RAFFLE.spots.toLocaleString() },
            { label: "Total Entries", value: RAFFLE.entries.toLocaleString() },
            { label: "Odds", value: `1 in ${Math.round(RAFFLE.entries / RAFFLE.spots)}` },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-center">
              <div className="text-xl font-bold mb-1">{stat.value}</div>
              <div className="text-xs text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT — INFO */}
          <div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 mb-6">
              <h3 className="font-semibold mb-3 text-sm text-white/60 uppercase tracking-widest">About this raffle</h3>
              <p className="text-sm text-white/60 leading-relaxed">{RAFFLE.description}</p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 mb-6">
              <h3 className="font-semibold mb-4 text-sm text-white/60 uppercase tracking-widest">How to enter</h3>
              <ol className="space-y-3">
                {RAFFLE.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    {req}
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
              <h3 className="font-semibold mb-3 text-sm text-white/60 uppercase tracking-widest">Entry progress</h3>
              <div className="flex justify-between text-xs text-white/50 mb-2">
                <span>{RAFFLE.entries.toLocaleString()} entered</span>
                <span>{RAFFLE.spots.toLocaleString()} spots</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (RAFFLE.entries / RAFFLE.spots) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-white/30 mt-3">One entry per wallet. Winners drawn randomly from all verified entries at close.</p>
            </div>
          </div>

          {/* RIGHT — TASKS */}
          <div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sticky top-20">
              <h3 className="font-semibold mb-1 text-base">Complete tasks to enter</h3>
              <p className="text-xs text-white/40 mb-6">All tasks must be completed before you can enter</p>

              <div className="space-y-3 mb-6">

                {/* TASK 1 - Discord */}
                <div
                  onClick={() => setTasks(t => ({ ...t, discord: !t.discord }))}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    tasks.discord
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-white/[0.03] border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    tasks.discord ? "bg-green-500 border-green-500" : "border-white/30"
                  }`}>
                    {tasks.discord && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Discord</div>
                    <div className="text-sm font-medium">Join DeGods server & get Member role</div>
                  </div>
                  <span className="text-lg">💬</span>
                </div>

                {/* TASK 2 - Follow A */}
                <div
                  onClick={() => setTasks(t => ({ ...t, followA: !t.followA }))}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    tasks.followA
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-white/[0.03] border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    tasks.followA ? "bg-green-500 border-green-500" : "border-white/30"
                  }`}>
                    {tasks.followA && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-white/40 uppercase tracking-widest mb-0.5">X / Twitter</div>
                    <div className="text-sm font-medium">Follow {RAFFLE.projectA.x}</div>
                  </div>
                  <span className="text-lg">𝕏</span>
                </div>

                {/* TASK 3 - Follow B */}
                <div
                  onClick={() => setTasks(t => ({ ...t, followB: !t.followB }))}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    tasks.followB
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-white/[0.03] border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    tasks.followB ? "bg-green-500 border-green-500" : "border-white/30"
                  }`}>
                    {tasks.followB && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-white/40 uppercase tracking-widest mb-0.5">X / Twitter</div>
                    <div className="text-sm font-medium">Follow {RAFFLE.projectB.x}</div>
                  </div>
                  <span className="text-lg">𝕏</span>
                </div>

                {/* TASK 4 - Wallet */}
                <div className={`p-4 rounded-xl border transition-all ${
                  wallet.length > 10
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-white/[0.03] border-white/[0.08]"
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      wallet.length > 10 ? "bg-green-500 border-green-500" : "border-white/30"
                    }`}>
                      {wallet.length > 10 && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Wallet</div>
                      <div className="text-sm font-medium">Paste your wallet address</div>
                    </div>
                    <span className="text-lg">👛</span>
                  </div>
                  <input
                    type="text"
                    value={wallet}
                    onChange={(e) => { setWallet(e.target.value); setWalletError(""); }}
                    placeholder="0x... or Solana address"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono text-white/80 placeholder-white/20 focus:outline-none focus:border-purple-500/50"
                  />
                  {walletError && <p className="text-xs text-red-400 mt-1.5">{walletError}</p>}
                </div>
              </div>

              {/* ENTER BUTTON */}
              <button
                onClick={handleEnter}
                disabled={!canEnter}
                className={`w-full py-4 rounded-xl font-semibold text-base transition-all ${
                  canEnter
                    ? "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                }`}
              >
                {canEnter ? "Enter Raffle →" : `Complete ${[!tasks.discord, !tasks.followA, !tasks.followB, wallet.length < 10].filter(Boolean).length} more task${[!tasks.discord, !tasks.followA, !tasks.followB, wallet.length < 10].filter(Boolean).length !== 1 ? "s" : ""}`}
              </button>

              <p className="text-xs text-white/30 text-center mt-3">
                Keep following both accounts until winners are drawn. We verify at draw time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}