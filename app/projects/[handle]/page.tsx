"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useParams } from "next/navigation"
import Nav from "@/components/Nav"

export default function ProjectProfile() {
  const { handle } = useParams()
  const { data: session } = useSession()
  const [project, setProject] = useState<any>(null)
  const [activeRaffles, setActiveRaffles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [requested, setRequested] = useState(false)

  useEffect(() => {
    const load = async () => {
  const xHandle = `@${handle}`

  const { data: proj } = await supabase
    .from("projects")
    .select("*")
    .eq("x_handle", xHandle)
    .maybeSingle()

  if (!proj) { setLoading(false); return }

  // Fetch live Ethos score and update DB
  try {
    const ethosRes = await fetch(`/api/ethos?handle=${handle}`)
    const ethosData = await ethosRes.json()
    if (ethosData.score != null) {
      await supabase
        .from("projects")
        .update({ ethos_score: ethosData.score })
        .eq("id", proj.id)
      proj.ethos_score = ethosData.score
    }
  } catch (_) {
    // Ethos fetch failed — use stored value, no problem
  }

  setProject(proj)

  const { data: raffles } = await supabase
    .from("raffles")
    .select("*")
    .eq("project_a_id", proj.id)
    .eq("status", "live")

  setActiveRaffles(raffles || [])
  setLoading(false)
}
    load()
  }, [handle])

  const handleRequest = async () => {
    if (!session) return
    setRequesting(true)
    const xHandle = (session as any)?.xHandle
    const { data: myProject } = await supabase
      .from("projects")
      .select("*")
      .eq("x_handle", `@${xHandle}`)
      .maybeSingle()

    if (!myProject) { setRequesting(false); return }

    await supabase.from("collab_requests").insert({
      project_a_id: project.id,
      project_b_id: myProject.id,
      status: "pending",
      requested_spots: 50,
    })

    setRequested(true)
    setRequesting(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <Nav />
      <div className="text-white/40">Loading...</div>
    </div>
  )

  if (!project) return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav />
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <p className="text-white/60 mb-4">Project not found.</p>
          <Link href="/projects" className="text-purple-400 hover:underline">Browse Projects →</Link>
        </div>
      </div>
    </div>
  )

  const acceptanceColor = project.acceptance_rate >= 80 ? "text-green-400" : project.acceptance_rate >= 50 ? "text-yellow-400" : "text-red-400"
  const fillColor = project.fill_rate >= 80 ? "text-green-400" : project.fill_rate >= 50 ? "text-yellow-400" : "text-red-400"
  const ethosLevel = project.ethos_score >= 1600 ? "Reputable" : project.ethos_score >= 1000 ? "Known" : project.ethos_score >= 400 ? "Neutral" : "New"

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav />
      <div className="px-6 py-12">
        <div className="max-w-3xl mx-auto">

          {/* Back */}
          <Link href="/projects" className="text-white/40 hover:text-white text-sm mb-8 inline-block transition-colors">
            ← Back to Projects
          </Link>

          {/* Profile Header */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 mb-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-2xl font-bold">
                  {project.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold">{project.name}</h1>
                    {project.x_verified && (
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">✓ verified</span>
                    )}
                    {project.ethos_score != null && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                        ⬡ Ethos {project.ethos_score} · {ethosLevel}
                      </span>
                    )}
                  </div>
                  <p className="text-white/40 text-sm">{project.x_handle}</p>
                  {project.description && <p className="text-white/60 text-sm mt-1">{project.description}</p>}
                </div>
              </div>

              {session && (session as any)?.xHandle !== handle && (
                <button
                  onClick={handleRequest}
                  disabled={requesting || requested}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                >
                  {requested ? "✓ Requested" : requesting ? "Requesting..." : "Request Spots"}
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/[0.08]">
              <div>
                <div className={`text-2xl font-bold ${acceptanceColor}`}>{project.acceptance_rate ?? 0}%</div>
                <div className="text-white/40 text-xs mt-0.5">Acceptance rate</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${fillColor}`}>{project.fill_rate ?? 0}%</div>
                <div className="text-white/40 text-xs mt-0.5">Fill rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{project.total_spots_listed ?? 0}</div>
                <div className="text-white/40 text-xs mt-0.5">Spots listed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{project.total_requests_received ?? 0}</div>
                <div className="text-white/40 text-xs mt-0.5">Total requests</div>
              </div>
            </div>
          </div>

          {/* Active Raffles */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Active Raffles</h2>
            {activeRaffles.length === 0 ? (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-8 text-center text-white/30">
                No active raffles right now.
              </div>
            ) : (
              <div className="space-y-4">
                {activeRaffles.map(raffle => (
                  <div key={raffle.id} className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{raffle.title}</div>
                      <div className="text-white/40 text-sm mt-0.5">
                        {raffle.community_spots} community · {raffle.team_spots} team spots
                      </div>
                    </div>
                    <Link
                      href={`/raffles/${raffle.id}`}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      Enter Raffle →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}