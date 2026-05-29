import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get("guild_id")
  if (!guildId) return NextResponse.json({ error: "No guild_id" }, { status: 400 })

  try {
    const res = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    })
    const roles = await res.json()

    // Filter out @everyone role
    const filtered = roles.filter((r: any) => r.name !== "@everyone")

    return NextResponse.json(filtered)
  } catch {
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 })
  }
}