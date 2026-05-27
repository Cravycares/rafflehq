// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { useSession, signIn } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default function ProjectsPage() {
  const { data: session } = useSession()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [requesting, setRequesting] = useState(null)
  const [spotsInput, setSpotsInput] = useState("")

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

  const filtered = projects.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.x_handle?.toLowerCase().includes(search.toLowerCase())
  )

  const handleRequest = async (project: any) => {
  if (!session) { signIn("twitter"); return }
  const spots = parseInt(spotsInput)
  if (!spots || spots <= 0) return alert("Enter a valid number of spots")
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
    requested_spots: spots,
    status: "pending",
  })
  if (error) return alert("Failed to send request: " + error.message)
  alert(`Request sent to ${project.name}!`)
  setRequesting(null)
  setSpotsInput("")
}

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <span className="font-bold text-lg">R</span>
            </div>
            <span className="font-semibold text-lg">RaffleHQ</span>
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <span className="text-white/60 text-sm">@{(session as any).xHandle}</span>
            ) : (
              <button
                onClick={() => signIn("twitter")}
                className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Sign in with X
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-28 pb-16">
        {/* HEADER */}
        <div className="mb-10">
          <span className="text-purple-400 text-sm font-medium">BROWSE PROJECTS</span>
          <h1 className="text-4xl font-bold mt-2">Find Whitelist Partners</h1>
          <p className="text-white/50 mt-2">Browse verified projects listing whitelist spots. Request a collab in one click.</p>
        </div>

        {/* SEARCH */}
        <div className="mb-8">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full max-w-md bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* PROJECTS GRID */}
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
  <Link key={project.id} href={`/projects/${project.x_handle?.replace("@", "")}`} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-colors block">
                {/* Project Header */}
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

                {/* Trust Signals */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-xs text-white/40 mb-1">Acceptance Rate</div>
                    <div className={`text-lg font-bold ${
                      (project.acceptance_rate || 0) >= 80 ? "text-green-400" :
                      (project.acceptance_rate || 0) >= 50 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {project.acceptance_rate || 0}%
                    </div>
                    <div className="text-xs text-white/30">of requests accepted</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-xs text-white/40 mb-1">Fill Rate</div>
                    <div className={`text-lg font-bold ${
                      (project.fill_rate || 0) >= 80 ? "text-green-400" :
                      (project.fill_rate || 0) >= 50 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {project.fill_rate || 0}%
                    </div>
                    <div className="text-xs text-white/30">of spots filled</div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-white/50">
                    <span className="text-white font-medium">{project.total_spots_listed || 0}</span> spots available
                  </div>
                </div>

                {/* Request Button */}
                {requesting === project.id ? (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={spotsInput}
                      onChange={(e) => setSpotsInput(e.target.value)}
                      placeholder="How many spots?"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequest(project)}
                        className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                      >
                        Send Request
                      </button>
                      <button
                        onClick={() => setRequesting(null)}
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}