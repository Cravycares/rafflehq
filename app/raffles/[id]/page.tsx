"use client"

import { useState, useEffect, Suspense } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Requirements = {
  id: string
  raffle_id: string
  discord_server_id: string
  discord_server_name: string
  discord_role_id: string
  discord_role_name: string
  x_follow_account: string | null
  x_like_post_url: string | null
  x_retweet_post_url: string | null
}

function RafflePageInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const raffleId = params.id as string

  const [wallet, setWallet] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 })
  const [requirements, setRequirements] = useState<Requirements | null>(null)
  const [loading, setLoading] = useState(true)

  const [discordVerified, setDiscordVerified] = useState(false)
  const [discordVerifying, setDiscordVerifying] = useState(false)
  const [discordError, setDiscordError] = useState("")
  const [discordUser, setDiscordUser] = useState<{ id: string; username: string } | null>(null)

  const [xFollowDone, setXFollowDone] = useState(false)
  const [xLikeDone, setXLikeDone] = useState(false)
  const [xRetweetDone, setXRetweetDone] = useState(false)

  useEffect(() => {
    const fetchRequirements = async () => {
      const { data } = await supabase
        .from("raffle_requirements")
        .select("*")
        .eq("raffle_id", raffleId)
        .single()
      setRequirements(data)
      setLoading(false)
    }
    fetchRequirements()
  }, [raffleId])

  useEffect(() => {
    const discordId = searchParams.get("discord_id")
    const discordUsername = searchParams.get("discord_username")
    const discordToken = searchParams.get("discord_token")
    if (discordId && discordUsername && discordToken && requirements) {
      setDiscordUser({ id: discordId, username: discordUsername })
      verifyDiscordRole(discordToken, discordId)
    }
  }, [searchParams, requirements])

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

  const verifyDiscordRole = async (token: string, userId: string) => {
    if (!requirements) return
    setDiscordVerifying(true)
    setDiscordError("")
    try {
      const res = await fetch("/api/discord/verify-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discord_token: token,
          guild_id: requirements.discord_server_id,
          role_id: requirements.discord_role_id,
          discord_user_id: userId,
        }),
      })
      const data = await res.json()
      if (data.verified) {
        setDiscordVerified(true)
      } else {
        setDiscordError(data.reason || "Verification failed")
      }
    } catch {
      setDiscordError("Verification failed. Please try again.")
    } finally {
      setDiscordVerifying(false)
    }
  }

  const connectDiscord = () => {
    const state = btoa(JSON.stringify({ raffleId }))
    const discordParams = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
      redirect_uri: `${window.location.origin}/api/auth/discord`,
      response_type: "code",
      scope: "identify guilds",
      state,
    })
    window.location.href = `https://discord.com/oauth2/authorize?${discordParams}`
  }

  const allTasksDone = () => {
    if (!requirements) return false
    const xDone =
      (!requirements.x_follow_account || xFollowDone) &&
      (!requirements.x_like_post_url || xLikeDone) &&
      (!requirements.x_retweet_post_url || xRetweetDone)
    return discordVerified && xDone
  }

  const handleSubmit = async () => {
    if (!wallet || !allTasksDone()) return
    await supabase.from("raffle_entries").insert({
      raffle_id: raffleId,
      wallet_address: wallet,
      discord_verified: discordVerified,
      discord_user_id: discordUser?.id,
      discord_username: discordUser?.username,
      x_follow_verified: xFollowDone,
      x_like_verified: xLikeDone,
      x_retweet_verified: xRetweetDone,
      is_fully_verified: true,
    })
    setSubmitted(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-white/50">Loading raffle...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-6 py-12">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <span className="text-purple-400 text-sm font-medium">LIVE RAFFLE</span>
          <h1 className="text-3xl font-bold mt-2">Raffle #{raffleId}</h1>
          <p className="text-white/60 mt-2">Complete all requirements below to enter.</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <p className="text-sm text-white/50 mb-1">Time remaining</p>
          <div className="text-3xl font-mono font-bold text-purple-400">
            {String(timeLeft.hours).padStart(2, "0")}:
            {String(timeLeft.minutes).padStart(2, "0")}:
            {String(timeLeft.seconds).padStart(2, "0")}
          </div>
        </div>

        {/* Step 1: Discord */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${discordVerified ? "bg-green-500" : "bg-white/10"}`}>
                {discordVerified ? "✓" : "1"}
              </div>
              <div>
                <h2 className="font-semibold">Discord Verification</h2>
                {requirements?.discord_server_name && (
                  <p className="text-xs text-white/50">
                    Requires <span className="text-purple-400">{requirements.discord_role_name}</span> role in {requirements.discord_server_name}
                  </p>
                )}
              </div>
            </div>
            {discordVerified && <span className="text-green-400 text-sm">Verified ✓</span>}
          </div>
          {!discordVerified && (
            <>
              <button
                onClick={connectDiscord}
                disabled={discordVerifying}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors text-white font-medium py-3 rounded-lg"
              >
                {discordVerifying ? "Verifying..." : "Connect Discord"}
              </button>
              {discordError && <p className="text-red-400 text-sm mt-2">{discordError}</p>}
            </>
          )}
          {discordVerified && discordUser && (
            <p className="text-sm text-white/50">Connected as <span className="text-white">{discordUser.username}</span></p>
          )}
        </div>

        {/* Step 2: X Tasks */}
        {(requirements?.x_follow_account || requirements?.x_like_post_url || requirements?.x_retweet_post_url) && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                (!requirements.x_follow_account || xFollowDone) &&
                (!requirements.x_like_post_url || xLikeDone) &&
                (!requirements.x_retweet_post_url || xRetweetDone)
                  ? "bg-green-500" : "bg-white/10"
              }`}>
                {(!requirements.x_follow_account || xFollowDone) &&
                (!requirements.x_like_post_url || xLikeDone) &&
                (!requirements.x_retweet_post_url || xRetweetDone) ? "✓" : "2"}
              </div>
              <h2 className="font-semibold">X (Twitter) Tasks</h2>
            </div>
            <div className="space-y-3">
              {requirements.x_follow_account && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${xFollowDone ? "bg-green-500 border-green-500" : "border-white/20"}`}>
                      {xFollowDone && <span className="text-xs">✓</span>}
                    </div>
                    <span className="text-sm text-white/70">Follow @{requirements.x_follow_account}</span>
                  </div>
                  {!xFollowDone && (
                    <button
                      onClick={() => {
                        window.open(`https://x.com/${requirements!.x_follow_account}`, "_blank")
                        setTimeout(() => setXFollowDone(true), 2000)
                      }}
                      className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                    >Follow</button>
                  )}
                </div>
              )}
              {requirements.x_like_post_url && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${xLikeDone ? "bg-green-500 border-green-500" : "border-white/20"}`}>
                      {xLikeDone && <span className="text-xs">✓</span>}
                    </div>
                    <span className="text-sm text-white/70">Like the post</span>
                  </div>
                  {!xLikeDone && (
                    <button
                      onClick={() => {
                        window.open(requirements!.x_like_post_url!, "_blank")
                        setTimeout(() => setXLikeDone(true), 2000)
                      }}
                      className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                    >Like</button>
                  )}
                </div>
              )}
              {requirements.x_retweet_post_url && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${xRetweetDone ? "bg-green-500 border-green-500" : "border-white/20"}`}>
                      {xRetweetDone && <span className="text-xs">✓</span>}
                    </div>
                    <span className="text-sm text-white/70">Retweet the post</span>
                  </div>
                  {!xRetweetDone && (
                    <button
                      onClick={() => {
                        window.open(requirements!.x_retweet_post_url!, "_blank")
                        setTimeout(() => setXRetweetDone(true), 2000)
                      }}
                      className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                    >Retweet</button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Wallet */}
        {!submitted ? (
          <div className={`bg-white/5 border rounded-xl p-6 transition-opacity ${allTasksDone() ? "border-white/10 opacity-100" : "border-white/5 opacity-50 pointer-events-none"}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${allTasksDone() ? "bg-purple-600" : "bg-white/10"}`}>
                3
              </div>
              <h2 className="font-semibold">Submit Your Wallet</h2>
            </div>
            <input
              type="text"
              value={wallet}
              onChange={e => setWallet(e.target.value)}
              placeholder="0x... or SOL address"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500 mb-4"
            />
            <button
              onClick={handleSubmit}
              disabled={!wallet || !allTasksDone()}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white font-medium py-3 rounded-lg"
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

export default function RafflePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-white/50">Loading...</div>
      </div>
    }>
      <RafflePageInner />
    </Suspense>
  )
}