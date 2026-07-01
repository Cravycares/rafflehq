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

    if (!res.ok) {
      return NextResponse.json({ score: null, error: "Ethos API error" })
    }

    const data = await res.json()
    const user = Array.isArray(data) ? data[0] : data?.data?.[0] ?? null
    const score = user?.score ?? null

    if (score !== null) {
      await supabase.from("projects").update({
        ethos_score: score,
        ethos_score_updated_at: new Date().toISOString(),
      }).eq("id", projectId)
    }

    return NextResponse.json({ score })
  } catch (err) {
    return NextResponse.json({ score: null, error: "Failed to fetch Ethos score" })
  }
}