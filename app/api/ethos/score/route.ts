import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { xHandle, projectId } = await req.json()
    if (!xHandle || !projectId) {
      return NextResponse.json({ error: "Missing xHandle or projectId" }, { status: 400 })
    }

    const username = xHandle.replace("@", "")

    const res = await fetch("https://api.ethos.network/api/v2/users/by/x", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Ethos-Client": "rafflehq",
      },
      body: JSON.stringify({ accountIdsOrUsernames: [username] }),
    })

    const raw = await res.json()
    console.log("Ethos raw response:", JSON.stringify(raw))

    // Handle both array and wrapped response formats
    const users = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []
    const user = users[0] ?? null
    console.log("Ethos user:", JSON.stringify(user))

    const score = user?.score ?? null

    if (score !== null) {
      await supabase.from("projects").update({
        ethos_score: score,
        ethos_score_updated_at: new Date().toISOString(),
      }).eq("id", projectId)
    }

    return NextResponse.json({ score, debug: { raw, user } })
  } catch (err) {
    console.error("Ethos fetch error:", err)
    return NextResponse.json({ score: null, error: String(err) })
  }
}