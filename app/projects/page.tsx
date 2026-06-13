// @ts-nocheck
"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession, signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import Nav from "@/components/Nav"

const AVATAR_COLORS = [
  "bg-purple-600/20 text-purple-400",
  "bg-blue-600/20 text-blue-400",
  "bg-pink-600/20 text-pink-400",
  "bg-teal-600/20 text-teal-400",
  "bg-amber-600/20 text-amber-400",
  "bg-red-600/20 text-red-400",
]

function getAvatarColor(name: string) {
  const i = (name?.charCodeAt(0) || 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[i]
}

function MetricValue({ value }: { value: number }) {
  const color =
    value >= 80 ? "text-green-400" :
    value >= 50 ? "text-yellow-400" : "text-red-400"
  return <div className={`text-lg font-bold ${color}`}>{value}%</div>
}

function ProjectsPageInner() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "fill" | "acceptance">("all")
  const [requesting, setRequesting] = useState(null)
  const [communityInput, setCommunityInput] = useState("")
  const [teamInput, setTeamInput] = useState("")
  const [message, setMessage] = useState("")

  const [discordToken, setDiscordToken] = useState("")
  const [discordUser, setDiscordUser] = useState(null)
  const [guilds, setGuilds] = useState([])
  const [selectedGuild, setSelectedGuild] = useState(null)
  const [roles, setRoles] = useState([])
  const [selectedRole, setSelectedRole] = useState(null)
  const [loadingGuilds, setLoadingGuilds] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("acceptance_rate", { ascending: false })
      setProjects(data || [])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const token = searchParams.get("discord_token")
    const discordId = searchParams.get("discord_id")
    const discordUsername = searchParams.get("discord_username")

    if (token && discordId) {
      setDiscordToken(token)
      setDiscordUser({ id: discordId, username: discordUsername })

      const saved = sessionStorage.getItem("rafflehq_request")
      if (saved) {
        const { projectId: savedProjectId, community, team, message: savedMessage } = JSON.parse(saved)
        setRequesting(savedProjectId)
        setCommunityInput(community)
        setTeamInput(team)
        setMessage(savedMessage || "")
      }

      fetchGuilds(token)
      window.history.replaceState({}, "", "/projects")
    }
  }, [searchParams])

  const fetchGuilds = async (token: string) => {
    setLoadingGuilds(true)
    try {
      const res = await fetch(`/api/discord/guilds?token=${token}`)
      const data = await res.json()
      setGuilds(Array.isArray(data) ? data : [])
    } catch { setGuilds([]) }
    finally { setLoadingGuilds(false) }
  }

  const fetchRoles = async (guildId: string) => {
    setLoadingRoles(true)
    try {
      const res = await fetch(`/api/discord/roles?guild_id=${guildId}`)
      const data = await res.json()
      setRoles(Array.isArray(data) ? data : [])
    } catch { setRoles([]) }
    finally { setLoadingRoles(false) }
  }

  const handleGuildSelect = (guild: any) => {
    setSelectedGuild(guild)
    setSelectedRole(null)
    setRoles([])
    fetchRoles(guild.id)
  }

  const connectDiscord = (projectId: string) => {
    sessionStorage.setItem("rafflehq_request", JSON.stringify({
      projectId, community: communityInput, team: teamInput, message,
    }))
    const state = btoa(JSON.stringify({ from: "request", projectId }))
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
      redirect_uri: `${window.location.origin}/api/auth/discord`,
      response_type: "code",
      scope: "identify guilds",
      state,
    })
    window.location.href = `https://discord.com/oauth2/authorize?${params}`
  }

  const handleRequest = async (project: any) => {
    if (!session) { signIn("twitter"); return }
    const community = parseInt(communityInput)
    const team = parseInt(teamInput || "0")
    if (!community || community <= 0) return alert("Enter a valid number of community spots")
    if (!discordUser || !selectedGuild || !selectedRole) return alert("Please connect Discord and select your server and role")

    const xHandle = (session as any)?.xHandle
    const { data: me } = await supabase
      .from("projects")
      .select("id")
      .eq("x_handle", `@${xHandle}`)
      .single()
    if (!me) return alert("Your project profile not found. Please sign in first.")

    const { error } = await supabase.from("collab_requests").insert({
      project_a_id: project.id,
      project_b_id: me.id,
      community_spots: community,
      team_spots: team,
      requested_spots: community + team,
      message,
      status: "pending",
      discord_server_id: selectedGuild.id,
      discord_server_name: selectedGuild.name,
      discord_role_id: selectedRole.id,
      discord_role_name: selectedRole.name,
    })

    if (error) return alert("Failed to send request: " + error.message)

    sessionStorage.removeItem("rafflehq_request")
    alert(`Request sent to ${project.name}!`)
    setRequesting(null)
    setCommunityInput("")
    setTeamInput("")
    setMessage("")
    setDiscordToken("")
    setDiscordUser(null)
    setGuilds([])
    setSelectedGuild(null)
    setRoles([])
    setSelectedRole(null)
  }

  const cancelRequest = () => {
    setRequesting(null)
    setCommunityInput("")
    setTeamInput("")
    setMessage("")
  }

  const filtered = projects
    .filter((p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.x_handle?.toLowerCase().includes(search.toLowerCase())
    )
    .filter((p) => {
      if (filter === "fill") return (p.fill_rate || 0) >= 70
      if (filter === "acceptance") return (p.acceptance_rate || 0) >= 70
      return true
    })

  const totalSpots = projects.reduce((sum: number, p: any) => sum + (p.total_spots_listed || 0), 0)

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <Nav />

      {/* HERO */}
      <div className="pt-24 pb-10 px-6 max-w-7xl mx-auto border-b border-white/5">
        <p className="text-purple-400 text-xs font-semibold uppercase tracking-widest mb-3">Browse projects</p>
        <h1 className="text-4xl font-bold mb-3 tracking-tight">Find whitelist partners</h1>
        <p className="text-white/40 text-sm max-w-lg leading-relaxed">
          Browse verified projects listing whitelist spots. Every project is X-verified before a raffle goes live.
        </p>
        <div className="flex gap-8 mt-6 flex-wrap">
          <div>
            <div className="text-xl font-bold text-purple-400">{projects.length.toLocaleString()}+</div>
            <div className="text-xs text-white/30 mt-0.5">Verified projects</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-400">{totalSpots.toLocaleString()}</div>
            <div className="text-xs text-white/30 mt-0.5">Spots available</div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="px-6 max-w-7xl mx-auto py-5 flex items-center gap-3 flex-wrap border-b border-white/5">
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by name or @handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/4 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <div className="flex gap-2">
          {([
            { key: "all", label: "All projects" },
            { key: "fill", label: "High fill rate" },
            { key: "acceptance", label: "Top acceptance" },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                filter === f.key
                  ? "bg-purple-600/15 border-purple-500/40 text-purple-300"
                  : "bg-white/3 border-white/10 text-white/50 hover:text-white hover:border-white/20"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* GRID */}
      <div className="px-6 max-w-7xl mx-auto py-8 pb-20">
        {loading ? (
          <div className="text-white/30 text-sm py-20 text-center">Loading projects...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-white/30 text-sm">No projects found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <div
                key={project.id}
                className={`bg-white/[0.03] border rounded-2xl transition-all ${
                  requesting === project.id
                    ? "border-purple-500/40"
                    : "border-white/[0.08] hover:border-purple-500/25"
                }`}
              >
                {/* Card top — clickable to profile */}
                <Link href={`/projects/${project.x_handle?.replace("@", "")}`} className="block p-5 pb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${getAvatarColor(project.name)}`}>
                      {project.name?.[0] || "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{project.name}</div>
                      <div className="text-white/40 text-xs flex items-center gap-1.5 mt-0.5">
                        {project.x_handle}
                        {project.x_verified && (
                          <span className="text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">✓ verified</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-white/[0.04] rounded-xl p-3">
                      <div className="text-[10px] text-white/35 mb-1 uppercase tracking-wide">Acceptance</div>
                      <MetricValue value={project.acceptance_rate || 0} />
                      <div className="text-[10px] text-white/25 mt-0.5">of requests</div>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-3">
                      <div className="text-[10px] text-white/35 mb-1 uppercase tracking-wide">Fill rate</div>
                      <MetricValue value={project.fill_rate || 0} />
                      <div className="text-[10px] text-white/25 mt-0.5">of spots filled</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">
                      <span className="text-white font-semibold">{(project.total_spots_listed || 0).toLocaleString()}</span> spots available
                    </span>
                    {project.total_collabs > 0 && (
                      <span className="text-white/25">{project.total_collabs} past collabs</span>
                    )}
                  </div>
                </Link>

                {/* Request form or button */}
                {requesting === project.id ? (
                  <div className="px-5 pb-5 pt-1 border-t border-white/[0.06] space-y-2.5">
                    <input
                      type="number"
                      value={communityInput}
                      onChange={(e) => setCommunityInput(e.target.value)}
                      placeholder="Community spots"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50"
                    />
                    <input
                      type="number"
                      value={teamInput}
                      onChange={(e) => setTeamInput(e.target.value)}
                      placeholder="Team spots (optional)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50"
                    />
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={`Message to ${project.name} (optional)`}
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 resize-none"
                    />

                    <div className="bg-indigo-500/8 border border-indigo-500/20 rounded-xl p-3">
                      <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide mb-2">Discord verification</div>
                      {!discordUser ? (
                        <button
                          onClick={() => connectDiscord(project.id)}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                        >
                          Connect Discord
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-xs text-white/40">Connected as <span className="text-white">{discordUser.username}</span></div>
                          {loadingGuilds ? (
                            <div className="text-xs text-white/30">Loading servers...</div>
                          ) : (
                            <select
                              onChange={(e) => {
                                const guild = guilds.find((g: any) => g.id === e.target.value)
                                if (guild) handleGuildSelect(guild)
                              }}
                              value={selectedGuild?.id || ""}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                            >
                              <option value="">Select your Discord server</option>
                              {guilds.map((g: any) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                          )}
                          {selectedGuild && (
                            loadingRoles ? (
                              <div className="text-xs text-white/30">Loading roles...</div>
                            ) : (
                              <select
                                onChange={(e) => {
                                  const role = roles.find((r: any) => r.id === e.target.value)
                                  setSelectedRole(role || null)
                                }}
                                value={selectedRole?.id || ""}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                              >
                                <option value="">Select required role</option>
                                {roles.map((r: any) => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </select>
                            )
                          )}
                          {selectedGuild && selectedRole && (
                            <div className="text-xs text-green-400">✓ {selectedRole.name} in {selectedGuild.name}</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequest(project)}
                        disabled={!discordUser || !selectedGuild || !selectedRole}
                        className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                      >
                        Send Request
                      </button>
                      <button
                        onClick={cancelRequest}
                        className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-white/50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 pb-5 pt-0 border-t border-white/[0.06]">
                    <button
                      onClick={() => setRequesting(project.id)}
                      className="w-full mt-4 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-300 text-sm font-semibold py-2.5 rounded-xl transition-all"
                    >
                      Request Spots
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center">
        <div className="text-white/30 text-sm">Loading projects...</div>
      </div>
    }>
      <ProjectsPageInner />
    </Suspense>
  )
}