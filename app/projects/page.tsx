// @ts-nocheck
"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession, signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import Nav from "@/components/Nav"

function ProjectsPageInner() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [requesting, setRequesting] = useState(null)
  const [communityInput, setCommunityInput] = useState("")
  const [teamInput, setTeamInput] = useState("")
  const [message, setMessage] = useState("")

  // Discord state
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

  // Handle Discord OAuth redirect back
  useEffect(() => {
    const token = searchParams.get("discord_token")
    const discordId = searchParams.get("discord_id")
    const discordUsername = searchParams.get("discord_username")
    const projectId = searchParams.get("project_id")

    if (token && discordId) {
      setDiscordToken(token)
      setDiscordUser({ id: discordId, username: discordUsername })

      // Restore requesting state from sessionStorage
      const saved = sessionStorage.getItem("rafflehq_request")
      if (saved) {
        const { projectId: savedProjectId, community, team, message: savedMessage } = JSON.parse(saved)
        setRequesting(savedProjectId)
        setCommunityInput(community)
        setTeamInput(team)
        setMessage(savedMessage || "")
      }

      // Fetch guilds
      fetchGuilds(token)

      // Clean URL
      window.history.replaceState({}, "", "/projects")
    }
  }, [searchParams])

  const fetchGuilds = async (token: string) => {
    setLoadingGuilds(true)
    try {
      const res = await fetch(`/api/discord/guilds?token=${token}`)
      const data = await res.json()
      setGuilds(Array.isArray(data) ? data : [])
    } catch {
      setGuilds([])
    } finally {
      setLoadingGuilds(false)
    }
  }

  const fetchRoles = async (guildId: string) => {
    setLoadingRoles(true)
    try {
      const res = await fetch(`/api/discord/roles?guild_id=${guildId}`)
      const data = await res.json()
      setRoles(Array.isArray(data) ? data : [])
    } catch {
      setRoles([])
    } finally {
      setLoadingRoles(false)
    }
  }

  const handleGuildSelect = (guild: any) => {
    setSelectedGuild(guild)
    setSelectedRole(null)
    setRoles([])
    fetchRoles(guild.id)
  }

  const connectDiscord = (projectId: string) => {
    // Save form state to sessionStorage
    sessionStorage.setItem("rafflehq_request", JSON.stringify({
      projectId,
      community: communityInput,
      team: teamInput,
      message,
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

  const filtered = projects.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.x_handle?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav />

      <div className="pt-24 pb-16 px-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <p className="text-purple-400 text-sm font-medium uppercase tracking-widest mb-2">BROWSE PROJECTS</p>
          <h1 className="text-4xl font-bold mb-2">Find Whitelist Partners</h1>
          <p className="text-white/40">Browse verified projects listing whitelist spots. Request a collab in one click.</p>
        </div>

        <div className="mb-8">
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
          />
        </div>

        {loading ? (
          <div className="text-white/40 text-sm">Loading projects...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-white/40">No projects found. Be the first to list spots!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <div key={project.id} className="bg-white/5 border border-white/10 rounded-2xl hover:border-purple-500/30 transition-colors">

                <Link href={`/projects/${project.x_handle?.replace("@", "")}`} className="block p-6 pb-3">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center text-xl font-bold">
                      {project.name?.[0] || "?"}
                    </div>
                    <div>
                      <div className="font-semibold">{project.name}</div>
                      <div className="text-white/50 text-sm flex items-center gap-1">
                        {project.x_handle}
                        {project.x_verified && (
                          <span className="text-blue-400 text-xs bg-blue-400/10 px-1.5 py-0.5 rounded-full">✓ verified</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="text-xs text-white/40 mb-1">Acceptance Rate</div>
                      <div className={`text-lg font-bold ${
                        (project.acceptance_rate || 0) >= 80 ? "text-green-400" :
                        (project.acceptance_rate || 0) >= 50 ? "text-yellow-400" : "text-red-400"
                      }`}>{project.acceptance_rate || 0}%</div>
                      <div className="text-xs text-white/30">of requests accepted</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="text-xs text-white/40 mb-1">Fill Rate</div>
                      <div className={`text-lg font-bold ${
                        (project.fill_rate || 0) >= 80 ? "text-green-400" :
                        (project.fill_rate || 0) >= 50 ? "text-yellow-400" : "text-red-400"
                      }`}>{project.fill_rate || 0}%</div>
                      <div className="text-xs text-white/30">of spots filled</div>
                    </div>
                  </div>

                  <div className="text-sm text-white/50">
                    <span className="text-white font-medium">{project.total_spots_listed || 0}</span> spots available
                  </div>
                </Link>

                <div className="px-6 pb-6 pt-3">
                  {requesting === project.id ? (
                    <div className="space-y-3">
                      <input
                        type="number"
                        value={communityInput}
                        onChange={(e) => setCommunityInput(e.target.value)}
                        placeholder="Community spots"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
                      />
                      <input
                        type="number"
                        value={teamInput}
                        onChange={(e) => setTeamInput(e.target.value)}
                        placeholder="Team spots (optional)"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
                      />
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Message to Project A (optional)"
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500 resize-none"
                      />

                      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
                        <div className="text-xs text-indigo-300 font-medium mb-2">Discord Verification Setup</div>

                        {!discordUser ? (
                          <button
                            onClick={() => connectDiscord(project.id)}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                          >
                            Connect Discord
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-xs text-white/50">
                              Connected as <span className="text-white">{discordUser.username}</span>
                            </div>

                            {loadingGuilds ? (
                              <div className="text-xs text-white/40">Loading your servers...</div>
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
                                <div className="text-xs text-white/40">Loading roles...</div>
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
                              <div className="text-xs text-green-400">
                                ✓ {selectedRole.name} in {selectedGuild.name}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRequest(project)}
                          disabled={!discordUser || !selectedGuild || !selectedRole}
                          className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors"
                        >
                          Send Request
                        </button>
                        <button
                          onClick={() => {
                            setRequesting(null)
                            setCommunityInput("")
                            setTeamInput("")
                            setMessage("")
                          }}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRequesting(project.id)}
                      className="w-full bg-white/5 hover:bg-purple-600/20 border border-white/10 hover:border-purple-500/50 text-white text-sm font-medium py-2.5 rounded-xl transition-all"
                    >
                      Request Spots
                    </button>
                  )}
                </div>
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
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-white/50">Loading...</div>
      </div>
    }>
      <ProjectsPageInner />
    </Suspense>
  )
}