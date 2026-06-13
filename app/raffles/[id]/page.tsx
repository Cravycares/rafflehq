"use client"

import { useState, useEffect, Suspense } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import Nav from "@/components/Nav"

type Requirements = {
  id: string
  raffle_id: string
  discord_server_id: string
  discord_server_name: string
  discord_role_id: string
  discord_role_name: string
  x_follow_accounts: string[]
  x_like_post_urls: string[]
  x_retweet_post_urls: string[]
}

function StartCountdown({ startsAt }: { startsAt: string }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(startsAt).getTime() - Date.now()
      if (diff <= 0) {
        clearInterval(timer)
        window.location.reload()
        return
      }
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [startsAt])

  return (
    <div className="text-3xl font-mono font-bold text-yellow-400">
      {String(timeLeft.hours).padStart(2, "0")}:
      {String(timeLeft.minutes).padStart(2, "0")}:
      {String(timeLeft.seconds).padStart(2, "0")}
    </div>
  )
}

function RafflePageInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const raffleId = params.id as string
  const { data: session, status } = useSession()

  const [wallet, setWallet] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [endsAt, setEndsAt] = useState<string | null>(null)
  const [startsAt, setStartsAt] = useState<string | null>(null)
  const [raffleName, setRaffleName] = useState<string | null>(null)
  const [requirements, setRequirements] = useState<Requirements | null>(null)
  const [loading, setLoading] = useState(true)

  const [discordVerified, setDiscordVerified] = useState(false)
  const [discordVerifying, setDiscordVerifying] = useState(false)
  const [discordError, setDiscordError] = useState("")
  const [discordUser, setDiscordUser] = useState<{ id: string; username: string } | null>(null)

  const [followsDone, setFollowsDone] = useState<boolean[]>([])
  const [likesDone, setLikesDone] = useState<boolean[]>([])
  const [retweetsDone, setRetweetsDone] = useState<boolean[]>([])
  const [followsVerifying, setFollowsVerifying] = useState<boolean[]>([])
  const [likesVerifying, setLikesVerifying] = useState<boolean[]>([])
  const [retweetsVerifying, setRetweetsVerifying] = useState<boolean[]>([])
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchData = async () => {
      const { data: req } = await supabase
        .from("raffle_requirements")
        .select("*")
        .eq("raffle_id", raffleId)
        .maybeSingle()
      setRequirements(req)

      if (req) {
        setFollowsDone(new Array(req.x_follow_accounts?.length || 0).fill(false))
        setLikesDone(new Array(req.x_like_post_urls?.length || 0).fill(false))
        setRetweetsDone(new Array(req.x_retweet_post_urls?.length || 0).fill(false))
        setFollowsVerifying(new Array(req.x_follow_accounts?.length || 0).fill(false))
        setLikesVerifying(new Array(req.x_like_post_urls?.length || 0).fill(false))
        setRetweetsVerifying(new Array(req.x_retweet_post_urls?.length || 0).fill(false))
      }

      const { data: raffle } = await supabase
        .from("raffles")
        .select("ends_at, starts_at, title")
        .eq("id", raffleId)
        .single()
      if (raffle?.ends_at) setEndsAt(raffle.ends_at)
      if (raffle?.starts_at) setStartsAt(raffle.starts_at)
      if (raffle?.title) setRaffleName(raffle.title)

      setLoading(false)
    }
    fetchData()
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
    if (!endsAt) return
    const timer = setInterval(() => {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        clearInterval(timer)
        return
      }
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [endsAt])

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

  const handleFollow = async (account: string, i: number) => {
    window.open(`https://x.com/${account}`, "_blank")
    const verifying = [...followsVerifying]
    verifying[i] = true
    setFollowsVerifying(verifying)
    setTaskErrors(prev => ({ ...prev, [`follow-${i}`]: "" }))
    await new Promise(r => setTimeout(r, 4000))
    try {
      const res = await fetch("/api/twitter/verify-follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername: account }),
      })
      const data = await res.json()
      const updated = [...followsDone]
      updated[i] = data.verified
      setFollowsDone(updated)
      if (!data.verified) {
        setTaskErrors(prev => ({ ...prev, [`follow-${i}`]: "Not detected yet — make sure you followed then try again" }))
      }
    } catch {
      setTaskErrors(prev => ({ ...prev, [`follow-${i}`]: "Verification failed. Try again." }))
    } finally {
      const v = [...followsVerifying]
      v[i] = false
      setFollowsVerifying(v)
    }
  }

  const handleLike = async (url: string, i: number) => {
    window.open(url, "_blank")
    const verifying = [...likesVerifying]
    verifying[i] = true
    setLikesVerifying(verifying)
    setTaskErrors(prev => ({ ...prev, [`like-${i}`]: "" }))
    await new Promise(r => setTimeout(r, 4000))
    try {
      const res = await fetch("/api/twitter/verify-like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetUrl: url }),
      })
      const data = await res.json()
      const updated = [...likesDone]
      updated[i] = data.verified
      setLikesDone(updated)
      if (!data.verified) {
        setTaskErrors(prev => ({ ...prev, [`like-${i}`]: "Like not detected yet — make sure you liked the post then try again" }))
      }
    } catch {
      setTaskErrors(prev => ({ ...prev, [`like-${i}`]: "Verification failed. Try again." }))
    } finally {
      const v = [...likesVerifying]
      v[i] = false
      setLikesVerifying(v)
    }
  }

  const handleRetweet = async (url: string, i: number) => {
    window.open(url, "_blank")
    const verifying = [...retweetsVerifying]
    verifying[i] = true
    setRetweetsVerifying(verifying)
    setTaskErrors(prev => ({ ...prev, [`retweet-${i}`]: "" }))
    await new Promise(r => setTimeout(r, 4000))
    try {
      const res = await fetch("/api/twitter/verify-retweet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetUrl: url }),
      })
      const data = await res.json()
      const updated = [...retweetsDone]
      updated[i] = data.verified
      setRetweetsDone(updated)
      if (!data.verified) {
        setTaskErrors(prev => ({ ...prev, [`retweet-${i}`]: "Retweet not detected yet — make sure you retweeted then try again" }))
      }
    } catch {
      setTaskErrors(prev => ({ ...prev, [`retweet-${i}`]: "Verification failed. Try again." }))
    } finally {
      const v = [...retweetsVerifying]
      v[i] = false
      setRetweetsVerifying(v)
    }
  }

  const allXTasksDone = () => {
    if (!requirements) return true
    return followsDone.every(Boolean) && likesDone.every(Boolean) && retweetsDone.every(Boolean)
  }

  const allTasksDone = () => discordVerified && allXTasksDone()

  const raffleStarted = !startsAt || new Date(startsAt) <= new Date()
  const raffleEnded = endsAt && new Date(endsAt) <= new Date()

  const handleSubmit = async () => {
  if (!wallet || !allTasksDone()) return

  const xHandle = (session as any)?.xHandle

  // Check for duplicate entry
  const { data: existing } = await supabase
    .from("raffle_entries")
    .select("id")
    .eq("raffle_id", raffleId)
    .eq("x_handle", xHandle)
    .maybeSingle()

  if (existing) {
    alert("You have already entered this raffle with this X account.")
    return
  }

  await supabase.from("raffle_entries").insert({
    raffle_id: raffleId,
    wallet_address: wallet,
    discord_verified: discordVerified,
    discord_user_id: discordUser?.id,
    discord_username: discordUser?.username,
    x_handle: xHandle,
    x_follow_verified: followsDone.every(Boolean),
    x_like_verified: likesDone.every(Boolean),
    x_retweet_verified: retweetsDone.every(Boolean),
    is_fully_verified: true,
  })
  setSubmitted(true)
}

  const hasXTasks = requirements && (
    (requirements.x_follow_accounts?.length > 0) ||
    (requirements.x_like_post_urls?.length > 0) ||
    (requirements.x_retweet_post_urls?.length > 0)
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-white/50">Loading raffle...</div>
      </div>
    )
  }

  return (
  <div className="min-h-screen bg-[#0a0a0a] text-white px-6 pt-28 pb-12">
    <Nav />
    <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <span className="text-purple-400 text-sm font-medium">LIVE RAFFLE</span>
          <h1 className="text-3xl font-bold mt-2">{raffleName || `Raffle #${raffleId.slice(0, 8)}...`}</h1>
          <p className="text-white/60 mt-2">Complete all requirements below to enter.</p>
        </div>

        {!raffleStarted ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <p className="text-sm text-white/50 mb-1">Raffle starts in</p>
            <StartCountdown startsAt={startsAt!} />
            <p className="text-xs text-white/30 mt-2">Starts {new Date(startsAt!).toLocaleString()}</p>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <p className="text-sm text-white/50 mb-1">Time remaining</p>
            <div className="text-3xl font-mono font-bold text-purple-400">
              {String(timeLeft.hours).padStart(2, "0")}:
              {String(timeLeft.minutes).padStart(2, "0")}:
              {String(timeLeft.seconds).padStart(2, "0")}
            </div>
            {raffleEnded && <p className="text-red-400 text-sm mt-2">This raffle has ended.</p>}
          </div>
        )}

        {raffleStarted && !raffleEnded && (
          <>
            {status === "loading" ? (
  <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4 text-center">
    <p className="text-white/50 text-sm">Checking authentication...</p>
  </div>
) : status === "unauthenticated" ? (
  <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4 text-center">
    <div className="text-2xl mb-3">𝕏</div>
    <h2 className="font-semibold mb-2">Sign in to Enter</h2>
    <p className="text-sm text-white/50 mb-4">You need to sign in with X to verify your tasks and enter this raffle.</p>
    <button
      onClick={() => window.location.href = `/api/auth/signin/twitter?callbackUrl=${encodeURIComponent(window.location.href)}`}
      className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-white/90 transition-colors"
    >
      Sign in with X
    </button>
  </div>
) : (
  <>
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
                      <button onClick={connectDiscord} disabled={discordVerifying}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors text-white font-medium py-3 rounded-lg">
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
                {hasXTasks && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${allXTasksDone() ? "bg-green-500" : "bg-white/10"}`}>
                        {allXTasksDone() ? "✓" : "2"}
                      </div>
                      <h2 className="font-semibold">X (Twitter) Tasks</h2>
                    </div>
                    <div className="space-y-4">
                      {requirements?.x_follow_accounts?.map((account, i) => (
                        <div key={`follow-${i}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${followsDone[i] ? "bg-green-500 border-green-500" : "border-white/20"}`}>
                                {followsDone[i] && <span className="text-xs">✓</span>}
                              </div>
                              <span className="text-sm text-white/70">Follow @{account}</span>
                            </div>
                            {!followsDone[i] && (
                              <button onClick={() => handleFollow(account, i)} disabled={followsVerifying[i]}
                                className="text-xs bg-white/10 hover:bg-white/20 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors">
                                {followsVerifying[i] ? "Checking..." : "Follow"}
                              </button>
                            )}
                          </div>
                          {taskErrors[`follow-${i}`] && (
                            <p className="text-yellow-400 text-xs mt-1 ml-8">{taskErrors[`follow-${i}`]}</p>
                          )}
                        </div>
                      ))}

                      {requirements?.x_like_post_urls?.map((url, i) => (
                        <div key={`like-${i}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${likesDone[i] ? "bg-green-500 border-green-500" : "border-white/20"}`}>
                                {likesDone[i] && <span className="text-xs">✓</span>}
                              </div>
                              <span className="text-sm text-white/70">Like post {requirements.x_like_post_urls.length > 1 ? `#${i + 1}` : ""}</span>
                            </div>
                            {!likesDone[i] && (
                              <button onClick={() => handleLike(url, i)} disabled={likesVerifying[i]}
                                className="text-xs bg-white/10 hover:bg-white/20 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors">
                                {likesVerifying[i] ? "Checking..." : "Like"}
                              </button>
                            )}
                          </div>
                          {taskErrors[`like-${i}`] && (
                            <p className="text-yellow-400 text-xs mt-1 ml-8">{taskErrors[`like-${i}`]}</p>
                          )}
                        </div>
                      ))}

                      {requirements?.x_retweet_post_urls?.map((url, i) => (
                        <div key={`retweet-${i}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${retweetsDone[i] ? "bg-green-500 border-green-500" : "border-white/20"}`}>
                                {retweetsDone[i] && <span className="text-xs">✓</span>}
                              </div>
                              <span className="text-sm text-white/70">Retweet post {requirements.x_retweet_post_urls.length > 1 ? `#${i + 1}` : ""}</span>
                            </div>
                            {!retweetsDone[i] && (
                              <button onClick={() => handleRetweet(url, i)} disabled={retweetsVerifying[i]}
                                className="text-xs bg-white/10 hover:bg-white/20 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors">
                                {retweetsVerifying[i] ? "Checking..." : "Retweet"}
                              </button>
                            )}
                          </div>
                          {taskErrors[`retweet-${i}`] && (
                            <p className="text-yellow-400 text-xs mt-1 ml-8">{taskErrors[`retweet-${i}`]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Wallet */}
                {!submitted ? (
                  <div className={`bg-white/5 border rounded-xl p-6 transition-opacity ${allTasksDone() ? "border-white/10 opacity-100" : "border-white/5 opacity-50 pointer-events-none"}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${allTasksDone() ? "bg-purple-600" : "bg-white/10"}`}>
                        {hasXTasks ? "3" : "2"}
                      </div>
                      <h2 className="font-semibold">Submit Your Wallet</h2>
                    </div>
                    <input type="text" value={wallet} onChange={e => setWallet(e.target.value)}
                      placeholder="0x... or SOL address"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500 mb-4" />
                    <button onClick={handleSubmit} disabled={!wallet || !allTasksDone()}
                      className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white font-medium py-3 rounded-lg">
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
              </>
            )}
          </>
        )}

        {raffleEnded && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">🔒</div>
            <h2 className="font-semibold text-red-400">Raffle Ended</h2>
            <p className="text-white/60 text-sm mt-1">This raffle is no longer accepting entries.</p>
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